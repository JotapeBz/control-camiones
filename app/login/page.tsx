"use client";
import { useState } from "react";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  const login = async () => {
    if (!email || !password) return setError("Completa todos los campos");
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (e: any) {
      const msgs: Record<string, string> = {
        "auth/invalid-credential":    "Email o contraseña incorrectos",
        "auth/user-not-found":        "Usuario no encontrado",
        "auth/wrong-password":        "Contraseña incorrecta",
        "auth/too-many-requests":     "Demasiados intentos, espera un momento",
        "auth/invalid-email":         "Email inválido",
      };
      setError(msgs[e.code] ?? "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0F172A",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Arial, sans-serif",
    }}>
      {/* Fondo decorativo */}
      <div style={{
        position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none",
      }}>
        <div style={{ position:"absolute", top:-120, left:-120, width:400, height:400, borderRadius:"50%", background:"#1E3A5F", opacity:0.4 }}/>
        <div style={{ position:"absolute", bottom:-80, right:-80, width:300, height:300, borderRadius:"50%", background:"#1E3A5F", opacity:0.3 }}/>
      </div>

      <div style={{
        background: "#1E293B", borderRadius: 16,
        padding: "40px 44px", width: "100%", maxWidth: 400,
        border: "1px solid #334155", position: "relative",
      }}>
        {/* Logo / título */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, background: "#2563EB",
            margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 style={{ color: "#F8FAFC", fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>
            Control de Planta
          </h1>
          <p style={{ color: "#94A3B8", fontSize: 13, margin: 0 }}>
            Acceso solo para administradores
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: "#450A0A", border: "1px solid #DC2626",
            borderRadius: 8, padding: "10px 14px", marginBottom: 20,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ color: "#FCA5A5", fontSize: 18, lineHeight: 1 }}>!</span>
            <p style={{ color: "#FCA5A5", fontSize: 13, margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Campos */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", color: "#CBD5E1", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Correo electrónico
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && login()}
            placeholder="admin@empresa.cl"
            style={{
              width: "100%", padding: "11px 14px", borderRadius: 8,
              background: "#0F172A", border: "1px solid #334155",
              color: "#F8FAFC", fontSize: 14, outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.2s",
            }}
            onFocus={e => e.target.style.borderColor = "#2563EB"}
            onBlur={e => e.target.style.borderColor = "#334155"}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", color: "#CBD5E1", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && login()}
            placeholder="••••••••"
            style={{
              width: "100%", padding: "11px 14px", borderRadius: 8,
              background: "#0F172A", border: "1px solid #334155",
              color: "#F8FAFC", fontSize: 14, outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={e => e.target.style.borderColor = "#2563EB"}
            onBlur={e => e.target.style.borderColor = "#334155"}
          />
        </div>

        <button
          onClick={login}
          disabled={loading}
          style={{
            width: "100%", padding: "12px", borderRadius: 8,
            background: loading ? "#1D4ED8" : "#2563EB",
            color: "#fff", border: "none", fontSize: 15,
            fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.8 : 1, transition: "background 0.2s",
          }}
        >
          {loading ? "Iniciando sesión..." : "Iniciar sesión"}
        </button>

        <p style={{ color: "#475569", fontSize: 12, textAlign: "center", marginTop: 24, marginBottom: 0 }}>
          Sistema de gestión IoT — Industria 4.0
        </p>
      </div>
    </div>
  );
}