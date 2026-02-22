"use client";
import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function ScanResultPage() {
    const params = useParams();
    const router = useRouter();
    const serial = (params.serial as string).toUpperCase();

    useEffect(() => {
        // Redirect to new check flow
        if (serial) {
            router.replace(`/check/${serial}`);
        }
    }, [serial, router]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50/30 flex items-center justify-center">
            <div className="text-center">
                <div className="w-14 h-14 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-500 text-sm font-medium">جاري الانتقال لفحص الضمان...</p>
                <p className="text-xs text-slate-400 mt-2 font-mono uppercase">{serial}</p>
            </div>
        </div>
    );
}
