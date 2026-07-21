import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, BadgeCheck, BookOpen, CalendarDays, ChevronRight,
  Clock3, FileCheck2, GraduationCap, Heart, MessageCircle, Play, Quote,
  RotateCcw, ShieldCheck, Sparkles, Star, Users, Video,
} from "lucide-react";
import { MarketingHeader } from "../../components/MarketingHeader";
import { tutors, weekSlots } from "../../data";

export default async function TutorProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tutor = tutors.find((item) => item.slug === slug);
  if (!tutor) notFound();
  return (
    <div className="profile-page">
      <MarketingHeader />
      <div className="container profile-breadcrumb"><Link href="/pronadi-profesora"><ArrowLeft size={15} /> Svi mentori</Link><span>/</span><span>{tutor.subjects[0]}</span><span>/</span><strong>{tutor.name}</strong></div>
      <main className="container profile-layout">
        <div className="profile-content">
          <section className="profile-intro-card">
            <div className={`profile-large-avatar avatar-${tutor.accent}`}><span>{tutor.initials}</span><button aria-label="Pokreni video"><Play fill="currentColor" /></button></div>
            <div className="profile-intro-copy">
              <div className="profile-kicker">{tutor.elite && <span><Sparkles size={13} /> Elite mentor</span>}<span><ShieldCheck size={13} /> Identitet potvrđen</span></div>
              <div className="profile-name-line"><h1>{tutor.name}</h1><BadgeCheck /></div>
              <p className="profile-role-large">{tutor.role}</p>
              <div className="tag-row">{tutor.subjects.map((item) => <span className="tag" key={item}>{item}</span>)}<span className="tag tag-neutral">{tutor.level}</span></div>
              <p className="profile-quote-large">“{tutor.quote}”</p>
              <div className="profile-actions-mobile"><Link className="button button-coral" href={`/rezervacija/${tutor.slug}`}>Rezerviraj termin</Link><button className="icon-button"><Heart /></button></div>
            </div>
          </section>
          <section className="profile-metric-grid">
            <div><Star fill="currentColor" /><strong>{tutor.rating}</strong><span>{tutor.reviews} recenzija</span></div><div><BookOpen /><strong>{tutor.lessons.toLocaleString("hr-HR")}</strong><span>održanih sati</span></div><div><Users /><strong>{tutor.students}</strong><span>učenika</span></div><div><RotateCcw /><strong>{tutor.repeatRate}%</strong><span>ponovno rezervira</span></div><div><Clock3 /><strong>{tutor.response}</strong><span>vrijeme odgovora</span></div>
          </section>
          <nav className="profile-tabs"><a href="#o-meni" className="active">O meni</a><a href="#pristup">Način rada</a><a href="#recenzije">Recenzije</a><a href="#obrazovanje">Obrazovanje</a></nav>
          <section className="profile-section" id="o-meni"><div className="section-mini-title"><span>01</span><h2>O meni</h2></div><p>Već 9 godina pomažem učenicima da matematiku prestanu doživljavati kao niz pravila koja treba zapamtiti. Moj je cilj pronaći model objašnjenja koji odgovara načinu na koji baš taj učenik razmišlja.</p><p>Specijalizirana sam za pripremu državne mature, analizu i geometriju. Svaki sat završava jasnim dogovorom što učenik može samostalno primijeniti i što je naš sljedeći korak.</p></section>
          <section className="profile-section" id="pristup"><div className="section-mini-title"><span>02</span><h2>Kako izgleda moj sat</h2></div><div className="method-grid"><div><span>1</span><h3>Dijagnostika</h3><p>Prvih 5 minuta provjeravamo što je jasno i gdje točno nastaje blokada.</p></div><div><span>2</span><h3>Aktivno rješavanje</h3><p>Učenik rješava, ja postavljam pitanja i objašnjavam kada je potrebno.</p></div><div><span>3</span><h3>Paket znanja</h3><p>AI sažetak, zadaci i kviz ostaju dostupni odmah nakon sata.</p></div></div></section>
          <section className="profile-section" id="recenzije"><div className="section-mini-title"><span>03</span><h2>Što kažu učenici</h2></div><div className="reviews-summary"><strong>{tutor.rating}</strong><span><span className="stars">★★★★★</span><small>Na temelju {tutor.reviews} provjerenih sati</small></span><div className="rating-bars"><span>5 <i><b style={{ width: "94%" }} /></i> 94%</span><span>4 <i><b style={{ width: "5%" }} /></i> 5%</span><span>3 <i><b style={{ width: "1%" }} /></i> 1%</span></div></div><div className="review-grid"><article><Quote /><p>“Prvi put stvarno razumijem derivacije, a ne samo postupak. AI zadaci nakon sata pogodili su točno ono gdje griješim.”</p><strong>Luka P.</strong><span>3. razred gimnazije · prije 3 dana</span></article><article><Quote /><p>“Ana je smirena, jasna i uvijek ima drugi način objašnjenja. U dva mjeseca podigla sam ocjenu s 2 na 4.”</p><strong>Mia R.</strong><span>2. razred gimnazije · prije 8 dana</span></article></div></section>
          <section className="profile-section" id="obrazovanje"><div className="section-mini-title"><span>04</span><h2>Obrazovanje i potvrde</h2></div><div className="credential-list"><div><GraduationCap /><span><strong>Magistra edukacije matematike i fizike</strong><small>Prirodoslovno-matematički fakultet · 2016.</small></span><FileCheck2 /></div><div><FileCheck2 /><span><strong>Cambridge Certificate in Teaching Mathematics</strong><small>Professional development · 2022.</small></span><FileCheck2 /></div></div></section>
        </div>
        <aside className="booking-sidebar">
          <div className="booking-sticky">
            <div className="booking-price"><span>Individualni sat · 60 min</span><strong>{tutor.price} €</strong></div>
            <div className="availability-live"><span /><strong>{tutor.nextSlot}</strong> prvi slobodan termin</div>
            <div className="sidebar-calendar"><div className="calendar-head"><button>‹</button><strong>21. – 25. srpnja</strong><button>›</button></div><div className="day-row">{weekSlots.map((day, index) => <span className={index === 2 ? "selected" : ""} key={day.day}><small>{day.day}</small>{day.date}</span>)}</div><div className="time-row"><span>15:30</span><span className="selected">18:30</span><span>20:00</span></div></div>
            <Link className="button button-coral booking-main-button" href={`/rezervacija/${tutor.slug}`}>Odaberi termin <ChevronRight size={17} /></Link>
            <Link className="message-button" href="/ucenik/poruke"><MessageCircle size={17} /> Pošalji poruku</Link>
            <div className="booking-trust"><p><ShieldCheck /> Sigurno plaćanje</p><p><Video /> Snimka i AI materijali uključeni</p><p><CalendarDays /> Besplatno otkazivanje do 24 h</p></div>
          </div>
        </aside>
      </main>
    </div>
  );
}
