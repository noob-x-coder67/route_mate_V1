import RideDetail from "./pages/RideDetail";
import { RatingModal } from "@/components/rides/RatingModal";
import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
// Removed roleService dependency for basic route guards
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import FindCarpool from "./pages/FindCarpool";
import OfferRide from "./pages/OfferRide";
import Messages from "./pages/Messages";
import History from "./pages/History";
import About from "./pages/About";
import Help from "./pages/Help";
import Safety from "./pages/Safety";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import UpcomingRides from "./pages/UpcomingRides";
import NotFound from "./pages/NotFound";
import SuperAdminDashboard from "./pages/admin/SuperAdminDashboard";
import UniversityAdminDashboard from "./pages/admin/UniversityAdminDashboard";
import ManageUniversities from "./pages/admin/ManageUniversities";
import ManageAdmins from "./pages/admin/ManageAdmins";

const queryClient = new QueryClient();

// 1. Basic Protected Route for any logged-in user
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// 2. Super Admin Route - Uses the role from the Database
function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, isSuperAdmin } = useAuth();

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  if (!isAuthenticated) return <Navigate to="/" replace />;

  // Logic: Check the computed flag from AuthContext
  if (!isSuperAdmin) {
    return <Navigate to="/home" replace />;
  }
  return <>{children}</>;
}

// 3. University Admin Route - University-level admin access
function UniversityAdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, isUniversityAdmin, isSuperAdmin } =
    useAuth();

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  if (!isAuthenticated) return <Navigate to="/" replace />;

  // Logic: Allow if user is either a Uni Admin or a Super Admin
  if (!isUniversityAdmin && !isSuperAdmin) {
    return <Navigate to="/home" replace />;
  }
  return <>{children}</>;
}

// Global Rating Modal - lives outside routes so it works on ANY page
function GlobalRatingModal() {
  const [modal, setModal] = useState<{
    open: boolean;
    driverName: string;
    rideId: string;
  }>({
    open: false,
    driverName: "",
    rideId: "",
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const { rideId, driverName } = (e as CustomEvent).detail;
      if (rideId && driverName) {
        setModal({ open: true, driverName, rideId });
      }
    };
    window.addEventListener("rideCompleted", handler);
    return () => window.removeEventListener("rideCompleted", handler);
  }, []);

  return (
    <RatingModal
      open={modal.open}
      onClose={() => setModal((prev) => ({ ...prev, open: false }))}
      driverName={modal.driverName}
      rideId={modal.rideId}
    />
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route path="/dashboard" element={<Navigate to="/home" replace />} />
      <Route path="/ride-detail/:id" element={<RideDetail />} />
      <Route path="/find-carpool" element={<FindCarpool />} />
      <Route
        path="/offer-ride"
        element={
          <ProtectedRoute>
            <OfferRide />
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <Messages />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <History />
          </ProtectedRoute>
        }
      />
      <Route
        path="/upcoming-rides"
        element={
          <ProtectedRoute>
            <UpcomingRides />
          </ProtectedRoute>
        }
      />

      {/* University Admin Routes */}
      <Route
        path="/admin"
        element={
          <UniversityAdminRoute>
            <UniversityAdminDashboard />
          </UniversityAdminRoute>
        }
      />

      {/* Super Admin Routes */}
      <Route
        path="/super-admin"
        element={
          <SuperAdminRoute>
            <SuperAdminDashboard />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/super-admin/universities"
        element={
          <SuperAdminRoute>
            <ManageUniversities />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/super-admin/admins"
        element={
          <SuperAdminRoute>
            <ManageAdmins />
          </SuperAdminRoute>
        }
      />

      {/* Public Routes */}
      <Route path="/about" element={<About />} />
      <Route path="/help" element={<Help />} />
      <Route path="/safety" element={<Safety />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route
        path="/ride/:id"
        element={
          <ProtectedRoute>
            <RideDetail />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <NotificationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <GlobalRatingModal />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </NotificationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
