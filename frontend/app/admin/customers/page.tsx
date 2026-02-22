"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import { exportToCSV } from "@/lib/utils";
import { Users, Search, Download, ShieldCheck, Ticket, ChevronDown, ChevronUp, Trash2, Edit2, X, Check } from "lucide-react";

interface Customer {
    id: number; name: string; phone: string; email: string;
    created_at: string; serials_count: number; active_warranties: number; tickets_count: number;
}
interface Detail {
    serials: { serial_number: string; warranty_status: string; purchase_date: string }[];
    tickets: { id: number; title: string; status: string }[];
}

const sColors: Record<string, string> = { active: "badge-active", expired: "badge-expired", inactive: "badge-inactive" };
const sLabels: Record<string, string> = { active: "نشط", expired: "منتهي", inactive: "غير مفعل" };

export default function CustomersPage() {
    const toast = useToast();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [expanded, setExpanded] = useState<number | null>(null);
    const [details, setDetails] = useState<Record<number, Detail>>({});
    const [editing, setEditing] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({ name: "", phone: "", email: "" });

    const load = (q = search) => {
        setLoading(true);
        api.get("/api/admin/customers", { params: { search: q || undefined } })
            .then(r => setCustomers(r.data))
            .catch(() => toast.error("تعذر تحميل العملاء"))
            .finally(() => setLoading(false));
    };
    useEffect(() => { load(); }, []);

    const toggleExpand = async (id: number) => {
        if (expanded === id) { setExpanded(null); return; }
        setExpanded(id);
        if (!details[id]) {
            try {
                const r = await api.get(`/api/admin/customers/${id}`);
                setDetails(d => ({ ...d, [id]: r.data }));
            } catch { toast.error("تعذر تحميل بيانات العميل"); }
        }
    };

    const saveEdit = async (id: number) => {
        try {
            await api.put(`/api/admin/customers/${id}`, editForm);
            toast.success("تم التحديث ✅");
            setEditing(null);
            load();
        } catch { toast.error("فشل التحديث"); }
    };

    const deleteCustomer = async (id: number, name: string) => {
        if (!confirm(`حذف العميل "${name}"؟`)) return;
        try {
            await api.delete(`/api/admin/customers/${id}`);
            toast.success("تم حذف العميل");
            setCustomers(c => c.filter(x => x.id !== id));
        } catch { toast.error("فشل الحذف"); }
    };

    const stats = [
        { label: "إجمالي العملاء", value: customers.length, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
        { label: "لديهم ضمان نشط", value: customers.filter(c => c.active_warranties > 0).length, icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
        { label: "لديهم تذاكر", value: customers.filter(c => c.tickets_count > 0).length, icon: Ticket, color: "text-orange-500", bg: "bg-orange-50" },
        { label: "بدون منتجات", value: customers.filter(c => c.serials_count === 0).length, icon: Users, color: "text-slate-500", bg: "bg-slate-100" },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">قاعدة العملاء</h1>
                    <p className="text-sm text-slate-500 mt-0.5">{customers.length} عميل مسجل</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <form onSubmit={e => { e.preventDefault(); load(); }} className="flex gap-2">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input className="input pl-8 w-48 text-sm" placeholder="اسم أو هاتف..."
                                value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <button type="submit" className="btn btn-primary btn-sm">بحث</button>
                    </form>
                    <button className="btn btn-ghost btn-sm" onClick={() => exportToCSV("customers",
                        ["الاسم", "الهاتف", "الإيميل", "السيريالات", "ضمانات نشطة", "التذاكر"],
                        customers.map(c => [c.name, c.phone, c.email, c.serials_count, c.active_warranties, c.tickets_count]))}>
                        <Download size={14} /> تصدير
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {stats.map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="stat-card">
                        <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                            <Icon size={17} className={color} />
                        </div>
                        <p className="text-2xl font-bold text-slate-800">{value}</p>
                        <p className="text-xs text-slate-500 mt-1">{label}</p>
                    </div>
                ))}
            </div>

            {/* Customer List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
                    </div>
                ) : customers.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-slate-300">
                        <Users size={40} className="mb-3" />
                        <p className="text-slate-400 text-sm">لا يوجد عملاء مسجلون</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {customers.map(c => (
                            <div key={c.id}>
                                <div className="px-5 py-4 hover:bg-slate-50 transition-colors">
                                    {editing === c.id ? (
                                        <div className="flex flex-wrap gap-2 items-center">
                                            <input className="input flex-1 min-w-[120px] text-sm py-1.5" placeholder="الاسم"
                                                value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                                            <input className="input flex-1 min-w-[120px] text-sm py-1.5" placeholder="الهاتف"
                                                value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                                            <input className="input flex-1 min-w-[160px] text-sm py-1.5" placeholder="الإيميل"
                                                value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                                            <button onClick={() => saveEdit(c.id)} className="btn btn-primary btn-sm"><Check size={13} /></button>
                                            <button onClick={() => setEditing(null)} className="btn btn-ghost btn-sm"><X size={13} /></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center flex-shrink-0">
                                                <span className="text-indigo-600 font-bold text-sm">{c.name[0]}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-sm text-slate-800">{c.name}</p>
                                                <p className="text-xs text-slate-400">{c.phone || c.email || "—"}</p>
                                            </div>
                                            <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
                                                <span className="flex items-center gap-1"><ShieldCheck size={12} className="text-emerald-500" />{c.active_warranties}/{c.serials_count}</span>
                                                <span className="flex items-center gap-1"><Ticket size={12} className="text-orange-400" />{c.tickets_count}</span>
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => { setEditing(c.id); setEditForm({ name: c.name, phone: c.phone || "", email: c.email || "" }); }}
                                                    className="btn btn-ghost btn-sm" title="تعديل"><Edit2 size={13} /></button>
                                                <button onClick={() => toggleExpand(c.id)} className="btn btn-ghost btn-sm">
                                                    {expanded === c.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                                </button>
                                                <button onClick={() => deleteCustomer(c.id, c.name)}
                                                    className="btn btn-ghost btn-sm text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {expanded === c.id && details[c.id] && (
                                    <div className="bg-slate-50 border-t border-slate-100 px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs font-semibold text-slate-400 uppercase mb-2">السيريالات ({details[c.id].serials.length})</p>
                                            <div className="space-y-1">
                                                {details[c.id].serials.length === 0 ? <p className="text-xs text-slate-400">لا يوجد</p> :
                                                    details[c.id].serials.map(s => (
                                                        <a key={s.serial_number} href={`/scan/${s.serial_number}`} target="_blank"
                                                            className="flex items-center justify-between p-2 bg-white rounded-lg hover:bg-indigo-50 transition-colors">
                                                            <span className="font-mono text-xs text-slate-600">{s.serial_number}</span>
                                                            <span className={`badge ${sColors[s.warranty_status]}`}>{sLabels[s.warranty_status]}</span>
                                                        </a>
                                                    ))}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-slate-400 uppercase mb-2">التذاكر ({details[c.id].tickets.length})</p>
                                            <div className="space-y-1">
                                                {details[c.id].tickets.length === 0 ? <p className="text-xs text-slate-400">لا يوجد</p> :
                                                    details[c.id].tickets.map(t => (
                                                        <div key={t.id} className="flex items-center justify-between p-2 bg-white rounded-lg">
                                                            <span className="text-xs text-slate-600 truncate">{t.title}</span>
                                                            <span className={`badge ${sColors[t.status] || "badge-inactive"}`}>{t.status}</span>
                                                        </div>
                                                    ))}
                                            </div>
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
