"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, BadgeCheck, BookOpen, CalendarDays, ChevronRight, Clock3,
  FileCheck2, GraduationCap, Heart, LoaderCircle, MessageCircle, Play, Quote,
  RotateCcw, ShieldCheck, Sparkles, Star, Users, Video,
} from "lucide-react";
import { MarketingHeader } from "../../components/MarketingHeader";
import { SiteFooter } from "../../components/SiteFooter";
import type { Tutor } from "../../data";
import { educationLevelLabel } from "../../lib/catalog";
import { apiFetch } from "../../lib/api";
import { demoAvailability } from "../../lib/demo";

type APITutor = {
  userId: string;
  slug: string;
  headline: string;
  bio: string;
  videoUrl?: string;
  subjects: { subjectId: string; priceEur: number; levels: string[] }[];
  subjectDetails: { id: string; slug: string; name: string; category: string; levels: string[] }[];
  languages: string[];
  qualifications: { title: string; issuer: string; year: number; verified: boolean }[];
  rating: number;
  reviewCount: number;
  lessonsCompleted: number;
  uniqueStudents: number;
  repeatRate: number;
  responseMinutes: number;
  badge: string;
  verified: boolean;
  reputationScore: number;
  user: { name: string };
};

type AvailabilitySlot = { id: string; startsAt: string; endsAt: string; status: string };
type APIReview = { id: string; rating: number; comment: string; createdAt: string };
type Offering = { subjectId: string; subjectSlug: string; subject: string; price: number; levels: string[] };
type Profile = {
  userId: string;
  slug: string;
  name: string;
  initials: string;
  headline: string;
  bio: string;
  accent: string;
  offerings: Offering[];
  languages: string[];
  qualifications: { title: string; issuer: string; year: number; verified: boolean }[];
  rating: number;
  reviewCount: number;
  lessons: number;
  students: number;
  repeatRate: number;
  responseMinutes: number;
  badge: string;
  verified: boolean;
  video: boolean;
  reputationScore: number;
};

const accents = ["coral", "blue", "gold", "mint"];
const initials = (name: string) => name.split(" ").map((part) => part[0]).join("").slice(0, 2);
const dayKey = (value: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zagreb" }).format(new Date(value));
const shortTime = (value: string) => new Intl.DateTimeFormat("hr-HR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Zagreb" }).format(new Date(value));
const shortDate = (value: string) => new Intl.DateTimeFormat("hr-HR", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Zagreb" }).format(new Date(value));

function fromAPI(item: APITutor): Profile {
  return {
    userId: item.userId,
    slug: item.slug,
    name: item.user.name,
    initials: initials(item.user.name),
    headline: item.headline,
    bio: item.bio,
    accent: accents[Math.abs(item.slug.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)) % accents.length],
    offerings: item.subjects.map((offering) => {
      const subject = item.subjectDetails.find((detail) => detail.id === offering.subjectId);
      return { subjectId: offering.subjectId, subjectSlug: subject?.slug ?? offering.subjectId, subject: subject?.name ?? offering.subjectId, price: offering.priceEur, levels: offering.levels };
    }),
    languages: item.languages,
    qualifications: item.qualifications,
    rating: item.rating,
    reviewCount: item.reviewCount,
    lessons: item.lessonsCompleted,
    students: item.uniqueStudents,
    repeatRate: item.repeatRate,
    responseMinutes: item.responseMinutes,
    badge: item.badge,
    verified: item.verified,
    video: Boolean(item.videoUrl),
    reputationScore: item.reputationScore,
  };
}

function fromFallback(item: Tutor): Profile {
  return {
    userId: `tutor-${item.slug}`,
    slug: item.slug,
    name: item.name,
    initials: item.initials,
    headline: item.role,
    bio: item.quote,
    accent: item.accent,
    offerings: item.offerings.map((offering) => ({ ...offering, levels: offering.levels.map(educationLevelLabel) })),
    languages: ["Hrvatski", "Engleski"],
    qualifications: [{ title: item.role, issuer: "Provjereno visoko učilište", year: 2020, verified: item.verified }],
    rating: item.rating,
    reviewCount: item.reviews,
    lessons: item.lessons,
    students: item.students,
    repeatRate: item.repeatRate,
    responseMinutes: Number.parseInt(item.response, 10) || 30,
    badge: item.elite ? "Elite" : "Pro",
    verified: item.verified,
    video: Boolean(item.video),
    reputationScore: Math.round((item.rating / 5 * 45 + item.repeatRate / 100 * 35 + Math.min(item.lessons / 1200, 1) * 20) * 10) / 10,
  };
}

