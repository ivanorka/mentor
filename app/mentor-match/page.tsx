"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { Brand } from "../components/Brand";

const questions = [
  { key: "subject", title: "Koji predmet želiš svladati?", note: "Odaberi područje u kojem ti treba najviše podrške.", options: [["matematika", "Matematika", "Brojevi, algebra, analiza"], ["fizika", "Fizika", "Mehanika, struja, valovi"], ["engleski-jezik", "Engleski", "Gramatika, razgovor, matura"], ["kemija", "Kemija", "Reakcije, organska, zadaci"], ["informatika", "Informatika", "Programiranje i algoritmi"]] },
  { key: "level", title: "Na kojoj si razini?", note: "Tako filtriramo mentore s pravim iskustvom.", options: [["Osnovna škola", "Osnovna škola", "5. – 8. razred"], ["Srednja škola", "Srednja škola", "Gimnazija ili strukovna"], ["Matura", "Državna matura", "A ili B razina"], ["Fakultet", "Fakultet", "Kolegiji i ispiti"]] },
  { key: "goal", title: "Što ti je sada najvažnije?", note: "Cilj utječe na stil i tempo preporučenog mentora.", options: [["razumijevanje", "Razumjeti gradivo", "Od temelja, bez preskakanja"], ["ispit", "Pripremiti ispit", "Fokus na tipične zadatke"], ["ocjena", "Popraviti ocjenu", "Plan za brzi, održivi napredak"], ["izvrsnost", "Doseći izvrsnost", "Napredne teme i izazovi"]] },
  { key: "style", title: "Kako najlakše učiš?", note: "AI podudaranje koristi tvoju preferenciju objašnjavanja.", options: [["koraci", "Korak po korak", "Jasna struktura i primjeri"], ["vizualno", "Vizualno", "Dijagrami, boje i modeli"], ["praksa", "Kroz zadatke", "Odmah primjena i feedback"], ["razgovor", "Kroz razgovor", "Pitanja i zajedničko otkrivanje"]] },
  { key: "budget", title: "Koliki ti je budžet po satu?", note: "Prikazat ćemo mentore unutar odabranog raspona.", options: [["16", "Do 16 €", "Najpovoljnije opcije"], ["20", "Do 20 €", "Najviše dostupnih mentora"], ["25", "Do 25 €", "Iskusni i Elite mentori"], ["35", "Fleksibilno", "Kvaliteta je prvi kriterij"]] },
] as const;

export default function MentorMatchPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const question = questions[step];
  const choose = (value: string) => setAnswers((current) => ({ ...current, [question.key]: value }));
  const next = () => {
    if (step < questions.length - 1) setStep(step + 1);
    else {
      const params = new URLSearchParams({ subject: answers.subject, level: answers.level, maxPrice: answers.budget, match: "1", goal: answers.goal, style: answers.style });
      router.push(`/pronadi-profesora?${params.toString()}`);
    }
  };
  return <main className="match-page"><header><Link href="/"><Brand inverse /></Link><Link href="/pronadi-profesora"><ArrowLeft /> Preskoči upitnik</Link></header><section className="match-shell"><div className="match-progress"><span>{step + 1} / {questions.length}</span><i><b style={{ width: `${((step + 1) / questions.length) * 100}%` }} /></i><small>MENTOR MATCH</small></div><div className="match-title"><span><Sparkles /></span><div><h1>{question.title}</h1><p>{question.note}</p></div></div><div className="match-options">{question.options.map(([value, label, note]) => <button className={answers[question.key] === value ? "selected" : ""} onClick={() => choose(value)} key={value}><span><strong>{label}</strong><small>{note}</small></span>{answers[question.key] === value && <Check />}</button>)}</div><div className="match-actions">{step > 0 && <button onClick={() => setStep(step - 1)}><ArrowLeft /> Natrag</button>}<button disabled={!answers[question.key]} onClick={next}>{step === questions.length - 1 ? "Prikaži moje mentore" : "Nastavi"} <ArrowRight /></button></div></section><footer><Sparkles /> Odgovori se koriste samo za trenutačno podudaranje.</footer></main>;
}
