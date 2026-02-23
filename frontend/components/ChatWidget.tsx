"use client";

import React, { useState, useRef, useEffect } from "react";

type Message = {
    role: "user" | "model";
    parts: string[];
};

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: "model", parts: ["أهلاً بك في مودرن هوم! كيف يمكنني مساعدتك اليوم؟"] },
    ]);
    const [inputVal, setInputVal] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!inputVal.trim() || isLoading) return;

        const userMsg: Message = { role: "user", parts: [inputVal] };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInputVal("");
        setIsLoading(true);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const res = await fetch(`${apiUrl}/chat/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: newMessages }),
            });

            if (!res.ok) {
                throw new Error("فشل الاتصال بالخادم");
            }

            const data = await res.json();
            setMessages([...newMessages, { role: "model", parts: [data.reply] }]);
        } catch (error) {
            console.error(error);
            setMessages([
                ...newMessages,
                { role: "model", parts: ["عذراً، حدث خطأ أثناء الاتصال. يرجى المحاولة لاحقاً."] },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999]">
            {/* Chat Window */}
            {isOpen && (
                <div className="mb-4 w-[90vw] sm:w-[400px] bg-white rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden flex flex-col h-[550px] max-h-[85vh] transition-all transform origin-bottom-right animate-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex justify-between items-center z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30 shadow-sm">
                                <span className="text-xl">🤖</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg leading-none">مساعد مودرن هوم</h3>
                                <p className="text-blue-100 text-xs mt-1 opacity-90">متصل الآن ومستعد للمساعدة</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-white hover:text-gray-100 transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-sm"
                            aria-label="إغلاق"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 p-5 overflow-y-auto bg-[#F8FAFC] flex flex-col gap-4 scroll-smooth">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div
                                    className={`max-w-[85%] p-3.5 rounded-2xl leading-relaxed text-[15px] shadow-sm ${msg.role === "user"
                                            ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-sm"
                                            : "bg-white text-gray-800 rounded-bl-sm border border-gray-100"
                                        }`}
                                    style={{ whiteSpace: "pre-wrap" }}
                                >
                                    {msg.parts[0]}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white text-gray-500 p-4 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100 flex gap-1.5 w-16 justify-center items-center h-[46px]">
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }}></div>
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }}></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t border-gray-100 shadow-[0_-5px_15px_rgba(0,0,0,0.02)]">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSend();
                            }}
                            className="flex gap-2 relative bg-gray-50 rounded-2xl p-1.5 border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all"
                        >
                            <input
                                type="text"
                                value={inputVal}
                                onChange={(e) => setInputVal(e.target.value)}
                                placeholder="اسألني عن أي شيء..."
                                className="flex-1 p-2.5 bg-transparent text-sm focus:outline-none placeholder-gray-400 pr-3"
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !inputVal.trim()}
                                className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 flex items-center justify-center transform disabled:hover:scale-100 hover:scale-105"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform -rotate-45 ml-0.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                </svg>
                            </button>
                        </form>
                        <div className="text-center mt-2.5">
                            <span className="text-[10px] text-gray-400">تدعمه تقنيات الذكاء الاصطناعي ✨</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-4 sm:p-5 rounded-full shadow-[0_8px_25px_rgba(37,99,235,0.4)] transition-all hover:scale-110 transform active:scale-95 relative group flex items-center justify-center border-2 border-white/20"
                    aria-label="محادثة الدعم"
                >
                    {/* Main Icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 sm:h-8 sm:w-8 transition-all duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>

                    {/* Notification Dot */}
                    <span className="absolute top-0 right-0 -mr-1 -mt-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                </button>
            )}
        </div>
    );
}
