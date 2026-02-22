"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "../../lib/api";
import { ShieldCheck, Calendar, Package, Phone, CheckCircle2, XCircle, Clock, Printer, ArrowRight } from "lucide-react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface WarrantyPrintData {
    serial_number: string;
    warranty_status: string;
    purchase_date: string | null;
    activation_date: string | null;
    product: {
        name: string;
        warranty_months: number;
        specs: string | null;
        image_url: string | null;
    } | null;
    user: { name: string; phone: string } | null;
}

function formatDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
}

function addMonths(dateStr: string, months: number): string {
    const d = new Date(dateStr);
    d.setMonth(d.getMonth() + months);
    return d.toISOString();
}

const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    active: { label: "ضمان ساري", color: "text-emerald-600", icon: <CheckCircle2 size={18} className="text-emerald-500" /> },
    expired: { label: "منتهي الضمان", color: "text-red-500", icon: <XCircle size={18} className="text-red-500" /> },
    inactive: { label: "غير مفعل", color: "text-amber-500", icon: <Clock size={18} className="text-amber-500" /> },
};

function PrintPageContent() {
    const params = useSearchParams();
    const serial = params.get("serial") || "";

    const [data, setData] = useState<WarrantyPrintData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!serial) { setError("لم يتم تحديد رقم تسلسلي"); setLoading(false); return; }
        // We use the check/verify result already stored in sessionStorage from check page,
        // or re-fetch via a public endpoint
        const stored = sessionStorage.getItem(`warranty_${serial}`);
        if (stored) {
            setData(JSON.parse(stored));
            setLoading(false);
        } else {
            // Try public serial lookup (no auth needed for print if already verified)
            api.get(`/api/serials/${serial}`)
                .then(r => { setData(r.data); setLoading(false); })
                .catch(() => { setError("تعذّر تحميل بيانات الضمان. تأكد من أنك في وضع التحقق أولاً."); setLoading(false); });
        }
    }, [serial]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
    );

    if (error || !data) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center p-8">
            <XCircle size={48} className="text-red-300" />
            <p className="text-slate-600 font-semibold">{error || "بيانات غير موجودة"}</p>
            <Link href="/" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition flex items-center gap-2">
                <ArrowRight size={14} /> العودة للرئيسية
            </Link>
        </div>
    );

    const status = statusMap[data.warranty_status] || statusMap.inactive;
    const expiryDate = data.purchase_date && data.product
        ? addMonths(data.purchase_date, data.product.warranty_months)
        : null;

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center py-8 px-4">
            {/* Print button - hidden on print */}
            <div className="mb-6 flex gap-3 print:hidden">
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md transition"
                >
                    <Printer size={16} /> طباعة الشهادة
                </button>
                <Link href={`/check/${serial}`} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition">
                    <ArrowRight size={14} /> رجوع
                </Link>
            </div>

            {/* Certificate card */}
            <div
                id="warranty-certificate"
                className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 print:shadow-none print:rounded-none print:border-none"
            >
                {/* Header strip */}
                <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 px-8 py-6 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                <ShieldCheck size={26} className="text-white" />
                            </div>
                            <div>
                                <p className="text-white/70 text-xs uppercase tracking-widest">Modern Home</p>
                                <h1 className="text-xl font-bold">شهادة الضمان</h1>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-white/60 text-xs">رقم الشهادة</p>
                            <p className="font-mono font-bold text-sm">{data.serial_number}</p>
                        </div>
                    </div>
                </div>

                {/* Status banner */}
                <div className={`px-8 py-3 flex items-center gap-2 ${data.warranty_status === "active" ? "bg-emerald-50" : data.warranty_status === "expired" ? "bg-red-50" : "bg-amber-50"}`}>
                    {status.icon}
                    <span className={`font-bold text-sm ${status.color}`}>{status.label}</span>
                </div>

                {/* Body */}
                <div className="px-8 py-7 space-y-6">
                    {/* Product info */}
                    <div>
                        <p className="text-xs text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <Package size={11} /> المنتج
                        </p>
                        <p className="text-2xl font-bold text-slate-800">{data.product?.name || "—"}</p>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-xl p-4">
                            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Calendar size={10} /> تاريخ الشراء</p>
                            <p className="font-bold text-slate-800 text-sm">{formatDate(data.purchase_date)}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4">
                            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Calendar size={10} /> انتهاء الضمان</p>
                            <p className="font-bold text-slate-800 text-sm">{expiryDate ? formatDate(expiryDate) : "—"}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4">
                            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><ShieldCheck size={10} /> مدة الضمان</p>
                            <p className="font-bold text-slate-800 text-sm">{data.product?.warranty_months || "—"} شهر</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4">
                            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Phone size={10} /> صاحب الضمان</p>
                            <p className="font-bold text-slate-800 text-sm">{data.user?.name || "—"}</p>
                            {data.user?.phone && <p className="text-xs text-slate-400 mt-0.5 font-mono">{data.user.phone}</p>}
                        </div>
                    </div>

                    {/* Serial + QR */}
                    <div className="border-t border-dashed border-slate-200 pt-5 flex items-center justify-between gap-4">
                        <div>
                            <p className="text-xs text-slate-400 mb-1">الرقم التسلسلي</p>
                            <p className="font-mono font-bold text-slate-700 text-lg tracking-wider">{data.serial_number}</p>
                            <p className="text-xs text-slate-400 mt-3">تاريخ الإصدار</p>
                            <p className="text-sm font-semibold text-slate-600">
                                {new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}
                            </p>
                        </div>
                        {/* QR Code — scannable to verify warranty */}
                        <div className="flex flex-col items-center gap-1">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={`${API_URL}/api/serials/${data.serial_number}/qr`}
                                alt={`QR - ${data.serial_number}`}
                                width={100}
                                height={100}
                                className="rounded-lg border border-slate-200 p-1 bg-white"
                            />
                            <p className="text-xs text-slate-400">امسح للتحقق</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 px-8 py-4 text-center border-t border-slate-100">
                    <p className="text-xs text-slate-400">
                        هذه الشهادة صادرة إلكترونياً من <span className="font-semibold text-indigo-500">مودرن هوم</span> ويمكن التحقق منها على الموقع
                    </p>
                </div>
            </div>

            {/* Print styles */}
            <style>{`
                @media print {
                    body { background: white; }
                    .print\\:hidden { display: none !important; }
                }
            `}</style>
        </div>
    );
}

export default function PrintPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>}>
            <PrintPageContent />
        </Suspense>
    );
}
