import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Shield, Settings2, TrendingUp, TrendingDown, AlertTriangle, Receipt, FileText } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetSupplierPo,
  useUpdateSupplierPo,
  useGetPoAnalysis,
  getGetSupplierPoQueryKey,
  getListSupplierPosQueryKey,
  getGetPoAnalysisQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  confirmed: "bg-yellow-100 text-yellow-700",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  sent: "مُرسل",
  confirmed: "مُؤكد",
  delivered: "مُسلَّم",
  cancelled: "ملغي",
};

const fmt = (n: number) =>
  n.toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type CostForm = {
  insuranceRate: string;
  vatRate: string;
  withholdingTaxRate: string;
  stampDutyRate: string;
  operatingCost: string;
};

export default function SupplierPoDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const numId = Number(id);

  const { data: po, isLoading } = useGetSupplierPo(numId, {
    query: { enabled: !!numId, queryKey: getGetSupplierPoQueryKey(numId) },
  });
  const { data: analysis, isLoading: isLoadingAnalysis } = useGetPoAnalysis(numId, {
    query: { enabled: !!numId, queryKey: getGetPoAnalysisQueryKey(numId) },
  });

  const updatePo = useUpdateSupplierPo();
  const [editingCosts, setEditingCosts] = useState(false);
  const [costForm, setCostForm] = useState<CostForm>({
    insuranceRate: "", vatRate: "", withholdingTaxRate: "", stampDutyRate: "", operatingCost: "",
  });

  function handleStatusChange(status: string) {
    updatePo.mutate(
      { id: numId, data: { status: status as any } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetSupplierPoQueryKey(numId) });
          qc.invalidateQueries({ queryKey: getListSupplierPosQueryKey() });
          toast({ title: "تم تحديث الحالة" });
        },
      }
    );
  }

  function openEditCosts() {
    if (!po) return;
    const p = po as any;
    setCostForm({
      insuranceRate: String(Number(p.insuranceRate ?? 0.03) * 100),
      vatRate: String(Number(p.vatRate ?? 0.14) * 100),
      withholdingTaxRate: String(Number(p.withholdingTaxRate ?? 0.005) * 100),
      stampDutyRate: String(Number(p.stampDutyRate ?? 0.001) * 100),
      operatingCost: String(p.operatingCost ?? 0),
    });
    setEditingCosts(true);
  }

  function saveCosts() {
    const ins = Number(costForm.insuranceRate) / 100;
    const vat = Number(costForm.vatRate) / 100;
    const wht = Number(costForm.withholdingTaxRate) / 100;
    const stamp = Number(costForm.stampDutyRate) / 100;
    const opCost = Number(costForm.operatingCost);
    if ([ins, vat, wht, stamp, opCost].some(isNaN)) {
      toast({ title: "قيم غير صحيحة", variant: "destructive" });
      return;
    }
    updatePo.mutate(
      { id: numId, data: { insuranceRate: ins, vatRate: vat, withholdingTaxRate: wht, stampDutyRate: stamp, operatingCost: opCost } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetSupplierPoQueryKey(numId) });
          qc.invalidateQueries({ queryKey: getGetPoAnalysisQueryKey(numId) });
          setEditingCosts(false);
          toast({ title: "تم تحديث التكاليف الضريبية" });
        },
      }
    );
  }

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /></div>;
  }

  if (!po) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">لم يتم العثور على أمر التوريد.</p>
        <Button variant="link" onClick={() => setLocation("/supplier-pos")}>عودة لأوامر التوريد</Button>
      </div>
    );
  }

  const p = po as any;
  const grossCost = po.totalAmount ?? 0;
  const insuranceRate = Number(p.insuranceRate ?? 0.03);
  const vatRate = Number(p.vatRate ?? 0.14);
  const withholdingTaxRate = Number(p.withholdingTaxRate ?? 0.005);
  const stampDutyRate = Number(p.stampDutyRate ?? 0.001);
  const operatingCost = Number(p.operatingCost ?? 0);
  const insuranceAmount = Math.round(grossCost * insuranceRate * 100) / 100;
  const vatAmount = Math.round(grossCost * vatRate * 100) / 100;
  const withholdingTaxAmount = Math.round(grossCost * withholdingTaxRate * 100) / 100;
  const stampDutyAmount = Math.round(grossCost * stampDutyRate * 100) / 100;
  const totalTax = insuranceAmount + vatAmount + withholdingTaxAmount + stampDutyAmount;
  const totalCost = Math.round((grossCost + totalTax + operatingCost) * 100) / 100;

  const row = (label: string, icon: React.ReactNode, amount: number, color: string, pct: number, note: string) => (
    <div className="flex items-center justify-between text-sm">
      <span className={`flex items-center gap-1.5 text-muted-foreground`}>
        {icon}
        <span>{label} <span className="text-xs">({(pct * 100).toFixed(1)}%)</span></span>
      </span>
      <div className="text-right">
        <span className={`font-medium ${color}`}>+{fmt(amount)}</span>
        {note && <p className="text-[10px] text-muted-foreground leading-tight">{note}</p>}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/supplier-pos")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{po.poNumber ?? `أمر توريد #${po.id}`}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {p.supplierName ?? `مورد #${po.supplierId}`} • {new Date(po.createdAt).toLocaleDateString("ar-EG")}
            {po.customerPoId && (
              <span className="ml-2">
                • مرتبط بـ <a href={`/customer-pos/${po.customerPoId}`} className="text-primary hover:underline">أمر عميل #{po.customerPoId}</a>
              </span>
            )}
          </p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[po.status] ?? ""}`}>
          {STATUS_LABELS[po.status] ?? po.status}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status & Basic Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">تفاصيل الأمر</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">الحالة</Label>
              <Select value={po.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">مسودة</SelectItem>
                  <SelectItem value="sent">مُرسل</SelectItem>
                  <SelectItem value="confirmed">مُؤكد</SelectItem>
                  <SelectItem value="delivered">مُسلَّم</SelectItem>
                  <SelectItem value="cancelled">ملغي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">قيمة البضاعة من المورد</Label>
              <p className="mt-1 text-2xl font-bold">{grossCost > 0 ? fmt(grossCost) : "—"}</p>
              <p className="text-xs text-muted-foreground">قبل الضرائب والتأمين والتكاليف التشغيلية</p>
            </div>
            {po.notes && (
              <div>
                <Label className="text-xs text-muted-foreground">ملاحظات</Label>
                <p className="mt-1 text-sm">{po.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cost Breakdown */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">تفصيل التكاليف الضريبية</CardTitle>
              <CardDescription>القانون المصري 2026</CardDescription>
            </div>
            {!editingCosts ? (
              <Button variant="outline" size="sm" onClick={openEditCosts}>تعديل</Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingCosts(false)}>إلغاء</Button>
                <Button size="sm" onClick={saveCosts} disabled={updatePo.isPending}>حفظ</Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {editingCosts ? (
              <div className="space-y-3">
                {[
                  { label: "التأمين النهائي — حكومي (%) [قانون 182/2018]", key: "insuranceRate", default: "3" },
                  { label: "ضريبة القيمة المضافة (%) [قانون 67/2016]", key: "vatRate", default: "14" },
                  { label: "خصم تحت حساب الضريبة (%) [المادة 59 — قانون 91/2005]", key: "withholdingTaxRate", default: "0.5" },
                  { label: "ضريبة الدمغة النسبية (%) [قانون 111/1980]", key: "stampDutyRate", default: "0.1" },
                ].map(({ label, key, default: def }) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" min="0" max="100" step="0.01"
                        value={(costForm as any)[key]}
                        onChange={(e) => setCostForm({ ...costForm, [key]: e.target.value })}
                        className="w-28"
                      />
                      <span className="text-xs text-muted-foreground">% (افتراضي: {def}%)</span>
                    </div>
                  </div>
                ))}
                <div className="space-y-1">
                  <Label className="text-xs">التكاليف التشغيلية</Label>
                  <Input
                    type="number" min="0" step="0.01"
                    value={costForm.operatingCost}
                    onChange={(e) => setCostForm({ ...costForm, operatingCost: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">قيمة البضاعة</span>
                  <span className="font-medium">{fmt(grossCost)}</span>
                </div>
                {row(
                  "تأمين نهائي — عقود حكومية",
                  <Shield className="h-3.5 w-3.5 text-orange-500" />,
                  insuranceAmount, "text-orange-600", insuranceRate,
                  "قانون 182/2018 • يُعاد عند إتمام العقد"
                )}
                {row(
                  "ضريبة القيمة المضافة",
                  <Receipt className="h-3.5 w-3.5 text-purple-500" />,
                  vatAmount, "text-purple-600", vatRate,
                  "قانون 67/2016"
                )}
                {row(
                  "خصم تحت حساب الضريبة",
                  <FileText className="h-3.5 w-3.5 text-yellow-600" />,
                  withholdingTaxAmount, "text-yellow-700", withholdingTaxRate,
                  "المادة 59 — قانون 91/2005 • يُورَّد لمصلحة الضرائب"
                )}
                {row(
                  "ضريبة الدمغة النسبية",
                  <FileText className="h-3.5 w-3.5 text-gray-500" />,
                  stampDutyAmount, "text-gray-600", stampDutyRate,
                  "قانون 111/1980"
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Settings2 className="h-3.5 w-3.5" />
                    تكاليف تشغيلية
                  </span>
                  <span className="font-medium text-blue-600">+{fmt(operatingCost)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>إجمالي الضرائب والتأمين</span>
                  <span className="font-medium text-red-500">{fmt(totalTax)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">إجمالي التكلفة</span>
                  <span className="text-xl font-bold">{fmt(totalCost)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Egyptian Tax Law Reference */}
      <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-amber-900" dir="rtl">
        <p className="font-bold mb-2">📋 مرجع القانون المصري 2026 — الضرائب المُطبَّقة</p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
          <div><span className="font-semibold">التأمين النهائي 3%:</span> قانون 182/2018 — عقود الجهات العامة فقط</div>
          <div><span className="font-semibold">ضريبة القيمة المضافة 14%:</span> قانون 67/2016 — جميع المعاملات</div>
          <div><span className="font-semibold">خصم تحت الحساب 0.5%:</span> المادة 59 — قانون 91/2005</div>
          <div><span className="font-semibold">ضريبة الدمغة 0.1%:</span> قانون 111/1980 وتعديلاته</div>
        </div>
        <p className="text-xs text-amber-700 mt-2">⚠️ للعقود الخاصة: اضبط التأمين النهائي على 0% — للعقود الحكومية: اتركه 3%</p>
      </div>

      {/* P&L Analysis */}
      {isLoadingAnalysis ? (
        <Skeleton className="h-32 w-full" />
      ) : analysis ? (
        <Card className={
          analysis.profit != null
            ? analysis.profit >= 0 ? "border-green-200 bg-green-50/40" : "border-red-200 bg-red-50/40"
            : ""
        }>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {analysis.profit != null && analysis.profit >= 0
                ? <TrendingUp className="h-4 w-4 text-green-600" />
                : <TrendingDown className="h-4 w-4 text-red-600" />
              }
              تحليل الأرباح والخسائر
            </CardTitle>
            <CardDescription>
              مرتبط بـ{" "}
              {analysis.customerPoId ? (
                <a href={`/customer-pos/${analysis.customerPoId}`} className="text-primary hover:underline">
                  {(analysis as any).customerPoNumber ?? `أمر عميل #${analysis.customerPoId}`}
                </a>
              ) : "لا يوجد أمر عميل مرتبط"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analysis.revenue == null ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span>لا يوجد أمر عميل مرتبط — الربح غير متاح.</span>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">الإيراد</p>
                  <p className="text-xl font-bold text-green-600">{fmt(analysis.revenue)}</p>
                  <p className="text-xs text-muted-foreground">ما دفعه العميل</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">إجمالي التكلفة</p>
                  <p className="text-xl font-bold text-red-600">{fmt(analysis.totalCost)}</p>
                  <p className="text-xs text-muted-foreground">بضاعة + ضرائب + تشغيل</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">صافي الربح</p>
                  <p className={`text-xl font-bold ${(analysis.profit ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {fmt(analysis.profit ?? 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    الهامش: {analysis.profitMargin != null ? `${analysis.profitMargin.toFixed(1)}%` : "—"}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
