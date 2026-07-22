CREATE EXTENSION IF NOT EXISTS "pgcrypto";
--> statement-breakpoint
CREATE TABLE "gm_availability_slots" (
	"id" text PRIMARY KEY NOT NULL,
	"tutor_id" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"recurrence" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gm_bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"lesson_id" text,
	"conversation_id" text,
	"student_id" text NOT NULL,
	"tutor_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"availability_id" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"topic" text NOT NULL,
	"goal" text NOT NULL,
	"student_note" text,
	"status" text NOT NULL,
	"payment_status" text NOT NULL,
	"price_eur" numeric(10, 2) NOT NULL,
	"platform_fee_eur" numeric(10, 2) NOT NULL,
	"tutor_payout_eur" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"cancellation_by" text,
	"cancellation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gm_conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text,
	"participant_ids" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gm_learning_packs" (
	"id" text PRIMARY KEY NOT NULL,
	"lesson_id" text NOT NULL,
	"student_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"title" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gm_lessons" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"recording_status" text NOT NULL,
	"transcript_status" text NOT NULL,
	"quality_score" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gm_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"sender_id" text NOT NULL,
	"body" text NOT NULL,
	"moderation" text DEFAULT 'clean' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gm_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"student_id" text NOT NULL,
	"tutor_id" text NOT NULL,
	"rating" integer NOT NULL,
	"comment" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gm_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gm_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "gm_subjects" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"levels" jsonb NOT NULL,
	"tutor_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gm_subjects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "gm_tutor_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"headline" text NOT NULL,
	"bio" text NOT NULL,
	"video_url" text,
	"subjects" jsonb NOT NULL,
	"languages" jsonb NOT NULL,
	"qualifications" jsonb NOT NULL,
	"rating" numeric(3, 2) NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"lessons_completed" integer DEFAULT 0 NOT NULL,
	"unique_students" integer DEFAULT 0 NOT NULL,
	"repeat_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"response_minutes" integer DEFAULT 0 NOT NULL,
	"badge" text DEFAULT 'Provjereni' NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"cancellation_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"reputation_score" numeric(5, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gm_tutor_profiles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "gm_users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"locale" text DEFAULT 'hr-HR' NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"auth_provider" text DEFAULT 'password' NOT NULL,
	"password_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gm_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "gm_availability_slots" ADD CONSTRAINT "gm_availability_slots_tutor_id_gm_users_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."gm_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gm_bookings" ADD CONSTRAINT "gm_bookings_student_id_gm_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."gm_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gm_bookings" ADD CONSTRAINT "gm_bookings_tutor_id_gm_users_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."gm_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gm_bookings" ADD CONSTRAINT "gm_bookings_subject_id_gm_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."gm_subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gm_bookings" ADD CONSTRAINT "gm_bookings_availability_id_gm_availability_slots_id_fk" FOREIGN KEY ("availability_id") REFERENCES "public"."gm_availability_slots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gm_learning_packs" ADD CONSTRAINT "gm_learning_packs_lesson_id_gm_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."gm_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gm_learning_packs" ADD CONSTRAINT "gm_learning_packs_student_id_gm_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."gm_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gm_learning_packs" ADD CONSTRAINT "gm_learning_packs_subject_id_gm_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."gm_subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gm_lessons" ADD CONSTRAINT "gm_lessons_booking_id_gm_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."gm_bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gm_messages" ADD CONSTRAINT "gm_messages_conversation_id_gm_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."gm_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gm_messages" ADD CONSTRAINT "gm_messages_sender_id_gm_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."gm_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gm_reviews" ADD CONSTRAINT "gm_reviews_booking_id_gm_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."gm_bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gm_reviews" ADD CONSTRAINT "gm_reviews_student_id_gm_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."gm_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gm_reviews" ADD CONSTRAINT "gm_reviews_tutor_id_gm_users_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."gm_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gm_sessions" ADD CONSTRAINT "gm_sessions_user_id_gm_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."gm_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gm_tutor_profiles" ADD CONSTRAINT "gm_tutor_profiles_user_id_gm_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."gm_users"("id") ON DELETE cascade ON UPDATE no action;
