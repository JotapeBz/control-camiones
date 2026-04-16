import type { Metadata } from "next";
import Navbar from "./components/navbar";
import ToastProvider from "./components/ToastProvider";

export const metadata: Metadata = {
  title: "Control de Acceso — Planta",
  description: "Sistema IoT gestión camiones",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, background: "#F0F4F8", fontFamily: "Arial, sans-serif" }}>
        <ToastProvider>
          <Navbar />
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1rem" }}>
            {children}
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}