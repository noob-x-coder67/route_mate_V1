import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Users,
  Car,
  Leaf,
  TrendingUp,
  Plus,
  Settings,
  Shield,
  BarChart3,
  Globe,
  Loader2,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { adminService } from "@/services/admin.api";
import { useToast } from "@/components/ui/use-toast";

export default function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Real stats state
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalUniversities: 0,
    totalRides: 0,
    totalCo2Saved: 0,
    growthData: [],
    universityPerformance: [],
    universities: [] as any[], // ← add this
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        const data = await adminService.getGlobalStats();
        // Assuming your backend returns { totalUsers, totalUniversities, totalRides, totalCo2Saved, growthData, universityPerformance }
        setStats(data);
      } catch (error) {
        toast({
          title: "Fetch Error",
          description: "Could not sync dashboard with live database.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [toast]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-[70vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-lg font-medium">
            Loading Platform Metrics...
          </span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-6 w-6 text-primary" />
              <Badge
                variant="secondary"
                className="text-xs font-bold uppercase tracking-wider"
              >
                Super Admin
              </Badge>
            </div>
            <h1 className="text-3xl font-bold">Platform Dashboard</h1>
            <p className="text-muted-foreground">
              Live system monitoring and global platform management
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/super-admin/universities">
              <Button variant="outline">
                <Building2 className="mr-2 h-4 w-4" />
                Manage Universities
              </Button>
            </Link>
            <Link to="/super-admin/admins">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Admin
              </Button>
            </Link>
          </div>
        </div>

        {/* Global Key Performance Indicators (KPIs) */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Universities
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalUniversities}
              </div>
              <p className="text-xs text-muted-foreground">
                Registered on RouteMate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Platform Users
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats.totalUsers || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Verified academic accounts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Successful Rides
              </CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats.totalUsers || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Completed carpools
              </p>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Impact (CO₂ Saved)
              </CardTitle>
              <Leaf className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {(stats.totalCo2Saved || 0).toFixed(1)} kg
              </div>
              <p className="text-xs text-muted-foreground">
                Environmental footprint reduced
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList>
            <TabsTrigger value="overview">
              <BarChart3 className="mr-2 h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="universities">
              <Building2 className="mr-2 h-4 w-4" />
              Universities
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <TrendingUp className="mr-2 h-4 w-4" />
              Sustainability
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Line Chart for Growth */}
              <Card>
                <CardHeader>
                  <CardTitle>Platform Growth</CardTitle>
                  <CardDescription>
                    User registration trends (Last 6 Months)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats.growthData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-muted"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="month"
                          className="text-xs"
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          className="text-xs"
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="users"
                          stroke="hsl(var(--primary))"
                          strokeWidth={3}
                          dot={{ r: 4, fill: "hsl(var(--primary))" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Bar Chart for University Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>User Distribution</CardTitle>
                  <CardDescription>
                    Top universities by active student count
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.universityPerformance}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-muted"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          className="text-xs"
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          className="text-xs"
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar
                          dataKey="users"
                          fill="hsl(var(--primary))"
                          radius={[4, 4, 0, 0]}
                          barSize={40}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="universities">
            <Card>
              <CardHeader>
                <CardTitle>Active Partners</CardTitle>
                <CardDescription>
                  Detailed list of universities integrated with RouteMate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Institution</TableHead>
                        <TableHead>Domain</TableHead>
                        <TableHead>Role Config</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(stats.universityPerformance || []).map((uni: any) => (
                        <TableRow key={uni.name}>
                          <TableCell className="font-medium">
                            {uni.name}
                          </TableCell>
                          <TableCell>{uni.users} users</TableCell>
                          <TableCell>
                            <Badge variant="outline">Active</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                (window.location.href =
                                  "/super-admin/universities")
                              }
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-primary">
                    Total CO₂ Saved
                  </CardTitle>
                  <CardDescription>Across all universities</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-primary">
                    {stats.totalCo2Saved?.toFixed(1) || "0.0"} kg
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Every completed ride reduces emissions
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Completed Rides</CardTitle>
                  <CardDescription>Total successful carpools</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{stats.totalRides}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Rides that reduced solo car trips
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Active Users</CardTitle>
                  <CardDescription>Students using RouteMate</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{stats.totalUsers}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Verified university accounts
                  </p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Platform Growth</CardTitle>
                <CardDescription>Monthly user registrations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.growthData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-muted"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="month"
                        className="text-xs"
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        className="text-xs"
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="users"
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "hsl(var(--primary))" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
