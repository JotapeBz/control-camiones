"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue, set, remove, push } from "firebase/database";

// ── Tipos ──────────────────────────────────────────────
interface Evento {
  id: string;
  tipo: string;
  patente?: string;
  estado?: string;
  mensaje?: string;
  timestamp: number;
}

interface Patente {
  activa: boolean;
  agregada: number;
  ultimaEntrada?: number;
}

interface PatentePendiente {
  patente: string;
  estado: string;
  timestamp: number;
}

// ── Helpers ────────────────────────────────────────────
function colorEstado(tipo: string, estado?: string): string {
  const key = estado ?? tipo;
  if (key === "permitido" || key === "aprobacion_portero") return "#16a34a";
  if (key === "denegado" || key === "rechazo_portero")     return "#dc2626";
  if (key === "pendiente_revision")                         return "#d97706";
  if (key === "deteccion")                                  return "#2563eb";
  return "#6b7280";
}

function etiqueta(tipo: string, estado?: string): string {
  const key = estado ?? tipo;
  const map: Record<string, string> = {
    permitido:          "Acceso permitido",
    denegado:           "Acceso denegado",
    pendiente_revision: "Pendiente revisión",
    aprobacion_portero: "Aprobado por portero",
    rechazo_portero:    "Rechazado por portero",
    deteccion:          "Vehículo detectado",
  };
  return map[key] ?? key;
}

