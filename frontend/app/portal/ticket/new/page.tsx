"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createTicket } from "@/lib/api";
import { AlertTriangle, ArrowLeft, Send } from "lucide-react";
import Link from "next/link";

function TicketForm() {
    const params = useSearchParams();
    const router = useRouter();
    const prefill = params.get("serial") || "";

    const [form, setForm] = useState({
        serial_number: prefill,
        title: "",
        description: "",
        customer_name: "",
        customer_phone: "",
        customer_email: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true); setError("");
        try {
            await createTicket(form);
            setSuccess(true);
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { detail?: string } } };
            setError(axiosErr.response?.data?.detail || "حدث خطأ، حاول مرة أخرى");
        } finally { setLoading(false); }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-scan-gradient flex items-center justify-center px-4">
                <div className="glass p-10 text-center max-w-sm w-full">
                    <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Send size={28} className="text-emerald-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">تم إرسال التذكرة!</h2>
                    <p className="text-slate-500 mb-6">سيتواصل معك فريق الدعم قريباً.</p>
                    <div className="flex gap-3">
                        <Link href="/" className="btn btn-ghost flex-1">الرئيسية</Link>
                        <Link href={`/scan/${form.serial_number}`} className="btn btn-primary flex-1">عرض الضمان</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-scan-gradient py-8 px-4">
            <div className="max-w-lg mx-auto space-y-4">
                <Link href={prefill ? `/scan/${prefill}` : "/"} className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm">
                    <ArrowLeft size={15} /> رجوع
                </Link>

                <div className="glass p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-11 h-11 bg-red-100 rounded-xl flex items-center justify-center">
                            <AlertTriangle size={22} className="text-red-500" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">الإبلاغ عن عطل</h1>
                            <p className="text-slate-500 text-sm">سيصل بلاغك مباشرةً للفريق الفني</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">الرقم التسلسلي *</label>
                            <input id="ticket-serial" className="input font-mono tracking-widest" required value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value.toUpperCase() })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">عنوان العطل *</label>
                            <input id="ticket-title" className="input" required placeholder="مثال: الجهاز لا يعمل" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">وصف المشكلة</label>
                            <textarea className="input" rows={4} placeholder="اشرح المشكلة بالتفصيل..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">اسمك</label>
                                <input className="input" value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">رقم الهاتف</label>
                                <input className="input" value={form.customer_phone} onChange={e => setForm({ ...form, customer_phone: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">البريد الإلكتروني</label>
                            <input type="email" className="input" value={form.customer_email} onChange={e => setForm({ ...form, customer_email: e.target.value })} />
                        </div>
                        {error && <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-2">{error}</p>}
                        <button type="submit" disabled={loading} className="btn btn-danger w-full py-3">
                            {loading ? "جاري الإرسال..." : (
                                <><Send size={16} /> إرسال البلاغ</>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function NewTicketPage() {
    return (
        <Suspense>
            <TicketForm />
        </Suspense>
    );
}
