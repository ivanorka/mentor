"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AppShell } from "../../components/AppShell";
import {
  ArrowRight, BookOpenCheck, BrainCircuit, Check, CheckCircle2,
  Clock3, FileQuestion, GraduationCap, Layers3, Lightbulb, Paperclip,
  RotateCcw, Send, Sparkles, Star, Target, WandSparkles, XCircle,
} from "lucide-react";

type StudyMode = "mentor" | "objasnjenje" | "vjezba" | "test" | "kartice";
type Evidence = { timestamp: string; detail: string };
type Message = { from: "ai" | "user"; text: string; evidence?: Evidence };
type PracticeFeedback = { correct: boolean; message: string } | null;

const lessonHref = "/ucenik/lekcije/derivacije#snimka";

const modeOptions: { id: StudyMode; label: string; Icon: typeof BrainCircuit }[] = [
  { id: "mentor", label: "Mentor", Icon: BrainCircuit },
  { id: "objasnjenje", label: "Objasni", Icon: Lightbulb },
  { id: "vjezba", label: "Vježbaj", Icon: WandSparkles },
  { id: "test", label: "Test", Icon: FileQuestion },
  { id: "kartice", label: "Kartice", Icon: Layers3 },
];

const practiceTasks = [
  {
    question: "Koja je unutarnja funkcija u izrazu f(x) = sin(4x³)?",
    placeholder: "npr. u = ...",
    accepted: ["4x³", "4x^3", "u=4x³", "u=4x^3"],
    hint: "Pogledaj što se nalazi unutar sinusa. To je cijeli izraz koji zamjenjujemo slovom u.",
    solution: "u = 4x³",
    correct: "Točno — cijeli izraz 4x³ je unutarnja funkcija. Sada znaš što treba derivirati u drugom koraku.",
    timestamp: "04:22",
  },
  {
    question: "Ako je u = 5x², kolika je unutarnja derivacija u′?",
    placeholder: "upiši derivaciju",
    accepted: ["10x", "u'=10x", "u′=10x"],
    hint: "Primijeni pravilo (ax²)′ = 2ax.",
    solution: "u′ = 10x",
    correct: "Odlično. Faktor 10x je unutarnji trag koji se na kraju množi s vanjskom derivacijom.",
    timestamp: "18:47",
  },
  {
    question: "Dovrši derivaciju: f(x) = sin(3x²), pa je f′(x) = ?",
    placeholder: "upiši cijeli izraz",
    accepted: ["cos(3x²)6x", "6xcos(3x²)", "cos(3x^2)6x", "6xcos(3x^2)"],
    hint: "Derivacija sin(u) je cos(u), a derivacija u = 3x² je 6x. Spoji ta dva dijela množenjem.",
    solution: "f′(x) = cos(3x²) · 6x",
    correct: "Bravo — sačuvao si vanjsku funkciju i dodao unutarnju derivaciju. Upravo je taj faktor ranije znao nedostajati.",
    timestamp: "34:05",
  },
] as const;

const quizQuestions = [
  {
    question: "Što prvo radiš kod derivacije složene funkcije?",
    options: ["Množim sve članove", "Prepoznajem vanjsku i unutarnju funkciju", "Odmah deriviram zagradu", "Tražim nultočke"],
    correct: 1,
    explanation: "Najprije razdvajamo funkciju na vanjski i unutarnji sloj. Tek zatim primjenjujemo lančano pravilo.",
    timestamp: "04:22",
  },
  {
    question: "Koja je unutarnja funkcija u cos(2x + 1)?",
    options: ["cos", "2x", "2x + 1", "sin"],
    correct: 2,
    explanation: "Sve što se nalazi unutar kosinusa čini unutarnju funkciju: u = 2x + 1.",
    timestamp: "08:16",
  },
  {
    question: "Kolika je derivacija unutarnje funkcije u = 3x²?",
    options: ["3x", "6x", "6x²", "3"],
    correct: 1,
    explanation: "Po pravilu potencije (3x²)′ = 3 · 2x = 6x.",
    timestamp: "18:47",
  },
  {
    question: "Koji izraz ispravno derivira sin(3x²)?",
    options: ["cos(3x²)", "6x · sin(3x²)", "6x · cos(3x²)", "3x² · cos(x)"],
    correct: 2,
    explanation: "Vanjska derivacija je cos(3x²), a zatim množimo unutarnjom derivacijom 6x.",
    timestamp: "34:05",
  },
  {
    question: "Zašto je faktor 6x važan u prethodnom primjeru?",
    options: ["To je domena", "To je unutarnja derivacija", "To je konstanta integracije", "To je vanjska funkcija"],
    correct: 1,
    explanation: "Faktor 6x pokazuje koliko se brzo mijenja unutarnja funkcija i zato je obavezan dio lančanog pravila.",
    timestamp: "36:12",
  },
] as const;

