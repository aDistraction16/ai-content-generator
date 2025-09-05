CREATE TABLE "content" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"topic" varchar(255) NOT NULL,
	"keyword" varchar(255),
	"generated_text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"scheduled_at" timestamp,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"potential_reach_metric" integer DEFAULT 0,
	"content_type" varchar(50) NOT NULL,
	"platform_target" varchar(50),
	"word_count" integer DEFAULT 0,
	"character_count" integer DEFAULT 0,
	"user_edited" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"report_date" timestamp DEFAULT now() NOT NULL,
	"total_content_generated" integer DEFAULT 0,
	"total_potential_reach" integer DEFAULT 0,
	"pdf_report_path" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"content_generations_count" integer DEFAULT 0,
	"api_calls_count" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"session_token" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "content" ADD CONSTRAINT "content_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_usage" ADD CONSTRAINT "user_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;