import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, Check, ChevronRight, Clock3, Play, Sparkles, Star, TrendingUp, Video, Zap } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { lessonHistory } from "../data";

export default function StudentDashboard() {
  return (
    <AppShell role="student" active="/ucenik" eyebrow="Dobrodošao natrag, Luka" title="Tvoj prostor za napredak" action={<Link className="button button-coral button-small" href="/pronadi-profesora">＋ Rezerviraj sat</Link>}>
      <section className="student-hero-card">
        <div><span className="dashboard-chip"><CalendarDays /> SLIJEDEĆI SAT · DANAS</span><h2>Derivacije složenih funkcija</h2><p>Matematika s Anom Kovač · 18:30 – 19:30</p><div className="student-hero-actions"><Link className="button button-coral" href="/ucenik/sat/matematika-derivacije"><Video size={17} /> Uđi u učionicu</Link><Link className="button button-ghost-dark" href="/profesori/ana-kovac">Detalji sata</Link></div></div>
        <div className="class-countdown"><span><small>SAT POČINJE ZA</small><strong>02:14:36</strong></span><div className="avatar avatar-coral">AK</div></div>
      </section>
      <section className="dashboard-metrics">
        <div><span className="metric-icon blue"><BookOpen /></span><p><small>Održani sati</small><strong>24</strong><em>+4 ovaj mjesec</em></p></div>
        <div><span className="metric-icon coral"><TrendingUp /></span><p><small>Tjedni niz</small><strong>6 tjedana</strong><em>Osobni rekord</em></p></div>
        <div><span className="metric-icon gold"><Star /></span><p><small>Prosjek kvizova</small><strong>86%</strong><em>↑ 12% ovaj mjesec</em></p></div>
        <div><span className="metric-icon mint"><Zap /></span><p><small>AI fokus</small><strong>18 min</strong><em>dnevni prosjek</em></p></div>
      </section>
      <div className="dashboard-grid-main">
        <section className="dashboard-panel progress-panel">
          <div className="panel-heading"><div><span>TVOJ NAPREDAK</span><h3>Matematika · Državna matura</h3></div><select defaultValue="30 dana"><option>30 dana</option><option>90 dana</option></select></div>
          <div className="progress-score"><div className="score-ring"><strong>78</strong><small>/100</small></div><div><strong>Na dobrom si putu</strong><p>Uz ovaj tempo spremnost za maturu bit će <b>91%</b> do 1. svibnja.</p><div className="mini-trend"><i /><i /><i /><i /><i /><i /><i /></div></div></div>
          <div className="topic-progress"><div><span>Algebra</span><i><b style={{ width: "91%" }} /></i><strong>91%</strong></div><div><span>Funkcije</span><i><b style={{ width: "84%" }} /></i><strong>84%</strong></div><div><span>Derivacije</span><i><b className="coral" style={{ width: "67%" }} /></i><strong>67%</strong></div><div><span>Geometrija</span><i><b className="gold" style={{ width: "72%" }} /></i><strong>72%</strong></div></div>
        </section>
        <section className="dashboard-panel ai-focus-panel">
          <div className="panel-heading"><div><span>AI MENTOR PREPORUČUJE</span><h3>Današnji fokus</h3></div><span className="ai-icon"><Sparkles /></span></div>
          <div className="focus-topic"><span>SLABA TOČKA</span><h4>Lančano pravilo s trigonometrijskim funkcijama</h4><p>U zadnja 3 zadatka ponavlja se ista pogreška. Treba ti oko 12 minuta da je riješiš.</p></div>
          <div className="focus-tasks"><p><span><Check /> Mini lekcija</span><small>4 min</small></p><p><span><Check /> 5 ciljanih zadataka</span><small>8 min</small></p><p><span><Check /> Brza provjera</span><small>2 min</small></p></div>
          <Link className="button button-navy" href="/ucenik/ai-mentor">Pokreni fokus sesiju <ArrowRight size={16} /></Link>
        </section>
      </div>
      <div className="dashboard-grid-bottom">
        <section className="dashboard-panel recent-lessons">
          <div className="panel-heading"><div><span>NASTAVI UČITI</span><h3>Nedavne lekcije</h3></div><Link href="/ucenik/lekcije/derivacije">Prikaži sve <ChevronRight size={15} /></Link></div>
          {lessonHistory.map((lesson, index) => <Link href={index === 0 ? "/ucenik/lekcije/derivacije" : "/ucenik/lekcije/derivacije"} className="lesson-row" key={lesson.title}><span className={`lesson-icon ${lesson.tone}`}><Play /></span><span><small>{lesson.subject} · {lesson.date}</small><strong>{lesson.title}</strong><em>s {lesson.tutor}</em></span><span className="lesson-progress"><i><b style={{ width: `${lesson.progress}%` }} /></i><small>{lesson.progress}% usvojeno</small></span><ChevronRight /></Link>)}
        </section>
        <section className="dashboard-panel weekly-plan">
          <div className="panel-heading"><div><span>OVAJ TJEDAN</span><h3>Plan učenja</h3></div><strong>4/6</strong></div>
          <div className="week-circles">{["P","U","S","Č","P","S","N"].map((day, index) => <span className={index < 4 ? "done" : index === 4 ? "today" : ""} key={`${day}-${index}`}><i>{index < 4 ? <Check /> : day}</i><small>{["21","22","23","24","25","26","27"][index]}</small></span>)}</div>
          <p><Clock3 /> Sljedeće: 15 min ponavljanja u petak</p>
        </section>
      </div>
    </AppShell>
  );
}
