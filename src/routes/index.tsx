import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, PolarAngleAxis, PolarGrid,
  Radar, RadarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import data from "@/data/drift.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Knowledge Drift Radar — Online Retail" },
      { name: "description", content: "Monthly data drift detection on Online Retail using PSI, KS test and Random Forest." },
      { property: "og:title", content: "Knowledge Drift Radar — Online Retail" },
      { property: "og:description", content: "PSI, KS and Random Forest drift detection with relevance scoring." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Status = "Stable" | "Warning" | "Drift";
const statusClass: Record<Status, string> = {
  Stable: "text-stable border-stable/40 bg-stable/10",
  Warning: "text-warning border-warning/40 bg-warning/10",
  Drift: "text-destructive border-destructive/40 bg-destructive/10",
};
const tip = { contentStyle: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 } };
const axis = { stroke: "var(--muted-foreground)", fontSize: 11 };

function Index() {
  const windows = data.windows;
  const [sel, setSel] = useState(windows.length - 1);
  const w = windows[sel] ?? windows[0]!;
  const st = w.status as Status;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Online Retail · {data.totalRows.toLocaleString()} rows</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">Knowledge Drift Radar</h1>
          <p className="mt-1 text-sm text-muted-foreground">Baseline {data.reference} ({data.referenceRows.toLocaleString()} rows) vs. each later month</p>
        </div>
        <select
          value={sel}
          onChange={(e) => setSel(+e.target.value)}
          className="rounded-md border border-input bg-card px-3 py-2 font-mono text-sm"
        >
          {windows.map((x, i) => <option key={x.month} value={i}>{x.month}</option>)}
        </select>
      </header>

      <section className="grid gap-4 md:grid-cols-5">
        <div className={`rounded-lg border p-5 md:col-span-1 ${statusClass[st]}`}>
          <p className="text-xs uppercase tracking-wider opacity-80">Status</p>
          <p className="mt-2 text-3xl font-bold">{st}</p>
          <p className="mt-1 font-mono text-xs opacity-80">{w.month}</p>
        </div>
        <Stat label="Relevance score" value={w.relevance.toFixed(1)} hint="0–100, higher = more relevant" big />
        <Stat label="Mean PSI" value={w.meanPsi.toFixed(3)} hint="> 0.25 major shift" />
        <Stat label="Mean KS" value={w.meanKs.toFixed(3)} hint="max CDF distance" />
        <Stat label="Random Forest AUC" value={w.rfAuc.toFixed(3)} hint="0.5 = indistinguishable" />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Relevance over time" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={windows} onClick={(e) => e?.activeTooltipIndex != null && setSel(Number(e.activeTooltipIndex))}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="month" {...axis} />
              <YAxis domain={[40, 100]} {...axis} />
              <Tooltip {...tip} />
              <ReferenceLine y={66} stroke="var(--warning)" strokeDasharray="4 4" />
              <ReferenceLine y={58} stroke="var(--destructive)" strokeDasharray="4 4" />
              <Line dataKey="relevance" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--primary)" }} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title={`Feature drift radar · ${w.month}`}>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={w.features}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="feature" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
              <Radar dataKey="ks" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.3} />
              <Radar dataKey="rfImportance" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.2} />
              <Tooltip {...tip} />
            </RadarChart>
          </ResponsiveContainer>
        </Panel>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="PSI by feature">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={w.features}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="feature" {...axis} />
              <YAxis {...axis} />
              <Tooltip {...tip} />
              <ReferenceLine y={0.1} stroke="var(--warning)" strokeDasharray="4 4" />
              <Bar dataKey="psi" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Feature detail">
          <table className="w-full font-mono text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border text-left">
                <th className="py-2">Feature</th><th>PSI</th><th>KS</th><th>p</th><th>RF imp.</th><th>Ref → Cur mean</th>
              </tr>
            </thead>
            <tbody>
              {w.features.map((f) => (
                <tr key={f.feature} className="border-b border-border/50">
                  <td className="py-2 font-sans font-medium">{f.feature}</td>
                  <td className={f.psi > 0.1 ? "text-warning" : ""}>{f.psi.toFixed(3)}</td>
                  <td>{f.ks.toFixed(3)}</td>
                  <td className={f.pValue < 0.05 ? "text-destructive" : "text-stable"}>{f.pValue < 0.001 ? "<.001" : f.pValue.toFixed(3)}</td>
                  <td>{f.rfImportance.toFixed(3)}</td>
                  <td>{f.refMean} → {f.curMean}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </section>

      <section className="mt-4 rounded-lg border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Monthly timeline</h2>
        <div className="flex flex-wrap gap-2">
          {windows.map((x, i) => (
            <button
              key={x.month}
              onClick={() => setSel(i)}
              className={`rounded-md border px-3 py-2 text-left font-mono text-xs transition ${statusClass[x.status as Status]} ${i === sel ? "ring-2 ring-ring" : "opacity-80 hover:opacity-100"}`}
            >
              <div>{x.month}</div>
              <div className="text-base font-semibold">{x.relevance}</div>
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Relevance = 100 − weighted drift (40% PSI, 30% KS, 30% Random Forest AUC). Stable ≥ 66 · Warning 58–66 · Drift &lt; 58.
        </p>
      </section>
    </main>
  );
}

function Stat({ label, value, hint, big }: { label: string; value: string; hint: string; big?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-2 font-mono font-semibold ${big ? "text-4xl text-primary" : "text-3xl"}`}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-border bg-card p-5 ${className}`}>
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </div>
  );
}
