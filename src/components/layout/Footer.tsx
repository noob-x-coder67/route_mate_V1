import { Link } from "react-router-dom";
import { Leaf } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const platformLinks = [
    { label: "Home", href: "/home" },
    { label: "Find Carpool", href: "/find-carpool" },
    { label: "Offer Ride", href: "/offer-ride" },
    { label: "Upcoming Rides", href: "/upcoming-rides" },
    { label: "Messages", href: "/messages" },
    { label: "Ride History", href: "/history" },
  ];

  const resourceLinks = [
    { label: "Help Center", href: "/help" },
    { label: "Safety Tips", href: "/safety" },
    { label: "FAQ", href: "/help#faq" },
  ];

  const legalLinks = [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ];

  return (
    <footer className="border-t bg-card">
      <div className="container py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Leaf className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">RouteMate</span>
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              Verified student carpooling for sustainable campus mobility.
              Connect with fellow NUTECH students and share your commute.
            </p>
            <div className="flex gap-2">
              <div className="px-2 py-1 bg-accent rounded text-xs font-medium text-accent-foreground">
                SDG 11
              </div>
              <div className="px-2 py-1 bg-accent rounded text-xs font-medium text-accent-foreground">
                SDG 12
              </div>
              <div className="px-2 py-1 bg-accent rounded text-xs font-medium text-accent-foreground">
                SDG 13
              </div>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="font-semibold mb-4">Platform</h3>
            <ul className="space-y-2">
              {platformLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              {resourceLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} RouteMate. An ICAT Project for NUTECH.
          </p>
          <p className="text-sm text-muted-foreground">
            🌱 Building sustainable campus mobility in Pakistan
          </p>
        </div>
      </div>
    </footer>
  );
}