function teachingMethod(subjects: string[]) {
  const joined = subjects.join(" ").toLocaleLowerCase("hr-HR");
  if (/jezik|latinski|francuski|talijanski|španjolski/.test(joined)) return ["Kratka dijagnostika razumijevanja", "Aktivni govor i primjena u kontekstu", "Personalizirano ponavljanje i vokabular"];
  if (/povijest|filozofija|psihologija|sociologija/.test(joined)) return ["Mapa pojmova i predznanja", "Izvori, argumenti i povezivanje ideja", "Sažetak, pitanja i provjera razumijevanja"];
  if (/ekonomija|računovodstvo|statistika/.test(joined)) return ["Dijagnostika problema", "Primjer iz stvarnog poslovnog slučaja", "Samostalna primjena uz povratnu informaciju"];
  return ["Dijagnostika bez nagađanja", "Aktivno rješavanje korak po korak", "AI paket znanja i ciljana vježba"];
}

export function TutorProfileClient({ slug, fallbackTutor }: { slug: string; fallbackTutor?: Tutor }) {
  const [profile, setProfile] = useState<Profile | null>(() => fallbackTutor ? fromFallback(fallbackTutor) : null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [reviews, setReviews] = useState<APIReview[]>([]);
  const [loading, setLoading] = useState(!fallbackTutor);
  const [error, setError] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState("o-meni");

  useEffect(() => {
    const favorites = JSON.parse(localStorage.getItem("gm-favorite-tutors") || "[]") as string[];
    queueMicrotask(() => setSaved(favorites.includes(slug)));
    Promise.all([
      apiFetch<APITutor>(`/tutors/${slug}`),
      apiFetch<AvailabilitySlot[]>(`/tutors/${slug}/availability?status=open`),
      apiFetch<APIReview[]>(`/tutors/${slug}/reviews`),
    ]).then(([tutorResult, slotResult, reviewResult]) => {
      setProfile(fromAPI(tutorResult.data));
      setSlots(slotResult.data);
      setReviews(reviewResult.data);
      if (slotResult.data[0]) {
        setSelectedDay(dayKey(slotResult.data[0].startsAt));
        setSelectedSlot(slotResult.data[0].id);
      }
      setError("");
    }).catch(() => {
      if (fallbackTutor) {
        const fallbackSlots = demoAvailability(slug);
        setSlots(fallbackSlots);
        setSelectedDay(dayKey(fallbackSlots[0].startsAt));
        setSelectedSlot(fallbackSlots[0].id);
        setError("");
      } else {
        setError("Profil trenutačno nije dostupan. Pokušaj ponovno ili odaberi drugog mentora.");
      }
    }).finally(() => setLoading(false));
  }, [fallbackTutor, slug]);

  useEffect(() => {
    const sectionIds = ["o-meni", "pristup", "recenzije", "obrazovanje"];
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];
      if (visible) setActiveSection(visible.target.id);
    }, { rootMargin: "-20% 0px -60% 0px", threshold: [0.1, 0.35, 0.6] });
    sectionIds.forEach((id) => document.getElementById(id) && observer.observe(document.getElementById(id)!));
    return () => observer.disconnect();
  }, [profile]);

  const days = useMemo(() => Array.from(new Map(slots.map((slot) => [dayKey(slot.startsAt), slot])).entries()).slice(0, 5), [slots]);
  const daySlots = slots.filter((slot) => dayKey(slot.startsAt) === selectedDay);
  const chosenSlot = slots.find((slot) => slot.id === selectedSlot) ?? daySlots[0];
  const primaryOffering = profile?.offerings[0];
  const methods = teachingMethod(profile?.offerings.map((item) => item.subject) ?? []);
  const bookingParams = new URLSearchParams();
  if (primaryOffering) bookingParams.set("subject", primaryOffering.subjectId);
  if (chosenSlot) bookingParams.set("slot", chosenSlot.id);
  const bookingHref = profile ? `/rezervacija/${profile.slug}${bookingParams.size ? `?${bookingParams}` : ""}` : "/pronadi-profesora";

  const toggleSaved = () => {
    const favorites = new Set(JSON.parse(localStorage.getItem("gm-favorite-tutors") || "[]") as string[]);
    if (favorites.has(slug)) favorites.delete(slug); else favorites.add(slug);
    localStorage.setItem("gm-favorite-tutors", JSON.stringify([...favorites]));
    setSaved(favorites.has(slug));
  };

  if (loading && !profile) return <main className="booking-loading"><LoaderCircle className="spin" /><p>Učitavamo provjereni profil mentora…</p></main>;
  if (!profile) return <div className="profile-page"><MarketingHeader /><main className="booking-loading"><h1>Mentor nije pronađen</h1><p>{error}</p><Link className="button button-coral" href="/pronadi-profesora">Pronađi drugog mentora</Link></main><SiteFooter /></div>;

  return (
    <div className="profile-page">
      <MarketingHeader />
      <div className="container profile-breadcrumb"><Link href="/pronadi-profesora"><ArrowLeft size={15} /> Svi mentori</Link><span>/</span><span>{primaryOffering?.subject}</span><span>/</span><strong>{profile.name}</strong></div>
      <main className="container profile-layout">
        <div className="profile-content">
          <section className="profile-intro-card">
            <div className={`profile-large-avatar avatar-${profile.accent}`}><span>{profile.initials}</span>{profile.video && <button aria-label={`Pokreni video predstavljanje mentora ${profile.name}`}><Play fill="currentColor" /></button>}</div>
            <div className="profile-intro-copy">
              <div className="profile-kicker">{profile.badge === "Elite" && <span><Sparkles size={13} /> Elite mentor</span>}{profile.verified && <span><ShieldCheck size={13} /> Identitet i diploma potvrđeni</span>}</div>
              <div className="profile-name-line"><h1>{profile.name}</h1>{profile.verified && <BadgeCheck />}</div>
              <p className="profile-role-large">{profile.headline}</p>
              <div className="tag-row">{profile.offerings.map((item) => <span className="tag" key={item.subjectId}>{item.subject} · {item.price} €</span>)}{primaryOffering?.levels.map((level) => <span className="tag tag-neutral" key={level}>{level}</span>)}</div>
              <p className="profile-quote-large">“{profile.bio}”</p>
              <div className="profile-actions-mobile"><Link className="button button-coral" href={bookingHref}>Rezerviraj termin</Link><button className={`icon-button ${saved ? "saved" : ""}`} onClick={toggleSaved} aria-pressed={saved} aria-label={saved ? "Ukloni iz spremljenih" : "Spremi mentora"}><Heart fill={saved ? "currentColor" : "none"} /></button></div>
            </div>
          </section>
          {error && <div className="profile-data-note"><ShieldCheck /> Prikazani su sigurni demo podaci dok API nije povezan.</div>}
          <section className="profile-metric-grid">
            <div><Star fill="currentColor" /><strong>{profile.rating.toFixed(2)}</strong><span>{profile.reviewCount} recenzija</span></div><div><BookOpen /><strong>{profile.lessons.toLocaleString("hr-HR")}</strong><span>održanih sati</span></div><div><Users /><strong>{profile.students}</strong><span>učenika</span></div><div><RotateCcw /><strong>{profile.repeatRate}%</strong><span>ponovno rezervira</span></div><div><Clock3 /><strong>{profile.responseMinutes} min</strong><span>vrijeme odgovora</span></div>
          </section>
          <nav className="profile-tabs" aria-label="Sadržaj profila">{[["o-meni", "O meni"], ["pristup", "Način rada"], ["recenzije", "Recenzije"], ["obrazovanje", "Obrazovanje"]].map(([id, label]) => <a href={`#${id}`} className={activeSection === id ? "active" : ""} onClick={() => setActiveSection(id)} key={id}>{label}</a>)}</nav>
          <section className="profile-section" id="o-meni"><div className="section-mini-title"><span>01</span><h2>O meni</h2></div><p>{profile.bio}</p><p>Rad prilagođavam razini, cilju i načinu učenja svakog učenika. Nakon sata ostaju jasni sljedeći koraci, materijali i AI podrška za samostalno ponavljanje.</p><div className="profile-language-row"><strong>Jezici rada</strong>{profile.languages.map((language) => <span key={language}>{language}</span>)}</div></section>
          <section className="profile-section" id="pristup"><div className="section-mini-title"><span>02</span><h2>Kako izgleda moj sat</h2></div><div className="method-grid">{methods.map((method, index) => <div key={method}><span>{index + 1}</span><h3>{method}</h3><p>{index === 0 ? "Prvih nekoliko minuta utvrđujemo cilj i točnu točku blokade." : index === 1 ? "Učenik aktivno radi, a objašnjenje se prilagođava u stvarnom vremenu." : "Sat završava provjerom, preporukom i materijalima za nastavak."}</p></div>)}</div></section>
          <section className="profile-section" id="recenzije"><div className="section-mini-title"><span>03</span><h2>Što kažu učenici</h2></div><div className="reviews-summary"><strong>{profile.rating.toFixed(2)}</strong><span><span className="stars">★★★★★</span><small>Na temelju {profile.reviewCount} provjerenih sati</small></span><div className="rating-bars"><span>5 <i><b style={{ width: "94%" }} /></i> 94%</span><span>4 <i><b style={{ width: "5%" }} /></i> 5%</span><span>3 <i><b style={{ width: "1%" }} /></i> 1%</span></div></div><div className="review-grid">{(reviews.length ? reviews.slice(0, 2) : [{ id: "demo-1", rating: 5, comment: `Napokon razumijem ${primaryOffering?.subject.toLocaleLowerCase("hr-HR") ?? "gradivo"}, a zadaci nakon sata pogodili su baš ono gdje griješim.`, createdAt: "2026-07-18T10:00:00Z" }, { id: "demo-2", rating: 5, comment: "Jasno, smireno i bez preskakanja koraka. Već nakon nekoliko sati vidim stvaran napredak.", createdAt: "2026-07-12T10:00:00Z" }]).map((review) => <article key={review.id}><Quote /><p>“{review.comment}”</p><strong>Provjereni učenik</strong><span>{new Date(review.createdAt).toLocaleDateString("hr-HR", { day: "numeric", month: "long", year: "numeric" })}</span></article>)}</div></section>
          <section className="profile-section" id="obrazovanje"><div className="section-mini-title"><span>04</span><h2>Obrazovanje i potvrde</h2></div><div className="credential-list">{profile.qualifications.length ? profile.qualifications.map((qualification) => <div key={`${qualification.title}-${qualification.year}`}><GraduationCap /><span><strong>{qualification.title}</strong><small>{qualification.issuer} · {qualification.year}.</small></span>{qualification.verified && <FileCheck2 />}</div>) : <div><GraduationCap /><span><strong>Stručnost je u postupku verifikacije</strong><small>Novi mentor · dokumentacija se provjerava</small></span></div>}</div></section>
        </div>
        <aside className="booking-sidebar">
          <div className="booking-sticky">
            <div className="booking-price"><span>Individualni sat · 60 min</span><strong>od {Math.min(...profile.offerings.map((item) => item.price))} €</strong></div>
            <div className="availability-live"><span /><strong>{slots.length ? `${slots.length} slobodnih termina` : "Termin na upit"}</strong> u sljedećem razdoblju</div>
            {days.length ? <div className="sidebar-calendar"><div className="calendar-head"><strong>Odaberi termin</strong></div><div className="day-row">{days.map(([key, slot]) => <button className={selectedDay === key ? "selected" : ""} onClick={() => { setSelectedDay(key); const first = slots.find((item) => dayKey(item.startsAt) === key); setSelectedSlot(first?.id ?? ""); }} key={key}><small>{shortDate(slot.startsAt).split(" ")[0]}</small>{new Date(slot.startsAt).getDate()}</button>)}</div><div className="time-row">{daySlots.map((slot) => <button className={selectedSlot === slot.id ? "selected" : ""} onClick={() => setSelectedSlot(slot.id)} key={slot.id}>{shortTime(slot.startsAt)}</button>)}</div></div> : <div className="sidebar-calendar profile-on-request"><CalendarDays /><strong>Pošalji zahtjev za termin</strong><small>Mentor će odgovoriti u prosjeku za {profile.responseMinutes} min.</small></div>}
            <Link className="button button-coral booking-main-button" href={bookingHref}>Odaberi termin <ChevronRight size={17} /></Link>
            <Link className="message-button" href={`/ucenik/poruke?tutor=${profile.slug}`}><MessageCircle size={17} /> Pošalji poruku</Link>
            <div className="booking-trust"><p><ShieldCheck /> Sigurno plaćanje</p><p><Video /> Snimka i AI materijali uključeni</p><p><CalendarDays /> Besplatno otkazivanje do 24 h</p></div>
          </div>
        </aside>
      </main>
      <SiteFooter />
    </div>
  );
}
