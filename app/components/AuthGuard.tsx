"use client";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    return onAuthStateChanged(auth, user => {
      if (!user && pathname !== "/login") {
        router.replace("/login");
      } else if (user && pathname === "/login") {
        router.replace("/");
      }
      setChecking(false);
    });
  }, [pathname, router]);

  if (checking) {
    return (
      <div style={{
        minHeight: "100vh", background: "#0F172A",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 40, height: 40, border: "3px solid #334155",
            borderTop: "3px solid #2563EB", borderRadius: "50%",
            animation: "spin 0.8s linear infinite", margin: "0 auto 12px",
          }}/>
          <p style={{ color: "#475569", fontSize: 13, fontFamily: "Arial" }}>Verificando acceso...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (pathname === "/login") return <>{children}</>;
  if (!auth.currentUser) return null;
  return <>{children}</>;
}