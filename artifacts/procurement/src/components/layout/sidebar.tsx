import React from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, Building2, FileQuestion, FileText,
  ShoppingCart, Truck, Menu, Calculator, FileCheck, ReceiptText,
  BarChart3, ShieldCheck, LogOut, ChevronDown, Bell, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/auth-context";

interface NavItem { href: string; label: string; icon: React.ComponentType<any>; adminOnly?: boolean; }

const NAV_ITEMS: NavItem[] = [
  { href: "/",               label: "لوحة التحكم",          icon: LayoutDashboard },
  { href: "/customers",      label: "العملاء",               icon: Users },
  { href: "/suppliers",      label: "الموردون",               icon: Building2 },
  { href: "/inquiries",      label: "الاستفسارات",           icon: FileQuestion },
  { href: "/quotations",     label: "عروض الأسعار",          icon: FileText },
  { href: "/customer-pos",   label: "أوامر شراء العملاء",   icon: ShoppingCart },
  { href: "/supplier-pos",   label: "أوامر شراء الموردين",  icon: Truck },
  { href: "/delivery-notes", label: "أذون التسليم",          icon: FileCheck },
  { href: "/invoices",       label: "الفواتير",              icon: ReceiptText },
  { href: "/reports",        label: "التقارير",              icon: BarChart3 },
  { href: "/accounting",     label: "المحاسبة",              icon: Calculator },
  { href: "/users",          label: "المستخدمون",            icon: ShieldCheck, adminOnly: true },
];

const SIDEBAR_BG   = "#1a2a3a";
const SIDEBAR_TOP  = "#152230";
const BRAND_BLUE   = "#1e6fa8";
const BRAND_ORANGE = "#f97316";

function SidebarContent() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && user?.roleName !== "admin") return false;
    return true;
  });

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: SIDEBAR_BG, direction: "rtl" }}
    >
      {/* Logo */}
      <div
        className="flex items-center px-4 py-3 shrink-0 border-b"
        style={{ background: SIDEBAR_TOP, borderColor: "rgba(255,255,255,0.07)" }}
      >
        <img src="/logo.jpeg" alt="AL-KHEDIVI" className="h-11 w-auto object-contain" />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visibleItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <div
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm font-medium select-none"
                style={
                  isActive
                    ? {
                        background: `${BRAND_BLUE}22`,
                        color: "#ffffff",
                        borderRight: `3px solid ${BRAND_ORANGE}`,
                        paddingRight: "calc(0.75rem - 3px)",
                      }
                    : { color: "#94a3b8" }
                }
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.06)";
                    (e.currentTarget as HTMLDivElement).style.color = "#ffffff";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLDivElement).style.background = "";
                    (e.currentTarget as HTMLDivElement).style.color = "#94a3b8";
                  }
                }}
              >
                <item.icon
                  className="h-4 w-4 shrink-0"
                  style={{ color: isActive ? BRAND_ORANGE : undefined }}
                />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div
        className="shrink-0 p-3 border-t"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors"
              style={{ color: "#94a3b8" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
                (e.currentTarget as HTMLButtonElement).style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "";
                (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8";
              }}
            >
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white"
                style={{ background: BRAND_BLUE }}
              >
                {user?.name?.charAt(0) ?? "?"}
              </div>
              <div className="flex-1 text-right min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                <p className="text-[10px] truncate" style={{ color: "#64748b" }}>{user?.roleLabel}</p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-48">
            <div className="px-2 py-1.5 text-xs text-muted-foreground">{user?.email}</div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer">
              <LogOut className="h-3.5 w-3.5 mr-2" />
              تسجيل الخروج
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { logout } = useAuth();

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col w-64 min-h-screen" style={{ background: SIDEBAR_BG }}>
        <SidebarContent />
      </div>

      {/* Mobile header + drawer */}
      <div
        className="md:hidden flex items-center px-4 py-2 justify-between border-b"
        style={{ background: SIDEBAR_BG, borderColor: "rgba(255,255,255,0.07)" }}
        dir="rtl"
      >
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-white/10">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64 p-0 border-0" style={{ background: SIDEBAR_BG }}>
            <SidebarContent />
          </SheetContent>
        </Sheet>

        <img src="/logo.jpeg" alt="AL-KHEDIVI" className="h-9 w-auto object-contain" />

        <Button
          variant="ghost"
          size="icon"
          className="text-slate-300 hover:text-white hover:bg-white/10"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
}
