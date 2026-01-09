CREATE TABLE "campaign_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"level" varchar(20) NOT NULL,
	"event" varchar(50) NOT NULL,
	"message" text NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_logs" ADD CONSTRAINT "campaign_logs_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_campaign_logs_campaign" ON "campaign_logs" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_campaign_logs_created_at" ON "campaign_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_campaign_logs_campaign_created" ON "campaign_logs" USING btree ("campaign_id","created_at");