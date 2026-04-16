"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue, set, remove } from "firebase/database";

interface Agenda {
  espacio: number;
  fecha: string;
  horario: "manana" | "tarde";
  patente: string;
  nota?: string;
  timestamp: number;
}

const ESPACIOS = Array.from({ length: 10 }, (_, i) => i + 1);
const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

export default function EspaciosPage() {
  const [agendas, setAgendas]     = useState<Record<string, Agenda>>({});
  const [camiones, setCamiones]   = useState<string[]>([]);
  const [fecha, setFecha]         = useState(hoy());
  const [form, setForm]           = useState({ espacio: 1, horario: "manana" as "manana"|"tarde", patente: "", nota: "" });
  const [error, setError]         = useState("");
  const [editKey, setEditKey]     = useState<string | null>(null);

  useEffect(() => {
    return onValue(ref(db, "agendas"), snap => setAgendas(snap.val() || {}));
  }, []);

  useEffect(() => {
    return onValue(ref(db, "patentes_autorizadas"), snap => {
      setCamiones(Object.keys(snap.val() || {}));
    });
  }, []);

  const agendaKey = (esp: number, f: string, h: string) => `${esp}_${f}_${h}`;

  const reservar = async () => {
    const key = editKey ?? agendaKey(form.espacio, fecha, form.horario);
    if (!form.patente) return setError("Selecciona una patente");
    const existente = agendas[key];
    if (!editKey && existente) return setError("Ese espacio ya está reservado");
    await set(ref(db, `agendas/${key}`), {
      espacio: form.espacio, fecha, horario: form.horario,
      patente: form.patente, nota: form.nota, timestamp: Date.now(),
    });
    setForm({ espacio: 1, horario: "manana", patente: "", nota: "" });
    setEditKey(null); setError("");
  };

  const liberar = async (key: string) => {
    if (!confirm("¿Liberar este espacio?")) return;
    await remove(ref(db, `agendas/${key}`));
  };

  const editarReserva = (key: string, a: Agenda) => {
    setEditKey(key);
    setFecha(a.fecha);
    setForm({ espacio: a.espacio, horario: a.horario, patente: a.patente, nota: a.nota || "" });
  };

  // grilla del día seleccionado
  const manana = ESPACIOS.map(e => ({ e, key: agendaKey(e, fecha, "manana"), data: agendas[agendaKey(e, fecha, "manana")] }));
  const tarde  = ESPACIOS.map(e => ({ e, key: agendaKey(e, fecha, "tarde"),  data: agendas[agendaKey(e, fecha, "tarde")]  }));

  const ocupadosHoy = [...manana, ...tarde].filter(x => x.data).length;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1E3A5F", marginBottom: 4 }}>Gestión de espacios</h1>
      <p style={{ color: "#6B7280", fontSize: 13, marginBottom: 24 }}>10 espacios · mañana / tarde</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>

        {/* Grilla */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Fecha:</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 14 }} />
            <span style={{ fontSize: 13, color: "#6B7280" }}>{ocupadosHoy}/20 bloques ocupados</span>
          </div>

          {[{ label: "Mañana (AM)", slots: manana }, { label: "Tarde (PM)", slots: tarde }].map(({ label, slots }) => (
            <div key={label} style={{ marginBottom: 20 }}>
              <p style={{ fontWeight: 700, color: "#1E3A5F", fontSize: 14, marginBottom: 8 }}>{label}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
                {slots.map(({ e, key, data }) => (
                  <div key={key} style={{
                    background: data ? "#FEF2F2" : "#F0FDF4",
                    border: `1px solid ${data ? "#FECACA" : "#BBF7D0"}`,
                    borderRadius: 10, padding: 12, minHeight: 80,
                    display: "flex", flexDirection: "column", justifyContent: "space-between"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: "#374151" }}>E{e}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "2px 7px",
                        background: data ? "#FEE2E2" : "#DCFCE7",
                        color: data ? "#991B1B" : "#166534"
                      }}>{data ? "OCUPADO" : "LIBRE"}</span>
                    </div>
                    {data ? (
                      <div>
                        <p style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, margin: "6px 0 2px" }}>{data.patente}</p>
                        {data.nota && <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>{data.nota}</p>}
                        <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                          <button onClick={() => editarReserva(key, data)} style={btnSm("#2563EB")}>Editar</button>
                          <button onClick={() => liberar(key)} style={btnSm("#DC2626")}>Liberar</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setForm(f => ({ ...f, espacio: e, horario: label.includes("Mañ") ? "manana" : "tarde" })); setEditKey(null); }}
                        style={{ ...btnSm("#2563EB"), marginTop: 8 }}>Reservar</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Formulario lateral */}
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #E5E7EB", padding: 20, alignSelf: "start" }}>
          <p style={{ fontWeight: 700, color: "#1E3A5F", marginBottom: 16, fontSize: 15 }}>
            {editKey ? "Editar reserva" : "Nueva reserva"}
          </p>
          {[
            { label: "Espacio", el: (
              <select value={form.espacio} onChange={e => setForm(f => ({ ...f, espacio: +e.target.value }))} style={selectStyle}>
                {ESPACIOS.map(n => <option key={n} value={n}>Espacio {n}</option>)}
              </select>
            )},
            { label: "Horario", el: (
              <select value={form.horario} onChange={e => setForm(f => ({ ...f, horario: e.target.value as any }))} style={selectStyle}>
                <option value="manana">Mañana (AM)</option>
                <option value="tarde">Tarde (PM)</option>
              </select>
            )},
            { label: "Patente", el: (
              <select value={form.patente} onChange={e => setForm(f => ({ ...f, patente: e.target.value }))} style={selectStyle}>
                <option value="">— Seleccionar —</option>
                {camiones.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )},
            { label: "Nota (opcional)", el: (
              <input value={form.nota} onChange={e => setForm(f => ({ ...f, nota: e.target.value }))}
                placeholder="Ej: Entrega materiales" style={inputStyle2} />
            )},
          ].map(({ label, el }) => (
            <div key={label} style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>{label}</label>
              {el}
            </div>
          ))}
          {error && <p style={{ color: "#DC2626", fontSize: 12, marginBottom: 8 }}>{error}</p>}
          <button onClick={reservar} style={{ ...btnFull("#2563EB"), marginBottom: 8 }}>
            {editKey ? "Guardar cambios" : "Confirmar reserva"}
          </button>
          {editKey && <button onClick={() => { setEditKey(null); setForm({ espacio: 1, horario: "manana", patente: "", nota: "" }); }}
            style={btnFull("#6B7280")}>Cancelar</button>}
        </div>
      </div>
    </div>
  );
}

const btnSm = (bg: string): React.CSSProperties => ({
  background: bg, color: "#fff", border: "none", borderRadius: 5,
  padding: "3px 8px", cursor: "pointer", fontSize: 11, fontWeight: 600,
});
const selectStyle: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 14 };
const inputStyle2: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 14, boxSizing: "border-box" };
const btnFull = (bg: string): React.CSSProperties => ({ background: bg, color: "#fff", border: "none", borderRadius: 8, padding: "10px", cursor: "pointer", fontSize: 14, fontWeight: 600, width: "100%" });