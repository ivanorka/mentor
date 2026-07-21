"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, LoaderCircle, Mail } from "lucide-react";
import { Brand } from "../components/Brand";
import { apiFetch } from "../lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError("");
    try { await apiFetch("/auth/password/forgot", { method: "POST", body: JSON.stringify({ email }) }); setSent(true); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Zahtjev nije uspio."); }
    finally { setLoading(false); }
  };
  return <main className="standalone-auth"><Link href="/"><Brand /></Link><section className="login-card compact-auth-card">
    {sent ? <div className="auth-success"><CheckCircle2 /><span className="step-kicker">UPUTE SU SPREMNE</span><h1>Provjeri svoj e-mail</h1><p>Ako postoji račun za <strong>{email}</strong>, poslali smo upute za postavljanje nove lozinke. U prototipu je dostava simulirana.</p><Link className="button button-coral" href="/prijava"><ArrowLeft /> Natrag na prijavu</Link></div> : <form onSubmit={submit}><div className="auth-symbol"><Mail /></div><span className="step-kicker">OBNOVA PRISTUPA</span><h1>Zaboravljena lozinka?</h1><p>Upiši e-mail povezan s računom i poslat ćemo ti sigurne upute.</p><label className="form-label">E-mail adresa<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>{error && <div className="auth-error">{error}</div>}<button className="button button-coral login-button" disabled={loading}>{loading ? <LoaderCircle className="spin" /> : <>Pošalji upute <ArrowRight /></>}</button><Link className="back-auth-link" href="/prijava"><ArrowLeft /> Natrag na prijavu</Link></form>}
  </section></main>;
}
