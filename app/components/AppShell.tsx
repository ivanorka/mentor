import Link from "next/link";
import {
  BarChart3, BookOpen, Bot, CalendarDays, CircleDollarSign,
  Compass, Database, Headphones, LayoutDashboard, MessageCircle, Search, Settings,
  ShieldCheck, Sparkles, Users, Video,
} from "lucide-react";
import { Brand } from "./Brand";
import { SessionControls, SidebarProfile } from "./SessionControls";

type Role = "student" | "tutor" | "admin";

const navByRole = {
  student: [
    ["/ucenik", "Pregled", LayoutDashboard],
    ["/pronadi-profesora", "Pronađi profesora", Search],
    ["/ucenik/lekcije/derivacije", "Moje lekcije", BookOpen],
    ["/ucenik/ai-mentor", "AI Mentor", Bot],
    ["/ucenik/sat/matematika-derivacije", "Učionica", Video],
    ["/ucenik/poruke", "Poruke", MessageCircle],
  ],
  tutor: [
    ["/profesor", "Pregled", LayoutDashboard],
    ["/profesor/kalendar", "Kalendar", CalendarDays],
    ["/profesor/ucenici", "Učenici", Users],
    ["/profesor/lekcije", "Lekcije", BookOpen],
    ["/profesor/zarada", "Zarada", CircleDollarSign],
    ["/profesor/poruke", "Poruke", MessageCircle],
  ],
  admin: [
    ["/admin", "Command center", Compass],
    ["/admin/korisnici", "Korisnici", Users],
    ["/admin/sati", "Sati i kvaliteta", Video],
    ["/admin/financije", "Financije", BarChart3],
    ["/admin/sigurnost", "Trust & safety", ShieldCheck],
    ["/admin/podaci", "API & podaci", Database],
    ["/admin/podrska", "Podrška", Headphones],
  ],
} as const;

export function AppShell({ role, active, title, eyebrow, children, action }: {
  role: Role;
  active: string;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const roleLabel = role === "student" ? "Učenik" : role === "tutor" ? "Profesor" : "Operacije";
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <Brand inverse compact />
        <div className="role-label"><Sparkles size={14} /> {roleLabel} prostor</div>
        <nav className="app-nav" aria-label={`${roleLabel} navigacija`}>
          {navByRole[role].map(([href, label, Icon]) => (
            <Link className={active === href ? "active" : ""} href={href} key={href}>
              <Icon size={19} /> <span>{label}</span>
              {label === "AI Mentor" && <em>Novo</em>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/postavke"><Settings size={18} /> Postavke</Link>
          <SidebarProfile role={role} />
        </div>
      </aside>
      <main className="app-main">
        <header className="app-topbar">
          <div><span className="app-eyebrow">{eyebrow || roleLabel}</span><h1>{title}</h1></div>
          <div className="app-top-actions">{action}<SessionControls role={role} /></div>
        </header>
        <div className="app-content">{children}</div>
      </main>
    </div>
  );
}
