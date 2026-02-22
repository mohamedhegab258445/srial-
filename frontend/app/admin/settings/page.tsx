"use client";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { api } from "../../../lib/api";
import { useToast } from "../../../components/ToastProvider";
import { Globe, Phone, MessageSquare, Save, Shield, Wifi, WifiOff, RefreshCw, LogOut } from "lucide-react";

interface SettingsMap { [key: string]: string }

const GROUPS = [
    {
        title: "معلومات الموقع",
        icon: Globe,
        color: "indigo",
        fields: [
            { key: "site_name", label: "اسم الموقع", type: "text", placeholder: "Smart Warranty Tracker", hint: "" },
            { key: "footer_text", label: "نص الفوتر", type: "text", placeholder: "جميع الحقوق محفوظة", hint: "" },
        ]
    },
    {
        title: "معلومات التواصل",
        icon: Phone,
        color: "emerald",
        fields: [
            { key: "support_phone", label: "هاتف الدعم", type: "text", placeholder: "01xxxxxxxxx" },
            { key: "support_email", label: "بريد الدعم", type: "email", placeholder: "support@example.com" },
            { key: "whatsapp_number", label: "واتساب الدعم (للعملاء)", type: "text", placeholder: "201xxxxxxxxx", hint: "بدون + مثال: 201011111111" },
        ]
    },
    {
        title: "رسائل النظام",
        icon: MessageSquare,
        color: "violet",
        fields: [
            { key: "otp_welcome_msg", label: "نص رسالة الـ OTP", type: "textarea", placeholder: "مرحباً 👋\nرمز التحقق: *{code}*", hint: "استخدم {code} مكان الرمز" },
            { key: "ticket_note", label: "ملاحظة التذاكر", type: "textarea", placeholder: "سيتم الرد خلال 24 ساعة" },
        ]
    },
    {
        title: "شروط الضمان",
        icon: Shield,
        color: "amber",
        fields: [
            { key: "warranty_note", label: "ملاحظة الضمان", type: "textarea", placeholder: "الضمان يشمل عيوب التصنيع فقط" },
        ]
    },
];

const colorMap: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-green-50 text-green-600",
};

// ─── UltraMsg Status Card ─────────────────────────────────────────────────────

function UltraMsgStatusCard() {
    const [status, setStatus] = useState<"loading" | "connected" | "error">("loading");
    const [info, setInfo] = useState<{ instance: string; phone?: string } | null>(null);

    const checkStatus = useCallback(async () => {
        setStatus("loading");
        try {
            const r = await api.get("/api/admin/settings/whatsapp-status");
            if (r.data.configured) {
                setStatus("connected");
                setInfo({ instance: r.data.instance, phone: r.data.phone });
            } else {
                setStatus("error");
            }
        } catch {
            setStatus("error");
        }
    }, []);

    useEffect(() => { checkStatus(); }, [checkStatus]);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                        <MessageSquare size={18} />
                    </div>
                    <div>
                        <h2 className="font-semibold text-slate-700">واتساب OTP — UltraMsg</h2>
                        <p className="text-xs text-slate-400">إرسال رموز التحقق عبر واتساب</p>
                    </div>
                </div>
                <button onClick={checkStatus} className="btn btn-ghost btn-sm flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
                    <RefreshCw size={13} /> تحديث
                </button>
            </div>

            <div className="p-6">
                {status === "loading" ? (
                    <div className="flex justify-center py-8">
                        <div className="w-8 h-8 border-4 border-green-200 border-t-green-500 rounded-full animate-spin" />
                    </div>
                ) : status === "connected" ? (
                    <div className="text-center space-y-3">
                        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                            <Wifi size={28} className="text-green-500" />
                        </div>
                        <p className="font-bold text-green-700 text-lg">UltraMsg متصل ✅</p>
                        {info?.instance && (
                            <p className="text-sm text-slate-500 font-mono bg-slate-50 rounded-lg px-3 py-1.5 inline-block">
                                Instance: {info.instance}
                            </p>
                        )}
                        <p className="text-xs text-slate-400">سيتم إرسال OTP تلقائياً عبر واتساب</p>
                    </div>
                ) : (
                    <div className="text-center py-6 space-y-3">
                        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto">
                            <WifiOff size={24} className="text-slate-400" />
                        </div>
                        <p className="font-semibold text-slate-600">UltraMsg غير مضبوط</p>
                        <p className="text-sm text-slate-400">أضف ULTRAMSG_INSTANCE و ULTRAMSG_TOKEN في متغيرات البيئة على Render</p>
                        <a
                            href="https://ultramsg.com"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-block text-xs text-indigo-500 hover:underline"
                        >
                            ultramsg.com ←
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}


// ─── Main Settings Page ───────────────────────────────────────────────────────

export default function SettingsPage() {
    const toast = useToast();
    const [settings, setSettings] = useState<SettingsMap>({});
    const [saving, setSaving] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        api.get("/api/admin/settings")
            .then(r => { setSettings(r.data); setLoaded(true); })
            .catch(() => toast.error("تعذر تحميل الإعدادات"));
    }, []);

    const set = (key: string, value: string) =>
        setSettings(prev => ({ ...prev, [key]: value }));

    const handleSave = async () => {
        setSaving(true);
        try {
            const items = Object.entries(settings).map(([key, value]) => ({ key, value }));
            const r = await api.put("/api/admin/settings", items);
            setSettings(r.data);
            toast.success("تم حفظ الإعدادات ✅");
        } catch { toast.error("فشل حفظ الإعدادات"); }
        finally { setSaving(false); }
    };

    if (!loaded) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-6 max-w-3xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">إعدادات الموقع</h1>
                    <p className="text-sm text-slate-500 mt-0.5">تحكم في معلومات وإعدادات النظام</p>
                </div>
                <button onClick={handleSave} disabled={saving} className="btn btn-primary px-6">
                    <Save size={16} />
                    {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
                </button>
            </div>

            {/* ── WhatsApp QR Card (top, prominent) ── */}
            <UltraMsgStatusCard />

            {/* ── Settings groups ── */}
            {GROUPS.map(group => {
                const Icon = group.icon;
                return (
                    <div key={group.title} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-50">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colorMap[group.color]}`}>
                                <Icon size={18} />
                            </div>
                            <h2 className="font-semibold text-slate-700">{group.title}</h2>
                        </div>

                        <div className="p-6 space-y-4">
                            {group.fields.map(field => (
                                <div key={field.key}>
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">
                                        {field.label}
                                    </label>
                                    {field.type === "textarea" ? (
                                        <textarea
                                            className="input resize-none"
                                            rows={3}
                                            placeholder={field.placeholder}
                                            value={settings[field.key] || ""}
                                            onChange={e => set(field.key, e.target.value)}
                                        />
                                    ) : (
                                        <input
                                            type={field.type}
                                            className="input"
                                            placeholder={field.placeholder}
                                            value={settings[field.key] || ""}
                                            onChange={e => set(field.key, e.target.value)}
                                        />
                                    )}
                                    {field.hint && (
                                        <p className="text-xs text-slate-400 mt-1">{field.hint}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}

            <div className="flex justify-end pb-4">
                <button onClick={handleSave} disabled={saving} className="btn btn-primary px-8">
                    <Save size={16} />
                    {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
                </button>
            </div>
        </div>
    );
}
