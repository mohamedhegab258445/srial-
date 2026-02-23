"use client";

import { useState, useEffect } from "react";
import { Plus, Users, Search, Edit2, Archive } from "lucide-react";
import { useToast } from "../../../components/ToastProvider";

interface Supplier {
    id: number;
    name: string;
    phone: string | null;
    address: string | null;
    opening_balance: number;
    current_balance: number;
    created_at: string;
}

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const toast = useToast();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        address: "",
        opening_balance: 0
    });

    const fetchSuppliers = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("adminToken");
            const res = await fetch("/api/erp/suppliers/", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSuppliers(data);
            }
        } catch (error) {
            toast.error("خطأ في جلب بيانات الموردين");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("adminToken");
            const res = await fetch("/api/erp/suppliers/", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    ...formData,
                    opening_balance: parseFloat(formData.opening_balance.toString()) || 0,
                    current_balance: parseFloat(formData.opening_balance.toString()) || 0
                })
            });

            if (res.ok) {
                toast.success("تمت إضافة المورد بنجاح");
                setIsModalOpen(false);
                setFormData({ name: "", phone: "", address: "", opening_balance: 0 });
                fetchSuppliers();
            } else {
                const err = await res.json();
                toast.error(err.detail || "حدث خطأ أثناء الإضافة");
            }
        } catch (error) {
            toast.error("مشكلة في الاتصال بالخادم");
        }
    };

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.phone && s.phone.includes(search))
    );

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Users className="text-blue-500" /> إدارة الموردين
                    </h1>
                    <p className="text-slate-500 mt-1">سجل الموردين، حسابات الموردين والأرصدة الافتتاحية</p>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm"
                >
                    <Plus size={20} />
                    إضافة مورد جديد
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                    <div className="relative max-w-md">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="ابحث باسم المورد أو الهاتف..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-4 pr-10 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                            <tr>
                                <th className="px-6 py-4">اسم المورد</th>
                                <th className="px-6 py-4">رقم الهاتف</th>
                                <th className="px-6 py-4">العنوان</th>
                                <th className="px-6 py-4">الرصيد الافتتاحي</th>
                                <th className="px-6 py-4">الرصيد الحالي (المستحق)</th>
                                <th className="px-6 py-4">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">جاري التحميل...</td>
                                </tr>
                            ) : filteredSuppliers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        لا توجد بيانات موردين مطابقة للبحث
                                    </td>
                                </tr>
                            ) : (
                                filteredSuppliers.map(s => (
                                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-800">{s.name}</td>
                                        <td className="px-6 py-4 text-slate-600" dir="ltr">{s.phone || '-'}</td>
                                        <td className="px-6 py-4 text-slate-600 truncate max-w-[200px]">{s.address || '-'}</td>
                                        <td className="px-6 py-4 text-slate-500">{s.opening_balance.toLocaleString()} ج.م</td>
                                        <td className="px-6 py-4 font-bold text-rose-600">{s.current_balance.toLocaleString()} ج.م</td>
                                        <td className="px-6 py-4 flex gap-2">
                                            <button className="text-slate-400 hover:text-blue-600 p-1 transition-colors" title="تعديل">
                                                <Edit2 size={18} />
                                            </button>
                                            <button className="text-slate-400 hover:text-slate-700 p-1 transition-colors" title="كشف الحساب">
                                                <Archive size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-800">إضافة مورد جديد</h3>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">اسم المورد / الشركة *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">رقم الهاتف</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left" dir="ltr"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">الرصيد الافتتاحي المستحق</label>
                                    <input
                                        type="number"
                                        min="0" step="0.01"
                                        value={formData.opening_balance}
                                        onChange={(e) => setFormData({ ...formData, opening_balance: parseFloat(e.target.value) })}
                                        className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="له أموال؟"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">العنوان</label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="submit"
                                    className="flex-1 py-3 rounded-xl text-white font-medium bg-blue-600 hover:bg-blue-700 transition-colors"
                                >
                                    تأكيد الحفظ
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-3 rounded-xl bg-slate-100 text-slate-600 font-medium hover:bg-slate-200 transition-colors"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
