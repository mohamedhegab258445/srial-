"use client";

import { useState, useEffect } from "react";
import { Plus, ShoppingCart, Search, FileText } from "lucide-react";
import { useToast } from "../../../components/ToastProvider";

interface Supplier { id: number; name: string; }
interface StockItem { id: number; name: string; cost_price: number; }

export default function PurchasesPage() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [stock, setStock] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [supplierId, setSupplierId] = useState("");
    const [paidAmount, setPaidAmount] = useState(0);
    const [items, setItems] = useState([{ stock_item_id: "", quantity: 1, unit_price: 0 }]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("adminToken");
            const headers = { Authorization: `Bearer ${token}` };

            const [invRes, supRes, stkRes] = await Promise.all([
                fetch("/api/erp/purchases/", { headers }),
                fetch("/api/erp/suppliers/", { headers }),
                fetch("/api/erp/stock/", { headers })
            ]);

            if (invRes.ok) setInvoices(await invRes.json());
            if (supRes.ok) setSuppliers(await supRes.json());
            if (stkRes.ok) setStock(await stkRes.json());

        } catch (error) {
            toast.error("حدث خطأ في جلب البيانات");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData() }, []);

    const handleAddItem = () => {
        setItems([...items, { stock_item_id: "", quantity: 1, unit_price: 0 }]);
    };

    const calculateTotal = () => {
        return items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supplierId || items.some(i => !i.stock_item_id || i.quantity <= 0)) {
            toast.error("يرجى ملء جميع الحقول بشكل صحيح");
            return;
        }

        try {
            const token = localStorage.getItem("adminToken");
            const res = await fetch("/api/erp/purchases/", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    supplier_id: parseInt(supplierId),
                    total_amount: calculateTotal(),
                    paid_amount: paidAmount,
                    status: "completed",
                    items: items.map(i => ({
                        ...i,
                        stock_item_id: parseInt(i.stock_item_id)
                    }))
                })
            });

            if (res.ok) {
                toast.success("تم تسجيل فاتورة المشتريات بنجاح");
                setIsModalOpen(false);
                setSupplierId("");
                setPaidAmount(0);
                setItems([{ stock_item_id: "", quantity: 1, unit_price: 0 }]);
                fetchData();
            } else {
                const err = await res.json();
                toast.error(err.detail || "خطأ أثناء التسجيل");
            }
        } catch (error) {
            toast.error("مشكلة في الاتصال بالخادم");
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <ShoppingCart className="text-blue-500" /> إدارة المشتريات
                    </h1>
                    <p className="text-slate-500 mt-1">تسجيل فواتير الشراء، توريد البضاعة للمخزن مباشرة</p>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm"
                >
                    <Plus size={20} />
                    فاتورة شراء جديدة
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                            <tr>
                                <th className="px-6 py-4">رقم الفاتورة</th>
                                <th className="px-6 py-4">التاريخ</th>
                                <th className="px-6 py-4">إجمالي الفاتورة</th>
                                <th className="px-6 py-4">المسدد</th>
                                <th className="px-6 py-4">المتبقي (آجل)</th>
                                <th className="px-6 py-4">الحالة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">جاري التحميل...</td></tr>
                            ) : invoices.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">لا توجد فواتير مشتريات</td></tr>
                            ) : (
                                invoices.map(inv => (
                                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-800">PO-{inv.id.toString().padStart(4, '0')}</td>
                                        <td className="px-6 py-4 text-slate-600">{new Date(inv.created_at).toLocaleDateString('ar-EG')}</td>
                                        <td className="px-6 py-4 font-bold text-slate-800">{inv.total_amount.toLocaleString()} ج.م</td>
                                        <td className="px-6 py-4 text-emerald-600">{inv.paid_amount.toLocaleString()} ج.م</td>
                                        <td className="px-6 py-4 text-rose-600">{(inv.total_amount - inv.paid_amount).toLocaleString()} ج.م</td>
                                        <td className="px-6 py-4">
                                            <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm">مكتمل</span>
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
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="text-xl font-bold text-slate-800">إنشاء فاتورة مشتريات (دخول بضاعة)</h3>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
                            {/* Header Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">المورد *</label>
                                    <select
                                        required
                                        value={supplierId}
                                        onChange={(e) => setSupplierId(e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    >
                                        <option value="">اختر المورد...</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">المبلغ المدفوع نقداً للمورد</label>
                                    <input
                                        type="number" min="0" step="0.01"
                                        value={paidAmount}
                                        onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                                        className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="سيُرحل الباقي آجل"
                                    />
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <div className="bg-slate-50 p-3 font-semibold text-slate-600 flex text-sm">
                                    <div className="flex-1">الصنف</div>
                                    <div className="w-24 text-center">الكمية</div>
                                    <div className="w-32 text-center">سعر الشراء</div>
                                    <div className="w-32 text-center">الإجمالي</div>
                                </div>
                                {items.map((item, idx) => (
                                    <div key={idx} className="flex gap-2 p-2 border-t border-slate-100 items-center">
                                        <select
                                            required
                                            value={item.stock_item_id}
                                            onChange={(e) => {
                                                const newItems = [...items];
                                                newItems[idx].stock_item_id = e.target.value;
                                                const defaultCost = stock.find(s => s.id.toString() === e.target.value)?.cost_price || 0;
                                                if (newItems[idx].unit_price === 0) newItems[idx].unit_price = defaultCost;
                                                setItems(newItems);
                                            }}
                                            className="flex-1 border border-slate-200 rounded p-2 text-sm"
                                        >
                                            <option value="">اختر الصنف</option>
                                            {stock.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                        <input
                                            type="number" min="1" required
                                            value={item.quantity}
                                            onChange={(e) => {
                                                const newItems = [...items];
                                                newItems[idx].quantity = parseInt(e.target.value) || 0;
                                                setItems(newItems);
                                            }}
                                            className="w-24 border border-slate-200 rounded p-2 text-center text-sm"
                                        />
                                        <input
                                            type="number" min="0" step="0.01" required
                                            value={item.unit_price}
                                            onChange={(e) => {
                                                const newItems = [...items];
                                                newItems[idx].unit_price = parseFloat(e.target.value) || 0;
                                                setItems(newItems);
                                            }}
                                            className="w-32 border border-slate-200 rounded p-2 text-center text-sm"
                                        />
                                        <div className="w-32 text-center font-bold text-slate-700 bg-slate-50 p-2 rounded">
                                            {(item.quantity * item.unit_price).toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <button type="button" onClick={handleAddItem} className="text-blue-600 font-medium text-sm flex items-center gap-1 hover:text-blue-800">
                                    <Plus size={16} /> صنف آخر
                                </button>
                                <div className="text-xl font-bold text-slate-800">
                                    الإجمالي الكلي: <span className="text-blue-600">{calculateTotal().toLocaleString()} ج.م</span>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                                <button type="submit" className="flex-1 py-3 rounded-xl text-white font-medium bg-emerald-600 hover:bg-emerald-700 transition-colors">
                                    اعتماد وتشغيل المخزن
                                </button>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl bg-slate-100 text-slate-600 font-medium hover:bg-slate-200 transition-colors">
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
