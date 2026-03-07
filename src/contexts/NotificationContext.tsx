import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Notification } from "@/types";
import { io } from "socket.io-client";
import { useAuth } from "@/contexts/AuthContext";

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (
    notification: Omit<Notification, "id" | "createdAt" | "read">,
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user, isAuthenticated } = useAuth();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = (
    notification: Omit<Notification, "id" | "createdAt" | "read">,
  ) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [newNotification, ...prev]);
  };

  // Connect socket and listen for real-time notifications
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const SOCKET_URL =
      import.meta.env.VITE_API_URL?.replace("/api", "") ||
      "http://localhost:5001";
    const socket = io(SOCKET_URL);

    socket.emit("join", user.id);

    socket.on("newNotification", (data: any) => {
      if (data.type === "ride_request") {
        addNotification({
          type: "ride_request",
          title: "New Ride Request",
          message: data.message,
          actionUrl: "/upcoming-rides",
          relatedId: data.rideId,
        });
      } else if (data.type === "message") {
        addNotification({
          type: "new_message",
          title: "New Message",
          message: "You have a new message",
          actionUrl: "/messages",
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, user?.id]);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
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
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  }
  return context;
}
