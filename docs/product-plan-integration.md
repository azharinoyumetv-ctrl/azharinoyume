# Azyume Studio and DagangOS Opportunity Engine integration

## Product authority

The current implementation uses the latest **Repurposing Bot for Jobs** plan as
the product authority. The earlier **Integrated Video Editing Tools** plan is
historical context where it does not conflict with the newer plan.

## Public Azyume Studio

Azyume is a guided automated post-production service, not a manual browser
timeline editor.

Implemented flow:

1. Choose a project tier and visual direction.
2. Clarify audience, purpose, story priority, mandatory content, exclusions,
   creative freedom, mood, pacing, color, captions, and music.
3. Choose platform, aspect ratio, resolution, frame rate, format, compression,
   and target duration.
4. Resolve material conflicts and confirm the production brief.
5. Upload and verify the source media.
6. Generate a fresh project quote and pending invoice.
7. Keep analysis and rendering locked until signed payment reconciliation.
8. Persist analysis, edit-plan, timeline-manifest, and QA artifacts separately.
9. Review a draft, submit an in-scope revision, approve, and receive final
   delivery.

The canonical style registry is shared by the gallery and order workflow so
`/order?style=...` uses the same identifier and defaults shown in the gallery.

### Project pricing

| Tier | Base price | Source allowance | Finished allowance |
| --- | ---: | ---: | ---: |
| Basic | $14.99 | 10 minutes | 60 seconds |
| Plus | $44.99 | 30 minutes | 5 minutes |
| Premium | $129.99 | 60 minutes | 10 minutes |

The old wallet and credit system remains in the codebase only for compatibility
with historical purchases. New public production orders use one project, one
invoice, and one payment.

## Production intelligence contracts

The database now separates:

- approved customer brief;
- media-analysis manifest;
- versioned edit plan;
- deterministic timeline manifest and checksum;
- render attempt;
- automated QA result;
- human-review escalation.

The production state machine prevents payment, analysis, planning, draft QA,
customer review, and final QA gates from being skipped.

The `POST /api/n8n/production-artifacts` endpoint accepts authenticated
production artifacts from the orchestration workflow and checks their
prerequisites before saving them.

## Private DagangOS Opportunity Engine

The private dashboard now provides separate operational views for:

- All Opportunities
- Search Campaigns
- Sources and Connectors
- Proposals
- Applications
- Contracts
- Customer Interviews

The canonical opportunity schema includes industry, service family, category,
deliverables, required skills, location, budget model, separate legitimacy,
capability, profitability, and risk scores, product route, routing decision,
policy status, and risk flags.

`POST /api/n8n/save-lead` now requires a source identifier or source URL,
normalizes the opportunity, and deduplicates it. It does not create fake
fallback jobs.

Marking an opportunity won creates a contract and an unresolved customer
interview. It does not create a production project. Production remains blocked
until ambiguity, missing assets, commercial terms, product specifications,
margin, acceptance criteria, and customer approval are resolved.

## Deployment prerequisites

Run the three new migrations and seed or upsert the project pricing products
before deploying the web build.

The existing Remotion service still renders the legacy style composition
contract. It does not yet consume the new deterministic timeline manifest.
Therefore, the web app correctly stops a new project at
`DRAFT_READY_TO_RENDER` until the render-service repository is updated to
accept and validate that manifest. Do not bypass this gate by sending the
customer prompt directly to the renderer.

The remaining cross-repository work is:

1. implement timeline-manifest consumption in `remotion-render-service`;
2. update n8n production workflows to generate the new analysis, plan,
   timeline, and QA artifacts;
3. add product-specific interview forms and specification approval actions;
4. add connector setup and campaign mutation screens;
5. add Market Gap Radar aggregation after sufficient normalized opportunity
   history exists;
6. complete stage-based cancellation, correction-first refunds, and gateway
   fee accounting in the live payment environment.
