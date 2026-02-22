"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import { exportToCSV } from "@/lib/utils";
import {
    Users, Plus, X, Download, MapPin, Phone, Mail,
    Trash2, Edit2, Hash, ChevronDown, ChevronUp, Check
} from "lucide-react";
import { AxiosError } from "axios";

interface Dealer {
    id: number; code: string; name: string; phone: string;
    email: string; region: string; serial_count: number;
}
interface DealerDetail extends Dealer {
    serials: { id: number; serial_number: string; warranty_status: string; assigned_at: string }[];
}

const statusColors: Record<string, string> = { active: "badge-active", expired: "badge-expired", inactive: "badge-inactive" };
const statusLabels: Record<string, string> = { active: "نشط", expired: "منتهي", inactive: "غير مفعل" };

export default function DealersPage() {
    const toast = useToast();
    const [dealers, setDealers] = useState<Dealer[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ name: "", phone: "", email: "", region: "" });
    const [loading, setLoading] = useState(false);

    /* detail panel */
    const [selected, setSelected] = useState<DealerDetail | null>(null);
    const [assignSerial, setAssignSerial] = useState("");
    const [assigning, setAssigning] = useState(false);

    /* edit */
    const [editId, setEditId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", region: "" });

    const load = () =>
        api.get("/api/dealers").then(r => setDealers(r.data)).catch(() => toast.error("تعذر تحميل الوكلاء"));

    useEffect(() => { load(); }, []);

    const openDetail = async (id: number) => {
        try {
            const r = await api.get(`/api/dealers/${id}`);
            setSelected(r.data);
        } catch { toast.error("تعذر تحميل بيانات الوكيل"); }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true);
        try {
            await api.post("/api/dealers", form);
            toast.success("تم إضافة الوكيل ✅");
            setShowCreate(false);
            setForm({ name: "", phone: "", email: "", region: "" });
            load();
        } catch { toast.error("فشل إضافة الوكيل"); }
        finally { setLoading(false); }
    };

    const handleDelete = async (d: Dealer) => {
        if (!confirm(`حذف الوكيل "${d.name}"؟`)) return;
        try {
            await api.delete(`/api/dealers/${d.id}`);
            toast.success("تم الحذف");
            setDealers(prev => prev.filter(x => x.id !== d.id));
            if (selected?.id === d.id) setSelected(null);
        } catch (err) {
            const error = err as AxiosError<{ detail: string }>;
            toast.error(error?.response?.data?.detail || "فشل الحذف");
        }
    };

    const startEdit = (d: Dealer) => {
        setEditId(d.id);
        setEditForm({ name: d.name, phone: d.phone || "", email: d.email || "", region: d.region || "" });
    };

    const saveEdit = async (id: number) => {
        try {
            await api.put(`/api/dealers/${id}`, editForm);
            toast.success("تم التحديث ✅");
            setEditId(null);
            load();
            if (selected?.id === id) openDetail(id);
        } catch { toast.error("فشل التحديث"); }
    };

    const handleAssign = async () => {
        if (!selected || !assignSerial.trim()) return;
        setAssigning(true);
        try {
            await api.post(`/api/dealers/${selected.id}/assign-serial`, { serial_number: assignSerial.trim().toUpperCase() });
            toast.success("تم إسناد السيريال ✅");
            setAssignSerial("");
            openDetail(selected.id);
            load();
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || "فشل الإسناد");
        } finally { setAssigning(false); }
    };

    const handleRemoveSerial = async (serial_number: string) => {
        if (!selected) return;
        if (!confirm(`إزالة السيريال ${serial_number} من الوكيل؟`)) return;
        try {
            await api.delete(`/api/dealers/${selected.id}/remove-serial/${serial_number}`);
            toast.success("تم الإزالة");
            openDetail(selected.id);
            load();
        } catch { toast.error("فشل الإزالة"); }
    };

    const handleExport = () => {
        exportToCSV("dealers", ["الكود", "الاسم", "الهاتف", "المنطقة", "السيريالات"],
            dealers.map(d => [d.code, d.name, d.phone, d.region, d.serial_count])
        );
        toast.success("تم تصدير قائمة الوكلاء ✅");
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">الوكلاء والموزعون</h1>
                    <p className="text-sm text-slate-500 mt-0.5">{dealers.length} وكيل مسجل</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-ghost btn-sm" onClick={handleExport}><Download size={14} /> تصدير</button>
                    <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> وكيل جديد</button>
                </div>
            </div>

            <div className="flex gap-5">
                {/* Dealers grid */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 content-start">
                    {dealers.length === 0 && (
                        <div className="col-span-3 bg-white rounded-2xl p-10 text-center text-slate-400 border border-slate-100">
                            لا يوجد وكلاء مضافون بعد
                        </div>
                    )}
                    {dealers.map(d => (
                        <div key={d.id} className={`bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all cursor-pointer
                            ${selected?.id === d.id ? "border-indigo-400 ring-2 ring-indigo-100" : "border-slate-100"}`}
                            onClick={() => openDetail(d.id)}>
                            {editId === d.id ? (
                                <div onClick={e => e.stopPropagation()} className="space-y-2">
                                    <input className="input text-sm py-1.5" placeholder="الاسم" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                                    <input className="input text-sm py-1.5" placeholder="الهاتف" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                                    <input className="input text-sm py-1.5" placeholder="الإيميل" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                                    <input className="input text-sm py-1.5" placeholder="المنطقة" value={editForm.region} onChange={e => setEditForm({ ...editForm, region: e.target.value })} />
                                    <div className="flex gap-2 pt-1">
                                        <button onClick={() => saveEdit(d.id)} className="btn btn-primary btn-sm flex-1"><Check size={13} /> حفظ</button>
                                        <button onClick={() => setEditId(null)} className="btn btn-ghost btn-sm flex-1"><X size={13} /> إلغاء</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                                            <Users size={18} className="text-indigo-600" />
                                        </div>
                                        <span className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{d.code}</span>
                                    </div>
                                    <h3 className="font-semibold text-slate-800 mb-1">{d.name}</h3>
                                    <div className="space-y-1 text-sm text-slate-500">
                                        {d.phone && <p className="flex items-center gap-1.5"><Phone size={12} /> {d.phone}</p>}
                                        {d.region && <p className="flex items-center gap-1.5"><MapPin size={12} /> {d.region}</p>}
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                                        <span className="text-xs text-slate-400">السيريالات المُسندة</span>
                                        <span className="font-bold text-indigo-600">{d.serial_count}</span>
                                    </div>
                                    <div className="flex gap-1 mt-3" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => startEdit(d)} className="btn btn-ghost btn-sm flex-1"><Edit2 size={12} /> تعديل</button>
                                        <button onClick={() => handleDelete(d)} className="btn btn-sm flex-1 text-red-500 border border-red-200 hover:bg-red-50"><Trash2 size={12} /> حذف</button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>

                {/* Detail panel */}
                {selected && (
                    <div className="w-80 bg-white rounded-2xl border border-slate-100 shadow-sm flex-shrink-0 flex flex-col">
                        <div className="flex items-center justify-between p-5 border-b border-slate-50">
                            <div>
                                <p className="font-bold text-slate-800">{selected.name}</p>
                                <p className="text-xs font-mono text-indigo-500">{selected.code}</p>
                            </div>
                            <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                        </div>

                        <div className="p-4 space-y-1 text-sm text-slate-600 border-b border-slate-50">
                            {selected.phone && <p className="flex items-center gap-1.5"><Phone size={12} /> {selected.phone}</p>}
                            {selected.email && <p className="flex items-center gap-1.5"><Mail size={12} /> {selected.email}</p>}
                            {selected.region && <p className="flex items-center gap-1.5"><MapPin size={12} /> {selected.region}</p>}
                        </div>

                        {/* Assign serial */}
                        <div className="p-4 border-b border-slate-50">
                            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase">إسناد سيريال</p>
                            <div className="flex gap-2">
                                <input
                                    className="input text-sm py-1.5 flex-1 font-mono uppercase"
                                    placeholder="SRL-XXXXX"
                                    value={assignSerial}
                                    onChange={e => setAssignSerial(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && handleAssign()}
                                />
                                <button className="btn btn-primary btn-sm px-3" onClick={handleAssign} disabled={assigning}>
                                    {assigning ? "..." : <Hash size={14} />}
                                </button>
                            </div>
                        </div>

                        {/* Serial list */}
                        <div className="flex-1 overflow-y-auto p-4">
                            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase">
                                السيريالات ({selected.serials?.length || 0})
                            </p>
                            {(selected.serials?.length || 0) === 0 ? (
                                <p className="text-xs text-slate-300 text-center py-6">لا يوجد سيريالات مُسندة بعد</p>
                            ) : (
                                <div className="space-y-2">
                                    {selected.serials.map(s => (
                                        <div key={s.serial_number} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl">
                                            <div>
                                                <p className="font-mono text-xs text-slate-700">{s.serial_number}</p>
                                                <span className={`badge ${statusColors[s.warranty_status]} mt-0.5`} style={{ fontSize: "10px" }}>
                                                    {statusLabels[s.warranty_status]}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveSerial(s.serial_number)}
                                                className="text-red-400 hover:text-red-600 p-1"
                                                title="إزالة"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Create modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                        <div className="flex justify-between mb-5">
                            <h3 className="font-bold text-slate-800">إضافة وكيل جديد</h3>
                            <button onClick={() => setShowCreate(false)}><X size={18} className="text-slate-400" /></button>
                        </div>
                        <form onSubmit={handleCreate} className="space-y-4">
                            {(["name", "phone", "email", "region"] as const).map(field => (
                                <div key={field}>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">
                                        {{ name: "الاسم *", phone: "الهاتف", email: "البريد الإلكتروني", region: "المنطقة" }[field]}
                                    </label>
                                    <input
                                        type={field === "email" ? "email" : "text"}
                                        className="input"
                                        required={field === "name"}
                                        value={form[field]}
                                        onChange={e => setForm({ ...form, [field]: e.target.value })}
                                    />
                                </div>
                            ))}
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => setShowCreate(false)} className="btn btn-ghost flex-1">إلغاء</button>
                                <button type="submit" disabled={loading} className="btn btn-primary flex-1">
                                    {loading ? "جاري الحفظ..." : "إضافة وكيل"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
