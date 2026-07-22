import { query } from "./db.mjs";

const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" })[char]);

export async function notify({ to, subject, preheader, title, body, ctaLabel, ctaUrl, kind }) {
  if (!to) return { delivered: false, reason: "missing_recipient" };
  const html = `<!doctype html><html><body style="margin:0;background:#f4f6fb;font-family:Arial,sans-serif;color:#142047"><div style="max-width:620px;margin:28px auto;background:#fff;border-radius:18px;overflow:hidden"><div style="padding:28px 36px;background:#0d1d52;color:#fff"><strong style="letter-spacing:2px">GAUDEAMUS<br/><span style="color:#f15e58">MENTOR</span></strong></div><div style="padding:36px"><span style="color:#f15e58;font-size:12px;font-weight:700;letter-spacing:1px">GAUDEAMUS OBAVIJEST</span><h1 style="font-size:30px;margin:12px 0">${escape(title)}</h1><p style="font-size:16px;line-height:1.65;color:#61708e">${escape(body)}</p>${ctaUrl ? `<a href="${escape(ctaUrl)}" style="display:inline-block;margin-top:12px;padding:14px 20px;border-radius:10px;background:#f15e58;color:#fff;text-decoration:none;font-weight:700">${escape(ctaLabel || "Otvori Gaudeamus Mentor")}</a>` : ""}</div><div style="padding:18px 36px;border-top:1px solid #e9edf5;color:#7a86a1;font-size:12px">Gaudeamus Mentor · sigurna obrazovna platforma</div></div></body></html>`;
  if (!process.env.RESEND_API_KEY) { console.info(JSON.stringify({ event:"notification_skipped", kind, to, subject, reason:"RESEND_API_KEY_missing" })); return { delivered:false, reason:"not_configured" }; }
  const response = await fetch("https://api.resend.com/emails", { method:"POST", headers:{ Authorization:`Bearer ${process.env.RESEND_API_KEY}`, "Content-Type":"application/json" }, body:JSON.stringify({ from:process.env.NOTIFICATION_FROM || "Gaudeamus Mentor <onboarding@resend.dev>", to:[to], subject, html, text:`${title}\n\n${body}`, headers:preheader?{"X-Entity-Ref-ID":kind}:undefined }) });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
  return { delivered:true };
}

// Notifications are secondary to the user action that caused them. Provider outages
// must never make registration, booking or an admin edit fail.
export async function notifySafely(payload) {
  try {
    return await notify(payload);
  } catch (error) {
    console.error("notification_failed", { kind: payload.kind, to: payload.to, message: error instanceof Error ? error.message : String(error) });
    return { delivered: false, reason: "provider_error" };
  }
}

// Used by scheduled jobs so a five-minute cron cannot send the same reminder twice.
export async function notifyOnce(eventKey, payload) {
  const reserved = await query(`INSERT INTO gm_notification_outbox (id,event_key,kind,recipient)
    VALUES ($1,$2,$3,$4) ON CONFLICT (event_key) DO NOTHING RETURNING id`, [`notification-${eventKey}`, eventKey, payload.kind, payload.to]);
  if (!reserved[0]) return { delivered: false, reason: "already_processed" };
  const result = await notifySafely(payload);
  if (!result.delivered) await query("DELETE FROM gm_notification_outbox WHERE event_key=$1", [eventKey]);
  return result;
}
