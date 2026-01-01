CREATE TABLE "admin_model_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" varchar(100) NOT NULL,
	"model_id" varchar(200) NOT NULL,
	"display_name" varchar(200),
	"description" text,
	"type" varchar(20) DEFAULT 'chat',
	"ability_function_call" boolean DEFAULT false,
	"ability_vision" boolean DEFAULT false,
	"ability_reasoning" boolean DEFAULT false,
	"ability_search" boolean DEFAULT false,
	"ability_image_output" boolean DEFAULT false,
	"ability_video" boolean DEFAULT false,
	"context_window_tokens" integer,
	"max_output_tokens" integer,
	"input_price" numeric(20, 10),
	"output_price" numeric(20, 10),
	"multiplier" numeric(5, 2) DEFAULT '1.0',
	"is_custom" boolean DEFAULT false,
	"enabled" boolean DEFAULT true,
	"sort" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_provider_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" varchar(100) NOT NULL,
	"display_name" varchar(200),
	"base_url" text NOT NULL,
	"api_key_encrypted" text NOT NULL,
	"enabled" boolean DEFAULT true,
	"sort" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_provider_config_provider_unique" UNIQUE("provider")
);
--> statement-breakpoint
CREATE TABLE "admin_settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
