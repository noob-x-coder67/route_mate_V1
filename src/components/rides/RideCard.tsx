import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Route } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  Car,
  Bike,
  MapPin,
  Clock,
  Star,
  Users,
  Map,
  MessageSquare,
  ChevronRight,
  Timer,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/contexts/NotificationContext";

interface RideCardProps {
  route: Route;
  variant?: "default" | "compact" | "detailed";
  onViewMap?: () => void;
  onClick?: () => void;
  isSelected?: boolean;
  waitEndsAt?: number | null; // timestamp ms — shows countdown when driver is waiting
}

function useCountdown(endTime: number | null) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  useEffect(() => {
    if (!endTime) return;
    const tick = () =>
      setSecondsLeft(Math.max(0, Math.ceil((endTime - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);
  return secondsLeft;
}

// Price estimate: Rs/km based on vehicle, split by totalSeats
function calcPrice(distance: number, vehicle: string, seats: number): string {
  if (!distance || distance <= 0) return "";
  const rate = vehicle === "CAR" ? 20 : 10; // PKR per km
  const perPerson = Math.round((distance * rate) / Math.max(seats, 1));
  return `Rs ${perPerson}`;
}

export function RideCard({
  route,
  variant = "default",
  onViewMap,
  onClick,
  isSelected = false,
  waitEndsAt = null,
}: RideCardProps) {
  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  const driver = route.driver;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { notifications } = useNotifications();
  const [requesting, setRequesting] = useState(false);
  const [rideStatus, setRideStatus] = useState<string | null>(null);
  const [seatsRequested, setSeatsRequested] = useState(1);
  const [showSeatPicker, setShowSeatPicker] = useState(false);

  // Wait timer countdown
  const _timerSecs = useCountdown(waitEndsAt);
  const showTimer = waitEndsAt !== null && _timerSecs > 0;
  const timerMins = Math.floor(_timerSecs / 60);
  const timerSecs = _timerSecs % 60;

  // Check ride status from DB on mount
  useEffect(() => {
    if (!user?.id) return;
    const checkStatus = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/rides/my-requests`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const data = await res.json();
        const match = (data.data?.rides || []).find(
          (r: any) => r.routeId === route.id,
        );
        if (match) setRideStatus(match.status);
      } catch (err) {}
    };
    checkStatus();
  }, [user?.id, route.id]);

  // Listen for ride status updates from notification context (via socket)
  useEffect(() => {
    const latestAccepted = notifications.find(
      (n) => n.type === "ride_accepted" && n.relatedId === route.id,
    );
    if (latestAccepted) setRideStatus("ACCEPTED");
  }, [notifications, route.id]);

  // Reset status when passenger cancels from UpcomingRides
  useEffect(() => {
    const handler = (e: Event) => {
      const { routeId } = (e as CustomEvent).detail;
      if (routeId === route.id) setRideStatus(null);
    };
    window.addEventListener("rideCancelled", handler);
    return () => window.removeEventListener("rideCancelled", handler);
  }, [route.id]);

  // Real-time available seats update — reflects immediately when anyone requests
  const [liveAvailableSeats, setLiveAvailableSeats] = useState<number>(
    (route as any).availableSeats ?? route.totalSeats,
  );
  useEffect(() => {
    const handler = (e: Event) => {
      const { routeId, availableSeats } = (e as CustomEvent).detail;
      if (routeId === route.id) setLiveAvailableSeats(availableSeats);
    };
    window.addEventListener("routeUpdated", handler);
    return () => window.removeEventListener("routeUpdated", handler);
  }, [route.id]);

  const handleRequest = async () => {
    try {
      setRequesting(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/rides/request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ routeId: route.id, seatsRequested }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to request ride");
      setRideStatus("PENDING");
      toast({
        title: "Request Sent!",
        description: "Waiting for driver to accept.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRequesting(false);
    }
  };

  const getButtonLabel = () => {
    if (requesting) return "Requesting...";
    if (rideStatus === "ACCEPTED") return "Accepted ✓";
    if (rideStatus === "PENDING") return "Requested ✓";
    if (rideStatus === "REJECTED") return "Rejected";
    return variant === "detailed" ? "Request Ride" : "Request";
  };

  if (variant === "compact") {
    return (
      <Card
        className={cn(
          "cursor-pointer transition-all hover:border-primary/50",
          isSelected && "border-primary ring-1 ring-primary",
        )}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              {route.vehicle === "CAR" ? (
                <Car className="h-5 w-5" />
              ) : (
                <Bike className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {route.pickup.address.split(",")[0]} →{" "}
                {route.dropoff.address.split(",")[0]}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(route.datetime), "EEE, MMM d")} •{" "}
                {format(new Date(route.datetime), "h:mm a")}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "detailed") {
    return (
      <Card>
        <CardContent className="p-6">
          {driver && (
            <div className="flex items-center gap-3 mb-4 pb-4 border-b">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(driver.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold">{driver.name}</p>
                <p className="text-sm text-muted-foreground">
                  {driver.department}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span className="font-medium">{driver.rating.toFixed(1)}</span>
              </div>
            </div>
          )}
          <div className="space-y-3 mb-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Pickup</p>
                <p className="text-sm font-medium">{route.pickup.address}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-destructive mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Drop-off</p>
                <p className="text-sm font-medium">{route.dropoff.address}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(route.datetime), "EEE, MMM d")} at{" "}
              {format(new Date(route.datetime), "h:mm a")}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {liveAvailableSeats} seat{liveAvailableSeats !== 1 ? "s" : ""}{" "}
              left
            </Badge>
            {route.womenOnly && (
              <Badge className="bg-pink-100 text-pink-700 hover:bg-pink-100">
                Women Only
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={handleRequest}
              disabled={
                requesting || !!rideStatus || route.driverId === user?.id
              }
            >
              {getButtonLabel()}
            </Button>
            {driver && (
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  navigate(
                    `/messages?userId=${driver.id}&userName=${encodeURIComponent(driver.name)}`,
                  )
                }
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default variant
  const priceLabel = calcPrice(
    route.distance || 0,
    route.vehicle,
    route.totalSeats || 1,
  );
  return (
    <Card className="hover:border-primary/50 hover:shadow-md transition-all overflow-hidden">
      <CardContent className="p-5">
        {showTimer && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium mb-3">
            <Timer className="h-3.5 w-3.5 flex-shrink-0 animate-pulse" />
            <span>
              Driver waiting —{" "}
              <strong>
                {timerMins}:{timerSecs.toString().padStart(2, "0")}
              </strong>{" "}
              left to request
            </span>
          </div>
        )}
        {driver && (
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {getInitials(driver.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p
                className="font-medium truncate cursor-pointer hover:text-primary"
                onClick={() => navigate(`/ride-detail/${route.id}`)}
              >
                {driver.name}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-primary text-primary" />
                  {driver.rating.toFixed(1)}
                </span>
                <span>•</span>
                <span>{driver.department}</span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
              {route.vehicle === "CAR" ? (
                <Car className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Bike className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </div>
        )}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
            <p className="text-sm truncate text-muted-foreground">
              {route.pickup.address}
            </p>
          </div>
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="h-2 w-2 rounded-full bg-destructive flex-shrink-0" />
            <p className="text-sm truncate text-muted-foreground">
              {route.dropoff.address}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="secondary" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {format(new Date(route.datetime), "h:mm a")}
          </Badge>
          <Badge variant="outline" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            {liveAvailableSeats} seat{liveAvailableSeats !== 1 ? "s" : ""}
          </Badge>
          {priceLabel && (
            <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
              {priceLabel}/person
            </Badge>
          )}
          {route.womenOnly && (
            <Badge className="text-xs bg-pink-100 text-pink-700 hover:bg-pink-100">
              Women Only
            </Badge>
          )}
        </div>
        {showSeatPicker && !rideStatus && route.driverId !== user?.id ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              How many seats do you need?
            </p>
            <div className="flex gap-1">
              {Array.from(
                { length: Math.min(liveAvailableSeats, 4) },
                (_, i) => i + 1,
              ).map((n) => (
                <button
                  key={n}
                  onClick={() => setSeatsRequested(n)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                    seatsRequested === n
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => setShowSeatPicker(false)}
              >
                Back
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={() => {
                  handleRequest();
                  setShowSeatPicker(false);
                }}
                disabled={requesting}
              >
                Confirm {seatsRequested} seat{seatsRequested > 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              onClick={() => {
                if (
                  !rideStatus &&
                  route.driverId !== user?.id &&
                  liveAvailableSeats > 1
                ) {
                  setShowSeatPicker(true);
                } else {
                  handleRequest();
                }
              }}
              disabled={
                requesting || !!rideStatus || route.driverId === user?.id
              }
            >
              {getButtonLabel()}
            </Button>
            {onViewMap && (
              <Button size="sm" variant="outline" onClick={onViewMap}>
                <Map className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
