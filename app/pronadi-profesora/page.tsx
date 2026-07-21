"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, MapPin, Search, SlidersHorizontal, Sparkles, Star, X } from "lucide-react";
import { MarketingHeader } from "../components/MarketingHeader";
import { TutorCard } from "../components/TutorCard";
import { tutors, type Tutor } from "../data";
import { apiFetch } from "../lib/api";

type APITutor = {
  slug: string;
  headline: string;
  bio: string;
  subjects: { subjectId: string; priceEur: number; levels: string[] }[];
  subjectDetails: { id: string; name: string }[];
  rating: number;
  reviewCount: number;
  lessonsCompleted: number;
  uniqueStudents: number;
  repeatRate: number;
  responseMinutes: number;
  badge: string;
  verified: boolean;
  nextAvailable?: string;
  videoUrl?: string;
  searchRankingScore: number;
  user: { name: string };
};

type APISubject = { slug: string; name: string };

export default function TutorSearchPage() {
  const [subject, setSubject] = useState("Svi predmeti");
  const [level, setLevel] = useState("Sve razine");
  const [maxPrice, setMaxPrice] = useState(35);
  const [availability, setAvailability] = useState("Bilo kada");
  const [eliteOnly, setEliteOnly] = useState(false);
  const [videoOnly, setVideoOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [sort, setSort] = useState("Najbolje podudaranje");
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [liveTutors, setLiveTutors] = useState<Tutor[]>(tutors);
  const [subjects, setSubjects] = useState(["Svi predmeti", "Matematika", "Fizika", "Engleski", "Njemački", "Kemija", "Biologija", "Informatika"]);
  const [apiState, setApiState] = useState<"loading" | "live" | "fallback">("loading");

  useEffect(() => {
    Promise.all([apiFetch<APITutor[]>("/tutors?limit=50"), apiFetch<APISubject[]>("/subjects")])
      .then(([tutorResult, subjectResult]) => {
        const accents = ["coral", "blue", "gold", "mint"];
        setLiveTutors(tutorResult.data.map((item, index) => {
          const nextSlot = item.nextAvailable
            ? new Intl.DateTimeFormat("hr-HR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Zagreb" }).format(new Date(item.nextAvailable))
            : "Termin na upit";
          return {
            slug: item.slug, name: item.user.name, initials: item.user.name.split(" ").map((part) => part[0]).join("").slice(0, 2),
            role: item.headline, subjects: item.subjectDetails.map((subject) => subject.name), rating: item.rating,
            reviews: item.reviewCount, lessons: item.lessonsCompleted, students: item.uniqueStudents, repeatRate: item.repeatRate,
            response: `${item.responseMinutes} min`, price: Math.min(...item.subjects.map((offering) => offering.priceEur)), level: [...new Set(item.subjects.flatMap((offering) => offering.levels))].join(" · "),
            levels: [...new Set(item.subjects.flatMap((offering) => offering.levels))], video: Boolean(item.videoUrl), nextAvailable: item.nextAvailable,
            accent: accents[index % accents.length], quote: item.bio, nextSlot, verified: item.verified, elite: item.badge === "Elite",
          };
        }));
        setSubjects(["Svi predmeti", ...subjectResult.data.map((item) => item.name)]);
        const requestedSubject = new URLSearchParams(window.location.search).get("subject");
        const requestedQuery = new URLSearchParams(window.location.search).get("q");
        const requestedLevel = new URLSearchParams(window.location.search).get("level");
        const requestedMaxPrice = Number(new URLSearchParams(window.location.search).get("maxPrice"));
        const matchedSubject = subjectResult.data.find((item) => item.slug === requestedSubject);
        if (matchedSubject) setSubject(matchedSubject.name);
        if (requestedQuery) setQuery(requestedQuery);
        if (requestedLevel) setLevel(requestedLevel);
        if (requestedMaxPrice >= 10 && requestedMaxPrice <= 35) setMaxPrice(requestedMaxPrice);
        setApiState("live");
      })
      .catch(() => setApiState("fallback"));
  }, []);

  const filtered = useMemo(() => liveTutors.filter((tutor) => {
    const subjectMatch = subject === "Svi predmeti" || tutor.subjects.includes(subject);
    const levelMatch = level === "Sve razine" || tutor.levels?.some((value) => value.toLowerCase().includes(level.toLowerCase()));
    const priceMatch = tutor.price <= maxPrice;
    const verifiedMatch = !verifiedOnly || tutor.verified;
    const eliteMatch = !eliteOnly || tutor.elite;
    const videoMatch = !videoOnly || tutor.video;
    const slot = tutor.nextAvailable ? new Date(tutor.nextAvailable) : null;
    const now = new Date("2026-07-21T12:00:00+02:00");
    const daysAway = slot ? Math.floor((new Date(slot.getFullYear(), slot.getMonth(), slot.getDate()).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000) : 99;
    const availabilityMatch = availability === "Bilo kada" || (availability === "Danas" && daysAway === 0) || (availability === "Sutra" && daysAway === 1) || (availability === "Ovaj tjedan" && daysAway >= 0 && daysAway <= 7);
    const queryMatch = !query || `${tutor.name} ${tutor.subjects.join(" ")}`.toLowerCase().includes(query.toLowerCase());
    return subjectMatch && levelMatch && priceMatch && verifiedMatch && eliteMatch && videoMatch && availabilityMatch && queryMatch;
  }).sort((a, b) => sort === "Najviša ocjena" ? b.rating - a.rating : sort === "Najniža cijena" ? a.price - b.price : sort === "Najviše iskustva" ? b.lessons - a.lessons : (Number(b.elite) - Number(a.elite)) || b.repeatRate - a.repeatRate), [subject, level, maxPrice, availability, eliteOnly, videoOnly, verifiedOnly, query, sort, liveTutors]);

  const resetFilters = () => { setSubject("Svi predmeti"); setLevel("Sve razine"); setMaxPrice(35); setAvailability("Bilo kada"); setEliteOnly(false); setVideoOnly(false); setVerifiedOnly(true); setQuery(""); };
  const activeCount = Number(subject !== "Svi predmeti") + Number(level !== "Sve razine") + Number(maxPrice < 35) + Number(availability !== "Bilo kada") + Number(eliteOnly) + Number(videoOnly) + Number(!verifiedOnly);

  return (
    <div className="search-page">
      <MarketingHeader />
      <div className="search-hero">
        <div className="container">
          <Link className="back-link" href="/"><ArrowLeft size={16} /> Natrag na početnu</Link>
          <div className="search-title-row">
            <div><div className="eyebrow"><span /> Provjereni Gaudeamus mentori · {apiState === "live" ? "API uživo" : apiState === "loading" ? "učitavanje" : "demo način"}</div><h1>Pronađi osobu koja će<br /><em>otključati tvoje znanje.</em></h1></div>
            <div className="search-promise"><Sparkles /><span><strong>Pametno podudaranje</strong><small>Rangiramo mentore prema tvojoj razini, cilju i načinu učenja.</small></span></div>
          </div>
          <div className="search-bar-large">
            <Search size={20} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pretraži profesora ili predmet..." aria-label="Pretraži profesora ili predmet" />
            {query && <button onClick={() => setQuery("")} aria-label="Očisti pretragu"><X size={17} /></button>}
          </div>
        </div>
      </div>
      <div className="container search-layout">
        <button className="mobile-filter-trigger" onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal /> Filteri {activeCount > 0 && <span>{activeCount}</span>}</button>
        <aside className={`filters-panel ${filtersOpen ? "open" : ""}`}>
          <div className="filter-head"><strong>Filteri {activeCount > 0 && <em>{activeCount}</em>}</strong><button onClick={() => setFiltersOpen(false)} aria-label="Zatvori filtre"><X size={17} /></button></div>
          <div className="filter-block"><label>Predmet</label><select value={subject} onChange={(event) => setSubject(event.target.value)}>{subjects.map((item) => <option key={item}>{item}</option>)}</select></div>
          <div className="filter-block"><label>Razina</label><select value={level} onChange={(event) => setLevel(event.target.value)}><option>Sve razine</option><option>Osnovna škola</option><option>Srednja škola</option><option>Matura</option><option>Fakultet</option><option>Odrasli</option></select></div>
          <div className="filter-block"><label>Budžet po satu</label><div className="range-values"><span>10 €</span><strong>do {maxPrice} €</strong><span>35 €</span></div><input type="range" min="10" max="35" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} /></div>
          <div className="filter-block"><label>Dostupnost</label><select value={availability} onChange={(event) => setAvailability(event.target.value)}><option>Bilo kada</option><option>Danas</option><option>Sutra</option><option>Ovaj tjedan</option></select></div>
          <div className="filter-block"><label>Standard</label><div className="check-list"><label><input type="checkbox" checked={verifiedOnly} onChange={(event) => setVerifiedOnly(event.target.checked)} /> Provjereni profili</label><label><input type="checkbox" checked={eliteOnly} onChange={(event) => setEliteOnly(event.target.checked)} /> Samo Elite mentori</label><label><input type="checkbox" checked={videoOnly} onChange={(event) => setVideoOnly(event.target.checked)} /> Video predstavljanje</label></div></div>
          <div className="filter-note"><Star size={16} fill="currentColor" /><span><strong>Svi profili su provjereni</strong><small>Identitet, diploma i certifikati verificirani su prije objave.</small></span></div>
          <button className="apply-filters" onClick={() => setFiltersOpen(false)}>Prikaži {filtered.length} mentora</button>
        </aside>
        <main className="search-results">
          <div className="results-head"><div><strong>{filtered.length} mentora odgovara tvojoj pretrazi</strong><span>Osijek + online · hrvatski jezik</span></div><label>Sortiraj <select value={sort} onChange={(event) => setSort(event.target.value)}><option>Najbolje podudaranje</option><option>Najviša ocjena</option><option>Najniža cijena</option><option>Najviše iskustva</option></select></label></div>
          <div className="active-filters">{level !== "Sve razine" && <button className="filter-chip" onClick={() => setLevel("Sve razine")}>{level} <X size={13} /></button>}{subject !== "Svi predmeti" && <button className="filter-chip" onClick={() => setSubject("Svi predmeti")}>{subject} <X size={13} /></button>}{maxPrice < 35 && <button className="filter-chip" onClick={() => setMaxPrice(35)}>do {maxPrice} € <X size={13} /></button>}{availability !== "Bilo kada" && <button className="filter-chip" onClick={() => setAvailability("Bilo kada")}>{availability} <X size={13} /></button>}{eliteOnly && <button className="filter-chip" onClick={() => setEliteOnly(false)}>Elite <X size={13} /></button>}{videoOnly && <button className="filter-chip" onClick={() => setVideoOnly(false)}>Video <X size={13} /></button>}<button className="clear-filters" onClick={resetFilters}>Očisti sve</button></div>
          {filtered.length ? <div className="search-card-grid">{filtered.map((tutor, index) => <TutorCard tutor={tutor} featured={index === 0} key={tutor.slug} />)}</div> : <div className="empty-state"><SlidersHorizontal /><h3>Nema mentora za ovu kombinaciju</h3><p>Proširi dostupnost ili ukloni jedan od filtera.</p><button className="button button-navy" onClick={resetFilters}>Prikaži sve mentore</button></div>}
          <div className="search-help"><MapPin /><span><strong>Trebaš pomoć pri odabiru?</strong><small>Odgovori na 5 kratkih pitanja i preporučit ćemo ti tri mentora.</small></span><Link href="/mentor-match">Pokreni mentor match <ChevronRight size={16} /></Link></div>
        </main>
      </div>
    </div>
  );
}
