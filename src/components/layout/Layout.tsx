import { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

interface LayoutProps {
  children: ReactNode;
  showFooter?: boolean;
}

export function Layout({ children, showFooter = true }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden w-full">
      <Header />
      <main className="flex-1 w-full overflow-x-hidden">{children}</main>
      {showFooter && <Footer />}
    </div>
  );
}
