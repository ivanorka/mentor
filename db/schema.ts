import { boolean, integer, jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const users = pgTable("gm_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  status: text("status").notNull().default("active"),
  locale: text("locale").notNull().default("hr-HR"),
  emailVerified: boolean("email_verified").notNull().default(false),
  authProvider: text("auth_provider").notNull().default("password"),
  passwordHash: text("password_hash"),
  ...timestamps,
});

export const subjects = pgTable("gm_subjects", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  levels: jsonb("levels").notNull(),
  tutorCount: integer("tutor_count").notNull().default(0),
  ...timestamps,
});

export const tutorProfiles = pgTable("gm_tutor_profiles", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  headline: text("headline").notNull(),
  bio: text("bio").notNull(),
  videoUrl: text("video_url"),
  subjects: jsonb("subjects").notNull(),
  languages: jsonb("languages").notNull(),
  qualifications: jsonb("qualifications").notNull(),
  rating: numeric("rating", { precision: 3, scale: 2 }).notNull(),
  reviewCount: integer("review_count").notNull().default(0),
  lessonsCompleted: integer("lessons_completed").notNull().default(0),
  uniqueStudents: integer("unique_students").notNull().default(0),
  repeatRate: numeric("repeat_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  responseMinutes: integer("response_minutes").notNull().default(0),
  badge: text("badge").notNull().default("Provjereni"),
  verified: boolean("verified").notNull().default(false),
  cancellationRate: numeric("cancellation_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  reputationScore: numeric("reputation_score", { precision: 5, scale: 2 }).notNull().default("0"),
  ...timestamps,
});

export const availabilitySlots = pgTable("gm_availability_slots", {
  id: text("id").primaryKey(),
  tutorId: text("tutor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("open"),
  recurrence: text("recurrence"),
  ...timestamps,
});

export const bookings = pgTable("gm_bookings", {
  id: text("id").primaryKey(),
  lessonId: text("lesson_id"),
  conversationId: text("conversation_id"),
  studentId: text("student_id").notNull().references(() => users.id),
  tutorId: text("tutor_id").notNull().references(() => users.id),
  subjectId: text("subject_id").notNull().references(() => subjects.id),
  availabilityId: text("availability_id").references(() => availabilitySlots.id),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  topic: text("topic").notNull(),
  goal: text("goal").notNull(),
  studentNote: text("student_note"),
  status: text("status").notNull(),
  paymentStatus: text("payment_status").notNull(),
  priceEur: numeric("price_eur", { precision: 10, scale: 2 }).notNull(),
  platformFeeEur: numeric("platform_fee_eur", { precision: 10, scale: 2 }).notNull(),
  tutorPayoutEur: numeric("tutor_payout_eur", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("EUR"),
  cancellationBy: text("cancellation_by"),
  cancellationReason: text("cancellation_reason"),
  ...timestamps,
});

export const lessons = pgTable("gm_lessons", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  recordingStatus: text("recording_status").notNull(),
  transcriptStatus: text("transcript_status").notNull(),
  qualityScore: numeric("quality_score", { precision: 5, scale: 2 }),
  ...timestamps,
});

export const reviews = pgTable("gm_reviews", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").notNull().references(() => bookings.id),
  studentId: text("student_id").notNull().references(() => users.id),
  tutorId: text("tutor_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  ...timestamps,
});

export const conversations = pgTable("gm_conversations", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id"),
  participantIds: jsonb("participant_ids").notNull(),
  ...timestamps,
});

export const messages = pgTable("gm_messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: text("sender_id").notNull().references(() => users.id),
  body: text("body").notNull(),
  moderation: text("moderation").notNull().default("clean"),
  ...timestamps,
});

export const learningPacks = pgTable("gm_learning_packs", {
  id: text("id").primaryKey(),
  lessonId: text("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => users.id),
  subjectId: text("subject_id").notNull().references(() => subjects.id),
  title: text("title").notNull(),
  payload: jsonb("payload").notNull(),
  ...timestamps,
});

export const sessions = pgTable("gm_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
