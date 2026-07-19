# Lead-scraper bot — design doc

Status: planning only, nothing built yet. Written for Azyume Cut AI (`azharinoyume` repo) to pick up in a future session.

**Pricing-model flag**: the margin logic in section 5 assumes the current flat one-time packages (Basic $49/Plus $149/Premium $399). You've confirmed the intent is to migrate to per-second + wallet + subscription pricing (see `azyume-cut-ai-project-briefing.md`), just not designed yet. When that migration doc exists, section 5's package-matching logic needs to be redone against consumption-based pricing instead of flat tiers — noting it here so it isn't missed.

## 1. What this is

Extend the existing job-lead pipeline (`JobLead` / `ProposalDraft`, RSS-only job scanner, admin Kanban) with a scraper that pulls leads from Fiverr, Freelancer.com, Facebook groups, and additional RSS/API boards, scores them with Claude, and — for high-score matches — auto-creates a draft `Order` in the video-cut pipeline for admin review.

## 2. Risk framing (read this first)

The current system was deliberately built RSS-only, with copy in the admin UI stating "no scraping, no automated applying." You've chosen to accept the risk of scraping Fiverr and Facebook groups, which is worth being explicit about before building:

- Upwork and Fiverr's terms of service prohibit scraping and bot access. Freelancer.com has an official API — no ToS conflict there. Facebook's terms also restrict automated scraping of groups.
- Consequence of getting caught is almost always account/IP bans, not a lawsuit — but if a scraper account or IP is tied to your real business identity, a ban can cascade (e.g., losing a Fiverr seller account you also use legitimately).
- This is not legal advice, and enforcement/case law in this area (e.g., hiQ v. LinkedIn) is genuinely unsettled — if this business depends on staying on any of these platforms long-term, it's worth a real legal read before scaling it up.

Mitigations baked into the design below: isolate scraper egress traffic from your storefront's IP, keep a kill-switch per source, keep everything admin-review-gated (no auto-apply, no auto-payment, no auto-messaging on the source platform), and log every run so a ban shows up immediately instead of silently.

## 3. Data model additions (Prisma)

```prisma
model ScraperSource {
  id                String   @id @default(uuid())
  key               String   @unique   // "fiverr" | "freelancer" | "facebook_groups" | "rss:<slug>"
  displayName       String
  method            String              // "scrape" | "api" | "rss"
  enabled           Boolean  @default(false)
  config            Json     @default("{}")   // keywords, category ids, group urls, api creds ref
  scheduleMinutes   Int      @default(240)
  lastRunAt         DateTime?
  lastStatus        String?             // "ok" | "blocked" | "error" | "empty"
  consecutiveErrors Int      @default(0)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  runs ScraperRun[]

  @@map("scraper_sources")
}

model ScraperRun {
  id           String    @id @default(uuid())
  sourceId     String    @map("source_id")
  startedAt    DateTime  @default(now()) @map("started_at")
  finishedAt   DateTime? @map("finished_at")
  itemsFound   Int       @default(0) @map("items_found")
  itemsSaved   Int       @default(0) @map("items_saved")
  status       String    @default("running")  // running | ok | blocked | error
  errorMessage String?   @map("error_message")

  source ScraperSource @relation(fields: [sourceId], references: [id])

  @@map("scraper_runs")
}

model ScraperSettings {
  id                    String  @id @default("singleton")
  keywordsInclude        Json   @default("[]") @map("keywords_include")
  keywordsExclude        Json   @default("[]") @map("keywords_exclude")
  minBudget              Decimal? @map("min_budget") @db.Decimal(10,2)
  maxBudget              Decimal? @map("max_budget") @db.Decimal(10,2)
  minScoreToShow         Int     @default(65) @map("min_score_to_show")
  minScoreToAutoOrder    Int     @default(85) @map("min_score_to_auto_order")
  autoOrderEnabled       Boolean @default(false) @map("auto_order_enabled")
  targetProfitMarginPct  Int     @default(80) @map("target_profit_margin_pct")
  minProfitMarginPct     Int     @default(65) @map("min_profit_margin_pct")
  updatedAt              DateTime @updatedAt @map("updated_at")

  @@map("scraper_settings")
}
```

