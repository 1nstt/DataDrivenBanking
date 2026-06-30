"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ScatterChart, Scatter, ZAxis, Cell, Legend, PieChart, Pie, ReferenceLine,
} from "recharts";

// ============================================================
// CONFIGURACIÓN: apunta a la ruta proxy del frontend para evitar
// problemas de CORS y de localhost desde el navegador.
// ============================================================
const API_URL = process.env.NEXT_PUBLIC_ENGINE_API_URL
  ? `${process.env.NEXT_PUBLIC_ENGINE_API_URL}/solicitudes`
  : "/api/engine/solicitudes";

// ============================================================
// Adaptador: convierte un documento crudo de Mongo a la forma
// plana que usa el dashboard internamente.
// ============================================================
function parseDocumento(raw) {
  // soporta tanto { documento: {...} } como el documento ya plano
  const doc = raw.documento ?? raw;
  const sol = doc.solicitud ?? {};
  const etq = doc.etiquetas ?? {};

  // "prediccion_xgboost" llega como string "100%" -> número 100
  const pctRiesgo = typeof etq.prediccion_xgboost === "string"
    ? parseFloat(etq.prediccion_xgboost.replace("%", ""))
    : Number(etq.prediccion_xgboost ?? 0);

  return {
    id: doc._id ?? raw._id ?? crypto.randomUUID(),
    ingreso_mensual: Number(sol.ingreso_mensual ?? 0),
    score_crediticio: Number(sol.score_crediticio ?? 0),
    monto_solicitado: Number(sol.monto_solicitado ?? 0),
    antiguedad_laboral_meses: Number(sol.antiguedad_laboral_meses ?? 0),
    deuda_actual: Number(sol.deuda_actual ?? 0),
    ratio_endeudamiento_actual: Number(etq.ratio_endeudamiento_actual ?? 0),
    capacidad_pago: etq.capacidad_pago ?? "Sin dato",
    estabilidad_laboral: etq.estabilidad_laboral ?? "Sin dato",
    score_estabilidad_financiera: etq.score_estabilidad_financiera ?? "Sin dato",
    decision_preliminar: etq.decision_preliminar ?? "Sin dato",
    pct_riesgo: pctRiesgo,
    is_aprobado: (doc.resultado_final ?? "").toUpperCase() === "APROBADO",
  };
}

const UMBRAL = 30; // referencial para la línea punteada de los gráficos

const CAP_PAGO_ORDEN = ["Saludable", "Ajustada", "Sobreendeudado"];
const EST_LABORAL_ORDEN = ["Alta", "Media", "Inestable"];
const SCORE_ESTAB_ORDEN = ["Consolidado", "Estable", "Vulnerable", "Critico"];
const DECISION_ORDEN = ["Prospecto consolidado", "Prospecto indefinido", "Mal prospecto"];

