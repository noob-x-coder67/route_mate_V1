import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Car, Bike, MapPin, Clock, History, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export default function RideHistory() {
  const { user } = useAuth();
  const [driverHistory, setDriverHistory] = useState<any[]>([]);
  const [passengerHistory, setPassengerHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        // Past rides as driver
        const driverRes = await fetch(`${API_URL}/rides/history/driver`, {
          headers,
        });
        const driverData = await driverRes.json();
        setDriverHistory(driverData.data?.routes || []);

        // Past rides as passenger
        const passengerRes = await fetch(`${API_URL}/rides/history/passenger`, {
          headers,
        });
        const passengerData = await passengerRes.json();
        setPassengerHistory(passengerData.data?.rides || []);
      } catch (err) {
        console.error("Failed to fetch history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <Layout>
      <div className="container py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Ride History</h1>
          <p className="text-muted-foreground">
            Your past rides as driver and passenger
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading history...
          </div>
        ) : (
          <>
            {/* As Driver */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  As Driver
                </CardTitle>
              </CardHeader>
              <CardContent>
                {driverHistory.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No past rides as driver
                  </p>
                ) : (
                  <div className="space-y-3">
                    {driverHistory.map((route: any) => (
                      <div
                        key={route.id}
                        className="flex items-center gap-4 p-4 rounded-lg bg-muted/50"
                      >
                        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          {route.vehicle === "CAR" ? (
                            <Car className="h-5 w-5" />
                          ) : (
                            <Bike className="h-5 w-5" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {route.originAddress?.split(",")[0]} →{" "}
                              {route.destAddress?.split(",")[0]}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(
                                new Date(route.departureTime),
                                "MMM d, yyyy h:mm a",
                              )}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {route.totalSeats - route.availableSeats}{" "}
                              passengers
                            </span>
                          </div>
                        </div>
                        <Badge variant="secondary">Completed</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* As Passenger */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  As Passenger
                </CardTitle>
              </CardHeader>
              <CardContent>
                {passengerHistory.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No past rides as passenger
                  </p>
                ) : (
                  <div className="space-y-3">
                    {passengerHistory.map((ride: any) => (
                      <div
                        key={ride.id}
                        className="flex items-center gap-4 p-4 rounded-lg bg-muted/50"
                      >
                        <div className="h-10 w-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
                          <Car className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {ride.route?.originAddress?.split(",")[0]} →{" "}
                              {ride.route?.destAddress?.split(",")[0]}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(
                                new Date(ride.route?.departureTime),
                                "MMM d, yyyy h:mm a",
                              )}
                            </span>
                            <span>Driver: {ride.route?.driver?.name}</span>
                          </div>
                        </div>
                        <Badge variant="outline">{ride.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
