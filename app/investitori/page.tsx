import Link from "next/link";
import { MarketingHeader } from "../components/MarketingHeader";
import { ArrowRight, BrainCircuit, CircleDollarSign, Database, Network, Sparkles } from "lucide-react";

const loops = [
  [Network, "Reputacijska petlja", "Više sati gradi vjerodostojnu reputaciju, veću vidljivost i veći prihod mentora."],
  [Database, "Petlja znanja", "Anonimizirani obrasci pogrešaka i objašnjenja poboljšavaju sadržaj za sljedeće učenike."],
  [BrainCircuit, "Personalizacijska petlja", "Što više učenik koristi platformu, AI preciznije predviđa sljedeću prepreku."],
] as const;

const phases = [
  ["01", "MVP marketplace", "Profili, rezervacije, naplata, učionica i recenzije", "0–6 mj"],
  ["02", "Snimka → znanje", "Transkript, sažeci i strukturirani materijali", "6–9 mj"],
  ["03", "Personalizirani AI", "Testovi, planovi i memorija učenja", "9–14 mj"],
  ["04", "Prediktivno učenje", "Rana detekcija poteškoća i sljedeći najbolji korak", "14+ mj"],
] as const;

export default function InvestorsPage() {
  return (
    <div className="info-page investor-page">
      <MarketingHeader inverse />
      <section className="investor-hero">
        <div className="container">
          <span className="eyebrow eyebrow-light"><span /> Investitorski pregled · koncept 2026.</span>
          <h1>Marketplace koji svaki sat<br />pretvara u <em>podatkovnu prednost.</em></h1>
          <p>Gaudeamus Mentor spaja reputacijski marketplace, transakcijsku infrastrukturu i personalizirani AI sloj za učenje između instrukcija.</p>
          <div><Link className="button button-coral" href="/admin">Otvori command center <ArrowRight /></Link><Link className="button button-ghost" href="/ucenik">Prođi demo kao učenik</Link></div>
        </div>
      </section>
      <main>
        <section className="investor-thesis">
          <div className="container">
            <div><small>TEZA</small><h2>Instrukcije su fragmentirane.<br />Vrijednost nestaje završetkom poziva.</h2></div>
            <p>Platforma zatvara cijeli krug: otkrivanje → povjerenje → rezervacija → naplata → učenje → mjerenje ishoda → ponovno rezerviranje.</p>
          </div>
        </section>
        <section className="section">
          <div className="container moat-grid">
            <div className="section-heading">
              <div className="eyebrow"><span /> Kompozitni moat</div>
              <h2>Tri petlje koje<br /><em>jačaju jedna drugu.</em></h2>
            </div>
            {loops.map(([Icon, title, copy]) => <article key={title}><span><Icon /></span><h3>{title}</h3><p>{copy}</p></article>)}
          </div>
        </section>
        <section className="section investor-model">
          <div className="container">
            <div><span className="eyebrow eyebrow-coral"><span /> Model prihoda</span><h2>Jednostavan take rate.<br />Višestruki putevi rasta.</h2><p>Osnovni prihod je 15% od održanog sata. Dodatni slojevi su Premium vidljivost, grupne instrukcije, sadržaj i AI pretplata.</p></div>
            <div className="model-card">
              <small>SCENARIJ · 10.000 SATI / MJESEC</small>
              <div><span><strong>15 €</strong><small>prosječna cijena sata</small></span><i>×</i><span><strong>15%</strong><small>platformski take rate</small></span><i>=</i><span className="accent"><strong>22.500 €</strong><small>mjesečni prihod</small></span></div>
              <p><CircleDollarSign /> 150.000 € mjesečnog GMV-a</p>
            </div>
          </div>
        </section>
        <section className="section roadmap-section">
          <div className="container">
            <div className="section-heading centered"><div className="eyebrow"><span /> Fazni razvoj</div><h2>Od likvidnog marketplacea<br />do AI obrazovne mreže.</h2></div>
            <div className="roadmap-track">{phases.map((item, index) => <article className={index === 0 ? "active" : ""} key={item[0]}><span>{item[0]}</span><h3>{item[1]}</h3><p>{item[2]}</p><em>{item[3]}</em></article>)}</div>
          </div>
        </section>
        <section className="investor-final">
          <div className="container"><div><Sparkles /><span><small>PRVI CILJ</small><strong>300 kvalitetnih mentora · 10.000 sati mjesečno</strong></span></div><div><Link href="/admin">Pregledaj operativni model <ArrowRight /></Link><Link href="/pronadi-profesora">Isprobaj marketplace</Link></div></div>
        </section>
      </main>
    </div>
  );
}
