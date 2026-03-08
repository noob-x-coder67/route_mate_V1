import { Link } from "react-router-dom";
import { useNotifications } from "@/contexts/NotificationContext";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  Check,
  CheckCheck,
  Car,
  MessageSquare,
  Clock,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const notificationIcons = {
  ride_request: Car,
  ride_accepted: Check,
  ride_rejected: X,
  new_message: MessageSquare,
  ride_reminder: Clock,
};

const notificationColors = {
  ride_request: "text-primary bg-primary/10",
  ride_accepted: "text-green-600 bg-green-100",
  ride_rejected: "text-destructive bg-destructive/10",
  new_message: "text-blue-600 bg-blue-100",
  ride_reminder: "text-amber-600 bg-amber-100",
};

export function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
  } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-popover" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon = notificationIcons[notification.type];
                const colorClass = notificationColors[notification.type];

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "relative p-4 hover:bg-muted/50 transition-colors",
                      !notification.read && "bg-primary/5",
                    )}
                  >
                    <div className="flex gap-3">
                      <div
                        className={cn("p-2 rounded-full shrink-0", colorClass)}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {notification.actionUrl ? (
                          <Link
                            to={notification.actionUrl}
                            onClick={() => markAsRead(notification.id)}
                            className="block"
                          >
                            <p className="font-medium text-sm">
                              {notification.title}
                            </p>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {notification.message}
                            </p>
                          </Link>
                        ) : (
                          <>
                            <p className="font-medium text-sm">
                              {notification.title}
                            </p>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {notification.message}
                            </p>
                          </>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(
                            new Date(notification.createdAt),
                            { addSuffix: true },
                          )}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                        onClick={() => clearNotification(notification.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    {!notification.read && (
                      <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="p-2 border-t">
          <Link to="/upcoming-rides">
            <Button variant="ghost" className="w-full text-sm">
              View all notifications
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
