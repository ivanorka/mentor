"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, BadgeCheck, Clock3, Heart, RotateCcw, Star } from "lucide-react";
import type { Tutor } from "../data";

export function TutorCard({ tutor, featured = false }: { tutor: Tutor; featured?: boolean }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const favorites = JSON.parse(localStorage.getItem("gm-favorite-tutors") || "[]") as string[];
    queueMicrotask(() => setSaved(favorites.includes(tutor.slug)));
  }, [tutor.slug]);
  const toggleSaved = () => {
    const favorites = new Set(JSON.parse(localStorage.getItem("gm-favorite-tutors") || "[]") as string[]);
    if (favorites.has(tutor.slug)) favorites.delete(tutor.slug); else favorites.add(tutor.slug);
    localStorage.setItem("gm-favorite-tutors", JSON.stringify([...favorites]));
    setSaved(favorites.has(tutor.slug));
  };
  return (
    <article className={`tutor-card ${featured ? "tutor-card-featured" : ""}`}>
      {(featured || tutor.matchScore !== undefined) && <div className="top-match">{tutor.matchScore !== undefined ? `${tutor.matchScore}% podudaranje` : "Istaknuti mentor"}</div>}
      <div className="tutor-card-head">
        <div className={`avatar avatar-${tutor.accent}`} aria-hidden="true"><span>{tutor.initials}</span></div>
        <button type="button" className={`icon-button favorite ${saved ? "saved" : ""}`} onClick={toggleSaved} aria-pressed={saved} aria-label={`${saved ? "Ukloni" : "Spremi"} profesora ${tutor.name}`}><Heart size={18} fill={saved ? "currentColor" : "none"} /></button>
      </div>
      <div className="tutor-name-row">
        <h3>{tutor.name}</h3>
        {tutor.verified && <BadgeCheck className="verified" size={18} aria-label="Provjeren profil" />}
      </div>
      <p className="tutor-role">{tutor.role}</p>
      <div className="tag-row">
        {tutor.subjects.map((subject) => <span className="tag" key={subject}>{subject}</span>)}
        {tutor.elite && <span className="tag tag-gold">Elite</span>}
        {tutor.video && <span className="tag tag-video">Video profil</span>}
      </div>
      <p className="tutor-quote">“{tutor.quote}”</p>
      {tutor.matchReasons?.length ? <ul className="match-reasons">{tutor.matchReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : null}
      <div className="reputation-row">
        <span><Star size={15} fill="currentColor" /> <strong>{tutor.rating.toFixed(2)}</strong> ({tutor.reviews})</span>
        <span><RotateCcw size={15} /> {tutor.repeatRate}% ponovno</span>
      </div>
      <div className="availability-row">
        <span><Clock3 size={15} /> {tutor.nextSlot}</span>
        <strong>{tutor.price} €<small>/ 60 min</small></strong>
      </div>
      <Link className="card-link" href={`/profesori/${tutor.slug}`}>
        Pogledaj profil <ArrowUpRight size={17} />
      </Link>
    </article>
  );
}
