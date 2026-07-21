import Link from "next/link";
import {
  ArrowRight, BadgeCheck, BookOpenCheck, BrainCircuit, CalendarCheck2,
  Check, ChevronRight, CirclePlay, Clock3, Play, ShieldCheck, Sparkles,
  Star, TrendingUp, Video,
} from "lucide-react";
import { MarketingHeader } from "./components/MarketingHeader";
import { TutorCard } from "./components/TutorCard";
import { tutors } from "./data";
import { DEFAULT_EDUCATION_LEVEL_ID, EDUCATION_LEVELS, SUBJECT_CATALOG } from "./lib/catalog";

export default function Home() {
  return (
    <div className="marketing-page">
      <section className="hero">
        <MarketingHeader inverse />
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow eyebrow-light"><span /> Nova generacija instrukcija</div>
            <h1>Svaki sat postaje<br /><em>znanje koje ostaje.</em></h1>
            <p>Pronađi provjerenog profesora, rezerviraj termin i nastavi učiti uz osobnog AI mentora koji poznaje tvoj napredak.</p>
            <form className="hero-search" action="/pronadi-profesora">
              <label><span>Što želiš naučiti?</span><select name="subject" defaultValue="matematika" aria-label="Odaberi predmet">{SUBJECT_CATALOG.map((subject) => <option value={subject.slug} key={subject.id}>{subject.name}</option>)}</select></label>
              <label><span>Razina</span><select name="level" defaultValue={DEFAULT_EDUCATION_LEVEL_ID} aria-label="Odaberi razinu">{EDUCATION_LEVELS.map((level) => <option value={level.id} key={level.id}>{level.label}</option>)}</select></label>
              <button aria-label="Pronađi profesora" type="submit">Pronađi mentora <ArrowRight size={18} /></button>
            </form>
            <div className="hero-proof">
              <span className="proof-avatars"><i>AK</i><i>MH</i><i>LM</i><i>+42</i></span>
              <span><strong>4.96 / 5</strong><small><Star size={13} fill="currentColor" /> 2.800+ održanih sati</small></span>
            </div>
          </div>
          <div className="hero-product" aria-label="Pregled Gaudeamus Mentor platforme">
            <div className="product-glow" />
            <div className="floating-pill floating-pill-top"><BadgeCheck size={17} /> 100% provjeren profil</div>
            <div className="hero-profile-card">
              <div className="profile-visual">
                <div className="hero-avatar">AK<span className="online-dot" /></div>
                <button className="intro-play" aria-label="Pokreni video predstavljanje"><Play size={18} fill="currentColor" /></button>
                <div className="profile-badge"><Sparkles size={14} /> Elite mentor</div>
              </div>
              <div className="profile-card-body">
                <div className="profile-title"><div><h3>Ana Kovač <BadgeCheck size={18} /></h3><p>Matematika · Fizika</p></div><strong>18 €<small>/sat</small></strong></div>
                <div className="profile-stats"><span><Star size={14} fill="currentColor" /> 4.98</span><span>1.250 sati</span><span>95% vraća se</span></div>
                <div className="mini-calendar">
                  <span><small>PON</small>21</span><span className="selected"><small>UTO</small>22</span><span><small>SRI</small>23</span><span><small>ČET</small>24</span>
                </div>
                <Link href="/rezervacija/ana-kovac">Rezerviraj termin <ChevronRight size={17} /></Link>
              </div>
            </div>
            <div className="floating-ai-card">
              <span className="ai-icon"><BrainCircuit size={21} /></span>
              <span><small>AI bilješke su spremne</small><strong>Derivacije · 8 ključnih pojmova</strong></span>
              <ChevronRight size={17} />
            </div>
          </div>
        </div>
        <div className="trust-strip container">
          <span>Povjerenje ugrađeno u svaki korak</span>
          <div><span><ShieldCheck /> Potvrđeni identiteti</span><span><CalendarCheck2 /> Sigurno plaćanje</span><span><Video /> Snimka sata</span><span><BrainCircuit /> AI materijali</span></div>
        </div>
      </section>

      <section className="section soft-section" id="mentori">
        <div className="container">
          <div className="section-heading heading-with-action">
            <div><div className="eyebrow"><span /> Mentor po tvojoj mjeri</div><h2>Upoznaj profesore koji<br /><em>mijenjaju način učenja.</em></h2></div>
            <Link className="button button-outline" href="/pronadi-profesora">Istraži sve profesore <ArrowRight size={17} /></Link>
          </div>
          <div className="tutor-grid">
            {tutors.slice(0, 3).map((tutor, index) => <TutorCard tutor={tutor} featured={index === 0} key={tutor.slug} />)}
          </div>
        </div>
      </section>

      <section className="section learning-loop-section">
        <div className="container learning-loop-grid">
          <div className="loop-copy">
            <div className="eyebrow eyebrow-coral"><span /> Više od videopoziva</div>
            <h2>Sat završava.<br /><em>Učenje tek počinje.</em></h2>
            <p>Nakon svake instrukcije naš AI pretvara razgovor u personalizirani paket znanja — bez dodatnog rada profesora.</p>
            <div className="loop-list">
              <div><span>01</span><p><strong>Učiš s profesorom</strong><small>Video, interaktivna ploča i materijali na jednom mjestu.</small></p></div>
              <div className="active"><span>02</span><p><strong>AI razumije sat</strong><small>Transkript, ključni koncepti i mjesta gdje si zapeo.</small></p></div>
              <div><span>03</span><p><strong>Dobivaš osobni plan</strong><small>Sažetak, zadaci, kviz i sljedeći korak.</small></p></div>
            </div>
            <Link className="inline-link" href="/ucenik/lekcije/derivacije">Pogledaj primjer paketa znanja <ArrowRight size={17} /></Link>
          </div>
          <div className="knowledge-card-stack">
            <div className="knowledge-card back-card"><span>KVIZ</span><strong>8/10</strong><small>Spreman za ponavljanje</small></div>
            <div className="knowledge-card mid-card"><span>FLASH KARTICE</span><strong>12</strong><small>ključnih pojmova</small></div>
            <div className="knowledge-card main-card">
              <div className="knowledge-head"><span className="ai-icon"><Sparkles size={20} /></span><span><small>AI paket znanja</small><strong>Derivacije složenih funkcija</strong></span><em>18. srp</em></div>
              <div className="knowledge-progress"><span style={{ width: "84%" }} /><small>Razumijevanje teme · 84%</small></div>
              <div className="concept-list">
                <p><Check /> Lančano pravilo <strong>Usvojeno</strong></p>
                <p><Check /> Derivacija kompozicije <strong>Usvojeno</strong></p>
                <p className="focus"><TrendingUp /> Trigonometrijske funkcije <strong>Vježbaj</strong></p>
              </div>
              <div className="next-step"><BrainCircuit size={20} /><span><small>AI preporučuje</small><strong>5 zadataka za tvoju slabu točku</strong></span><ChevronRight size={18} /></div>
            </div>
          </div>
        </div>
      </section>

      <section className="section reputation-section">
        <div className="container">
          <div className="section-heading centered light-heading">
            <div className="eyebrow eyebrow-light"><span /> Reputacija, ne samo ocjena</div>
            <h2>Izvrsnost koja se<br /><em>može dokazati.</em></h2>
            <p>Svaki održani sat gradi vjerodostojan profesionalni profil mentora.</p>
          </div>
          <div className="reputation-panel">
            <div className="reputation-profile">
              <div className="avatar avatar-coral"><span>AK</span></div>
              <div><h3>Ana Kovač <BadgeCheck size={18} /></h3><p>Elite mentor · Matematika</p></div>
              <span className="elite-seal"><Sparkles /> ELITE</span>
            </div>
            <div className="reputation-metrics">
              <div><Star /><strong>4.98</strong><span>184 recenzije</span></div>
              <div><BookOpenCheck /><strong>1.250</strong><span>održanih sati</span></div>
              <div><TrendingUp /><strong>95%</strong><span>ponovno rezervira</span></div>
              <div><Clock3 /><strong>8 min</strong><span>prosječan odgovor</span></div>
            </div>
            <div className="level-track"><span className="done">Novi</span><span className="done">Provjereni</span><span className="done">Premium</span><span className="current">Elite mentor</span></div>
          </div>
        </div>
      </section>

      <section className="section professor-cta-section">
        <div className="container professor-cta">
          <div>
            <div className="eyebrow eyebrow-coral"><span /> Za profesore</div>
            <h2>Vaše znanje vrijedi više<br />kada ima <em>reputaciju.</em></h2>
            <p>Gaudeamus Mentor brine o terminima, naplati i materijalima. Vi se posvetite onome što radite najbolje — podučavanju.</p>
            <ul><li><Check /> Sami određujete cijenu i dostupnost</li><li><Check /> Sigurna isplata nakon svakog sata</li><li><Check /> AI priprema materijale umjesto vas</li></ul>
            <Link className="button button-navy" href="/za-profesore">Postani Gaudeamus mentor <ArrowRight size={17} /></Link>
          </div>
          <div className="earnings-card">
            <div className="earnings-head"><span><small>Ovaj mjesec</small><strong>1.428,00 €</strong></span><span className="positive">+18,4%</span></div>
            <div className="bar-chart"><i style={{ height: "32%" }} /><i style={{ height: "48%" }} /><i style={{ height: "41%" }} /><i style={{ height: "66%" }} /><i style={{ height: "58%" }} /><i style={{ height: "82%" }} /><i className="active" style={{ height: "94%" }} /></div>
            <div className="earnings-stats"><span><small>Održani sati</small><strong>84</strong></span><span><small>Ponovne rezervacije</small><strong>95%</strong></span><span><small>Ocjena</small><strong>4.98</strong></span></div>
            <div className="next-class"><span className="avatar avatar-blue">LP</span><span><small>Sljedeći sat · 18:30</small><strong>Luka · Derivacije</strong></span><button><CirclePlay size={18} /> Pripremi sat</button></div>
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="container final-cta-inner">
          <span className="cta-spark"><Sparkles /></span>
          <h2>Pravi mentor mijenja<br />način na koji vidiš <em>sebe.</em></h2>
          <p>Počni graditi znanje koje ostaje — već danas.</p>
          <div><Link className="button button-coral" href="/pronadi-profesora">Pronađi svog mentora <ArrowRight size={18} /></Link><Link className="button button-ghost" href="/kako-radi">Pogledaj kako radi</Link></div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div><strong>GAUDEAMUS <em>MENTOR</em></strong><p>Učenje koje ostaje.</p></div>
          <div><h4>Učenici</h4><Link href="/pronadi-profesora">Pronađi profesora</Link><Link href="/kako-radi">Kako radi</Link><Link href="/ucenik/ai-mentor">AI Mentor</Link></div>
          <div><h4>Profesori</h4><Link href="/za-profesore">Postani mentor</Link><Link href="/profesor">Profesorski portal</Link><Link href="/sigurnost">Standardi kvalitete</Link></div>
          <div><h4>Platforma</h4><Link href="/investitori">Vizija i model</Link><Link href="/sigurnost">Sigurnost</Link><a href="mailto:mentor@gaudeamus.hr">Kontakt</a></div>
        </div>
        <div className="container footer-bottom"><span>© 2026 Gaudeamus Mentor. Konceptualni prototip.</span><span>Osijek · Hrvatska</span></div>
      </footer>
    </div>
  );
}
