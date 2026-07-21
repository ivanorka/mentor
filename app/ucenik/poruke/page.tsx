"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "../../components/AppShell";
import { AlertTriangle, LoaderCircle, MoreHorizontal, Paperclip, Search, Send, ShieldCheck, UserRound } from "lucide-react";
import { apiFetch } from "../../lib/api";

type Conversation = { id: string; bookingId: string; participant: { id: string; name: string; role: string }; lastMessage: string; updatedAt: string };
type Message = { id: string; senderId: string; body: string; moderation: string; createdAt: string };
type Session = { user: { id: string } };

const initials = (name: string) => name.split(" ").map((part) => part[0]).join("").slice(0, 2);
const messageTime = (value: string) => new Intl.DateTimeFormat("hr-HR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));

export default function StudentMessages() {
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [userId, setUserId] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [moderation, setModeration] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [attachment, setAttachment] = useState("");

  useEffect(() => {
    Promise.all([apiFetch<Session>("/auth/session"), apiFetch<Conversation[]>("/conversations")])
      .then(([sessionResult, conversationResult]) => { setUserId(sessionResult.data.user.id); setConversations(conversationResult.data); setActiveId(conversationResult.data[0]?.id || ""); })
      .catch(() => setError("Prijavi se kako bi pristupio sigurnim razgovorima."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeId) return;
    apiFetch<Message[]>(`/conversations/${activeId}/messages`).then(({ data }) => setMessages(data)).catch((caught) => setError(caught instanceof Error ? caught.message : "Poruke se ne mogu učitati.")).finally(() => setLoading(false));
  }, [activeId]);

  const openConversation = (id: string) => { setLoading(true); setError(""); setMessages([]); setActiveId(id); };

  const active = conversations.find((item) => item.id === activeId);
  const filtered = useMemo(() => conversations.filter((item) => `${item.participant.name} ${item.lastMessage}`.toLowerCase().includes(query.toLowerCase())), [conversations, query]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); const body = `${text.trim()}${attachment ? ` [Privitak: ${attachment}]` : ""}`.trim();
    if (!body || !activeId) return; setSending(true); setModeration("");
    try {
      const { data } = await apiFetch<{ message: Message; trustEvent?: unknown }>(`/conversations/${activeId}/messages`, { method: "POST", body: JSON.stringify({ body }) });
      setMessages((current) => [...current, data.message]); setText(""); setAttachment("");
      if (data.message.moderation !== "clean") setModeration("Kontaktni podatak je automatski uklonjen. Razgovor ostaje na platformi radi sigurnosti i podrške.");
      setConversations((current) => current.map((item) => item.id === activeId ? { ...item, lastMessage: data.message.body, updatedAt: data.message.createdAt } : item));
    } catch (caught) { setModeration(caught instanceof Error ? caught.message : "Poruka nije poslana."); }
    finally { setSending(false); }
  };

  return <AppShell role="student" active="/ucenik/poruke" eyebrow="Sigurna komunikacija" title="Poruke"><div className="inbox-layout"><aside><div className="inbox-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pretraži razgovore" /></div>{filtered.map((conversation) => <button className={conversation.id === activeId ? "active" : ""} onClick={() => openConversation(conversation.id)} key={conversation.id}><span className="mini-avatar">{initials(conversation.participant.name)}</span><span><strong>{conversation.participant.name}</strong><small>{conversation.lastMessage}</small></span><em>{messageTime(conversation.updatedAt)}</em></button>)}{!loading && !filtered.length && <div className="empty-inbox"><Search /><strong>Nema razgovora</strong><small>{query ? "Pokušaj drugi pojam." : "Razgovor nastaje nakon rezervacije."}</small></div>}</aside><section className="conversation">{active ? <><header><span className="mini-avatar">{initials(active.participant.name)}</span><span><strong>{active.participant.name}</strong><small><i /> Siguran kanal</small></span><button onClick={() => setMenuOpen(!menuOpen)} aria-label="Opcije razgovora"><MoreHorizontal /></button>{menuOpen && <div className="conversation-menu"><Link href={`/profesori/${active.participant.name === "Ana Kovač" ? "ana-kovac" : "marko-horvat"}`}><UserRound /> Pogledaj profil</Link><button onClick={() => { setMenuOpen(false); setModeration("Razgovor je označen kao pročitan."); }}><ShieldCheck /> Označi pročitanim</button></div>}</header><div className="conversation-messages"><div className="security-notice"><ShieldCheck /> Kontaktni podaci zaštićeni su radi sigurnosti učenika i mentora.</div>{loading ? <LoaderCircle className="spin conversation-loader" /> : messages.map((message) => <div className={`bubble ${message.senderId === userId ? "mine" : "theirs"}`} key={message.id}><p>{message.body}</p><small>{messageTime(message.createdAt)}{message.moderation !== "clean" ? " · moderirano" : ""}</small></div>)}{moderation && <div className="moderation-notice"><AlertTriangle /> {moderation}</div>}</div><form onSubmit={submit}><label className={attachment ? "attachment-ready" : ""} aria-label="Dodaj privitak"><Paperclip /><input type="file" onChange={(event) => setAttachment(event.target.files?.[0]?.name || "")} /></label><input value={text} onChange={(event) => setText(event.target.value)} placeholder={attachment ? `${attachment} · dodaj poruku` : "Napiši sigurnu poruku..."} /><button type="submit" disabled={sending} aria-label="Pošalji poruku">{sending ? <LoaderCircle className="spin" /> : <Send />}</button></form></> : <div className="conversation-empty"><ShieldCheck /><h2>{error ? "Prijava je potrebna" : "Odaberi razgovor"}</h2><p>{error || "Sve poruke i materijali čuvaju se na jednom sigurnom mjestu."}</p>{error && <Link className="button button-coral" href="/prijava?returnTo=/ucenik/poruke">Prijavi se</Link>}</div>}</section></div></AppShell>;
}
