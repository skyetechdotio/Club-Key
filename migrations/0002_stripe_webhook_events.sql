CREATE TABLE "webhook_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"stripe_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"processed_at" timestamp DEFAULT now(),
	"data" jsonb NOT NULL,
	CONSTRAINT "webhook_events_stripe_event_id_unique" UNIQUE("stripe_event_id")
);--> statement-breakpoint
CREATE INDEX "IDX_webhook_events_stripe_event_id" ON "webhook_events" USING btree ("stripe_event_id");--> statement-breakpoint
CREATE INDEX "IDX_webhook_events_event_type" ON "webhook_events" USING btree ("event_type");