// ---------- Helpers ----------
const clp = (n) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
const clpCompact = (n) => {
  if (Math.abs(n) >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}MM`;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
};
const fmtNum = (n) => new Intl.NumberFormat("es-CL").format(n);

const RANGOS_INGRESO = [
  { label: "< $500K", lo: 0, hi: 500000 },
  { label: "$500K–1M", lo: 500000, hi: 1000000 },
  { label: "$1M–2M", lo: 1000000, hi: 2000000 },
  { label: "$2M–3M", lo: 2000000, hi: 3000000 },
  { label: "> $3M", lo: 3000000, hi: Infinity },
];
const BANDAS_SCORE = [
  { label: "380–499", lo: 380, hi: 500 },
  { label: "500–579", lo: 500, hi: 580 },
  { label: "580–649", lo: 580, hi: 650 },
  { label: "650–719", lo: 650, hi: 720 },
  { label: "720–789", lo: 720, hi: 790 },
  { label: "790–850", lo: 790, hi: 851 },
];

// ============================================================
// Componente principal
// ============================================================
export default function Dashboard() {
  const [datos, setDatos] = useState(null);   // null = aún no cargado
  const [error, setError] = useState(null);
  const [segmentador, setSegmentador] = useState("ingreso");

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`Error ${res.status} al consultar la API`);
        const json = await res.json();
        const lista = Array.isArray(json) ? json : json.data ?? json.solicitudes ?? [];
        const parseado = lista.map(parseDocumento);
        if (!cancelado) setDatos(parseado);
      } catch (e) {
        if (!cancelado) setError(e.message);
      }
    }

    cargar();
    return () => { cancelado = true; };
  }, []);

  if (error) {
    return (
      <div style={styles.page}>
        <style>{fontImport}</style>
        <div style={styles.errorBox}>
          <strong>No se pudo cargar la información.</strong>
          <div style={{ marginTop: 6 }}>{error}</div>
          <div style={{ marginTop: 10, fontSize: 12, color: "var(--texto-sec)" }}>
            Revisa que API_URL apunte a tu endpoint y que este responda con CORS habilitado.
          </div>
        </div>
      </div>
    );
  }

  if (!datos) {
    return (
      <div style={styles.page}>
        <style>{fontImport}</style>
        <div style={styles.loadingBox}>Cargando solicitudes…</div>
      </div>
    );
  }

  return <DashboardContenido datos={datos} segmentador={segmentador} setSegmentador={setSegmentador} />;
}

function DashboardContenido({ datos: DATA, segmentador, setSegmentador }) {
  const aprobadas = DATA.filter((d) => d.is_aprobado);
  const rechazadas = DATA.filter((d) => !d.is_aprobado);

  const montoEvitado = rechazadas.reduce((acc, d) => acc + d.monto_solicitado * (d.pct_riesgo / 100), 0);
  const montoRechazadoTotal = rechazadas.reduce((acc, d) => acc + d.monto_solicitado, 0);
  const montoAprobadoTotal = aprobadas.reduce((acc, d) => acc + d.monto_solicitado, 0);
  const tasaAprobacion = DATA.length ? (aprobadas.length / DATA.length) * 100 : 0;
  const riesgoPromAprob = aprobadas.length ? aprobadas.reduce((a, d) => a + d.pct_riesgo, 0) / aprobadas.length : 0;
  const riesgoPromRech = rechazadas.length ? rechazadas.reduce((a, d) => a + d.pct_riesgo, 0) / rechazadas.length : 0;

  const donutData = [
    { name: "Aprobadas", value: aprobadas.length, color: "var(--celeste)" },
    { name: "Rechazadas", value: rechazadas.length, color: "var(--azul-oscuro)" },
  ];

  const distSegmento = useMemo(() => {
    const bandas = segmentador === "ingreso" ? RANGOS_INGRESO : BANDAS_SCORE;
    return bandas.map((b) => {
      const sub = DATA.filter((d) => {
        const valor = segmentador === "ingreso" ? d.ingreso_mensual : d.score_crediticio;
        return valor >= b.lo && valor < b.hi;
      });
      return {
        rango: b.label,
        aprobadas: sub.filter((d) => d.is_aprobado).length,
        rechazadas: sub.filter((d) => !d.is_aprobado).length,
      };
    });
  }, [segmentador, DATA]);

  const histBins = Array.from({ length: 10 }, (_, i) => i * 10);
  const histRiesgo = histBins.map((lo) => {
    const hi = lo + 10;
    const count = DATA.filter((d) => d.pct_riesgo >= lo && d.pct_riesgo < hi).length;
    return { rango: `${lo}-${hi}%`, lo, cantidad: count };
  });

  const scatterAprob = aprobadas.map((d) => ({ x: d.pct_riesgo, y: d.monto_solicitado, aprobado: true }));
  const scatterRech = rechazadas.map((d) => ({ x: d.pct_riesgo, y: d.monto_solicitado, aprobado: false }));

  const funnel = [
    { icon: "📄", label: "Solicitudes evaluadas", value: fmtNum(DATA.length), tone: "neutro" },
    { icon: "✓", label: "Monto aprobado", value: clpCompact(montoAprobadoTotal), tone: "azul" },
    { icon: "✕", label: "Monto rechazado", value: clpCompact(montoRechazadoTotal), tone: "rojo" },
    { icon: "🛡", label: "Pérdida evitada (est.)", value: clpCompact(montoEvitado), tone: "destacado" },
  ];

  const heatmap = useMemo(() => {
    return EST_LABORAL_ORDEN.map((est) =>
      CAP_PAGO_ORDEN.map((cap) => {
        const sub = DATA.filter((d) => d.estabilidad_laboral === est && d.capacidad_pago === cap);
        const tasaRechazo = sub.length ? (sub.filter((d) => !d.is_aprobado).length / sub.length) * 100 : null;
        return { tasaRechazo, n: sub.length };
      })
    );
  }, [DATA]);

  const decisionVsFinal = DECISION_ORDEN.map((dec) => {
    const sub = DATA.filter((d) => d.decision_preliminar === dec);
    return {
      decision: dec,
      aprobadas: sub.filter((d) => d.is_aprobado).length,
      rechazadas: sub.filter((d) => !d.is_aprobado).length,
    };
  });
  const discrepancias = DATA.filter(
    (d) =>
      (d.decision_preliminar === "Prospecto consolidado" && !d.is_aprobado) ||
      (d.decision_preliminar === "Mal prospecto" && d.is_aprobado)
  ).length;

  const montoEvitadoPorScore = SCORE_ESTAB_ORDEN.map((s) => {
    const sub = rechazadas.filter((d) => d.score_estabilidad_financiera === s);
    const total = sub.reduce((acc, d) => acc + d.monto_solicitado * (d.pct_riesgo / 100), 0);
    return { categoria: s, evitado: total, n: sub.length };
  });

  if (DATA.length === 0) {
    return (
      <div style={styles.page}>
        <style>{fontImport}</style>
        <div style={styles.loadingBox}>No hay solicitudes para mostrar todavía.</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{fontImport}</style>

      <header style={styles.header}>
        <div style={styles.eyebrow}>Motor de decisión crediticia · Panel de resultados</div>
        <h1 style={styles.title}>Insights del motor de decisión</h1>
        <div style={styles.subtitle}>
          {fmtNum(DATA.length)} solicitudes evaluadas · umbral de aprobación {UMBRAL}% de riesgo
        </div>
      </header>

      <section style={styles.kpiRow}>
        <Kpi label="Tasa de aprobación" value={`${tasaAprobacion.toFixed(1)}%`} sub={`${fmtNum(aprobadas.length)} de ${fmtNum(DATA.length)} solicitudes`} />
        <Kpi label="Riesgo prom. aprobados" value={`${riesgoPromAprob.toFixed(1)}%`} sub={`vs ${riesgoPromRech.toFixed(1)}% en rechazados`} />
        <Kpi label="Pérdida evitada (est.)" value={clpCompact(montoEvitado)} sub="monto × % riesgo de rechazadas" destacado />
      </section>

      <section style={styles.topGrid}>
        <Panel title="Distribución de aprobaciones" desc="Solicitudes aprobadas vs rechazadas">
          <div style={styles.donutWrap}>
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie data={donutData} dataKey="value" innerRadius={62} outerRadius={92} startAngle={90} endAngle={-270} paddingAngle={2}>
                  {donutData.map((d, i) => (<Cell key={i} fill={d.color} stroke="none" />))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={styles.donutCenter}>
              <div style={styles.donutPct}>{tasaAprobacion.toFixed(0)}%</div>
              <div style={styles.donutSub}>Aprobadas</div>
            </div>
          </div>
          <div style={styles.legendRow}>
            <LegendItem color="var(--celeste)" label="Aprobadas" value={fmtNum(aprobadas.length)} />
            <LegendItem color="var(--azul-oscuro)" label="Rechazadas" value={fmtNum(rechazadas.length)} />
          </div>
        </Panel>

        <Panel title="Impacto financiero" desc="Flujo de valor de extremo a extremo del motor de decisiones">
          <div style={styles.funnel}>
            {funnel.map((f, i) => (
              <React.Fragment key={f.label}>
                <div style={{ ...styles.funnelCard, ...(f.tone === "destacado" ? styles.funnelCardDestacado : {}) }}>
                  <div style={{ ...styles.funnelIcon, ...funnelIconTone[f.tone] }}>{f.icon}</div>
                  <div style={{ ...styles.funnelLabel, ...(f.tone === "destacado" ? styles.funnelLabelInv : {}) }}>{f.label}</div>
                  <div style={{ ...styles.funnelValue, ...(f.tone === "destacado" ? styles.funnelValueInv : {}) }}>{f.value}</div>
                </div>
                {i < funnel.length - 1 && <div style={styles.funnelArrow}>↓</div>}
              </React.Fragment>
            ))}
          </div>
        </Panel>
      </section>

      <section style={styles.grid}>
        <Panel
          title="Tasa de aprobación por segmento de cliente"
          desc="Aprobaciones y rechazos desglosados por segmento"
          action={
            <div style={styles.toggle}>
              <button style={{ ...styles.toggleBtn, ...(segmentador === "score" ? styles.toggleBtnActive : {}) }} onClick={() => setSegmentador("score")}>Score crediticio</button>
              <button style={{ ...styles.toggleBtn, ...(segmentador === "ingreso" ? styles.toggleBtnActive : {}) }} onClick={() => setSegmentador("ingreso")}>Rango de ingresos</button>
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={distSegmento} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--linea)" vertical={false} />
              <XAxis dataKey="rango" tick={{ fontSize: 11, fill: "var(--texto-sec)" }} axisLine={{ stroke: "var(--linea)" }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--texto-sec)" }} axisLine={false} tickLine={false} />
              <Tooltip content={<TooltipBox />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="aprobadas" stackId="a" fill="var(--celeste)" name="Aprobadas" />
              <Bar dataKey="rechazadas" stackId="a" fill="var(--azul-oscuro)" name="Rechazadas" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Distribución del % de riesgo" desc={`Línea punteada marca el umbral de corte (${UMBRAL}%)`}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={histRiesgo} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--linea)" vertical={false} />
              <XAxis dataKey="rango" tick={{ fontSize: 10, fill: "var(--texto-sec)" }} axisLine={{ stroke: "var(--linea)" }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--texto-sec)" }} axisLine={false} tickLine={false} />
              <Tooltip content={<TooltipBox />} />
              <ReferenceLine x={`${UMBRAL}-${UMBRAL + 10}%`} stroke="var(--azul-oscuro)" strokeDasharray="4 4" />
              <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
                {histRiesgo.map((entry, i) => (<Cell key={i} fill={entry.lo < UMBRAL ? "var(--celeste)" : "var(--azul-oscuro)"} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Monto solicitado vs. % de riesgo" desc="Cada punto es una solicitud; el color indica la decisión" wide>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--linea)" />
              <XAxis type="number" dataKey="x" name="Riesgo" unit="%" domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--texto-sec)" }} axisLine={{ stroke: "var(--linea)" }} tickLine={false} />
              <YAxis type="number" dataKey="y" name="Monto" tickFormatter={clpCompact} tick={{ fontSize: 11, fill: "var(--texto-sec)" }} axisLine={false} tickLine={false} />
              <ZAxis range={[40, 41]} />
              <ReferenceLine x={UMBRAL} stroke="var(--azul-oscuro)" strokeDasharray="4 4" />
              <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={scatterAprob} fill="var(--celeste)" name="Aprobados" fillOpacity={0.75} />
              <Scatter data={scatterRech} fill="var(--azul-oscuro)" name="Rechazados" fillOpacity={0.75} />
            </ScatterChart>
          </ResponsiveContainer>
        </Panel>
      </section>

      <div style={styles.sectionDivider}>
        <span style={styles.sectionDividerLabel}>Perfiles de riesgo según etiquetas del flujo</span>
      </div>

      <section style={styles.grid}>
        <Panel title="Tasa de rechazo por perfil" desc="Capacidad de pago × estabilidad laboral" wide>
          <div style={styles.heatmapWrap}>
            <div style={styles.heatmapGrid}>
              <div></div>
              {CAP_PAGO_ORDEN.map((cap) => (<div key={cap} style={styles.heatmapColHead}>{cap}</div>))}
              {heatmap.map((fila, i) => (
                <React.Fragment key={EST_LABORAL_ORDEN[i]}>
                  <div style={styles.heatmapRowHead}>{EST_LABORAL_ORDEN[i]}</div>
                  {fila.map((celda, j) => (<HeatCell key={j} celda={celda} />))}
                </React.Fragment>
              ))}
            </div>
            <div style={styles.heatmapLegend}>
              <span>Tasa de rechazo:</span>
              <span style={{ ...styles.heatmapSwatch, background: "var(--heat-baja)" }} /> baja
              <span style={{ ...styles.heatmapSwatch, background: "var(--heat-media)" }} /> media
              <span style={{ ...styles.heatmapSwatch, background: "var(--heat-alta)" }} /> alta
            </div>
          </div>
        </Panel>

        <Panel title="Decisión preliminar vs. resultado final" desc="Validación de reglas de negocio frente al modelo XGBoost">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={decisionVsFinal} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--linea)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--texto-sec)" }} axisLine={{ stroke: "var(--linea)" }} tickLine={false} />
              <YAxis type="category" dataKey="decision" width={130} tick={{ fontSize: 11, fill: "var(--texto-sec)" }} axisLine={false} tickLine={false} />
              <Tooltip content={<TooltipBox />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="aprobadas" stackId="a" fill="var(--celeste)" name="Aprobadas" />
              <Bar dataKey="rechazadas" stackId="a" fill="var(--azul-oscuro)" name="Rechazadas" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={styles.noteBox}>
            <strong>{fmtNum(discrepancias)}</strong> solicitudes donde el dictamen preliminar y el resultado final de XGBoost difieren de forma notable.
          </div>
        </Panel>

        <Panel title="Pérdida evitada por score de estabilidad financiera" desc="Suma de monto × riesgo en solicitudes rechazadas, por categoría" wide>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={montoEvitadoPorScore} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--linea)" vertical={false} />
              <XAxis dataKey="categoria" tick={{ fontSize: 11, fill: "var(--texto-sec)" }} axisLine={{ stroke: "var(--linea)" }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--texto-sec)" }} axisLine={false} tickLine={false} tickFormatter={clpCompact} />
              <Tooltip content={<TooltipBox money />} />
              <Bar dataKey="evitado" name="Monto evitado" radius={[4, 4, 0, 0]}>
                {montoEvitadoPorScore.map((entry, i) => (<Cell key={i} fill={SCORE_ESTAB_COLOR[entry.categoria]} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </section>

      <footer style={styles.footer}>
        Datos en vivo desde la API del motor · {fmtNum(DATA.length)} solicitudes · umbral de aprobación {UMBRAL}% de riesgo
      </footer>
    </div>
  );
}

// ---------- Subcomponentes ----------
function Kpi({ label, value, sub, destacado }) {
  return (
    <div style={{ ...styles.kpiCard, ...(destacado ? styles.kpiCardDestacado : {}) }}>
      <div style={{ ...styles.kpiLabel, ...(destacado ? styles.kpiLabelInv : {}) }}>{label}</div>
      <div style={{ ...styles.kpiValue, ...(destacado ? styles.kpiValueInv : {}) }}>{value}</div>
      <div style={{ ...styles.kpiSub, ...(destacado ? styles.kpiSubInv : {}) }}>{sub}</div>
    </div>
  );
}

function Panel({ title, desc, children, action, wide }) {
  return (
    <div style={{ ...styles.panel, ...(wide ? { gridColumn: "1 / -1" } : {}) }}>
      <div style={styles.panelHead}>
        <div>
          <div style={styles.panelTitle}>{title}</div>
          <div style={styles.panelDesc}>{desc}</div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function LegendItem({ color, label, value }) {
  return (
    <div style={styles.legendItem}>
      <span style={{ ...styles.legendDot, background: color }} />
      <span style={styles.legendLabel}>{label}</span>
      <strong style={styles.legendValue}>{value}</strong>
    </div>
  );
}

function HeatCell({ celda }) {
  if (celda.tasaRechazo === null) {
    return <div style={{ ...styles.heatCell, background: "#F1F5F9", color: "var(--texto-sec)" }}>—</div>;
  }
  const t = celda.tasaRechazo;
  let bg = "var(--heat-baja)";
  if (t >= 66) bg = "var(--heat-alta)";
  else if (t >= 33) bg = "var(--heat-media)";
  return (
    <div style={{ ...styles.heatCell, background: bg }}>
      <div style={styles.heatCellValue}>{t.toFixed(0)}%</div>
      <div style={styles.heatCellN}>n={celda.n}</div>
    </div>
  );
}

function TooltipBox({ active, payload, label, money }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={styles.tooltip}>
      <div style={styles.tooltipLabel}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={styles.tooltipRow}>
          <span style={{ color: p.color || p.fill }}>{p.name}</span>
          <strong>{money ? clp(p.value) : fmtNum(p.value)}</strong>
        </div>
      ))}
    </div>
  );
}

function ScatterTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div style={styles.tooltip}>
      <div style={styles.tooltipRow}><span>Monto</span><strong>{clp(d.y)}</strong></div>
      <div style={styles.tooltipRow}><span>Riesgo</span><strong>{d.x.toFixed(1)}%</strong></div>
      <div style={styles.tooltipRow}><span>Decisión</span><strong style={{ color: d.aprobado ? "var(--celeste)" : "var(--azul-oscuro)" }}>{d.aprobado ? "Aprobado" : "Rechazado"}</strong></div>
    </div>
  );
}

// ---------- Estilos ----------
const fontImport = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap');
  :root {
    --fondo: #F4F8FB; --tinta: #16263B; --texto-sec: #5C7088; --linea: #DCE6EF;
    --celeste: #14B6E8; --azul-oscuro: #0B3C73; --azul-medio: #1768AC; --rojo: #C24B3F;
    --blanco: #FFFFFF; --heat-baja: #BFE8F7; --heat-media: #4FB6DE; --heat-alta: #0B3C73;
  }
`;

const funnelIconTone = {
  neutro: { background: "#EAF1F7", color: "var(--texto-sec)" },
  azul: { background: "#DBEFFA", color: "var(--azul-medio)" },
  rojo: { background: "#FBE6E2", color: "var(--rojo)" },
  destacado: { background: "rgba(255,255,255,0.18)", color: "#fff" },
};

const SCORE_ESTAB_COLOR = { Consolidado: "#14B6E8", Estable: "#4FB6DE", Vulnerable: "#1768AC", Critico: "#0B3C73" };

const styles = {
  page: { fontFamily: "'Inter', sans-serif", background: "var(--fondo)", color: "var(--tinta)", padding: "32px 28px 48px", minHeight: "100%", boxSizing: "border-box" },
  header: { marginBottom: 24, borderBottom: "1px solid var(--linea)", paddingBottom: 18 },
  eyebrow: { fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--azul-medio)", marginBottom: 6, fontWeight: 700 },
  title: { fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: 28, margin: 0, color: "var(--azul-oscuro)" },
  subtitle: { fontSize: 13, color: "var(--texto-sec)", marginTop: 6 },
  kpiRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 20 },
  kpiCard: { background: "var(--blanco)", border: "1px solid var(--linea)", borderRadius: 14, padding: "18px 20px" },
  kpiCardDestacado: { background: "linear-gradient(135deg, var(--azul-oscuro), var(--azul-medio))", border: "none" },
  kpiLabel: { fontSize: 12.5, color: "var(--texto-sec)", fontWeight: 600 },
  kpiLabelInv: { color: "rgba(255,255,255,0.75)" },
  kpiValue: { fontFamily: "'Manrope', sans-serif", fontSize: 26, fontWeight: 800, margin: "4px 0 2px", color: "var(--azul-oscuro)" },
  kpiValueInv: { color: "#fff" },
  kpiSub: { fontSize: 11.5, color: "var(--texto-sec)" },
  kpiSubInv: { color: "rgba(255,255,255,0.7)" },
  topGrid: { display: "grid", gridTemplateColumns: "minmax(280px, 1fr) minmax(320px, 1.4fr)", gap: 16, marginBottom: 16 },
  donutWrap: { position: "relative", display: "flex", justifyContent: "center", margin: "4px 0 4px" },
  donutCenter: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" },
  donutPct: { fontFamily: "'Manrope', sans-serif", fontSize: 30, fontWeight: 800, color: "var(--azul-oscuro)" },
  donutSub: { fontSize: 11.5, color: "var(--texto-sec)" },
  legendRow: { display: "flex", justifyContent: "center", gap: 24, marginTop: 8 },
  legendItem: { display: "flex", alignItems: "center", gap: 6, fontSize: 13 },
  legendDot: { width: 9, height: 9, borderRadius: "50%", display: "inline-block" },
  legendLabel: { color: "var(--texto-sec)" },
  legendValue: { color: "var(--azul-oscuro)" },
  funnel: { display: "flex", flexDirection: "column" },
  funnelCard: { background: "var(--fondo)", border: "1px solid var(--linea)", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 },
  funnelCardDestacado: { background: "linear-gradient(135deg, var(--azul-oscuro), var(--azul-medio))", border: "none" },
  funnelIcon: { width: 30, height: 30, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 },
  funnelLabel: { fontSize: 13.5, color: "var(--texto-sec)", flex: 1 },
  funnelLabelInv: { color: "rgba(255,255,255,0.85)", fontWeight: 600 },
  funnelValue: { fontFamily: "'Manrope', sans-serif", fontSize: 16, fontWeight: 800, color: "var(--azul-oscuro)" },
  funnelValueInv: { color: "#fff", fontSize: 19 },
  funnelArrow: { textAlign: "center", color: "var(--texto-sec)", fontSize: 13, padding: "2px 0" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 16 },
  panel: { background: "var(--blanco)", border: "1px solid var(--linea)", borderRadius: 14, padding: "18px 18px 8px" },
  panelHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8, flexWrap: "wrap" },
  panelTitle: { fontSize: 14.5, fontWeight: 700, color: "var(--azul-oscuro)" },
  panelDesc: { fontSize: 12, color: "var(--texto-sec)", marginTop: 2 },
  toggle: { display: "flex", background: "var(--fondo)", borderRadius: 8, padding: 3, border: "1px solid var(--linea)" },
  toggleBtn: { border: "none", background: "transparent", fontSize: 11.5, fontWeight: 600, color: "var(--texto-sec)", padding: "6px 10px", borderRadius: 6, cursor: "pointer", fontFamily: "'Inter', sans-serif" },
  toggleBtnActive: { background: "var(--blanco)", color: "var(--azul-oscuro)", boxShadow: "0 1px 3px rgba(11,60,115,0.15)" },
  sectionDivider: { display: "flex", alignItems: "center", gap: 12, margin: "28px 0 16px" },
  sectionDividerLabel: { fontSize: 12, fontWeight: 700, color: "var(--azul-medio)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" },
  heatmapWrap: { paddingBottom: 12 },
  heatmapGrid: { display: "grid", gridTemplateColumns: "120px repeat(3, 1fr)", gap: 6, marginTop: 6 },
  heatmapColHead: { fontSize: 11.5, fontWeight: 700, color: "var(--texto-sec)", textAlign: "center", alignSelf: "end", paddingBottom: 4 },
  heatmapRowHead: { fontSize: 11.5, fontWeight: 700, color: "var(--texto-sec)", display: "flex", alignItems: "center" },
  heatCell: { borderRadius: 8, padding: "12px 6px", textAlign: "center", color: "#fff" },
  heatCellValue: { fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: 16 },
  heatCellN: { fontSize: 10, opacity: 0.85, marginTop: 2 },
  heatmapLegend: { display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--texto-sec)", marginTop: 12 },
  heatmapSwatch: { width: 12, height: 12, borderRadius: 3, display: "inline-block", marginLeft: 4 },
  noteBox: { fontSize: 12, color: "var(--texto-sec)", background: "var(--fondo)", border: "1px solid var(--linea)", borderRadius: 8, padding: "10px 12px", marginTop: 10, lineHeight: 1.5 },
  tooltip: { background: "#fff", border: "1px solid var(--linea)", borderRadius: 8, padding: "8px 12px", fontSize: 12, boxShadow: "0 4px 14px rgba(11,60,115,0.12)" },
  tooltipLabel: { fontWeight: 700, marginBottom: 4, color: "var(--azul-oscuro)" },
  tooltipRow: { display: "flex", justifyContent: "space-between", gap: 16 },
  footer: { marginTop: 28, fontSize: 11.5, color: "var(--texto-sec)", textAlign: "center" },
  loadingBox: { padding: 60, textAlign: "center", color: "var(--texto-sec)", fontSize: 14 },
  errorBox: { padding: 24, background: "#FBE6E2", border: "1px solid #E8B6AC", borderRadius: 12, color: "#7A2E1E", fontSize: 13.5 },
};
