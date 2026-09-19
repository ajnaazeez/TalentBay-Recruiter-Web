import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/utils/constants';
import { NotificationItem, NotificationFilter, NotificationType } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { cryptoUtils } from '@/utils/cryptoUtils';
import { NotificationContext } from './NotificationContext';

const READ_APPS_KEY = 'talentbay_read_applications';

// In-memory cache for candidate and job details to minimize Firestore reads
const candidateCache = new Map<string, { name: string; avatarUrl?: string }>();
const jobCache = new Map<string, string>();

const getTimeMs = (ts: unknown): number => {
  if (!ts) return 0;
  if (typeof ts === 'object' && ts !== null && 'toDate' in ts && typeof (ts as { toDate: () => Date }).toDate === 'function') {
    return (ts as { toDate: () => Date }).toDate().getTime();
  }
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'string' || typeof ts === 'number') return new Date(ts).getTime();
  return 0;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const recruiterId = user?.uid || '';

  const [dbNotifications, setDbNotifications] = useState<NotificationItem[]>([]);
  const [appNotifications, setAppNotifications] = useState<NotificationItem[]>([]);
  const [chatNotifications, setChatNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('All');

  // Read applications set (matching Flutter readApplicationsProvider)
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(READ_APPS_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // 1. Subscribe to Firestore /notification_recruter with AES-CTR Decryption & Candidate Enrichment
  useEffect(() => {
    if (!recruiterId) {
      setDbNotifications([]);
      setAppNotifications([]);
      setChatNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const notifsRef = collection(db, COLLECTIONS.NOTIFICATIONS);
    const q = query(notifsRef, where('recruiterId', '==', recruiterId));

    const unsubDb = onSnapshot(
      q,
      async (snapshot) => {
        const notifs: NotificationItem[] = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            const timestamp = data.timestamp || data.createdAt;
            const rawContent = data.content || data.message || '';
            const candidateId = String(data.candidateId || '').trim();
            const jobId = String(data.jobId || '').trim();

            let candidateName = (data.candidateName as string) || '';
            let candidateImageUrl = (data.candidateImageUrl as string) || (data.candidateAvatarUrl as string) || '';
            let jobTitle = (data.jobTitle as string) || '';

            // Decrypt message content if encrypted
            const decryptedContent = await cryptoUtils.decrypt(rawContent);

            // Enrich Candidate details if missing or generic
            if ((!candidateName || candidateName === 'Candidate') && candidateId) {
              if (candidateCache.has(candidateId)) {
                const cached = candidateCache.get(candidateId)!;
                candidateName = cached.name;
                candidateImageUrl = cached.avatarUrl || candidateImageUrl;
              } else {
                try {
                  const candDoc = await getDoc(doc(db, COLLECTIONS.CANDIDATES, candidateId));
                  if (candDoc.exists()) {
                    const cData = candDoc.data();
                    const name =
                      (cData.fullName as string) ||
                      `${cData.firstName || ''} ${cData.lastName || ''}`.trim() ||
                      (cData.name as string) ||
                      'Candidate';
                    const photo = (cData.profilePhotoUrl as string) || (cData.profilePictureUrl as string) || '';
                    candidateCache.set(candidateId, { name, avatarUrl: photo });
                    candidateName = name;
                    candidateImageUrl = photo;
                  }
                } catch {
                  // ignore
                }
              }
            }

            // Enrich Job details if missing or generic
            if ((!jobTitle || jobTitle === 'Open Position' || jobTitle === 'Position Opening') && jobId) {
              if (jobCache.has(jobId)) {
                jobTitle = jobCache.get(jobId)!;
              } else {
                try {
                  const jDoc = await getDoc(doc(db, COLLECTIONS.JOBS, jobId));
                  if (jDoc.exists()) {
                    const jData = jDoc.data();
                    const title = (jData.jobTitle as string) || (jData.roleName as string) || '';
                    if (title) {
                      jobCache.set(jobId, title);
                      jobTitle = title;
                    }
                  }
                } catch {
                  // ignore
                }
              }
            }

            return {
              id: docSnap.id,
              recruiterId: data.recruiterId || recruiterId,
              type: (data.type as NotificationType) || 'application',
              title: data.title || 'Notification',
              content: decryptedContent,
              message: decryptedContent,
              timestamp,
              isRead: Boolean(data.isRead) || readIds.has(docSnap.id),
              payloadId: data.payloadId || data.chatId,
              jobId: jobId || undefined,
              candidateId: candidateId || undefined,
              candidateName: candidateName || undefined,
              candidateImageUrl: candidateImageUrl || undefined,
              jobTitle: jobTitle || undefined,
              createdAt: timestamp,
            };
          })
        );
        setDbNotifications(notifs);
        setLoading(false);
      },
      (error) => {
        console.error('[NotificationProvider] Error in /notification_recruter listener:', error);
        setLoading(false);
      }
    );

    return () => unsubDb();
  }, [recruiterId, readIds]);

  // 2. Aggregate live applications for recruiter's active jobs (matching Flutter notification_provider.dart)
  useEffect(() => {
    if (!recruiterId) return;

    const jobsRef = collection(db, COLLECTIONS.JOBS);
    const jobsQuery = query(
      jobsRef,
      where('recruiterId', '==', recruiterId),
      where('status', '==', 'active')
    );

    const appUnsubs: Unsubscribe[] = [];

    const unsubJobs = onSnapshot(
      jobsQuery,
      (jobsSnap) => {
        // Clear previous app listeners
        appUnsubs.forEach((u) => u());
        appUnsubs.length = 0;

        const allJobApps: Map<string, NotificationItem> = new Map();

        if (jobsSnap.empty) {
          setAppNotifications([]);
          return;
        }

        jobsSnap.docs.forEach((jobDoc) => {
          const jobData = jobDoc.data();
          const jobId = jobDoc.id;
          const jobTitle = jobData.jobTitle || jobData.roleName || 'Open Position';

          const appsRef = collection(db, COLLECTIONS.JOB_APPLICATIONS);
          const appsQuery = query(appsRef, where('jobId', '==', jobId));

          const unsubApp = onSnapshot(
            appsQuery,
            (appSnap) => {
              appSnap.docs.forEach((appDoc) => {
                const appData = appDoc.data();
                const appId = appDoc.id;
                const status = appData.applicationStatus || appData.status;

                if (status === 'applied' || status === 'invited') {
                  const appliedAt = appData.appliedAt || appData.createdAt || appData.updatedAt;
                  const candidateName = appData.candidateName || 'Candidate';
                  const candidateId = appData.candidateId || '';

                  allJobApps.set(appId, {
                    id: appId,
                    recruiterId,
                    type: 'application',
                    title: status === 'applied' ? 'New Applicant' : 'Candidate Matched',
                    content: `${candidateName} has ${
                      status === 'applied' ? 'applied' : 'been matched'
                    } for ${jobTitle}.`,
                    message: `${candidateName} applied for ${jobTitle}`,
                    timestamp: appliedAt,
                    isRead: readIds.has(appId),
                    payloadId: candidateId,
                    jobId,
                    candidateId,
                    candidateName,
                    candidateImageUrl: appData.candidateImageUrl,
                    jobTitle,
                    createdAt: appliedAt,
                  });
                }
              });

              setAppNotifications(Array.from(allJobApps.values()));
            },
            (err) => {
              console.warn('[NotificationProvider] App listener error for jobId:', jobId, err);
            }
          );

          appUnsubs.push(unsubApp);
        });
      },
      (err) => {
        console.warn('[NotificationProvider] Jobs listener error:', err);
      }
    );

    return () => {
      unsubJobs();
      appUnsubs.forEach((u) => u());
    };
  }, [recruiterId, readIds]);

  // 3. Aggregate live chat notifications with AES-CTR Decryption & Candidate Details
  useEffect(() => {
    if (!recruiterId) return;

    const chatsRef = collection(db, COLLECTIONS.CHATS);
    const chatsQuery = query(chatsRef, where('recruiterId', '==', recruiterId));

    const unsubChats = onSnapshot(
      chatsQuery,
      async (chatSnap) => {
        const chatNotifs: NotificationItem[] = await Promise.all(
          chatSnap.docs.map(async (docSnap) => {
            const chatData = docSnap.data();
            const chatId = docSnap.id;
            const lastTime = chatData.lastMessageTime || chatData.updatedAt;

            let candidateName = (chatData.candidateName as string) || '';
            let candidateImageUrl = (chatData.candidateImageUrl as string) || (chatData.candidateAvatarUrl as string) || '';
            const candidateId = (chatData.candidateId as string) || '';
            const jobId = (chatData.jobId as string) || '';
            let jobTitle = (chatData.jobTitle as string) || '';
            const rawLastMessage = (chatData.lastMessage as string) || '';

            // Decrypt last message
            const decryptedLastMsg = rawLastMessage ? await cryptoUtils.decrypt(rawLastMessage) : '';

            // Look up candidate profile if missing
            if ((!candidateName || candidateName === 'Candidate') && candidateId) {
              if (candidateCache.has(candidateId)) {
                const cached = candidateCache.get(candidateId)!;
                candidateName = cached.name;
                candidateImageUrl = cached.avatarUrl || candidateImageUrl;
              } else {
                try {
                  const candDoc = await getDoc(doc(db, COLLECTIONS.CANDIDATES, candidateId));
                  if (candDoc.exists()) {
                    const cData = candDoc.data();
                    const name =
                      (cData.fullName as string) ||
                      `${cData.firstName || ''} ${cData.lastName || ''}`.trim() ||
                      (cData.name as string) ||
                      'Candidate';
                    const photo = (cData.profilePhotoUrl as string) || (cData.profilePictureUrl as string) || '';
                    candidateCache.set(candidateId, { name, avatarUrl: photo });
                    candidateName = name;
                    candidateImageUrl = photo;
                  }
                } catch {
                  // ignore
                }
              }
            }

            // Look up job title if missing
            if ((!jobTitle || jobTitle === 'Open Position' || jobTitle === 'Position Opening') && jobId) {
              if (jobCache.has(jobId)) {
                jobTitle = jobCache.get(jobId)!;
              } else {
                try {
                  const jDoc = await getDoc(doc(db, COLLECTIONS.JOBS, jobId));
                  if (jDoc.exists()) {
                    const jData = jDoc.data();
                    const title = (jData.jobTitle as string) || (jData.roleName as string) || '';
                    if (title) {
                      jobCache.set(jobId, title);
                      jobTitle = title;
                    }
                  }
                } catch {
                  // ignore
                }
              }
            }

            const unread = Number(chatData.unreadCount || chatData.unreadCountRecruiter || 0) > 0;
            const displayMessage = decryptedLastMsg || 'You received a new message';

            return {
              id: `chat_${chatId}`,
              recruiterId,
              type: 'message' as NotificationType,
              title: `Message from ${candidateName || 'Candidate'}`,
              content: displayMessage,
              message: displayMessage,
              timestamp: lastTime,
              isRead: !unread || readIds.has(`chat_${chatId}`),
              payloadId: chatId,
              jobId: jobId || undefined,
              candidateId: candidateId || undefined,
              candidateName: candidateName || undefined,
              candidateImageUrl: candidateImageUrl || undefined,
              jobTitle: jobTitle || undefined,
              createdAt: lastTime,
            };
          })
        );

        // Filter out empty chats
        setChatNotifications(chatNotifs.filter((c) => Boolean(c.content && c.content !== '')));
      },
      (err) => {
        console.warn('[NotificationProvider] Chats listener error:', err);
      }
    );

    return () => unsubChats();
  }, [recruiterId, readIds]);

  // Merge and deduplicate all notifications
  const notifications = useMemo(() => {
    const list: NotificationItem[] = [...dbNotifications];
    const seenKeys = new Set<string>();

    dbNotifications.forEach((n) => {
      if (n.payloadId) seenKeys.add(n.payloadId);
      seenKeys.add(n.id);
    });

    // Add app notifications if not duplicate
    appNotifications.forEach((an) => {
      const key = `${an.jobId}_${an.candidateId}`;
      if (!seenKeys.has(an.id) && !seenKeys.has(key)) {
        list.push(an);
        seenKeys.add(an.id);
        seenKeys.add(key);
      }
    });

    // Add chat notifications if not duplicate
    chatNotifications.forEach((cn) => {
      if (!seenKeys.has(cn.id) && !seenKeys.has(cn.payloadId || '')) {
        list.push(cn);
        seenKeys.add(cn.id);
      }
    });

    // Sort descending by date
    list.sort((a, b) => {
      const timeA = getTimeMs(a.timestamp);
      const timeB = getTimeMs(b.timestamp);
      return timeB - timeA;
    });

    return list;
  }, [dbNotifications, appNotifications, chatNotifications]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const readCount = useMemo(() => {
    return notifications.length - unreadCount;
  }, [notifications, unreadCount]);

  const totalCount = notifications.length;

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'All') return notifications;
    if (activeFilter === 'Unread') return notifications.filter((n) => !n.isRead);
    if (activeFilter === 'Read') return notifications.filter((n) => n.isRead);
    return notifications;
  }, [notifications, activeFilter]);

  const markNotificationAsRead = useCallback(
    async (id: string) => {
      // 1. Update local read IDs set
      setReadIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        try {
          localStorage.setItem(READ_APPS_KEY, JSON.stringify(Array.from(next)));
        } catch {
          // ignore
        }
        return next;
      });

      // 2. If it's in /notification_recruter, update Firestore
      if (dbNotifications.some((n) => n.id === id)) {
        try {
          const docRef = doc(db, COLLECTIONS.NOTIFICATIONS, id);
          await updateDoc(docRef, { isRead: true });
        } catch (err) {
          console.warn('[NotificationProvider] Firestore markNotificationAsRead failed:', err);
        }
      }
    },
    [dbNotifications]
  );

  const markAllAsRead = useCallback(async () => {
    const allIds = notifications.map((n) => n.id);
    setReadIds((prev) => {
      const next = new Set([...prev, ...allIds]);
      try {
        localStorage.setItem(READ_APPS_KEY, JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });

    const updatePromises = dbNotifications
      .filter((n) => !n.isRead)
      .map((n) => {
        const docRef = doc(db, COLLECTIONS.NOTIFICATIONS, n.id);
        return updateDoc(docRef, { isRead: true }).catch(() => {});
      });

    await Promise.all(updatePromises);
  }, [notifications, dbNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        readCount,
        totalCount,
        loading,
        activeFilter,
        setActiveFilter,
        filteredNotifications,
        markNotificationAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
