"use client";

import { useState, useEffect } from "react";
import { Plus, PackageSearch, Search, Edit2, History } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

interface StockItem {
    id: number;
    name: string;
    quantity: number;
    cost_price: number;
    selling_price: number;
    product_id: number | null;
}

export default function StockPage() {
    const [items, setItems] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const { showToast } = useToast();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        quantity: 0,
        cost_price: 0,
        selling_price: 0,
    });

    const fetchStock = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("adminToken");
            const res = await fetch("/api/erp/stock/", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setItems(data);
            }
        } catch (error) {
            showToast("خطأ في جلب أرصدة المخزن", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStock();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("adminToken");
            const res = await fetch("/api/erp/stock/", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: formData.name,
                    quantity: parseInt(formData.quantity.toString()) || 0,
                    cost_price: parseFloat(formData.cost_price.toString()) || 0,
                    selling_price: parseFloat(formData.selling_price.toString()) || 0,
                })
            });

            if (res.ok) {
                showToast("تمت إضافة الصنف للمخزن بنجاح", "success");
                setIsModalOpen(false);
                setFormData({ name: "", quantity: 0, cost_price: 0, selling_price: 0 });
                fetchStock();
            } else {
                const err = await res.json();
                showToast(err.detail || "حدث خطأ أثناء الإضافة", "error");
            }
        } catch (error) {
            showToast("مشكلة في الاتصال بالخادم", "error");
        }
    };

    const filteredItems = items.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <PackageSearch className="text-blue-500" /> إدارة المخزون
                    </h1>
                    <p className="text-slate-500 mt-1">تتبع البضاعة، قطع الغيار، وكميات المنتجات المتوفرة</p>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm"
                >
                    <Plus size={20} />
                    تعريف صنف جديد
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                    <div className="relative max-w-md">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="ابحث باسم الصنف أو قطعة الغيار..."
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
                                <th className="px-6 py-4">اسم الصنف</th>
                                <th className="px-6 py-4 text-center">الكمية المتاحة</th>
                                <th className="px-6 py-4">متوسط التكلفة</th>
                                <th className="px-6 py-4">سعر البيع (المقترح)</th>
                                <th className="px-6 py-4">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">جاري التحميل...</td>
                                </tr>
                            ) : filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        لا توجد أصناف مطابقة للبحث
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-800">{item.name}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${item.quantity > 10 ? 'bg-emerald-100 text-emerald-700' :
                                                    item.quantity > 0 ? 'bg-amber-100 text-amber-700' :
                                                        'bg-rose-100 text-rose-700'
                                                }`}>
                                                {item.quantity}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{item.cost_price.toLocaleString()} ج.م</td>
                                        <td className="px-6 py-4 text-blue-600 font-semibold">{item.selling_price.toLocaleString()} ج.م</td>
                                        <td className="px-6 py-4 flex gap-2">
                                            <button className="text-slate-400 hover:text-blue-600 p-1 transition-colors" title="تعديل البيانات">
                                                <Edit2 size={18} />
                                            </button>
                                            <button className="text-slate-400 hover:text-slate-700 p-1 transition-colors" title="حركة الصنف">
                                                <History size={18} />
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
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="text-xl font-bold text-slate-800">تعريف صنف جديد بالمخزن</h3>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">اسم الصنف / قطعة الغيار *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="مثال: موتور غسالة 10 كيلو"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">تفتيح رصيد أولي (الكمية الحالية)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                                    className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">التكلفة المتوقعة (للقطعة)</label>
                                    <input
                                        type="number"
                                        min="0" step="0.01"
                                        value={formData.cost_price}
                                        onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) })}
                                        className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">سعر البيع الافتراضي</label>
                                    <input
                                        type="number"
                                        min="0" step="0.01"
                                        value={formData.selling_price}
                                        onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) })}
                                        className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                                <button
                                    type="submit"
                                    className="flex-1 py-3 rounded-xl text-white font-medium bg-blue-600 hover:bg-blue-700 transition-colors"
                                >
                                    حفظ الصنف
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
