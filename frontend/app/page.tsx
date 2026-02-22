"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, QrCode, ShieldCheck, Wrench, Package } from "lucide-react";

export default function ScanPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    router.push(`/scan/${query.trim().toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-scan-gradient flex flex-col items-center justify-center px-4 py-12">
      {/* Hero */}
      <div className="text-center text-white mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 mb-5 ring-2 ring-white/20">
          <ShieldCheck size={42} className="text-white" />
        </div>
        <h1 className="text-4xl font-bold mb-2">مودرن هوم</h1>
        <p className="text-indigo-200 text-lg">
          امسح رمز الـ QR أو أدخل الرقم التسلسلي للتحقق من الضمان والفاتورة
        </p>
      </div>

      {/* Search card */}
      <div className="glass w-full max-w-lg p-8">
        <form onSubmit={handleSearch} className="space-y-4">
          <label className="block text-sm font-semibold text-slate-600 mb-1">
            الرقم التسلسلي (Serial Number)
          </label>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="serial-input"
              type="text"
              className="input pl-10 text-lg tracking-widest font-mono"
              placeholder="SRL-XXXXXXXX"
              value={query}
              onChange={(e) => setQuery(e.target.value.toUpperCase())}
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="btn btn-primary w-full text-base py-3"
          >
            {loading ? "جاري البحث..." : (
              <>
                <Search size={18} />
                فحص الضمان
              </>
            )}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-slate-400 text-sm">أو</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-slate-500 text-sm bg-slate-50 px-4 py-2 rounded-xl">
            <QrCode size={16} />
            وجّه كاميرا هاتفك نحو رمز الـ QR الموجود على الكرتون
          </div>
        </div>
      </div>

      {/* Features row */}
      <div className="grid grid-cols-3 gap-4 max-w-lg w-full mt-8">
        {[
          { icon: ShieldCheck, label: "حالة الضمان", desc: "فوري ودقيق" },
          { icon: Wrench, label: "سجل الصيانة", desc: "تاريخ كامل" },
          { icon: Package, label: "بيانات المنتج", desc: "مواصفات تفصيلية" },
        ].map(({ icon: Icon, label, desc }) => (
          <div
            key={label}
            className="text-center rounded-2xl bg-white/10 backdrop-blur p-4 text-white ring-1 ring-white/20"
          >
            <Icon size={24} className="mx-auto mb-2 text-indigo-200" />
            <p className="font-semibold text-sm">{label}</p>
            <p className="text-xs text-indigo-300">{desc}</p>
          </div>
        ))}
      </div>

      {/* Portal links */}
      <div className="mt-8 flex gap-4">
        <Link href="/" className="text-indigo-200 hover:text-white text-sm underline font-medium">
          فحص الضمان
        </Link>
        <span className="text-indigo-400">·</span>
        <Link href="/admin" className="text-indigo-200 hover:text-white text-sm underline">
          لوحة الإدارة
        </Link>
      </div>
    </div>
  );
}
