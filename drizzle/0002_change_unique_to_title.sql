ALTER TABLE "papers" DROP CONSTRAINT "papers_url_unique";--> statement-breakpoint
ALTER TABLE "papers" ADD CONSTRAINT "papers_title_unique" UNIQUE("title");