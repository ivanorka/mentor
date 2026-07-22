"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, Menu, UserRound } from "lucide-react";
import { Brand } from "./Brand";

export function MarketingHeader({ inverse = false }: { inverse?: boolean }) {
  const pathname = usePathname();
  const navigation = [
    ["/pronadi-profesora", "Profesori"],
    ["/predmeti", "Predmeti"],
  ] as const;
  const [guidanceOpen, setGuidanceOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const guidanceActive = ["/kako-radi", "/za-profesore", "/investitori"].includes(pathname);
  const closeMenu = () => {
    setMenuOpen(false);
    setGuidanceOpen(false);
  };

  return (
    <header className={`marketing-header ${inverse ? "marketing-header-inverse" : ""} ${menuOpen ? "menu-open" : ""}`}>
      <div className="container header-inner">
        <Brand inverse={inverse} />
        <nav className="marketing-nav" aria-label="Glavna navigacija">
          {navigation.map(([href, label]) => <Link href={href} className={pathname === href ? "active" : undefined} aria-current={pathname === href ? "page" : undefined} onClick={closeMenu} key={href}>{label}</Link>)}
          <div className={`guidance-menu ${guidanceOpen ? "open" : ""}`}>
            <button className={guidanceActive ? "guidance-trigger active" : "guidance-trigger"} onClick={() => setGuidanceOpen((open) => !open)} aria-expanded={guidanceOpen} aria-haspopup="menu">Upute <ChevronDown /></button>
            <div className="guidance-dropdown" role="menu">
              <Link href="/kako-radi" className={pathname === "/kako-radi" ? "active" : undefined} role="menuitem" onClick={closeMenu}>Učenici</Link>
              <Link href="/za-profesore" className={pathname === "/za-profesore" ? "active" : undefined} role="menuitem" onClick={closeMenu}>Profesori</Link>
              <Link href="/investitori" className={pathname === "/investitori" ? "active" : undefined} role="menuitem" onClick={closeMenu}>Investitori</Link>
            </div>
          </div>
        </nav>
        <div className="header-actions">
          <Link className="text-link header-login-link" href="/prijava" onClick={closeMenu}><UserRound /> Prijava</Link>
        </div>
        <button className="mobile-menu" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? "Zatvori izbornik" : "Otvori izbornik"} aria-expanded={menuOpen}><Menu /></button>
      </div>
    </header>
  );
}
