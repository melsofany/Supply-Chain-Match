import React from "react";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings, 
  Search, 
  Bell, 
  ArrowUpRight, 
  ArrowDownRight, 
  MoreHorizontal, 
  Package, 
  ShoppingCart, 
  Truck,
  Building2,
  ChevronLeft
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const metrics = [
  { label: "إجمالي المبيعات", value: "EGP 2.4M", trend: "+12.5%", positive: true },
  { label: "أوامر الشراء النشطة", value: "45", trend: "+4.1%", positive: true },
  { label: "عروض الأسعار المعلقة", value: "12", trend: "-2.3%", positive: false },
  { label: "العملاء الجدد", value: "8", trend: "+14.0%", positive: true },
];

const recentActivity = [
  { id: "PO-2023-1042", customer: "شركة النيل للإنشاءات", date: "24 أكتوبر 2023", status: "مكتمل", amount: "EGP 145,000" },
  { id: "PO-2023-1043", customer: "مجموعة طلعت مصطفى", date: "23 أكتوبر 2023", status: "قيد المعالجة", amount: "EGP 89,500" },
  { id: "RFQ-2023-0891", customer: "أوراسكوم للإنشاءات", date: "22 أكتوبر 2023", status: "بانتظار الموافقة", amount: "EGP 210,000" },
  { id: "PO-2023-1044", customer: "المقاولون العرب", date: "21 أكتوبر 2023", status: "قيد المعالجة", amount: "EGP 56,200" },
  { id: "INV-2023-0552", customer: "بتروجيت", date: "20 أكتوبر 2023", status: "مكتمل", amount: "EGP 320,000" },
];

