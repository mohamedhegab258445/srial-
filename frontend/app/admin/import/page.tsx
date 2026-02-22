"use client";
import { useEffect, useState } from "react";
import { getProducts } from "@/lib/api";
import { api } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import { Upload, FileText, CheckCircle, AlertCircle, Download } from "lucide-react";

interface Product { id: number; name: string }

export default function ImportPage() {
    const toast = useToast();
    const [products, setProducts] = useState<Product[]>([]);
    const [productId, setProductId] = useState(0);
    const [file, setFile] = useState<File | null>(null);
    const [result, setResult] = useState<{ imported: number; skipped: string[]; message: string } | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => { getProducts().then(r => setProducts(r.data)); }, []);

    const handleImport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !productId) { toast.error("اختر ملف CSV ومنتجاً أولاً"); return; }
        setLoading(true);
        try {
            const form = new FormData();
            form.append("file", file);
            const res = await api.post(`/api/reports/serials/import?product_id=${productId}`, form, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            setResult(res.data);
            toast.success(res.data.message);
        } catch { toast.error("فشل الاستيراد، تأكد من صيغة الملف"); }
        finally { setLoading(false); }
    };

    const downloadTemplate = () => {
        const csv = "\uFEFFserial_number,product_id\nSRL-CUSTOM001,1\nSRL-CUSTOM002,1\n";
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "serials_template.csv";
        a.click();
    };

    return (
        <div className="space-y-6 max-w-xl">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-slate-800">استيراد السيريالات</h1>
                <p className="text-sm text-slate-500 mt-0.5">رفع ملف CSV لاستيراد سيريالات بالجملة</p>
            </div>

            {/* Form card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <form onSubmit={handleImport} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1.5">المنتج الافتراضي *</label>
                        <select className="input" required value={productId} onChange={e => setProductId(+e.target.value)}>
                            <option value={0}>اختر منتجاً</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1.5">ملف CSV *</label>
                        <div
                            className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 transition-colors"
                            onClick={() => document.getElementById("csv-file")?.click()}
                        >
                            {file ? (
                                <div className="flex items-center justify-center gap-2 text-indigo-600">
                                    <FileText size={20} />
                                    <span className="font-medium text-sm">{file.name}</span>
                                </div>
                            ) : (
                                <div className="text-slate-400">
                                    <Upload size={28} className="mx-auto mb-2" />
                                    <p className="text-sm">اسحب الملف هنا أو اضغط للاختيار</p>
                                    <p className="text-xs mt-1">.CSV فقط</p>
                                </div>
                            )}
                            <input id="csv-file" type="file" accept=".csv" className="hidden"
                                onChange={e => setFile(e.target.files?.[0] || null)} />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button type="button" onClick={downloadTemplate} className="btn btn-ghost flex-1">
                            <Download size={14} /> تحميل نموذج
                        </button>
                        <button type="submit" disabled={loading || !file || !productId} className="btn btn-primary flex-1">
                            {loading ? "جاري الاستيراد..." : <><Upload size={14} /> استيراد</>}
                        </button>
                    </div>
                </form>
            </div>

            {/* Result */}
            {result && (
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle size={18} />
                        <span className="font-semibold text-sm">{result.message}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="stat-card text-center">
                            <p className="text-2xl font-bold text-emerald-600">{result.imported}</p>
                            <p className="text-xs text-slate-500 mt-1">تم استيرادها</p>
                        </div>
                        <div className="stat-card text-center">
                            <p className="text-2xl font-bold text-red-500">{result.skipped.length}</p>
                            <p className="text-xs text-slate-500 mt-1">تم تخطيها</p>
                        </div>
                    </div>
                    {result.skipped.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-slate-600 mb-2 flex items-center gap-1">
                                <AlertCircle size={14} className="text-amber-500" /> السيريالات المتخطاة:
                            </p>
                            <div className="bg-slate-50 rounded-xl p-3 max-h-32 overflow-y-auto">
                                {result.skipped.map((s, i) => (
                                    <p key={i} className="text-xs font-mono text-slate-500 py-0.5">{s}</p>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Instructions */}
            <div className="bg-indigo-50 rounded-2xl p-5 text-sm text-slate-600">
                <p className="font-semibold mb-2">📋 تعليمات صيغة CSV:</p>
                <ul className="space-y-1 list-disc list-inside text-xs">
                    <li>العمود الأول: <code className="bg-white px-1 rounded">serial_number</code> (مطلوب)</li>
                    <li>العمود الثاني: <code className="bg-white px-1 rounded">product_id</code> (اختياري)</li>
                    <li>لا تدع حقل الرقم التسلسلي فارغاً</li>
                    <li>السيريالات المكررة ستُتخطى تلقائياً</li>
                </ul>
            </div>
        </div>
    );
}
