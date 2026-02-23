"use client";

import { useState, useEffect } from "react";
import { Plus, ArrowDown, ArrowUp, RefreshCw, Wallet as WalletIcon } from "lucide-react";
import { useToast } from "../../../components/ToastProvider";

interface Wallet {
    id: number;
    name: string;
    balance: number;
    created_at: string;
}

export default function TreasuryPage() {
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [txType, setTxType] = useState<"deposit" | "withdraw">("deposit");
    const [selectedWalletId, setSelectedWalletId] = useState<number | null>(null);

    // Form State
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const toast = useToast();

    const fetchWallets = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("adminToken");
            const res = await fetch("/api/erp/wallets/", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setWallets(data);
            }
        } catch (error) {
            console.error(error);
            toast.error("حدث خطأ في جلب بيانات الخزائن");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWallets();
    }, []);

    const handleTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedWalletId || !amount) return;

        try {
            const token = localStorage.getItem("adminToken");
            const endpoint = `/api/erp/wallets/${selectedWalletId}/${txType}`;

            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    amount: parseFloat(amount),
                    description: description || (txType === "deposit" ? "إيداع يدوي" : "سحب يدوي")
                })
            });

            if (res.ok) {
                toast.success(txType === "deposit" ? "تم إيداع المبلغ بنجاح" : "تم سحب المبلغ بنجاح");
                setIsModalOpen(false);
                setAmount("");
                setDescription("");
                fetchWallets();
            } else {
                const err = await res.json();
                toast.error(err.detail || "حدث خطأ أثناء العملية");
            }
        } catch (error) {
            toast.error("مشكلة في الاتصال بالخادم");
        }
    };

    const openModal = (walletId: number, type: "deposit" | "withdraw") => {
        setSelectedWalletId(walletId);
        setTxType(type);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">الخزائن والبنوك</h1>
                    <p className="text-slate-500 mt-1">إدارة السيولة النقدية، الإيداعات، والسحوبات</p>
                </div>
                <button
                    onClick={fetchWallets}
                    className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                >
                    <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-12 text-center text-slate-500 animate-pulse">
                        جاري تحميل البيانات...
                    </div>
                ) : wallets.length === 0 ? (
                    <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200">
                        <WalletIcon size={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-500">لا توجد خزائن أو حسابات بنكية مضافة بعد</p>
                    </div>
                ) : (
                    wallets.map((wallet) => (
                        <div key={wallet.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                            <div className="p-6 flex-1">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
                                        <WalletIcon size={24} />
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">{wallet.name}</h3>
                                <div className="mt-4">
                                    <span className="text-sm text-slate-500">الرصيد المتاح</span>
                                    <p className="text-3xl font-black text-slate-900 mt-1">
                                        {wallet.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-base font-normal text-slate-500">ج.م</span>
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 border-t border-slate-100 bg-slate-50">
                                <button
                                    onClick={() => openModal(wallet.id, 'deposit')}
                                    className="py-3 flex items-center justify-center gap-2 text-emerald-600 hover:bg-emerald-50 font-medium transition-colors"
                                >
                                    <ArrowDown size={18} />
                                    إيداع
                                </button>
                                <button
                                    onClick={() => openModal(wallet.id, 'withdraw')}
                                    className="py-3 flex items-center justify-center gap-2 text-rose-600 border-r border-slate-100 hover:bg-rose-50 font-medium transition-colors"
                                >
                                    <ArrowUp size={18} />
                                    سحب
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Transaction Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className={`p-4 text-white font-bold flex gap-2 items-center ${txType === 'deposit' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                            {txType === 'deposit' ? <ArrowDown size={20} /> : <ArrowUp size={20} />}
                            {txType === 'deposit' ? 'إيداع أموال' : 'سحب أموال'}
                        </div>

                        <form onSubmit={handleTransaction} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">المبلغ (ج.م)</label>
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    required
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-lg"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">البيان / ملاحظات (اختياري)</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="سبب العملية..."
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    className={`flex-1 py-3 rounded-xl text-white font-medium ${txType === 'deposit' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                                >
                                    تنفيذ العملية
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-3 rounded-xl bg-slate-100 text-slate-600 font-medium hover:bg-slate-200"
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
