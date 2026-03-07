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
import { io } from "socket.io-client";
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
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface RideCardProps {
  route: Route;
  variant?: "default" | "compact" | "detailed";
  onViewMap?: () => void;
  onClick?: () => void;
  isSelected?: boolean;
}

export function RideCard({
  route,
  variant = "default",
  onViewMap,
  onClick,
  isSelected = false,
}: RideCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const driver = route.driver;

  const navigate = useNavigate();

  //New Functionality for request ride card open
  const { user } = useAuth();
  const { toast } = useToast();
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [rideStatus, setRideStatus] = useState<string | null>(null);

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

    // Listen for real-time status update
    const SOCKET_URL =
      import.meta.env.VITE_API_URL?.replace("/api", "") ||
      "http://localhost:5001";
    const socket = io(SOCKET_URL);
    socket.emit("join", user.id);
    socket.on("rideStatusUpdate", (data: any) => {
      if (data.routeId === route.id) {
        setRideStatus(data.status);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.id, route.id]);

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
          body: JSON.stringify({ routeId: route.id }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to request ride");
      setRequested(true);
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
          {/* Driver Info */}
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

          {/* Route Details */}
          <div className="space-y-3 mb-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Pickup</p>
                <p className="text-sm font-medium">{route.pickup.address}</p>
              </div>
            </div>

            {(route.stops || []).length > 0 && (
              <div className="flex items-start gap-3 pl-1">
                <div className="w-2 h-2 rounded-full bg-muted-foreground mt-2" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {route.stops.length} stop{route.stops.length > 1 ? "s" : ""}{" "}
                    along the way
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-destructive mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Drop-off</p>
                <p className="text-sm font-medium">{route.dropoff.address}</p>
              </div>
            </div>
          </div>

          {/* Time & Details */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(route.datetime), "EEE, MMM d")} at{" "}
              {format(new Date(route.datetime), "h:mm a")}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {route.availableSeats} seat{route.availableSeats > 1 ? "s" : ""}{" "}
              left
            </Badge>
            {route.womenOnly && (
              <Badge className="bg-pink-100 text-pink-700 hover:bg-pink-100">
                Women Only
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={handleRequest}
              disabled={
                requesting ||
                !!rideStatus ||
                requested ||
                route.driverId === user?.id
              }
            >
              {requesting
                ? "Requesting..."
                : requested
                  ? rideStatus === "ACCEPTED"
                    ? "Accepted ✓"
                    : "Requested ✓"
                  : "Request Ride"}
            </Button>
            <Link to={`/messages`}>
              <Button variant="outline" size="icon">
                <MessageSquare className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default variant
  return (
    <Card className="hover:border-primary/50 hover:shadow-md transition-all">
      <CardContent className="p-5">
        {/* Header with Driver */}
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
                onClick={() => navigate(`/ride/${route.id}`)}
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

        {/* Route */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <p className="text-sm truncate">{route.pickup.address}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-destructive" />
            <p className="text-sm truncate">{route.dropoff.address}</p>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="secondary" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {format(new Date(route.datetime), "h:mm a")}
          </Badge>
          <Badge variant="outline" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            {route.availableSeats} seat{route.availableSeats > 1 ? "s" : ""}
          </Badge>
          {route.womenOnly && (
            <Badge className="text-xs bg-pink-100 text-pink-700 hover:bg-pink-100">
              Women Only
            </Badge>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={handleRequest}
            disabled={
              requesting ||
              !!rideStatus ||
              requested ||
              route.driverId === user?.id
            }
          >
            {requesting
              ? "Requesting..."
              : requested
                ? rideStatus === "ACCEPTED"
                  ? "Accepted ✓"
                  : "Requested ✓"
                : "Request"}
          </Button>
          {onViewMap && (
            <Button size="sm" variant="outline" onClick={onViewMap}>
              <Map className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
