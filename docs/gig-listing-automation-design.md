# Gig-listing & inbound-demand automation — design doc

Status: planning only, nothing built yet. Written for Azyume Cut AI (`azharinoyume` repo). Companion to `docs/job-scraper-bot-design.md` — this is the inbound acquisition channel (customers find your gig and order), the scraper doc is the outbound channel (you find leads and pitch them). Build this one first; see the sequencing note at the bottom of the scraper doc.

**Pricing-model flag**: section 3's tiering assumes the current flat packages (Basic/Plus/Premium). You've confirmed the intent is to migrate to per-second + wallet + subscription pricing later (see `azyume-cut-ai-project-briefing.md`) — not designed yet, but gig copy/tiers written against flat packages now will need a rewrite once that lands.

## 1. What this is

An n8n + Claude (and optionally ComfyUI) workflow that drafts gig listings for marketplaces (Fiverr, Upwork, Freelancer.com, etc.), generates portfolio visuals to go with them, and — when a client actually messages you through one of those gigs — turns that inbound message into a scored lead that flows through the exact same drafting/auto-order machinery already designed for the scraper.

## 2. Reality check before designing this further

Regular sellers don't get a public API to programmatically create or edit gigs on Fiverr, and most platforms don't expose inbound buyer messages to third-party bots either. So "automate gig creation" realistically means: Claude drafts the copy, you paste it in yourself. Same admin-in-the-loop pattern the job-scanner's proposal drafts already use — nothing here writes to a marketplace on your behalf, which also means none of the ToS risk that applies to the scraper doc applies here. Freelancer.com is worth checking separately since it does have an official API — if it covers gig/profile management, that's the one platform where actual write automation might be legitimate.

## 3. Gig-draft generation workflow (n8n)

New n8n workflow, manually triggered from the admin dashboard (a "Generate gig draft" button, not a schedule — you don't want new drafts appearing unprompted):

- **Input**: target platform, which package to promote (Basic/Plus/Premium — reuse the real prices: $49/$149/$399), and a niche/keyword focus. Reuse the same keyword list from the scraper doc's section 11 (anime edit, cinematic, corporate, nihongo-lesson, etc.) as the starting menu rather than inventing a second list.
- **Claude drafts**: gig title, description, the platform's standard 3-tier pricing structure (mapped to your Basic/Plus/Premium), tags/SEO keywords, and an FAQ section addressing common objections (turnaround time, revisions, footage requirements — all of which map directly to fields already in the `PACKAGES` data in `src/app/[locale]/(public)/packages/page.tsx`).
- **Output**: lands in a review screen in `/admin` (new `GigDraft` model — see below), not posted anywhere automatically. You copy/paste into the actual platform when you're happy with it.

## 4. Portfolio visuals (ComfyUI)

You flagged earlier that you don't have creative-industry sample work to show — this is the honest way to solve that: generate demo stills/thumbnails using ComfyUI that show the actual render styles your service produces (`cinematic`, `anime`, `minimal`, `corporate`, `energetic`, `nihongo-lesson` — the same composition IDs already in `remotion-render-service`). This is different from fabricating fake client testimonials — it's literally demoing your real product's output, which is a legitimate and common way sellers show capability before they have client history. Label it as a style demo, not a past client project, and it holds up honestly.

## 5. Data model additions (Prisma)

```prisma
model GigDraft {
  id            String   @id @default(uuid())
  platform      String              // "fiverr" | "upwork" | "freelancer"
  packageKey    String   @map("package_key")   // "basic" | "plus" | "premium"
  title         String?
  description   String?
  tiersJson     Json?    @map("tiers_json")
  tags          Json     @default("[]")
  faq           Json     @default("[]")
  status        String   @default("draft")   // draft | posted | archived
  createdAt     DateTime @default(now()) @map("created_at")

  @@map("gig_drafts")
}
```

No new model needed for inbound client messages — reuse `JobLead` exactly as the scraper doc defines it, with `source` set to something like `"fiverr_inbox"` / `"upwork_inbox"` instead of `"rss"`/`"fiverr_scrape"`. Same scoring, same Kanban, same auto-create-draft-order logic and 80%/65% margin rules from that doc apply unchanged.

## 6. Inbound client-demand flow

Since there's no API to read a platform's inbox for you, this step stays manual at the intake point, automated everywhere after:

1. A client messages you on Fiverr/Upwork through the gig. You read it on your phone, same as today.
2. New admin action: "Paste inbound message" — a small form (platform, paste the message text, optional budget if mentioned). Submitting it calls the *same* `/api/n8n/score-lead` and `/api/n8n/save-lead` routes the scraper uses, just triggered by a paste instead of a scrape.
3. From there it's identical to the scraper pipeline: scored, shown in the Leads Kanban, auto-drafted into an `Order` if it clears the score/margin thresholds, admin reviews and reaches out.

This is the piece that makes building gigs-first the efficient order: steps 2–3 of this section and all of the scraper's auto-order logic are the same code. Build it once here, the scraper reuses it later instead of duplicating it.

## 7. Roadmap

1. `GigDraft` model + admin generation screen + "paste inbound message" intake form.
2. Wire the paste-in intake to the existing `score-lead`/`save-lead` routes (reused, not rebuilt).
3. Post 2-3 gig drafts manually on your chosen platform(s), generate portfolio visuals via ComfyUI to go with them.
4. Once inbound demand is flowing and the scoring/auto-order path is proven with real messages, come back to the scraper doc for the outbound channel — it'll reuse everything built here.

## 8. Open decisions

- Which platform(s) to start with (Fiverr vs. Upwork vs. Freelancer.com — Freelancer's official API makes it worth checking first for any real write-automation potential).
- Whether ComfyUI runs locally on your machine or gets set up on the Hostinger VPS alongside the other services.
- Gig pricing-tier copy — the 3-tier structure most of these platforms expect doesn't map 1:1 to your 3 packages; needs a quick pass once you pick a platform.
