import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  CalendarDays,
  Clock,
  MapPin,
  Car,
  Bike,
  Users,
  Star,
  MessageSquare,
  Navigation,
  Plus,
} from "lucide-react";

import { format } from "date-fns";


export default function UpcomingRides() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  // Get all upcoming rides (next 7 days) - both as driver and passenger
  const [upcomingAsDriver, setUpcomingAsDriver] = useState<any[]>([]);
  const [upcomingAsPassenger, setUpcomingAsPassenger] = useState<any[]>([]);

  useEffect(() => {
    const fetchRides = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        const now = new Date();

        // Fetch driver's own routes
        const driverRes = await fetch(`${import.meta.env.VITE_API_URL}/rides`, {
          headers,
        });
        const driverData = await driverRes.json();
        const allRides = (driverData.data.routes || []).map((r: any) => ({
          ...r,
          pickup: {
            lat: r.originLat,
            lng: r.originLng,
            address: r.originAddress,
          },
          dropoff: { lat: r.destLat, lng: r.destLng, address: r.destAddress },
          datetime: r.departureTime,
        }));
        setUpcomingAsDriver(
          allRides.filter(
            (r: any) => r.driverId === user?.id && new Date(r.datetime) > now,
          ),
        );

        // Fetch rides user booked as passenger (ACCEPTED only)
        const passengerRes = await fetch(
          `${import.meta.env.VITE_API_URL}/rides/my-bookings`,
          { headers },
        );
        const passengerData = await passengerRes.json();
        const bookedRides = (passengerData.data?.rides || [])
          .filter((r: any) => new Date(r.route?.departureTime) > now)
          .map((r: any) => ({
            ...r.route,
            pickup: {
              lat: r.route.originLat,
              lng: r.route.originLng,
              address: r.route.originAddress,
            },
            dropoff: {
              lat: r.route.destLat,
              lng: r.route.destLng,
              address: r.route.destAddress,
            },
            datetime: r.route.departureTime,
          }));
        setUpcomingAsPassenger(bookedRides);

        // Fetch pending requests for driver
        const reqRes = await fetch(
          `${import.meta.env.VITE_API_URL}/rides/requests`,
          { headers },
        );
        const reqData = await reqRes.json();
        setPendingRequests(reqData.data.requests || []);
      } catch (err) {
        console.error("Failed to fetch rides:", err);
      }
    };
    fetchRides(); // ← THIS WAS MISSING
  }, [user]);

  const handleManageRequest = async (
    rideId: string,
    status: "ACCEPTED" | "REJECTED",
  ) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/rides/${rideId}/manage`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        },
      );
      if (!response.ok) throw new Error("Failed to update request");
      setPendingRequests((prev) => prev.filter((r) => r.id !== rideId));
      toast({
        title: status === "ACCEPTED" ? "Ride Accepted!" : "Ride Rejected",
        description:
          status === "ACCEPTED"
            ? "Passenger has been notified."
            : "Request has been declined.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update request",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleCancel = async (routeId: string, role: string) => {
    if (!confirm("Are you sure you want to cancel this ride?")) return;
    try {
      const token = localStorage.getItem("token");
      const url =
        role === "driver"
          ? `${import.meta.env.VITE_API_URL}/rides/${routeId}/cancel-route`
          : `${import.meta.env.VITE_API_URL}/rides/${routeId}/cancel-request`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to cancel");
      if (role === "driver") {
        setUpcomingAsDriver((prev) => prev.filter((r) => r.id !== routeId));
      } else {
        setUpcomingAsPassenger((prev) => prev.filter((r) => r.id !== routeId));
      }
      toast({ title: "Ride cancelled successfully" });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const RideCard = ({ route, role }: { route: any; role: "driver" | "passenger" }) => {
    const navigate = useNavigate();
    return (
      <Card className="hover:border-primary/30 transition-colors">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            {/* Vehicle Icon */}
            <div
              className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                role === "driver"
                  ? "bg-primary/10 text-primary"
                  : "bg-accent text-accent-foreground"
              }`}
            >
              {route.vehicle === "CAR" ? (
                <Car className="h-6 w-6" />
              ) : (
                <Bike className="h-6 w-6" />
              )}
            </div>

            {/* Ride Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={role === "driver" ? "default" : "secondary"}>
                  {role === "driver" ? "You're Driving" : "Passenger"}
                </Badge>
                {route.womenOnly && (
                  <Badge
                    variant="outline"
                    className="text-pink-600 border-pink-300"
                  >
                    Women Only
                  </Badge>
                )}
              </div>

              {/* Route */}
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {route.pickup.address.split(",")[0]} →{" "}
                  {route.dropoff.address.split(",")[0]}
                </span>
              </div>

              {/* Date & Time */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {format(new Date(route.datetime), "EEE, MMM d, yyyy")}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(route.datetime), "h:mm a")}
                </span>
              </div>

              {/* Driver/Passenger Info */}
              {role === "passenger" && route.driver && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(route.driver.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{route.driver.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-primary text-primary" />
                        {route.driver.rating.toFixed(1)}
                      </span>
                      <span>•</span>
                      <span>{route.driver.department}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Available Seats */}
              {role === "driver" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>
                    {route.availableSeats} of {route.totalSeats} seats available
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}

            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (role === "passenger" && route.driver) {
                    navigate(
                      `/messages?userId=${route.driver.id}&userName=${encodeURIComponent(route.driver.name)}`,
                    );
                  } else if (role === "driver") {
                    navigate(`/messages?rideId=${route.id}`);
                  }
                }}
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                Chat
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  navigate(`/ride-detail/${route.id}`, {
                    state: {
                      pickup: route.pickup,
                      dropoff: route.dropoff,
                      datetime: route.datetime,
                    },
                  })
                }
              >
                <Navigation className="h-4 w-4 mr-1" />
                Track
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleCancel(route.id, role)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Layout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">Upcoming Rides</h1>
            <p className="text-muted-foreground">
              Your scheduled carpools for the next 7 days
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/find-carpool">
              <Button variant="outline">Find More Rides</Button>
            </Link>
            <Link to="/offer-ride">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Offer Ride
              </Button>
            </Link>
          </div>
        </div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <Users className="h-5 w-5" />
                Pending Requests ({pendingRequests.length})
              </CardTitle>
              <CardDescription>
                Students waiting for your approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingRequests.map((req: any) => (
                  <div
                    key={req.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white border"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {req.passenger.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{req.passenger.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {req.passenger.department} • ⭐{" "}
                        {req.passenger.rating?.toFixed(1) || "New"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {req.route.originAddress.split(",")[0]} →{" "}
                        {req.route.destAddress.split(",")[0]}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleManageRequest(req.id, "ACCEPTED")}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleManageRequest(req.id, "REJECTED")}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-8">
          {/* Rides as Driver */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" />
                As Driver
              </CardTitle>
              <CardDescription>
                Rides you're offering to other students
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingAsDriver.length > 0 ? (
                <div className="space-y-4">
                  {upcomingAsDriver.map((route) => (
                    <RideCard key={route.id} route={route} role="driver" />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Car className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground mb-4">
                    No upcoming rides as driver
                  </p>
                  <Link to="/offer-ride">
                    <Button variant="outline" size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Offer a Ride
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rides as Passenger */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                As Passenger
              </CardTitle>
              <CardDescription>
                Rides you've booked with other drivers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingAsPassenger.length > 0 ? (
                <div className="space-y-4">
                  {upcomingAsPassenger.map((route) => (
                    <RideCard key={route.id} route={route} role="passenger" />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground mb-4">
                    No upcoming rides as passenger
                  </p>
                  <Link to="/find-carpool">
                    <Button variant="outline" size="sm">
                      Find a Carpool
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
