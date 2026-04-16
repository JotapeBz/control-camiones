"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import Link from "next/link";

const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const ESPACIOS = Array.from({ length: 10 }, (_, i) => i + 1);

export default function Dashboard() {
  const [eventos, setEventos]     = useState<any[]>([]);
  const [pendientes, setPendientes] = useState<Record<string,any>>({});
  const [agendas, setAgendas]     = useState<Record<string,any>>({});
  const [camiones, setCamiones]   = useState<number>(0);

  useEffect(() => { return onValue(ref(db,"eventos"), snap => { const d=snap.val()||{}; setEventos(Object.values(d).sort((a:any,b:any)=>b.timestamp-a.timestamp)); }); },[]);
  useEffect(() => { return onValue(ref(db,"patentes_pendientes"), snap => setPendientes(snap.val()||{})); },[]);
  useEffect(() => { return onValue(ref(db,"agendas"), snap => setAgendas(snap.val()||{})); },[]);
  useEffect(() => { return onValue(ref(db,"patentes_autorizadas"), snap => setCamiones(Object.keys(snap.val()||{}).length)); },[]);

  const ultimosEventos = eventos.slice(0,8);
  const pendientesN    = Object.keys(pendientes).length;
  const entradashoy    = eventos.filter((e:any)=>e.estado==="permitido"&&new Date(e.timestamp).toISOString().split("T")[0]===hoy()).length;
  const espaciosHoy    = ESPACIOS.flatMap(e=>["manana","tarde"].filter(h=>agendas[`${e}_${hoy()}_${h}`])).length;

  const colorEvento = (e: any) => {
    const k = e.estado ?? e.tipo;
    if (k==="permitido"||k==="aprobacion_portero") return "#16A34A";
    if (k==="denegado"||k==="rechazo_portero")     return "#DC2626";
    if (k==="pendiente_revision")                   return "#D97706";
    return "#6B7280";
  };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1E3A5F", marginBottom: 4 }}>Dashboard</h1>
      <p style={{ color: "#6B7280", fontSize: 13, marginBottom: 24 }}>
        {new Date().toLocaleDateString("es-CL", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
      </p>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:28 }}>
        {[
          { label:"Camiones autorizados", valor:camiones,    color:"#2563EB", bg:"#DBEAFE", href:"/camiones"  },
          { label:"Pendientes revisión",  valor:pendientesN, color:"#D97706", bg:"#FEF3C7", href:"/camiones"  },
          { label:"Entradas hoy",         valor:entradashoy, color:"#16A34A", bg:"#DCFCE7", href:"/historial" },
          { label:"Espacios agendados",   valor:espaciosHoy, color:"#7C3AED", bg:"#EDE9FE", href:"/espacios"  },
        ].map(k=>(
          <Link key={k.label} href={k.href} style={{ textDecoration:"none" }}>
            <div style={{ background:k.bg, borderRadius:10, padding:"16px 20px", cursor:"pointer" }}>
              <p style={{ fontSize:12, color:k.color, fontWeight:600, margin:"0 0 4px" }}>{k.label}</p>
              <p style={{ fontSize:34, fontWeight:700, color:k.color, margin:0 }}>{k.valor}</p>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>
        {/* Eventos recientes */}
        <div style={{ background:"#fff", borderRadius:10, border:"1px solid #E5E7EB", overflow:"hidden" }}>
          <div style={{ padding:"14px 16px", borderBottom:"1px solid #F3F4F6", display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontWeight:700, fontSize:14, color:"#1E3A5F" }}>Eventos recientes</span>
            <Link href="/historial" style={{ fontSize:12, color:"#2563EB" }}>Ver todo</Link>
          </div>
          {ultimosEventos.map((e:any)=>(
            <div key={e.id??e.timestamp} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 16px", borderBottom:"1px solid #F9FAFB" }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:colorEvento(e), display:"inline-block", flexShrink:0 }}/>
              <span style={{ fontFamily:"monospace", fontWeight:700, fontSize:13 }}>{e.patente??"—"}</span>
              <span style={{ fontSize:12, color:"#6B7280", flex:1 }}>{e.estado??e.tipo}</span>
              <span style={{ fontSize:11, color:"#9CA3AF" }}>{new Date(e.timestamp).toLocaleTimeString("es-CL")}</span>
            </div>
          ))}
        </div>

        {/* Espacios hoy */}
        <div style={{ background:"#fff", borderRadius:10, border:"1px solid #E5E7EB", overflow:"hidden" }}>
          <div style={{ padding:"14px 16px", borderBottom:"1px solid #F3F4F6", display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontWeight:700, fontSize:14, color:"#1E3A5F" }}>Espacios hoy</span>
            <Link href="/espacios" style={{ fontSize:12, color:"#2563EB" }}>Gestionar</Link>
          </div>
          <div style={{ padding:16, display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8 }}>
            {ESPACIOS.map(e=>{
              const am=agendas[`${e}_${hoy()}_manana`];
              const pm=agendas[`${e}_${hoy()}_tarde`];
              return (
                <div key={e} style={{ borderRadius:8, border:"1px solid #E5E7EB", padding:8, textAlign:"center" }}>
                  <p style={{ fontWeight:700, fontSize:13, color:"#374151", margin:"0 0 4px" }}>E{e}</p>
                  <div style={{ fontSize:10, fontWeight:600, color:am?"#991B1B":"#166534", background:am?"#FEE2E2":"#DCFCE7", borderRadius:4, padding:"2px 0", marginBottom:3 }}>AM {am?am.patente:"libre"}</div>
                  <div style={{ fontSize:10, fontWeight:600, color:pm?"#991B1B":"#166534", background:pm?"#FEE2E2":"#DCFCE7", borderRadius:4, padding:"2px 0" }}>PM {pm?pm.patente:"libre"}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}