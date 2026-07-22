CREATE TABLE IF NOT EXISTS "gm_notification_outbox" (
  "id" text PRIMARY KEY,
  "event_key" text NOT NULL UNIQUE,
  "kind" text NOT NULL,
  "recipient" text NOT NULL,
  "sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
