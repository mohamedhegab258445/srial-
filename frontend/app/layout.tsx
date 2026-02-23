import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "../components/ToastProvider";
import ChatWidget from "../components/ChatWidget";

export const metadata: Metadata = {
  title: "مودرن هوم | فحص الضمان",
  description: "تحقق من ضمان منتجاتك وفواتيرك بسهولة — مودرن هوم.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="auto">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
        <ChatWidget />
      </body>
    </html>
  );
}
