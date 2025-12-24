CREATE TABLE "user_balances" (
	"user_id" text PRIMARY KEY NOT NULL,
	"balance" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_recharged" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_used" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_balances" ADD CONSTRAINT "user_balances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;