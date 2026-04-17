"use client";
import { useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue, set, remove, push, query, orderByChild, limitToLast } from "firebase/database";

interface Camion {
  id: string; patente: string; estado: string;
  agregado: number; ultimaEntrada?: number;
}
interface Agenda { espacio: number; fecha: string; horario: string; patente: string; }

const ESPACIOS = Array.from({ length: 10 }, (_, i) => i + 1);
const fechaHoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

// ── Modal de notificación de llegada ─────────────────────────
function ModalLlegada({ evento, onClose, onAsignarEspacio }: {
  evento: any; onClose: () => void; onAsignarEspacio: () => void;
}) {
  const tieneEspacio = evento.espacio !== null && evento.espacio !== undefined;
  const sinEspacios  = evento.espaciosLibres === 0 && !tieneEspacio;

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.6)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999
    }}>
      <div style={{
        background:"#fff", borderRadius:16, padding:"32px 36px",
        width:"100%", maxWidth:460, boxShadow:"0 20px 60px rgba(0,0,0,0.3)",
        border:`3px solid ${tieneEspacio ? "#16A34A" : sinEspacios ? "#DC2626" : "#2563EB"}`
      }}>
        {/* Icono */}
        <div style={{ textAlign:"center", marginBottom:20 }}>
          <div style={{
            width:64, height:64, borderRadius:"50%", margin:"0 auto 12px",
            background: tieneEspacio ? "#DCFCE7" : sinEspacios ? "#FEE2E2" : "#DBEAFE",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:28
          }}>
            {tieneEspacio ? "✓" : sinEspacios ? "✕" : "P"}
          </div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:700, color:"#111827" }}>
            {tieneEspacio ? "Camión ingresado" : sinEspacios ? "Sin espacios disponibles" : "Camión autorizado"}
          </h2>
        </div>

        {/* Patente grande */}
        <div style={{
          background:"#F8FAFC", borderRadius:10, padding:"16px",
          textAlign:"center", marginBottom:20, border:"1px solid #E5E7EB"
        }}>
          <p style={{ margin:"0 0 4px", fontSize:12, color:"#6B7280", fontWeight:600 }}>PATENTE</p>
          <p style={{ margin:0, fontFamily:"monospace", fontSize:32, fontWeight:900, color:"#1E3A5F", letterSpacing:4 }}>
            {evento.patente}
          </p>
        </div>

        {/* Mensaje */}
        <p style={{
          textAlign:"center", fontSize:14, color:"#374151",
          background: tieneEspacio ? "#F0FDF4" : sinEspacios ? "#FEF2F2" : "#EFF6FF",
          borderRadius:8, padding:"10px 16px", marginBottom:24
        }}>
          {tieneEspacio
            ? `Camión con patente ${evento.patente} ha ingresado exitosamente al establecimiento. Espacio ${evento.espacio} asignado.`
            : sinEspacios
              ? `Camión autorizado pero no hay espacios disponibles en este horario.`
              : `Camión autorizado sin reserva previa. ${evento.mensaje}`
          }
        </p>

        {/* Botones */}
        <div style={{ display:"flex", gap:10, flexDirection:"column" }}>
          {!tieneEspacio && !sinEspacios && (
            <button onClick={onAsignarEspacio} style={{
              background:"#2563EB", color:"#fff", border:"none", borderRadius:8,
              padding:"12px", fontSize:14, fontWeight:700, cursor:"pointer"
            }}>
              Asignar espacio ahora
            </button>
          )}
          <button onClick={onClose} style={{
            background: tieneEspacio ? "#16A34A" : "#6B7280",
            color:"#fff", border:"none", borderRadius:8,
            padding:"12px", fontSize:14, fontWeight:600, cursor:"pointer"
          }}>
            {tieneEspacio ? "Entendido" : "Cerrar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de asignación de espacio ───────────────────────────
function ModalEspacio({ patente, onClose, onConfirmar }: {
  patente: string; onClose: () => void;
  onConfirmar: (espacio: number, horario: string) => void;
}) {
  const [agendas, setAgendas] = useState<Record<string,any>>({});
  const [espacioSel, setEspacioSel] = useState<number | null>(null);
  const horario = new Date().getHours() < 13 ? "manana" : "tarde";
  const hoy = fechaHoy();

  useEffect(() => {
    return onValue(ref(db,"agendas"), snap => setAgendas(snap.val()||{}));
  }, []);

  const estaOcupado = (e: number) => !!agendas[`${e}_${hoy}_${horario}`];

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.6)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:10000
    }}>
      <div style={{
        background:"#fff", borderRadius:16, padding:"28px 32px",
        width:"100%", maxWidth:500, boxShadow:"0 20px 60px rgba(0,0,0,0.3)"
      }}>
        <h2 style={{ margin:"0 0 4px", fontSize:18, fontWeight:700, color:"#1E3A5F" }}>
          Asignar espacio
        </h2>
        <p style={{ margin:"0 0 20px", fontSize:13, color:"#6B7280" }}>
          Patente <strong style={{ fontFamily:"monospace" }}>{patente}</strong> · {horario === "manana" ? "Mañana AM" : "Tarde PM"}
        </p>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, marginBottom:24 }}>
          {ESPACIOS.map(e => {
            const ocupado = estaOcupado(e);
            const sel     = espacioSel === e;
            return (
              <button key={e} disabled={ocupado} onClick={() => setEspacioSel(e)} style={{
                padding:"16px 0", borderRadius:10, border:`2px solid ${sel ? "#2563EB" : ocupado ? "#FECACA" : "#E5E7EB"}`,
                background: sel ? "#DBEAFE" : ocupado ? "#FEF2F2" : "#F8FAFC",
                color: sel ? "#1E40AF" : ocupado ? "#991B1B" : "#374151",
                fontWeight:700, fontSize:15, cursor: ocupado ? "not-allowed" : "pointer"
              }}>
                E{e}
                <div style={{ fontSize:9, fontWeight:600, marginTop:4, color: sel ? "#2563EB" : ocupado ? "#DC2626" : "#9CA3AF" }}>
                  {ocupado ? "OCUPADO" : sel ? "ELEGIDO" : "LIBRE"}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={() => espacioSel && onConfirmar(espacioSel, horario)}
            disabled={!espacioSel}
            style={{
              flex:1, background: espacioSel ? "#16A34A" : "#D1D5DB",
              color:"#fff", border:"none", borderRadius:8,
              padding:"12px", fontSize:14, fontWeight:700,
              cursor: espacioSel ? "pointer" : "not-allowed"
            }}>
            Confirmar espacio {espacioSel ? `E${espacioSel}` : ""}
          </button>
          <button onClick={onClose} style={{
            background:"#6B7280", color:"#fff", border:"none",
            borderRadius:8, padding:"12px 20px", fontSize:14, cursor:"pointer"
          }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────
export default function CamionesPage() {
  const [camiones, setCamiones]     = useState<Camion[]>([]);
  const [pendientes, setPendientes] = useState<Record<string,any>>({});
  const [form, setForm]             = useState({ patente:"" });
  const [editId, setEditId]         = useState<string|null>(null);
  const [error, setError]           = useState("");
  const [busqueda, setBusqueda]     = useState("");

  // Modales
  const [modalLlegada, setModalLlegada]   = useState<any|null>(null);
  const [modalEspacio, setModalEspacio]   = useState<string|null>(null);
  const lastTs = useRef<number>(Date.now());

  // Cargar camiones autorizados
  useEffect(() => {
    return onValue(ref(db,"patentes_autorizadas"), snap => {
      const data = snap.val() || {};
      setCamiones(
        Object.entries(data).map(([id,v]:any) => ({ id, ...v }))
          .sort((a:any,b:any) => b.agregado - a.agregado)
      );
    });
  }, []);

  // Cargar pendientes
  useEffect(() => {
    return onValue(ref(db,"patentes_pendientes"), snap => setPendientes(snap.val()||{}));
  }, []);

  // Escuchar eventos nuevos → disparar modal
  useEffect(() => {
    const q = query(ref(db,"eventos"), orderByChild("timestamp"), limitToLast(1));
    return onValue(q, snap => {
      snap.forEach(child => {
        const e = child.val();
        if (!e || e.timestamp <= lastTs.current) return;
        lastTs.current = e.timestamp;
        if (e.tipo === "entrada") setModalLlegada(e);
      });
    });
  }, []);

  const guardar = async () => {
    const p = form.patente.trim().toUpperCase();
    if (!p) return setError("Ingresa una patente");
    if (!editId && camiones.find(c => c.id === p)) return setError("Patente ya existe");
    await set(ref(db,`patentes_autorizadas/${p}`), {
      patente: p, estado:"autorizado", agregado: Date.now()
    });
    if (editId && editId !== p) await remove(ref(db,`patentes_autorizadas/${editId}`));
    setForm({ patente:"" }); setEditId(null); setError("");
  };

  const eliminar = async (id: string) => {
    if (!confirm(`¿Revocar camión ${id}?`)) return;
    await remove(ref(db,`patentes_autorizadas/${id}`));
    await push(ref(db,"eventos"), { tipo:"revocado", patente:id, timestamp:Date.now() });
  };

  const aprobarPendiente = async (pat: string) => {
    await set(ref(db,`patentes_autorizadas/${pat}`), { patente:pat, estado:"autorizado", agregado:Date.now() });
    await remove(ref(db,`patentes_pendientes/${pat}`));
    await push(ref(db,"eventos"), { tipo:"aprobacion_portero", patente:pat, timestamp:Date.now() });
  };

  const rechazarPendiente = async (pat: string) => {
    await remove(ref(db,`patentes_pendientes/${pat}`));
    await push(ref(db,"eventos"), { tipo:"rechazo_portero", patente:pat, timestamp:Date.now() });
  };

  const confirmarEspacio = async (espacio: number, horario: string) => {
    if (!modalEspacio) return;
    const hoy = fechaHoy();
    const key = `${espacio}_${hoy}_${horario}`;
    await set(ref(db,`agendas/${key}`), {
      espacio, fecha:hoy, horario, patente:modalEspacio,
      nota:"Asignado en llegada", timestamp:Date.now()
    });
    await push(ref(db,"eventos"), {
      tipo:"entrada", patente:modalEspacio, estado:"permitido",
      espacio, horario, mensaje:`Espacio ${espacio} asignado en llegada`, timestamp:Date.now()
    });
    setModalEspacio(null);
    setModalLlegada(null);
  };

  const filtrados = camiones.filter(c =>
    c.patente?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div>
      {/* Modales */}
      {modalLlegada && (
        <ModalLlegada
          evento={modalLlegada}
          onClose={() => setModalLlegada(null)}
          onAsignarEspacio={() => { setModalEspacio(modalLlegada.patente); }}
        />
      )}
      {modalEspacio && (
        <ModalEspacio
          patente={modalEspacio}
          onClose={() => setModalEspacio(null)}
          onConfirmar={confirmarEspacio}
        />
      )}

      <h1 style={{ fontSize:22, fontWeight:700, color:"#1E3A5F", marginBottom:4 }}>Gestión de camiones</h1>
      <p style={{ color:"#6B7280", fontSize:13, marginBottom:24 }}>
        {camiones.length} autorizados · {Object.keys(pendientes).length} pendientes
      </p>

      {/* Pendientes */}
      {Object.keys(pendientes).length > 0 && (
        <div style={{ background:"#FFFBEB", border:"1px solid #FCD34D", borderRadius:10, padding:16, marginBottom:24 }}>
          <p style={{ fontWeight:700, color:"#92400E", marginBottom:12, fontSize:14 }}>
            Camiones pendientes de aprobación
          </p>
          {Object.entries(pendientes).map(([pat,data]:any) => (
            <div key={pat} style={{ display:"flex", gap:10, alignItems:"center", marginBottom:8, flexWrap:"wrap" }}>
              <span style={{ fontFamily:"monospace", fontWeight:700, fontSize:15 }}>{pat}</span>
              <span style={{ fontSize:12, color:"#78716C" }}>{new Date(data.timestamp).toLocaleString("es-CL")}</span>
              <button onClick={() => aprobarPendiente(pat)} style={btn("#16A34A")}>Aprobar</button>
              <button onClick={() => rechazarPendiente(pat)} style={btn("#DC2626")}>Rechazar</button>
            </div>
          ))}
        </div>
      )}

      {/* Formulario */}
      <div style={{ background:"#fff", borderRadius:10, border:"1px solid #E5E7EB", padding:20, marginBottom:24 }}>
        <p style={{ fontWeight:700, color:"#1E3A5F", marginBottom:12, fontSize:14 }}>
          {editId ? `Editando: ${editId}` : "Registrar nuevo camión manualmente"}
        </p>
        <div style={{ display:"flex", gap:10, alignItems:"flex-end", flexWrap:"wrap" }}>
          <div>
            <label style={labelStyle}>Patente</label>
            <input value={form.patente} onChange={e => setForm({ patente:e.target.value.toUpperCase() })}
              onKeyDown={e => e.key==="Enter" && guardar()}
              placeholder="ABC123" maxLength={8}
              style={{ ...inputStyle, fontFamily:"monospace", textTransform:"uppercase" }} />
          </div>
          <button onClick={guardar} style={btn("#2563EB")}>
            {editId ? "Guardar cambios" : "Agregar camión"}
          </button>
          {editId && <button onClick={() => { setEditId(null); setForm({ patente:"" }); }} style={btn("#6B7280")}>Cancelar</button>}
        </div>
        {error && <p style={{ color:"#DC2626", fontSize:12, marginTop:8 }}>{error}</p>}
      </div>

      {/* Tabla camiones */}
      <div style={{ background:"#fff", borderRadius:10, border:"1px solid #E5E7EB", overflow:"hidden" }}>
        <div style={{ padding:"12px 16px", borderBottom:"1px solid #F3F4F6", display:"flex", gap:10, alignItems:"center", justifyContent:"space-between" }}>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar patente..." style={{ ...inputStyle, width:220 }} />
          <span style={{ fontSize:13, color:"#6B7280" }}>{filtrados.length} camiones</span>
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:14 }}>
          <thead>
            <tr style={{ background:"#F8FAFC" }}>
              {["Patente","Estado","Registrado","Última entrada","Acciones"].map(h => (
                <th key={h} style={{ padding:"10px 16px", textAlign:"left", color:"#374151", fontWeight:600, fontSize:13 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map(c => (
              <tr key={c.id} style={{ borderTop:"1px solid #F3F4F6" }}>
                <td style={{ padding:"10px 16px", fontFamily:"monospace", fontWeight:700, fontSize:15 }}>{c.patente}</td>
                <td style={{ padding:"10px 16px" }}>
                  <span style={{ background:"#DCFCE7", color:"#166534", borderRadius:99, padding:"2px 10px", fontSize:12, fontWeight:600 }}>
                    Autorizado
                  </span>
                </td>
                <td style={{ padding:"10px 16px", color:"#6B7280", fontSize:13 }}>
                  {new Date(c.agregado).toLocaleDateString("es-CL")}
                </td>
                <td style={{ padding:"10px 16px", color:"#6B7280", fontSize:13 }}>
                  {c.ultimaEntrada ? new Date(c.ultimaEntrada).toLocaleString("es-CL") : "—"}
                </td>
                <td style={{ padding:"10px 16px" }}>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={() => { setEditId(c.id); setForm({ patente:c.patente }); }} style={btn("#2563EB",true)}>Editar</button>
                    <button onClick={() => eliminar(c.id)} style={btn("#DC2626",true)}>Revocar</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr><td colSpan={5} style={{ padding:32, textAlign:"center", color:"#9CA3AF" }}>Sin camiones registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display:"block", fontSize:12, color:"#374151", marginBottom:4, fontWeight:600 };
const inputStyle: React.CSSProperties = { padding:"8px 12px", borderRadius:8, border:"1px solid #D1D5DB", fontSize:14, outline:"none" };
const btn = (bg:string, small=false): React.CSSProperties => ({
  background:bg, color:"#fff", border:"none", borderRadius:6,
  padding: small ? "4px 12px" : "8px 18px", cursor:"pointer",
  fontSize: small ? 12 : 14, fontWeight:600,
});