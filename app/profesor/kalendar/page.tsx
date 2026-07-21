"use client";

import { useState } from "react";
import { AppShell } from "../../components/AppShell";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Plus, Settings2 } from "lucide-react";

export default function TutorCalendar() {
  const [view, setView] = useState("Tjedan");
  return (
    <AppShell role="tutor" active="/profesor/kalendar" eyebrow="Upravljanje vremenom" title="Kalendar" action={<button className="button button-coral button-small"><Plus /> Dodaj dostupnost</button>}>
      <div className="calendar-toolbar"><div><button><ChevronLeft /></button><button>Danas</button><button><ChevronRight /></button><strong>20. – 26. srpnja 2026.</strong></div><div className="view-switch">{["Dan","Tjedan","Mjesec"].map((item) => <button className={view === item ? "active" : ""} onClick={() => setView(item)} key={item}>{item}</button>)}<button><Settings2 /></button></div></div>
      <div className="tutor-calendar-layout"><section className="week-calendar"><div className="calendar-grid-head"><span>GMT+2</span>{["PON 20","UTO 21","SRI 22","ČET 23","PET 24","SUB 25","NED 26"].map((day,index) => <strong className={index === 1 ? "today" : ""} key={day}>{day}</strong>)}</div><div className="calendar-grid-body"><div className="time-axis">{["08:00","10:00","12:00","14:00","16:00","18:00","20:00"].map((time) => <span key={time}>{time}</span>)}</div><div className="calendar-cells">{Array.from({length:49}).map((_,index) => <i key={index} />)}<article className="event event-blue" style={{gridColumn:"2",gridRow:"5 / span 2"}}><small>14:00</small><strong>Mia R.</strong><span>Integrali</span></article><article className="event event-coral" style={{gridColumn:"3",gridRow:"7 / span 2"}}><small>18:30</small><strong>Luka P.</strong><span>Derivacije</span></article><article className="event event-blue" style={{gridColumn:"3",gridRow:"9 / span 2"}}><small>20:00</small><strong>Filip K.</strong><span>Matura A</span></article><article className="event event-mint" style={{gridColumn:"5",gridRow:"6 / span 2"}}><small>16:00</small><strong>Nika B.</strong><span>Funkcije</span></article><article className="availability-block" style={{gridColumn:"4",gridRow:"4 / span 5"}}>Dostupno</article></div></div></section><aside className="calendar-side"><div><span className="metric-icon coral"><CalendarDays /></span><strong>84 sata</strong><small>rezervirano u srpnju</small></div><div className="availability-card"><h3>Redovna dostupnost</h3><p><Check /> Pon – čet · 16:00 – 21:00</p><p><Check /> Sub · 09:00 – 13:00</p><button>Uredi raspored</button></div><div className="calendar-tip"><Clock3 /><span><strong>Pametna preporuka</strong><small>Petkom u 18:00 imate 72% šanse za rezervaciju.</small></span></div></aside></div>
    </AppShell>
  );
}
