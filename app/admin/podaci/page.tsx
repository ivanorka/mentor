"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, BookOpen, Braces, Database, RefreshCw, Server, ShieldCheck, Users } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { API_BASE_URL, apiFetch } from "../../lib/api";

type Counts = Record<string, number>;
type AdminDashboard = { counts: Counts; gmvEur: number; platformRevenueEur: number; takeRate: number; openTrustEvents: number; generatedAt: string };
type Identity = { id: string; name: string; role: string };
type Subject = { id: string; name: string; category: string; tutorCount: number };

const endpoints = [
  ["GET", "/subjects", "Katalog predmeta"], ["GET", "/tutors", "Pretraga i ranking mentora"],
  ["POST", "/bookings", "Rezervacija bez preklapanja"], ["POST", "/bookings/:id/pay", "Naplata i raspodjela provizije"],
  ["POST", "/lessons/:id/end", "Završetak sata + AI paket"], ["POST", "/ai/tests", "Personalizirani test"],
  ["POST", "/conversations/:id/messages", "Moderirani chat"], ["GET", "/admin/dashboard", "Operativna analitika"],
];

export default function AdminDataPage() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [state, setState] = useState<"loading" | "online" | "offline">("loading");
  const [error, setError] = useState("");

  const fetchConsoleData = useCallback(() => Promise.all([
    apiFetch<AdminDashboard>("/admin/dashboard", { demoUserId: "admin-marta-oreskovic" }),
    apiFetch<Identity[]>("/demo/identities"), apiFetch<Subject[]>("/subjects"),
  ]), []);

  const load = useCallback(async () => {
    setState("loading"); setError("");
    try {
      const [dashboardResult, identityResult, subjectResult] = await fetchConsoleData();
      setDashboard(dashboardResult.data); setIdentities(identityResult.data); setSubjects(subjectResult.data); setState("online");
    } catch (caught) { setState("offline"); setError(caught instanceof Error ? caught.message : "API nije dostupan."); }
  }, [fetchConsoleData]);

  useEffect(() => {
    let cancelled = false;
    void fetchConsoleData().then(([dashboardResult, identityResult, subjectResult]) => {
      if (cancelled) return;
      setDashboard(dashboardResult.data); setIdentities(identityResult.data); setSubjects(subjectResult.data); setState("online");
    }).catch((caught) => {
      if (cancelled) return;
      setState("offline"); setError(caught instanceof Error ? caught.message : "API nije dostupan.");
    });
    return () => { cancelled = true; };
  }, [fetchConsoleData]);

  return (
    <AppShell role="admin" active="/admin/podaci" eyebrow="Backend & integracije" title="API i podatkovni model" action={<button className="button button-outline button-small" onClick={load}><RefreshCw size={15} className={state === "loading" ? "spin" : ""} /> Osvježi</button>}>
      <section className={`backend-status backend-status-${state}`}><div><span><Server /></span><p><small>GO · GIN · REST API</small><strong>{state === "online" ? "Backend je povezan" : state === "loading" ? "Provjeravam vezu…" : "Backend nije dostupan"}</strong><em>{API_BASE_URL}</em></p></div><div><i /> {state === "online" ? "Operativno" : state === "loading" ? "Provjera" : "Izvan mreže"}</div></section>
      {error && <div className="api-error"><ShieldCheck /> <span><strong>Nije moguće dohvatiti podatke.</strong>{error} Pokreni API naredbom iz backend README-a.</span></div>}
      <section className="backend-metrics">
        <div><span className="metric-icon blue"><Users /></span><p><small>KORISNICI</small><strong>{dashboard?.counts.users ?? "—"}</strong><em>{dashboard?.counts.tutors ?? 0} mentora · {dashboard?.counts.students ?? 0} učenika</em></p></div>
        <div><span className="metric-icon coral"><BookOpen /></span><p><small>PREDMETI</small><strong>{dashboard?.counts.subjects ?? (subjects.length || "—")}</strong><em>strukturirani katalog</em></p></div>
        <div><span className="metric-icon mint"><Activity /></span><p><small>REZERVACIJE</small><strong>{dashboard?.counts.bookings ?? "—"}</strong><em>{dashboard?.counts.lessons ?? 0} životnih ciklusa sati</em></p></div>
        <div><span className="metric-icon gold"><ShieldCheck /></span><p><small>TRUST SIGNALI</small><strong>{dashboard?.openTrustEvents ?? "—"}</strong><em>otvoreno za pregled</em></p></div>
      </section>
      <div className="backend-grid">
        <section className="dashboard-panel endpoint-panel"><div className="panel-heading"><div><span>REST UGOVOR</span><h3>Ključni endpointi</h3></div><Braces /></div>{endpoints.map(([method, path, description]) => <div className="endpoint-row" key={`${method}-${path}`}><code className={method === "GET" ? "get" : "post"}>{method}</code><code>{path}</code><span>{description}</span></div>)}</section>
        <section className="dashboard-panel dataset-panel"><div className="panel-heading"><div><span>SAMPLE DATASET</span><h3>Demo identiteti</h3></div><Database /></div><div className="identity-list">{identities.slice(0, 10).map((identity) => <div key={identity.id}><span>{identity.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><p><strong>{identity.name}</strong><small>{identity.id}</small></p><em>{identity.role === "tutor" ? "Profesor" : identity.role === "student" ? "Učenik" : "Admin"}</em></div>)}</div></section>
      </div>
      <section className="dashboard-panel data-flow-panel"><div><small>TRANSAKCIJSKI TOK</small><h3>Od rezervacije do trajnog znanja</h3></div><ol><li><span>01</span><strong>Termin</strong><small>Validacija dostupnosti</small></li><li><span>02</span><strong>Plaćanje</strong><small>15% provizije</small></li><li><span>03</span><strong>Videopoziv</strong><small>Snimka i transkript</small></li><li><span>04</span><strong>AI paket</strong><small>Sažetak, kviz, kartice</small></li><li><span>05</span><strong>Napredak</strong><small>Personalizirani profil</small></li></ol></section>
    </AppShell>
  );
}
