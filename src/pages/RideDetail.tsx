import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RideMap } from "@/components/map/RideMap";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Users,
  Star,
  Car,
  Bike,
  MessageSquare,
  Shield,
} from "lucide-react";

export default function RideDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    const fetchRide = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/rides/${id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const data = await response.json();
        const r = data.data.route;
        setRoute({
          ...r,
          pickup: {
            lat: r.originLat,
            lng: r.originLng,
            address: r.originAddress,
          },
          dropoff: { lat: r.destLat, lng: r.destLng, address: r.destAddress },
          datetime: r.departureTime,
          stops: r.stops || [],
        });
      } catch (err) {
        console.error("Failed to fetch ride:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRide();
  }, [id]);

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

  if (loading)
    return (
      <Layout>
        <div className="container py-8 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading ride details...</p>
          </div>
        </div>
      </Layout>
    );

  if (!route)
    return (
      <Layout>
        <div className="container py-8 text-center">
          <p className="text-muted-foreground">Ride not found.</p>
          <Button onClick={() => navigate("/find-carpool")} className="mt-4">
            Back to Find Carpool
          </Button>
        </div>
      </Layout>
    );

  const isOwnRide = route.driverId === user?.id;

  return (
    <Layout>
      <div className="container py-8 max-w-4xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/find-carpool")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Find Carpool
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Details */}
          <div className="lg:col-span-1 space-y-4">
            {/* Driver Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                      {route.driver?.name
                        ?.split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-lg">
                      {route.driver?.name || "Unknown"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {route.driver?.department}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-3 w-3 fill-primary text-primary" />
                      <span className="text-sm font-medium">
                        {route.driver?.rating?.toFixed(1) || "0.0"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>University Verified</span>
                </div>
              </CardContent>
            </Card>

            {/* Ride Info */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-primary mt-1" />
                  <div>
                    <p className="text-xs text-muted-foreground">Pickup</p>
                    <p className="text-sm font-medium">
                      {route.pickup.address}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-destructive mt-1" />
                  <div>
                    <p className="text-xs text-muted-foreground">Dropoff</p>
                    <p className="text-sm font-medium">
                      {route.dropoff.address}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Departure</p>
                    <p className="text-sm font-medium">
                      {format(new Date(route.datetime), "EEE, MMM d")} at{" "}
                      {format(new Date(route.datetime), "h:mm a")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Seats Available
                    </p>
                    <p className="text-sm font-medium">
                      {route.availableSeats} of {route.totalSeats}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {route.vehicle === "CAR" ? (
                    <Car className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Bike className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Vehicle</p>
                    <p className="text-sm font-medium capitalize">
                      {route.vehicle}
                    </p>
                  </div>
                </div>
                {route.womenOnly && (
                  <Badge className="bg-pink-100 text-pink-700">
                    Women Only
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            {!isOwnRide && (
              <div className="space-y-2">
                <Button
                  className="w-full"
                  onClick={handleRequest}
                  disabled={requesting || requested}
                >
                  {requesting
                    ? "Requesting..."
                    : requested
                      ? "Request Sent ✓"
                      : "Request Ride"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    navigate(
                      `/messages?userId=${route.driverId}&userName=${route.driver?.name}`,
                    )
                  }
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Message Driver
                </Button>
              </div>
            )}
            {isOwnRide && (
              <Badge variant="secondary" className="w-full justify-center py-2">
                This is your ride
              </Badge>
            )}
          </div>

          {/* Right Column - Map */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden" style={{ height: "500px" }}>
              <RideMap routes={[route]} selectedRoute={route} height="500px" />
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
