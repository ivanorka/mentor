"use client";

export type DemoRole = "student" | "tutor" | "admin";

export type DemoSession = {
  id: string;
  name: string;
  email: string;
  role: DemoRole;
  dashboard: string;
};

export type DemoIdentity = Pick<DemoSession, "id" | "name" | "email" | "role">;

const SESSION_KEY = "gm-demo-session";

export const DEMO_IDENTITIES: DemoIdentity[] = [
  { id: "student-luka-petrovic", name: "Luka Petrović", email: "luka.petrovic@example.test", role: "student" },
  { id: "student-mia-rogic", name: "Mia Rogić", email: "mia.rogic@example.test", role: "student" },
  { id: "student-nika-barisic", name: "Nika Barišić", email: "nika.barisic@example.test", role: "student" },
  { id: "tutor-ana-kovac", name: "Ana Kovač", email: "ana.kovac@example.test", role: "tutor" },
  { id: "tutor-marko-horvat", name: "Marko Horvat", email: "marko.horvat@example.test", role: "tutor" },
  { id: "tutor-lucija-maric", name: "Lucija Marić", email: "lucija.maric@example.test", role: "tutor" },
  { id: "admin-marta-oreskovic", name: "Marta Operacije", email: "marta@example.test", role: "admin" },
];

export function dashboardForDemoRole(role: DemoRole) {
  return role === "tutor" ? "/profesor" : role === "admin" ? "/admin" : "/ucenik";
}

export function saveDemoSession(input: Omit<DemoSession, "dashboard">): DemoSession {
  const session = { ...input, dashboard: dashboardForDemoRole(input.role) };
  if (typeof window !== "undefined") window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function demoSession(): DemoSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as DemoSession;
    return value?.email && value?.role ? value : null;
  } catch {
    return null;
  }
}

export function clearDemoSession() {
  if (typeof window !== "undefined") window.localStorage.removeItem(SESSION_KEY);
}

export function saveDemoIdentity(email: string, fallbackRole: DemoRole = "student") {
  const identity = DEMO_IDENTITIES.find((item) => item.email.toLocaleLowerCase() === email.trim().toLocaleLowerCase());
  return saveDemoSession(identity ?? {
    id: `demo-${fallbackRole}-${email.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-") || "user"}`,
    name: fallbackRole === "tutor" ? "Novi profesor" : "Novi učenik",
    email: email.trim() || "demo@gaudeamus.hr",
    role: fallbackRole,
  });
}

export type DemoSlot = { id: string; startsAt: string; endsAt: string; status: "open" };

/** Always gives a profile three bookable, future-facing slots in standalone demo mode. */
export function demoAvailability(slug: string): DemoSlot[] {
  const base = new Date();
  base.setHours(16, 0, 0, 0);
  if (base.getTime() <= Date.now()) base.setDate(base.getDate() + 1);
  const offset = [...slug].reduce((total, character) => total + character.charCodeAt(0), 0) % 4;
  return [0, 2, 4].map((day, index) => {
    const startsAt = new Date(base);
    startsAt.setDate(startsAt.getDate() + day + offset);
    startsAt.setHours(16 + ((offset + index) % 4), 0, 0, 0);
    const endsAt = new Date(startsAt);
    endsAt.setHours(endsAt.getHours() + 1);
    return { id: `demo-slot-${slug}-${index + 1}`, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), status: "open" };
  });
}
