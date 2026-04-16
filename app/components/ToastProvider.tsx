"use client";
import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue, query, orderByChild, limitToLast } from "firebase/database";

interface Toast {
  id: number;
  tipo: "permitido" | "denegado" | "pendiente" | "espacio_libre" | "sin_espacio";
  patente: string;
  mensaje: string;
}

const ToastCtx = createContext<{ agregar: (t: Omit<Toast,"id">) => void }>({ agregar: () => {} });
export const useToast = () => useContext(ToastCtx);

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const lastTs = useRef<number>(Date.now());

  const agregar = useCallback((t: Omit<Toast,"id">) => {
    const id = Date.now();
    setToasts(prev => [...prev, { ...t, id }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 6000);
  }, []);

  // Escuchar eventos nuevos de Firebase en tiempo real
  useEffect(() => {
    const q = query(ref(db, "eventos"), orderByChild("timestamp"), limitToLast(1));
    return onValue(q, snap => {
      snap.forEach(child => {
        const e = child.val();
        if (!e || e.timestamp <= lastTs.current) return;
        lastTs.current = e.timestamp;

        if (e.estado === "permitido" && e.espacio) {
          agregar({ tipo: "permitido", patente: e.patente, mensaje: `Espacio ${e.espacio} asignado (${e.horario === "manana" ? "mañana" : "tarde"})` });
        } else if (e.estado === "permitido" && e.espaciosLibres > 0) {
          agregar({ tipo: "espacio_libre", patente: e.patente, mensaje: e.mensaje });
        } else if (e.estado === "permitido" && e.espaciosLibres === 0) {
          agregar({ tipo: "sin_espacio", patente: e.patente, mensaje: e.mensaje });
        } else if (e.estado === "pendiente_revision") {
          agregar({ tipo: "pendiente", patente: e.patente, mensaje: "Requiere aprobación del portero" });
        } else if (e.estado === "denegado") {
          agregar({ tipo: "denegado", patente: e.patente, mensaje: "Acceso denegado" });
        }
      });
    });
  }, [agregar]);

  const estilos: Record<Toast["tipo"], { bg: string; border: string; icon: string; titulo: string }> = {
    permitido:    { bg: "#F0FDF4", border: "#16A34A", icon: "✓", titulo: "Camión autorizado"   },
    espacio_libre:{ bg: "#EFF6FF", border: "#2563EB", icon: "P", titulo: "Autorizado sin reserva"},
    sin_espacio:  { bg: "#FEF2F2", border: "#DC2626", icon: "!", titulo: "Sin espacios libres"  },
    pendiente:    { bg: "#FFFBEB", border: "#D97706", icon: "?", titulo: "Pendiente aprobación" },
    denegado:     { bg: "#FEF2F2", border: "#DC2626", icon: "✕", titulo: "Acceso denegado"      },
  };

  return (
    <ToastCtx.Provider value={{ agregar }}>
      {children}
      {/* Contenedor toasts — esquina superior derecha */}
      <div style={{ position: "fixed", top: 70, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10, maxWidth: 340 }}>
        {toasts.map(t => {
          const s = estilos[t.tipo];
          return (
            <div key={t.id} style={{
              background: s.bg, borderLeft: `4px solid ${s.border}`,
              borderRadius: 10, padding: "14px 16px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
              animation: "slideIn 0.3s ease",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{
                  width: 24, height: 24, borderRadius: "50%", background: s.border,
                  color: "#fff", fontSize: 13, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                }}>{s.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 14, color: "#111827" }}>{s.titulo}</p>
                  <p style={{ margin: "0 0 2px", fontFamily: "monospace", fontSize: 15, fontWeight: 700, color: s.border }}>{t.patente}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "#6B7280" }}>{t.mensaje}</p>
                </div>
                <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#9CA3AF", padding: 0 }}>✕</button>
              </div>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity:0 } to { transform: translateX(0); opacity:1 } }`}</style>
    </ToastCtx.Provider>
  );
}