`JobLead` gets three new optional fields: `draftOrderId String? @map("draft_order_id")` (relation to `Order`), `rawSnapshot Json? @map("raw_snapshot")` for debugging what the scraper actually saw, and `matchedKeyword String? @map("matched_keyword")` — without this, you can only see conversion by source (Fiverr vs. Freelancer vs. RSS), not by which specific keyword pulled in a lead that actually won. Since the point of the starter keyword list is to refine it once you can see what's converting vs. noise, you need this field or there's nothing to refine against — group `JobLead` by `matchedKeyword`, filter `pipelineStatus = won`, and the winners tell you which keywords to keep.

## 4. Scraper worker service

Follow the same pattern already used for Remotion: a small tenant-agnostic Node service, not bolted into the Next.js app. New repo/folder: `lead-scraper-service`, deployed via PM2 on the same VPS.

- **RSS/API sources** (existing RSS boards + Freelancer.com's official API): plain HTTP polling, no browser needed, no ToS risk. Keep these running through n8n exactly as today — just add nodes for Freelancer.com and any extra boards.
- **Scrape sources** (Fiverr buyer requests, Facebook groups): Playwright with a persisted browser profile (cookies/session), same install step as Remotion (`npx playwright install --with-deps`). Runs headless, on its own schedule per `ScraperSource.scheduleMinutes`.
- Each run: fetch → dedupe against `JobLead.sourceUrl` → score via the existing `/api/n8n/score-lead` (Claude Haiku) → if `score >= minScoreToShow`, save via `/api/n8n/save-lead` → if `score >= minScoreToAutoOrder` and `autoOrderEnabled`, call a new `/api/n8n/auto-create-order` route.
- Every run writes a `ScraperRun` row (found/saved counts, status). Three consecutive `blocked` statuses on a source auto-disables it (`enabled = false`) and surfaces a dashboard alert — this is the "ban shows up immediately" safeguard.

## 5. Auto-create draft order flow

New route `/api/n8n/auto-create-order`, mirroring `POST /api/orders` but forced into a safe state:

- `status: "draft"`, `manualReviewRequired: true`, `adminApproved: false` — nothing customer-facing happens, no payment is collected, no email goes out.
- `package` inferred from budget tier, using your real prices (Basic $49, Plus $149, Premium $399) and the existing `COST_CAP_BASIC/PLUS/PREMIUM` env vars as the cost estimate per tier:
  - Match the lead to the **cheapest package whose list price the lead's stated budget can cover**, priced at full list (no discount). Since your cost caps are presumably already set to land around your target margin, this is the "default, use it often" path — 80% profit margin, matching what you use for the main site.
  - If the budget is below Basic ($49) entirely, don't auto-create an order — leave it as a scored lead only; it's not worth drafting.
  - If the budget sits between the package's 65%-margin price floor and its full list price (i.e. the lead is implicitly asking for a discount), still create the draft order but tag it `pricingNote: "negotiated — needs admin discount approval"` instead of silently discounting. The 65% floor (`minProfitMarginPct`) is the hard deck for a human to approve, never applied automatically — matches your "don't use it often, default is 80%" instruction.
- `customerPromptOriginal` = the scraped job description, `customerEmail` = a placeholder until an admin actually reaches out and gets a real one.
- Links back via `JobLead.draftOrderId` so the Kanban card shows "→ Order #X (draft)".
- Admin reviews in the existing `/admin/orders` view like any other draft order.

## 6. Admin dashboard additions — filters & scrape settings

New `/admin/scraper` page:

- **Source cards** — one per `ScraperSource`: enable/disable toggle, method badge (scrape/api/rss), last run time + status pill, consecutive-error count, "Run now" button.
- **Global filters panel** — editable `ScraperSettings`: include/exclude keyword chips, budget range (dual slider), min score to show (slider, default 65), min score to auto-order (slider, default 85), auto-order on/off switch, per-source schedule interval.
- **Run log feed** — recent `ScraperRun` rows, newest first, with items found/saved and a link to error detail when status is `blocked`/`error`.
- **Kill switch** — one button that flips every `ScraperSource.enabled` to false.

This slots in next to the existing Leads Kanban (`/admin/leads`), which stays as-is for reviewing what the scraper produced.

## 7. Deployment — Hostinger VPS KVM, static IP

- **Domains**: you have `dagangos.com` and `azharinoyume.cloud`, both already yours — no new domain purchase needed. Plan is subdomains off the latter: `azcutai.azharinoyume.cloud` for the main storefront/app, `azbot.azharinoyume.cloud` for this scraper/bot dashboard specifically. `dagangos.com` stays out of scope here (that's the PT entity's own domain, presumably for other ventures like GerainaOS). Note `DEPLOY.md`'s current nginx example uses `render.azharinoyume.cloud` for the render microservice — keep that one as-is, it's a third, separate subdomain for internal service-to-service traffic, not customer- or admin-facing.
- Once `azcutai`/`azbot` are decided, the Cloudflare Tunnel (below) should route to `azbot.azharinoyume.cloud` specifically, and `NEXT_PUBLIC_APP_URL`/`NEXTAUTH_URL` in the main app's `.env` need updating to match wherever `azcutai.azharinoyume.cloud` actually points.
- **R2 bucket**: already created in Cloudflare per your note — one less setup step, just needs its key/bucket name dropped into `.env` (`R2_*` vars already scaffolded in `.env.example`).
- A Hostinger **KVM** VPS plan already ships with a dedicated static IPv4 — that requirement is satisfied by the hosting choice itself, nothing extra to configure.
- Run `lead-scraper-service` under PM2 alongside the existing `azharinoyume` and `remotion-render-service` processes (same `ecosystem.config.js` pattern).
- **Important nuance**: don't route scrape traffic to Fiverr/Facebook through the VPS's bare static IP if that same IP also serves your storefront, webhooks, and payment callbacks. A scraping block on that IP takes the whole business offline, not just the bot. Recommend a separate residential/rotating proxy (e.g. a paid proxy provider) specifically for the `scrape`-method sources, so a ban only kills lead generation, never the storefront. This is worth budgeting for before flipping `autoOrderEnabled` on.
- Chromium/Playwright deps installed the same way Remotion's browser dependency is (`DEPLOY.md` already documents `npx remotion browser ensure` — add the Playwright equivalent alongside it).
- **Cloudflare Tunnel** — you already have a working `cloudflared` tunnel from a previous bot project (demo-only so far, not run in production). It's the right tool to expose the `/admin/scraper` dashboard without opening VPS ports, but it's strictly *inbound* (your dashboard → the internet) — it does not proxy the scraper's *outbound* scrape requests to Fiverr/Facebook. That egress question is decided separately in section 12 (residential proxy, not Cloudflare). Before relying on the tunnel in production: switch to a named tunnel with a token (not a quick/trycloudflare tunnel, which is throwaway and not meant to stay up), run `cloudflared` as a systemd service so it survives reboots and auto-restarts, and put some kind of uptime check on it since a demo-only tunnel has never been tested for staying alive unattended.

## 8. Mobile/tablet access, any network

Good news: admin routes are already gated purely by a NextAuth session cookie (`src/middleware.ts`) — there's no IP whitelist actually enforced today despite `ADMIN_IP_WHITELIST` existing in `.env.example` (it's unused/dead). So logging into `/admin` from a phone on cellular already works with zero changes. Reachability from your phone/tablet is really the Cloudflare Tunnel piece in section 7 — once that's production-hardened, the same URL is reachable over wifi or cellular with no VPN.

