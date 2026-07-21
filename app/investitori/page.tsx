"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MarketingHeader } from "../components/MarketingHeader";
import {
  ArrowRight, BarChart3, BrainCircuit, CircleDollarSign, Database,
  Network, Sparkles, TrendingUp, Users,
} from "lucide-react";

type ProjectionInputs = {
  mentorCount: number;
  lessonsPerMentor: number;
  averagePrice: number;
  takeRate: number;
  aiSubscribers: number;
};

const aiMonthlyPrice = 9.9;

const scenarios: { id: string; name: string; note: string; values: ProjectionInputs }[] = [
  { id: "pilot", name: "Pilot", note: "Prva likvidna niša", values: { mentorCount: 50, lessonsPerMentor: 18, averagePrice: 17, takeRate: 15, aiSubscribers: 300 } },
  { id: "growth", name: "Rast", note: "Cilj · 10k sati", values: { mentorCount: 300, lessonsPerMentor: 34, averagePrice: 18, takeRate: 15, aiSubscribers: 2500 } },
  { id: "scale", name: "Skala", note: "Nacionalna mreža", values: { mentorCount: 1000, lessonsPerMentor: 50, averagePrice: 20, takeRate: 16, aiSubscribers: 10000 } },
];

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

const currency = new Intl.NumberFormat("hr-HR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const currencyPrecise = new Intl.NumberFormat("hr-HR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const number = new Intl.NumberFormat("hr-HR", { maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat("hr-HR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default function InvestorsPage() {
  const [inputs, setInputs] = useState<ProjectionInputs>(scenarios[1].values);

  const projection = useMemo(() => {
    const monthlyLessons = inputs.mentorCount * inputs.lessonsPerMentor;
    const gmv = monthlyLessons * inputs.averagePrice;
    const marketplaceMrr = gmv * (inputs.takeRate / 100);
    const aiMrr = inputs.aiSubscribers * aiMonthlyPrice;
    const totalMrr = marketplaceMrr + aiMrr;
    const arr = totalMrr * 12;
    const marketplaceShare = totalMrr ? (marketplaceMrr / totalMrr) * 100 : 0;
    return { monthlyLessons, gmv, marketplaceMrr, aiMrr, totalMrr, arr, marketplaceShare };
  }, [inputs]);

  const activeScenario = scenarios.find((scenario) => Object.entries(scenario.values).every(([key, value]) => inputs[key as keyof ProjectionInputs] === value))?.id;

  function updateInput(key: keyof ProjectionInputs, value: number) {
    setInputs((current) => ({ ...current, [key]: value }));
  }

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
        <section className="section investor-model" id="simulator">
          <div className="container revenue-simulator-layout">
            <div className="revenue-simulator-copy"><span className="eyebrow eyebrow-coral"><span /> Interaktivni model prihoda</span><h2>Likvidnost pretvorena<br />u <em>mjerljiv rast.</em></h2><p>Marketplace prihod polazi od take ratea na održani sat. AI pretplata dodaje ponavljajući prihod između instrukcija — pomakni pretpostavke i istraži tri faze rasta.</p><div className="simulator-equation"><span><Users /><strong>{number.format(inputs.mentorCount)}</strong><small>mentora</small></span><i>×</i><span><BarChart3 /><strong>{number.format(inputs.lessonsPerMentor)}</strong><small>sati mjesečno</small></span><i>=</i><span className="accent"><TrendingUp /><strong>{number.format(projection.monthlyLessons)}</strong><small>održanih sati</small></span></div><div className="liquidity-target"><span><strong>{Math.min(100, Math.round((projection.monthlyLessons / 10000) * 100))}%</strong><small>prema prvom cilju od 10.000 sati mjesečno</small></span><i><b style={{ width: `${Math.min(100, (projection.monthlyLessons / 10000) * 100)}%` }} /></i></div></div>

            <div className="model-card revenue-simulator-card">
              <header><span><small>REVENUE & LIQUIDITY LAB</small><strong>Modeliraj scenarij</strong></span><em><i /> IZRAČUN UŽIVO</em></header>
              <div className="scenario-presets" aria-label="Scenariji projekcije">
                {scenarios.map((scenario) => <button className={activeScenario === scenario.id ? "active" : ""} onClick={() => setInputs(scenario.values)} key={scenario.id}><strong>{scenario.name}</strong><small>{scenario.note}</small></button>)}
              </div>
              <div className="simulator-controls">
                <label htmlFor="mentor-count"><span><strong>Broj aktivnih mentora</strong><output>{number.format(inputs.mentorCount)}</output></span><input id="mentor-count" type="range" min="20" max="2000" step="10" value={inputs.mentorCount} onChange={(event) => updateInput("mentorCount", Number(event.target.value))} /></label>
                <label htmlFor="lessons-per-mentor"><span><strong>Mjesečni sati po mentoru</strong><output>{number.format(inputs.lessonsPerMentor)}</output></span><input id="lessons-per-mentor" type="range" min="5" max="80" step="1" value={inputs.lessonsPerMentor} onChange={(event) => updateInput("lessonsPerMentor", Number(event.target.value))} /></label>
                <label htmlFor="average-price"><span><strong>Prosječna cijena sata</strong><output>{currency.format(inputs.averagePrice)}</output></span><input id="average-price" type="range" min="10" max="40" step="1" value={inputs.averagePrice} onChange={(event) => updateInput("averagePrice", Number(event.target.value))} /></label>
                <label htmlFor="take-rate"><span><strong>Platformski take rate</strong><output>{percent.format(inputs.takeRate)}%</output></span><input id="take-rate" type="range" min="5" max="25" step="0.5" value={inputs.takeRate} onChange={(event) => updateInput("takeRate", Number(event.target.value))} /></label>
                <label htmlFor="ai-subscribers"><span><strong>AI pretplatnici</strong><output>{number.format(inputs.aiSubscribers)}</output></span><input id="ai-subscribers" type="range" min="0" max="50000" step="100" value={inputs.aiSubscribers} onChange={(event) => updateInput("aiSubscribers", Number(event.target.value))} /><small>Modelirana cijena AI plana · {currencyPrecise.format(aiMonthlyPrice)} / mj.</small></label>
              </div>

              <div className="projection-metrics" aria-live="polite">
                <article><span><CircleDollarSign /></span><small>MJESEČNI GMV</small><strong>{currency.format(projection.gmv)}</strong><em>{number.format(projection.monthlyLessons)} održanih sati</em></article>
                <article><span><TrendingUp /></span><small>MARKETPLACE PRIHOD</small><strong>{currency.format(projection.marketplaceMrr)}</strong><em>{percent.format(inputs.takeRate)}% take rate</em></article>
                <article><span><BrainCircuit /></span><small>AI MRR</small><strong>{currency.format(projection.aiMrr)}</strong><em>{number.format(inputs.aiSubscribers)} pretplatnika</em></article>
                <article className="arr-metric"><span><Sparkles /></span><small>PROJEKTIRANI ARR</small><strong>{currency.format(projection.arr)}</strong><em>{currency.format(projection.totalMrr)} ukupni MRR</em></article>
              </div>
              <div className="revenue-mix"><div><span>Marketplace <strong>{Math.round(projection.marketplaceShare)}%</strong></span><span>AI <strong>{Math.round(100 - projection.marketplaceShare)}%</strong></span></div><i><b style={{ width: `${projection.marketplaceShare}%` }} /><em style={{ width: `${100 - projection.marketplaceShare}%` }} /></i></div>
              <p className="projection-disclaimer"><Sparkles /> Ovaj simulator prikazuje ilustrativnu projekciju na temelju odabranih pretpostavki. Nije financijska prognoza, jamstvo rezultata ni investicijsko obećanje.</p>
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
