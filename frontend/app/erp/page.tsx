"use client";

import { useState } from "react";
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Wallet as WalletIcon,
    ArrowUpRight,
    ArrowDownRight
} from "lucide-react";

export default function ERPDashboard() {
    // Placeholder metrics until API is connected
    const [metrics] = useState([
        { title: "إجمالي الخزائن", value: "24,500.00", icon: WalletIcon, color: "text-blue-500", bg: "bg-blue-100" },
        { title: "المبيعات الشهرية", value: "112,400.00", icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-100", trend: "+12.5%", trendUp: true },
        { title: "المصروفات الشهرية", value: "18,250.00", icon: TrendingDown, color: "text-rose-500", bg: "bg-rose-100", trend: "-2.4%", trendUp: false },
        { title: "مستحقات الموردين", value: "45,000.00", icon: DollarSign, color: "text-amber-500", bg: "bg-amber-100" },
    ]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">اللوحة المالية</h1>
                    <p className="text-slate-500 text-sm mt-1">نظرة عامة على الأداء المالي للشركة</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map((metric, idx) => {
                    const Icon = metric.icon;
                    return (
                        <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-xl ${metric.bg} ${metric.color}`}>
                                    <Icon size={24} />
                                </div>
                                {metric.trend && (
                                    <span className={`flex items-center text-sm font-semibold ${metric.trendUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {metric.trendUp ? <ArrowUpRight size={16} className="ml-1" /> : <ArrowDownRight size={16} className="ml-1" />}
                                        {metric.trend}
                                    </span>
                                )}
                            </div>

                            <h3 className="text-slate-500 text-sm font-medium">{metric.title}</h3>
                            <p className="text-2xl font-bold text-slate-800 mt-1">
                                {metric.value} <span className="text-sm text-slate-400 font-normal">ج.م</span>
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Placeholder for Future Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 lg:col-span-2 min-h-[400px] flex items-center justify-center">
                    <p className="text-slate-400 text-sm">مساحة الرسم البياني للمبيعات (ستُضاف لاحقاً)</p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 min-h-[400px] flex items-center justify-center">
                    <p className="text-slate-400 text-sm">أحدث حركات الخزينة ستظهر هنا</p>
                </div>
            </div>
        </div>
    );
}