function formatFecha(ts: number): string {
  return new Date(ts).toLocaleString("es-CL", {
    day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

// ── Componente principal ───────────────────────────────
export default function Dashboard() {
  const [eventos, setEventos]       = useState<Evento[]>([]);
  const [autorizadas, setAutorizadas] = useState<Record<string, Patente>>({});
  const [pendientes, setPendientes]   = useState<Record<string, PatentePendiente>>({});
  const [nuevaPatente, setNuevaPatente] = useState<string>("");
  const [error, setError]           = useState<string>("");

  // Eventos en tiempo real
  useEffect(() => {
    return onValue(ref(db, "eventos"), (snap) => {
      const data = snap.val() as Record<string, Omit<Evento, "id">> | null;
      if (!data) return setEventos([]);
      const lista = Object.entries(data)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 20);
      setEventos(lista);
    });
  }, []);

  // Patentes autorizadas
  useEffect(() => {
    return onValue(ref(db, "patentes_autorizadas"), (snap) => {
      setAutorizadas((snap.val() as Record<string, Patente>) ?? {});
    });
  }, []);

  // Patentes pendientes
  useEffect(() => {
    return onValue(ref(db, "patentes_pendientes"), (snap) => {
      setPendientes((snap.val() as Record<string, PatentePendiente>) ?? {});
    });
  }, []);

  // ── Acciones ──
  const agregarPatente = async (): Promise<void> => {
    const p = nuevaPatente.trim().toUpperCase();
    if (!p) { setError("Ingresa una patente válida"); return; }
    if (autorizadas[p]) { setError("Esa patente ya está autorizada"); return; }
    await set(ref(db, `patentes_autorizadas/${p}`), {
      activa: true,
      agregada: Date.now(),
    });
    setNuevaPatente("");
    setError("");
  };

  const revocarPatente = async (patente: string): Promise<void> => {
    await remove(ref(db, `patentes_autorizadas/${patente}`));
  };

  const aprobarPendiente = async (patente: string): Promise<void> => {
    await set(ref(db, `patentes_autorizadas/${patente}`), {
      activa: true,
      agregada: Date.now(),
    });
    await remove(ref(db, `patentes_pendientes/${patente}`));
    await push(ref(db, "eventos"), {
      tipo: "aprobacion_portero",
      patente,
      timestamp: Date.now(),
    });
  };

  const rechazarPendiente = async (patente: string): Promise<void> => {
    await remove(ref(db, `patentes_pendientes/${patente}`));
    await push(ref(db, "eventos"), {
      tipo: "rechazo_portero",
      patente,
      timestamp: Date.now(),
    });
  };

  const pendientesLista = Object.entries(pendientes);
  const autorizadasLista = Object.entries(autorizadas);

  // ── Render ──
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1rem" }}>

      <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: "0.25rem" }}>
        Control de acceso — camiones
      </h1>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: "1.5rem" }}>
        Dashboard en tiempo real · Firebase Realtime DB
      </p>

      {/* ── Pendientes ── */}
      {pendientesLista.length > 0 && (
        <section style={{
          background: "#fffbeb", border: "1px solid #fbbf24",
          borderRadius: 10, padding: "1rem 1.25rem", marginBottom: "1.5rem",
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 500, color: "#92400e", marginBottom: "0.75rem" }}>
            Patentes pendientes de revisión ({pendientesLista.length})
          </h2>
          {pendientesLista.map(([pat, data]) => (
            <div key={pat} style={{
              display: "flex", alignItems: "center", flexWrap: "wrap",
              gap: 10, padding: "8px 0", borderBottom: "1px solid #fde68a",
            }}>
              <span style={{ fontFamily: "monospace", fontWeight: 600, fontSize: 15 }}>{pat}</span>
              <span style={{ fontSize: 12, color: "#78716c" }}>{formatFecha(data.timestamp)}</span>
              <button onClick={() => aprobarPendiente(pat)} style={btnStyle("#16a34a")}>
                Aprobar
              </button>
              <button onClick={() => rechazarPendiente(pat)} style={btnStyle("#dc2626")}>
                Rechazar
              </button>
            </div>
          ))}
        </section>
      )}

      {/* ── Grid principal ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>

        {/* Eventos */}
        <section>
          <h2 style={{ fontSize: 15, fontWeight: 500, marginBottom: "0.75rem" }}>
            Eventos en tiempo real
          </h2>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
            {eventos.length === 0 && (
              <p style={{ padding: "1.25rem", color: "#9ca3af", fontSize: 13, textAlign: "center" }}>
                Sin eventos aún
              </p>
            )}
            {eventos.map((e) => (
              <div key={e.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 14px", borderBottom: "1px solid #f3f4f6", background: "#fff",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    width: 9, height: 9, borderRadius: "50%",
                    background: colorEstado(e.tipo, e.estado),
                    display: "inline-block", flexShrink: 0,
                  }} />
                  <span style={{ fontFamily: "monospace", fontWeight: 600, fontSize: 14 }}>
                    {e.patente ?? "—"}
                  </span>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>
                    {etiqueta(e.tipo, e.estado)}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap" }}>
                  {formatFecha(e.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Patentes autorizadas */}
        <section>
          <h2 style={{ fontSize: 15, fontWeight: 500, marginBottom: "0.75rem" }}>
            Patentes autorizadas
          </h2>

          {/* Input agregar */}
          <div style={{ display: "flex", gap: 8, marginBottom: "0.75rem" }}>
            <input
              value={nuevaPatente}
              onChange={(e) => setNuevaPatente(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && agregarPatente()}
              placeholder="Ej: ABC123"
              maxLength={8}
              style={{
                flex: 1, padding: "8px 12px", borderRadius: 8,
                border: "1px solid #d1d5db", fontFamily: "monospace",
                fontSize: 14, textTransform: "uppercase", outline: "none",
              }}
            />
            <button onClick={agregarPatente} style={btnStyle("#2563eb")}>
              Agregar
            </button>
          </div>

          {error && (
            <p style={{ fontSize: 12, color: "#dc2626", marginBottom: "0.5rem" }}>{error}</p>
          )}

          <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
            {autorizadasLista.length === 0 && (
              <p style={{ padding: "1.25rem", color: "#9ca3af", fontSize: 13, textAlign: "center" }}>
                Sin patentes registradas
              </p>
            )}
            {autorizadasLista.map(([pat, data]) => (
              <div key={pat} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 14px", borderBottom: "1px solid #f3f4f6", background: "#fff",
              }}>
                <div>
                  <span style={{ fontFamily: "monospace", fontWeight: 600, fontSize: 14 }}>{pat}</span>
                  {data.ultimaEntrada && (
                    <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 8 }}>
                      Última entrada: {formatFecha(data.ultimaEntrada)}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => revocarPatente(pat)}
                  style={{
                    background: "transparent", color: "#dc2626",
                    border: "1px solid #fca5a5", borderRadius: 6,
                    padding: "3px 10px", cursor: "pointer", fontSize: 12,
                  }}
                >
                  Revocar
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

// ── Estilos reutilizables ──────────────────────────────
function btnStyle(bg: string): React.CSSProperties {
  return {
    background: bg, color: "#fff", border: "none",
    borderRadius: 6, padding: "5px 14px",
    cursor: "pointer", fontSize: 13, fontWeight: 500,
  };
}