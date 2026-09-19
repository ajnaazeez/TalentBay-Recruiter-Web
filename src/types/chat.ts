export interface ChatMessage {
  id: string;
  senderId: string;
  content: string; // Stored encrypted
  decryptedContent?: string;
  timestamp: unknown;
  isRead: boolean;
  isEdited?: boolean;
  updatedAt?: unknown;

  // UI helpers
  chatId?: string;
  senderType?: 'recruiter' | 'candidate';
  sender?: 'recruiter' | 'candidate';
  text?: string;
}

export interface ChatThread {
  id: string; // Document ID
  chatId?: string;
  jobId?: string;
  candidateId: string;
  recruiterId: string;
  candidateName: string;
  jobTitle: string;
  lastMessage: string; // Stored encrypted
  decryptedLastMessage?: string;
  lastMessageTime: unknown;
  lastMessageId?: string;
  lastMessageIsEdited?: boolean;
  participantIds?: string[];
  unreadCountRecruiter?: number;
  unreadCount?: number;

  // Enriched UI fields
  candidateAvatar?: string;
  candidateAvatarUrl?: string;
  companyName?: string;
  isOnline?: boolean;
  timestamp?: string;
  updatedAt?: unknown;
}

export type ChatModel = ChatThread;
export type MessageModel = ChatMessage;

