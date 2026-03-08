import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
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

  const addNotification = useCallback(
    (notification: Omit<Notification, "id" | "createdAt" | "read">) => {
      const newNotification: Notification = {
        ...notification,
        id: `notif-${Date.now()}`,
        createdAt: new Date().toISOString(),
        read: false,
      };
      setNotifications((prev) => [newNotification, ...prev]);
    },
    [],
  );

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
          title: "New Ride Request 🚗",
          message: data.message,
          actionUrl: "/upcoming-rides",
          relatedId: data.rideId,
        });
        // Tell UpcomingRides to re-fetch pending requests immediately
        window.dispatchEvent(new CustomEvent("newRideRequest"));
      } else if (data.type === "ride_accepted") {
        addNotification({
          type: "ride_accepted",
          title: "Ride Accepted! 🎉",
          message: data.message,
          actionUrl: "/upcoming-rides",
          relatedId: data.rideId,
        });

        // ✅ Auto-redirect passenger to upcoming rides page
        // Use a small delay so the notification toast shows first
        setTimeout(() => {
          window.location.href = "/upcoming-rides";
        }, 1500);
      } else if (data.type === "ride_rejected") {
        addNotification({
          type: "ride_rejected",
          title: "Ride Declined",
          message: data.message,
          actionUrl: "/find-carpool",
          relatedId: data.rideId,
        });
      } else if (data.type === "ride_completed") {
        addNotification({
          type: "ride_accepted",
          title: "Ride Completed! ✅",
          message: data.message || "Your ride has been completed.",
          actionUrl: "/history",
        });
        // Remove from upcoming rides + trigger rating modal
        window.dispatchEvent(
          new CustomEvent("rideCompleted", {
            detail: {
              routeId: data.routeId,
              driverName: data.driverName,
              rideId: data.rideId,
            },
          }),
        );
      } else if (data.type === "message") {
        addNotification({
          type: "new_message",
          title: "New Message 💬",
          message: "You have a new message",
          actionUrl: "/messages",
        });
      }
    });

    // Real-time seat count changes → any page with RideCard updates live
    socket.on(
      "routeUpdated",
      (data: { routeId: string; availableSeats: number }) => {
        window.dispatchEvent(new CustomEvent("routeUpdated", { detail: data }));
      },
    );

    // Driver started a 2-min wait → show countdown to driver + all passengers
    socket.on("driverWaiting", (data: { routeId: string; endTime: number }) => {
      window.dispatchEvent(new CustomEvent("driverWaiting", { detail: data }));
    });

    // 2-min wait expired → auto-start the ride
    socket.on("waitTimerExpired", (data: { routeId: string }) => {
      window.dispatchEvent(
        new CustomEvent("waitTimerExpired", { detail: data }),
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, user?.id, addNotification]);

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
  if (context === undefined)
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  return context;
}
