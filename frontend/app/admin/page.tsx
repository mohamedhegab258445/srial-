"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminLogin } from "../../lib/api";
import { ShieldCheck, Lock, User } from "lucide-react";

export default function AdminLoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setError("");
        try {
            const res = await adminLogin(username, password);
            localStorage.setItem("admin_token", res.data.access_token);
            router.push("/admin/dashboard");
        } catch {
            setError("اسم المستخدم أو كلمة المرور غير صحيحة");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-scan-gradient flex items-center justify-center px-4">
            <div className="glass w-full max-w-sm p-8 space-y-6">
                <div className="text-center">
                    <div className="inline-flex w-14 h-14 items-center justify-center bg-indigo-600 rounded-2xl mb-4">
                        <ShieldCheck size={28} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">لوحة الإدارة</h1>
                    <p className="text-slate-500 text-sm mt-1">مودرن هوم</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">اسم المستخدم</label>
                        <div className="relative">
                            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input id="username" className="input pl-9" value={username} onChange={e => setUsername(e.target.value)} required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">كلمة المرور</label>
                        <div className="relative">
                            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input id="password" type="password" className="input pl-9" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                        </div>
                    </div>
                    {error && <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-2">{error}</p>}
                    <button type="submit" disabled={loading} className="btn btn-primary w-full py-3">
                        {loading ? "جاري التحقق..." : "دخول"}
                    </button>
                </form>

            </div>
        </div>
    );
}