const flashcards = [
  { front: "Lančano pravilo", back: "(f(g(x)))′ = f′(g(x)) · g′(x)", timestamp: "12:10" },
  { front: "Vanjska funkcija", back: "Funkcija koja se primjenjuje posljednja; u sin(3x²) to je sin(u).", timestamp: "04:22" },
  { front: "Unutarnja funkcija", back: "Izraz unutar vanjske funkcije; u sin(3x²) to je u = 3x².", timestamp: "04:22" },
  { front: "Unutarnji trag", back: "Derivacija unutarnje funkcije kojom množimo vanjsku derivaciju.", timestamp: "18:47" },
  { front: "Najčešća Lukina pogreška", back: "Ispravna vanjska derivacija, ali izostavljen faktor 6x.", timestamp: "34:05" },
] as const;

function normalizeAnswer(value: string) {
  return value.toLocaleLowerCase("hr-HR")
    .replace(/\s+/g, "")
    .replace(/[·*×]/g, "")
    .replace(/\^2/g, "²")
    .replace(/\^3/g, "³");
}

function Provenance({ timestamp, detail = "Snimka i transkript sata" }: Evidence) {
  return (
    <Link className="study-provenance" href={lessonHref}>
      <BookOpenCheck />
      <span><small>DOKAZ IZ UČENJA</small><strong>{detail}</strong><em>Ana Kovač · 18. srpnja · {timestamp}</em></span>
      <ArrowRight />
    </Link>
  );
}

