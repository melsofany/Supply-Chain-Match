import React from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Building2,
  FileQuestion,
  FileText,
  ShoppingCart,
  Truck,
  Menu,
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/suppliers", label: "Suppliers", icon: Building2 },
  { href: "/inquiries", label: "Inquiries", icon: FileQuestion },
  { href: "/quotations", label: "Quotations", icon: FileText },
  { href: "/customer-pos", label: "Customer POs", icon: ShoppingCart },
  { href: "/supplier-pos", label: "Supplier POs", icon: Truck },
  { href: "/accounting", label: "Accounting", icon: Calculator },
];

export function Sidebar() {
  const [location] = useLocation();

  const NavLinks = () => (
    <div className="flex flex-col gap-1 w-full">
      {NAV_ITEMS.map((item) => {
        const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
        return (
          <Link key={item.href} href={item.href}>
            <div
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer text-sm font-medium ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </div>
          </Link>
        );
      })}
    </div>
  );

  return (
    <>
      <div className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border min-h-screen p-4">
        <div className="flex items-center gap-2 px-2 mb-8 mt-2">
          <div className="h-8 w-8 rounded bg-accent text-accent-foreground flex items-center justify-center font-bold text-lg">
            TR
          </div>
          <span className="font-bold text-lg text-sidebar-foreground tracking-tight">TradeCore</span>
        </div>
        <NavLinks />
      </div>

      <div className="md:hidden flex items-center p-4 border-b bg-sidebar text-sidebar-foreground">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 bg-sidebar border-sidebar-border p-4 text-sidebar-foreground">
            <div className="flex items-center gap-2 px-2 mb-8 mt-2">
              <div className="h-8 w-8 rounded bg-accent text-accent-foreground flex items-center justify-center font-bold text-lg">
                TR
              </div>
              <span className="font-bold text-lg text-sidebar-foreground tracking-tight">TradeCore</span>
            </div>
            <NavLinks />
          </SheetContent>
        </Sheet>
        <span className="ml-4 font-bold text-lg tracking-tight">TradeCore</span>
      </div>
    </>
  );
}
