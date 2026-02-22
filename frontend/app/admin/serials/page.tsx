"use client";
import { useEffect, useState } from "react";
import { getProducts, listSerials, generateSerials, activateWarranty } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import { exportToCSV } from "@/lib/utils";
import { Plus, QrCode, CheckCircle, X, Search, Download, ChevronLeft, ChevronRight, Hash } from "lucide-react";

interface Serial { id: number; serial_number: string; warranty_status: string; product: { name: string }; user: { name: string } | null; purchase_date: string }
interface Product { id: number; name: string }

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const PAGE_SIZE = 15;
const sColors: Record<string, string> = { active: "badge-active", expired: "badge-expired", inactive: "badge-inactive", void: "badge-void" };
const sLabels: Record<string, string> = { active: "نشط", expired: "منتهي", inactive: "غير مفعل", void: "ملغي" };

export default function SerialsPage() {
    const toast = useToast();
    const [serials, setSerials] = useState<Serial[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [genModal, setGenModal] = useState(false);
    const [activateModal, setActivateModal] = useState<string | null>(null);
    const [genForm, setGenForm] = useState({ product_id: 0, count: 1 });
    const [actForm, setActForm] = useState({ customer_name: "", customer_phone: "", customer_email: "", purchase_date: "" });
    const [statusFilter, setStatusFilter] = useState("");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);

    const load = () => listSerials({ status: statusFilter || undefined }).then(r => setSerials(r.data)).catch(() => toast.error("تعذر تحميل السيريالات"));
    useEffect(() => { getProducts().then(r => setProducts(r.data)); load(); }, [statusFilter]);

    const filtered = serials.filter(s => !search || s.serial_number.includes(search.toUpperCase()) || s.user?.name?.includes(search) || s.product?.name?.includes(search));
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true);
        try { const r = await generateSerials(genForm); setGenModal(false); toast.success(`تم توليد ${r.data.count} سيريال ✅`); load(); }
        catch { toast.error("فشل توليد السيريالات"); }
        finally { setLoading(false); }
    };

    const handleActivate = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true);
        try { await activateWarranty(activateModal!, actForm); setActivateModal(null); setActForm({ customer_name: "", customer_phone: "", customer_email: "", purchase_date: "" }); toast.success("تم تفعيل الضمان ✅"); load(); }
        catch { toast.error("فشل تفعيل الضمان"); }
        finally { setLoading(false); }
    };

    const counts = {
        active: serials.filter(s => s.warranty_status === "active").length,
        expired: serials.filter(s => s.warranty_status === "expired").length,
        inactive: serials.filter(s => s.warranty_status === "inactive").length,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">السيريالات</h1>
                    <p className="text-sm text-slate-500 mt-0.5">{filtered.length} وحدة</p>
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input className="input pl-8 w-44 text-sm" placeholder="بحث..." value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }} />
                    </div>
                    <select className="input w-auto text-sm" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                        <option value="">جميع الحالات</option>
                        <option value="active">نشطة</option>
                        <option value="inactive">غير مفعلة</option>
                        <option value="expired">منتهية</option>
                    </select>
                    <button className="btn btn-ghost btn-sm" onClick={() => exportToCSV("serials", ["الرقم التسلسلي", "المنتج", "الحالة", "العميل", "تاريخ الشراء"],
                        filtered.map(s => [s.serial_number, s.product?.name, sLabels[s.warranty_status], s.user?.name || "", s.purchase_date || ""]))}>
                        <Download size={14} /> CSV
                    </button>
                    <button className="btn btn-primary" onClick={() => setGenModal(true)}>
                        <Plus size={16} /> توليد
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "نشطة", value: counts.active, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "منتهية", value: counts.expired, color: "text-red-500", bg: "bg-red-50" },
                    { label: "غير مفعلة", value: counts.inactive, color: "text-slate-500", bg: "bg-slate-100" },
                ].map(({ label, value, color, bg }) => (
                    <div key={label} className="stat-card">
                        <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                            <Hash size={17} className={color} />
                        </div>
                        <p className="text-2xl font-bold text-slate-800">{value}</p>
                        <p className="text-xs text-slate-500 mt-1">{label}</p>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                <table className="table min-w-[680px]">
                    <thead>
                        <tr>
                            <th>الرقم التسلسلي</th>
                            <th>المنتج</th>
                            <th>الحالة</th>
                            <th>العميل</th>
                            <th>تاريخ الشراء</th>
                            <th>إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.length === 0 && (
                            <tr><td colSpan={6} className="text-center text-slate-400 py-10 text-sm">لا توجد نتائج</td></tr>
                        )}
                        {paginated.map(s => (
                            <tr key={s.id}>
                                <td className="font-mono text-sm text-slate-700">{s.serial_number}</td>
                                <td className="text-sm text-slate-600">{s.product?.name || "—"}</td>
                                <td><span className={`badge ${sColors[s.warranty_status]}`}>{sLabels[s.warranty_status]}</span></td>
                                <td className="text-sm text-slate-600">{s.user?.name || "—"}</td>
                                <td className="text-sm text-slate-500">{s.purchase_date || "—"}</td>
                                <td>
                                    <div className="flex gap-1">
                                        <a href={`${API_URL}/api/serials/${s.serial_number}/qr`} target="_blank" className="btn btn-ghost btn-sm" title="QR">
                                            <QrCode size={13} />
                                        </a>
                                        {s.warranty_status === "inactive" && (
                                            <button className="btn btn-primary btn-sm" onClick={() => setActivateModal(s.serial_number)}>
                                                <CheckCircle size={13} /> تفعيل
                                            </button>
                                        )}
                                        <a href={`/check/${s.serial_number}`} target="_blank" className="btn btn-ghost btn-sm" title="فحص">
                                            <Search size={13} />
                                        </a>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1.5">
                    <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronRight size={16} /></button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <button key={p} className={`btn btn-sm ${p === page ? "btn-primary" : "btn-ghost"}`} onClick={() => setPage(p)}>{p}</button>
                    ))}
                    <button className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronLeft size={16} /></button>
                </div>
            )}

            {/* Generate Modal */}
            {genModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="font-bold text-slate-800">توليد سيريالات</h3>
                            <button onClick={() => setGenModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleGenerate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">المنتج *</label>
                                <select className="input" required value={genForm.product_id} onChange={e => setGenForm({ ...genForm, product_id: +e.target.value })}>
                                    <option value={0}>اختر منتجاً</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">العدد (حتى 500)</label>
                                <input type="number" className="input" min={1} max={500} value={genForm.count} onChange={e => setGenForm({ ...genForm, count: +e.target.value })} />
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => setGenModal(false)} className="btn btn-ghost flex-1">إلغاء</button>
                                <button type="submit" disabled={loading || !genForm.product_id} className="btn btn-primary flex-1">
                                    {loading ? "جاري التوليد..." : `توليد ${genForm.count}`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Activate Modal */}
            {activateModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800">تفعيل الضمان</h3>
                            <button onClick={() => setActivateModal(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                        </div>
                        <p className="text-sm text-indigo-600 font-mono mb-4 bg-indigo-50 rounded-lg px-3 py-2">{activateModal}</p>
                        <form onSubmit={handleActivate} className="space-y-3">
                            {[
                                { label: "اسم العميل *", key: "customer_name", type: "text", required: true },
                                { label: "رقم الهاتف", key: "customer_phone", type: "text", required: false },
                                { label: "البريد الإلكتروني", key: "customer_email", type: "email", required: false },
                                { label: "تاريخ الشراء *", key: "purchase_date", type: "date", required: true },
                            ].map(({ label, key, type, required }) => (
                                <div key={key}>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
                                    <input type={type} className="input" required={required}
                                        value={actForm[key as keyof typeof actForm]}
                                        onChange={e => setActForm({ ...actForm, [key]: e.target.value })} />
                                </div>
                            ))}
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setActivateModal(null)} className="btn btn-ghost flex-1">إلغاء</button>
                                <button type="submit" disabled={loading} className="btn btn-primary flex-1">
                                    {loading ? "جاري التفعيل..." : "تفعيل الضمان"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
