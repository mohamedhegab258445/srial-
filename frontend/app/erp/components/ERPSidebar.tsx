"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    BarChart3,
    Wallet,
    Users,
    ShoppingCart,
    Package,
    Receipt,
    LogOut
} from "lucide-react";

export default function ERPSidebar() {
    const pathname = usePathname();

    const navItems = [
        { name: "اللوحة المالية", href: "/erp", icon: BarChart3 },
        { name: "الخزائن والبنوك", href: "/erp/treasury", icon: Wallet },
        { name: "الموردين", href: "/erp/suppliers", icon: Users },
        { name: "المشتريات", href: "/erp/purchases", icon: ShoppingCart },
        { name: "المخزن", href: "/erp/stock", icon: Package },
        { name: "المبيعات", href: "/erp/sales", icon: Receipt },
    ];

    return (
        <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col hidden md:flex">
            <div className="p-6 text-center border-b border-slate-800">
                <h2 className="text-xl font-bold text-blue-400">مودرن هوم ERP</h2>
                <p className="text-xs text-slate-400 mt-1">نظام الحسابات والمخازن</p>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                }`}
                        >
                            <Icon size={20} />
                            <span className="font-medium">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <Link
                    href="/admin"
                    className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                >
                    <LogOut size={20} />
                    <span>العودة للضمان</span>
                </Link>
            </div>
        </aside>
    );
}
