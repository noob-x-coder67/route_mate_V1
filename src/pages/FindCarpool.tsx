import { useState, useMemo, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { RideCard } from "@/components/rides/RideCard";
import { RideFilters } from "@/components/rides/RideFilters";
import { RideMap } from "@/components/map/RideMap";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { LocationAutocomplete } from "@/components/common/LocationAutocomplete";
// import { mockRoutes, enrichRouteWithDriver } from '@/data/mockData';
import { RideSearchFilters, Route } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import {
  Search,
  CalendarDays,
  Clock,
  List,
  Map,
  Filter,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function FindCarpool() {
  const { user } = useAuth();
  const [searchFrom, setSearchFrom] = useState("");
  const [searchTo, setSearchTo] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("");
  const [filters, setFilters] = useState<RideSearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);

  // Enrich routes with driver data
  const [enrichedRoutes, setEnrichedRoutes] = useState<Route[]>([]);

  useEffect(() => {
    const fetchRides = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${import.meta.env.VITE_API_URL}/rides`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        const mapped = (data.data.routes || []).map((r: any) => ({
          ...r,
          pickup: {
            lat: r.originLat,
            lng: r.originLng,
            address: r.originAddress,
          },
          dropoff: { lat: r.destLat, lng: r.destLng, address: r.destAddress },
          datetime: r.departureTime,
          status: "ACTIVE" as any,
        }));
        setEnrichedRoutes(mapped);
      } catch (err) {
        console.error("Failed to fetch rides:", err);
      }
    };
    fetchRides();
  }, []);

  // Wait timers for rides where driver chose to wait: routeId -> endTime
  const [waitTimers, setWaitTimers] = useState<Record<string, number>>({});

  // Re-fetch rides after a rating is submitted so driver stars are up-to-date
  useEffect(() => {
    const handler = () => {
      const token = localStorage.getItem("token");
      fetch(`${import.meta.env.VITE_API_URL}/rides`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          const mapped = (data.data.routes || []).map((r: any) => ({
            ...r,
            pickup: {
              lat: r.originLat,
              lng: r.originLng,
              address: r.originAddress,
            },
            dropoff: { lat: r.destLat, lng: r.destLng, address: r.destAddress },
            datetime: r.departureTime,
            status: "ACTIVE" as any,
          }));
          setEnrichedRoutes(mapped);
        })
        .catch(() => {});
    };
    window.addEventListener("ratingSubmitted", handler);
    return () => window.removeEventListener("ratingSubmitted", handler);
  }, []);

  // Real-time seat count updates from socket
  useEffect(() => {
    const onRouteUpdated = (e: Event) => {
      const { routeId, availableSeats } = (e as CustomEvent).detail;
      setEnrichedRoutes((prev) =>
        prev.map((r) => (r.id === routeId ? { ...r, availableSeats } : r)),
      );
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
      // Remove from list — ride is starting, no more new requests
      setEnrichedRoutes((prev) => prev.filter((r) => r.id !== routeId));
    };
    window.addEventListener("routeUpdated", onRouteUpdated);
    window.addEventListener("driverWaiting", onDriverWaiting);
    window.addEventListener("waitTimerExpired", onWaitTimerExpired);
    return () => {
      window.removeEventListener("routeUpdated", onRouteUpdated);
      window.removeEventListener("driverWaiting", onDriverWaiting);
      window.removeEventListener("waitTimerExpired", onWaitTimerExpired);
    };
  }, []);

  // Filter routes based on search criteria
  const filteredRoutes = useMemo(() => {
    return enrichedRoutes.filter((route) => {
      // Text search on locations
      if (
        searchFrom &&
        !route.pickup.address.toLowerCase().includes(searchFrom.toLowerCase())
      ) {
        return false;
      }
      if (
        searchTo &&
        !route.dropoff.address.toLowerCase().includes(searchTo.toLowerCase())
      ) {
        return false;
      }

      // Date filter
      if (selectedDate) {
        const routeDate = new Date(route.datetime).toDateString();
        if (routeDate !== selectedDate.toDateString()) {
          return false;
        }
      }

      // Filters
      if (filters.minSeats && route.availableSeats < filters.minSeats) {
        return false;
      }

      if (filters.femaleDriverOnly && route.driver?.gender !== "FEMALE") {
        return false;
      }

      if (filters.maleDriverOnly && route.driver?.gender !== "MALE") {
        return false;
      }

      if (
        filters.sameDepartment &&
        user &&
        route.driver?.department !== user.department
      ) {
        return false;
      }

      if (
        filters.ratedDriversOnly &&
        (!route.driver?.rating || route.driver.rating < 4)
      ) {
        return false;
      }

      if (filters.noSmoking && route.driver?.preferences?.noSmoking === false) {
        return false;
      }

      return true;
    });
  }, [enrichedRoutes, searchFrom, searchTo, selectedDate, filters, user]);

  const handleRouteSelect = (route: Route) => {
    setSelectedRoute(route);
    if (viewMode === "list") {
      setViewMode("map");
    }
  };

  return (
    <Layout>
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Find a Carpool</h1>
          <p className="text-muted-foreground">
            Search for available rides matching your route and schedule
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* From */}
              <div className="space-y-2">
                <Label>From</Label>
                <LocationAutocomplete
                  value={searchFrom}
                  onChange={(value) => setSearchFrom(value)}
                  placeholder="e.g., F-7, Rawalpindi"
                  icon="pickup"
                />
              </div>

              {/* To */}
              <div className="space-y-2">
                <Label>To</Label>
                <LocationAutocomplete
                  value={searchTo}
                  onChange={(value) => setSearchTo(value)}
                  placeholder="e.g., NUTECH"
                  icon="dropoff"
                />
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground",
                      )}
                    >
                      {selectedDate
                        ? format(selectedDate, "PPP")
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0 bg-popover"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time
                </Label>
                <Input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                />
              </div>

              {/* Search & Filter Buttons */}
              <div className="flex items-end gap-2">
                <Button className="flex-1">
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowFilters(!showFilters)}
                  className={showFilters ? "bg-muted" : ""}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t">
                <RideFilters filters={filters} onFiltersChange={setFilters} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            <Users className="inline h-4 w-4 mr-1" />
            {filteredRoutes.length} rides available
          </p>
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as "list" | "map")}
          >
            <TabsList>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                List
              </TabsTrigger>
              <TabsTrigger value="map" className="flex items-center gap-2">
                <Map className="h-4 w-4" />
                Map
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Results Content */}
        {viewMode === "list" ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRoutes.length > 0 ? (
              filteredRoutes.map((route) => (
                <RideCard
                  key={route.id}
                  route={route}
                  onViewMap={() => handleRouteSelect(route)}
                  waitEndsAt={waitTimers[route.id] ?? null}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">No rides found</p>
                <p className="text-muted-foreground">
                  Try adjusting your search criteria or check back later
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Map */}
            <div className="lg:col-span-2">
              <Card className="overflow-hidden">
                <RideMap
                  routes={filteredRoutes}
                  selectedRoute={selectedRoute}
                  onRouteSelect={setSelectedRoute}
                  height="500px"
                />
              </Card>
            </div>

            {/* Side Panel */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {selectedRoute ? (
                <RideCard route={selectedRoute} variant="detailed" />
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Select a route on the map or from the list below:
                  </p>
                  {filteredRoutes.slice(0, 5).map((route) => (
                    <RideCard
                      key={route.id}
                      route={route}
                      variant="compact"
                      onClick={() => setSelectedRoute(route)}
                      isSelected={selectedRoute?.id === route.id}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
