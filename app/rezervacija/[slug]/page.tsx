"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BadgeCheck, Check, CheckCircle2, CreditCard, LoaderCircle, LockKeyhole, ShieldCheck, Star, Video } from "lucide-react";
import { Brand } from "../../components/Brand";
import { apiFetch } from "../../lib/api";
import { tutors } from "../../data";
import { demoAvailability } from "../../lib/demo";

type Tutor = { userId: string; slug: string; headline: string; rating: number; lessonsCompleted: number; subjects: { subjectId: string; priceEur: number }[]; subjectDetails: { id: string; name: string }[]; user: { name: string } };
type Slot = { id: string; startsAt: string; endsAt: string; status: string };
type Booking = { id: string; lessonId: string; conversationId: string; startsAt: string; endsAt: string; topic: string; priceEur: number; status: string };

const initials = (name: string) => name.split(" ").map((part) => part[0]).join("").slice(0, 2);
const dateKey = (value: Date) => `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
const time = (value: string) => new Intl.DateTimeFormat("hr-HR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Zagreb" }).format(new Date(value));

function demoTutor(slug: string): Tutor | null {
  const source = tutors.find((item) => item.slug === slug);
  if (!source) return null;
  return {
    userId: `tutor-${slug}`,
    slug, headline: source.role, rating: source.rating, lessonsCompleted: source.lessons,
    subjects: source.offerings.map((item) => ({ subjectId: item.subjectId, priceEur: item.price })),
    subjectDetails: source.offerings.map((item) => ({ id: item.subjectId, name: item.subject })),
    user: { name: source.name },
  };
}

export default function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [step, setStep] = useState(1);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [goal, setGoal] = useState("Razumjeti gradivo");
  const [topic, setTopic] = useState("Derivacije složenih funkcija");
  const [note, setNote] = useState("Nisam siguran kada trebam primijeniti lančano pravilo, posebno kod trigonometrijskih funkcija.");
  const [fileName, setFileName] = useState("");
  const [accepted, setAccepted] = useState(true);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([apiFetch<Tutor>(`/tutors/${slug}`), apiFetch<Slot[]>(`/tutors/${slug}/availability?status=open`)])
      .then(([tutorResult, slotResult]) => {
        const query = new URLSearchParams(window.location.search);
        const requestedSubject = query.get("subject");
        const requestedSlot = query.get("slot");
        const selectedSubject = tutorResult.data.subjects.some((item) => item.subjectId === requestedSubject)
          ? requestedSubject!
          : tutorResult.data.subjects[0]?.subjectId || "";
        const selectedAvailability = slotResult.data.find((item) => item.id === requestedSlot) ?? slotResult.data[0];
        setTutor(tutorResult.data); setSlots(slotResult.data); setSubjectId(selectedSubject);
        if (selectedAvailability) {
          setSelectedDay(dateKey(new Date(selectedAvailability.startsAt)));
          setSelectedSlotId(selectedAvailability.id);
        }
      })
      .catch(() => {
        const fallbackTutor = demoTutor(slug);
        if (!fallbackTutor) return setError("Profil se ne može učitati.");
        const fallbackSlots = demoAvailability(slug);
        const query = new URLSearchParams(window.location.search);
        const requestedSubject = query.get("subject");
        const requestedSlot = query.get("slot");
        const selectedAvailability = fallbackSlots.find((item) => item.id === requestedSlot) ?? fallbackSlots[0];
        setTutor(fallbackTutor); setSlots(fallbackSlots);
        setSubjectId(fallbackTutor.subjects.some((item) => item.subjectId === requestedSubject) ? requestedSubject! : fallbackTutor.subjects[0]?.subjectId || "");
        setSelectedDay(dateKey(new Date(selectedAvailability.startsAt)));
        setSelectedSlotId(selectedAvailability.id);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const weekDays = useMemo(() => Array.from({ length: 5 }, (_, index) => { const value = new Date(2026, 6, 20 + index + weekOffset * 7); return value; }), [weekOffset]);
  const daySlots = slots.filter((slot) => dateKey(new Date(slot.startsAt)) === selectedDay);
  const selectedSlot = slots.find((slot) => slot.id === selectedSlotId) || daySlots[0];
  const offering = tutor?.subjects.find((item) => item.subjectId === subjectId) || tutor?.subjects[0];
  const subjectName = tutor?.subjectDetails.find((item) => item.id === subjectId)?.name || tutor?.subjectDetails[0]?.name || "Predmet";
  const price = offering?.priceEur || 0;
  const selectedDate = selectedSlot ? new Date(selectedSlot.startsAt) : null;

  const selectDay = (day: Date) => {
    const key = dateKey(day); setSelectedDay(key);
    const first = slots.find((slot) => dateKey(new Date(slot.startsAt)) === key); setSelectedSlotId(first?.id || "");
  };
  const nextToGoal = () => selectedSlot ? (setError(""), setStep(2)) : setError("Odaberi dostupan termin prije nastavka.");
  const nextToPayment = () => topic.trim().length >= 3 ? (setError(""), setStep(3)) : setError("Upiši temu sata kako bi se mentor mogao pripremiti.");
  const pay = async () => {
    if (!tutor || !selectedSlot) return setError("Odabrani termin više nije dostupan.");
    setProcessing(true); setError("");
    try { await apiFetch<{ user: { email: string } }>("/auth/session"); }
    catch {
      router.push(`/prijava?returnTo=${encodeURIComponent(`/rezervacija/${slug}`)}`); return;
    }
    try {
      const created = await apiFetch<Booking>("/bookings", { method: "POST", body: JSON.stringify({ tutorId: tutor.userId, subjectId, availabilityId: selectedSlot.id, startsAt: selectedSlot.startsAt, endsAt: selectedSlot.endsAt, topic, goal, studentNote: `${note}${fileName ? `\nMaterijal: ${fileName}` : ""}` }) });
      const checkout = await apiFetch<{ checkoutUrl: string }>(`/bookings/${created.data.id}/checkout`, { method: "POST", body: "{}" });
      window.location.assign(checkout.data.checkoutUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Plaćanje nije moguće pokrenuti.");
    }
    finally { setProcessing(false); }
  };

  if (loading) return <main className="booking-loading"><LoaderCircle className="spin" /><Brand /><p>Učitavamo mentora i slobodne termine…</p></main>;
  if (!tutor) return <main className="booking-loading"><Brand /><h1>Mentor nije dostupan</h1><p>{error}</p><Link className="button button-coral" href="/pronadi-profesora">Pronađi drugog mentora</Link></main>;

  return <div className="booking-page">
    <header className="booking-header"><Brand /><Link href={`/profesori/${tutor.slug}`}><ArrowLeft size={16} /> Povratak na profil</Link><span><ShieldCheck size={16} /> Sigurna rezervacija</span></header>
    <div className="booking-stepper">{["Termin", "Cilj sata", "Plaćanje", "Potvrda"].map((label, index) => <span className={step >= index + 1 ? "done" : ""} key={label}><i>{step > index + 1 ? <Check size={13} /> : index + 1}</i>{label}</span>).reduce<React.ReactNode[]>((items, item, index) => [...items, ...(index ? [<b key={`line-${index}`} />] : []), item], [])}</div>
    <main className="booking-container"><section className="booking-flow">
      {step === 1 && <div className="booking-step-content"><div className="step-kicker">KORAK 1 OD 3</div><h1>Odaberi termin koji ti odgovara</h1><p>Svi termini prikazani su u tvojoj vremenskoj zoni (Europe/Zagreb).</p><label className="form-label booking-subject">Predmet<select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>{tutor.subjects.map((item) => <option value={item.subjectId} key={item.subjectId}>{tutor.subjectDetails.find((subject) => subject.id === item.subjectId)?.name} · {item.priceEur} €</option>)}</select></label><div className="month-nav"><button onClick={() => setWeekOffset((value) => value - 1)} aria-label="Prethodni tjedan">‹</button><strong>{weekOffset === 0 ? "20. – 24. srpnja 2026." : `${weekDays[0].toLocaleDateString("hr-HR")} – ${weekDays[4].toLocaleDateString("hr-HR")}`}</strong><button onClick={() => setWeekOffset((value) => value + 1)} aria-label="Sljedeći tjedan">›</button></div><div className="booking-day-grid">{weekDays.map((day) => { const key = dateKey(day); const count = slots.filter((slot) => dateKey(new Date(slot.startsAt)) === key).length; return <button className={selectedDay === key ? "selected" : ""} disabled={!count} onClick={() => selectDay(day)} key={key}><small>{day.toLocaleDateString("hr-HR", { weekday: "short" }).toUpperCase()}</small><strong>{day.getDate()}</strong><span>{count ? `${count} termina` : "popunjeno"}</span></button>; })}</div><div className="booking-times"><label>{selectedDate ? `Dostupni termini · ${selectedDate.toLocaleDateString("hr-HR", { weekday: "long", day: "numeric", month: "long" })}` : "Odaberi dan s dostupnim terminom"}</label><div>{daySlots.map((slot) => <button className={selectedSlotId === slot.id ? "selected" : ""} onClick={() => setSelectedSlotId(slot.id)} key={slot.id}>{time(slot.startsAt)}<small>60 min</small></button>)}</div></div>{error && <div className="auth-error">{error}</div>}<button className="button button-coral booking-next" onClick={nextToGoal}>Nastavi na cilj sata <ArrowRight size={17} /></button></div>}
      {step === 2 && <div className="booking-step-content"><button className="step-back" onClick={() => setStep(1)}><ArrowLeft size={15} /> Natrag</button><div className="step-kicker">KORAK 2 OD 3</div><h1>Što želiš postići na ovom satu?</h1><p>Ove informacije pomažu mentoru da pripremi sat baš za tebe.</p><div className="goal-options">{["Razumjeti gradivo", "Pripremiti ispit", "Riješiti zadatke", "Priprema za maturu"].map((item) => <button className={goal === item ? "selected" : ""} onClick={() => setGoal(item)} key={item}><span>{item === "Razumjeti gradivo" ? "💡" : item === "Pripremiti ispit" ? "📝" : item === "Riješiti zadatke" ? "✏️" : "🎓"}</span>{item}<CheckCircle2 size={18} /></button>)}</div><label className="form-label">Koja je tema?<input value={topic} onChange={(event) => setTopic(event.target.value)} /></label><label className="form-label">Što ti je trenutno najteže?<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} /></label><label className={`upload-box ${fileName ? "uploaded" : ""}`}><span>{fileName ? <Check /> : "＋"}</span><strong>{fileName || "Dodaj fotografiju zadatka ili materijal"}</strong><small>{fileName ? "Materijal je spreman uz rezervaciju" : "PDF, JPG ili PNG · do 10 MB"}</small><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => setFileName(event.target.files?.[0]?.name || "")} /></label>{error && <div className="auth-error">{error}</div>}<button className="button button-coral booking-next" onClick={nextToPayment}>Nastavi na plaćanje <ArrowRight size={17} /></button></div>}
      {step === 3 && <div className="booking-step-content"><button className="step-back" onClick={() => setStep(2)}><ArrowLeft size={15} /> Natrag</button><div className="step-kicker">KORAK 3 OD 3</div><h1>Sigurno plaćanje preko Stripea</h1><p>Podatke kartice unosiš isključivo na Stripeovoj sigurnoj stranici. Gaudeamus Mentor ih nikada ne vidi ni ne pohranjuje.</p><div className="payment-method"><div><CreditCard /><span><strong>Stripe Checkout</strong><small>Kartice i sigurni testni način plaćanja</small></span><i /></div></div><label className="terms-check"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /> Prihvaćam uvjete rezervacije i pravila otkazivanja.</label>{error && <div className="auth-error">{error}</div>}<button disabled={!accepted || processing} className="button button-coral booking-next" onClick={pay}>{processing ? <LoaderCircle className="spin" /> : <><LockKeyhole size={16} /> Nastavi na sigurno plaćanje · {price.toFixed(2).replace(".", ",")} €</>}</button><p className="secure-copy"><ShieldCheck size={15} /> Otvara se službeni Stripe Checkout u testnom načinu.</p></div>}
    </section><aside className="booking-order"><div className="order-tutor"><div className="avatar avatar-coral">{initials(tutor.user.name)}</div><span><small>Tvoj mentor</small><strong>{tutor.user.name} <BadgeCheck size={14} /></strong><em><Star size={12} fill="currentColor" /> {tutor.rating} · {tutor.lessonsCompleted.toLocaleString("hr-HR")} sati</em></span></div><div className="order-details"><div><span>Datum</span><strong>{selectedDate ? selectedDate.toLocaleDateString("hr-HR", { weekday: "short", day: "numeric", month: "long" }) : "Odaberi termin"}</strong></div><div><span>Vrijeme</span><strong>{selectedSlot ? `${time(selectedSlot.startsAt)} · 60 min` : "—"}</strong></div><div><span>Predmet</span><strong>{subjectName}</strong></div><div><span>Format</span><strong><Video size={14} /> Online učionica</strong></div>{step > 1 && <div><span>Cilj</span><strong>{goal}</strong></div>}</div><div className="order-price"><div><span>Individualni sat</span><strong>{price.toFixed(2).replace(".", ",")} €</strong></div><div><span>Naknada platforme</span><strong>Uključena</strong></div><div className="total"><span>Ukupno</span><strong>{price.toFixed(2).replace(".", ",")} €</strong></div></div><div className="order-includes"><strong>Uključeno u cijenu</strong><p><Check /> Snimka sata (30 dana)</p><p><Check /> AI sažetak i bilješke</p><p><Check /> Personalizirani zadaci i kviz</p><p><Check /> Sigurna komunikacija</p></div><div className="cancel-note"><ShieldCheck /><span><strong>Fleksibilno otkazivanje</strong><small>Besplatno do 24 sata prije termina.</small></span></div></aside></main>
  </div>;
}
