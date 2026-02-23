"use client";

import { useState, useEffect } from "react";
import { Plus, Receipt, Search, FileText } from "lucide-react";
import { useToast } from "../../../components/ToastProvider";

interface StockItem { id: number; name: string; selling_price: number; quantity: number }
interface Wallet { id: number; name: string; }

export default function SalesPage() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [stock, setStock] = useState<StockItem[]>([]);
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [paidAmount, setPaidAmount] = useState<number>(0);
    const [walletId, setWalletId] = useState("");
    const [items, setItems] = useState([{ stock_item_id: "", quantity: 1, unit_price: 0 }]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("adminToken");
            const headers = { Authorization: `Bearer ${token}` };

            const [invRes, stkRes, walRes] = await Promise.all([
                fetch("/api/erp/sales/", { headers }),
                fetch("/api/erp/stock/", { headers }),
                fetch("/api/erp/wallets/", { headers })
            ]);

            if (invRes.ok) setInvoices(await invRes.json());
            if (stkRes.ok) setStock(await stkRes.json());
            if (walRes.ok) setWallets(await walRes.json());

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
        if (!customerName || items.some(i => !i.stock_item_id || i.quantity <= 0)) {
            toast.error("يرجى ملء جميع الحقول بشكل صحيح");
            return;
        }

        if (paidAmount > 0 && !walletId) {
            toast.error("يرجى تحديد الخزينة التي سيتم إيداع المبلغ المحصل بها");
            return;
        }

        try {
            const token = localStorage.getItem("adminToken");
            let endpoint = "/api/erp/sales/";
            if (walletId) {
                endpoint += `?wallet_id=${walletId}`;
            }

            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    customer_name: customerName,
                    customer_phone: customerPhone,
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
                toast.success("تم إصدار وتسجيل فاتورة المبيعات بنجاح");
                setIsModalOpen(false);
                setCustomerName("");
                setCustomerPhone("");
                setPaidAmount(0);
                setWalletId("");
                setItems([{ stock_item_id: "", quantity: 1, unit_price: 0 }]);
                fetchData();
            } else {
                const err = await res.json();
                toast.error(err.detail || "خطأ أثناء التسجيل. تأكد من توفر الكمية بالمخزن");
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
                        <Receipt className="text-blue-500" /> نقطة المبيعات
                    </h1>
                    <p className="text-slate-500 mt-1">إصدار فواتير بيع للعملاء وسحب المنتجات من المخزن</p>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm"
                >
                    <Plus size={20} />
                    فاتورة مبيعات جديدة
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                            <tr>
                                <th className="px-6 py-4">رقم الفاتورة</th>
                                <th className="px-6 py-4">التاريخ</th>
                                <th className="px-6 py-4">العميل</th>
                                <th className="px-6 py-4">إجمالي الصافي</th>
                                <th className="px-6 py-4">المسدد نقداً</th>
                                <th className="px-6 py-4">تفاصيل</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">جاري التحميل...</td></tr>
                            ) : invoices.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">لا توجد فواتير مبيعات</td></tr>
                            ) : (
                                invoices.map(inv => (
                                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-800">INV-{inv.id.toString().padStart(4, '0')}</td>
                                        <td className="px-6 py-4 text-slate-600">{new Date(inv.created_at).toLocaleDateString('ar-EG')}</td>
                                        <td className="px-6 py-4 font-bold text-blue-600">{inv.customer_name}</td>
                                        <td className="px-6 py-4 font-bold text-slate-800">{inv.total_amount.toLocaleString()} ج.م</td>
                                        <td className="px-6 py-4 text-emerald-600">{inv.paid_amount.toLocaleString()} ج.م</td>
                                        <td className="px-6 py-4">
                                            <button className="text-slate-400 hover:text-blue-600"><FileText size={18} /></button>
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
                            <h3 className="text-xl font-bold text-slate-800">إصدار فاتورة بيع جديدة</h3>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
                            {/* Header Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">اسم العميل *</label>
                                    <input
                                        type="text" required
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">رقم هاتف العميل</label>
                                    <input
                                        type="tel"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 text-left" dir="ltr"
                                    />
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <div className="bg-slate-50 p-3 font-semibold text-slate-600 flex text-sm">
                                    <div className="flex-1">الصنف</div>
                                    <div className="w-24 text-center">الكمية</div>
                                    <div className="w-32 text-center">سعر البيع</div>
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
                                                const defaultSellCost = stock.find(s => s.id.toString() === e.target.value)?.selling_price || 0;
                                                if (newItems[idx].unit_price === 0) newItems[idx].unit_price = defaultSellCost;
                                                setItems(newItems);
                                            }}
                                            className="flex-1 border border-slate-200 rounded p-2 text-sm"
                                        >
                                            <option value="">اختر الصنف من المخزن...</option>
                                            {stock.map(s => <option key={s.id} value={s.id}>{s.name} (متاح {s.quantity})</option>)}
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
                                    <Plus size={16} /> إضافة صنف
                                </button>
                                <div className="text-xl font-bold text-slate-800">
                                    صافي الفاتورة: <span className="text-blue-600">{calculateTotal().toLocaleString()} ج.م</span>
                                </div>
                            </div>

                            {/* Payment Section */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4 grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">المبلغ المحصل نقداً الآن</label>
                                    <input
                                        type="number" min="0" step="0.01"
                                        value={paidAmount}
                                        onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                                        className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">الخزينة المودع بها</label>
                                    <select
                                        value={walletId}
                                        onChange={(e) => setWalletId(e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                                    >
                                        <option value="">اختر خزينة لإيداع المبلغ...</option>
                                        {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                                <button type="submit" className="flex-1 py-3 rounded-xl text-white font-medium bg-blue-600 hover:bg-blue-700 transition-colors">
                                    إصدار وحفظ הפاتورة
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