To make it feel like a real mobile dashboard rather than a shrunk desktop page:

- Add a PWA manifest + service worker (`next-pwa`) so it installs to the home screen and gets an app-like shell — moderate lift, no backend changes.
- **On 2FA**: confirmed not needed — this dashboard is personal-use only (just you), so mandatory TOTP (a code from an authenticator app at login, separate from how often you'd have to re-log-in) isn't worth the friction here. The `otpauth`/`qrcode` scaffolding stays in the schema unused for now, available later if you ever add other admin users. This is separate from the customer-facing site: once that's public, *its* auth (customer login/signup) is a different concern from this personal admin/bot dashboard and should get its own pass when you get there.
- Optional push notifications for new high-score leads (web push), phase 2.

## 9. UI/UX redesign (fullstack app + bot dashboard)

Scoped as its own workstream, done after the scraper is functional rather than blocking it:

- One shared design system/tokens across the customer-facing site and the new admin/scraper dashboard, mobile-first (current stack: Tailwind + Radix primitives — keep or evolve into a small shadcn-style component set).
- Recommendation: skip Figma, redesign directly in React/Tailwind with Claude driving both design and implementation. This is a solo-founder project with no separate design/dev handoff — Figma earns its overhead when a design file needs sign-off from stakeholders who aren't the ones coding it, or when a design system has to be shared across a design team. Neither applies here, and a Figma file is one more artifact that drifts from the real implementation over time (there isn't one in this repo today). Working directly in code also means every redesigned screen is checked against real data and real states (loading, empty, mobile breakpoints) instead of a static mockup.