export function SlateExecutive() {
  return (
    <div dir="rtl" className="flex h-screen bg-slate-50/50 font-sans text-slate-800 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-16 bg-white border-l border-slate-200 flex flex-col items-center py-6 shrink-0 z-10 shadow-[2px_0_8px_-4px_rgba(0,0,0,0.05)]">
        <div className="mb-8">
          <img src="/__mockup/images/logo.jpeg" alt="Logo" className="h-8 w-8 rounded-md object-cover border border-slate-100 shadow-sm" />
        </div>
        
        <nav className="flex-1 flex flex-col gap-6 w-full items-center">
          <NavItem icon={<LayoutDashboard size={20} />} active />
          <NavItem icon={<ShoppingCart size={20} />} />
          <NavItem icon={<FileText size={20} />} />
          <NavItem icon={<Users size={20} />} />
          <NavItem icon={<Truck size={20} />} />
          <NavItem icon={<Package size={20} />} />
          <NavItem icon={<Building2 size={20} />} />
        </nav>

        <div className="mt-auto flex flex-col gap-4 items-center">
          <NavItem icon={<Settings size={20} />} />
          <Avatar className="h-8 w-8 border border-slate-200 cursor-pointer hover:ring-2 hover:ring-indigo-100 transition-all">
            <AvatarImage src="https://i.pravatar.cc/150?u=a042581f4e29026704d" />
            <AvatarFallback className="bg-indigo-50 text-indigo-700 text-xs">أحمد</AvatarFallback>
          </Avatar>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-0">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="hover:text-slate-800 cursor-pointer transition-colors">الرئيسية</span>
            <ChevronLeft size={14} className="text-slate-300" />
            <span className="text-slate-800 font-medium">لوحة التحكم</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative group">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
              <Input 
                placeholder="بحث عن طلب أو عميل..." 
                className="w-72 pl-4 pr-10 bg-slate-50 border-slate-200 focus-visible:ring-1 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 rounded-full h-9 text-sm transition-all"
              />
            </div>
            <button className="relative text-slate-400 hover:text-slate-600 transition-colors">
              <Bell size={18} />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-400 border border-white rounded-full translate-x-1/3 -translate-y-1/3"></span>
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {/* Header Section */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">مرحباً بك، أحمد</h1>
                <p className="text-sm text-slate-500 mt-1">إليك نظرة عامة على نشاط الشركة اليوم.</p>
              </div>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm rounded-lg px-6 h-10 font-medium">
                إنشاء أمر شراء جديد
              </Button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {metrics.map((metric, i) => (
                <Card key={i} className="bg-white border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] rounded-2xl hover:shadow-md transition-shadow duration-300">
                  <CardContent className="p-5 flex flex-col gap-3">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{metric.label}</p>
                    <div className="flex items-end justify-between">
                      <p className="text-2xl font-bold text-slate-800 tabular-nums">{metric.value}</p>
                      <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${metric.positive ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                        {metric.positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {metric.trend}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Main Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Data Table */}
              <Card className="lg:col-span-2 bg-white border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] rounded-2xl overflow-hidden flex flex-col">
                <CardHeader className="p-6 border-b border-slate-50 bg-white">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-slate-800">أحدث النشاطات</CardTitle>
                    <Button variant="ghost" size="sm" className="text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 h-8 font-medium">عرض الكل</Button>
                  </div>
                </CardHeader>
                <div className="p-0 overflow-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-slate-100 hover:bg-transparent">
                        <TableHead className="text-right text-xs font-medium text-slate-400 py-4 px-6">المعرف</TableHead>
                        <TableHead className="text-right text-xs font-medium text-slate-400 py-4 px-6">العميل</TableHead>
                        <TableHead className="text-right text-xs font-medium text-slate-400 py-4 px-6">التاريخ</TableHead>
                        <TableHead className="text-right text-xs font-medium text-slate-400 py-4 px-6">القيمة</TableHead>
                        <TableHead className="text-right text-xs font-medium text-slate-400 py-4 px-6">الحالة</TableHead>
                        <TableHead className="w-[50px] px-6"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentActivity.map((item, i) => (
                        <TableRow key={i} className="border-slate-50 hover:bg-slate-50/50 transition-colors group">
                          <TableCell className="font-medium text-sm text-slate-700 py-4 px-6">{item.id}</TableCell>
                          <TableCell className="text-sm text-slate-600 py-4 px-6">{item.customer}</TableCell>
                          <TableCell className="text-sm text-slate-500 py-4 px-6">{item.date}</TableCell>
                          <TableCell className="text-sm font-medium text-slate-700 py-4 px-6 tabular-nums">{item.amount}</TableCell>
                          <TableCell className="py-4 px-6">
                            <Badge variant="outline" className={`font-normal text-xs px-2.5 py-0.5 rounded-full border-0 ${
                              item.status === 'مكتمل' ? 'bg-emerald-50 text-emerald-600' :
                              item.status === 'قيد المعالجة' ? 'bg-amber-50 text-amber-600' :
                              'bg-indigo-50 text-indigo-600'
                            }`}>
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 px-6">
                            <button className="text-slate-300 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100">
                              <MoreHorizontal size={18} />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              {/* Side Panel */}
              <div className="space-y-6">
                <Card className="bg-white border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] rounded-2xl overflow-hidden">
                  <CardHeader className="p-6 pb-4">
                    <CardTitle className="text-lg font-semibold text-slate-800">ملخص خط الأنابيب</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-0 space-y-6">
                    <PipelineItem label="عروض أسعار قيد التفاوض" value="EGP 1.2M" count="18 عرض" progress={65} color="bg-indigo-500" />
                    <PipelineItem label="أوامر شراء قيد التنفيذ" value="EGP 850K" count="12 أمر" progress={45} color="bg-amber-500" />
                    <PipelineItem label="فواتير مستحقة الدفع" value="EGP 420K" count="5 فواتير" progress={25} color="bg-rose-500" />
                  </CardContent>
                </Card>

                <Card className="bg-indigo-600 border-0 shadow-lg shadow-indigo-600/20 rounded-2xl overflow-hidden relative group cursor-pointer">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-700 opacity-90"></div>
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                  <CardContent className="p-6 relative z-10 flex flex-col items-start gap-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <FileText className="text-white" size={24} />
                    </div>
                    <div>
                      <h3 className="text-white font-medium text-lg mb-1">التقرير الشهري جاهز</h3>
                      <p className="text-indigo-100 text-sm leading-relaxed">تم إصدار تقرير أداء شهر أكتوبر. يمكنك مراجعته الآن.</p>
                    </div>
                    <Button className="mt-2 bg-white text-indigo-700 hover:bg-slate-50 w-full rounded-lg shadow-sm font-medium border-0 h-10">
                      عرض التقرير
                    </Button>
                  </CardContent>
                </Card>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, active = false }: { icon: React.ReactNode, active?: boolean }) {
  return (
    <button className={`p-2.5 rounded-xl transition-all duration-200 relative group ${
      active 
        ? 'text-indigo-600 bg-indigo-50/80 shadow-sm' 
        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
    }`}>
      {icon}
      {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-600 rounded-r-full shadow-[0_0_8px_rgba(79,70,229,0.4)]"></span>}
    </button>
  );
}

function PipelineItem({ label, value, count, progress, color }: { label: string, value: string, count: string, progress: number, color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-sm font-medium text-slate-700">{label}</p>
          <p className="text-xs text-slate-400 mt-0.5">{count}</p>
        </div>
        <p className="text-sm font-bold text-slate-800 tabular-nums">{value}</p>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${progress}%` }}></div>
      </div>
    </div>
  );
}
