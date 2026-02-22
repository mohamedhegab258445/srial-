"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextValue {
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
    warning: (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
    success: () => { },
    error: () => { },
    info: () => { },
    warning: () => { },
});

export function useToast() {
    return useContext(ToastContext);
}

const icons = {
    success: <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />,
    error: <XCircle size={18} className="text-red-500 flex-shrink-0" />,
    warning: <AlertCircle size={18} className="text-yellow-500 flex-shrink-0" />,
    info: <Info size={18} className="text-blue-500 flex-shrink-0" />,
};

const bg: Record<ToastType, string> = {
    success: "bg-emerald-50 border-emerald-200",
    error: "bg-red-50 border-red-200",
    warning: "bg-yellow-50 border-yellow-200",
    info: "bg-blue-50 border-blue-200",
};

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    let counter = 0;

    const addToast = useCallback((message: string, type: ToastType) => {
        const id = ++counter + Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    }, []);

    const ctx: ToastContextValue = {
        success: (msg) => addToast(msg, "success"),
        error: (msg) => addToast(msg, "error"),
        info: (msg) => addToast(msg, "info"),
        warning: (msg) => addToast(msg, "warning"),
    };

    return (
        <ToastContext.Provider value={ctx}>
            {children}
            {/* Toast container */}
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
                {toasts.map(t => (
                    <div
                        key={t.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg text-sm font-medium text-slate-700 animate-[slideDown_0.3s_ease] ${bg[t.type]} pointer-events-auto`}
                    >
                        {icons[t.type]}
                        <span className="flex-1">{t.message}</span>
                        <button onClick={() => setToasts(p => p.filter(x => x.id !== t.id))}>
                            <X size={14} className="text-slate-400" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
