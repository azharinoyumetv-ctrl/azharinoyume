import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Azyume Studio",
  description: "Terms for Azyume Studio accounts, project payments, automated production, review, and delivery.",
};

const sections = [
  {
    title: "Service",
    body: "Azyume Studio provides guided, automated video-production services. Customers upload or link source media, select production requirements, approve a structured brief, pay for the selected project, and receive drafts and final deliverables according to the purchased package.",
  },
  {
    title: "Accounts and security",
    body: "You must provide accurate information, protect your login credentials, and promptly report suspected unauthorized access. You are responsible for activity performed through your account unless the activity results from a failure within Azyume systems.",
  },
  {
    title: "Payments and invoices",
    body: "An invoice is created before payment. Expensive production work begins only after payment confirmation or authorized approval of a supported manual transfer. Prices, currency, package limits, add-ons, and applicable taxes or fees are shown before payment.",
  },
  {
    title: "Source media and permissions",
    body: "You confirm that you own or have permission to upload and use all submitted footage, audio, fonts, logos, prompts, and reference material. You must not submit unlawful, harmful, deceptive, infringing, or privacy-violating content.",
  },
  {
    title: "Briefs, drafts, and revisions",
    body: "The confirmed production brief defines the agreed scope. Included revisions correct or refine work within that brief. New footage, a different style or platform, longer output, additional formats, or other expanded requirements may require a new quotation or add-on.",
  },
  {
    title: "Cancellations and refunds",
    body: "Before production begins, eligible customer cancellations may receive account credit or a cash refund less disclosed, non-recoverable provider costs. After analysis or planning begins, completed work and consumed third-party costs are not refundable. After draft delivery, Azyume first provides correction, re-rendering, or included revisions. A suitable credit or refund is available when Azyume cannot deliver a material confirmed requirement. Duplicate charges and validated unauthorized payments are handled separately.",
  },
  {
    title: "Delivery and review",
    body: "Queue estimates are operational estimates, not guaranteed completion times. Customers must review drafts within the period shown for the selected package. Final deliverables remain available according to the applicable retention period; customers should download and safely archive completed files.",
  },
  {
    title: "Customer content and showcase consent",
    body: "You retain your rights in submitted content. You grant Azyume the limited permission needed to process, render, review, and deliver the project. Azyume may publish a testimonial, prompt, name, brand, or video only for the specific showcase uses you explicitly approve.",
  },
  {
    title: "Availability and support",
    body: "We work to keep the platform reliable, but processing can be delayed by large files, queue load, service-provider incidents, manual review, or failed quality checks. We may pause a project to protect customer data, resolve ambiguous requirements, control cost, or investigate abuse.",
  },
  {
    title: "Contact",
    body: "Questions about these terms, an invoice, or a project may be sent to support@azharinoyume.cloud.",
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div className="mb-10 sm:mb-14">
        <div className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-amber-300">Legal</div>
        <h1 className="mb-4 text-4xl font-black sm:text-5xl">Terms of Service</h1>
        <p className="max-w-2xl leading-relaxed text-muted-foreground">
          These terms describe the project, payment, production, review, and delivery rules for Azyume Studio.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: July 31, 2026</p>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <section key={section.title} className="glass rounded-2xl border border-white/5 p-5 sm:p-7">
            <h2 className="mb-3 text-xl font-bold">{section.title}</h2>
            <p className="leading-relaxed text-muted-foreground">{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
