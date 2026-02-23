import type { Metadata } from "next";
import ERPSidebar from "./components/ERPSidebar";

export const metadata: Metadata = {
    title: "مودرن هوم | النظام المالي والمخازن",
    description: "نظام مودرن هوم لإدارة المبيعات، المشتريات، الخزينة والمخازن.",
};

export default function ERPLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex bg-slate-50 min-h-screen text-slate-900 font-sans" dir="rtl">
            {/* Sidebar for Desktop */}
            <ERPSidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Mobile Header (Future implementation) */}
                <header className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-md z-10">
                    <h2 className="font-bold text-lg text-blue-400">مودرن هوم ERP</h2>
                </header>

                {/* Dynamic Page Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
