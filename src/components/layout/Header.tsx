import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { roleService } from "@/services/roleService";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Leaf,
  Menu,
  X,
  MessageSquare,
  User,
  LogOut,
  Settings,
  Shield,
  Building2,
  Crown,
} from "lucide-react";
import { AuthModal } from "@/components/auth/AuthModal";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

export function Header() {
  const { user, isAuthenticated, logout, isSuperAdmin, isUniversityAdmin } =
    useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"signin" | "signup">(
    "signin",
  );

  const [messageUnreadCount, setMessageUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchUnreadCount = async () => {
      try {
        const token = localStorage.getItem("token");
        const API_URL =
          import.meta.env.VITE_API_URL || "http://localhost:5001/api";
        const res = await fetch(`${API_URL}/messages/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const total = (data.data.conversations || []).reduce(
          (sum: number, c: any) => sum + (c.unreadCount || 0),
          0,
        );
        setMessageUnreadCount(total);
      } catch (err) {}
    };

    // Listen for count updates from Messages page
    const handleCountUpdate = (e: Event) => {
      setMessageUnreadCount((e as CustomEvent).detail);
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    window.addEventListener("unreadCountUpdate", handleCountUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("unreadCountUpdate", handleCountUpdate);
    };
  }, [isAuthenticated]);

  // Check if user has any admin access
  const hasAdminAccess = isSuperAdmin || isUniversityAdmin;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSignIn = () => {
    setAuthModalTab("signin");
    setAuthModalOpen(true);
  };

  const handleSignUp = () => {
    setAuthModalTab("signup");
    setAuthModalOpen(true);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const navLinks = isAuthenticated
    ? [
        { label: "Home", href: "/home" },
        { label: "Find Carpool", href: "/find-carpool" },
        { label: "Offer Ride", href: "/offer-ride" },
        { label: "Messages", href: "/messages" },
      ]
    : [
        { label: "Features", href: "/#features" },
        { label: "How It Works", href: "/#how-it-works" },
        { label: "Sustainability", href: "/#sustainability" },
        { label: "About", href: "/about" },
      ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
          {/* Brand name + slogan – stacked vertically */}
          <div className="flex flex-col items-start leading-tight">
            <span className="text-xl font-bold text-foreground">RouteMate</span>
            <span className="text-xs italic font-medium text-muted-foreground">
              Rides You Can Rely On
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Auth/User Section */}
        <div className="hidden md:flex items-center gap-4">
          {isAuthenticated && user ? (
            <>
              {/* Notifications */}
              <NotificationCenter />

              {/* Messages */}
              <Link to="/messages">
                <Button variant="ghost" size="icon" className="relative">
                  <MessageSquare className="h-5 w-5" />
                  {messageUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                      {messageUnreadCount}
                    </span>
                  )}
                </Button>
              </Link>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 pl-2"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {user.name.split(" ")[0]}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover">
                  <div className="px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{user.name}</p>
                      {isSuperAdmin && (
                        <Badge
                          variant="default"
                          className="text-[10px] px-1 py-0"
                        >
                          <Crown className="h-2.5 w-2.5 mr-0.5" />
                          Super
                        </Badge>
                      )}
                      {isUniversityAdmin && !isSuperAdmin && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1 py-0"
                        >
                          <Building2 className="h-2.5 w-2.5 mr-0.5" />
                          Admin
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/home" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Home
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/history" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Ride History
                    </Link>
                  </DropdownMenuItem>
                  {/* Show admin links based on role */}
                  {hasAdminAccess && (
                    <>
                      <DropdownMenuSeparator />
                      {isSuperAdmin && (
                        <DropdownMenuItem asChild>
                          <Link to="/super-admin" className="cursor-pointer">
                            <Crown className="mr-2 h-4 w-4 text-primary" />
                            Platform Dashboard
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="cursor-pointer">
                          <Shield className="mr-2 h-4 w-4" />
                          {isSuperAdmin
                            ? "University Admin View"
                            : "Admin Panel"}
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={handleSignIn}>
                Sign In
              </Button>
              <Button onClick={handleSignUp}>Get Started</Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-card">
          <nav className="container py-4 flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {!isAuthenticated && (
              <div className="flex flex-col gap-2 mt-4 pt-4 border-t">
                <Button variant="outline" onClick={handleSignIn}>
                  Sign In
                </Button>
                <Button onClick={handleSignUp}>Get Started</Button>
              </div>
            )}
            {isAuthenticated && (
              <Button
                variant="ghost"
                className="justify-start text-destructive mt-4"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            )}
          </nav>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        defaultTab={authModalTab}
      />
    </header>
  );
}
