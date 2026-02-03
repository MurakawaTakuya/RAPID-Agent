CREATE TABLE "papers" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"abstract" text,
	"authors" text,
	"embedding" vector(768),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "papers_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"display_name" varchar(100),
	"photo_url" text,
	"created_at" timestamp DEFAULT now()
);
