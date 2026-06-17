import React from "react";
import { 
  BarChart3, 
  FileText, 
  Home, 
  Package, 
  Receipt, 
  Users, 
  ShoppingCart, 
  Bell, 
  Search, 
  ChevronDown,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function BrandSteel() {
  const navItems = [
    { icon: Home, label: "لوحة التحكم", active: true },
    { icon: Users, label: "العملاء" },
    { icon: Package, label: "الموردون" },
    { icon: FileText, label: "الاستفسارات" },
    { icon: Receipt, label: "عروض الأسعار" },
    { icon: ShoppingCart, label: "أوامر الشراء" }, // Added based on context
    { icon: BarChart3, label: "التقارير" },
  ];

  const kpis = [
    { title: "الاستفسارات", value: "142", trend: "+12%", color: "blue", icon: FileText },
    { title: "عروض الأسعار", value: "89", trend: "+5%", color: "amber", icon: Receipt },
    { title: "أوامر الشراء", value: "45", trend: "-2%", color: "blue", icon: ShoppingCart },
    { title: "الإيرادات ج.م", value: "2.4M", trend: "+18%", color: "amber", icon: BarChart3 },
  ];

  const recentTransactions = [
    { id: "PO-2023-089", customer: "شركة النيل للإنشاءات", amount: "45,000 ج.م", status: "مكتمل", date: "2023-10-25" },
    { id: "PO-2023-090", customer: "مجموعة الأهرام", amount: "120,500 ج.م", status: "قيد المعالجة", date: "2023-10-26" },
    { id: "QT-2023-145", customer: "الشركة الهندسية الحديثة", amount: "85,000 ج.م", status: "بانتظار الموافقة", date: "2023-10-27" },
    { id: "IN-2023-056", customer: "المقاولون العرب", amount: "-", status: "جديد", date: "2023-10-28" },
  ];

  return (
    <div dir="rtl" className="flex h-screen bg-slate-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1a2a3a] text-slate-300 flex flex-col shrink-0">
        <div className="h-16 flex items-center px-4 border-b border-slate-700/50 bg-[#152230]">
          <img src="/__mockup/images/logo.jpeg" alt="AL-KHEDIVI Logo" className="h-10 w-auto rounded" />
        </div>
        
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {navItems.map((item, index) => (
              <li key={index}>
                <a
                  href="#"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    item.active 
                      ? "bg-[#1e6fa8]/20 text-white border-r-4 border-[#f97316] font-medium" 
                      : "hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <item.icon className={`h-5 w-5 ${item.active ? "text-[#f97316]" : "text-slate-400"}`} />
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-slate-700/50">
          <div className="bg-[#152230] p-3 rounded-lg border border-slate-700 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-[#1e6fa8] flex items-center justify-center text-white font-bold">
              أ
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">أحمد محمود</p>
              <p className="text-xs text-slate-400 truncate">مدير المشتريات</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-gradient-to-r from-[#1e6fa8] to-[#154d75] text-white flex items-center justify-between px-6 shrink-0 shadow-md">
          <h1 className="text-xl font-bold tracking-tight">لوحة التحكم</h1>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
              <input 
                type="text" 
                placeholder="بحث في النظام..." 
                className="bg-white/10 border border-white/20 rounded-full pl-4 pr-10 py-1.5 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-[#f97316] w-64 transition-all"
              />
            </div>
            <button className="relative p-2 rounded-full hover:bg-white/10 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#f97316] border border-[#1e6fa8]"></span>
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {kpis.map((kpi, index) => (
                <Card key={index} className={`border-t-4 shadow-sm ${kpi.color === 'blue' ? 'border-t-[#1e6fa8]' : 'border-t-[#f97316]'}`}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">{kpi.title}</p>
                        <h3 className="text-3xl font-bold text-slate-800">{kpi.value}</h3>
                      </div>
                      <div className={`p-3 rounded-xl ${kpi.color === 'blue' ? 'bg-blue-50 text-[#1e6fa8]' : 'bg-orange-50 text-[#f97316]'}`}>
                        <kpi.icon className="h-6 w-6" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm">
                      <span className={`font-medium flex items-center ${kpi.trend.startsWith('+') ? 'text-emerald-600' : 'text-red-600'}`}>
                        {kpi.trend.startsWith('+') ? <ArrowUpRight className="h-4 w-4 mr-1" /> : null}
                        {kpi.trend}
                      </span>
                      <span className="text-slate-400 mr-2">مقارنة بالشهر السابق</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pipeline Section */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-[#1e6fa8]" />
                  مسار المبيعات الحالي
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 relative">
                  <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-100 -z-10 hidden md:block"></div>
                  
                  {[
                    { label: "استفسارات جديدة", count: 24, color: "bg-slate-200 text-slate-600" },
                    { label: "عروض مرسلة", count: 18, color: "bg-blue-100 text-[#1e6fa8]" },
                    { label: "قيد التفاوض", count: 12, color: "bg-orange-100 text-[#f97316]" },
                    { label: "تمت الموافقة", count: 8, color: "bg-[#1e6fa8] text-white" },
                  ].map((step, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2 bg-white px-4 py-2 w-full md:w-auto">
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg border-4 border-white shadow-md ${step.color}`}>
                        {step.count}
                      </div>
                      <span className="text-sm font-medium text-slate-600 text-center">{step.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Transactions Table */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[#1e6fa8]" />
                  أحدث المعاملات
                </CardTitle>
                <Button variant="outline" size="sm" className="text-[#1e6fa8] border-[#1e6fa8] hover:bg-[#1e6fa8] hover:text-white">
                  عرض الكل
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right">
                    <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-medium">رقم المرجع</th>
                        <th className="px-4 py-3 font-medium">العميل</th>
                        <th className="px-4 py-3 font-medium">المبلغ</th>
                        <th className="px-4 py-3 font-medium">التاريخ</th>
                        <th className="px-4 py-3 font-medium">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTransactions.map((tx, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-[#1e6fa8]">{tx.id}</td>
                          <td className="px-4 py-3 text-slate-700">{tx.customer}</td>
                          <td className="px-4 py-3 font-medium text-slate-700">{tx.amount}</td>
                          <td className="px-4 py-3 text-slate-500">{tx.date}</td>
                          <td className="px-4 py-3">
                            <Badge 
                              variant="outline" 
                              className={`
                                ${tx.status === 'مكتمل' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                                ${tx.status === 'قيد المعالجة' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                                ${tx.status === 'بانتظار الموافقة' ? 'bg-orange-50 text-orange-700 border-orange-200' : ''}
                                ${tx.status === 'جديد' ? 'bg-slate-100 text-slate-700 border-slate-200' : ''}
                              `}
                            >
                              {tx.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

          </div>
        </main>
        
        {/* Footer */}
        <footer className="h-10 bg-white border-t border-slate-200 flex items-center justify-center px-6 shrink-0">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} الخديوي للتوريدات العامة والمقاولات. جميع الحقوق محفوظة.
          </p>
        </footer>
      </div>
    </div>
  );
}
