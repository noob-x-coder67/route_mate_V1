import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Car,
  Bike,
  MapPin,
  Clock,
  Users,
  CheckCircle2,
  CalendarDays,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export default function RideHistory() {
  const [driverHistory, setDriverHistory] = useState<any[]>([]);
  const [passengerHistory, setPassengerHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"driver" | "passenger">("driver");

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        const [driverRes, passengerRes] = await Promise.all([
          fetch(`${API_URL}/rides/history/driver`, { headers }),
          fetch(`${API_URL}/rides/history/passenger`, { headers }),
        ]);
        const driverData = await driverRes.json();
        const passengerData = await passengerRes.json();
        setDriverHistory(driverData.data?.routes || []);
        setPassengerHistory(passengerData.data?.rides || []);
      } catch (err) {
        console.error("Failed to fetch history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const DriverCard = ({ route }: { route: any }) => (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      {/* Top row: icon + route + badge */}
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          {route.vehicle === "CAR" ? (
            <Car className="h-5 w-5" />
          ) : (
            <Bike className="h-5 w-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-semibold truncate">
                {route.originAddress?.split(",")[0]} →{" "}
                {route.destAddress?.split(",")[0]}
              </span>
            </div>
            <Badge className="flex-shrink-0 bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Done
            </Badge>
          </div>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pl-[52px]">
        <span className="flex items-center gap-1">
          <CalendarDays className="h-3 w-3" />
          {format(new Date(route.departureTime), "MMM d, yyyy")}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {format(new Date(route.departureTime), "h:mm a")}
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {route.totalSeats - route.availableSeats} passenger
          {route.totalSeats - route.availableSeats !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );

  const PassengerCard = ({ ride }: { ride: any }) => (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-accent text-accent-foreground flex items-center justify-center">
          <Car className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-semibold truncate">
                {ride.route?.originAddress?.split(",")[0]} →{" "}
                {ride.route?.destAddress?.split(",")[0]}
              </span>
            </div>
            <Badge
              variant="outline"
              className="flex-shrink-0 capitalize text-xs"
            >
              {ride.status?.toLowerCase()}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pl-[52px]">
        <span className="flex items-center gap-1">
          <CalendarDays className="h-3 w-3" />
          {format(new Date(ride.route?.departureTime), "MMM d, yyyy")}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {format(new Date(ride.route?.departureTime), "h:mm a")}
        </span>
        {ride.route?.driver?.name && (
          <span className="flex items-center gap-1">
            <Car className="h-3 w-3" />
            {ride.route.driver.name}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="container py-6 max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold mb-1">Ride History</h1>
          <p className="text-sm text-muted-foreground">
            Your past rides as driver and passenger
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl border bg-muted p-1 gap-1">
          <button
            onClick={() => setActiveTab("driver")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "driver"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Car className="h-4 w-4" />
            As Driver
            {driverHistory.length > 0 && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === "driver" ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20"}`}
              >
                {driverHistory.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("passenger")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "passenger"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4" />
            As Passenger
            {passengerHistory.length > 0 && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === "passenger" ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20"}`}
              >
                {passengerHistory.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-3 animate-pulse opacity-40" />
            <p>Loading your history...</p>
          </div>
        ) : activeTab === "driver" ? (
          driverHistory.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Car className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No rides offered yet</p>
              <p className="text-sm mt-1">
                When you complete rides as a driver, they'll appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {driverHistory.map((route: any) => (
                <DriverCard key={route.id} route={route} />
              ))}
            </div>
          )
        ) : passengerHistory.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No rides taken yet</p>
            <p className="text-sm mt-1">
              Rides you complete as a passenger will show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {passengerHistory.map((ride: any) => (
              <PassengerCard key={ride.id} ride={ride} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
