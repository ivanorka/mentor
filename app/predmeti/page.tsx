"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Braces, FlaskConical, Globe2, Languages, LoaderCircle, Sigma, Sparkles } from "lucide-react";
import { MarketingHeader } from "../components/MarketingHeader";
import { apiFetch } from "../lib/api";

type Subject = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  levels: string[];
  tutorCount: number;
};

const subjectIcons = [Sigma, FlaskConical, Languages, Braces, Globe2, BookOpen];
const fallbackSubjects: Subject[] = [
  { id: "subject-math", slug: "matematika", name: "Matematika", category: "STEM", description: "Od osnova do državne mature i fakultetske matematike.", levels: ["Osnovna škola", "Srednja škola", "Matura", "Fakultet"], tutorCount: 4 },
  { id: "subject-physics", slug: "fizika", name: "Fizika", category: "STEM", description: "Mehanika, elektromagnetizam, valovi i moderna fizika.", levels: ["Osnovna škola", "Srednja škola", "Matura"], tutorCount: 3 },
  { id: "subject-english", slug: "engleski-jezik", name: "Engleski jezik", category: "Jezici", description: "Školsko gradivo, konverzacija i poslovni engleski.", levels: ["Osnovna škola", "Srednja škola", "Odrasli"], tutorCount: 2 },
];

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState(fallbackSubjects);
  const [category, setCategory] = useState("Sve");
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  useEffect(() => {
    apiFetch<Subject[]>("/subjects")
      .then(({ data }) => { setSubjects(data); setLive(true); })
      .catch(() => setLive(false))
      .finally(() => setLoading(false));
  }, []);

  const categories = ["Sve", ...Array.from(new Set(subjects.map((item) => item.category)))];
  const visible = useMemo(() => category === "Sve" ? subjects : subjects.filter((item) => item.category === category), [category, subjects]);

  return (
    <div className="subjects-page">
      <MarketingHeader />
      <section className="subjects-hero">
        <div className="container subjects-hero-inner">
          <div><span className="api-live-pill"><i className={live ? "online" : "offline"} /> {live ? "Podaci uživo iz Go API-ja" : "Demo podaci"}</span><h1>Predmeti za svaki<br /><em>sljedeći korak.</em></h1><p>Od prve nejasne lekcije do mature i fakulteta — pronađi mentora koji poznaje tvoju razinu, cilj i način učenja.</p></div>
          <div className="subjects-orbit"><Sparkles /><strong>{subjects.length}</strong><span>područja znanja</span><small>Jedna platforma · jedan profil napretka</small></div>
        </div>
      </section>
      <main className="container subjects-main">
        <div className="subjects-toolbar"><div>{categories.map((item) => <button className={category === item ? "active" : ""} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div><span>{loading && <LoaderCircle className="spin" />} {visible.length} predmeta</span></div>
        <div className="subject-catalog-grid">
          {visible.map((subject, index) => { const Icon = subjectIcons[index % subjectIcons.length]; return <article key={subject.id}><span className={`subject-icon tone-${index % 4}`}><Icon /></span><small>{subject.category}</small><h2>{subject.name}</h2><p>{subject.description}</p><div className="subject-levels">{subject.levels.slice(0, 3).map((level) => <span key={level}>{level}</span>)}</div><footer><strong>{subject.tutorCount} mentora</strong><Link href={`/pronadi-profesora?subject=${subject.slug}`}>Pronađi mentora <ArrowRight /></Link></footer></article>; })}
        </div>
      </main>
    </div>
  );
}
