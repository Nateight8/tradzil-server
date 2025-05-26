ALTER TABLE "conversation_participants" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "conversations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "messages" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "conversation_participants" CASCADE;--> statement-breakpoint
DROP TABLE "conversations" CASCADE;--> statement-breakpoint
DROP TABLE "messages" CASCADE;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "onboarding_completed" boolean;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "provider_account_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "goals" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "experience_level" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "biggest_challenge" text[];--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "onboarding_step" text DEFAULT 'account_setup' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN IF EXISTS "onboardingCompleted";--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_provider_account_id_unique" UNIQUE("provider_account_id");--> statement-breakpoint
DROP TYPE "public"."message_status";