export function PrintHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="hidden print:block mb-8" dir="rtl">
      {/* Top bar */}
      <div className="flex items-start justify-between border-b-2 border-gray-300 pb-5 mb-4">
        {/* Logo */}
        <img src="/logo.jpeg" alt="AL-KHEDIVI" className="h-20 w-auto object-contain" />

        {/* Company info (right side for RTL) */}
        <div className="text-right space-y-0.5">
          <h2 className="text-lg font-bold text-gray-800">AL-KHEDIVI General Supplies & Contracting</h2>
          <p className="text-sm text-gray-600">📧 INFO@ALKHEDIVI.COM</p>
          <p className="text-sm text-gray-600">📞 +20 109 888 8170</p>
          <p className="text-sm text-gray-600">📍 مصر (Egypt)</p>
          <p className="text-sm text-gray-600">🔗 linkedin.com/company/alkhedivi</p>
        </div>
      </div>

      {/* Registration info row */}
      <div className="flex justify-between text-xs text-gray-500 border-b border-gray-200 pb-3 mb-5">
        <span>رقم التسجيل الضريبي (ب‑ض): <span className="font-semibold text-gray-700">٧٧٤-٤١٥-٩١٦</span></span>
        <span>السجل التجاري (س‑ت): <span className="font-semibold text-gray-700">٢٣٧١٩</span></span>
      </div>

      {/* Document title */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-base text-gray-600 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
