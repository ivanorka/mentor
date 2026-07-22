import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { query } from "./lib/db.mjs";
import { notifySafely } from "./lib/notifications.mjs";

const DAY = 60 * 60 * 24;
const sessionCookie = "gm_session";

const json = (statusCode, data, headers = {}) => ({
  statusCode,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  body: JSON.stringify(data),
});
const ok = (data, meta, headers) => json(200, { data, ...(meta ? { meta } : {}) }, headers);
const created = (data, headers) => json(201, { data }, headers);
const fail = (statusCode, code, message) => json(statusCode, { error: { code, message } });
const asNumber = (value) => Number(value ?? 0);
const asJson = (value, fallback = []) => typeof value === "string" ? JSON.parse(value) : value ?? fallback;
const normalized = (value) => String(value ?? "").trim().toLocaleLowerCase("hr-HR").normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, "-");
const now = () => new Date().toISOString();
const id = (prefix) => `${prefix}-${randomBytes(8).toString("hex")}`;
const hashToken = (value) => createHash("sha256").update(value).digest("hex");
const passwordHash = (value) => `scrypt$${scryptSync(value, "gaudeamus-demo", 64).toString("hex")}`;
const validPassword = (value, stored) => {
  if (!stored?.startsWith("scrypt$")) return false;
  const candidate = Buffer.from(passwordHash(value).split("$")[1], "hex");
  const expected = Buffer.from(stored.split("$")[1], "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
};
const parseCookies = (header = "") => Object.fromEntries(header.split(";").map((part) => part.trim().split(/=(.*)/s)).filter(([key]) => key));
const secureCookie = () => process.env.NETLIFY === "true" || process.env.URL?.startsWith("https://");
const cookie = (token, expires) => `${sessionCookie}=${token}; Path=/; Max-Age=${DAY * 7}; Expires=${expires.toUTCString()}; HttpOnly;${secureCookie() ? " Secure;" : ""} SameSite=Lax`;
const clearCookie = () => `${sessionCookie}=; Path=/; Max-Age=0; HttpOnly;${secureCookie() ? " Secure;" : ""} SameSite=Lax`;
const body = (event) => {
  try { return event.body ? JSON.parse(event.body) : {}; } catch { return {}; }
};
const safeReturnTo = (value, fallback = "/ucenik") => value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
const oauthSecret = () => process.env.OAUTH_STATE_SECRET || process.env.GOOGLE_CLIENT_SECRET;
const encodeOAuthState = (payload) => {
  const encoded = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 10 * 60 * 1000, nonce: randomBytes(16).toString("hex") })).toString("base64url");
  return `${encoded}.${createHmac("sha256", oauthSecret()).update(encoded).digest("base64url")}`;
};
const decodeOAuthState = (value) => {
  const [encoded, signature] = String(value || "").split(".");
  if (!encoded || !signature || !oauthSecret()) return null;
  const expected = createHmac("sha256", oauthSecret()).update(encoded).digest("base64url");
  if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
  try { const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")); return payload.exp > Date.now() ? payload : null; } catch { return null; }
};
const redirect = (location, headers = {}) => ({ statusCode: 302, headers: { Location: location, "Cache-Control": "no-store", ...headers }, body: "" });

function publicUser(row) {
  return {
    id: row.id, email: row.email, name: row.name, role: row.role, status: row.status,
    locale: row.locale, emailVerified: row.emailVerified ?? row.email_verified,
    authProvider: row.authProvider ?? row.auth_provider, createdAt: row.createdAt ?? row.created_at,
  };
}
function publicTutor(row) {
  return {
    userId: row.userId ?? row.user_id, slug: row.slug, headline: row.headline, bio: row.bio,
    videoUrl: row.videoUrl ?? row.video_url ?? undefined, subjects: asJson(row.subjects), languages: asJson(row.languages),
    qualifications: asJson(row.qualifications), rating: asNumber(row.rating), reviewCount: asNumber(row.reviewCount ?? row.review_count),
    lessonsCompleted: asNumber(row.lessonsCompleted ?? row.lessons_completed), uniqueStudents: asNumber(row.uniqueStudents ?? row.unique_students),
    repeatRate: asNumber(row.repeatRate ?? row.repeat_rate), responseMinutes: asNumber(row.responseMinutes ?? row.response_minutes),
    badge: row.badge, verified: Boolean(row.verified), cancellationRate: asNumber(row.cancellationRate ?? row.cancellation_rate),
    reputationScore: asNumber(row.reputationScore ?? row.reputation_score),
  };
}
function publicSubject(row) {
  return { id: row.id, slug: row.slug, name: row.name, category: row.category, description: row.description, levels: asJson(row.levels), tutorCount: asNumber(row.tutorCount ?? row.tutor_count) };
}
async function actor(event) {
  const token = parseCookies(event.headers.cookie)?.[sessionCookie];
  if (!token) return null;
  const rows = await query(`SELECT u.id, u.email, u.name, u.role, u.status, u.locale, u.email_verified AS "emailVerified", u.auth_provider AS "authProvider", u.created_at AS "createdAt"
    FROM gm_sessions s JOIN gm_users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > now()`, [hashToken(token)]);
  return rows[0] ? publicUser(rows[0]) : null;
}
async function requireActor(event) {
  const current = await actor(event);
  if (!current) throw Object.assign(new Error("Prijavite se kako biste nastavili."), { statusCode: 401, code: "unauthorized" });
  return current;
}
async function requireAdmin(event) {
  const user = await requireActor(event);
  if (user.role !== "admin") throw Object.assign(new Error("Ova radnja zahtijeva superadmin ovlasti."), { statusCode: 403, code: "forbidden" });
  return user;
}
async function googleUser(code, state) {
  const callback = process.env.GOOGLE_REDIRECT_URL;
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, redirect_uri: callback, grant_type: "authorization_code" }) });
  const tokens = await tokenResponse.json();
  if (!tokenResponse.ok || !tokens.access_token) throw Object.assign(new Error("Google prijava nije dovršena."), { statusCode: 401, code: "google_oauth_failed" });
  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tokens.access_token}` } });
  const profile = await profileResponse.json();
  if (!profileResponse.ok || !profile.email_verified || !profile.email) throw Object.assign(new Error("Google račun mora imati potvrđenu e-mail adresu."), { statusCode: 401, code: "google_email_unverified" });
  const rows = await query(`SELECT id, email, name, role, status, locale, email_verified AS "emailVerified", auth_provider AS "authProvider", created_at AS "createdAt" FROM gm_users WHERE email=$1`, [String(profile.email).toLowerCase()]);
  if (rows[0]) return publicUser(rows[0]);
  const role = state.role === "tutor" ? "tutor" : "student";
  const user = { id: id(role), email: String(profile.email).toLowerCase(), name: String(profile.name || profile.email).slice(0, 120), role, status: "active", locale: "hr-HR", emailVerified: true, authProvider: "google", createdAt: now() };
  await query(`INSERT INTO gm_users (id,email,name,role,status,locale,email_verified,auth_provider,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now(),now())`, [user.id,user.email,user.name,user.role,user.status,user.locale,true,user.authProvider]);
  if (role === "tutor") await query(`INSERT INTO gm_tutor_profiles (user_id,slug,headline,bio,subjects,languages,qualifications,rating,review_count,lessons_completed,unique_students,repeat_rate,response_minutes,badge,verified,cancellation_rate,reputation_score) VALUES ($1,$2,$3,$4,'[]'::jsonb,'["Hrvatski"]'::jsonb,'[]'::jsonb,0,0,0,0,0,0,'Novi mentor',false,0,0)`, [user.id, `${normalized(user.name).replace(/[^a-z0-9-]/g, "").slice(0, 48) || "mentor"}-${user.id.slice(-6)}`, "Novi Gaudeamus mentor", "Profil je u pripremi."]);
  await notifySafely({ to:user.email, kind:"google_registration", subject:"Dobro došli u Gaudeamus Mentor", title:`Dobro došli, ${user.name}!`, body:"Google račun je uspješno povezan s Gaudeamus Mentorom.", ctaUrl:`${process.env.PUBLIC_SITE_URL || ""}${dashboard(user)}`, ctaLabel:"Otvori svoj prostor" });
  return user;
}
async function issueSession(user) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + DAY * 7 * 1000);
  await query("INSERT INTO gm_sessions (token_hash, user_id, expires_at) VALUES ($1,$2,$3)", [hashToken(token), user.id, expires]);
  return { token, expires, user };
}
function dashboard(user) { return user.role === "tutor" ? "/profesor" : user.role === "admin" ? "/superdmin/upravljanje" : "/ucenik"; }
function apiPath(event) {
  const raw = event.path.replace(/^\/.netlify\/functions\/api/, "").replace(/^\/api\/v1/, "");
  return raw === "" ? "/" : raw;
}
function moderate(text) {
  const unsafe = /(?:\+?\d[\d\s().-]{7,}\d|[\w.+-]+@[\w.-]+\.[a-z]{2,}|whatsapp|instagram|telegram)/i;
  return unsafe.test(text) ? { body: "[Kontakt podatak uklonjen radi sigurnosti platforme.]", moderation: "blocked" } : { body: text.trim(), moderation: "clean" };
}

async function listTutors(params) {
  const [rows, subjectRows] = await Promise.all([
    query(`SELECT tp.*, u.name, u.email FROM gm_tutor_profiles tp JOIN gm_users u ON u.id = tp.user_id ORDER BY tp.reputation_score DESC, tp.rating DESC`),
    query("SELECT id, slug, name FROM gm_subjects"),
  ]);
  const subject = normalized(params.get("subject"));
  const level = normalized(params.get("level"));
  const matchingSubjectIds = new Set(subjectRows.filter((item) => [item.id, item.slug, item.name].some((value) => normalized(value) === subject || normalized(value).includes(subject) || subject.includes(normalized(value)))).map((item) => item.id));
  const search = params.get("q")?.toLowerCase().trim();
  const badge = params.get("badge")?.toLowerCase();
  const verified = params.get("verified");
  const min = Number(params.get("minPrice") || 0);
  const max = Number(params.get("maxPrice") || 0);
  const filtered = rows.map((row) => ({ ...publicTutor(row), name: row.name, email: row.email })).filter((tutor) => {
    const offers = tutor.subjects.filter((offer) => !subject || matchingSubjectIds.has(offer.subjectId) || normalized(offer.subjectId).includes(subject));
    const matchingOffers = offers.filter((offer) => !level || (offer.levels || []).some((item) => normalized(item) === level));
    const prices = (matchingOffers.length ? matchingOffers : offers).map((offer) => Number(offer.priceEur));
    return (!search || `${tutor.name} ${tutor.headline} ${tutor.bio}`.toLowerCase().includes(search)) &&
      (!subject || offers.length > 0) && (!level || matchingOffers.length > 0) &&
      (!badge || tutor.badge.toLowerCase() === badge) && (verified !== "true" || tutor.verified) &&
      (!min || prices.some((price) => price >= min)) && (!max || prices.some((price) => price <= max));
  });
  const offset = Math.max(0, Number(params.get("offset") || 0));
  const limit = Math.min(100, Math.max(1, Number(params.get("limit") || 24)));
  return { data: filtered.slice(offset, offset + limit), total: filtered.length };
}

export const handler = async (event) => {
  try {
    const path = apiPath(event);
    const method = event.httpMethod;
    const params = new URL(event.rawUrl).searchParams;

    if (method === "GET" && path === "/health") return ok({ status: "ok", service: "gaudeamus-neon-api", database: "neon", time: now() });
    if (method === "GET" && path === "/subjects") {
      const rows = await query("SELECT * FROM gm_subjects ORDER BY category, name");
      return ok(rows.map(publicSubject), { total: rows.length });
    }
    if (method === "GET" && path === "/auth/google/start") {
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URL) return fail(503, "google_sso_not_configured", "Google prijava još nije konfigurirana. Dodajte Google OAuth podatke u environment varijable.");
      const state = encodeOAuthState({ role: params.get("role") === "tutor" ? "tutor" : "student", returnTo: safeReturnTo(params.get("returnTo")) });
      const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authorization.search = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, redirect_uri: process.env.GOOGLE_REDIRECT_URL, response_type: "code", scope: "openid email profile", state, prompt: "select_account" }).toString();
      return redirect(authorization.toString());
    }
    if (method === "GET" && path === "/auth/google/callback") {
      const state = decodeOAuthState(params.get("state"));
      if (!state || !params.get("code")) return redirect(`/prijava?error=google`);
      const user = await googleUser(params.get("code"), state);
      const session = await issueSession(user);
      return redirect(safeReturnTo(state.returnTo, dashboard(user)), { "Set-Cookie": cookie(session.token, session.expires) });
    }
    if (method === "GET" && path === "/tutors") {
      const result = await listTutors(params);
      return ok(result.data, { total: result.total });
    }
    const tutorMatch = path.match(/^\/tutors\/([^/]+)(?:\/(availability|reviews))?$/);
    if (method === "GET" && tutorMatch) {
      const [, key, resource] = tutorMatch;
      const profileRows = await query(`SELECT tp.*, u.name, u.email FROM gm_tutor_profiles tp JOIN gm_users u ON u.id = tp.user_id WHERE tp.slug = $1 OR tp.user_id = $1`, [key]);
      if (!profileRows[0]) return fail(404, "not_found", "Profesor nije pronađen.");
      const tutor = publicTutor(profileRows[0]);
      if (resource === "availability") {
        const rows = await query(`SELECT id, tutor_id AS "tutorId", starts_at AS "startsAt", ends_at AS "endsAt", status, recurrence FROM gm_availability_slots WHERE tutor_id = $1 ${params.get("status") ? "AND status = $2" : ""} ORDER BY starts_at`, params.get("status") ? [tutor.userId, params.get("status")] : [tutor.userId]);
        return ok(rows, { total: rows.length });
      }
      if (resource === "reviews") {
        const rows = await query(`SELECT r.id, r.booking_id AS "bookingId", r.student_id AS "studentId", r.tutor_id AS "tutorId", r.rating, r.comment, r.created_at AS "createdAt", u.name AS "studentName" FROM gm_reviews r JOIN gm_users u ON u.id = r.student_id WHERE r.tutor_id = $1 ORDER BY r.created_at DESC`, [tutor.userId]);
        return ok(rows, { total: rows.length });
      }
      return ok({ ...tutor, name: profileRows[0].name, email: profileRows[0].email });
    }

    if (method === "POST" && path === "/auth/register") {
      const input = body(event);
      const email = String(input.email || "").trim().toLowerCase();
      const name = String(input.name || "").trim();
      const role = input.role === "tutor" ? "tutor" : "student";
      if (!/^\S+@\S+\.\S+$/.test(email) || name.length < 2 || String(input.password || "").length < 8) return fail(422, "validation_error", "Provjerite ime, e-mail i lozinku (najmanje 8 znakova).");
      const exists = await query("SELECT id FROM gm_users WHERE email = $1", [email]);
      if (exists[0]) return fail(409, "email_taken", "Račun s ovom e-mail adresom već postoji.");
      const user = { id: id(role), email, name, role, status: "active", locale: "hr-HR", emailVerified: false, authProvider: "password", createdAt: now() };
      await query(`INSERT INTO gm_users (id,email,name,role,status,locale,email_verified,auth_provider,password_hash,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),now())`, [user.id, user.email, user.name, user.role, user.status, user.locale, false, user.authProvider, passwordHash(input.password)]);
      await notifySafely({ to:user.email, kind:"registration", subject:"Dobro došli u Gaudeamus Mentor", title:`Dobro došli, ${user.name}!`, body:"Vaš račun je uspješno kreiran. Sada možete pronaći mentora, rezervirati sat i pratiti svoj napredak.", ctaUrl:`${process.env.PUBLIC_SITE_URL || new URL(event.rawUrl).origin}${dashboard(user)}`, ctaLabel:"Otvori svoj prostor" });
      await notifySafely({ to:process.env.NOTIFICATION_TEAM_EMAIL, kind:"new_user", subject:"Novi korisnik na platformi", title:"Novi račun", body:`${user.name} se registrirao/la kao ${role === "tutor" ? "profesor" : "student"}.` });
      const session = await issueSession(user);
      return created({ user, dashboard: dashboard(user) }, { "Set-Cookie": cookie(session.token, session.expires) });
    }
    if (method === "POST" && path === "/auth/login") {
      const input = body(event);
      const email = String(input.email || "").trim().toLowerCase();
      const rows = await query(`SELECT id, email, name, role, status, locale, email_verified AS "emailVerified", auth_provider AS "authProvider", password_hash, created_at AS "createdAt" FROM gm_users WHERE email = $1`, [email]);
      const row = rows[0];
      if (!row || (path === "/auth/login" && !validPassword(String(input.password || ""), row.password_hash))) return fail(401, "invalid_credentials", "E-mail ili lozinka nisu ispravni.");
      const user = publicUser(row);
      const session = await issueSession(user);
      return ok({ user, dashboard: dashboard(user) }, undefined, { "Set-Cookie": cookie(session.token, session.expires) });
    }
    if (method === "POST" && path === "/auth/logout") {
      const token = parseCookies(event.headers.cookie)?.[sessionCookie];
      if (token) await query("DELETE FROM gm_sessions WHERE token_hash = $1", [hashToken(token)]);
      return ok({ loggedOut: true }, undefined, { "Set-Cookie": clearCookie() });
    }
    if (method === "GET" && path === "/auth/session") {
      const user = await actor(event);
      if (!user) return fail(401, "unauthorized", "Nema aktivne sesije.");
      return ok({ user, dashboard: dashboard(user) });
    }
    if (path === "/users/me") {
      const user = await requireActor(event);
      if (method === "GET") return ok(user);
      if (method === "PATCH") {
        const input = body(event);
        const name = String(input.name || user.name).trim();
        const locale = ["hr-HR", "en-GB"].includes(input.locale) ? input.locale : user.locale;
        if (name.length < 2) return fail(422, "validation_error", "Ime mora imati najmanje dva znaka.");
        await query("UPDATE gm_users SET name = $1, locale = $2, updated_at = now() WHERE id = $3", [name, locale, user.id]);
        return ok({ ...user, name, locale });
      }
    }
    if (method === "GET" && path === "/admin/users") {
      await requireAdmin(event);
      const rows = await query(`SELECT id,email,name,role,status,locale,email_verified AS "emailVerified",auth_provider AS "authProvider",created_at AS "createdAt" FROM gm_users ORDER BY created_at DESC`);
      const search = normalized(params.get("q")); const role = params.get("role"); const status = params.get("status");
      const data = rows.map(publicUser).filter((user) => (!search || normalized(`${user.name} ${user.email}`).includes(search)) && (!role || user.role === role) && (!status || user.status === status));
      return ok(data, { total: data.length });
    }
    const adminUserMatch = path.match(/^\/admin\/users\/([^/]+)$/);
    if (adminUserMatch && method === "PATCH") {
      const admin = await requireAdmin(event); const targetId = adminUserMatch[1]; const input = body(event);
      const rows = await query(`SELECT id,email,name,role,status,locale,email_verified AS "emailVerified",auth_provider AS "authProvider",created_at AS "createdAt" FROM gm_users WHERE id=$1`, [targetId]);
      if (!rows[0]) return fail(404, "not_found", "Korisnik nije pronađen.");
      const current = publicUser(rows[0]); const name = String(input.name ?? current.name).trim(); const email = String(input.email ?? current.email).trim().toLowerCase(); const role = ["student","tutor","admin"].includes(input.role) ? input.role : current.role; const status = ["active","deactivated"].includes(input.status) ? input.status : current.status;
      if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email)) return fail(422, "validation_error", "Provjerite ime i e-mail adresu.");
      if (targetId === admin.id && (role !== "admin" || status !== "active")) return fail(422, "protected_admin", "Ne možete deaktivirati vlastiti superadmin račun.");
      const password = String(input.password || "");
      if (password && password.length < 8) return fail(422, "validation_error", "Nova lozinka mora imati najmanje 8 znakova.");
      await query(`UPDATE gm_users SET name=$1,email=$2,role=$3,status=$4,password_hash=COALESCE($5,password_hash),updated_at=now() WHERE id=$6`, [name,email,role,status,password ? passwordHash(password) : null,targetId]);
      if (current.status !== status) await notifySafely({ to:email, kind:"status_change", subject:"Promjena statusa vašeg Gaudeamus računa", title:status === "active" ? "Račun je ponovno aktivan" : "Račun je deaktiviran", body:status === "active" ? "Vaš pristup platformi je ponovno omogućen." : "Vaš račun je deaktiviran. Za pomoć se javite podršci." });
      if (password) await notifySafely({ to:email, kind:"password_changed", subject:"Lozinka je promijenjena", title:"Lozinka vašeg računa je promijenjena", body:"Superadmin je promijenio lozinku računa. Ako ovu promjenu niste očekivali, odmah se javite podršci." });
      return ok({ ...current, name, email, role, status });
    }
    if (method === "POST" && path === "/auth/password/forgot") return ok({ accepted: true, message: "Ako račun postoji, poslana je uputa za obnovu lozinke." });

    if (method === "GET" && path === "/bookings") {
      const user = await requireActor(event);
      const rows = await query(`SELECT b.*, s.name AS "studentName", t.name AS "tutorName", sub.name AS "subjectName" FROM gm_bookings b JOIN gm_users s ON s.id=b.student_id JOIN gm_users t ON t.id=b.tutor_id JOIN gm_subjects sub ON sub.id=b.subject_id WHERE b.student_id=$1 OR b.tutor_id=$1 ORDER BY b.starts_at DESC`, [user.id]);
      return ok(rows, { total: rows.length });
    }
    if (method === "POST" && path === "/bookings") {
      const user = await requireActor(event);
      const input = body(event);
      const slotRows = await query("SELECT * FROM gm_availability_slots WHERE id = $1 AND status = 'open'", [input.availabilityId]);
      const slot = slotRows[0];
      if (!slot) return fail(409, "slot_unavailable", "Termin više nije dostupan.");
      const profileRows = await query("SELECT subjects FROM gm_tutor_profiles WHERE user_id = $1", [slot.tutor_id]);
      const offer = asJson(profileRows[0]?.subjects).find((item) => item.subjectId === input.subjectId);
      if (!offer) return fail(422, "validation_error", "Profesor ne predaje odabrani predmet.");
      const price = Number(offer.priceEur);
      const booking = { id: id("booking"), studentId: user.id, tutorId: slot.tutor_id, subjectId: input.subjectId, availabilityId: slot.id, startsAt: slot.starts_at, endsAt: slot.ends_at, topic: String(input.topic || "Instrukcije"), goal: String(input.goal || "Napredak u temi"), studentNote: String(input.studentNote || ""), status: "pending_payment", paymentStatus: "pending", priceEur: price, platformFeeEur: Number((price * .15).toFixed(2)), tutorPayoutEur: Number((price * .85).toFixed(2)), currency: "EUR", createdAt: now() };
      await query(`INSERT INTO gm_bookings (id,student_id,tutor_id,subject_id,availability_id,starts_at,ends_at,topic,goal,student_note,status,payment_status,price_eur,platform_fee_eur,tutor_payout_eur,currency) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`, [booking.id, booking.studentId, booking.tutorId, booking.subjectId, booking.availabilityId, booking.startsAt, booking.endsAt, booking.topic, booking.goal, booking.studentNote, booking.status, booking.paymentStatus, booking.priceEur, booking.platformFeeEur, booking.tutorPayoutEur, booking.currency]);
      const tutorRows = await query("SELECT email,name FROM gm_users WHERE id=$1", [booking.tutorId]);
      await notifySafely({ to:user.email, kind:"booking_created", subject:"Rezervacija čeka plaćanje", title:"Termin je rezerviran", body:"Termin je privremeno sačuvan. Dovršite sigurno plaćanje kako biste ga potvrdili." });
      await notifySafely({ to:tutorRows[0]?.email, kind:"booking_request", subject:"Nova rezervacija čeka potvrdu", title:"Novi zahtjev za instrukcije", body:`Učenik je odabrao termin za temu: ${booking.topic}. Obavijest stiže nakon uspješne naplate.` });
      return created(booking);
    }
    const checkoutMatch = path.match(/^\/bookings\/([^/]+)\/checkout$/);
    if (method === "POST" && checkoutMatch) {
      const user = await requireActor(event);
      if (!process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) return fail(503, "stripe_not_configured", "Stripe testno plaćanje još nije povezano. Dodajte STRIPE_SECRET_KEY u lokalne ili Netlify varijable.");
      const rows = await query(`SELECT b.*, sub.name AS "subjectName", t.name AS "tutorName" FROM gm_bookings b JOIN gm_subjects sub ON sub.id=b.subject_id JOIN gm_users t ON t.id=b.tutor_id WHERE b.id=$1 AND b.student_id=$2`, [checkoutMatch[1], user.id]);
      if (!rows[0]) return fail(404, "not_found", "Rezervacija nije pronađena.");
      const booking = rows[0];
      const origin = process.env.PUBLIC_SITE_URL || new URL(event.rawUrl).origin;
      const form = new URLSearchParams({ mode: "payment", success_url: `${origin}/ucenik?payment=success&session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${origin}/rezervacija/${encodeURIComponent(booking.tutor_id)}?payment=cancelled`, customer_email: user.email, "line_items[0][quantity]": "1", "line_items[0][price_data][currency]": "eur", "line_items[0][price_data][unit_amount]": String(Math.round(Number(booking.price_eur) * 100)), "line_items[0][price_data][product_data][name]": `Instrukcije: ${booking.subjectName}`, "metadata[booking_id]": booking.id, "metadata[tutor_id]": booking.tutor_id, "metadata[student_id]": user.id });
      const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" }, body: form });
      const stripe = await stripeResponse.json();
      if (!stripeResponse.ok || !stripe.url) return fail(502, "stripe_checkout_failed", "Stripe nije uspio otvoriti sigurnu naplatu.");
      return ok({ checkoutUrl: stripe.url, sessionId: stripe.id });
    }
    const payMatch = path.match(/^\/bookings\/([^/]+)\/pay$/);
    if (method === "POST" && payMatch) {
      const user = await requireActor(event);
      const rows = await query("SELECT * FROM gm_bookings WHERE id = $1 AND student_id = $2", [payMatch[1], user.id]);
      if (!rows[0]) return fail(404, "not_found", "Rezervacija nije pronađena.");
      await query("UPDATE gm_bookings SET status='confirmed', payment_status='paid', updated_at=now() WHERE id=$1", [payMatch[1]]);
      const booking = rows[0];
      const people = await query("SELECT id,email,name FROM gm_users WHERE id=$1 OR id=$2", [booking.student_id, booking.tutor_id]);
      const student = people.find((person) => person.id === booking.student_id);
      const tutor = people.find((person) => person.id === booking.tutor_id);
      await notifySafely({ to:student?.email, kind:"payment_confirmed", subject:"Plaćanje je potvrđeno", title:"Sat je potvrđen", body:"Plaćanje je uspješno evidentirano. Termin je sada potvrđen u vašem rasporedu.", ctaUrl:`${process.env.PUBLIC_SITE_URL || new URL(event.rawUrl).origin}/ucenik`, ctaLabel:"Otvori raspored" });
      await notifySafely({ to:tutor?.email, kind:"new_confirmed_booking", subject:"Potvrđen je novi sat", title:"Novi sat je potvrđen", body:`${student?.name || "Učenik"} je potvrdio/la rezervaciju. Provjerite svoj kalendar i pripremite sat.`, ctaUrl:`${process.env.PUBLIC_SITE_URL || new URL(event.rawUrl).origin}/profesor`, ctaLabel:"Otvori kalendar" });
      return ok({ booking: { ...rows[0], status: "confirmed", paymentStatus: "paid" } });
    }

    if (method === "GET" && path === "/conversations") {
      const user = await requireActor(event);
      const rows = await query(`SELECT c.id, c.booking_id AS "bookingId", c.participant_ids AS "participantIds", c.created_at AS "createdAt", m.body AS "lastMessage", m.created_at AS "updatedAt" FROM gm_conversations c LEFT JOIN LATERAL (SELECT body, created_at FROM gm_messages WHERE conversation_id=c.id ORDER BY created_at DESC LIMIT 1) m ON true WHERE c.participant_ids @> $1::jsonb ORDER BY m.created_at DESC NULLS LAST`, [JSON.stringify([user.id])]);
      return ok(rows, { total: rows.length });
    }
    const messagesMatch = path.match(/^\/conversations\/([^/]+)\/messages$/);
    if (messagesMatch) {
      const user = await requireActor(event);
      const conversation = await query("SELECT * FROM gm_conversations WHERE id=$1 AND participant_ids @> $2::jsonb", [messagesMatch[1], JSON.stringify([user.id])]);
      if (!conversation[0]) return fail(404, "not_found", "Razgovor nije pronađen.");
      if (method === "GET") {
        const rows = await query(`SELECT id, conversation_id AS "conversationId", sender_id AS "senderId", body, moderation, created_at AS "createdAt" FROM gm_messages WHERE conversation_id=$1 ORDER BY created_at`, [messagesMatch[1]]);
        return ok(rows, { total: rows.length });
      }
      if (method === "POST") {
        const input = body(event);
        const moderated = moderate(String(input.body || ""));
        if (!moderated.body) return fail(422, "validation_error", "Poruka ne može biti prazna.");
        const message = { id: id("msg"), conversationId: messagesMatch[1], senderId: user.id, ...moderated, createdAt: now() };
        await query("INSERT INTO gm_messages (id,conversation_id,sender_id,body,moderation,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$6)", [message.id, message.conversationId, message.senderId, message.body, message.moderation, message.createdAt]);
        const recipientId = asJson(conversation[0].participant_ids).find((participantId) => participantId !== user.id);
        if (recipientId) {
          const recipient = (await query("SELECT email,name FROM gm_users WHERE id=$1", [recipientId]))[0];
          await notifySafely({ to:recipient?.email, kind:"new_message", subject:"Nova poruka na Gaudeamus Mentoru", title:"Imate novu poruku", body:`${user.name} vam je poslao/la poruku. Otvorite razgovor na platformi.`, ctaUrl:`${process.env.PUBLIC_SITE_URL || new URL(event.rawUrl).origin}/${user.role === "tutor" ? "ucenik" : "profesor"}`, ctaLabel:"Otvori poruke" });
        }
        return created({ message });
      }
    }
    return fail(404, "not_found", "API ruta nije pronađena.");
  } catch (error) {
    if (error?.statusCode) return fail(error.statusCode, error.code ?? "request_error", error.message);
    console.error("Gaudeamus API error", error);
    return fail(500, "internal_error", "Dogodila se neočekivana pogreška. Pokušajte ponovno.");
  }
};
