"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
    LayoutDashboard, Package, Hash, Ticket, Wrench, LogOut,
    ShieldCheck, Menu, X, Users, Upload, UserCircle, Settings, ChevronRight
} from "lucide-react";

const navItems = [
    { href: "/admin/dashboard", label: "الرئيسية", icon: LayoutDashboard },
    { href: "/admin/products", label: "المنتجات", icon: Package },
    { href: "/admin/serials", label: "السيريالات", icon: Hash },
    { href: "/admin/customers", label: "العملاء", icon: UserCircle },
    { href: "/admin/tickets", label: "التذاكر", icon: Ticket },
    { href: "/admin/maintenance", label: "الصيانة", icon: Wrench },
    { href: "/admin/dealers", label: "الوكلاء", icon: Users },
    { href: "/admin/import", label: "استيراد", icon: Upload },
    { href: "/admin/settings", label: "الإعدادات", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("admin_token");
        if (!token && pathname !== "/admin") router.push("/admin");
    }, [pathname]);

    const logout = () => {
        localStorage.removeItem("admin_token");
        router.push("/admin");
    };

    if (pathname === "/admin") return <>{children}</>;

    const currentPage = navItems.find(n => pathname.startsWith(n.href));

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* ── Sidebar ── */}
            <aside className={`
                fixed inset-y-0 right-0 z-40 w-60 bg-scan-gradient flex flex-col transition-transform duration-200
                md:relative md:translate-x-0
                ${sidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}
            `}>
                {/* Logo */}
                <div className="flex items-center gap-3 px-5 py-6 border-b border-white/10">
                    <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <ShieldCheck size={17} className="text-white" />
                    </div>
                    <span className="text-white font-bold text-base leading-tight">Warranty<br />Admin</span>
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
                    {navItems.map(({ href, label, icon: Icon }) => {
                        const active = pathname.startsWith(href);
                        return (
                            <Link
                                key={href}
                                href={href}
                                onClick={() => setSidebarOpen(false)}
                                className={`sidebar-link ${active ? "active" : ""}`}
                            >
                                <Icon size={17} />
                                <span>{label}</span>
                                {active && <ChevronRight size={14} className="mr-auto opacity-60" />}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-3 border-t border-white/10">
                    <button onClick={logout} className="sidebar-link w-full text-red-300 hover:text-red-100 hover:bg-red-500/15">
                        <LogOut size={17} />
                        تسجيل الخروج
                    </button>
                </div>
            </aside>

            {/* Overlay (mobile) */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-30 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* ── Main ── */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top bar */}
                <header className="h-14 bg-white border-b border-slate-200 px-5 flex items-center gap-3 flex-shrink-0 shadow-sm">
                    <button
                        className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>

                    <div className="flex items-center gap-1.5 text-sm text-slate-400">
                        <span>الإدارة</span>
                        {currentPage && (
                            <>
                                <span>/</span>
                                <span className="text-slate-700 font-medium">{currentPage.label}</span>
                            </>
                        )}
                    </div>

                    <div className="mr-auto flex items-center gap-3">
                        <a href="/" target="_blank"
                            className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors">
                            فحص الضمان ↗
                        </a>
                        <a href="/" target="_blank"
                            className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                            الموقع ↗
                        </a>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
