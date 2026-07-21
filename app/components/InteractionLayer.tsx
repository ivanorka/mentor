"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Download, Play, SlidersHorizontal, Sparkles, X } from "lucide-react";

type Modal = { title: string; body: string; href?: string; action?: string };
const handledAreas = ".login-page,.standalone-auth,.search-page,.match-page,.booking-page,.inbox-layout,.settings-page,.ai-mentor-layout,.session-controls,.subjects-toolbar,.classroom-page";

export function InteractionLayer() {
  const router = useRouter();
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<Modal | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const notify = (message: string) => { setToast(message); if (toastTimer.current) clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(""), 3200); };
    const download = (title: string) => {
      const rows = [["Gaudeamus Mentor", title], ["Generirano", new Date().toLocaleString("hr-HR")], ["Status", "Investitorski prototip"], ["Napomena", "Podaci su demo prikaz"]];
      const content = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
      const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = `gaudeamus-${title.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}.csv`; link.click(); URL.revokeObjectURL(url); notify("Izvoz je uspješno pripremljen.");
    };
    const click = (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest("button");
      if (!button || button.disabled) return;
      if (button.classList.contains("mobile-menu")) { const header = button.closest(".marketing-header"); header?.classList.toggle("menu-open"); button.setAttribute("aria-expanded", String(header?.classList.contains("menu-open"))); return; }
      if (button.closest(handledAreas) || button.classList.contains("favorite") || button.type === "submit") return;
      const label = (button.textContent || button.getAttribute("aria-label") || "Akcija").replace(/\s+/g, " ").trim();
      const lower = label.toLowerCase();
      if (lower.includes("preuzmi pdf")) { window.print(); notify("Otvoren je pregled za spremanje u PDF."); return; }
      if (lower.includes("preuzmi") || lower.includes("izvezi")) { download(label); return; }
      if (lower.includes("prikaži trag") || lower.includes("sakrij trag")) {
        const article = button.closest("article"); const existing = article?.querySelector(".task-hint");
        if (existing) { existing.remove(); button.textContent = "Prikaži trag"; } else { const hint = document.createElement("p"); hint.className = "task-hint"; hint.textContent = "Trag: prvo označi unutarnju funkciju s u, deriviraj vanjsku funkciju i na kraju pomnoži s u′."; article?.appendChild(hint); button.textContent = "Sakrij trag"; }
        return;
      }
      if (button.closest(".chapters")) { button.parentElement?.querySelectorAll("button").forEach((item) => item.classList.remove("active")); button.classList.add("active"); notify(`Snimka je pomaknuta na ${label}.`); return; }
      if (lower.includes("pokreni video") || button.closest(".intro-play,.recording-screen") || button.classList.contains("profile-video")) { const profileHref = window.location.pathname.startsWith("/profesori/") ? window.location.pathname : "/profesori/ana-kovac"; setModal({ title: "Video predstavljanje", body: "Ovdje se otvara kratki video mentora s titlovima, pristupačnim transkriptom i ključnim informacijama o načinu rada.", href: profileHref, action: "Otvori profil" }); return; }
      if (button.closest(".incident-row")) { const incident = button.closest(".incident-row")?.textContent?.trim() || "Incident"; setModal({ title: "Trust & safety pregled", body: `${incident}. Evidencija uključuje anonimizirani dokaz, vremensku liniju i preporučenu mjeru.`, href: "/admin/sigurnost", action: "Otvori centar" }); return; }
      if (button.closest(".calendar-head,.month-nav")) { notify("Kalendar je pomaknut na susjedni period."); return; }
      const routes: [string, string][] = [["pošalji poruku", "/ucenik/poruke"], ["otvori pripremu", "/profesor/lekcije"], ["pregledaj", "/profesor/ucenici"], ["dodaj dostupnost", "/profesor/kalendar?edit=dostupnost"], ["uredi raspored", "/profesor/kalendar?edit=raspored"], ["uredi račun", "/postavke?tab=privatnost"], ["pripremi sat", "/ucenik/sat/matematika-derivacije"]];
      const route = routes.find(([key]) => lower.includes(key)); if (route) { router.push(route[1]); return; }
      if (lower.includes("filter")) { setModal({ title: "Napredni filteri", body: "Filtriranje je spremno za status, datum, predmet, rizik i vlasnika zapisa. Odabrani filtri ostaju spremljeni tijekom ove sesije.", action: "Primijeni demo filtre" }); return; }
      if (lower.includes("kampanju")) { setModal({ title: "Kampanja za mentore", body: "Segment: profesori kemije u Hrvatskoj. Kanali: alumni mreža, fakulteti i preporuke postojećih mentora. Procijenjeni cilj je 18 verificiranih prijava.", href: "/za-profesore", action: "Pregledaj kampanju" }); return; }
      if (lower.includes("poticaj")) { notify("Personalizirani poticaj poslan je učeniku Filipu."); return; }
      if (label === "•••" || label === "⋮" || lower === "akcija") { setModal({ title: "Brze akcije", body: "Dostupni su pregled detalja, bilješka, dodjela članu tima i izvoz zapisa. Sve akcije ulaze u revizijski trag.", action: "Zatvori" }); return; }
      if (button.closest(".generic-workspace,.live-lessons")) { setModal({ title: label || "Detalji zapisa", body: "Otvoren je detaljni prikaz s vremenskom linijom, povezanim korisnicima, bilješkama i sljedećim preporučenim korakom.", action: "Zatvori" }); return; }
      notify(`${label}: akcija je izvršena u prototipu.`);
    };
    document.addEventListener("click", click);
    return () => { document.removeEventListener("click", click); if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, [router]);

  return <>{toast && <button className="global-toast" onClick={() => setToast("")}><Check /> {toast}<X /></button>}{modal && <div className="global-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}><div className="global-modal"><button className="global-modal-close" onClick={() => setModal(null)} aria-label="Zatvori"><X /></button><span className="global-modal-icon">{modal.title.includes("Video") ? <Play /> : modal.title.includes("filter") ? <SlidersHorizontal /> : <Sparkles />}</span><h2>{modal.title}</h2><p>{modal.body}</p>{modal.href ? <Link className="button button-coral" href={modal.href} onClick={() => setModal(null)}>{modal.action || "Nastavi"} <ArrowRight /></Link> : <button className="button button-coral" onClick={() => setModal(null)}>{modal.action || "U redu"}</button>}{modal.title.includes("filter") && <small><Download /> Demo filtri ne mijenjaju produkcijske podatke.</small>}</div></div>}</>;
}
