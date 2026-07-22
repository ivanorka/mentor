import Link from "next/link";
import { Menu } from "lucide-react";
import { Brand } from "./Brand";

export function MarketingHeader({ inverse = false }: { inverse?: boolean }) {
  return (
    <header className={`marketing-header ${inverse ? "marketing-header-inverse" : ""}`}>
      <div className="container header-inner">
        <Brand inverse={inverse} />
        <nav className="marketing-nav" aria-label="Glavna navigacija">
          <Link href="/pronadi-profesora">Pronađi profesora</Link>
          <Link href="/predmeti">Predmeti</Link>
          <Link href="/kako-radi">Kako radi</Link>
          <Link href="/za-profesore">Za profesore</Link>
          <Link href="/sigurnost">Povjerenje</Link>
        </nav>
        <div className="header-actions">
          <Link className="text-link" href="/prijava">Prijava</Link>
          <Link className="button button-coral button-small" href="/pronadi-profesora">Započni učiti</Link>
        </div>
        <button className="mobile-menu" aria-label="Otvori izbornik"><Menu /></button>
      </div>
    </header>
  );
}
