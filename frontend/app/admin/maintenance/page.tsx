"use client";
import { useEffect, useState } from "react";
import { getMaintenance, addMaintenance, listSerials } from "@/lib/api";
import { Wrench, Plus, X, Search } from "lucide-react";

interface MaintenanceLog { id: number; fault_type: string; technician_name: string; report_date: string; resolved_date: string; parts_replaced: string; notes: string }

export default function MaintenancePage() {
    const [serialSearch, setSerialSearch] = useState("");
    const [logs, setLogs] = useState<MaintenanceLog[]>([]);
    const [searched, setSearched] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [serialId, setSerialId] = useState<number | null>(null);
    const [form, setForm] = useState({ technician_name: "", fault_type: "", parts_replaced: "", report_date: new Date().toISOString().slice(0, 10), resolved_date: "", notes: "" });
    const [loading, setLoading] = useState(false);

    const searchSerial = async () => {
        if (!serialSearch.trim()) return;
        setSearched(true);
        try {
            const res = await getMaintenance(serialSearch.trim().toUpperCase());
            setLogs(res.data);
            // Get serial id for modal
            const sr = await listSerials({ status: undefined });
            const found = sr.data.find((s: { serial_number: string; id: number }) => s.serial_number === serialSearch.trim().toUpperCase());
            if (found) setSerialId(found.id);
        } catch { setLogs([]); }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!serialId) return;
        setLoading(true);
        try {
            await addMaintenance({ ...form, serial_id: serialId });
            setShowModal(false);
            searchSerial();
        } finally { setLoading(false); }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-bold text-slate-800">سجلات الصيانة</h1>
                <p className="text-sm text-slate-500 mt-0.5">ابحث بالرقم التسلسلي لعرض أو إضافة سجل صيانة</p>
            </div>


            <div className="flex gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        className="input pl-9 font-mono"
                        placeholder="SRL-XXXXXXXX"
                        value={serialSearch}
                        onChange={e => setSerialSearch(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === "Enter" && searchSerial()}
                    />
                </div>
                <button className="btn btn-primary" onClick={searchSerial}>بحث</button>
                {searched && serialId && (
                    <button className="btn btn-ghost" onClick={() => setShowModal(true)}>
                        <Plus size={16} /> إضافة سجل
                    </button>
                )}
            </div>

            {searched && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    {logs.length === 0 ? (
                        <p className="text-center text-slate-400 py-10">لا توجد سجلات صيانة للرقم: {serialSearch}</p>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>نوع العطل</th>
                                    <th>المهندس</th>
                                    <th>تاريخ الإبلاغ</th>
                                    <th>تاريخ الحل</th>
                                    <th>قطع مستبدلة</th>
                                    <th>ملاحظات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(l => (
                                    <tr key={l.id}>
                                        <td className="font-medium text-slate-700">{l.fault_type || "—"}</td>
                                        <td className="text-slate-600">{l.technician_name || "—"}</td>
                                        <td className="text-slate-500 text-sm">{l.report_date}</td>
                                        <td className="text-slate-500 text-sm">{l.resolved_date || "—"}</td>
                                        <td className="text-slate-500 text-sm">{l.parts_replaced || "—"}</td>
                                        <td className="text-slate-500 text-sm max-w-xs truncate">{l.notes || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-slate-800">إضافة سجل صيانة</h3>
                                <p className="text-xs font-mono text-indigo-600">{serialSearch}</p>
                            </div>
                            <button onClick={() => setShowModal(false)}><X size={18} className="text-slate-400" /></button>
                        </div>
                        <form onSubmit={handleAdd} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">نوع العطل</label>
                                    <input className="input" value={form.fault_type} onChange={e => setForm({ ...form, fault_type: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">اسم الفني</label>
                                    <input className="input" value={form.technician_name} onChange={e => setForm({ ...form, technician_name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">تاريخ الإبلاغ *</label>
                                    <input type="date" className="input" required value={form.report_date} onChange={e => setForm({ ...form, report_date: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">تاريخ الحل</label>
                                    <input type="date" className="input" value={form.resolved_date} onChange={e => setForm({ ...form, resolved_date: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">قطع الغيار المستبدلة</label>
                                <input className="input" placeholder="مثال: مروحة التبريد، فلتر الهواء" value={form.parts_replaced} onChange={e => setForm({ ...form, parts_replaced: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">ملاحظات</label>
                                <textarea className="input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost flex-1">إلغاء</button>
                                <button type="submit" disabled={loading} className="btn btn-primary flex-1">
                                    {loading ? "جاري الحفظ..." : "حفظ السجل"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
