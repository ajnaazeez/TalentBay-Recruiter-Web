import { createContext } from 'react';
import { NotificationItem, NotificationFilter } from '@/types';

export interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  readCount: number;
  totalCount: number;
  loading: boolean;
  activeFilter: NotificationFilter;
  setActiveFilter: (filter: NotificationFilter) => void;
  filteredNotifications: NotificationItem[];
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);
