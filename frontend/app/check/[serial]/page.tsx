"use client";
import { useState, use } from "react";
import { api } from "@/lib/api";
import {
    ShieldCheck, Phone, Hash, Package, Calendar, CheckCircle2,
    XCircle, Clock, AlertTriangle, ChevronRight, ArrowRight,
    Wrench, Ticket, RefreshCw
} from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WarrantyData {
    serial_number: string;
    warranty_status: string;
    purchase_date: string | null;
    activation_date: string | null;
    notes: string | null;
    qr_code_url: string | null;
    product: {
        name: string;
        image_url: string | null;
        warranty_months: number;
        specs: string | null;
    } | null;
    user: { name: string; phone: string } | null;
    maintenance_history: {
        id: number; fault_type: string; technician_name: string;
        report_date: string; resolved_date: string | null; notes: string | null;
    }[];
    tickets: {
        id: number; title: string; status: string; created_at: string;
    }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
}

function getWarrantyDays(data: WarrantyData) {
    if (!data.purchase_date || !data.product) return null;
    const start = new Date(data.purchase_date);
    const end = new Date(start);
    end.setMonth(end.getMonth() + data.product.warranty_months);
    const total = (end.getTime() - start.getTime()) / 86400000;
    const left = Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000));
    const pct = Math.round((left / total) * 100);
    return { end, left, pct };
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
        active: { label: "ضمان ساري", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 size={13} /> },
        expired: { label: "منتهي الضمان", cls: "bg-red-50 text-red-600 border-red-200", icon: <XCircle size={13} /> },
        inactive: { label: "غير مفعل", cls: "bg-amber-50 text-amber-700 border-amber-200", icon: <Clock size={13} /> },
        void: { label: "ملغي", cls: "bg-slate-50 text-slate-500 border-slate-200", icon: <XCircle size={13} /> },
    };
    const c = map[status] || map.void;
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${c.cls}`}>
            {c.icon} {c.label}
        </span>
    );
}

const ticketStatusMap: Record<string, string> = {
    open: "مفتوح", in_progress: "قيد المعالجة", resolved: "تم الحل", closed: "مغلق"
};

// ─── Page ─────────────────────────────────────────────────────────────────────

type Step = "phone" | "otp" | "result";

export default function CheckPage({ params }: { params: Promise<{ serial: string }> }) {
    const { serial } = use(params);

    const [step, setStep] = useState<Step>("phone");
    const [phone, setPhone] = useState("");
    const [code, setCode] = useState("");
    const [devCode, setDevCode] = useState("");
    const [data, setData] = useState<WarrantyData | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // ── Step 1: Send OTP ──
    const handleStart = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setError("");
        try {
            const res = await api.post("/api/check/start", { serial, phone });
            setDevCode(res.data.dev_code || "");
            setStep("otp");
        } catch (err: any) {
            setError(err?.response?.data?.detail || "حدث خطأ، تحقق من الرقم التسلسلي ورقم الهاتف");
        } finally { setLoading(false); }
    };

    // ── Step 2: Verify OTP ──
    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setError("");
        try {
            const res = await api.post("/api/check/verify", { serial, phone, code });
            setData(res.data);
            setStep("result");
        } catch (err: any) {
            setError(err?.response?.data?.detail || "رمز التحقق غير صحيح أو منتهي الصلاحية");
        } finally { setLoading(false); }
    };

    const wd = data ? getWarrantyDays(data) : null;

    // ════════════════════════════════════════════════════════
    // RESULT VIEW
    // ════════════════════════════════════════════════════════
    if (step === "result" && data) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 py-8 px-4">
                <div className="max-w-2xl mx-auto space-y-5">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                                <ShieldCheck size={18} className="text-white" />
                            </div>
                            <span className="font-bold text-slate-700">Smart Warranty</span>
                        </div>
                        <button
                            onClick={() => { setStep("phone"); setCode(""); setData(null); setError(""); }}
                            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-500 transition-colors"
                        >
                            <RefreshCw size={12} /> فحص جديد
                        </button>
                    </div>

                    {/* Status card */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className={`h-2 w-full ${data.warranty_status === "active" ? "bg-gradient-to-r from-emerald-400 to-teal-400" : data.warranty_status === "expired" ? "bg-gradient-to-r from-red-400 to-rose-400" : "bg-slate-200"}`} />
                        <div className="p-6">
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div>
                                    <p className="text-xs text-slate-400 mb-1 font-mono uppercase tracking-wider">الرقم التسلسلي</p>
                                    <p className="text-xl font-bold font-mono text-slate-800">{data.serial_number}</p>
                                    {data.product && (
                                        <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                                            <Package size={12} /> {data.product.name}
                                        </p>
                                    )}
                                </div>
                                <StatusBadge status={data.warranty_status} />
                            </div>

                            {/* Details grid */}
                            <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Calendar size={10} /> تاريخ الشراء</p>
                                    <p className="font-semibold text-slate-700">{formatDate(data.purchase_date)}</p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Calendar size={10} /> انتهاء الضمان</p>
                                    <p className="font-semibold text-slate-700">{wd ? formatDate(wd.end.toISOString()) : "—"}</p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><ShieldCheck size={10} /> مدة الضمان</p>
                                    <p className="font-semibold text-slate-700">{data.product?.warranty_months} شهر</p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Phone size={10} /> صاحب الضمان</p>
                                    <p className="font-semibold text-slate-700">{data.user?.name || "—"}</p>
                                </div>
                            </div>

                            {/* Progress bar */}
                            {wd && data.warranty_status === "active" && (
                                <div className="mt-5">
                                    <div className="flex justify-between text-xs text-slate-400 mb-2">
                                        <span>المتبقي من الضمان</span>
                                        <span className={`font-semibold ${wd.left < 30 ? "text-red-500" : wd.left < 90 ? "text-amber-500" : "text-emerald-600"}`}>
                                            {wd.left} يوم ({wd.pct}%)
                                        </span>
                                    </div>
                                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${wd.pct > 50 ? "bg-gradient-to-r from-emerald-400 to-teal-400" : wd.pct > 20 ? "bg-gradient-to-r from-amber-400 to-orange-400" : "bg-gradient-to-r from-red-400 to-rose-400"}`}
                                            style={{ width: `${wd.pct}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Print cert */}
                            <div className="flex gap-2 mt-5 pt-4 border-t border-slate-50">
                                <Link href={`/print?serial=${data.serial_number}`} target="_blank"
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-sm font-medium rounded-xl transition-colors">
                                    <ShieldCheck size={14} /> شهادة الضمان
                                </Link>
                                <Link href={`/portal/ticket/new?serial=${data.serial_number}`}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-xl transition-colors">
                                    <AlertTriangle size={14} /> الإبلاغ عن عطل
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Maintenance history */}
                    {data.maintenance_history.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                            <h3 className="font-semibold text-slate-700 flex items-center gap-2 mb-4">
                                <Wrench size={16} className="text-indigo-500" /> سجل الصيانة
                            </h3>
                            <div className="space-y-3">
                                {data.maintenance_history.map(m => (
                                    <div key={m.id} className="flex gap-3 p-3 bg-slate-50 rounded-xl text-sm">
                                        <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <Wrench size={14} className="text-amber-500" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-700">{m.fault_type || "صيانة"}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{formatDate(m.report_date)} · {m.technician_name}</p>
                                            {m.notes && <p className="text-xs text-slate-500 mt-1">{m.notes}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tickets */}
                    {data.tickets.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                            <h3 className="font-semibold text-slate-700 flex items-center gap-2 mb-4">
                                <Ticket size={16} className="text-indigo-500" /> البلاغات
                            </h3>
                            <div className="space-y-3">
                                {data.tickets.map(t => (
                                    <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-sm">
                                        <p className="font-medium text-slate-700">{t.title}</p>
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${t.status === "resolved" ? "bg-emerald-50 text-emerald-600" : t.status === "open" ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
                                            {ticketStatusMap[t.status] || t.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ════════════════════════════════════════════════════════
    // LOGIN FORM (phone + OTP steps)
    // ════════════════════════════════════════════════════════
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50/30 flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-25 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-25 translate-x-1/2 translate-y-1/2 pointer-events-none" />

            <div className="relative w-full max-w-md">
                <div className="bg-white/85 backdrop-blur-md rounded-3xl shadow-xl shadow-indigo-100/50 border border-white/60 p-8 space-y-7">
                    {/* Logo */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                            <ShieldCheck size={32} className="text-white" strokeWidth={1.8} />
                        </div>
                        <div className="text-center">
                            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">فحص الضمان</h1>
                            <p className="text-sm text-slate-400 mt-0.5 font-mono bg-slate-50 px-3 py-1 rounded-full">{serial}</p>
                        </div>
                    </div>

                    {/* Step indicator */}
                    <div className="flex items-center gap-2 justify-center text-xs text-slate-400">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step === "phone" ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-emerald-500 text-white"}`}>
                            {step === "phone" ? "1" : <CheckCircle2 size={14} />}
                        </div>
                        <div className={`w-12 h-0.5 rounded-full ${step === "otp" || step === "result" ? "bg-indigo-300" : "bg-slate-100"}`} />
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step === "otp" ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-slate-100 text-slate-400"}`}>
                            2
                        </div>
                    </div>

                    {/* ── Phone step ── */}
                    {step === "phone" && (
                        <form onSubmit={handleStart} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    رقم الهاتف المسجل مع الضمان
                                </label>
                                <div className="relative">
                                    <Phone size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        className="w-full pr-10 pl-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 focus:bg-white transition-all"
                                        placeholder="01xxxxxxxxx"
                                        required
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        inputMode="tel"
                                        autoFocus
                                    />
                                </div>
                                <p className="text-xs text-slate-400 mt-1.5">سيُرسل رمز التحقق على هذا الرقم عبر واتساب</p>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                                    <XCircle size={15} className="text-red-500 flex-shrink-0" />
                                    <p className="text-red-600 text-sm">{error}</p>
                                </div>
                            )}

                            <button type="submit" disabled={loading}
                                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 text-sm">
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        جاري الإرسال...
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        إرسال رمز التحقق <ArrowRight size={16} />
                                    </span>
                                )}
                            </button>
                        </form>
                    )}

                    {/* ── OTP step ── */}
                    {step === "otp" && (
                        <form onSubmit={handleVerify} className="space-y-4">
                            <div className="text-center p-4 bg-slate-50 rounded-2xl">
                                <p className="text-xs text-slate-400 mb-1">تم إرسال الرمز إلى</p>
                                <p className="font-semibold text-slate-700 text-sm">{phone}</p>
                            </div>

                            {devCode && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                                    <p className="text-xs text-emerald-600 mb-2">🔧 الرمز (وضع التطوير)</p>
                                    <p className="text-4xl font-bold font-mono tracking-[0.4em] text-emerald-700">{devCode}</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">رمز التحقق</label>
                                <input
                                    className="w-full px-4 py-4 rounded-xl border border-slate-200 bg-slate-50 text-center text-3xl tracking-[0.6em] font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:bg-white transition-all"
                                    maxLength={6}
                                    value={code}
                                    onChange={e => setCode(e.target.value)}
                                    required
                                    autoFocus
                                    inputMode="numeric"
                                />
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                                    <XCircle size={15} className="text-red-500 flex-shrink-0" />
                                    <p className="text-red-600 text-sm">{error}</p>
                                </div>
                            )}

                            <button type="submit" disabled={loading}
                                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 disabled:opacity-50 text-sm">
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        جاري التحقق...
                                    </span>
                                ) : "تأكيد الدخول ✓"}
                            </button>

                            <button type="button"
                                onClick={() => { setStep("phone"); setError(""); setCode(""); }}
                                className="w-full py-2.5 border border-slate-200 text-slate-500 text-sm rounded-xl hover:bg-slate-50 transition-colors">
                                ← تغيير رقم الهاتف
                            </button>
                        </form>
                    )}
                </div>

                {/* Serial display below card */}
                <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-400">
                    <Hash size={12} /> {serial}
                </div>
            </div>
        </div>
    );
}
