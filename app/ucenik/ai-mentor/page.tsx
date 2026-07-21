"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { AppShell } from "../../components/AppShell";
import { ArrowRight, BrainCircuit, CheckCircle2, FileQuestion, Lightbulb, Paperclip, Send, Sparkles, Target, WandSparkles } from "lucide-react";

type Message = { from: "ai" | "user"; text: string };

export default function AiMentorPage() {
  const [messages, setMessages] = useState<Message[]>([
    { from: "ai", text: "Bok Luka! Analizirala sam tvoj zadnji sat s Anom. Lančano pravilo razumiješ dobro, ali kod sinusa i kosinusa ponekad preskočiš unutarnju derivaciju. Želiš kratko objašnjenje ili da odmah krenemo na zadatak?" },
  ]);
  const [input, setInput] = useState("");
  const reply = "Odlično pitanje. Kod f(x) = sin(3x²) prvo prepoznaj vanjsku funkciju sin(u), a zatim unutarnju u = 3x². Zato je f′(x) = cos(3x²) · 6x. Faktor 6x je unutarnja derivacija koju si ranije znao preskočiti. Želiš li sada sličan zadatak bez rješenja?";
  function send(text?: string) {
    const value = (text || input).trim();
    if (!value) return;
    setMessages((current) => [...current, { from: "user", text: value }, { from: "ai", text: reply }]);
    setInput("");
  }
  function submit(event: FormEvent) { event.preventDefault(); send(); }
  return (
    <AppShell role="student" active="/ucenik/ai-mentor" eyebrow="Osobni suputnik u učenju" title="AI Mentor" action={<span className="ai-status"><i /> Pamćenje uključeno</span>}>
      <div className="ai-mentor-layout">
        <aside className="ai-context-panel">
          <div className="context-student"><div className="mini-avatar">LP</div><span><strong>Luka Perić</strong><small>3. razred gimnazije</small></span></div>
          <div className="context-block"><label>TRENUTNI CILJ</label><div><Target /><span><strong>Državna matura A</strong><small>Cilj: 85% · 287 dana</small></span></div></div>
          <div className="context-block"><label>AI ZNA O TEBI</label><ul><li><CheckCircle2 /> Najbolje učiš kroz primjere</li><li><CheckCircle2 /> Preferiraš kraće sesije</li><li><CheckCircle2 /> Često preskačeš međukorake</li></ul></div>
          <div className="context-block"><label>AKTIVNE TEME</label><Link href="/ucenik/lekcije/derivacije"><span className="topic-dot coral" /> Derivacije <strong>67%</strong></Link><Link href="/ucenik/lekcije/derivacije"><span className="topic-dot blue" /> Funkcije <strong>84%</strong></Link><Link href="/ucenik/lekcije/derivacije"><span className="topic-dot gold" /> Geometrija <strong>72%</strong></Link></div>
          <div className="privacy-mini"><Sparkles /><span><strong>Tvoja memorija učenja</strong><small>AI pamti samo podatke koji pomažu tvojem učenju. Ti je uvijek možeš urediti.</small></span></div>
        </aside>
        <section className="ai-chat-panel">
          <div className="ai-chat-head"><div className="ai-orb"><BrainCircuit /></div><div><strong>Gaudeamus AI Mentor</strong><span><i /> Online · poznaje tvoj napredak</span></div><button>•••</button></div>
          <div className="ai-messages">
            <div className="day-divider">DANAS</div>
            {messages.map((message, index) => <div className={`message ${message.from}`} key={`${message.text}-${index}`}>{message.from === "ai" && <span className="message-avatar"><Sparkles /></span>}<div><p>{message.text}</p>{message.from === "ai" && <small>AI Mentor · upravo sada</small>}</div></div>)}
          </div>
          <div className="quick-prompts"><button onClick={() => send("Objasni mi to jednostavnije.")}><Lightbulb /> Objasni jednostavnije</button><button onClick={() => send("Daj mi sličan zadatak.")}><WandSparkles /> Daj mi zadatak</button><button onClick={() => send("Napravi mi kratki test.")}><FileQuestion /> Napravi test</button></div>
          <form className="ai-input" onSubmit={submit}><button type="button" aria-label="Dodaj privitak"><Paperclip /></button><textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Pitaj bilo što o onome što učiš..." rows={1} /><button type="submit" aria-label="Pošalji poruku"><Send /></button><small>AI može pogriješiti. Provjeri važne informacije sa svojim profesorom.</small></form>
        </section>
        <aside className="ai-session-panel">
          <div className="session-head"><span><small>DANAŠNJI FOKUS</small><strong>14 min</strong></span><i><b style={{ width: "72%" }} /></i></div>
          <div className="mini-quiz"><span><FileQuestion /></span><label>PRIPREMLJENO ZA TEBE</label><h3>Brza provjera: lančano pravilo</h3><p>5 pitanja · prilagođeno tvojim greškama sa zadnjeg sata</p><button onClick={() => send("Pokreni test iz lančanog pravila.")}>Pokreni test <ArrowRight /></button></div>
          <div className="session-insight"><label>NOVI UVID</label><p><Sparkles /> Danas si prvi put točno riješio tri zadatka zaredom bez pomoći.</p></div>
        </aside>
      </div>
    </AppShell>
  );
}
