"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { ShieldCheck, Package, Calendar, Printer } from "lucide-react";

interface WarrantyData {
    serial_number: string;
    warranty_status: string;
    purchase_date: string;
    warranty_end_date: string;
    product: { name: string; warranty_months: number; specs: string };
    user: { name: string; phone: string } | null;
}

function PrintContent() {
    const params = useSearchParams();
    const serial = params.get("serial") || "";
    const [data, setData] = useState<WarrantyData | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!serial) return;
        api.get(`/api/serials/${serial}`)
            .then(r => { setData(r.data); setTimeout(() => window.print(), 500); })
            .catch(() => setError("رقم تسلسلي غير موجود"));
    }, [serial]);

    if (error) return <div className="p-10 text-center text-red-500">{error}</div>;
    if (!data) return <div className="p-10 text-center text-slate-400">جاري التحميل...</div>;

    const statusLabel: Record<string, string> = { active: "ضمان ساري ✓", expired: "منتهي الصلاحية ✗", inactive: "غير مفعل", void: "ملغي" };
    const statusColor: Record<string, string> = { active: "#10B981", expired: "#EF4444", inactive: "#94A3B8", void: "#94A3B8" };

    return (
        <div className="min-h-screen bg-white p-8 max-w-2xl mx-auto print:p-0">
            {/* Print button (hidden in print) */}
            <div className="print:hidden mb-6 flex gap-3">
                <button onClick={() => window.print()} className="btn btn-primary gap-2">
                    <Printer size={16} /> طباعة الشهادة
                </button>
                <a
                    href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/reports/warranty/${serial}/pdf`}
                    className="btn btn-ghost gap-2"
                    download
                >
                    تحميل PDF
                </a>
            </div>

            {/* Certificate */}
            <div className="border-4 border-indigo-600 rounded-3xl overflow-hidden shadow-2xl print:shadow-none">
                {/* Header */}
                <div style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }} className="p-8 text-white text-center">
                    <div className="flex justify-center mb-3">
                        <ShieldCheck size={48} className="opacity-90" />
                    </div>
                    <h1 className="text-3xl font-bold">شهادة الضمان الرسمية</h1>
                    <p className="text-white/70 mt-1">Smart Warranty Certificate</p>
                </div>

                {/* Status badge */}
                <div className="py-4 text-center" style={{ background: statusColor[data.warranty_status] + "18" }}>
                    <span
                        className="px-6 py-2 rounded-full text-white font-bold text-lg"
                        style={{ background: statusColor[data.warranty_status] }}
                    >
                        {statusLabel[data.warranty_status]}
                    </span>
                </div>

                {/* Body */}
                <div className="p-8 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-2xl p-4">
                            <p className="text-xs text-slate-400 mb-1">المنتج</p>
                            <p className="font-bold text-slate-800">{data.product?.name}</p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-4">
                            <p className="text-xs text-slate-400 mb-1">الرقم التسلسلي</p>
                            <p className="font-bold font-mono text-slate-800 text-sm">{data.serial_number}</p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-4">
                            <p className="text-xs text-slate-400 mb-1">العميل</p>
                            <p className="font-bold text-slate-800">{data.user?.name || "—"}</p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-4">
                            <p className="text-xs text-slate-400 mb-1">رقم الهاتف</p>
                            <p className="font-bold text-slate-800">{data.user?.phone || "—"}</p>
                        </div>
                        <div className="bg-emerald-50 rounded-2xl p-4">
                            <p className="text-xs text-slate-400 mb-1">تاريخ الشراء</p>
                            <p className="font-bold text-slate-800">{data.purchase_date}</p>
                        </div>
                        <div className="bg-red-50 rounded-2xl p-4">
                            <p className="text-xs text-slate-400 mb-1">انتهاء الضمان</p>
                            <p className="font-bold text-slate-800">{data.warranty_end_date}</p>
                        </div>
                    </div>

                    <div className="bg-indigo-50 rounded-2xl p-4">
                        <p className="text-xs text-slate-400 mb-1">مدة الضمان</p>
                        <p className="font-bold text-indigo-600">{data.product?.warranty_months} شهر</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 px-8 py-4 text-center text-xs text-slate-400 border-t border-slate-100">
                    محفوظة ومُصدرة بواسطة Smart Warranty Tracker · {new Date().toLocaleDateString("ar-EG")}
                </div>
            </div>
        </div>
    );
}

export default function PrintPage() {
    return (
        <Suspense>
            <PrintContent />
        </Suspense>
    );
}
