"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, Check, Eye, EyeOff, GraduationCap, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import { Brand } from "../components/Brand";
import { API_BASE_URL, apiFetch } from "../lib/api";

type Role = "student" | "tutor";
type Subject = { id: string; name: string; category: string };
type AuthResult = { dashboard: string };

export default function RegistrationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<Role>(() => searchParams.get("role") === "tutor" ? "tutor" : "student");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [grade, setGrade] = useState("3. razred srednje škole");
  const [school, setSchool] = useState("");
  const [goal, setGoal] = useState("Popraviti ocjenu i steći sigurnost u gradivu");
  const [headline, setHeadline] = useState("Strpljivo i jasno do sigurnog znanja");
  const [bio, setBio] = useState("");
  const [price, setPrice] = useState(18);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<Subject[]>("/subjects").then(({ data }) => setSubjects(data)).catch(() => setError("Predmeti se trenutačno ne mogu učitati."));
  }, []);

  const passwordChecks = useMemo(() => [
    [password.length >= 10, "10+ znakova"],
    [/[A-ZČĆĐŠŽ]/.test(password), "veliko slovo"],
    [/[a-zčćđšž]/.test(password), "malo slovo"],
    [/\d/.test(password), "broj"],
  ] as const, [password]);

  const continueToProfile = (event: FormEvent) => {
    event.preventDefault(); setError("");
    if (name.trim().length < 3) return setError("Upišite ime i prezime.");
    if (!email.includes("@")) return setError("Upišite valjanu e-mail adresu.");
    if (passwordChecks.some(([valid]) => !valid)) return setError("Lozinka još ne ispunjava sva pravila.");
    if (password !== confirmPassword) return setError("Lozinke se ne podudaraju.");
    if (!acceptedTerms) return setError("Prihvatite uvjete korištenja i pravila privatnosti.");
    setStep(2);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError("");
    if (role === "tutor" && selectedSubjects.length === 0) return setError("Odaberite barem jedan predmet.");
    setLoading(true);
    try {
      const { data } = await apiFetch<AuthResult>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role, acceptedTerms, grade, school, goals: goal ? [goal] : [], headline, bio, subjectIds: selectedSubjects, priceEur: price }),
      });
      router.push(data.dashboard);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Registracija nije uspjela."); }
    finally { setLoading(false); }
  };

  const googleLogin = () => {
    const returnTo = role === "tutor" ? "/profesor" : "/ucenik";
    window.location.href = `${API_BASE_URL}/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`;
  };

  return <div className="login-page registration-page">
    <section className="login-story registration-story"><Brand inverse /><div><span className="eyebrow eyebrow-light"><span /> Tvoj početak</span><h1>Znanje dobiva<br />svoj <em>ritam.</em></h1><p>Profil, termini, materijali i napredak povezani u jedno iskustvo.</p></div><div className="register-benefits"><span><Check /> Besplatan račun</span><span><Check /> Provjereni profesori</span><span><Check /> AI materijali nakon sata</span></div></section>
    <section className="login-form-side"><form className="login-card register-card" onSubmit={step === 1 ? continueToProfile : submit}>
      <div className="mobile-brand"><Brand /></div>
      <div className="register-progress"><span className="active">1</span><i className={step === 2 ? "active" : ""} /><span className={step === 2 ? "active" : ""}>2</span><small>{step === 1 ? "Račun" : "Tvoj profil"}</small></div>
      <span className="step-kicker">KORAK {step} OD 2</span><h2>{step === 1 ? "Kreiraj svoj račun" : role === "student" ? "Personaliziraj učenje" : "Predstavi svoje znanje"}</h2>
      <p>{step === 1 ? "Odaberi prostor koji želiš koristiti." : "Ove podatke kasnije možeš promijeniti u postavkama."}</p>
      {step === 1 ? <>
        <div className="role-pick"><button type="button" className={role === "student" ? "selected" : ""} onClick={() => setRole("student")}><BookOpen /><span><strong>Učenik</strong><small>Pronađi mentora i uči</small></span>{role === "student" && <Check />}</button><button type="button" className={role === "tutor" ? "selected" : ""} onClick={() => setRole("tutor")}><GraduationCap /><span><strong>Profesor</strong><small>Predaj i izgradi reputaciju</small></span>{role === "tutor" && <Check />}</button></div>
        <button type="button" className="google-auth-button" onClick={googleLogin}><span>G</span>Nastavi s Google računom</button><div className="auth-divider"><span>ili e-mailom</span></div>
        <label className="form-label">Ime i prezime<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="npr. Petra Horvat" required /></label>
        <label className="form-label">E-mail adresa<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="petra@email.com" required /></label>
        <label className="form-label">Lozinka<div className="password-input"><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Prikaži ili sakrij lozinku">{showPassword ? <EyeOff /> : <Eye />}</button></div></label>
        <div className="password-rules">{passwordChecks.map(([valid, label]) => <span className={valid ? "valid" : ""} key={label}><Check /> {label}</span>)}</div>
        <label className="form-label">Ponovi lozinku<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required /></label>
        <label className="terms-row"><input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} /> <span>Prihvaćam <Link href="/sigurnost">uvjete korištenja i pravila privatnosti</Link>.</span></label>
      </> : role === "student" ? <>
        <label className="form-label">Razred<select value={grade} onChange={(event) => setGrade(event.target.value)}><option>7. razred osnovne škole</option><option>8. razred osnovne škole</option><option>1. razred srednje škole</option><option>2. razred srednje škole</option><option>3. razred srednje škole</option><option>4. razred srednje škole</option><option>Fakultet</option></select></label>
        <label className="form-label">Škola ili fakultet <small>neobavezno</small><input value={school} onChange={(event) => setSchool(event.target.value)} placeholder="Naziv škole" /></label>
        <label className="form-label">Glavni cilj<textarea value={goal} onChange={(event) => setGoal(event.target.value)} rows={3} /></label>
        <div className="onboarding-preview"><Sparkles /><span><strong>AI Mentor prilagodit će se ovom cilju</strong><small>Nakon svakog sata prati teme, pogreške i sljedeći najbolji korak.</small></span></div>
      </> : <>
        <label className="form-label">Profesionalni naslov<input value={headline} onChange={(event) => setHeadline(event.target.value)} required /></label>
        <label className="form-label">Kratko predstavljanje<textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={3} placeholder="Opišite svoj pristup, iskustvo i kome najviše pomažete." /></label>
        <fieldset className="subject-picker"><legend>Predmeti koje predaješ</legend><div>{subjects.map((subject) => <button type="button" className={selectedSubjects.includes(subject.id) ? "selected" : ""} onClick={() => setSelectedSubjects((current) => current.includes(subject.id) ? current.filter((id) => id !== subject.id) : [...current, subject.id])} key={subject.id}>{selectedSubjects.includes(subject.id) && <Check />} {subject.name}</button>)}</div></fieldset>
        <label className="form-label price-label">Početna cijena sata <strong>{price} €</strong><input type="range" min="10" max="60" value={price} onChange={(event) => setPrice(Number(event.target.value))} /></label>
        <div className="onboarding-preview"><ShieldCheck /><span><strong>Verifikacija slijedi nakon registracije</strong><small>Dodaj diplomu, certifikate i video kako bi profil dobio veću vidljivost.</small></span></div>
      </>}
      {error && <div className="auth-error">{error}</div>}
      <div className="registration-actions">{step === 2 && <button type="button" className="button button-ghost" onClick={() => { setStep(1); setError(""); }}><ArrowLeft /> Natrag</button>}<button type="submit" disabled={loading} className="button button-coral">{loading ? <LoaderCircle className="spin" /> : <>{step === 1 ? "Nastavi" : "Kreiraj račun"} <ArrowRight /></>}</button></div>
      <span className="demo-admin">Već imaš račun? <Link href={`/prijava?role=${role}`}>Prijavi se</Link></span>
    </form></section>
  </div>;
}
