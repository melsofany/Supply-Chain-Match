import React from "react";
import { useLocation } from "wouter";
import { Bell, Search } from "lucide-react";
import { Sidebar } from "./sidebar";
import { useAuth } from "@/context/auth-context";

const PAGE_TITLES: Record<string, string> = {
  "/":               "لوحة التحكم",
  "/customers":      "العملاء",
  "/suppliers":      "الموردون",
  "/inquiries":      "الاستفسارات",
  "/quotations":     "عروض الأسعار",
  "/customer-pos":   "أوامر شراء العملاء",
  "/supplier-pos":   "أوامر شراء الموردين",
  "/delivery-notes": "أذون التسليم",
  "/invoices":       "الفواتير",
  "/reports":        "التقارير",
  "/accounting":     "المحاسبة",
  "/users":          "المستخدمون",
};

function getTitle(loc: string) {
  if (PAGE_TITLES[loc]) return PAGE_TITLES[loc];
  const base = "/" + loc.split("/")[1];
  return PAGE_TITLES[base] ?? "لوحة التحكم";
}

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useAuth();
  const title = getTitle(location);

  return (
    <div className="flex min-h-screen w-full bg-background flex-col md:flex-row">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Gradient topbar — desktop only */}
        <header
          className="hidden md:flex items-center justify-between px-6 h-14 shrink-0 shadow-md print:hidden"
          style={{
            background: "linear-gradient(to left, #154d75, #1e6fa8)",
            direction: "rtl",
          }}
        >
          <h1 className="text-base font-bold text-white tracking-tight">{title}</h1>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 pointer-events-none" />
              <input
                type="text"
                placeholder="بحث في النظام..."
                className="bg-white/10 border border-white/20 rounded-full pl-4 pr-9 py-1.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-orange-400 w-56 transition-all"
                style={{ direction: "rtl" }}
              />
            </div>

            {/* Bell */}
            <button className="relative p-2 rounded-full hover:bg-white/10 text-white transition-colors">
              <Bell className="h-4 w-4" />
              <span
                className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full border border-white"
                style={{ background: "#f97316" }}
              />
            </button>

            {/* Avatar */}
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
              style={{ background: "rgba(255,255,255,0.2)" }}
              title={user?.name}
            >
              {user?.name?.charAt(0) ?? "?"}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto max-w-6xl w-full" dir="rtl">
            {children}
          </div>
        </div>

        {/* Footer */}
        <footer
          className="hidden md:flex items-center justify-center h-9 border-t bg-white shrink-0 print:hidden"
          style={{ borderColor: "#e2e8f0" }}
        >
          <p className="text-xs text-slate-400" dir="rtl">
            © {new Date().getFullYear()} الخديوي للتوريدات العامة والمقاولات. جميع الحقوق محفوظة.
          </p>
        </footer>
      </main>
    </div>
  );
}
