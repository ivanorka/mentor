"use client";

import { FormEvent, useMemo, useState } from "react";
import { AppShell } from "../../components/AppShell";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Plus, Settings2, Trash2, X } from "lucide-react";

type EntryKind = "lesson" | "availability";
type CalendarEntry = { id: string; day: number; row: number; span: number; kind: EntryKind; title: string; detail: string; tone: "blue" | "coral" | "mint" };
type Editor = Omit<CalendarEntry, "id"> & { id?: string };

const days = ["PON 20", "UTO 21", "SRI 22", "ČET 23", "PET 24", "SUB 25", "NED 26"];
const times = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];
const initialEntries: CalendarEntry[] = [
  { id: "mia", day: 2, row: 3, span: 1, kind: "lesson", title: "Mia R.", detail: "Integrali", tone: "blue" },
  { id: "luka", day: 3, row: 5, span: 1, kind: "lesson", title: "Luka P.", detail: "Derivacije", tone: "coral" },
  { id: "filip", day: 3, row: 6, span: 1, kind: "lesson", title: "Filip K.", detail: "Matura A", tone: "blue" },
  { id: "nika", day: 5, row: 4, span: 1, kind: "lesson", title: "Nika B.", detail: "Funkcije", tone: "mint" },
  { id: "availability", day: 4, row: 2, span: 3, kind: "availability", title: "Dostupno", detail: "Otvoreno za rezervacije", tone: "mint" },
];

const blankEditor = (day = 1, row = 0): Editor => ({ day, row, span: 1, kind: "availability", title: "Dostupno", detail: "Otvoreno za rezervacije", tone: "mint" });

