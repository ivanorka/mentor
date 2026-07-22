"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle, ShieldCheck } from "lucide-react";
import { Brand } from "../components/Brand";
import { apiFetch } from "../lib/api";

export default function SuperadminLogin() {
  const router=useRouter(); const [email,setEmail]=useState("ilozancic@gmail.com"); const [password,setPassword]=useState(""); const [show,setShow]=useState(false); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  const submit=async(e:FormEvent)=>{e.preventDefault();setLoading(true);setError("");try{const {data}=await apiFetch<{user:{role:string}}>("/auth/login",{method:"POST",body:JSON.stringify({email,password})});if(data.user.role!=="admin")throw new Error("Ovaj račun nema God Mode ovlasti.");router.replace("/superdmin/upravljanje")}catch(err){setError(err instanceof Error?err.message:"Prijava nije uspjela.")}finally{setLoading(false)}};
  return <main className="superadmin-login"><section><Brand inverse/><span className="eyebrow eyebrow-light"><span/> PRIVATNI PRISTUP PLATFORMI</span><h1>God Mode<br/><em>Gaudeamus Mentor.</em></h1><p>Upravljanje učenicima, partnerima, statusima računa i operativnim pristupom na jednom zaštićenom mjestu.</p><div><ShieldCheck/> Superadmin pristup je evidentiran i zaštićen.</div></section><form onSubmit={submit}><span className="step-kicker">SUPERADMIN PRIJAVA</span><h2>Upravljaj platformom.</h2><p>Prijavi se svojim superadmin računom za nastavak.</p><label className="form-label">E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required/></label><label className="form-label">Lozinka<div className="password-input"><input type={show?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required autoFocus/><button type="button" onClick={()=>setShow(!show)}>{show?<EyeOff/>:<Eye/>}</button></div></label>{error&&<div className="auth-error">{error}</div>}<button className="button button-coral" disabled={loading}>{loading?<LoaderCircle className="spin"/>:"Otvori God Mode"}</button></form></main>;
}
