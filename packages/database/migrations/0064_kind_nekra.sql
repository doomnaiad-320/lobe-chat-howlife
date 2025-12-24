CREATE TABLE "balance_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" varchar(20) NOT NULL,
	"amount" numeric(10, 4) NOT NULL,
	"balance_before" numeric(10, 4) NOT NULL,
	"balance_after" numeric(10, 4) NOT NULL,
	"description" text,
	"related_request_id" text,
	"operator_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "balance_logs" ADD CONSTRAINT "balance_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;