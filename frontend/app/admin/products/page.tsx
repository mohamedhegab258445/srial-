"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { getProducts, createProduct, updateProduct, deleteProduct } from "../../../lib/api";
import { Plus, Trash2, Package, X, Edit2, Check } from "lucide-react";
import { AxiosError } from "axios";
import { useToast } from "../../../components/ToastProvider";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Product { id: number; name: string; warranty_months: number; specs: string; image_url: string }

export default function ProductsPage() {
    const toast = useToast();
    const [products, setProducts] = useState<Product[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: "", warranty_months: 12, specs: "", image_url: "" });
    const [loading, setLoading] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({ name: "", warranty_months: 12, specs: "" });

    const load = () => getProducts().then(r => setProducts(r.data));
    useEffect(() => { load(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true);
        try { await createProduct(form); toast.success("تم إضافة المنتج ✅"); setShowModal(false); setForm({ name: "", warranty_months: 12, specs: "", image_url: "" }); load(); }
        catch { toast.error("فشل إضافة المنتج"); }
        finally { setLoading(false); }
    };

    const saveEdit = async (id: number) => {
        try { await updateProduct(id, editForm); toast.success("تم التحديث ✅"); setEditId(null); load(); }
        catch { toast.error("فشل التحديث"); }
    };

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`حذف المنتج "${name}"؟`)) return;
        try {
            await deleteProduct(id);
            toast.success("تم الحذف");
            load();
        } catch (err) {
            const error = err as AxiosError<{ detail: string }>;
            toast.error(error?.response?.data?.detail || "لا يمكن حذف منتج مرتبط بسيريالات");
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">المنتجات</h1>
                    <p className="text-sm text-slate-500 mt-0.5">{products.length} منتج مسجل</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={16} /> منتج جديد
                </button>
            </div>

            {/* Products Grid */}
            {products.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-16 text-slate-300">
                    <Package size={48} className="mb-3" />
                    <p className="text-slate-400 text-sm">لا توجد منتجات بعد</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products.map(p => (
                        <div key={p.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            {p.image_url && (
                                <div className="h-40 bg-slate-50 overflow-hidden">
                                    <Image
                                        src={`${API_URL}${p.image_url}`}
                                        alt={p.name}
                                        className="w-full h-full object-cover"
                                        width={400}
                                        height={160}
                                    />
                                </div>
                            )}
                            <div className="p-4">
                                {editId === p.id ? (
                                    <div className="space-y-2">
                                        <input className="input text-sm" value={editForm.name} placeholder="اسم المنتج"
                                            onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                                        <input type="number" className="input text-sm" value={editForm.warranty_months} placeholder="مدة الضمان (شهر)"
                                            onChange={e => setEditForm({ ...editForm, warranty_months: +e.target.value })} />
                                        <textarea className="input text-sm resize-none" rows={2} value={editForm.specs} placeholder="المواصفات"
                                            onChange={e => setEditForm({ ...editForm, specs: e.target.value })} />
                                        <div className="flex gap-2">
                                            <button onClick={() => saveEdit(p.id)} className="btn btn-primary btn-sm flex-1"><Check size={13} /> حفظ</button>
                                            <button onClick={() => setEditId(null)} className="btn btn-ghost btn-sm flex-1"><X size={13} /> إلغاء</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <h3 className="font-semibold text-slate-800 text-sm leading-snug">{p.name}</h3>
                                            <div className="flex gap-1 flex-shrink-0">
                                                <button onClick={() => { setEditId(p.id); setEditForm({ name: p.name, warranty_months: p.warranty_months, specs: p.specs || "" }); }}
                                                    className="btn btn-ghost btn-sm" title="تعديل"><Edit2 size={13} /></button>
                                                <button onClick={() => handleDelete(p.id, p.name)}
                                                    className="btn btn-ghost btn-sm text-red-400 hover:text-red-600" title="حذف"><Trash2 size={13} /></button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                                                {p.warranty_months} شهر ضمان
                                            </span>
                                        </div>
                                        {p.specs && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{p.specs}</p>}
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="font-bold text-slate-800">إضافة منتج جديد</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">اسم المنتج *</label>
                                <input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">مدة الضمان (بالأشهر)</label>
                                <input type="number" className="input" min={1} value={form.warranty_months} onChange={e => setForm({ ...form, warranty_months: +e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">المواصفات</label>
                                <textarea className="input resize-none" rows={3} value={form.specs} onChange={e => setForm({ ...form, specs: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">رابط الصورة</label>
                                <input className="input" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost flex-1">إلغاء</button>
                                <button type="submit" disabled={loading} className="btn btn-primary flex-1">
                                    {loading ? "جاري الإضافة..." : "إضافة المنتج"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
