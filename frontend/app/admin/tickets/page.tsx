"use client";
import { useEffect, useState, useCallback } from "react";
import { getTickets, updateTicketStatus, deleteTicket } from "@/lib/api";
import { Clock, CheckCircle, AlertCircle, RefreshCw, Trash2, Ticket } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

interface TicketItem {
    id: number; title: string; description: string; status: string;
    created_at: string;
    serial: { serial_number: string; product: { name: string } } | null;
    user: { name: string; phone: string } | null;
}

const STATUS_OPTIONS = ["open", "in_progress", "resolved", "closed"];
const STATUS_LABEL: Record<string, string> = { open: "مفتوحة", in_progress: "قيد المعالجة", resolved: "محلولة", closed: "مغلقة" };
const STATUS_BADGE: Record<string, string> = { open: "badge-expired", in_progress: "badge-void", resolved: "badge-active", closed: "badge-inactive" };

export default function TicketsPage() {
    const toast = useToast();
    const [tickets, setTickets] = useState<TicketItem[]>([]);
    const [filter, setFilter] = useState("");
    const [expanded, setExpanded] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(() => {
        setLoading(true);
        getTickets(filter || undefined)
            .then(r => setTickets(r.data))
            .catch(() => toast.error("تعذر تحميل التذاكر"))
            .finally(() => setLoading(false));
    }, [filter, toast]);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load(); }, [load]);

    const changeStatus = async (id: number, status: string) => {
        await updateTicketStatus(id, status);
        toast.success("تم تحديث الحالة ✅");
        load();
    };

    const handleDelete = async (id: number, title: string) => {
        if (!confirm(`حذف التذكرة "${title}"؟`)) return;
        try {
            await deleteTicket(id);
            toast.success("تم حذف التذكرة");
            setTickets(prev => prev.filter(t => t.id !== id));
        } catch { toast.error("فشل حذف التذكرة"); }
    };

    const counts = {
        open: tickets.filter(t => t.status === "open").length,
        in_progress: tickets.filter(t => t.status === "in_progress").length,
        resolved: tickets.filter(t => t.status === "resolved").length,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">تذاكر الدعم الفني</h1>
                    <p className="text-sm text-slate-500 mt-0.5">{tickets.length} تذكرة إجمالاً</p>
                </div>
                <div className="flex gap-2">
                    <select className="input w-auto text-sm" value={filter} onChange={e => setFilter(e.target.value)}>
                        <option value="">جميع الحالات</option>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                    <button className="btn btn-ghost btn-sm" onClick={load} title="تحديث">
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "مفتوحة", value: counts.open, color: "text-red-500", bg: "bg-red-50", icon: AlertCircle },
                    { label: "قيد المعالجة", value: counts.in_progress, color: "text-amber-500", bg: "bg-amber-50", icon: Clock },
                    { label: "محلولة", value: counts.resolved, color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle },
                ].map(({ label, value, color, bg, icon: Icon }) => (
                    <div key={label} className="stat-card">
                        <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                            <Icon size={17} className={color} />
                        </div>
                        <p className="text-2xl font-bold text-slate-800">{value}</p>
                        <p className="text-xs text-slate-500 mt-1">{label}</p>
                    </div>
                ))}
            </div>

            {/* Ticket List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center py-16">
                        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                        <Ticket size={40} className="mb-3" />
                        <p className="text-slate-400 text-sm">لا توجد تذاكر</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {tickets.map(t => (
                            <div key={t.id}>
                                <button
                                    className="w-full text-right px-5 py-4 flex items-start gap-4 hover:bg-slate-50 transition-colors"
                                    onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                                >
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${t.status === "open" ? "bg-red-50" : t.status === "resolved" ? "bg-emerald-50" : "bg-slate-50"
                                        }`}>
                                        {t.status === "open"
                                            ? <AlertCircle size={17} className="text-red-500" />
                                            : t.status === "resolved"
                                                ? <CheckCircle size={17} className="text-emerald-500" />
                                                : <Clock size={17} className="text-slate-400" />}
                                    </div>
                                    <div className="flex-1 min-w-0 text-right">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-sm text-slate-800">#{t.id} {t.title}</span>
                                            <span className={`badge ${STATUS_BADGE[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {t.serial?.product?.name && <span>{t.serial.product.name} · </span>}
                                            {t.user?.name || "عميل غير مسجل"} · {new Date(t.created_at).toLocaleDateString("ar-EG")}
                                        </p>
                                    </div>
                                    <button
                                        onClick={e => { e.stopPropagation(); handleDelete(t.id, t.title); }}
                                        className="text-slate-300 hover:text-red-500 transition-colors p-1 flex-shrink-0"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </button>

                                {expanded === t.id && (
                                    <div className="bg-slate-50 border-t border-slate-100 px-5 py-4 space-y-3">
                                        {t.description && (
                                            <p className="text-sm text-slate-600 bg-white rounded-xl p-3 border border-slate-100">{t.description}</p>
                                        )}
                                        {t.user?.phone && (
                                            <p className="text-sm text-slate-500">📞 {t.user.phone}</p>
                                        )}
                                        {t.serial?.serial_number && (
                                            <p className="text-sm text-slate-500 font-mono">#{t.serial.serial_number}</p>
                                        )}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-medium text-slate-500">تغيير الحالة:</span>
                                            {STATUS_OPTIONS.map(s => (
                                                <button
                                                    key={s}
                                                    onClick={() => changeStatus(t.id, s)}
                                                    className={`btn btn-sm ${t.status === s ? "btn-primary" : "btn-ghost"}`}
                                                >
                                                    {STATUS_LABEL[s]}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
