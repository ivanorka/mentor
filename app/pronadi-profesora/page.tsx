"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, MapPin, Search, SlidersHorizontal, Sparkles, Star, X } from "lucide-react";
import { MarketingHeader } from "../components/MarketingHeader";
import { SiteFooter } from "../components/SiteFooter";
import { TutorCard } from "../components/TutorCard";
import { tutors, type Tutor } from "../data";
import { apiFetch } from "../lib/api";
import {
  DEFAULT_EDUCATION_LEVEL_ID,
  EDUCATION_LEVELS,
  SUBJECT_CATALOG,
  catalogSubject,
  educationLevel,
  type EducationLevelId,
} from "../lib/catalog";

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

type APISubject = { id: string; slug: string; name: string };
type SubjectOption = { id: string; slug: string; name: string };
type LevelFilter = EducationLevelId | "sve";
type MatchContext = { enabled: boolean; goal: string; style: string };

const styleLabels: Record<string, string> = {
  koraci: "objašnjava korak po korak",
  vizualno: "koristi vizualne modele",
  praksa: "uči kroz zadatke i praksu",
  razgovor: "gradi znanje kroz razgovor",
};

const goalLabels: Record<string, string> = {
  razumijevanje: "fokus na duboko razumijevanje",
  ispit: "iskustvo s pripremom ispita",
  ocjena: "dokazan kontinuitet napretka",
  izvrsnost: "visok standard i napredne teme",
};

function tutorMatch(tutor: Tutor, subject: string, level: LevelFilter, maxPrice: number, context: MatchContext) {
  const reasons: string[] = [];
  const relevantOfferings = subject === "svi" ? tutor.offerings : tutor.offerings.filter((offering) => offering.subjectSlug === subject);
  let score = 30;

  if (subject !== "svi" && relevantOfferings.length) {
    score += 18;
    reasons.push(`predaje ${relevantOfferings[0].subject}`);
  }
  if (level !== "sve" && relevantOfferings.some((offering) => offering.levels.includes(level))) {
    score += 13;
    const label = EDUCATION_LEVELS.find((item) => item.id === level)?.label;
    if (label) reasons.push(`iskustvo za razinu ${label.toLocaleLowerCase("hr-HR")}`);
  }

  const selectedPrice = Math.min(...relevantOfferings.map((offering) => offering.price));
  if (Number.isFinite(selectedPrice) && selectedPrice <= maxPrice) {
    score += Math.max(3, Math.round(8 - ((selectedPrice / Math.max(maxPrice, 1)) * 3)));
    reasons.push(`${selectedPrice} € unutar budžeta`);
  }

  if (context.style) {
    const explicitStyle = tutor.matchStyles?.includes(context.style);
    const languageConversation = context.style === "razgovor" && relevantOfferings.some((offering) => offering.subjectSlug.includes("jezik"));
    const practiceSignal = context.style === "praksa" && tutor.lessons >= 400;
    const visualSignal = context.style === "vizualno" && relevantOfferings.some((offering) => ["matematika", "fizika", "kemija", "biologija", "informatika"].includes(offering.subjectSlug));
    if (explicitStyle || languageConversation || practiceSignal || visualSignal) {
      score += 6;
      reasons.push(styleLabels[context.style] ?? "odgovara tvom načinu učenja");
    }
  }

  if (context.goal) {
    const explicitGoal = tutor.matchGoals?.includes(context.goal);
    const goalSignal = context.goal === "izvrsnost" ? tutor.rating >= 4.95
      : context.goal === "ispit" ? tutor.lessons >= 400
        : context.goal === "ocjena" ? tutor.repeatRate >= 88
          : tutor.rating >= 4.9;
    if (explicitGoal || goalSignal) {
      score += 5;
      reasons.push(goalLabels[context.goal] ?? "odgovara tvom cilju");
    }
  }

  score += Math.round(Math.min(6, Math.max(0, (tutor.rating - 4.7) * 18)));
  score += Math.round(Math.min(4, tutor.repeatRate / 25));
  score += Math.round(Math.min(4, Math.log10(tutor.lessons + 1)));
  if (tutor.verified) score += 2;
  if (tutor.elite) score += 2;
  return { score: Math.min(99, score), reasons: [...new Set(reasons)].slice(0, 3) };
}