export default function AiMentorPage() {
  const [mode, setMode] = useState<StudyMode>("mentor");
  const [messages, setMessages] = useState<Message[]>([
    {
      from: "ai",
      text: "Bok Luka! Povezala sam tvoj zadnji sat, riješene zadatke i cilj za maturu. Lančano pravilo razumiješ, ali kod sinusa i kosinusa ponekad preskočiš unutarnju derivaciju. Odaberi kako želiš nastaviti.",
      evidence: { timestamp: "34:05", detail: "Ponavljajuća pogreška sa zadnjeg sata" },
    },
  ]);
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState("");
  const attachmentInput = useRef<HTMLInputElement>(null);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceAnswer, setPracticeAnswer] = useState("");
  const [practiceFeedback, setPracticeFeedback] = useState<PracticeFeedback>(null);
  const [hintVisible, setHintVisible] = useState(false);
  const [solutionVisible, setSolutionVisible] = useState(false);
  const [practiceCompleted, setPracticeCompleted] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<(number | null)[]>(() => Array(quizQuestions.length).fill(null));
  const [quizComplete, setQuizComplete] = useState(false);
  const [flashIndex, setFlashIndex] = useState(0);
  const [flashRevealed, setFlashRevealed] = useState(false);
  const [flashRatings, setFlashRatings] = useState<Record<number, "known" | "repeat">>({});
  const [flashComplete, setFlashComplete] = useState(false);

  const practiceTask = practiceTasks[practiceIndex];
  const quizQuestion = quizQuestions[quizIndex];
  const selectedQuizAnswer = quizAnswers[quizIndex];
  const quizScore = useMemo(() => quizAnswers.reduce<number>((total, answer, index) => total + Number(answer === quizQuestions[index].correct), 0), [quizAnswers]);
  const knownFlashcards = Object.values(flashRatings).filter((value) => value === "known").length;

  function openMode(nextMode: StudyMode, userText?: string) {
    setMode(nextMode);
    if (!userText) return;
    const labels: Record<Exclude<StudyMode, "mentor">, string> = {
      objasnjenje: "Otvorila sam objašnjenje u tri kratka koraka i povezala ga s primjerom iz tvog sata.",
      vjezba: "Pripremila sam tri ciljana zadatka. Počinju prepoznavanjem unutarnje funkcije i završavaju cijelom derivacijom.",
      test: "Pripremila sam adaptivnu provjeru od pet pitanja iz točno one pogreške koja se ponavljala na satu.",
      kartice: "Pripremila sam pet kartica iz sažetka i transkripta. Označi što znaš, a što želiš ponoviti.",
    };
    if (nextMode !== "mentor") {
      setMessages((current) => [...current, { from: "user", text: userText }, { from: "ai", text: labels[nextMode], evidence: { timestamp: "34:05", detail: "Personalizirano prema zadnjem satu" } }]);
    }
  }

  function send(text?: string) {
    const value = (text || input).trim();
    if (!value) return;
    const lower = value.toLocaleLowerCase("hr-HR");
    setInput("");
    if (lower.includes("test") || lower.includes("kviz")) return openMode("test", value);
    if (lower.includes("kartic")) return openMode("kartice", value);
    if (lower.includes("zadat") || lower.includes("vjež")) return openMode("vjezba", value);
    if (lower.includes("jednostavn") || lower.includes("objas")) return openMode("objasnjenje", value);
    const response = lower.includes("zašto")
      ? "Zato što lančano pravilo prati dvije promjene odjednom: promjenu vanjske funkcije i promjenu izraza u njezinoj unutrašnjosti. Kod sin(3x²), kosinus opisuje vanjski sloj, a 6x unutarnji."
      : "Za tvoj trenutačni cilj najkorisnije je prvo označiti unutarnju funkciju slovom u, zatim derivirati vanjski sloj i tek na kraju dodati u′. To je isti postupak koji je Ana koristila na satu.";
    setMessages((current) => [...current, { from: "user", text: value }, { from: "ai", text: response, evidence: { timestamp: "18:47", detail: "Anino objašnjenje lančanog pravila" } }]);
    setMode("mentor");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    send();
  }

  function checkPractice(event: FormEvent) {
    event.preventDefault();
    if (!practiceAnswer.trim()) return;
    const correct = practiceTask.accepted.some((answer) => normalizeAnswer(answer) === normalizeAnswer(practiceAnswer));
    setPracticeFeedback({
      correct,
      message: correct ? practiceTask.correct : "Još ne. Razdvoji vanjski i unutarnji sloj, pa provjeri nedostaje li derivacija izraza u zagradi.",
    });
    if (correct) setPracticeCompleted((current) => Math.max(current, practiceIndex + 1));
  }

  function nextPractice() {
    if (practiceIndex === practiceTasks.length - 1) {
      setMode("test");
      return;
    }
    setPracticeIndex((current) => current + 1);
    setPracticeAnswer("");
    setPracticeFeedback(null);
    setHintVisible(false);
    setSolutionVisible(false);
  }

  function resetPractice() {
    setPracticeIndex(0);
    setPracticeAnswer("");
    setPracticeFeedback(null);
    setHintVisible(false);
    setSolutionVisible(false);
    setPracticeCompleted(0);
  }

  function chooseQuizAnswer(answerIndex: number) {
    if (selectedQuizAnswer !== null) return;
    setQuizAnswers((current) => current.map((answer, index) => index === quizIndex ? answerIndex : answer));
  }

  function nextQuizQuestion() {
    if (quizIndex === quizQuestions.length - 1) setQuizComplete(true);
    else setQuizIndex((current) => current + 1);
  }

  function resetQuiz() {
    setQuizIndex(0);
    setQuizAnswers(Array(quizQuestions.length).fill(null));
    setQuizComplete(false);
  }

  function rateFlashcard(rating: "known" | "repeat") {
    if (!flashRevealed) return;
    setFlashRatings((current) => ({ ...current, [flashIndex]: rating }));
    if (flashIndex === flashcards.length - 1) setFlashComplete(true);
    else {
      setFlashIndex((current) => current + 1);
      setFlashRevealed(false);
    }
  }

  function resetFlashcards() {
    setFlashIndex(0);
    setFlashRevealed(false);
    setFlashRatings({});
    setFlashComplete(false);
  }

  return (
    <AppShell role="student" active="/ucenik/ai-mentor" eyebrow="Osobni suputnik u učenju" title="AI Study Studio" action={<span className="ai-status"><i /> Pamćenje uključeno</span>}>
      <div className="ai-mentor-layout study-studio-layout">
        <aside className="ai-context-panel">
          <div className="context-student"><div className="mini-avatar">LP</div><span><strong>Luka Perić</strong><small>3. razred gimnazije</small></span></div>
          <div className="context-block"><label>TRENUTNI CILJ</label><div><Target /><span><strong>Državna matura A</strong><small>Cilj: 85% · 287 dana</small></span></div></div>
          <div className="context-block"><label>AI ZNA O TEBI</label><ul><li><CheckCircle2 /> Najbolje učiš kroz primjere</li><li><CheckCircle2 /> Preferiraš kraće sesije</li><li><CheckCircle2 /> Često preskačeš međukorake</li></ul></div>
          <div className="context-block"><label>AKTIVNE TEME</label><Link href="/ucenik/lekcije/derivacije"><span className="topic-dot coral" /> Derivacije <strong>67%</strong></Link><Link href="/ucenik/lekcije/derivacije"><span className="topic-dot blue" /> Funkcije <strong>84%</strong></Link><Link href="/ucenik/lekcije/derivacije"><span className="topic-dot gold" /> Geometrija <strong>72%</strong></Link></div>
          <div className="privacy-mini"><Sparkles /><span><strong>Tvoja memorija učenja</strong><small>AI pamti samo podatke koji pomažu tvojem učenju. Ti je uvijek možeš urediti.</small></span></div>
        </aside>

        <section className="ai-chat-panel study-studio-panel">
          <div className="ai-chat-head"><div className="ai-orb"><BrainCircuit /></div><div><strong>Gaudeamus AI Study Studio</strong><span><i /> Aktivna tema · lančano pravilo</span></div><span className="deterministic-badge"><Check /> Pouzdan demo</span></div>
          <nav className="study-mode-tabs" aria-label="Način učenja">
            {modeOptions.map(({ id, label, Icon }) => <button type="button" className={mode === id ? "active" : ""} aria-current={mode === id ? "page" : undefined} onClick={() => setMode(id)} key={id}><Icon /> {label}</button>)}
          </nav>

          <div className="study-stage">
            {mode === "mentor" && <div className="ai-messages study-messages">
              <div className="day-divider">DANAS · PERSONALIZIRANO PREMA 3 IZVORA</div>
              {messages.map((message, index) => <div className={`message ${message.from}`} key={`${message.text}-${index}`}>{message.from === "ai" && <span className="message-avatar"><Sparkles /></span>}<div><p>{message.text}</p>{message.evidence && <Provenance {...message.evidence} />}{message.from === "ai" && <small>AI Mentor · deterministički demo</small>}</div></div>)}
              <div className="mentor-choice-grid">
                <button onClick={() => openMode("objasnjenje", "Objasni mi to jednostavnije.")}><Lightbulb /><span><strong>Objasni jednostavnije</strong><small>Analogija i primjer iz sata</small></span><ArrowRight /></button>
                <button onClick={() => openMode("vjezba", "Daj mi ciljane zadatke.")}><WandSparkles /><span><strong>Ciljani zadaci</strong><small>Trag, odgovor i feedback</small></span><ArrowRight /></button>
                <button onClick={() => openMode("test", "Napravi mi test.")}><FileQuestion /><span><strong>Test od 5 pitanja</strong><small>Rezultat i preporuka</small></span><ArrowRight /></button>
                <button onClick={() => openMode("kartice", "Otvori flash kartice.")}><Layers3 /><span><strong>Flash kartice</strong><small>Znam ili ponovi</small></span><ArrowRight /></button>
              </div>
            </div>}

            {mode === "objasnjenje" && <div className="study-panel explanation-panel">
              <div className="study-panel-heading"><span className="study-panel-icon gold"><Lightbulb /></span><div><small>JEDNOSTAVNIJI MODEL</small><h2>Lančano pravilo je kao otvaranje dvije kutije.</h2><p>Najprije vidiš vanjsku kutiju, a zatim ono što je u njoj. Kod deriviranja moraš zabilježiti promjenu oba sloja.</p></div></div>
              <div className="explanation-steps">
                <article><span>01</span><small>VANJSKA KUTIJA</small><strong>sin(u)</strong><p>Derivacija vanjskog sloja je cos(u).</p></article>
                <ArrowRight />
                <article><span>02</span><small>UNUTARNJA KUTIJA</small><strong>u = 3x²</strong><p>Njezina derivacija je u′ = 6x.</p></article>
                <ArrowRight />
                <article className="result"><span>03</span><small>SPOJI PROMJENE</small><strong>cos(3x²) · 6x</strong><p>Vanjska derivacija puta unutarnji trag.</p></article>
              </div>
              <div className="memory-hook"><Sparkles /><span><small>ZAPAMTI OVU REČENICU</small><strong>“Izvana prema unutra — i na kraju pomnoži tragom iznutra.”</strong></span></div>
              <Provenance timestamp="18:47" detail="Anino objašnjenje i primjer s ploče" />
              <button className="study-primary-action" onClick={() => setMode("vjezba")}>Provjeri razumijevanje na zadatku <ArrowRight /></button>
            </div>}

            {mode === "vjezba" && <div className="study-panel practice-panel">
              <div className="study-progress-head"><span><small>CILJANA VJEŽBA</small><strong>Zadatak {practiceIndex + 1} od {practiceTasks.length}</strong></span><em>{practiceCompleted}/{practiceTasks.length} riješeno</em></div>
              <div className="study-progress-bar"><i style={{ width: `${((practiceIndex + 1) / practiceTasks.length) * 100}%` }} /></div>
              <article className="practice-card">
                <div className="practice-label"><WandSparkles /> PRILAGOĐENO TVOJOJ SLABOJ TOČKI</div>
                <h2>{practiceTask.question}</h2>
                <form onSubmit={checkPractice}>
                  <label>Odgovor<input value={practiceAnswer} onChange={(event) => { setPracticeAnswer(event.target.value); setPracticeFeedback(null); setSolutionVisible(false); }} placeholder={practiceTask.placeholder} aria-describedby="practice-feedback" /></label>
                  <button type="submit" disabled={!practiceAnswer.trim()}>Provjeri odgovor <ArrowRight /></button>
                </form>
                <div className="practice-support">
                  <button onClick={() => setHintVisible((current) => !current)} aria-expanded={hintVisible}><Lightbulb /> {hintVisible ? "Sakrij trag" : "Prikaži trag"}</button>
                  {practiceFeedback && !practiceFeedback.correct && <button onClick={() => setSolutionVisible(true)}><BookOpenCheck /> Prikaži rješenje</button>}
                </div>
                {hintVisible && <div className="practice-hint"><Lightbulb /><span><strong>Trag</strong>{practiceTask.hint}</span></div>}
                {solutionVisible && <div className="practice-solution"><BookOpenCheck /><span><strong>Rješenje korak po korak</strong>{practiceTask.solution}</span></div>}
                {practiceFeedback && <div id="practice-feedback" role="status" className={`practice-feedback ${practiceFeedback.correct ? "correct" : "retry"}`}>{practiceFeedback.correct ? <CheckCircle2 /> : <XCircle />}<span><strong>{practiceFeedback.correct ? "Točno" : "Pokušaj još jednom"}</strong>{practiceFeedback.message}</span></div>}
              </article>
              <Provenance timestamp={practiceTask.timestamp} detail="Zadatak izveden iz primjera na satu" />
              <div className="study-footer-actions"><button onClick={resetPractice}><RotateCcw /> Počni ispočetka</button>{(practiceFeedback?.correct || solutionVisible) && <button className="study-primary-action" onClick={nextPractice}>{practiceIndex === practiceTasks.length - 1 ? "Nastavi na test" : "Sljedeći zadatak"} <ArrowRight /></button>}</div>
            </div>}

            {mode === "test" && <div className="study-panel quiz-panel">
              {!quizComplete ? <>
                <div className="study-progress-head"><span><small>ADAPTIVNA PROVJERA</small><strong>Pitanje {quizIndex + 1} od {quizQuestions.length}</strong></span><em>{quizScore} točno</em></div>
                <div className="quiz-dots">{quizQuestions.map((_, index) => <i className={index < quizIndex ? (quizAnswers[index] === quizQuestions[index].correct ? "correct" : "wrong") : index === quizIndex ? "active" : ""} key={index} />)}</div>
                <article className="quiz-question-card">
                  <span><FileQuestion /> LANČANO PRAVILO</span>
                  <h2>{quizQuestion.question}</h2>
                  <div className="quiz-options">{quizQuestion.options.map((option, index) => <button className={selectedQuizAnswer === null ? "" : index === quizQuestion.correct ? "correct" : selectedQuizAnswer === index ? "wrong" : "muted"} aria-pressed={selectedQuizAnswer === index} disabled={selectedQuizAnswer !== null} onClick={() => chooseQuizAnswer(index)} key={option}><i>{String.fromCharCode(65 + index)}</i><span>{option}</span>{selectedQuizAnswer !== null && index === quizQuestion.correct && <Check />}{selectedQuizAnswer === index && index !== quizQuestion.correct && <XCircle />}</button>)}</div>
                  {selectedQuizAnswer !== null && <div role="status" className={`quiz-explanation ${selectedQuizAnswer === quizQuestion.correct ? "correct" : "retry"}`}><Sparkles /><span><strong>{selectedQuizAnswer === quizQuestion.correct ? "Točno." : "Još ne."}</strong>{quizQuestion.explanation}</span></div>}
                </article>
                {selectedQuizAnswer !== null && <><Provenance timestamp={quizQuestion.timestamp} detail="Objašnjenje potvrđeno snimkom sata" /><button className="study-primary-action quiz-next" onClick={nextQuizQuestion}>{quizIndex === quizQuestions.length - 1 ? "Prikaži rezultat" : "Sljedeće pitanje"} <ArrowRight /></button></>}
              </> : <div className="quiz-result" role="status">
                <span className="result-orb"><GraduationCap /></span><small>TEST ZAVRŠEN</small><h2>{quizScore}/5 točnih odgovora</h2><div className="result-score"><strong>{quizScore * 20}%</strong><i><b style={{ width: `${quizScore * 20}%` }} /></i></div>
                <p>{quizScore >= 4 ? "Lančano pravilo sada je potvrđeno kratkim testom. Sljedeći korak su složeniji primjeri s korijenom i kvadratom trigonometrijske funkcije." : "Prepoznavanje slojeva je dobro, ali unutarnju derivaciju treba još jednom uvježbati prije težih zadataka."}</p>
                <div className="result-evidence"><Star /><span><small>NOVI DOKAZ NAPRETKA</small><strong>Derivacije · {quizScore >= 4 ? "67% → 74%" : "potrebno ponavljanje"}</strong></span></div>
                <div className="study-footer-actions"><button onClick={resetQuiz}><RotateCcw /> Ponovi test</button><button className="study-primary-action" onClick={() => setMode(quizScore >= 4 ? "kartice" : "vjezba")}>{quizScore >= 4 ? "Učvrsti karticama" : "Vježbaj slabu točku"} <ArrowRight /></button></div>
              </div>}
            </div>}

            {mode === "kartice" && <div className="study-panel flash-panel">
              {!flashComplete ? <>
                <div className="study-progress-head"><span><small>PAMETNO PONAVLJANJE</small><strong>Kartica {flashIndex + 1} od {flashcards.length}</strong></span><em>{knownFlashcards} znam</em></div>
                <div className="flash-progress">{flashcards.map((_, index) => <i className={flashRatings[index] === "known" ? "known" : flashRatings[index] === "repeat" ? "repeat" : index === flashIndex ? "active" : ""} key={index} />)}</div>
                <button className={`flashcard ${flashRevealed ? "revealed" : ""}`} onClick={() => setFlashRevealed((current) => !current)} aria-label={flashRevealed ? "Prikaži pojam" : "Prikaži objašnjenje"}>
                  <span><Layers3 /> {flashRevealed ? "OBJAŠNJENJE" : "POJAM"}</span>
                  <strong>{flashRevealed ? flashcards[flashIndex].back : flashcards[flashIndex].front}</strong>
                  <small>{flashRevealed ? "Procijeni koliko sigurno znaš" : "Klikni za objašnjenje"}</small>
                </button>
                <Provenance timestamp={flashcards[flashIndex].timestamp} detail="Kartica generirana iz paketa znanja" />
                <div className="flash-actions"><button disabled={!flashRevealed} onClick={() => rateFlashcard("repeat")}><RotateCcw /> Ponovi</button><button disabled={!flashRevealed} onClick={() => rateFlashcard("known")}><CheckCircle2 /> Znam</button></div>
              </> : <div className="quiz-result flash-result" role="status">
                <span className="result-orb"><Layers3 /></span><small>PONAVLJANJE ZAVRŠENO</small><h2>{knownFlashcards} od {flashcards.length} kartica znaš</h2><p>{knownFlashcards === flashcards.length ? "Odlično — svi ključni pojmovi spremni su za dugoročno ponavljanje." : `${flashcards.length - knownFlashcards} kartice vraćene su u sljedeći krug kako bi se znanje učvrstilo.`}</p>
                <div className="study-footer-actions"><button onClick={resetFlashcards}><RotateCcw /> Ponovi kartice</button><Link className="study-primary-action" href="/ucenik/lekcije/derivacije">Otvori cijeli paket <ArrowRight /></Link></div>
              </div>}
            </div>}
          </div>

          <form className="ai-input study-input" onSubmit={submit}><button type="button" aria-label="Dodaj privitak" onClick={() => attachmentInput.current?.click()}><Paperclip /></button><input ref={attachmentInput} type="file" accept=".pdf,.png,.jpg,.jpeg" hidden onChange={(event) => setAttachment(event.target.files?.[0]?.name ?? "")} /><textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder={attachment ? `${attachment} · postavi pitanje o materijalu...` : "Pitaj ili napiši: objasni, zadatak, test, kartice..."} rows={1} /><button type="submit" aria-label="Pošalji poruku"><Send /></button><small>{attachment ? `Privitak spreman: ${attachment}` : "Odgovori u ovom prototipu su deterministički i povezani s demo paketom znanja."}</small></form>
        </section>

        <aside className="ai-session-panel">
          <div className="session-head"><span><small>DANAŠNJI FOKUS</small><strong>14 min</strong></span><i><b style={{ width: "72%" }} /></i></div>
          <Link className="study-source-card" href={lessonHref}><BookOpenCheck /><small>AKTIVNI IZVOR</small><strong>Derivacije složenih funkcija</strong><span><Clock3 /> Sat s Anom · 42:18</span><em>3 povezana uvida <ArrowRight /></em></Link>
          <div className="mini-quiz"><span><FileQuestion /></span><label>PRIPREMLJENO ZA TEBE</label><h3>Brza provjera: lančano pravilo</h3><p>5 pitanja · prilagođeno tvojoj pogrešci sa zadnjeg sata</p><button onClick={() => setMode("test")}>Pokreni test <ArrowRight /></button></div>
          <div className="session-insight"><label>ZAŠTO OVA PREPORUKA?</label><p><Sparkles /> U 34:05 sata izostavio si unutarnju derivaciju, a ista se pogreška pojavila u 2 od zadnja 3 zadatka.</p></div>
        </aside>
      </div>
    </AppShell>
  );
}
