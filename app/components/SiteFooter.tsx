import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div><strong>GAUDEAMUS <em>MENTOR</em></strong><p>Učenje koje ostaje.</p></div>
        <div><h4>Učenici</h4><Link href="/pronadi-profesora">Pronađi profesora</Link><Link href="/kako-radi">Kako radi</Link><Link href="/ucenik/ai-mentor">AI Mentor</Link></div>
        <div><h4>Profesori</h4><Link href="/za-profesore">Postani mentor</Link><Link href="/profesor">Profesorski portal</Link><Link href="/sigurnost">Standardi kvalitete</Link></div>
        <div><h4>Platforma</h4><Link href="/investitori">Vizija i model</Link><Link href="/sigurnost">Sigurnost</Link><Link href="/kontakt">Kontakt</Link></div>
      </div>
      <div className="container footer-bottom"><span>© 2026 Gaudeamus Mentor. Konceptualni prototip.</span><span>Osijek · Hrvatska</span></div>
    </footer>
  );
}
