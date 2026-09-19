import {
  collection,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/utils/constants';
import { NotificationItem, NotificationType } from '@/types';
import { cryptoUtils } from '@/utils/cryptoUtils';

// In-memory cache for candidate and job details to minimize Firestore reads
const candidateCache = new Map<string, { name: string; avatarUrl?: string }>();
const jobCache = new Map<string, string>();

export const notificationService = {
  /**
   * Realtime subscription to notifications from verified collection /notification_recruter.
   * Enriches candidate details and decrypts AES-CTR encrypted messages.
   */
  subscribeToRecruiterNotifications(
    recruiterId: string,
    callback: (notifications: NotificationItem[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const notifsRef = collection(db, COLLECTIONS.NOTIFICATIONS);
    const q = query(
      notifsRef,
      where('recruiterId', '==', recruiterId),
      orderBy('timestamp', 'desc')
    );

    return onSnapshot(
      q,
      async (snapshot) => {
        const notifications: NotificationItem[] = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            const rawTime = data.timestamp?.toDate
              ? data.timestamp.toDate().toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : data.createdAt?.toDate
              ? data.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : 'Recently';

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
              timestamp: data.timestamp || data.createdAt,
              isRead: Boolean(data.isRead),
              payloadId: data.payloadId || data.chatId,
              jobId: jobId || undefined,
              candidateId: candidateId || undefined,
              candidateName: candidateName || undefined,
              candidateImageUrl: candidateImageUrl || undefined,
              jobTitle: jobTitle || undefined,
              timeAgo: rawTime,
              createdAt: data.timestamp || data.createdAt,
            };
          })
        );
        callback(notifications);
      },
      (error) => {
        console.error('[notificationService.subscribeToRecruiterNotifications] Error:', error);
        if (onError) onError(error);
      }
    );
  },

  /**
   * Marks a single notification as read in /notification_recruter.
   */
  async markNotificationAsRead(notificationId: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId);
    await updateDoc(docRef, { isRead: true });
  },
};
