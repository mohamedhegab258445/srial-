"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "../../../lib/api";
import { AlertTriangle, Hash, User, Phone, Mail, FileText, ChevronRight, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { AxiosError } from "axios";

function TicketForm() {
    const params = useSearchParams();
    const serialFromUrl = params.get("serial") || "";

    const [form, setForm] = useState({
        serial_number: serialFromUrl,
        customer_name: "",
        customer_phone: "",
        customer_email: "",
        title: "",
        description: "",
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (serialFromUrl) setForm(f => ({ ...f, serial_number: serialFromUrl }));
    }, [serialFromUrl]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await api.post("/api/tickets/", form);
            setSuccess(true);
        } catch (err) {
            const e = err as AxiosError<{ detail: string }>;
            setError(e?.response?.data?.detail || "حدث خطأ أثناء إرسال البلاغ، تحقق من الرقم التسلسلي");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-10 max-w-md w-full text-center space-y-5">
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 size={36} className="text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">تم إرسال البلاغ!</h2>
                    <p className="text-slate-500 text-sm">سيتواصل معك فريق الدعم في أقرب وقت.</p>
                    <div className="flex flex-col gap-2 pt-4">
                        <Link href="/" className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-sm text-center hover:opacity-90 transition">
                            العودة للرئيسية
                        </Link>
                        <button
                            onClick={() => { setSuccess(false); setForm({ serial_number: serialFromUrl, customer_name: "", customer_phone: "", customer_email: "", title: "", description: "" }); }}
                            className="w-full py-3 border border-slate-200 text-slate-500 rounded-xl text-sm hover:bg-slate-50 transition"
                        >
                            إرسال بلاغ آخر
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 py-10 px-4">
            <div className="max-w-lg mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-md shadow-red-100">
                        <AlertTriangle size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">الإبلاغ عن عطل</h1>
                        <p className="text-xs text-slate-400">أرسل بلاغ صيانة لفريق الدعم</p>
                    </div>
                    <Link href="/" className="mr-auto flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-500 transition">
                        <ShieldCheck size={12} /> الرئيسية
                    </Link>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-lg border border-slate-100 p-7 space-y-5">
                    {/* Serial */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                            <Hash size={14} className="text-indigo-400" /> الرقم التسلسلي
                        </label>
                        <input
                            name="serial_number"
                            value={form.serial_number}
                            onChange={handleChange}
                            required
                            placeholder="SRL-XXXXXXXX"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:bg-white transition font-mono uppercase"
                        />
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                            <User size={14} className="text-indigo-400" /> الاسم
                        </label>
                        <input
                            name="customer_name"
                            value={form.customer_name}
                            onChange={handleChange}
                            required
                            placeholder="أدخل اسمك"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:bg-white transition"
                        />
                    </div>

                    {/* Phone + Email */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                                <Phone size={14} className="text-indigo-400" /> الهاتف
                            </label>
                            <input
                                name="customer_phone"
                                value={form.customer_phone}
                                onChange={handleChange}
                                placeholder="01xxxxxxxxx"
                                inputMode="tel"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:bg-white transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                                <Mail size={14} className="text-indigo-400" /> الإيميل
                            </label>
                            <input
                                name="customer_email"
                                value={form.customer_email}
                                onChange={handleChange}
                                type="email"
                                placeholder="example@mail.com"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:bg-white transition"
                            />
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                            <FileText size={14} className="text-indigo-400" /> عنوان البلاغ
                        </label>
                        <input
                            name="title"
                            value={form.title}
                            onChange={handleChange}
                            required
                            placeholder="مثال: المنتج لا يعمل بعد الشراء"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:bg-white transition"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">تفاصيل المشكلة</label>
                        <textarea
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            required
                            rows={4}
                            placeholder="اشرح المشكلة بالتفصيل..."
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:bg-white transition resize-none"
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                            <XCircle size={15} className="text-red-500 flex-shrink-0" />
                            <p className="text-red-600 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-semibold rounded-xl shadow-lg shadow-red-100 transition-all hover:-translate-y-0.5 disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                جاري الإرسال...
                            </>
                        ) : (
                            <>
                                إرسال البلاغ <ChevronRight size={16} />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function TicketNewPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>}>
            <TicketForm />
        </Suspense>
    );
}
