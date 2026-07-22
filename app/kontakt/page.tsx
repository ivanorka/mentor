"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, Headphones, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { MarketingHeader } from "../components/MarketingHeader";
import { SiteFooter } from "../components/SiteFooter";

const topics = ["Pomoć s rezervacijom", "Pitanje o mentorskom profilu", "Plaćanje i račun", "Sigurnost i privatnost", "Partnerstvo", "Ostalo"];

export default function ContactPage() {
  const [topic, setTopic] = useState(topics[0]);
  const [sent, setSent] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    localStorage.setItem("gm-contact-request", JSON.stringify({
      name: form.get("name"), email: form.get("email"), topic, message: form.get("message"), createdAt: new Date().toISOString(),
    }));
    setSent(true);
  };

  return <div className="contact-page info-page">
    <MarketingHeader inverse />
    <section className="contact-hero info-hero"><div className="container"><span className="eyebrow eyebrow-light"><span /> Tu smo kada zatrebaš</span><h1>Razgovarajmo.<br /><em>Stvarno slušamo.</em></h1><p>Od brzog pitanja do partnerske ideje — naš tim će tvoj upit usmjeriti pravoj osobi.</p></div></section>
    <main className="contact-main container">
      <section className="contact-options" aria-label="Načini pomoći">
        <article><span><MessageCircle /></span><div><strong>Javi se kroz formu</strong><p>Opiši što trebaš — kontekst nam pomaže odgovoriti konkretno.</p></div></article>
        <article><span><Clock3 /></span><div><strong>Odgovor u jednom radnom danu</strong><p>Za rezervacije i aktivne sate prioritetno provjeravamo detalje.</p></div></article>
        <article><span><ShieldCheck /></span><div><strong>Sigurna komunikacija</strong><p>Podatke koristimo samo kako bismo riješili tvoj upit.</p></div></article>
      </section>
      <section className="contact-layout">
        <div className="contact-copy"><span className="eyebrow"><span /> Podrška koja razumije kontekst</span><h2>Kako ti možemo<br />pomoći danas?</h2><p>Odaberi temu i napiši nekoliko rečenica. Ako se upit odnosi na sat ili profil, uključi predmet i ime mentora — tako dolazimo do rješenja brže.</p><div className="contact-direct"><Headphones /><span><strong>Za aktivan sat ili hitnu poteškoću</strong><small>Odaberi „Pomoć s rezervacijom” i označi detalje termina.</small></span></div><Link href="/kako-radi">Pogledaj kako platforma radi <ArrowRight /></Link></div>
        <div className="contact-card">{sent ? <div className="contact-success"><CheckCircle2 /><span className="step-kicker">UPIT JE ZABILJEŽEN</span><h2>Hvala, javit ćemo se uskoro.</h2><p>Za demo je poruka spremljena u ovom pregledniku. U produkciji bi naš tim odgovorio na navedenu e-mail adresu.</p><button className="button button-navy" onClick={() => setSent(false)}>Pošalji novi upit</button></div> : <form onSubmit={submit}><div className="contact-card-head"><div><span className="step-kicker">KONTAKT FORMA</span><h2>Pošalji poruku</h2></div><Mail /></div><label className="form-label">Ime i prezime<input name="name" required placeholder="Kako da ti se obratimo?" /></label><label className="form-label">E-mail<input name="email" type="email" required placeholder="ime@primjer.hr" /></label><fieldset className="contact-topic"><legend>Tema upita</legend><div>{topics.map((item) => <button type="button" className={topic === item ? "selected" : ""} onClick={() => setTopic(item)} key={item}>{item}</button>)}</div></fieldset><label className="form-label">Kako možemo pomoći?<textarea name="message" required rows={5} placeholder="Opiši upit što jasnije…" /></label><button className="button button-coral contact-submit" type="submit">Pošalji upit <ArrowRight /></button><small className="contact-privacy"><ShieldCheck /> Ne dijelimo tvoje podatke izvan rješavanja ovog upita.</small></form>}</div>
      </section>
    </main>
    <SiteFooter />
  </div>;
}
