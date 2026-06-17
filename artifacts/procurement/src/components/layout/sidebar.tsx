import React from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, Building2, FileQuestion, FileText,
  ShoppingCart, Truck, Menu, Calculator, FileCheck, ReceiptText,
  BarChart3, ShieldCheck, LogOut, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/auth-context";

interface NavItem { href: string; label: string; icon: React.ComponentType<any>; adminOnly?: boolean; }

const NAV_ITEMS: NavItem[] = [
  { href: "/",               label: "Dashboard",                icon: LayoutDashboard },
  { href: "/customers",      label: "العملاء",                  icon: Users },
  { href: "/suppliers",      label: "الموردون",                  icon: Building2 },
  { href: "/inquiries",      label: "الاستفسارات",              icon: FileQuestion },
  { href: "/quotations",     label: "عروض الأسعار",             icon: FileText },
  { href: "/customer-pos",   label: "أوامر شراء العملاء",      icon: ShoppingCart },
  { href: "/supplier-pos",   label: "أوامر شراء الموردين",     icon: Truck },
  { href: "/delivery-notes", label: "أذون التسليم",             icon: FileCheck },
  { href: "/invoices",       label: "الفواتير",                 icon: ReceiptText },
  { href: "/reports",        label: "التقارير",                 icon: BarChart3 },
  { href: "/accounting",     label: "المحاسبة",                 icon: Calculator },
  { href: "/users",          label: "المستخدمون",               icon: ShieldCheck, adminOnly: true },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && user?.roleName !== "admin") return false;
    return true;
  });

  const NavLinks = () => (
    <div className="flex flex-col gap-0.5 w-full">
      {visibleItems.map((item) => {
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
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </div>
          </Link>
        );
      })}
    </div>
  );

  const UserFooter = () => (
    <div className="mt-auto pt-4 border-t border-sidebar-border">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-sidebar-accent/50 transition-colors text-sidebar-foreground">
            <div className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
              {user?.name?.charAt(0) ?? "?"}
            </div>
            <div className="flex-1 text-right min-w-0">
              <p className="text-xs font-semibold truncate">{user?.name}</p>
              <p className="text-[10px] text-sidebar-foreground/50 truncate">{user?.roleLabel}</p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 opacity-60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-48">
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            {user?.email}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer">
            <LogOut className="h-3.5 w-3.5 mr-2" />
            تسجيل الخروج
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <>
      <div className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border min-h-screen p-4">
        <div className="flex items-center gap-2 px-2 mb-6 mt-2">
          <div className="h-8 w-8 rounded bg-accent text-accent-foreground flex items-center justify-center font-bold text-lg">
            TR
          </div>
          <span className="font-bold text-lg text-sidebar-foreground tracking-tight">TradeCore</span>
        </div>
        <NavLinks />
        <UserFooter />
      </div>

      <div className="md:hidden flex items-center p-4 border-b bg-sidebar text-sidebar-foreground justify-between">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 bg-sidebar border-sidebar-border p-4 text-sidebar-foreground flex flex-col">
            <div className="flex items-center gap-2 px-2 mb-6 mt-2">
              <div className="h-8 w-8 rounded bg-accent text-accent-foreground flex items-center justify-center font-bold text-lg">
                TR
              </div>
              <span className="font-bold text-lg text-sidebar-foreground tracking-tight">TradeCore</span>
            </div>
            <NavLinks />
            <UserFooter />
          </SheetContent>
        </Sheet>
        <span className="font-bold text-lg tracking-tight">TradeCore</span>
        <Button variant="ghost" size="icon" className="text-sidebar-foreground" onClick={logout}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
}
