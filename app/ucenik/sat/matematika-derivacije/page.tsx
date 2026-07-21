"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Brand } from "../../../components/Brand";
import { BrainCircuit, Check, ChevronRight, FileText, Hand, Maximize, MessageCircle, Mic, MicOff, MoreHorizontal, PhoneOff, ScreenShare, Sparkles, Video, VideoOff } from "lucide-react";

export default function ClassroomPage() {
  const [mic, setMic] = useState(true);
  const [camera, setCamera] = useState(true);
  const [tab, setTab] = useState("ploča");
  const [ended, setEnded] = useState(false);
  const [screenShare, setScreenShare] = useState(false);
  const [hand, setHand] = useState(false);
  const [boardPage, setBoardPage] = useState(3);
  const [tool, setTool] = useState("✎");
  const [chat, setChat] = useState("");
  const [chatMessages, setChatMessages] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [material, setMaterial] = useState("");
  const sendChat = (event: FormEvent) => { event.preventDefault(); if (chat.trim()) { setChatMessages((current) => [...current, chat.trim()]); setChat(""); } };
  if (ended) return <div className="classroom-ended"><div className="ended-card"><span><Sparkles /></span><h1>Sat je uspješno završen</h1><p>AI upravo pretvara snimku u sažetak, zadatke i kviz. Tvoj paket znanja bit će spreman za oko 3 minute.</p><div className="processing-steps"><span className="done"><Check /> Snimka spremljena</span><span className="active"><i /> Analiza ključnih pojmova</span><span><i /> Generiranje zadataka</span></div><Link className="button button-coral" href="/ucenik/lekcije/derivacije">Otvori paket znanja <ChevronRight /></Link><Link href="/ucenik">Povratak na pregled</Link></div></div>;
  return (
    <div className="classroom-page">
      <header className="classroom-header"><Brand inverse compact /><div><strong>Derivacije složenih funkcija</strong><span><i /> Sat se snima · 42:18</span></div><div><span>AK</span><button onClick={() => document.documentElement.requestFullscreen?.()} aria-label="Cijeli zaslon"><Maximize /></button></div></header>
      <main className="classroom-layout">
        <section className="classroom-stage">
          <div className="teacher-video"><div className="classroom-avatar large">AK</div><span className="video-label">Ana Kovač <i /></span><div className="speaking-bars"><i /><i /><i /><i /></div></div>
          <div className="student-video"><div className="classroom-avatar small">LP</div><span className="video-label">Ti</span>{!camera && <div className="camera-off-overlay"><VideoOff /></div>}</div>
          <div className="live-caption">“...i zato nakon kosinusa obavezno množimo s derivacijom unutarnje funkcije, što je u ovom slučaju šest x.”</div>
        </section>
        <aside className="classroom-workspace">
          <nav><button className={tab === "ploča" ? "active" : ""} onClick={() => setTab("ploča")}>Ploča</button><button className={tab === "materijali" ? "active" : ""} onClick={() => setTab("materijali")}>Materijali <span>2</span></button><button className={tab === "chat" ? "active" : ""} onClick={() => setTab("chat")}>Chat</button></nav>
          {tab === "ploča" && <div className="whiteboard"><div className="board-tools">{["↖","✎","T","□","↶"].map((item) => <button className={tool === item ? "active" : ""} onClick={() => { setTool(item); setNotice(`Alat ${item} je aktivan.`); }} key={item}>{item}</button>)}<span /><button onClick={() => setNotice("Otvorene su dodatne opcije bijele ploče.")}>⋮</button></div><div className="board-content"><small>PRIMJER {boardPage} · LANČANO PRAVILO</small><h2>{boardPage === 3 ? "f(x) = sin(3x²)" : boardPage < 3 ? "Prepoznaj vanjsku funkciju" : "Pokušaj samostalno"}</h2><div className="formula-work"><p>1. Vanjska funkcija: <strong>sin(u)</strong></p><p>2. Unutarnja funkcija: <strong>u = 3x²</strong></p><p className="result">f′(x) = cos(3x²) · 6x</p></div><div className="board-callout">Ne zaboravi unutarnju derivaciju <strong>6x</strong><span>←</span></div><div className="student-cursor">Luka</div></div><div className="board-pages"><button disabled={boardPage === 1} onClick={() => setBoardPage((value) => Math.max(1, value - 1))}>‹</button><span>{boardPage} / 5</span><button disabled={boardPage === 5} onClick={() => setBoardPage((value) => Math.min(5, value + 1))}>›</button></div></div>}
          {tab === "materijali" && <div className="workspace-materials"><h3>Materijali za današnji sat</h3><article><FileText /><span><strong>Zbirka zadataka — derivacije</strong><small>PDF · 2,4 MB</small></span><button onClick={() => setMaterial("Zbirka zadataka — derivacije")}>Otvori</button></article><article><FileText /><span><strong>Lukin domaći rad</strong><small>JPG · dodano prije sata</small></span><button onClick={() => setMaterial("Lukin domaći rad")}>Otvori</button></article></div>}
          {tab === "chat" && <div className="workspace-chat"><div><span className="mini-avatar">AK</span><p><strong>Ana</strong>Poslala sam ti zbirku. Pogledaj zadatak 18.</p></div><div className="mine"><p><strong>Ti</strong>Vidim, hvala!</p></div>{chatMessages.map((message, index) => <div className="mine" key={`${message}-${index}`}><p><strong>Ti</strong>{message}</p></div>)}<form onSubmit={sendChat}><input value={chat} onChange={(event) => setChat(event.target.value)} placeholder="Napiši poruku..." /><button type="submit">Pošalji</button></form></div>}
        </aside>
      </main>
      <div className="ai-live-insight"><span className="ai-icon"><BrainCircuit /></span><div><small>AI PRATI RAZUMIJEVANJE</small><strong>Prepoznata slaba točka: unutarnja derivacija</strong></div><button onClick={() => setNotice("Uvid je spremljen u tvoj AI paket znanja.")}>Spremi za poslije <ChevronRight /></button></div>
      <footer className="classroom-controls"><div className="control-group"><button className={!mic ? "off" : ""} onClick={() => setMic(!mic)}>{mic ? <Mic /> : <MicOff />}<span>Mikrofon</span></button><button className={!camera ? "off" : ""} onClick={() => setCamera(!camera)}>{camera ? <Video /> : <VideoOff />}<span>Kamera</span></button><button className={screenShare ? "active" : ""} onClick={() => { setScreenShare(!screenShare); setNotice(screenShare ? "Dijeljenje zaslona je zaustavljeno." : "Dijeljenje zaslona je pokrenuto u demo načinu."); }}><ScreenShare /><span>{screenShare ? "Dijeliš" : "Podijeli"}</span></button><button className={hand ? "active" : ""} onClick={() => { setHand(!hand); setNotice(hand ? "Ruka je spuštena." : "Ana vidi da si podigao ruku."); }}><Hand /><span>Ruka</span></button><button onClick={() => setTab("chat")}><MessageCircle /><span>Chat</span></button><button onClick={() => setNotice("Dostupno: titlovi, kvaliteta veze i prijava problema.")}><MoreHorizontal /><span>Više</span></button></div><button className="end-call" onClick={() => setEnded(true)}><PhoneOff /> Završi sat</button></footer>
      {notice && <button className="classroom-toast" onClick={() => setNotice("")}>{notice} <span>×</span></button>}
      {material && <div className="classroom-modal" role="dialog" aria-modal="true"><div><FileText /><h2>{material}</h2><p>Pregled materijala otvoren je unutar učionice. U produkciji se datoteka prikazuje u sigurnom vieweru bez napuštanja sata.</p><button className="button button-coral" onClick={() => setMaterial("")}>Zatvori pregled</button></div></div>}
    </div>
  );
}
