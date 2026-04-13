import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Control de acceso — camiones",
  description: "Dashboard en tiempo real",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body style={{ margin: 0, background: "#f9fafb", fontFamily: "sans-serif" }}>
        {children}
      </body>
    </html>
  );
}