"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, BookOpen, Check, Eye, EyeOff, GraduationCap, LoaderCircle, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { MarketingHeader } from "../components/MarketingHeader";
import { SiteFooter } from "../components/SiteFooter";
import { apiFetch, isStandaloneDemo } from "../lib/api";
import { saveDemoIdentity } from "../lib/demo";

type AuthResult = { user: { name: string; role: string }; dashboard: string; expiresAt: string };

const demoAccounts = {
  student: { email: "luka.petrovic@example.test", password: "Gaudeamus2026!" },
  tutor: { email: "ana.kovac@example.test", password: "Gaudeamus2026!" },
};

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRole = searchParams.get("role") === "tutor" ? "tutor" : "student";
  const [role, setRole] = useState<"student" | "tutor">(requestedRole);
  const [email, setEmail] = useState(demoAccounts[requestedRole].email);
  const [password, setPassword] = useState(demoAccounts[requestedRole].password);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(searchParams.get("error") === "google" ? "Google prijava nije dovršena. Pokušaj ponovno." : "");

  const chooseRole = (nextRole: "student" | "tutor") => {
    setRole(nextRole); setEmail(demoAccounts[nextRole].email); setPassword(demoAccounts[nextRole].password); setError("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError("");
    const returnTo = new URLSearchParams(window.location.search).get("returnTo");
    if (isStandaloneDemo()) {
      const session = saveDemoIdentity(email, role);
      router.push(returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : session.dashboard);
      return;
    }
    try {
      const { data } = await apiFetch<AuthResult>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      router.push(returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : data.dashboard);
    } catch {
      // The hosted investor demo deliberately remains usable when the optional Go API is not running.
      const session = saveDemoIdentity(email, role);
      router.push(returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : session.dashboard);
    }
    finally { setLoading(false); }
  };

  const googleLogin = () => {
    const returnTo = new URLSearchParams(window.location.search).get("returnTo") ?? (role === "tutor" ? "/profesor" : "/ucenik");
    // Go through the built-in account picker first: it works both with the local API and on a static demo deployment.
    window.location.href = `/auth/google-demo?returnTo=${encodeURIComponent(returnTo)}&role=${role}`;
  };

  return <div className="login-page"><MarketingHeader inverse /><div className="login-shell">
    <section className="login-story"><div className="login-story-copy"><span className="eyebrow eyebrow-light"><span /> Tvoj prostor za napredak</span><h1>Uči s više<br /><em>sigurnosti.</em></h1><p>Sati, materijali i AI podrška ostaju povezani — tako svaki sljedeći korak ima smisla.</p><ul className="login-story-proof"><li><Check /> Provjereni mentori i sigurna rezervacija</li><li><Check /> AI sažetak nakon svakog sata</li><li><Check /> Jedan jasan pregled napretka</li></ul></div><div className="login-quote"><Sparkles /><p>“Napredak postaje stvaran kada ga možeš vidjeti.”</p><span>Gaudeamus Mentor</span></div></section>
    <section className="login-form-side"><form className="login-card" onSubmit={submit}><span className="step-kicker">SIGURNA PRIJAVA</span><h2>Nastavi gdje si stao</h2><p>Prijavi se postojećim računom ili nastavi uz Google.</p>
      <div className="role-pick"><button type="button" className={role === "student" ? "selected" : ""} onClick={() => chooseRole("student")}><BookOpen /><span><strong>Učenik</strong><small>Učenje, sati i AI Mentor</small></span>{role === "student" && <Check />}</button><button type="button" className={role === "tutor" ? "selected" : ""} onClick={() => chooseRole("tutor")}><GraduationCap /><span><strong>Profesor</strong><small>Kalendar, učenici i zarada</small></span>{role === "tutor" && <Check />}</button></div>
      <button type="button" className="google-auth-button" onClick={googleLogin}><span>G</span>Nastavi s Google računom</button><div className="auth-divider"><span>ili e-mailom</span></div>
      <label className="form-label">E-mail adresa<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
      <label className="form-label">Lozinka<div className="password-input"><input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Sakrij lozinku" : "Prikaži lozinku"}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label>
      <div className="auth-utility"><label><input type="checkbox" defaultChecked /> Zapamti me</label><Link href="/zaboravljena-lozinka">Zaboravljena lozinka?</Link></div>
      {error && <div className="auth-error"><LockKeyhole /> {error}</div>}
      <button type="submit" disabled={loading} className="button button-coral login-button">{loading ? <LoaderCircle className="spin" /> : <>Prijavi se <ArrowRight /></>}</button>
      <div className="login-trust"><ShieldCheck /> HttpOnly session · lozinka je zaštićena bcryptom</div>
      <div className="login-registration"><div><strong>Nemaš račun?</strong><small>Kreiraj besplatan profil i pronađi mentora u nekoliko koraka.</small></div><Link href={`/registracija?role=${role}`}>Kreiraj račun <ArrowRight /></Link></div>
      <span className="demo-admin">Investitorski demo? <Link href="/admin">Otvori operativni pregled</Link></span>
    </form></section>
  </div><SiteFooter /></div>;
}

export default function LoginPage() {
  return <Suspense fallback={<div className="route-loading" role="status">Pripremamo prijavu…</div>}><LoginContent /></Suspense>;
}
