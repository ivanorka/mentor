import { scryptSync } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to seed Neon.");

const seed = JSON.parse(await readFile(new URL("../backend/data/seed.json", import.meta.url), "utf8"));
const defaultPassword = "Gaudeamus2026!";
const passwordHash = `scrypt$${scryptSync(defaultPassword, "gaudeamus-demo", 64).toString("hex")}`;
const superadminPasswordHash = `scrypt$${scryptSync("1812984il", "gaudeamus-demo", 64).toString("hex")}`;
const pool = new Pool({ connectionString });
const client = await pool.connect();

const json = (value) => JSON.stringify(value ?? []);
const date = (value) => value ? new Date(value) : new Date();

try {
  await client.query("BEGIN");
  await client.query(`INSERT INTO gm_users (id,email,name,role,status,locale,email_verified,auth_provider,password_hash,created_at,updated_at)
    VALUES ('admin-ilozancic','ilozancic@gmail.com','Ivan Lozančić','admin','active','hr-HR',true,'password',$1,now(),now())
    ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email,name=EXCLUDED.name,role='admin',status='active',password_hash=EXCLUDED.password_hash,updated_at=now()`, [superadminPasswordHash]);
  for (const user of seed.users) {
    await client.query(`INSERT INTO gm_users (id, email, name, role, status, locale, email_verified, auth_provider, password_hash, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,true,'password',$7,$8,$8)
      ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email, name=EXCLUDED.name, role=EXCLUDED.role, updated_at=now()`,
    [user.id, user.email.toLowerCase(), user.name, user.role, user.status ?? "active", user.locale ?? "hr-HR", passwordHash, date(user.createdAt)]);
  }
  for (const subject of seed.subjects) {
    await client.query(`INSERT INTO gm_subjects (id, slug, name, category, description, levels, tutor_count)
      VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)
      ON CONFLICT (id) DO UPDATE SET slug=EXCLUDED.slug, name=EXCLUDED.name, category=EXCLUDED.category, description=EXCLUDED.description, levels=EXCLUDED.levels, tutor_count=EXCLUDED.tutor_count, updated_at=now()`,
    [subject.id, subject.slug, subject.name, subject.category, subject.description, json(subject.levels), subject.tutorCount ?? 0]);
  }
  for (const tutor of seed.tutors) {
    await client.query(`INSERT INTO gm_tutor_profiles (user_id, slug, headline, bio, video_url, subjects, languages, qualifications, rating, review_count, lessons_completed, unique_students, repeat_rate, response_minutes, badge, verified, cancellation_rate, reputation_score)
      VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      ON CONFLICT (user_id) DO UPDATE SET slug=EXCLUDED.slug, headline=EXCLUDED.headline, bio=EXCLUDED.bio, video_url=EXCLUDED.video_url, subjects=EXCLUDED.subjects, languages=EXCLUDED.languages, qualifications=EXCLUDED.qualifications, rating=EXCLUDED.rating, review_count=EXCLUDED.review_count, lessons_completed=EXCLUDED.lessons_completed, unique_students=EXCLUDED.unique_students, repeat_rate=EXCLUDED.repeat_rate, response_minutes=EXCLUDED.response_minutes, badge=EXCLUDED.badge, verified=EXCLUDED.verified, cancellation_rate=EXCLUDED.cancellation_rate, reputation_score=EXCLUDED.reputation_score, updated_at=now()`,
    [tutor.userId, tutor.slug, tutor.headline, tutor.bio, tutor.videoUrl ?? null, json(tutor.subjects), json(tutor.languages), json(tutor.qualifications), tutor.rating, tutor.reviewCount, tutor.lessonsCompleted, tutor.uniqueStudents, tutor.repeatRate, tutor.responseMinutes, tutor.badge, tutor.verified, tutor.cancellationRate, tutor.reputationScore]);
  }
  for (const slot of seed.availability) {
    await client.query(`INSERT INTO gm_availability_slots (id, tutor_id, starts_at, ends_at, status, recurrence)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (id) DO UPDATE SET starts_at=EXCLUDED.starts_at, ends_at=EXCLUDED.ends_at, status=EXCLUDED.status, recurrence=EXCLUDED.recurrence, updated_at=now()`,
    [slot.id, slot.tutorId, date(slot.startsAt), date(slot.endsAt), slot.status, slot.recurrence ?? null]);
  }
  for (const booking of seed.bookings) {
    await client.query(`INSERT INTO gm_bookings (id, student_id, tutor_id, subject_id, availability_id, starts_at, ends_at, topic, goal, student_note, status, payment_status, price_eur, platform_fee_eur, tutor_payout_eur, currency, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$17)
      ON CONFLICT (id) DO NOTHING`,
    [booking.id, booking.studentId, booking.tutorId, booking.subjectId, booking.availabilityId ?? null, date(booking.startsAt), date(booking.endsAt), booking.topic, booking.goal, booking.studentNote ?? null, booking.status, booking.paymentStatus, booking.priceEur, booking.platformFeeEur, booking.tutorPayoutEur, booking.currency ?? "EUR", date(booking.createdAt)]);
  }
  for (const lesson of seed.lessons) {
    await client.query(`INSERT INTO gm_lessons (id, booking_id, status, started_at, ended_at, recording_status, transcript_status, quality_score)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (id) DO NOTHING`,
    [lesson.id, lesson.bookingId, lesson.status, lesson.startedAt ? date(lesson.startedAt) : null, lesson.endedAt ? date(lesson.endedAt) : null, lesson.recordingStatus, lesson.transcriptStatus, lesson.qualityScore ?? null]);
  }
  for (const review of seed.reviews) {
    await client.query(`INSERT INTO gm_reviews (id, booking_id, student_id, tutor_id, rating, comment, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$7)
      ON CONFLICT (id) DO NOTHING`,
    [review.id, review.bookingId, review.studentId, review.tutorId, review.rating, review.comment, date(review.createdAt)]);
  }
  for (const conversation of seed.conversations) {
    await client.query(`INSERT INTO gm_conversations (id, booking_id, participant_ids, created_at, updated_at)
      VALUES ($1,$2,$3::jsonb,$4,$4)
      ON CONFLICT (id) DO NOTHING`,
    [conversation.id, conversation.bookingId ?? null, json(conversation.participantIds), date(conversation.createdAt)]);
  }
  for (const message of seed.messages) {
    await client.query(`INSERT INTO gm_messages (id, conversation_id, sender_id, body, moderation, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$6)
      ON CONFLICT (id) DO NOTHING`,
    [message.id, message.conversationId, message.senderId, message.body, message.moderation, date(message.createdAt)]);
  }
  for (const pack of seed.learningPacks) {
    const { id, lessonId, studentId, subjectId, title, generatedAt, ...payload } = pack;
    await client.query(`INSERT INTO gm_learning_packs (id, lesson_id, student_id, subject_id, title, payload, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$7)
      ON CONFLICT (id) DO NOTHING`,
    [id, lessonId, studentId, subjectId, title, json(payload), date(generatedAt)]);
  }
  await client.query("COMMIT");
  console.log(`Seeded ${seed.users.length} users, ${seed.subjects.length} subjects and ${seed.tutors.length} tutors.`);
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  client.release();
  await pool.end();
}
