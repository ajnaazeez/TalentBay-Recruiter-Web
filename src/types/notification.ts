export type NotificationType = 'message' | 'application';

export type NotificationFilter = 'All' | 'Unread' | 'Read';

export interface NotificationItem {
  id: string;
  recruiterId: string;
  type: NotificationType;
  title: string;
  content: string;
  timestamp: unknown;
  isRead: boolean;
  payloadId?: string;
  jobId?: string;
  candidateId?: string;
  candidateName?: string;
  candidateImageUrl?: string;
  jobTitle?: string;
  // UI aliases
  message?: string;
  timeAgo?: string;
  createdAt?: unknown;
}

