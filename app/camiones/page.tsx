"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue, set, remove, push } from "firebase/database";

interface Camion {
  id: string;
  patente: string;
  estado: "autorizado" | "pendiente" | "revocado";
  agregado: number;
  ultimaEntrada?: number;
}

type FormState = { patente: string };
const empty: FormState = { patente: "" };

export default function CamionesPage() {
  const [camiones, setCamiones]   = useState<Camion[]>([]);
  const [pendientes, setPendientes] = useState<Record<string, any>>({});
  const [form, setForm]           = useState<FormState>(empty);
  const [editId, setEditId]       = useState<string | null>(null);
  const [error, setError]         = useState("");
  const [busqueda, setBusqueda]   = useState("");

  useEffect(() => {
    return onValue(ref(db, "patentes_autorizadas"), snap => {
      const data = snap.val() || {};
      setCamiones(
        Object.entries(data).map(([id, v]: any) => ({ id, ...v }))
          .sort((a: any, b: any) => b.agregado - a.agregado)
      );
    });
  }, []);

  useEffect(() => {
    return onValue(ref(db, "patentes_pendientes"), snap => {
      setPendientes(snap.val() || {});
    });
  }, []);

  const guardar = async () => {
    const p = form.patente.trim().toUpperCase();
    if (!p) return setError("Ingresa una patente");
    if (!editId && camiones.find(c => c.id === p)) return setError("Patente ya existe");
    await set(ref(db, `patentes_autorizadas/${p}`), {
      patente: p,
      estado: "autorizado",
      agregado: editId ? (camiones.find(c => c.id === editId)?.agregado ?? Date.now()) : Date.now(),
    });
    if (editId && editId !== p) await remove(ref(db, `patentes_autorizadas/${editId}`));
    setForm(empty); setEditId(null); setError("");
  };

  const editar = (c: Camion) => { setEditId(c.id); setForm({ patente: c.patente }); };

  const eliminar = async (id: string) => {
    if (!confirm(`¿Revocar camión ${id}?`)) return;
    await remove(ref(db, `patentes_autorizadas/${id}`));
    await push(ref(db, "eventos"), { tipo: "revocado", patente: id, timestamp: Date.now() });
  };

  const aprobarPendiente = async (pat: string) => {
    await set(ref(db, `patentes_autorizadas/${pat}`), { patente: pat, estado: "autorizado", agregado: Date.now() });
    await remove(ref(db, `patentes_pendientes/${pat}`));
    await push(ref(db, "eventos"), { tipo: "aprobacion_portero", patente: pat, timestamp: Date.now() });
  };

  const rechazarPendiente = async (pat: string) => {
    await remove(ref(db, `patentes_pendientes/${pat}`));
    await push(ref(db, "eventos"), { tipo: "rechazo_portero", patente: pat, timestamp: Date.now() });
  };

  const filtrados = camiones.filter(c =>
    c.patente?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1E3A5F", marginBottom: 4 }}>Gestión de camiones</h1>
      <p style={{ color: "#6B7280", fontSize: 13, marginBottom: 24 }}>
        {camiones.length} autorizados · {Object.keys(pendientes).length} pendientes
      </p>

      {/* Pendientes */}
      {Object.keys(pendientes).length > 0 && (
        <div style={{ background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 10, padding: 16, marginBottom: 24 }}>
          <p style={{ fontWeight: 700, color: "#92400E", marginBottom: 12, fontSize: 14 }}>
            Camiones pendientes de aprobación
          </p>
          {Object.entries(pendientes).map(([pat, data]: any) => (
            <div key={pat} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 15 }}>{pat}</span>
              <span style={{ fontSize: 12, color: "#78716C" }}>{new Date(data.timestamp).toLocaleString("es-CL")}</span>
              <button onClick={() => aprobarPendiente(pat)} style={btn("#16A34A")}>Aprobar</button>
              <button onClick={() => rechazarPendiente(pat)} style={btn("#DC2626")}>Rechazar</button>
            </div>
          ))}
        </div>
      )}

      {/* Formulario */}
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #E5E7EB", padding: 20, marginBottom: 24 }}>
        <p style={{ fontWeight: 700, color: "#1E3A5F", marginBottom: 12, fontSize: 14 }}>
          {editId ? `Editando: ${editId}` : "Registrar nuevo camión"}
        </p>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label style={labelStyle}>Patente</label>
            <input value={form.patente} onChange={e => setForm({ patente: e.target.value.toUpperCase() })}
              placeholder="ABC123" maxLength={8}
              style={{ ...inputStyle, fontFamily: "monospace", textTransform: "uppercase" }} />
          </div>
          <button onClick={guardar} style={btn("#2563EB")}>
            {editId ? "Guardar cambios" : "Agregar camión"}
          </button>
          {editId && (
            <button onClick={() => { setEditId(null); setForm(empty); setError(""); }}
              style={btn("#6B7280")}>Cancelar</button>
          )}
        </div>
        {error && <p style={{ color: "#DC2626", fontSize: 12, marginTop: 8 }}>{error}</p>}
      </div>

      {/* Tabla */}
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #E5E7EB", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #F3F4F6", display: "flex", gap: 10 }}>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por patente..." style={{ ...inputStyle, width: 220 }} />
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#F8FAFC" }}>
              {["Patente", "Estado", "Registrado", "Última entrada", "Acciones"].map(h => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "#374151", fontWeight: 600, fontSize: 13 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map(c => (
              <tr key={c.id} style={{ borderTop: "1px solid #F3F4F6" }}>
                <td style={{ padding: "10px 16px", fontFamily: "monospace", fontWeight: 700 }}>{c.patente}</td>
                <td style={{ padding: "10px 16px" }}>
                  <span style={{ background: "#DCFCE7", color: "#166534", borderRadius: 99, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
                    Autorizado
                  </span>
                </td>
                <td style={{ padding: "10px 16px", color: "#6B7280", fontSize: 13 }}>
                  {new Date(c.agregado).toLocaleDateString("es-CL")}
                </td>
                <td style={{ padding: "10px 16px", color: "#6B7280", fontSize: 13 }}>
                  {c.ultimaEntrada ? new Date(c.ultimaEntrada).toLocaleDateString("es-CL") : "—"}
                </td>
                <td style={{ padding: "10px 16px", display: "flex", gap: 6 }}>
                  <button onClick={() => editar(c)} style={btn("#2563EB", true)}>Editar</button>
                  <button onClick={() => eliminar(c.id)} style={btn("#DC2626", true)}>Revocar</button>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#9CA3AF" }}>Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, color: "#374151", marginBottom: 4, fontWeight: 600 };
const inputStyle: React.CSSProperties = { padding: "8px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 14, outline: "none" };
const btn = (bg: string, small = false): React.CSSProperties => ({
  background: bg, color: "#fff", border: "none", borderRadius: 6,
  padding: small ? "4px 12px" : "8px 18px", cursor: "pointer",
  fontSize: small ? 12 : 14, fontWeight: 600,
});