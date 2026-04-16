"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";

interface Evento {
  id: string; tipo: string; patente?: string;
  estado?: string; mensaje?: string; timestamp: number;
}

const COLORES: Record<string, { bg: string; color: string; label: string }> = {
  permitido:          { bg: "#DCFCE7", color: "#166534", label: "Permitido"          },
  denegado:           { bg: "#FEE2E2", color: "#991B1B", label: "Denegado"           },
  pendiente_revision: { bg: "#FEF3C7", color: "#92400E", label: "Pendiente revisión" },
  aprobacion_portero: { bg: "#DBEAFE", color: "#1E40AF", label: "Aprobado portero"   },
  rechazo_portero:    { bg: "#FEE2E2", color: "#991B1B", label: "Rechazado portero"  },
  deteccion:          { bg: "#E0E7FF", color: "#3730A3", label: "Detección"          },
  revocado:           { bg: "#F3F4F6", color: "#374151", label: "Revocado"           },
};

export default function HistorialPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [filtro, setFiltro]   = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    return onValue(ref(db, "eventos"), snap => {
      const data = snap.val() || {};
      setEventos(
        Object.entries(data).map(([id, v]: any) => ({ id, ...v }))
          .sort((a: any, b: any) => b.timestamp - a.timestamp)
      );
    });
  }, []);

  const tipos = ["todos", ...Array.from(new Set(eventos.map(e => e.estado ?? e.tipo)))];

  const filtrados = eventos.filter(e => {
    const key = e.estado ?? e.tipo;
    const matchFiltro = filtro === "todos" || key === filtro;
    const matchBusqueda = !busqueda || e.patente?.toLowerCase().includes(busqueda.toLowerCase());
    return matchFiltro && matchBusqueda;
  });

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1E3A5F", marginBottom: 4 }}>Historial de eventos</h1>
      <p style={{ color: "#6B7280", fontSize: 13, marginBottom: 24 }}>{eventos.length} eventos registrados</p>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar patente..." style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 14, width: 200 }} />
        <select value={filtro} onChange={e => setFiltro(e.target.value)}
          style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 14 }}>
          {tipos.map(t => <option key={t} value={t}>{t === "todos" ? "Todos los tipos" : (COLORES[t]?.label ?? t)}</option>)}
        </select>
        <span style={{ padding: "7px 0", fontSize: 13, color: "#6B7280", alignSelf: "center" }}>
          {filtrados.length} resultados
        </span>
      </div>

      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #E5E7EB", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#F8FAFC" }}>
              {["Fecha y hora", "Patente", "Tipo de evento", ""].map(h => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "#374151", fontWeight: 600, fontSize: 13 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.slice(0, 100).map(e => {
              const key  = e.estado ?? e.tipo;
              const meta = COLORES[key] ?? { bg: "#F3F4F6", color: "#374151", label: key };
              return (
                <tr key={e.id} style={{ borderTop: "1px solid #F3F4F6" }}>
                  <td style={{ padding: "10px 16px", color: "#6B7280", fontSize: 13 }}>
                    {new Date(e.timestamp).toLocaleString("es-CL")}
                  </td>
                  <td style={{ padding: "10px 16px", fontFamily: "monospace", fontWeight: 700 }}>
                    {e.patente ?? "—"}
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{ background: meta.bg, color: meta.color, borderRadius: 99, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
                      {meta.label}
                    </span>
                  </td>
                  <td style={{ padding: "10px 16px", color: "#9CA3AF", fontSize: 12 }}>
                    {e.mensaje ?? ""}
                  </td>
                </tr>
              );
            })}
            {filtrados.length === 0 && (
              <tr><td colSpan={4} style={{ padding: 32, textAlign: "center", color: "#9CA3AF" }}>Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}