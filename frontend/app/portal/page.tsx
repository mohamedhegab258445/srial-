"use client";
import { useState } from "react";
import { api, requestOTP, verifyOTP } from "@/lib/api";
import {
    ShieldCheck, Phone, Hash, Package, Calendar, Printer,
    AlertTriangle, LogOut, ArrowLeft, CheckCircle2, XCircle,
    Clock, ChevronLeft
} from "lucide-react";
import Link from "next/link";

interface Product {
    id: number; serial_number: string; warranty_status: string;
    purchase_date: string; product: { name: string; warranty_months: number }
}

/* ── helpers ── */
function getWarrantyDays(p: Product) {
    if (!p.purchase_date) return null;
    const start = new Date(p.purchase_date);
    const end = new Date(start);
    end.setMonth(end.getMonth() + (p.product?.warranty_months || 12));
    const total = (end.getTime() - start.getTime()) / 86400000;
    const left = Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000));
    const pct = Math.round((left / total) * 100);
    return { end, left, pct };
}

function formatDate(d: string) {
    return new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
}

/* ── sub-components ── */
function Logo() {
    return (
        <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                <ShieldCheck size={32} className="text-white" strokeWidth={1.8} />
            </div>
            <div className="text-center">
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Smart Warranty</h1>
                <p className="text-sm text-slate-400 mt-0.5">بوابة ضمان المنتجات</p>
            </div>
        </div>
    );
}

