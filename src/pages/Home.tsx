import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileModal } from "@/components/profile/ProfileModal";
import { SustainabilityWidget } from "@/components/dashboard/SustainabilityWidget";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Car,
  Users,
  Star,
  MapPin,
  Plus,
  Search,
  Clock,
  ArrowRight,
  CalendarDays,
  Settings,
  Leaf,
  TrendingUp,
} from "lucide-react";

import { format } from "date-fns";

export default function Home() {
  const { user, refreshUser } = useAuth();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [upcomingRides, setUpcomingRides] = useState<any[]>([]);

  // Always fetch fresh stats from DB on mount
  useEffect(() => {
    refreshUser();
  }, []);

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
        }));
        setUpcomingRides(mapped.slice(0, 3));
      } catch (err) {
        console.error("Failed to fetch rides:", err);
      }
    };
    fetchRides();
  }, []);

  if (!user) return null;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const stats = [
    {
      label: "Rides Offered",
      value: user.ridesOffered,
      icon: Car,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Rides Taken",
      value: user.ridesTaken,
      icon: Users,
      color: "text-accent-foreground",
      bgColor: "bg-accent",
    },
    {
      label: "Rating",
      value: user.rating > 0 ? user.rating.toFixed(1) : "N/A",
      icon: Star,
      color: "text-primary",
      bgColor: "bg-primary/10",
      suffix: user.rating > 0 ? `(${user.totalRatings})` : "",
    },
  ];

  return (
    <Layout>
      <div className="container py-4 md:py-8">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-0.5">
              Welcome back, {user.name.split(" ")[0]}! 👋
            </h1>
            <p className="text-sm text-muted-foreground">
              Here's what's happening with your carpools today.
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/find-carpool">
              <Button variant="outline" size="sm">
                <Search className="mr-2 h-4 w-4" />
                Find Carpool
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

        <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left Column - Profile & Stats */}
          <div className="space-y-6">
            {/* Profile Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-20 w-20 mb-4">
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-semibold">{user.name}</h2>
                  <p className="text-sm text-muted-foreground mb-2">
                    {user.email}
                  </p>
                  <div className="flex gap-2 mb-4">
                    <Badge variant="secondary">{user.department}</Badge>
                    <Badge variant="outline" className="capitalize">
                      {user.gender}
                    </Badge>
                  </div>
                  {user.rating > 0 && (
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-4 w-4 fill-primary text-primary" />
                      <span className="font-medium">
                        {user.rating.toFixed(1)}
                      </span>
                      <span className="text-muted-foreground">
                        ({user.totalRatings} reviews)
                      </span>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-4"
                    onClick={() => setProfileModalOpen(true)}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3">
              {stats.map((stat, i) => (
                <Card key={i}>
                  <CardContent className="pt-4 pb-4 px-3 text-center">
                    <div
                      className={`h-10 w-10 rounded-lg ${stat.bgColor} ${stat.color} flex items-center justify-center mx-auto mb-2`}
                    >
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">
                      {stat.label}
                    </p>
                    {stat.suffix && (
                      <p className="text-xs text-muted-foreground">
                        {stat.suffix}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Sustainability Widget */}
            <SustainabilityWidget
              co2Saved={user.co2Saved}
              fuelSaved={user.fuelSaved}
              totalRides={user.ridesOffered + user.ridesTaken}
            />
          </div>

          {/* Right Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Link to="/find-carpool">
                <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Search className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Find a Carpool</h3>
                        <p className="text-sm text-muted-foreground">
                          Search for rides matching your route and schedule
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link to="/offer-ride">
                <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
                        <Plus className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Offer a Ride</h3>
                        <p className="text-sm text-muted-foreground">
                          Share your commute and help others get to campus
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* Upcoming Rides */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarDays className="h-5 w-5" />
                      Upcoming Rides
                    </CardTitle>
                    <CardDescription>
                      Your scheduled carpools for the next few days
                    </CardDescription>
                  </div>
                  <Link to="/upcoming-rides">
                    <Button variant="ghost" size="sm">
                      View All
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {upcomingRides.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingRides.map((route) => (
                      <div
                        key={route.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors overflow-hidden"
                      >
                        <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          {route.vehicle === "CAR" ? (
                            <Car className="h-6 w-6" />
                          ) : (
                            <TrendingUp className="h-6 w-6" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm font-medium truncate">
                              {route.pickup.address.split(",")[0]} →{" "}
                              {route.dropoff.address.split(",")[0]}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(
                                new Date(route.datetime),
                                "EEE, MMM d",
                              )}{" "}
                              at {format(new Date(route.datetime), "h:mm a")}
                            </span>
                            <span>{route.availableSeats} seats left</span>
                          </div>
                        </div>
                        <Badge
                          variant={route.womenOnly ? "secondary" : "outline"}
                          className="flex-shrink-0 text-xs"
                        >
                          {route.womenOnly ? "Women Only" : "Open"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CalendarDays className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground mb-4">
                      No upcoming rides scheduled
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

            {/* Community Impact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Leaf className="h-5 w-5 text-primary" />
                  Community Impact
                </CardTitle>
                <CardDescription>
                  See how NUTECH students are making a difference
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-3xl font-bold text-primary">2.5t</p>
                    <p className="text-sm text-muted-foreground">
                      Total CO₂ Saved
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-3xl font-bold text-primary">850L</p>
                    <p className="text-sm text-muted-foreground">
                      Fuel Conserved
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-3xl font-bold text-primary">500+</p>
                    <p className="text-sm text-muted-foreground">
                      Active Users
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      <ProfileModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
      />
    </Layout>
  );
}
