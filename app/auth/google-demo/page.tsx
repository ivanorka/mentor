"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Check, GraduationCap, LoaderCircle, ShieldCheck } from "lucide-react";
import { Brand } from "../../components/Brand";
import { apiFetch } from "../../lib/api";

type Identity = { id: string; email: string; name: string; role: "student" | "tutor" | "admin" };
type AuthResult = { dashboard: string };
function GoogleDemoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestedReturnTo = searchParams.get("returnTo");
  const returnTo = requestedReturnTo?.startsWith("/") && !requestedReturnTo.startsWith("//") ? requestedReturnTo : "/ucenik";
  const role = returnTo.startsWith("/profesor") ? "tutor" : "student";
  const visible = useMemo(() => identities.filter((item) => item.role === role).slice(0, 5), [identities, role]);
  useEffect(() => {
    apiFetch<Identity[]>("/demo/identities").then(({ data }) => { setIdentities(data); setLoading(false); }).catch((caught) => { setError(caught instanceof Error ? caught.message : "Demo računi se ne mogu učitati."); setLoading(false); });
  }, []);
  const selectedEmail = visible.some((identity) => identity.email === selected) ? selected : visible[0]?.email || "";
  const login = async () => {
    if (!selectedEmail) return; setLoading(true); setError("");
    try { const { data } = await apiFetch<AuthResult>("/auth/google/demo", { method: "POST", body: JSON.stringify({ email: selectedEmail }) }); router.push(returnTo || data.dashboard); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Demo prijava nije uspjela."); setLoading(false); }
  };
  return <main className="standalone-auth"><Brand /><section className="login-card google-demo-card"><div className="demo-mode-notice"><ShieldCheck /> Lokalni SSO demo — Google ključevi nisu konfigurirani</div><span className="google-mark">G</span><span className="step-kicker">ODABIR GOOGLE RAČUNA</span><h1>Nastavi u Gaudeamus Mentor</h1><p>U produkciji se ovdje prikazuje službeni Google ekran. Za investitorski prototip odaberi jedan od sigurnih seed računa.</p>
    <div className="demo-role"><span>{role === "student" ? <BookOpen /> : <GraduationCap />}{role === "student" ? "Učenički prostor" : "Profesorski prostor"}</span><Link href={`/auth/google-demo?returnTo=${role === "student" ? "/profesor" : "/ucenik"}`}>Promijeni ulogu</Link></div>
    <div className="identity-list">{loading && identities.length === 0 ? <LoaderCircle className="spin" /> : visible.map((identity) => <button type="button" className={selectedEmail === identity.email ? "selected" : ""} onClick={() => setSelected(identity.email)} key={identity.id}><span>{identity.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><span><strong>{identity.name}</strong><small>{identity.email}</small></span>{selectedEmail === identity.email && <Check />}</button>)}</div>
    {error && <div className="auth-error">{error}</div>}<button className="button button-coral login-button" onClick={login} disabled={loading || !selectedEmail}>{loading && identities.length > 0 ? <LoaderCircle className="spin" /> : <>Nastavi <ArrowRight /></>}</button><Link className="back-auth-link" href="/prijava"><ArrowLeft /> Natrag na prijavu</Link>
  </section></main>;
}

export default function GoogleDemoPage() {
  return <Suspense fallback={<div className="route-loading" role="status">Učitavamo Google prijavu…</div>}><GoogleDemoContent /></Suspense>;
}
