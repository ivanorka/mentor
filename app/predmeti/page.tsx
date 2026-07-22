"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Braces, FlaskConical, Globe2, Languages, LoaderCircle, Sigma, Sparkles } from "lucide-react";
import { MarketingHeader } from "../components/MarketingHeader";
import { apiFetch } from "../lib/api";
import {
  DEFAULT_EDUCATION_LEVEL_ID,
  EDUCATION_LEVELS,
  SUBJECT_CATALOG,
  catalogSubject,
  educationLevel,
  educationLevelLabel,
  type EducationLevelId,
  type SubjectIcon,
} from "../lib/catalog";

type APISubject = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  levels: string[];
  tutorCount: number;
};

type Subject = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  levelIds: EducationLevelId[];
  tutorCount: number;
  icon: SubjectIcon;
  aliases?: readonly string[];
};
type LevelFilter = EducationLevelId | "sve";

const subjectIcons: Record<SubjectIcon, typeof Sigma> = {
  sigma: Sigma,
  atom: Sparkles,
  flask: FlaskConical,
  leaf: BookOpen,
  language: Languages,
  code: Braces,
  history: BookOpen,
  globe: Globe2,
  economy: Sigma,
  book: BookOpen,
};

const fallbackSubjects: Subject[] = SUBJECT_CATALOG.map((subject) => ({ ...subject, levelIds: [...subject.levelIds] }));

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState(fallbackSubjects);
  const [category, setCategory] = useState("Sve");
  const [level, setLevel] = useState<LevelFilter>(DEFAULT_EDUCATION_LEVEL_ID);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  useEffect(() => {
    apiFetch<APISubject[]>("/subjects")
      .then(({ data }) => {
        if (data.length) {
          setSubjects(data.map((item) => {
            const catalog = catalogSubject(item.slug);
            const levelIds = item.levels.flatMap((value) => {
              const resolved = educationLevel(value);
              return resolved ? [resolved.id] : [];
            });
            return {
              id: item.id,
              slug: item.slug,
              name: item.name,
              category: item.category,
              description: item.description,
              levelIds,
              tutorCount: item.tutorCount,
              icon: catalog?.icon ?? "book",
              aliases: catalog?.aliases,
            };
          }));
        }
        setLive(true);
      })
      .catch(() => setLive(false))
      .finally(() => setLoading(false));
  }, []);

  const categories = ["Sve", ...Array.from(new Set(subjects.map((item) => item.category)))];
  const visible = useMemo(() => subjects.filter((item) => (
    (category === "Sve" || item.category === category)
    && (level === "sve" || item.levelIds.includes(level))
  )), [category, level, subjects]);

  return (
    <div className="subjects-page">
      <MarketingHeader inverse />
      <section className="subjects-hero">
        <div className="container subjects-hero-inner">
          <div><span className="api-live-pill"><i className={live ? "online" : "offline"} /> {live ? "Podaci uživo iz Go API-ja" : "Demo podaci"}</span><h1>Predmeti za svaki<br /><em>sljedeći korak.</em></h1><p>Od prve nejasne lekcije do mature i fakulteta — pronađi mentora koji poznaje tvoju razinu, cilj i način učenja.</p></div>
          <div className="subjects-orbit"><Sparkles /><strong>{subjects.length}</strong><span>područja znanja</span><small>Jedna platforma · jedan profil napretka</small></div>
        </div>
      </section>
      <main className="container subjects-main">
        <div className="subjects-toolbar"><div>{categories.map((item) => <button className={category === item ? "active" : ""} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div><label className="subjects-level-filter"><span>Razina</span><select value={level} onChange={(event) => setLevel(event.target.value as LevelFilter)}><option value="sve">Sve razine</option>{EDUCATION_LEVELS.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label><span>{loading && <LoaderCircle className="spin" />} {visible.length} predmeta</span></div>
        <div className="subject-catalog-grid">
          {visible.map((subject, index) => { const Icon = subjectIcons[subject.icon]; const levelQuery = level === "sve" ? "" : `&level=${level}`; return <article key={subject.id}><span className={`subject-icon tone-${index % 4}`}><Icon /></span><small>{subject.category}</small><h2>{subject.name}</h2><p>{subject.description}</p><div className="subject-levels">{subject.levelIds.map((item) => <span key={item}>{educationLevelLabel(item)}</span>)}</div><footer><strong>{subject.tutorCount} mentora</strong><Link href={`/pronadi-profesora?subject=${subject.slug}${levelQuery}`}>Pronađi mentora <ArrowRight /></Link></footer></article>; })}
        </div>
      </main>
    </div>
  );
}