If you want to compare a couple of visual directions before committing to full implementation, a lighter middle ground is a quick throwaway HTML mockup of one or two key screens (the order flow, the scraper dashboard) to agree on a direction — cheaper than standing up a full Figma library, and gets thrown away once code-in-browser takes over.

## 10. Phased roadmap

**Sequencing note**: build `docs/gig-listing-automation-design.md` first — it's the inbound channel (customers find your gig, order directly), reuses infrastructure you already have (payments, Order pipeline), and has none of this doc's ToS/proxy risk. It also builds the scoring + auto-order intake logic this doc reuses rather than rebuilding. Come back here once that's live and proven.

1. **Schema + settings UI** — `ScraperSource`/`ScraperRun`/`ScraperSettings` models, `/admin/scraper` filters page. Zero ToS risk, ships the control surface first.
2. **Compliant sources** — Freelancer.com official API + additional RSS/API boards, wired through existing n8n pattern. Real leads flowing with no scraping risk at all.
3. **Scrape sources** — Playwright worker for Fiverr + Facebook groups, isolated proxy, kill-switch, run logging.
4. **Auto-order wiring** — `/api/n8n/auto-create-order`, admin review queue integration.
5. **Mobile hardening** — PWA install, TOTP enforcement.
6. **UI/UX redesign** — fullstack + dashboard, once the above is stable.

## 11. Starter keyword list (you said you don't know these yet — fair, this is a first pass to refine once real leads start flowing)

Include (title/description match):
`video editor`, `video editing`, `edit my video`, `video editor needed`, `reels editor`, `shorts editor`, `youtube video editor`, `instagram reels edit`, `cinematic video edit`, `product video editing`, `video color grading`, `video captions` / `subtitles editor`, `anime edit` / `anime style video`, `corporate video edit`, `wedding video editor`, `japanese lesson video` / `language lesson video edit` (this one specifically because your render service already has a `nihongo-lesson` composition — worth targeting that niche directly if it's real demand).

Exclude (common false-positive noise on these feeds):
`photo editor` / `photoshop` (different service), `logo design`, `graphic design`, `voice over` (unless you plan to offer it), `app development`, `website development`, `SEO`, `data entry`, `virtual assistant`.

Budget bands are still an open item below since they need to map to your real package pricing (`/packages` page), which I haven't reviewed against this yet.

## 12. Open decisions before building starts

- ~~Budget bands / package-tier mapping~~ — resolved: 80% target profit margin by default (same as the main site), 65% hard floor only for admin-approved negotiated deals, never applied automatically. See section 5 and the `ScraperSettings` fields in section 3.
- ~~Scraper egress proxy~~ — resolved: pay for a rotating/residential proxy for the `scrape`-method sources (Fiverr, Facebook groups). Cloudflare Tunnel (section 7) only covers *inbound* access to your own dashboard — it doesn't touch the scraper's *outbound* requests. Cloudflare does have a WARP/Zero Trust egress option that was considered, but that traffic comes from Cloudflare's own datacenter IP ranges, which anti-bot systems tend to flag more readily than residential IPs — worse for stealth, not better. A real residential/rotating proxy is the one that actually reduces block risk here.
- Refine the starter keyword list above once the scraper's been running for a couple weeks and you can see what's actually converting vs. noise.

## 13. Noted for later — not part of this doc's scope

Two feature ideas came up while reviewing this that belong to the render/editing engine, not the scraper. Logging them here so they're not lost, but they need their own design pass (they touch `remotion-render-service` and the composition library, e.g. `nihongo-lesson`/`cinematic`/`anime`):

- **360° camera editing** — support for Insta360/DJI-style 360° footage as a source format in the render pipeline.
- **Automatic invisible selfie-stick removal** — action-cam footage (Insta360/DJI) often shows the selfie stick in frame; both those brands have a feature that auto-detects and paints it out so the shot looks stick-free. Worth its own scoping session to figure out where that processing step happens (client-side pre-process vs. a render-service stage) before touching the 360° item above.
