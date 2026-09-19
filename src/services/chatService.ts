import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  increment,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { COLLECTIONS, STORAGE_PATHS } from '@/utils/constants';
import { ChatThread, ChatMessage } from '@/types';
import { cryptoUtils } from '@/utils/cryptoUtils';

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

export const chatService = {
  /**
   * Gets existing chat thread or creates a new one in /chats.
   * Matches Flutter ChatRepository.getOrCreateChat.
   */
  async getOrCreateChat(params: {
    jobId: string;
    candidateId: string;
    recruiterId: string;
  }): Promise<string> {
    const { jobId, candidateId, recruiterId } = params;
    const chatsRef = collection(db, COLLECTIONS.CHATS);

    const q = query(
      chatsRef,
      where('jobId', '==', jobId),
      where('candidateId', '==', candidateId),
      where('recruiterId', '==', recruiterId)
    );

    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].id;
    }

    const docRef = await addDoc(chatsRef, {
      jobId,
      candidateId,
      recruiterId,
      lastMessage: '',
      lastMessageTime: serverTimestamp(),
      lastMessageId: '',
      lastMessageIsEdited: false,
      participantIds: [candidateId, recruiterId],
      unreadCountCandidate: 0,
      unreadCountRecruiter: 0,
    });

    return docRef.id;
  },

  /**
   * Subscribes to realtime chat threads for a recruiter from /chats.
   * Matches Flutter ChatRepository.getRecruiterChats.
   */
  subscribeToRecruiterChats(
    recruiterId: string,
    callback: (threads: ChatThread[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const chatsRef = collection(db, COLLECTIONS.CHATS);
    const q = query(chatsRef, where('recruiterId', '==', recruiterId));

    return onSnapshot(
      q,
      async (snapshot) => {
        const rawThreads: ChatThread[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const candidateName = (data.candidateName as string) || '';
          const candidateId = (data.candidateId as string) || '';
          const jobId = (data.jobId as string) || '';

          return {
            id: docSnap.id,
            chatId: docSnap.id,
            recruiterId: (data.recruiterId as string) || recruiterId,
            candidateId,
            candidateName: candidateName || 'Candidate',
            candidateAvatar: candidateName ? candidateName.charAt(0).toUpperCase() : 'C',
            candidateAvatarUrl: (data.candidateAvatarUrl as string) || (data.candidateImageUrl as string) || '',
            jobId,
            jobTitle: (data.jobTitle as string) || 'Position Opening',
            lastMessage: (data.lastMessage as string) || '',
            lastMessageTime: data.lastMessageTime || data.updatedAt,
            lastMessageId: (data.lastMessageId as string) || '',
            lastMessageIsEdited: Boolean(data.lastMessageIsEdited),
            participantIds: (data.participantIds as string[]) || [candidateId, recruiterId],
            unreadCountRecruiter: Number(data.unreadCountRecruiter || 0),
            unreadCount: Number(data.unreadCountRecruiter || 0),
            isOnline: Boolean(data.isOnline),
            updatedAt: data.lastMessageTime || data.updatedAt,
          };
        });

        // Enrich candidate & job details + Decrypt lastMessage
        const enrichedThreads = await Promise.all(
          rawThreads.map(async (thread) => {
            let candidateName = thread.candidateName;
            let avatarUrl = thread.candidateAvatarUrl;
            let jobTitle = thread.jobTitle;

            // Look up candidate profile if generic or missing
            if ((!candidateName || candidateName === 'Candidate') && thread.candidateId) {
              if (candidateCache.has(thread.candidateId)) {
                const cached = candidateCache.get(thread.candidateId)!;
                candidateName = cached.name;
                avatarUrl = cached.avatarUrl || avatarUrl;
              } else {
                try {
                  const candDoc = await getDoc(doc(db, COLLECTIONS.CANDIDATES, thread.candidateId));
                  if (candDoc.exists()) {
                    const cData = candDoc.data();
                    const name =
                      (cData.fullName as string) ||
                      `${cData.firstName || ''} ${cData.lastName || ''}`.trim() ||
                      (cData.name as string) ||
                      'Candidate';
                    const photo = (cData.profilePhotoUrl as string) || (cData.profilePictureUrl as string) || '';
                    candidateCache.set(thread.candidateId, { name, avatarUrl: photo });
                    candidateName = name;
                    avatarUrl = photo;
                  }
                } catch {
                  // ignore
                }
              }
            }

            // Look up job title if generic or missing
            if ((!jobTitle || jobTitle === 'Position Opening' || jobTitle === 'Job Discussion') && thread.jobId) {
              if (jobCache.has(thread.jobId)) {
                jobTitle = jobCache.get(thread.jobId)!;
              } else {
                try {
                  const jDoc = await getDoc(doc(db, COLLECTIONS.JOBS, thread.jobId));
                  if (jDoc.exists()) {
                    const jData = jDoc.data();
                    const title = (jData.jobTitle as string) || (jData.roleName as string) || 'Position Opening';
                    jobCache.set(thread.jobId, title);
                    jobTitle = title;
                  }
                } catch {
                  // ignore
                }
              }
            }

            // Decrypt last message
            let decryptedLastMessage = '';
            if (thread.lastMessage) {
              decryptedLastMessage = await cryptoUtils.decrypt(thread.lastMessage);
            }

            return {
              ...thread,
              candidateName: candidateName || 'Candidate',
              candidateAvatar: (candidateName || 'C').charAt(0).toUpperCase(),
              candidateAvatarUrl: avatarUrl,
              jobTitle: jobTitle || 'Position Opening',
              lastMessage: decryptedLastMessage,
              decryptedLastMessage,
            };
          })
        );

        // Sort descending by lastMessageTime
        enrichedThreads.sort((a, b) => {
          const timeA = getTimeMs(a.lastMessageTime);
          const timeB = getTimeMs(b.lastMessageTime);
          return timeB - timeA;
        });

        callback(enrichedThreads);
      },
      (error) => {
        console.error('[chatService.subscribeToRecruiterChats] Error:', error);
        if (onError) onError(error);
      }
    );
  },

  /**
   * Subscribes to realtime messages within /chats/{chatId}/messages.
   * Matches Flutter ChatRepository.getMessages.
   */
  subscribeToMessages(
    chatId: string,
    recruiterId: string,
    callback: (messages: ChatMessage[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const messagesRef = collection(db, COLLECTIONS.CHATS, chatId, COLLECTIONS.MESSAGES);
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    return onSnapshot(
      q,
      async (snapshot) => {
        const rawMessages: ChatMessage[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const senderId = (data.senderId as string) || '';
          const senderType = senderId === recruiterId ? 'recruiter' : 'candidate';
          const rawContent = (data.content as string) || (data.text as string) || '';

          return {
            id: docSnap.id,
            chatId,
            senderId,
            senderType,
            sender: senderType,
            content: rawContent,
            text: rawContent,
            timestamp: data.timestamp,
            isRead: Boolean(data.isRead),
            isEdited: Boolean(data.isEdited),
            updatedAt: data.updatedAt,
          };
        });

        // Decrypt message contents with AES-CTR
        const decryptedMessages = await Promise.all(
          rawMessages.map(async (msg) => {
            if (msg.content) {
              const decrypted = await cryptoUtils.decrypt(msg.content);
              return {
                ...msg,
                content: decrypted,
                decryptedContent: decrypted,
                text: decrypted,
              };
            }
            return msg;
          })
        );

        callback(decryptedMessages);
      },
      (error) => {
        console.error('[chatService.subscribeToMessages] Error:', error);
        if (onError) onError(error);
      }
    );
  },

  /**
   * Sends a new message to /chats/{chatId}/messages with AES-CTR encryption.
   * Matches Flutter ChatRepository.sendMessage.
   */
  async sendMessage(
    chatId: string,
    message: {
      senderId: string;
      text: string;
    }
  ): Promise<string> {
    const { senderId, text } = message;
    if (!text.trim() || !chatId || !senderId) {
      throw new Error('Invalid message payload');
    }

    const messagesRef = collection(db, COLLECTIONS.CHATS, chatId, COLLECTIONS.MESSAGES);

    // Encrypt plain text content with AES-CTR
    const encryptedContent = await cryptoUtils.encrypt(text.trim());

    // 1. Add message doc
    const newMsgDoc = await addDoc(messagesRef, {
      senderId,
      content: encryptedContent,
      timestamp: serverTimestamp(),
      isRead: false,
      isEdited: false,
    });

    // 2. Update parent /chats/{chatId}
    const chatRef = doc(db, COLLECTIONS.CHATS, chatId);
    await updateDoc(chatRef, {
      lastMessage: encryptedContent,
      lastMessageTime: serverTimestamp(),
      lastMessageId: newMsgDoc.id,
      lastMessageIsEdited: false,
      unreadCountCandidate: increment(1),
    });

    return newMsgDoc.id;
  },

  /**
   * Marks chat as read for recruiter.
   * Matches Flutter ChatRepository.markAsRead.
   */
  async markAsRead(chatId: string, recruiterId: string): Promise<void> {
    if (!chatId) return;

    try {
      // 1. Clear unread count on parent chat doc
      const chatRef = doc(db, COLLECTIONS.CHATS, chatId);
      await updateDoc(chatRef, {
        unreadCountRecruiter: 0,
      });

      // 2. Mark unread candidate messages as read in subcollection
      const messagesRef = collection(db, COLLECTIONS.CHATS, chatId, COLLECTIONS.MESSAGES);
      const unreadSnap = await getDocs(
        query(messagesRef, where('isRead', '==', false))
      );

      if (!unreadSnap.empty) {
        const batch = writeBatch(db);
        let count = 0;
        unreadSnap.docs.forEach((mDoc) => {
          const data = mDoc.data();
          if (data.senderId !== recruiterId) {
            batch.update(mDoc.ref, { isRead: true });
            count++;
          }
        });
        if (count > 0) {
          await batch.commit();
        }
      }
    } catch (err) {
      console.warn('[chatService.markAsRead] Failed:', err);
    }
  },

  /**
   * Uploads chat attachment to verified storage path.
   */
  async uploadAttachment(chatId: string, file: File): Promise<string> {
    const storagePath = STORAGE_PATHS.chatAttachment(chatId, file.name);
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file, { contentType: file.type });
    return getDownloadURL(storageRef);
  },

  /**
   * Deletes a chat thread and all subcollection messages.
   * Matches Flutter ChatRepository.deleteChat.
   */
  async deleteChat(chatId: string): Promise<void> {
    const messagesRef = collection(db, COLLECTIONS.CHATS, chatId, COLLECTIONS.MESSAGES);
    const snap = await getDocs(messagesRef);
    const batch = writeBatch(db);
    snap.docs.forEach((msgDoc) => {
      batch.delete(msgDoc.ref);
    });
    batch.delete(doc(db, COLLECTIONS.CHATS, chatId));
    await batch.commit();
  },
};