export default function TutorCalendar() {
  const [view, setView] = useState("Tjedan");
  const [weekOffset, setWeekOffset] = useState(0);
  const [entries, setEntries] = useState(initialEntries);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [notice, setNotice] = useState("");
  const dateLabel = useMemo(() => weekOffset === 0 ? "20. – 26. srpnja 2026." : weekOffset > 0 ? "27. srpnja – 2. kolovoza 2026." : "13. – 19. srpnja 2026.", [weekOffset]);

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor) return;
    const next = { ...editor, title: editor.kind === "availability" && !editor.title.trim() ? "Dostupno" : editor.title };
    if (next.id) setEntries((current) => current.map((entry) => entry.id === next.id ? { ...next, id: next.id } as CalendarEntry : entry));
    else setEntries((current) => [...current, { ...next, id: `slot-${Date.now()}` } as CalendarEntry]);
    setNotice(next.id ? "Termin je ažuriran." : "Dostupnost je dodana u kalendar.");
    setEditor(null);
  };
  const remove = () => {
    if (!editor?.id) return;
    setEntries((current) => current.filter((entry) => entry.id !== editor.id));
    setNotice("Termin je uklonjen iz kalendara.");
    setEditor(null);
  };
  const openEmptySlot = (day: number, row: number) => setEditor(blankEditor(day, row));

  return <AppShell role="tutor" active="/profesor/kalendar" eyebrow="Upravljanje vremenom" title="Kalendar" action={<button className="button button-coral button-small" onClick={() => setEditor(blankEditor(1, 4))}><Plus /> Dodaj dostupnost</button>}>
    <div className="calendar-toolbar"><div><button aria-label="Prethodni tjedan" onClick={() => setWeekOffset((value) => Math.max(-1, value - 1))}><ChevronLeft /></button><button onClick={() => setWeekOffset(0)}>Danas</button><button aria-label="Sljedeći tjedan" onClick={() => setWeekOffset((value) => Math.min(1, value + 1))}><ChevronRight /></button><strong>{dateLabel}</strong></div><div className="view-switch">{["Dan", "Tjedan", "Mjesec"].map((item) => <button className={view === item ? "active" : ""} onClick={() => { setView(item); setNotice(`Prikaz: ${item.toLocaleLowerCase("hr-HR")}.`); }} key={item}>{item}</button>)}<button aria-label="Uredi redovnu dostupnost" onClick={() => setEditor({ ...blankEditor(1, 4), title: "Redovna dostupnost", detail: "Pon – čet · 16:00 – 21:00" })}><Settings2 /></button></div></div>
    {notice && <div className="calendar-notice"><Check /> {notice}<button onClick={() => setNotice("")} aria-label="Zatvori obavijest"><X /></button></div>}
    <div className="tutor-calendar-layout"><section className="week-calendar"><div className="calendar-grid-head"><span>GMT+2</span>{days.map((day, index) => <strong className={index === 1 ? "today" : ""} key={day}>{day}</strong>)}</div><div className="calendar-grid-body"><div className="time-axis">{times.map((time) => <span key={time}>{time}</span>)}</div><div className="calendar-cells">{Array.from({ length: 49 }).map((_, index) => { const day = (index % 7) + 1; const row = Math.floor(index / 7); return <button className="calendar-slot" aria-label={`Dodaj termin: ${days[day - 1]} ${times[row]}`} onClick={() => openEmptySlot(day, row)} key={index} />; })}{entries.map((entry) => entry.kind === "availability" ? <button className="availability-block calendar-entry-button" onClick={(event) => { event.stopPropagation(); setEditor(entry); }} style={{ gridColumn: String(entry.day), gridRow: `${entry.row + 1} / span ${entry.span}` }} key={entry.id}>{entry.title}</button> : <button className={`event event-${entry.tone} calendar-entry-button`} onClick={(event) => { event.stopPropagation(); setEditor(entry); }} style={{ gridColumn: String(entry.day), gridRow: `${entry.row + 1} / span ${entry.span}` }} key={entry.id}><small>{times[entry.row]}</small><strong>{entry.title}</strong><span>{entry.detail}</span></button>)}</div></div></section><aside className="calendar-side"><div><span className="metric-icon coral"><CalendarDays /></span><strong>84 sata</strong><small>rezervirano u srpnju</small></div><div className="availability-card"><h3>Redovna dostupnost</h3><p><Check /> Pon – čet · 16:00 – 21:00</p><p><Check /> Sub · 09:00 – 13:00</p><button onClick={() => setEditor({ ...blankEditor(1, 4), title: "Redovna dostupnost", detail: "Pon – čet · 16:00 – 21:00" })}>Uredi raspored</button></div><div className="calendar-tip"><Clock3 /><span><strong>Pametna preporuka</strong><small>Petkom u 18:00 imate 72% šanse za rezervaciju.</small></span></div></aside></div>
    {editor && <div className="calendar-editor-backdrop" role="presentation" onMouseDown={() => setEditor(null)}><form className="calendar-editor" onSubmit={save} onMouseDown={(event) => event.stopPropagation()}><header><div><span className="step-kicker">{editor.id ? "UREDI TERMIN" : "NOVI TERMIN"}</span><h2>{editor.id ? "Uredi odabrani termin" : "Dodaj dostupnost"}</h2></div><button type="button" onClick={() => setEditor(null)} aria-label="Zatvori"><X /></button></header><label className="form-label">Vrsta termina<select value={editor.kind} onChange={(event) => setEditor((current) => current ? { ...current, kind: event.target.value as EntryKind, title: event.target.value === "availability" ? "Dostupno" : current.title, tone: event.target.value === "availability" ? "mint" : "blue" } : current)}><option value="availability">Dostupno za rezervaciju</option><option value="lesson">Rezervirani sat</option></select></label><label className="form-label">{editor.kind === "availability" ? "Naziv dostupnosti" : "Učenik"}<input value={editor.title} onChange={(event) => setEditor((current) => current ? { ...current, title: event.target.value } : current)} required /></label><label className="form-label">Detalj<input value={editor.detail} onChange={(event) => setEditor((current) => current ? { ...current, detail: event.target.value } : current)} placeholder="Predmet ili kratka napomena" /></label><div className="calendar-editor-grid"><label className="form-label">Dan<select value={editor.day} onChange={(event) => setEditor((current) => current ? { ...current, day: Number(event.target.value) } : current)}>{days.map((day, index) => <option value={index + 1} key={day}>{day}</option>)}</select></label><label className="form-label">Vrijeme<select value={editor.row} onChange={(event) => setEditor((current) => current ? { ...current, row: Number(event.target.value) } : current)}>{times.map((time, index) => <option value={index} key={time}>{time}</option>)}</select></label></div><footer>{editor.id && <button className="calendar-delete" type="button" onClick={remove}><Trash2 /> Ukloni</button>}<button className="button button-coral" type="submit">{editor.id ? "Spremi promjene" : "Dodaj u kalendar"}</button></footer></form></div>}
  </AppShell>;
}
