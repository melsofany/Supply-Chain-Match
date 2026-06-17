import React from "react";
import {
  Bell,
  LayoutDashboard,
  Users,
  Truck,
  FileText,
  FileSignature,
  Receipt,
  BarChart3,
  Search,
  ChevronDown,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function NavyCorporate() {
  const navItems = [
    { icon: LayoutDashboard, label: "لوحة التحكم", active: true },
    { icon: Users, label: "العملاء", active: false },
    { icon: Truck, label: "الموردون", active: false },
    { icon: FileText, label: "الاستفسارات", active: false },
    { icon: FileSignature, label: "عروض الأسعار", active: false },
    { icon: Receipt, label: "الفواتير", active: false },
    { icon: BarChart3, label: "التقارير", active: false },
  ];

  const kpis = [
    {
      title: "الاستفسارات المفتوحة",
      value: "١٤",
      change: "+٢ من الأسبوع الماضي",
      trend: "up",
      color: "border-l-blue-500",
    },
    {
      title: "عروض الأسعار المعلقة",
      value: "٨",
      change: "-١ من الأسبوع الماضي",
      trend: "down",
      color: "border-l-amber-500",
    },
    {
      title: "أوامر الشراء النشطة",
      value: "٣٢",
      change: "+٥ من الأسبوع الماضي",
      trend: "up",
      color: "border-l-emerald-500",
    },
    {
      title: "الإيرادات",
      value: "٢,٤٥٠,٠٠٠ ج.م",
      change: "+١٢٪ من الشهر الماضي",
      trend: "up",
      color: "border-l-indigo-500",
    },
  ];

  const recentActivity = [
    {
      id: "PO-2023-089",
      title: "أمر شراء جديد من شركة المقاولون العرب",
      time: "منذ ساعتين",
      status: "pending",
      icon: Clock,
      statusColor: "text-amber-500",
      statusBg: "bg-amber-50",
    },
    {
      id: "INV-2023-142",
      title: "تم سداد فاتورة توريد حديد تسليح - أوراسكوم",
      time: "منذ ٤ ساعات",
      status: "completed",
      icon: CheckCircle2,
      statusColor: "text-emerald-500",
      statusBg: "bg-emerald-50",
    },
    {
      id: "RFQ-2023-055",
      title: "تأخير في رد المورد على عرض أسعار الأسمنت",
      time: "منذ ٥ ساعات",
      status: "alert",
      icon: AlertCircle,
      statusColor: "text-rose-500",
      statusBg: "bg-rose-50",
    },
    {
      id: "QUO-2023-112",
      title: "تم إرسال عرض أسعار لتوريد كابلات كهربائية",
      time: "منذ يوم واحد",
      status: "completed",
      icon: CheckCircle2,
      statusColor: "text-emerald-500",
      statusBg: "bg-emerald-50",
    },
  ];

  return (
    <div dir="rtl" className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0f1f3d] text-slate-300 flex flex-col flex-shrink-0 z-20">
        <div className="h-16 flex items-center px-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded flex items-center justify-center overflow-hidden">
              <img src="/__mockup/images/logo.jpeg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-white font-bold tracking-wide text-lg truncate">AL-KHEDIVI</span>
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item, index) => (
            <button
              key={index}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                item.active
                  ? "bg-[#1a2f55] text-white"
                  : "hover:bg-[#1a2f55]/50 hover:text-white"
              }`}
            >
              <item.icon
                className={`w-5 h-5 ${item.active ? "text-amber-500" : "text-slate-400"}`}
              />
              <span className="font-medium text-sm">{item.label}</span>
              {item.active && (
                <div className="mr-auto w-1.5 h-1.5 rounded-full bg-amber-500" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <div className="bg-[#1a2f55] rounded-lg p-3 text-xs">
            <p className="text-slate-400 mb-1">دعم النظام</p>
            <p className="text-white font-medium">support@alkhedivi.com</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900">لوحة التحكم</h1>
            <div className="h-5 w-px bg-gray-300"></div>
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <span>الرئيسية</span>
              <ChevronDown className="w-3 h-3 rotate-90" />
              <span className="text-gray-900 font-medium">لوحة التحكم</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="بحث عن أمر شراء، عميل..."
                className="pl-3 pr-9 h-9 bg-gray-50 border-gray-200 text-sm focus-visible:ring-amber-500"
              />
            </div>
            
            <Button variant="ghost" size="icon" className="relative text-gray-500 hover:text-gray-900">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </Button>

            <div className="h-8 w-px bg-gray-200"></div>

            <div className="flex items-center gap-3 cursor-pointer">
              <div className="text-left hidden md:block">
                <p className="text-sm font-medium text-gray-900 leading-none">أحمد محمود</p>
                <p className="text-xs text-gray-500 mt-1">مدير المشتريات</p>
              </div>
              <Avatar className="h-8 w-8 border border-gray-200">
                <AvatarImage src="https://i.pravatar.cc/150?u=ahmed" />
                <AvatarFallback className="bg-amber-100 text-amber-700 text-xs font-bold">أ.م</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {kpis.map((kpi, index) => (
                <div
                  key={index}
                  className={`bg-white rounded-lg shadow-sm border border-gray-100 p-5 border-l-4 ${kpi.color} flex flex-col justify-between hover:shadow-md transition-shadow`}
                >
                  <p className="text-sm font-medium text-gray-500 mb-2">{kpi.title}</p>
                  <div className="flex items-baseline gap-2 mb-2">
                    <h3 className="text-2xl font-bold text-gray-900">{kpi.value}</h3>
                  </div>
                  <div className="flex items-center gap-1.5 mt-auto">
                    {kpi.trend === "up" ? (
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                    )}
                    <span
                      className={`text-xs font-medium ${
                        kpi.trend === "up" ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {kpi.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Main Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Recent Activity */}
              <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <h2 className="text-base font-bold text-[#0f1f3d]">أحدث النشاطات</h2>
                  <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 h-8 text-xs font-medium">
                    عرض الكل
                  </Button>
                </div>
                <div className="p-0 flex-1">
                  <div className="divide-y divide-gray-100">
                    {recentActivity.map((activity, index) => (
                      <div key={index} className="p-4 hover:bg-gray-50 transition-colors flex items-start gap-4">
                        <div className={`mt-0.5 p-2 rounded-full ${activity.statusBg} flex-shrink-0`}>
                          <activity.icon className={`w-4 h-4 ${activity.statusColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {activity.title}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {activity.id}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {activity.time}
                            </span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-900 h-8 w-8 flex-shrink-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Actions & Stats */}
              <div className="space-y-6 flex flex-col">
                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 bg-[#0f1f3d]">
                    <h2 className="text-base font-bold text-white">إجراءات سريعة</h2>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-3">
                    <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-2 border-dashed border-gray-300 hover:border-amber-500 hover:text-amber-600 hover:bg-amber-50">
                      <FileText className="w-5 h-5" />
                      <span className="text-xs">استفسار جديد</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-2 border-dashed border-gray-300 hover:border-amber-500 hover:text-amber-600 hover:bg-amber-50">
                      <FileSignature className="w-5 h-5" />
                      <span className="text-xs">عرض سعر جديد</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-2 border-dashed border-gray-300 hover:border-amber-500 hover:text-amber-600 hover:bg-amber-50">
                      <Users className="w-5 h-5" />
                      <span className="text-xs">إضافة عميل</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-2 border-dashed border-gray-300 hover:border-amber-500 hover:text-amber-600 hover:bg-amber-50">
                      <Truck className="w-5 h-5" />
                      <span className="text-xs">إضافة مورد</span>
                    </Button>
                  </div>
                </div>

                {/* Approvals */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 flex-1 flex flex-col overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                    <h2 className="text-base font-bold text-[#0f1f3d]">بانتظار الاعتماد</h2>
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                      ٣ طلبات
                    </Badge>
                  </div>
                  <div className="p-0 flex-1 divide-y divide-gray-100">
                    <div className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">PO-2023-088</p>
                        <p className="text-xs text-gray-500 mt-0.5">١٤٥,٠٠٠ ج.م - حديد عز</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 px-3 text-xs bg-[#0f1f3d] hover:bg-[#1a2f55]">اعتماد</Button>
                      </div>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">PO-2023-087</p>
                        <p className="text-xs text-gray-500 mt-0.5">٣٢,٥٠٠ ج.م - السويدي للكابلات</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 px-3 text-xs bg-[#0f1f3d] hover:bg-[#1a2f55]">اعتماد</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
