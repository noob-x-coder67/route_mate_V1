import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";
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
  CheckCircle,
  Timer,
} from "lucide-react";
import { format } from "date-fns";
import { WaitOrStartModal } from "@/components/rides/WaitOrStartModal";

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

function WaitTimerBanner({ endTime }: { endTime: number }) {
  const secs = useCountdown(endTime);
  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  if (secs <= 0) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium mb-3">
      <Timer className="h-3.5 w-3.5 flex-shrink-0 animate-pulse" />
      <span>
        Driver is waiting for more passengers —{" "}
        <strong>
          {mins}:{s.toString().padStart(2, "0")}
        </strong>{" "}
        remaining
      </span>
    </div>
  );
}

export default function UpcomingRides() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [upcomingAsDriver, setUpcomingAsDriver] = useState<any[]>([]);
  const [upcomingAsPassenger, setUpcomingAsPassenger] = useState<any[]>([]);
  const [acceptedRouteIds, setAcceptedRouteIds] = useState<Set<string>>(
    new Set(),
  );
  const [waitTimers, setWaitTimers] = useState<Record<string, number>>({});
  const [waitModal, setWaitModal] = useState<{
    open: boolean;
    routeId: string;
    passengerName: string;
    remainingSeats: number;
  }>({ open: false, routeId: "", passengerName: "", remainingSeats: 0 });

  const fetchRides = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const now = new Date();

      const driverRes = await fetch(
        `${import.meta.env.VITE_API_URL}/rides/my-routes`,
        { headers },
      );
      const driverData = await driverRes.json();
      const driverRoutes = (driverData.data.routes || []).map((r: any) => ({
        ...r,
        pickup: {
          lat: r.originLat,
          lng: r.originLng,
          address: r.originAddress,
        },
        dropoff: { lat: r.destLat, lng: r.destLng, address: r.destAddress },
        datetime: r.departureTime,
        acceptedRides: r.rides || [],
      }));
      setUpcomingAsDriver(driverRoutes);
      const alreadyAccepted = new Set<string>(
        driverRoutes
          .filter((r: any) => r.acceptedRides.length > 0)
          .map((r: any) => r.id as string),
      );
      setAcceptedRouteIds(alreadyAccepted);

      const passengerRes = await fetch(
        `${import.meta.env.VITE_API_URL}/rides/my-bookings`,
        { headers },
      );
      const passengerData = await passengerRes.json();
      const bookedRides = (passengerData.data?.rides || [])
        .filter(
          (r: any) =>
            new Date(r.route?.departureTime) > now &&
            r.route?.status !== "COMPLETED" &&
            r.route?.status !== "CANCELLED",
        )
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
          driver: r.route.driver,
        }));
      setUpcomingAsPassenger(bookedRides);

      const reqRes = await fetch(
        `${import.meta.env.VITE_API_URL}/rides/requests`,
        { headers },
      );
      const reqData = await reqRes.json();
      setPendingRequests(reqData.data.requests || []);
    } catch (err) {
      console.error("Failed to fetch rides:", err);
    }
  }, [user]);

  useEffect(() => {
    fetchRides();
  }, [fetchRides]);

  useEffect(() => {
    const onRideCompleted = (e: Event) => {
      const { routeId } = (e as CustomEvent).detail;
      setUpcomingAsPassenger((prev) => prev.filter((r) => r.id !== routeId));
    };
    const onRatingSubmitted = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/rides/my-bookings`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const data = await res.json();
        const refreshed = (data.data?.rides || [])
          .filter(
            (r: any) =>
              r.route?.status !== "COMPLETED" &&
              r.route?.status !== "CANCELLED",
          )
          .map((r: any) => ({
            ...r.route,
            pickup: { address: r.route.originAddress },
            dropoff: { address: r.route.destAddress },
            datetime: r.route.departureTime,
            driver: r.route.driver,
          }));
        setUpcomingAsPassenger(refreshed);
      } catch {}
    };
    const onDriverWaiting = (e: Event) => {
      const { routeId, endTime } = (e as CustomEvent).detail;
      setWaitTimers((prev) => ({ ...prev, [routeId]: endTime }));
    };
    const onWaitTimerExpired = (e: Event) => {
      const { routeId } = (e as CustomEvent).detail;
      setWaitTimers((prev) => {
        const n = { ...prev };
        delete n[routeId];
        return n;
      });
      setAcceptedRouteIds((prev) => new Set([...prev, routeId]));
      toast({
        title: "Timer ended",
        description: "Your ride has auto-started. Click Complete when done.",
      });
    };
    // Re-fetch pending requests whenever a new ride request comes in via socket
    const onNewRideRequest = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/rides/requests`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const data = await res.json();
        setPendingRequests(data.data.requests || []);
      } catch {}
    };

    window.addEventListener("rideCompleted", onRideCompleted);
    window.addEventListener("ratingSubmitted", onRatingSubmitted);
    window.addEventListener("driverWaiting", onDriverWaiting);
    window.addEventListener("waitTimerExpired", onWaitTimerExpired);
    window.addEventListener("newRideRequest", onNewRideRequest);
    return () => {
      window.removeEventListener("rideCompleted", onRideCompleted);
      window.removeEventListener("ratingSubmitted", onRatingSubmitted);
      window.removeEventListener("driverWaiting", onDriverWaiting);
      window.removeEventListener("waitTimerExpired", onWaitTimerExpired);
      window.removeEventListener("newRideRequest", onNewRideRequest);
    };
  }, [toast]);

  const handleManageRequest = async (
    rideId: string,
    status: "ACCEPTED" | "REJECTED",
  ) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
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
      if (!res.ok) throw new Error("Failed to update request");
      setPendingRequests((prev) => {
        const req = prev.find((r) => r.id === rideId);
        if (status === "ACCEPTED" && req?.routeId) {
          setAcceptedRouteIds((s) => new Set([...s, req.routeId]));
          setUpcomingAsDriver((routes) =>
            routes.map((r) => {
              if (r.id !== req.routeId) return r;
              const updatedRoute = {
                ...r,
                acceptedRides: [...(r.acceptedRides || []), { id: rideId }],
              };
              if ((r.availableSeats ?? 0) > 0) {
                setTimeout(
                  () =>
                    setWaitModal({
                      open: true,
                      routeId: r.id,
                      passengerName: req.passenger?.name || "Passenger",
                      remainingSeats: r.availableSeats ?? 0,
                    }),
                  400,
                );
              }
              return updatedRoute;
            }),
          );
        }
        return prev.filter((r) => r.id !== rideId);
      });
      toast({
        title: status === "ACCEPTED" ? "Ride Accepted!" : "Ride Rejected",
        description:
          status === "ACCEPTED" ? "Passenger notified." : "Request declined.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update request",
        variant: "destructive",
      });
    }
  };

  const handleWait = async () => {
    const { routeId } = waitModal;
    setWaitModal((m) => ({ ...m, open: false }));
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/rides/${routeId}/start-wait-timer`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      if (res.ok && data.data?.endTime) {
        setWaitTimers((prev) => ({ ...prev, [routeId]: data.data.endTime }));
        toast({
          title: "Waiting 2 minutes",
          description: "Passengers can see the countdown too.",
        });
      }
    } catch {}
  };

  const handleStartNow = async () => {
    const { routeId } = waitModal;
    setWaitModal((m) => ({ ...m, open: false }));
    try {
      const token = localStorage.getItem("token");
      await fetch(
        `${import.meta.env.VITE_API_URL}/rides/${routeId}/close-seats`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setUpcomingAsDriver((prev) =>
        prev.map((r) => (r.id === routeId ? { ...r, availableSeats: 0 } : r)),
      );
      toast({
        title: "Ride started!",
        description: "Seats closed. Click Complete when done.",
      });
    } catch {}
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
        window.dispatchEvent(
          new CustomEvent("rideCancelled", { detail: { routeId } }),
        );
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

  const handleComplete = async (routeId: string) => {
    if (!confirm("Mark this ride as completed?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/rides/${routeId}/complete`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to complete ride");
      setUpcomingAsDriver((prev) => prev.filter((r) => r.id !== routeId));
      await refreshUser();
      toast({
        title: "Ride Completed!",
        description: `CO2 saved: ${data.impact?.totalCo2Saved?.toFixed(2) || 0} kg`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const RideCard = ({
    route,
    role,
  }: {
    route: any;
    role: "driver" | "passenger";
  }) => {
    const navigate = useNavigate();
    const hasPassengers =
      (route.acceptedRides?.length ?? 0) > 0 || acceptedRouteIds.has(route.id);
    const timerEndTime = waitTimers[route.id] ?? null;
    return (
      <Card className="hover:border-primary/30 transition-colors">
        <CardContent className="pt-6">
          {timerEndTime && <WaitTimerBanner endTime={timerEndTime} />}
          <div className="flex items-start gap-4 mb-4">
            <div
              className={`h-12 w-12 rounded-xl flex-shrink-0 flex items-center justify-center ${role === "driver" ? "bg-primary/10 text-primary" : "bg-accent text-accent-foreground"}`}
            >
              {route.vehicle === "CAR" ? (
                <Car className="h-6 w-6" />
              ) : (
                <Bike className="h-6 w-6" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
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
              <div className="flex items-center gap-2 mb-2 overflow-hidden">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-semibold text-sm truncate">
                  {route.pickup.address.split(",")[0]} →{" "}
                  {route.dropoff.address.split(",")[0]}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-2">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {format(new Date(route.datetime), "EEE, MMM d, yyyy")}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(route.datetime), "h:mm a")}
                </span>
              </div>
              {role === "passenger" && route.driver && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Avatar className="h-9 w-9 flex-shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(route.driver.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{route.driver.name}</p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                      <Star className="h-3 w-3 fill-primary text-primary flex-shrink-0" />
                      <span>{route.driver.rating?.toFixed(1) ?? "New"}</span>
                      <span>•</span>
                      <span>{route.driver.department}</span>
                    </div>
                  </div>
                </div>
              )}
              {role === "driver" && (
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {route.availableSeats} of {route.totalSeats} seats open
                  </span>
                  {hasPassengers && (
                    <span className="text-green-600 font-medium">
                      ✓ {route.acceptedRides?.length ?? 1} accepted
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-3 border-t">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 min-w-[70px]"
              onClick={() =>
                role === "passenger" && route.driver
                  ? navigate(
                      `/messages?userId=${route.driver.id}&userName=${encodeURIComponent(route.driver.name)}`,
                    )
                  : navigate("/messages")
              }
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              Chat
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 min-w-[70px]"
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
              className="flex-1 min-w-[70px]"
              onClick={() => handleCancel(route.id, role)}
            >
              Cancel
            </Button>
            {role === "driver" && (
              <Button
                size="sm"
                className={`flex-1 min-w-[90px] text-white ${hasPassengers ? "bg-green-600 hover:bg-green-700" : "bg-gray-400 cursor-not-allowed"}`}
                onClick={() => hasPassengers && handleComplete(route.id)}
                disabled={!hasPassengers}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                {hasPassengers ? "Complete" : "No Riders Yet"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Layout>
      <div className="container py-4 md:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">
              Upcoming Rides
            </h1>
            <p className="text-sm text-muted-foreground">
              Your scheduled carpools for the next 7 days
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/find-carpool">
              <Button variant="outline" size="sm">
                Find More Rides
              </Button>
            </Link>
            <Link to="/offer-ride">
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Offer Ride
              </Button>
            </Link>
          </div>
        </div>

        {pendingRequests.length > 0 && (
          <Card className="border-orange-200 bg-orange-50/50 mb-6">
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
                    className="rounded-xl border bg-white p-4 space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                          {req.passenger.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">
                          {req.passenger.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {req.passenger.department} • ⭐{" "}
                          {req.passenger.rating?.toFixed(1) || "New"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {req.route.originAddress.split(",")[0]} →{" "}
                          {req.route.destAddress.split(",")[0]}
                        </p>
                        {(req.seatsRequested || 1) > 1 && (
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            <Users className="h-3 w-3" />
                            Needs {req.seatsRequested} seats
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleManageRequest(req.id, "ACCEPTED")}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
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

        <div className="space-y-6">
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

      <WaitOrStartModal
        open={waitModal.open}
        passengerName={waitModal.passengerName}
        remainingSeats={waitModal.remainingSeats}
        onWait={handleWait}
        onStart={handleStartNow}
      />
    </Layout>
  );
}
