"use client";
import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const ESPACIOS = Array.from({ length: 10 }, (_, i) => i + 1);

export default function ReportesPage() {
  const [agendas, setAgendas]   = useState<Record<string, any>>({});
  const [eventos, setEventos]   = useState<any[]>([]);
  const donutRef  = useRef<HTMLCanvasElement>(null);
  const barraRef  = useRef<HTMLCanvasElement>(null);
  const lineaRef  = useRef<HTMLCanvasElement>(null);
  const donutChart  = useRef<Chart | null>(null);
  const barraChart  = useRef<Chart | null>(null);
  const lineaChart  = useRef<Chart | null>(null);

  useEffect(() => {
    return onValue(ref(db, "agendas"),  snap => setAgendas(snap.val() || {}));
  }, []);

  useEffect(() => {
    return onValue(ref(db, "eventos"), snap => {
      const data = snap.val() || {};
      setEventos(Object.values(data).sort((a: any, b: any) => a.timestamp - b.timestamp));
    });
  }, []);

  // Gráfico 1 — Donut espacios hoy
  useEffect(() => {
    if (!donutRef.current) return;
    const ocupados = ESPACIOS.flatMap(e =>
      ["manana","tarde"].filter(h => agendas[`${e}_${hoy()}_${h}`])
    ).length;
    const libres = 20 - ocupados;
    donutChart.current?.destroy();
    donutChart.current = new Chart(donutRef.current, {
      type: "doughnut",
      data: {
        labels: ["Ocupados", "Libres"],
        datasets: [{ data: [ocupados, libres], backgroundColor: ["#2563EB","#BBF7D0"], borderWidth: 0 }]
      },
      options: { plugins: { legend: { position: "bottom" } }, cutout: "65%" }
    });
  }, [agendas]);

  // Gráfico 2 — Barras uso por espacio hoy
  useEffect(() => {
    if (!barraRef.current) return;
    const datos = ESPACIOS.map(e =>
      ["manana","tarde"].filter(h => agendas[`${e}_${hoy()}_${h}`]).length
    );
    barraChart.current?.destroy();
    barraChart.current = new Chart(barraRef.current, {
      type: "bar",
      data: {
        labels: ESPACIOS.map(e => `E${e}`),
        datasets: [{
          label: "Bloques ocupados hoy",
          data: datos,
          backgroundColor: datos.map(d => d === 2 ? "#EF4444" : d === 1 ? "#F59E0B" : "#BBF7D0"),
        }]
      },
      options: {
        scales: { y: { max: 2, ticks: { stepSize: 1 } } },
        plugins: { legend: { display: false } }
      }
    });
  }, [agendas]);

  // Gráfico 3 — Línea entradas últimos 7 días
  useEffect(() => {
    if (!lineaRef.current || eventos.length === 0) return;
    const dias: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      dias[d.toISOString().split("T")[0]] = 0;
    }
    eventos.filter((e: any) => e.estado === "permitido").forEach((e: any) => {
      const d = new Date(e.timestamp).toISOString().split("T")[0];
      if (d in dias) dias[d]++;
    });
    lineaChart.current?.destroy();
    lineaChart.current = new Chart(lineaRef.current, {
      type: "line",
      data: {
        labels: Object.keys(dias).map(d => new Date(d + "T12:00:00").toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" })),
        datasets: [{
          label: "Entradas permitidas",
          data: Object.values(dias),
          borderColor: "#2563EB", backgroundColor: "#DBEAFE",
          fill: true, tension: 0.4, pointRadius: 5,
        }]
      },
      options: { scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
  }, [eventos]);

  // Stats rápidas
  const totalHoy = eventos.filter((e: any) => new Date(e.timestamp).toISOString().split("T")[0] === hoy()).length;
  const permitidosHoy = eventos.filter((e: any) => e.estado === "permitido" && new Date(e.timestamp).toISOString().split("T")[0] === hoy()).length;
  const denegadosHoy  = eventos.filter((e: any) => (e.estado === "denegado" || e.tipo === "denegado") && new Date(e.timestamp).toISOString().split("T")[0] === hoy()).length;
  const ocupadosAhora = Object.keys(agendas).filter(k => k.includes(hoy())).length;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1E3A5F", marginBottom: 4 }}>Reportes</h1>
      <p style={{ color: "#6B7280", fontSize: 13, marginBottom: 24 }}>Datos en tiempo real</p>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 32 }}>
        {[
          { label: "Eventos hoy",      valor: totalHoy,      color: "#2563EB", bg: "#DBEAFE" },
          { label: "Entradas hoy",     valor: permitidosHoy, color: "#16A34A", bg: "#DCFCE7" },
          { label: "Denegados hoy",    valor: denegadosHoy,  color: "#DC2626", bg: "#FEE2E2" },
          { label: "Espacios agendados hoy", valor: ocupadosAhora, color: "#D97706", bg: "#FEF3C7" },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, borderRadius: 10, padding: "16px 20px" }}>
            <p style={{ fontSize: 12, color: k.color, fontWeight: 600, margin: "0 0 4px" }}>{k.label}</p>
            <p style={{ fontSize: 32, fontWeight: 700, color: k.color, margin: 0 }}>{k.valor}</p>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24, marginBottom: 24 }}>
        <div style={card}>
          <p style={cardTitle}>Espacios hoy</p>
          <canvas ref={donutRef} />
        </div>
        <div style={card}>
          <p style={cardTitle}>Uso por espacio (hoy)</p>
          <canvas ref={barraRef} />
        </div>
      </div>
      <div style={card}>
        <p style={cardTitle}>Entradas permitidas — últimos 7 días</p>
        <canvas ref={lineaRef} />
      </div>
    </div>
  );
}

const card: React.CSSProperties = { background: "#fff", borderRadius: 10, border: "1px solid #E5E7EB", padding: 20 };
const cardTitle: React.CSSProperties = { fontWeight: 700, color: "#1E3A5F", fontSize: 14, marginBottom: 12, marginTop: 0 };