function WarrantyBadge({ status }: { status: string }) {
    const config: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
        active: { label: "ضمان ساري", icon: <CheckCircle2 size={14} />, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
        expired: { label: "منتهي الضمان", icon: <XCircle size={14} />, cls: "bg-red-50 text-red-600 border-red-200" },
        inactive: { label: "غير مفعل", icon: <Clock size={14} />, cls: "bg-amber-50 text-amber-700 border-amber-200" },
        void: { label: "ملغي", icon: <XCircle size={14} />, cls: "bg-slate-50 text-slate-500 border-slate-200" },
    };
    const c = config[status] || config.void;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.cls}`}>
            {c.icon}{c.label}
        </span>
    );
}

/* ── main page ── */
export default function PortalPage() {
    const [step, setStep] = useState<"contact" | "otp" | "loggedin">("contact");
    const [contact, setContact] = useState("");
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [products, setProducts] = useState<Product[]>([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [devCode, setDevCode] = useState("");

    const handleRequest = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true); setError("");
        try {
            const res = await requestOTP(contact);
            setDevCode(res.data.dev_code || "");
            setStep("otp");
        } catch { setError("تعذّر إرسال الرمز — تأكد من البيانات وأن الخادم يعمل"); }
        finally { setLoading(false); }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true); setError("");
        try {
            const res = await verifyOTP(contact, code, name || undefined);
            const token = res.data.access_token;
            localStorage.setItem("customer_token", token);
            // Use token directly to avoid interceptor race with admin_token
            const prods = await api.get("/api/customer/products", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProducts(prods.data);
            setStep("loggedin");
        } catch { setError("رمز التحقق غير صحيح أو منتهي الصلاحية"); }
        finally { setLoading(false); }
    };

    /* ── BACKGROUND WRAPPER ── */
    const Wrap = ({ children }: { children: React.ReactNode }) => (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50/30 flex items-center justify-center p-4 relative overflow-hidden">
            {/* decorative blobs */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 translate-x-1/2 translate-y-1/2 pointer-events-none" />
            <div className="relative w-full max-w-md">{children}</div>
        </div>
    );

    /* ── LOGGED IN VIEW ── */
    if (step === "loggedin") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50/30 relative overflow-hidden">
                {/* blobs */}
                <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-25 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-25 translate-x-1/2 translate-y-1/2 pointer-events-none" />

                <div className="relative max-w-2xl mx-auto px-4 py-8 space-y-6">
                    {/* Top bar */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                <ShieldCheck size={16} className="text-white" />
                            </div>
                            <span className="font-bold text-slate-700 text-sm">Smart Warranty</span>
                        </div>
                        <button
                            onClick={() => { setStep("contact"); setProducts([]); localStorage.removeItem("customer_token"); }}
                            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <LogOut size={14} /> تسجيل الخروج
                        </button>
                    </div>

                    {/* Header */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100/80">
                        <h2 className="text-xl font-bold text-slate-800">منتجاتي المسجلة</h2>
                        <p className="text-sm text-slate-400 mt-1">
                            {products.length === 0 ? "لا توجد منتجات مسجلة بعد" : `${products.length} منتج مسجل باسمك`}
                        </p>
                    </div>

                    {/* Products */}
                    {products.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Package size={28} className="text-slate-300" />
                            </div>
                            <p className="font-medium text-slate-500">لا توجد منتجات مسجلة</p>
                            <p className="text-sm text-slate-400 mt-1">ستظهر منتجاتك هنا بعد تفعيل الضمان من المتجر</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {products.map(p => {
                                const wd = getWarrantyDays(p);
                                return (
                                    <div key={p.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md hover:border-indigo-100 transition-all duration-200">
                                        {/* Card header */}
                                        <div className={`h-1.5 w-full ${p.warranty_status === "active" ? "bg-gradient-to-r from-emerald-400 to-teal-400" : p.warranty_status === "expired" ? "bg-gradient-to-r from-red-400 to-rose-400" : "bg-slate-200"}`} />

                                        <div className="p-5">
                                            <div className="flex items-start justify-between gap-3 mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                                        <Package size={18} className="text-indigo-500" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800">{p.product?.name}</p>
                                                        <p className="text-xs font-mono text-slate-400 mt-0.5 tracking-wider">{p.serial_number}</p>
                                                    </div>
                                                </div>
                                                <WarrantyBadge status={p.warranty_status} />
                                            </div>

                                            {/* Info row */}
                                            <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-4">
                                                {p.purchase_date && (
                                                    <span className="flex items-center gap-1.5">
                                                        <Calendar size={11} className="text-slate-400" />
                                                        شراء: {formatDate(p.purchase_date)}
                                                    </span>
                                                )}
                                                {wd && (
                                                    <span className="flex items-center gap-1.5">
                                                        <Calendar size={11} className="text-slate-400" />
                                                        ينتهي: {formatDate(wd.end.toISOString())}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1.5">
                                                    <ShieldCheck size={11} className="text-slate-400" />
                                                    {p.product?.warranty_months} شهر ضمان
                                                </span>
                                            </div>

                                            {/* Progress bar (active only) */}
                                            {wd && p.warranty_status === "active" && (
                                                <div className="mb-4">
                                                    <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                                                        <span>المتبقي من الضمان</span>
                                                        <span className={`font-semibold ${wd.left < 30 ? "text-red-500" : wd.left < 90 ? "text-amber-500" : "text-emerald-600"}`}>
                                                            {wd.left} يوم ({wd.pct}%)
                                                        </span>
                                                    </div>
                                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${wd.pct > 50 ? "bg-gradient-to-r from-emerald-400 to-teal-400" : wd.pct > 20 ? "bg-gradient-to-r from-amber-400 to-orange-400" : "bg-gradient-to-r from-red-400 to-rose-400"}`}
                                                            style={{ width: `${wd.pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div className="flex gap-2 flex-wrap pt-1 border-t border-slate-50">
                                                <Link href={`/scan/${p.serial_number}`}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-medium rounded-lg transition-colors">
                                                    <ShieldCheck size={12} /> فحص الضمان
                                                </Link>
                                                <Link href={`/print?serial=${p.serial_number}`} target="_blank"
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-medium rounded-lg transition-colors">
                                                    <Printer size={12} /> شهادة الضمان
                                                </Link>
                                                <Link href={`/portal/ticket/new?serial=${p.serial_number}`}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg transition-colors">
                                                    <AlertTriangle size={12} /> الإبلاغ عن عطل
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="text-center">
                        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-500 transition-colors">
                            <ArrowLeft size={12} /> العودة للرئيسية
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    /* ── LOGIN FORM ── */
    return (
        <Wrap>
            <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl shadow-indigo-100/50 border border-white/60 p-8 space-y-7">
                {/* Logo */}
                <Logo />

                {/* Step indicator */}
                <div className="flex items-center gap-2 justify-center">
                    {["contact", "otp"].map((s, i) => (
                        <div key={s} className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${s === step || (step === "otp" && s === "contact") ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-slate-100 text-slate-400"}`}>
                                {i + 1}
                            </div>
                            {i === 0 && <div className={`w-10 h-0.5 rounded-full ${step === "otp" ? "bg-indigo-300" : "bg-slate-100"}`} />}
                        </div>
                    ))}
                </div>

                {/* Contact step */}
                {step === "contact" && (
                    <form onSubmit={handleRequest} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">رقم الهاتف أو البريد الإلكتروني</label>
                            <div className="relative">
                                <Phone size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    id="contact-input"
                                    className="w-full pr-10 pl-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 focus:bg-white transition-all"
                                    placeholder="01xxxxxxxxx أو email@example.com"
                                    required
                                    value={contact}
                                    onChange={e => setContact(e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                الاسم <span className="font-normal text-slate-400">(للمستخدمين الجدد)</span>
                            </label>
                            <input
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 focus:bg-white transition-all"
                                placeholder="اسمك الكريم"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>

                        {error && (
                            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                                <XCircle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
                                <p className="text-red-600 text-sm">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 text-sm"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    جاري الإرسال...
                                </span>
                            ) : "إرسال رمز التحقق →"}
                        </button>

                        <Link href="/" className="flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-indigo-500 transition-colors">
                            <ChevronLeft size={13} /> العودة للرئيسية
                        </Link>
                    </form>
                )}

                {/* OTP step */}
                {step === "otp" && (
                    <form onSubmit={handleVerify} className="space-y-4">
                        <div className="text-center p-4 bg-slate-50 rounded-2xl">
                            <p className="text-xs text-slate-400 mb-1">تم إرسال الرمز إلى</p>
                            <p className="font-semibold text-slate-700 text-sm">{contact}</p>
                        </div>

                        {devCode && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                                <p className="text-xs text-emerald-600 mb-2 flex items-center justify-center gap-1">
                                    🔧 الرمز (وضع التطوير)
                                </p>
                                <p className="text-4xl font-bold font-mono tracking-[0.4em] text-emerald-700">{devCode}</p>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">رمز التحقق</label>
                            <input
                                id="otp-input"
                                className="w-full px-4 py-4 rounded-xl border border-slate-200 bg-slate-50 text-center text-3xl tracking-[0.6em] font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 focus:bg-white transition-all"
                                maxLength={6}
                                value={code}
                                onChange={e => setCode(e.target.value)}
                                required
                                autoFocus
                                inputMode="numeric"
                            />
                        </div>

                        {error && (
                            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                                <XCircle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
                                <p className="text-red-600 text-sm">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    جاري التحقق...
                                </span>
                            ) : "تأكيد الدخول ✓"}
                        </button>

                        <button type="button"
                            onClick={() => { setStep("contact"); setError(""); setCode(""); }}
                            className="w-full py-2.5 border border-slate-200 text-slate-500 text-sm rounded-xl hover:bg-slate-50 transition-colors">
                            ← تغيير رقم الهاتف
                        </button>
                    </form>
                )}
            </div>

            {/* Feature pills */}
            <div className="flex justify-center gap-3 mt-5 flex-wrap">
                {["فحص فوري للضمان", "سجل الصيانة", "شهادة رسمية"].map(f => (
                    <div key={f} className="bg-white/70 backdrop-blur-sm border border-white/60 text-slate-500 text-xs px-3 py-1.5 rounded-full shadow-sm">
                        ✦ {f}
                    </div>
                ))}
            </div>
        </Wrap>
    );
}
