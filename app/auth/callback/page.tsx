"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { Brand } from "../../components/Brand";
import { apiFetch } from "../../lib/api";
import { demoSession } from "../../lib/demo";

type Session = { dashboard: string };
export default function GoogleCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  useEffect(() => {
    const returnTo = new URLSearchParams(window.location.search).get("returnTo");
    apiFetch<Session>("/auth/session").then(({ data }) => router.replace(returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : data.dashboard)).catch(() => {
      const session = demoSession();
      if (session) router.replace(returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : session.dashboard);
      else setError("Prijava nije dovršena.");
    });
  }, [router]);
  return <main className="standalone-auth"><Brand /><section className="login-card compact-auth-card auth-callback">{error ? <><h1>Prijava nije dovršena</h1><p>{error}</p><Link className="button button-coral" href="/prijava">Pokušaj ponovno</Link></> : <><LoaderCircle className="spin" /><h1>Pripremamo tvoj prostor</h1><p>Google račun je potvrđen. Preusmjeravamo te na nadzornu ploču.</p></>}</section></main>;
}
