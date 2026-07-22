"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy URLs never expose seeded identities: Google sign-in now uses OAuth. */
export default function LegacyGoogleDemoPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/prijava?error=google"); }, [router]);
  return <div className="route-loading" role="status">Preusmjeravamo na sigurnu Google prijavu…</div>;
}
