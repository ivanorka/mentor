"use client";

import { Suspense, useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Bell, BrainCircuit, Check, Download, LoaderCircle, LockKeyhole, LogOut, ShieldCheck, Trash2, User } from "lucide-react";
import { Brand } from "../components/Brand";
import { apiFetch } from "../lib/api";
import { clearDemoSession, demoSession } from "../lib/demo";

type Tab = "profil" | "obavijesti" | "privatnost" | "ai";
type UserData = { id: string; name: string; email: string; role: string; locale: string; emailVerified: boolean; authProvider: string };

const toggleDefaults = { emailLessons: true, emailMaterials: true, emailMarketing: false, aiMemory: true, knowledgeContribution: true, recording: true, profileVisibility: true };
type ToggleKey = keyof typeof toggleDefaults;

function SettingToggle({ title, description, icon, enabled, onToggle }: { setting: ToggleKey; title: string; description: string; icon: ReactNode; enabled: boolean; onToggle: () => void }) {
  return <div className="setting-toggle">{icon}<span><strong>{title}</strong><small>{description}</small></span><button className={enabled ? "on" : "off"} onClick={onToggle} aria-pressed={enabled} aria-label={`${title}: ${enabled ? "uključeno" : "isključeno"}`}><i /></button></div>;
}

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(() => requestedTab === "obavijesti" || requestedTab === "privatnost" || requestedTab === "ai" ? requestedTab : "profil");
  const [user, setUser] = useState<UserData | null>(null);
  const [name, setName] = useState("");
  const [locale, setLocale] = useState("hr-HR");
  const [toggles, setToggles] = useState(toggleDefaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("gm-preferences"); if (stored) queueMicrotask(() => setToggles({ ...toggleDefaults, ...JSON.parse(stored) }));
    apiFetch<UserData>("/users/me").then(({ data }) => { setUser(data); setName(data.name); setLocale(data.locale); }).catch(() => {
      const session = demoSession();
      if (!session) return setError("Prijavi se kako bi upravljao računom.");
      const demoUser = { ...session, locale: "hr-HR", emailVerified: true, authProvider: "google-demo" };
      setUser(demoUser); setName(demoUser.name); setLocale(demoUser.locale);
    }).finally(() => setLoading(false));
  }, []);
  const toggle = (key: ToggleKey) => setToggles((current) => ({ ...current, [key]: !current[key] }));
  const save = async () => {
    if (!user) return; setSaving(true); setError("");
    try { const { data } = await apiFetch<UserData>("/users/me", { method: "PATCH", body: JSON.stringify({ name, locale }) }); setUser(data); localStorage.setItem("gm-preferences", JSON.stringify(toggles)); setNotice("Promjene su sigurno spremljene."); }
    catch { setUser((current) => current ? { ...current, name, locale } : current); localStorage.setItem("gm-preferences", JSON.stringify(toggles)); setNotice("Promjene su spremljene u ovom demo pregledniku."); }
    finally { setSaving(false); }
  };
  const logout = async () => { await apiFetch("/auth/logout", { method: "POST", body: "{}" }).catch(() => undefined); clearDemoSession(); router.push("/prijava"); };
  const exportData = () => {
    const content = JSON.stringify({ user, preferences: toggles, exportedAt: new Date().toISOString() }, null, 2);
    const url = URL.createObjectURL(new Blob([content], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = "gaudeamus-moji-podaci.json"; link.click(); URL.revokeObjectURL(url); setNotice("Izvoz podataka je preuzet.");
  };
  return <div className="settings-page"><header><Brand /><Link href={user?.role === "tutor" ? "/profesor" : user?.role === "admin" ? "/admin" : "/ucenik"}><ArrowLeft /> Natrag u aplikaciju</Link></header><main><div><span className="eyebrow"><span /> Kontrola računa</span><h1>Postavke</h1><p>Upravljaj profilom, obavijestima, privatnošću i memorijom učenja.</p></div><nav>{([ ["profil", User, "Profil"], ["obavijesti", Bell, "Obavijesti"], ["privatnost", LockKeyhole, "Privatnost"], ["ai", BrainCircuit, "AI memorija"] ] as const).map(([id, Icon, label]) => <button className={tab === id ? "active" : ""} onClick={() => { setTab(id); setNotice(""); }} key={id}><Icon /> {label}</button>)}</nav><section>
    {loading ? <div className="settings-loading"><LoaderCircle className="spin" /> Učitavamo postavke…</div> : error && !user ? <div className="settings-auth-needed"><LockKeyhole /><h2>Prijava je potrebna</h2><p>{error}</p><Link className="button button-coral" href="/prijava?returnTo=/postavke">Prijavi se</Link></div> : <>
      {tab === "profil" && <><div className="settings-section-head"><div><h2>Osobni podaci</h2><p>Podaci koji se prikazuju na tvom Gaudeamus računu.</p></div>{user?.emailVerified && <span><ShieldCheck /> E-mail potvrđen</span>}</div><label className="form-label">Ime i prezime<input value={name} onChange={(event) => setName(event.target.value)} /></label><label className="form-label">E-mail<input value={user?.email || ""} disabled /><small>Promjena e-maila zahtijevat će ponovnu potvrdu u produkciji.</small></label><label className="form-label">Jezik sučelja<select value={locale} onChange={(event) => setLocale(event.target.value)}><option value="hr-HR">Hrvatski</option><option value="en-GB">English</option></select></label><div className="connected-account"><span>G</span><div><strong>{user?.authProvider.includes("google") ? "Google račun je povezan" : "Google račun nije povezan"}</strong><small>Prijava bez dodatne lozinke</small></div><Link href="/prijava">Upravljaj</Link></div></>}
      {tab === "obavijesti" && <><h2>Obavijesti</h2><p className="settings-description">Odaberi što želiš primati na e-mail i u aplikaciji.</p><SettingToggle setting="emailLessons" enabled={toggles.emailLessons} onToggle={() => toggle("emailLessons")} title="Podsjetnici za sat" description="24 sata i 15 minuta prije početka." icon={<Bell />} /><SettingToggle setting="emailMaterials" enabled={toggles.emailMaterials} onToggle={() => toggle("emailMaterials")} title="Novi AI materijali" description="Kada su sažetak, kviz i snimka spremni." icon={<BrainCircuit />} /><SettingToggle setting="emailMarketing" enabled={toggles.emailMarketing} onToggle={() => toggle("emailMarketing")} title="Novosti i preporuke" description="Povremeni sadržaj i novi mentori." icon={<Bell />} /></>}
      {tab === "privatnost" && <><h2>Privatnost i podaci</h2><p className="settings-description">Ti odlučuješ koji su podaci aktivni i što možeš izvesti.</p><SettingToggle setting="recording" enabled={toggles.recording} onToggle={() => toggle("recording")} title="Snimanje online sata" description="Snimke su privatne i dostupne 30 dana." icon={<ShieldCheck />} /><SettingToggle setting="profileVisibility" enabled={toggles.profileVisibility} onToggle={() => toggle("profileVisibility")} title="Vidljivost profila" description="Profesorima s rezervacijom pokaži svoj cilj učenja." icon={<User />} /><div className="privacy-actions"><button onClick={exportData}><Download /> Preuzmi moje podatke</button><button onClick={() => setNotice("Zahtjev za brisanje evidentiran je u demo centru privatnosti.")}><Trash2 /> Zatraži brisanje računa</button></div></>}
      {tab === "ai" && <><h2>AI memorija učenja</h2><p className="settings-description">Memorija služi personaliziranju objašnjenja, testova i sljedećih koraka.</p><SettingToggle setting="aiMemory" enabled={toggles.aiMemory} onToggle={() => toggle("aiMemory")} title="Personalizirana memorija" description="AI pamti teme, obrasce pogrešaka i preferirani stil objašnjenja." icon={<BrainCircuit />} /><SettingToggle setting="knowledgeContribution" enabled={toggles.knowledgeContribution} onToggle={() => toggle("knowledgeContribution")} title="Anonimni doprinos bazi znanja" description="Uzorci iz lekcija koriste se bez osobnih podataka." icon={<LockKeyhole />} /><div className="ai-memory-card"><BrainCircuit /><span><strong>Aktivna memorija</strong><small>Derivacije · 4 uvida · stil: primjeri korak po korak</small></span><Link href="/ucenik/ai-mentor">Otvori AI Mentor</Link></div></>}
      {error && <div className="auth-error">{error}</div>}{notice && <div className="settings-notice"><Check /> {notice}</div>}<div className="settings-footer"><button className="button button-coral" onClick={save} disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <><Check /> Spremi promjene</>}</button><button className="logout-button" onClick={logout}><LogOut /> Odjavi se</button></div>
    </>}
  </section></main></div>;
}

export default function SettingsPage() {
  return <Suspense fallback={<div className="route-loading" role="status">Učitavamo postavke…</div>}><SettingsContent /></Suspense>;
}
