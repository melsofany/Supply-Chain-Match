export const INQUIRY_STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  quoted: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-600",
};

export const INQUIRY_STATUS_LABELS: Record<string, string> = {
  new: "جديد",
  in_progress: "قيد المعالجة",
  quoted: "مسعَّر",
  closed: "مغلق",
};

export const QUOTATION_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export const QUOTATION_STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  sent: "مُرسل",
  approved: "مُعتمد",
  rejected: "مرفوض",
};

export const CUSTOMER_PO_STATUS_COLORS: Record<string, string> = {
  received: "bg-blue-100 text-blue-700",
  processing: "bg-yellow-100 text-yellow-700",
  fulfilled: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
};

export const CUSTOMER_PO_STATUS_LABELS: Record<string, string> = {
  received: "مستلم",
  processing: "قيد المعالجة",
  fulfilled: "مكتمل",
  cancelled: "ملغي",
};

export const SUPPLIER_PO_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  confirmed: "bg-yellow-100 text-yellow-700",
  shipped: "bg-yellow-100 text-yellow-700",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
};

export const SUPPLIER_PO_STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  sent: "مُرسل",
  confirmed: "مُؤكد",
  shipped: "مُشحون",
  delivered: "مُسلَّم",
  cancelled: "ملغي",
};

export const DELIVERY_NOTE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending_finance: "bg-yellow-100 text-yellow-800",
  finance_approved: "bg-blue-100 text-blue-700",
  delivered: "bg-purple-100 text-purple-700",
  signed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
};

export const DELIVERY_NOTE_STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  pending_finance: "بانتظار اعتماد المالية",
  finance_approved: "معتمد مالياً",
  delivered: "تم التسليم",
  signed: "موقع من العميل",
  cancelled: "ملغي",
};

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  issued: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  issued: "صادرة",
  paid: "مدفوعة",
  cancelled: "ملغاة",
};

export const SUPPLIER_RFQ_STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  received: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
};

export const SUPPLIER_RFQ_STATUS_LABELS: Record<string, string> = {
  pending: "معلق",
  sent: "أُرسل",
  received: "استُلم الرد",
  cancelled: "ملغي",
};