export default function TutorSearchPage() {
  const [subject, setSubject] = useState("svi");
  const [level, setLevel] = useState<LevelFilter>(DEFAULT_EDUCATION_LEVEL_ID);
  const [maxPrice, setMaxPrice] = useState(60);
  const [availability, setAvailability] = useState("Bilo kada");
  const [eliteOnly, setEliteOnly] = useState(false);
  const [videoOnly, setVideoOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [sort, setSort] = useState("Najbolje podudaranje");
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [liveTutors, setLiveTutors] = useState<Tutor[]>(tutors);
  const [subjects, setSubjects] = useState<SubjectOption[]>(SUBJECT_CATALOG.map(({ id, slug, name }) => ({ id, slug, name })));
  const [matchContext, setMatchContext] = useState<MatchContext>({ enabled: false, goal: "", style: "" });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedSubject = params.get("subject");
    const requestedQuery = params.get("q");
    const requestedLevel = educationLevel(params.get("level"));
    const requestedMaxPrice = Number(params.get("maxPrice"));
    const requestedSubjectEntry = catalogSubject(requestedSubject);
    queueMicrotask(() => {
      if (requestedSubjectEntry) setSubject(requestedSubjectEntry.slug);
      else if (requestedSubject) setSubject(requestedSubject);
      if (requestedQuery) setQuery(requestedQuery);
      if (requestedLevel) setLevel(requestedLevel.id);
      if (requestedMaxPrice >= 10 && requestedMaxPrice <= 60) setMaxPrice(requestedMaxPrice);
      setMatchContext({ enabled: params.get("match") === "1", goal: params.get("goal") ?? "", style: params.get("style") ?? "" });
    });

    if (params.get("focus") === "results") {
      window.setTimeout(() => document.getElementById("search-results-anchor")?.scrollIntoView({ block: "start", behavior: "auto" }), 80);
    }

    Promise.all([apiFetch<APITutor[]>("/tutors?limit=50"), apiFetch<APISubject[]>("/subjects")])
      .then(([tutorResult, subjectResult]) => {
        const accents = ["coral", "blue", "gold", "mint"];
        setLiveTutors(tutorResult.data.map((item, index) => {
          const offerings = item.subjects.flatMap((offering) => {
            const details = item.subjectDetails.find((entry) => entry.id === offering.subjectId);
            const catalog = catalogSubject(offering.subjectId) ?? catalogSubject(details?.name);
            if (!details && !catalog) return [];
            const levels = offering.levels.flatMap((value) => {
              const resolved = educationLevel(value);
              return resolved ? [resolved.id] : [];
            });
            return [{
              subjectId: offering.subjectId,
              subjectSlug: catalog?.slug ?? offering.subjectId,
              subject: details?.name ?? catalog?.name ?? "Predmet",
              price: offering.priceEur,
              levels,
            }];
          });
          const nextSlot = item.nextAvailable
            ? new Intl.DateTimeFormat("hr-HR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Zagreb" }).format(new Date(item.nextAvailable))
            : "Termin na upit";
          return {
            slug: item.slug, name: item.user.name, initials: item.user.name.split(" ").map((part) => part[0]).join("").slice(0, 2),
            role: item.headline, subjects: offerings.map((offering) => offering.subject), rating: item.rating,
            reviews: item.reviewCount, lessons: item.lessonsCompleted, students: item.uniqueStudents, repeatRate: item.repeatRate,
            response: `${item.responseMinutes} min`, price: Math.min(...offerings.map((offering) => offering.price)), level: [...new Set(item.subjects.flatMap((offering) => offering.levels))].join(" · "),
            levels: [...new Set(offerings.flatMap((offering) => offering.levels))], offerings, video: Boolean(item.videoUrl), nextAvailable: item.nextAvailable,
            accent: accents[index % accents.length], quote: item.bio, nextSlot, verified: item.verified, elite: item.badge === "Elite",
            rankingScore: item.searchRankingScore,
          };
        }));
        if (subjectResult.data.length) setSubjects(subjectResult.data);
        // Seed data remains a graceful fallback if the API is unavailable.
      })
      .catch(() => undefined);
  }, []);

  const filtered = useMemo(() => {
    const results = liveTutors.flatMap((tutor) => {
      const relevantOfferings = subject === "svi" ? tutor.offerings : tutor.offerings.filter((offering) => offering.subjectSlug === subject);
      const subjectMatch = relevantOfferings.length > 0;
      const levelMatch = level === "sve" || relevantOfferings.some((offering) => offering.levels.includes(level));
      const subjectPrice = Math.min(...relevantOfferings.map((offering) => offering.price));
      const priceMatch = subjectPrice <= maxPrice;
      const verifiedMatch = !verifiedOnly || tutor.verified;
      const eliteMatch = !eliteOnly || tutor.elite;
      const videoMatch = !videoOnly || tutor.video;
      const slot = tutor.nextAvailable ? new Date(tutor.nextAvailable) : null;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const slotDay = slot ? new Date(slot.getFullYear(), slot.getMonth(), slot.getDate()) : null;
      const daysAway = slotDay ? Math.round((slotDay.getTime() - today.getTime()) / 86400000) : 99;
      const availabilityMatch = availability === "Bilo kada" || (availability === "Danas" && daysAway === 0) || (availability === "Sutra" && daysAway === 1) || (availability === "Ovaj tjedan" && daysAway >= 0 && daysAway <= 7);
      const queryMatch = !query || `${tutor.name} ${tutor.role} ${tutor.quote} ${tutor.subjects.join(" ")}`.toLocaleLowerCase("hr-HR").includes(query.toLocaleLowerCase("hr-HR"));
      if (!subjectMatch || !levelMatch || !priceMatch || !verifiedMatch || !eliteMatch || !videoMatch || !availabilityMatch || !queryMatch) return [];

      if (!matchContext.enabled) return [{ ...tutor, price: subjectPrice }];
      const match = tutorMatch(tutor, subject, level, maxPrice, matchContext);
      return [{ ...tutor, price: subjectPrice, matchScore: match.score, matchReasons: match.reasons }];
    });

    return results.sort((a, b) => {
      if (sort === "Najviša ocjena") return b.rating - a.rating;
      if (sort === "Najniža cijena") return a.price - b.price;
      if (sort === "Najviše iskustva") return b.lessons - a.lessons;
      if (matchContext.enabled) return (b.matchScore ?? 0) - (a.matchScore ?? 0) || b.repeatRate - a.repeatRate;
      return (b.rankingScore ?? 0) - (a.rankingScore ?? 0) || (Number(b.elite) - Number(a.elite)) || b.repeatRate - a.repeatRate;
    });
  }, [subject, level, maxPrice, availability, eliteOnly, videoOnly, verifiedOnly, query, sort, liveTutors, matchContext]);

  const resetFilters = () => { setSubject("svi"); setLevel(DEFAULT_EDUCATION_LEVEL_ID); setMaxPrice(60); setAvailability("Bilo kada"); setEliteOnly(false); setVideoOnly(false); setVerifiedOnly(true); setQuery(""); };
  const activeCount = Number(subject !== "svi") + Number(level !== DEFAULT_EDUCATION_LEVEL_ID) + Number(maxPrice < 60) + Number(availability !== "Bilo kada") + Number(eliteOnly) + Number(videoOnly) + Number(!verifiedOnly);
  const selectedSubjectName = subjects.find((item) => item.slug === subject)?.name;
  const selectedLevelLabel = EDUCATION_LEVELS.find((item) => item.id === level)?.label;

  return (
    <div className="search-page">
      <MarketingHeader inverse />
      <div className="search-hero">
        <div className="container">
          <div className="search-title-row">
            <div><div className="eyebrow eyebrow-light"><span /> Provjereni Gaudeamus mentori</div><h1>Pronađi osobu koja će<br /><em>otključati tvoje znanje.</em></h1></div>
            <div className="search-promise"><Sparkles /><span><strong>{matchContext.enabled ? "Tvoj Mentor Match je spreman" : "Pametno podudaranje"}</strong><small>{matchContext.enabled ? "Svaki rezultat ima izračun i jasne razloge preporuke." : "Rangiramo mentore prema tvojoj razini, cilju i načinu učenja."}</small></span></div>
          </div>
          <div className="search-bar-large">
            <Search size={20} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pretraži profesora ili predmet..." aria-label="Pretraži profesora ili predmet" />
            {query && <button onClick={() => setQuery("")} aria-label="Očisti pretragu"><X size={17} /></button>}
          </div>
        </div>
      </div>
      <div className="container search-layout" id="search-results-anchor">
        <button className="mobile-filter-trigger" onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal /> Filteri {activeCount > 0 && <span>{activeCount}</span>}</button>
        {filtersOpen && <button className="filter-backdrop" aria-label="Zatvori filtre" onClick={() => setFiltersOpen(false)} />}
        <aside className={`filters-panel ${filtersOpen ? "open" : ""}`}>
          <div className="filter-head"><strong>Filteri {activeCount > 0 && <em>{activeCount}</em>}</strong><button onClick={() => setFiltersOpen(false)} aria-label="Zatvori filtre"><X size={17} /></button></div>
          <div className="filter-block"><label>Predmet</label><select value={subject} onChange={(event) => setSubject(event.target.value)}><option value="svi">Svi predmeti</option>{subjects.map((item) => <option value={item.slug} key={item.id}>{item.name}</option>)}</select></div>
          <div className="filter-block"><label>Razina</label><select value={level} onChange={(event) => setLevel(event.target.value as LevelFilter)}><option value="sve">Sve razine</option>{EDUCATION_LEVELS.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></div>
          <div className="filter-block"><label>Budžet po satu</label><div className="range-values"><span>10 €</span><strong>do {maxPrice} €</strong><span>60 €</span></div><input type="range" min="10" max="60" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} /></div>
          <div className="filter-block"><label>Dostupnost</label><select value={availability} onChange={(event) => setAvailability(event.target.value)}><option>Bilo kada</option><option>Danas</option><option>Sutra</option><option>Ovaj tjedan</option></select></div>
          <div className="filter-block"><label>Standard</label><div className="check-list"><label><input type="checkbox" checked={verifiedOnly} onChange={(event) => setVerifiedOnly(event.target.checked)} /> Provjereni profili</label><label><input type="checkbox" checked={eliteOnly} onChange={(event) => setEliteOnly(event.target.checked)} /> Samo Elite mentori</label><label><input type="checkbox" checked={videoOnly} onChange={(event) => setVideoOnly(event.target.checked)} /> Video predstavljanje</label></div></div>
          <div className="filter-note"><Star size={16} fill="currentColor" /><span><strong>Svi profili su provjereni</strong><small>Identitet, diploma i certifikati verificirani su prije objave.</small></span></div>
          <button className="apply-filters" onClick={() => setFiltersOpen(false)}>Prikaži {filtered.length} mentora</button>
        </aside>
        <main className="search-results">
          <div className="results-head"><div><strong>{filtered.length} mentora odgovara tvojoj pretrazi</strong><span>Online · cijela Hrvatska · hrvatski jezik</span></div><label>Sortiraj <select value={sort} onChange={(event) => setSort(event.target.value)}><option>Najbolje podudaranje</option><option>Najviša ocjena</option><option>Najniža cijena</option><option>Najviše iskustva</option></select></label></div>
          <div className="active-filters">{level !== "sve" && <button className="filter-chip" onClick={() => setLevel("sve")}>{selectedLevelLabel} <X size={13} /></button>}{subject !== "svi" && <button className="filter-chip" onClick={() => setSubject("svi")}>{selectedSubjectName ?? subject} <X size={13} /></button>}{maxPrice < 60 && <button className="filter-chip" onClick={() => setMaxPrice(60)}>do {maxPrice} € <X size={13} /></button>}{availability !== "Bilo kada" && <button className="filter-chip" onClick={() => setAvailability("Bilo kada")}>{availability} <X size={13} /></button>}{eliteOnly && <button className="filter-chip" onClick={() => setEliteOnly(false)}>Elite <X size={13} /></button>}{videoOnly && <button className="filter-chip" onClick={() => setVideoOnly(false)}>Video <X size={13} /></button>}<button className="clear-filters" onClick={resetFilters}>Vrati preporučene postavke</button></div>
          {filtered.length ? <div className="search-card-grid">{filtered.map((tutor, index) => <TutorCard tutor={tutor} featured={matchContext.enabled && index === 0} key={tutor.slug} />)}</div> : <div className="empty-state"><SlidersHorizontal /><h3>Nema mentora za ovu kombinaciju</h3><p>Proširi dostupnost ili ukloni jedan od filtera.</p><button className="button button-navy" onClick={resetFilters}>Vrati preporučene mentore</button></div>}
          <div className="search-help"><MapPin /><span><strong>Trebaš pomoć pri odabiru?</strong><small>Odgovori na 5 kratkih pitanja i preporučit ćemo ti tri mentora.</small></span><Link href="/mentor-match">Pokreni mentor match <ChevronRight size={16} /></Link></div>
        </main>
      </div>
      <SiteFooter />
    </div>
  );
}
