import { query } from "./lib/db.mjs";
import { notifyOnce } from "./lib/notifications.mjs";

const siteUrl = () => process.env.PUBLIC_SITE_URL || process.env.URL || "https://mentor.orka.solutions";
const formatTime = (value) => new Intl.DateTimeFormat("hr-HR", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Zagreb" }).format(new Date(value));

async function sendWindow(kind, start, end, description) {
  const rows = await query(`SELECT b.id, b.starts_at, b.topic, s.email AS student_email, s.name AS student_name,
    t.email AS tutor_email, t.name AS tutor_name, sub.name AS subject_name
    FROM gm_bookings b
    JOIN gm_users s ON s.id=b.student_id
    JOIN gm_users t ON t.id=b.tutor_id
    JOIN gm_subjects sub ON sub.id=b.subject_id
    WHERE b.status='confirmed' AND b.starts_at >= now() + $1::interval AND b.starts_at < now() + $2::interval`, [start, end]);
  await Promise.all(rows.flatMap((booking) => {
    const time = formatTime(booking.starts_at);
    return [
      notifyOnce(`${booking.id}:${kind}:student`, { to:booking.student_email, kind:`lesson_${kind}`, subject:`Podsjetnik: instrukcije ${description}`, title:"Uskoro imate instrukcije", body:`${booking.subject_name} · ${time}. ${description}. Tema: ${booking.topic}.`, ctaUrl:`${siteUrl()}/ucenik`, ctaLabel:"Otvori raspored" }),
      notifyOnce(`${booking.id}:${kind}:tutor`, { to:booking.tutor_email, kind:`lesson_${kind}`, subject:`Podsjetnik: sat ${description}`, title:"Uskoro imate zakazan sat", body:`${booking.subject_name} sa ${booking.student_name} · ${time}. ${description}. Tema: ${booking.topic}.`, ctaUrl:`${siteUrl()}/profesor`, ctaLabel:"Otvori kalendar" }),
    ];
  }));
  return rows.length;
}

const handler = async () => {
  try {
    const [day, hour] = await Promise.all([
      sendWindow("24h", "23 hours 55 minutes", "24 hours 5 minutes", "je za otprilike 24 sata"),
      sendWindow("1h", "55 minutes", "65 minutes", "počinje za otprilike jedan sat"),
    ]);
    console.info(JSON.stringify({ event:"lesson_reminders_finished", day, hour }));
    return new Response(JSON.stringify({ ok:true, day, hour }), { status:200, headers:{ "content-type":"application/json" } });
  } catch (error) {
    console.error("lesson_reminders_failed", error);
    return new Response(JSON.stringify({ ok:false }), { status:500, headers:{ "content-type":"application/json" } });
  }
};

export default handler;
export const config = { schedule: "*/5 * * * *" };
