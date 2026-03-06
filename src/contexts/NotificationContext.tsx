import { createContext, useContext, useState, ReactNode } from 'react';
import { Notification } from '@/types';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Mock initial notifications
const initialNotifications: Notification[] = [
  {
    id: 'notif-1',
    type: 'ride_request',
    title: 'New Ride Request',
    message: 'Zainab Malik wants to join your ride to NUTECH Campus',
    read: false,
    createdAt: '2026-01-27T08:30:00Z',
    actionUrl: '/dashboard',
    relatedId: 'ride-req-1',
  },
  {
    id: 'notif-2',
    type: 'ride_accepted',
    title: 'Ride Accepted!',
    message: 'Ahmed Khan accepted your ride request for tomorrow 8:00 AM',
    read: false,
    createdAt: '2026-01-27T07:45:00Z',
    actionUrl: '/dashboard',
    relatedId: 'route-1',
  },
  {
    id: 'notif-3',
    type: 'new_message',
    title: 'New Message',
    message: 'You have a new message from Fatima Ali',
    read: false,
    createdAt: '2026-01-27T07:00:00Z',
    actionUrl: '/messages',
    relatedId: 'conv-2',
  },
  {
    id: 'notif-4',
    type: 'ride_reminder',
    title: 'Ride Tomorrow',
    message: 'Reminder: You have a ride scheduled for tomorrow at 8:00 AM from F-6 Markaz',
    read: true,
    createdAt: '2026-01-26T20:00:00Z',
    actionUrl: '/dashboard',
  },
  {
    id: 'notif-5',
    type: 'ride_request',
    title: 'Ride Request Pending',
    message: 'Your request to join Hassan Raza\'s ride is pending approval',
    read: true,
    createdAt: '2026-01-26T15:00:00Z',
    actionUrl: '/dashboard',
    relatedId: 'route-5',
  },
];

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [newNotification, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
