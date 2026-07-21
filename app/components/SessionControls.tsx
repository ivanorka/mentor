"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, BookOpen, ChevronDown, LogOut, MessageCircle, Settings, UserRound, X } from "lucide-react";
import { apiFetch } from "../lib/api";
import { clearDemoSession, demoSession } from "../lib/demo";

type Role = "student" | "tutor" | "admin";
type UserData = { id: string; name: string; email: string; role: Role };
const fallbackByRole = { student: { name: "Luka Petrović", initials: "LP" }, tutor: { name: "Ana Kovač", initials: "AK" }, admin: { name: "Marta Operacije", initials: "MO" } };
const initials = (name: string) => name.split(" ").map((part) => part[0]).join("").slice(0, 2);

export function SidebarProfile({ role }: { role: Role }) {
  const [user, setUser] = useState<UserData | null>(null);
  useEffect(() => { apiFetch<{ user: UserData }>("/auth/session").then(({ data }) => setUser(data.user)).catch(() => { const session = demoSession(); if (session) setUser(session); }); }, []);
  const fallback = fallbackByRole[role];
  return <Link className="mini-profile" href="/postavke"><span className="mini-avatar">{user ? initials(user.name) : fallback.initials}</span><span><strong>{user?.name.split(" ")[0] || fallback.name.split(" ")[0]}</strong><small>{user ? "Upravljaj računom" : "Demo profil"}</small></span><ChevronDown size={15} /></Link>;
}

export function SessionControls({ role }: { role: Role }) {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [read, setRead] = useState(false);
  useEffect(() => { apiFetch<{ user: UserData }>("/auth/session").then(({ data }) => setUser(data.user)).catch(() => { const session = demoSession(); if (session) setUser(session); }); }, []);
  const fallback = fallbackByRole[role];
  const logout = async () => { await apiFetch("/auth/logout", { method: "POST", body: "{}" }).catch(() => undefined); clearDemoSession(); router.push("/prijava"); };
  return <div className="session-controls"><button className="icon-button notification" onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false); }} aria-label="Obavijesti">{!read && <span>3</span>}<Bell /></button><button className="top-profile-button" onClick={() => { setProfileOpen(!profileOpen); setNotificationsOpen(false); }}><span className="mini-avatar">{user ? initials(user.name) : fallback.initials}</span><ChevronDown /></button>
    {notificationsOpen && <div className="notifications-popover"><header><strong>Obavijesti</strong><button onClick={() => setNotificationsOpen(false)} aria-label="Zatvori"><X /></button></header><Link href="/ucenik"><BookOpen /><span><strong>AI sažetak je spreman</strong><small>Derivacije složenih funkcija · prije 8 min</small></span></Link><Link href="/ucenik/poruke"><MessageCircle /><span><strong>Nova poruka mentora</strong><small>Ana je odgovorila u sigurnom razgovoru.</small></span></Link><Link href={role === "tutor" ? "/profesor/kalendar" : "/ucenik/sat/matematika-derivacije"}><Bell /><span><strong>Sat počinje uskoro</strong><small>Podsjetnik je postavljen 15 minuta prije.</small></span></Link><button className="mark-read" onClick={() => { setRead(true); setNotificationsOpen(false); }}>Označi sve pročitanim</button></div>}
    {profileOpen && <div className="profile-popover"><div><span className="mini-avatar">{user ? initials(user.name) : fallback.initials}</span><span><strong>{user?.name || fallback.name}</strong><small>{user?.email || "Demo način rada"}</small></span></div><Link href="/postavke"><Settings /> Postavke računa</Link>{role === "tutor" && <Link href="/profesori/ana-kovac"><UserRound /> Javni profil</Link>}<button onClick={logout}><LogOut /> Odjavi se</button></div>}
  </div>;
}
