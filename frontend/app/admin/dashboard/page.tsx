"use client";
import { useEffect, useState } from "react";
import { getDashboardStats } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import { exportToCSV } from "@/lib/utils";
import { ShieldCheck, Package, Hash, Ticket, Users, AlertCircle, Download } from "lucide-react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

interface Stats {
    products: number;
    serials: { total: number; active: number; expired: number; inactive: number };
    customers: number;
    tickets: { open: number; in_progress: number; resolved: number };
    recent_tickets: { id: number; title: string; status: string; created_at: string }[];
}

const ticketBadge: Record<string, string> = { open: "badge-expired", in_progress: "badge-void", resolved: "badge-active", closed: "badge-inactive" };
const ticketLabel: Record<string, string> = { open: "مفتوحة", in_progress: "قيد المعالجة", resolved: "محلولة", closed: "مغلقة" };
const PIE_COLORS = ["#6366f1", "#f59e0b", "#94a3b8"];

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const toast = useToast();

    useEffect(() => {
        getDashboardStats()
            .then(r => setStats(r.data))
            .catch(() => toast.error("تعذّر تحميل الإحصائيات"));
    }, []);

    if (!stats) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
        </div>
    );

    const statCards = [
        { label: "المنتجات", value: stats.products, icon: Package, color: "text-indigo-600", bg: "bg-indigo-50", href: "/admin/products" },
        { label: "إجمالي السيريالات", value: stats.serials.total, icon: Hash, color: "text-blue-600", bg: "bg-blue-50", href: "/admin/serials" },
        { label: "ضمانات نشطة", value: stats.serials.active, icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50", href: "/admin/serials" },
        { label: "ضمانات منتهية", value: stats.serials.expired, icon: AlertCircle, color: "text-red-500", bg: "bg-red-50", href: "/admin/serials" },
        { label: "العملاء", value: stats.customers, icon: Users, color: "text-purple-600", bg: "bg-purple-50", href: "/admin/customers" },
        { label: "تذاكر مفتوحة", value: stats.tickets.open, icon: Ticket, color: "text-orange-500", bg: "bg-orange-50", href: "/admin/tickets" },
    ];

    const pieData = [
        { name: "نشطة", value: stats.serials.active },
        { name: "منتهية", value: stats.serials.expired },
        { name: "غير مفعلة", value: stats.serials.inactive },
    ];
    const barData = [
        { name: "مفتوحة", count: stats.tickets.open, fill: "#ef4444" },
        { name: "قيد المعالجة", count: stats.tickets.in_progress, fill: "#f59e0b" },
        { name: "محلولة", count: stats.tickets.resolved, fill: "#10b981" },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-slate-800">لوحة التحكم</h1>
                <p className="text-sm text-slate-500 mt-0.5">نظرة عامة على النظام</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {statCards.map(({ label, value, icon: Icon, color, bg, href }) => (
                    <Link key={label} href={href} className="stat-card cursor-pointer group">
                        <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                            <Icon size={17} className={color} />
                        </div>
                        <p className="text-2xl font-bold text-slate-800">{value}</p>
                        <p className="text-xs text-slate-500 mt-1">{label}</p>
                    </Link>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <Hash size={15} className="text-indigo-500" />
                        <h3 className="text-sm font-semibold text-slate-700">توزيع السيريالات</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                            </Pie>
                            <Tooltip />
                            <Legend iconSize={10} iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <Ticket size={15} className="text-orange-500" />
                        <h3 className="text-sm font-semibold text-slate-700">حالة التذاكر</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={barData} barSize={36}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                {barData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent Tickets */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
                    <h3 className="text-sm font-semibold text-slate-700">أحدث التذاكر</h3>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => exportToCSV("tickets", ["#", "العنوان", "الحالة", "التاريخ"],
                                stats.recent_tickets.map(t => [t.id, t.title, t.status, t.created_at]))}
                            className="btn btn-ghost btn-sm"
                        >
                            <Download size={13} /> تصدير
                        </button>
                        <Link href="/admin/tickets" className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">
                            عرض الكل
                        </Link>
                    </div>
                </div>
                {stats.recent_tickets.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-sm">لا توجد تذاكر بعد</div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {stats.recent_tickets.map(t => (
                            <div key={t.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors">
                                <div>
                                    <p className="text-sm font-medium text-slate-700">#{t.id} {t.title}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{new Date(t.created_at).toLocaleDateString("ar-EG")}</p>
                                </div>
                                <span className={`badge ${ticketBadge[t.status] || "badge-inactive"}`}>
                                    {ticketLabel[t.status] || t.status}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
