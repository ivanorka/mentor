import Link from "next/link";
import { MarketingHeader } from "../components/MarketingHeader";
import { SiteFooter } from "../components/SiteFooter";
import {
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  Check,
  Eye,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Video,
} from "lucide-react";

const pillars = [
  [BadgeCheck, "Provjereni ljudi", "Identitet, stručna sprema i certifikati mentora provjeravaju se prije objave profila."],
  [LockKeyhole, "Zaštićena komunikacija", "Osobni kontaktni podaci ostaju skriveni. Chat, datoteke i rezervacije ostaju u sigurnom okruženju."],
  [Video, "Kontrolirane snimke", "Snimka je dostupna samo sudionicima određeno vrijeme, uz jasnu privolu i mogućnost prijave."],
  [BrainCircuit, "AI + ljudska odluka", "AI označava mogući rizik, ali osjetljive odluke potvrđuje osposobljeni tim."],
] as const;

export default function TrustPage() {
  return (
    <div className="info-page trust-info">
      <MarketingHeader inverse />
      <section className="info-hero trust-hero">
        <div className="container">
          <span className="eyebrow eyebrow-light"><span /> Povjerenje po dizajnu</span>
          <h1>Siguran prostor za<br /><em>učenje i rad.</em></h1>
          <p>Tehnologija, jasna pravila i ljudski nadzor štite učenike, profesore i integritet platforme.</p>
        </div>
      </section>
      <main>
        <section className="section">
          <div className="container trust-pillars">
            {pillars.map(([Icon, title, copy]) => (
              <article key={title}><span><Icon /></span><h2>{title}</h2><p>{copy}</p></article>
            ))}
          </div>
        </section>
        <section className="section policy-flow">
          <div className="container">
            <div>
              <span className="eyebrow eyebrow-coral"><span /> Sprječavanje zaobilaženja</span>
              <h2>Fer tržište čuva kvalitetu.</h2>
              <p>AI analizira uzorke poput brojeva telefona, e-maila i poziva na vanjske kanale. Sustav radi proporcionalno i transparentno.</p>
            </div>
            <div className="policy-steps">
              <article><span>1</span><div><strong>Upozorenje i edukacija</strong><small>Korisnik dobiva jasnu informaciju koje je pravilo moguće prekršeno.</small></div><MessageCircle /></article>
              <article><span>2</span><div><strong>Ručni pregled ponavljanja</strong><small>Tim za sigurnost provjerava kontekst prije ograničenja računa.</small></div><Eye /></article>
              <article><span>3</span><div><strong>Proporcionalna zaštitna mjera</strong><small>Privremena suspenzija ili zabrana samo kod potvrđenog kršenja.</small></div><ShieldCheck /></article>
            </div>
          </div>
        </section>
        <section className="section privacy-principles">
          <div className="container">
            <div className="section-heading">
              <div className="eyebrow"><span /> Privatnost učenika</div>
              <h2>AI pamti napredak,<br />ne prisvaja identitet.</h2>
            </div>
            <ul>
              <li><Check /> Minimalan skup podataka potreban za personalizaciju</li>
              <li><Check /> Kontrola, ispravak i brisanje memorije učenja</li>
              <li><Check /> Anonimizacija prije punjenja zajedničke baze znanja</li>
              <li><Check /> Jasna dobna pravila i privola roditelja za maloljetnike</li>
            </ul>
            <Link className="button button-navy" href="/kako-radi">Pogledaj kako platforma radi <ArrowRight /></Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
