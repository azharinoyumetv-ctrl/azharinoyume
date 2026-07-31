import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Azyume Studio",
  description: "How Azyume Studio handles customer accounts, payments, footage, and production data.",
};

const sections = [
  {
    title: "Information we collect",
    body: "We collect the account, contact, invoice, payment status, production brief, uploaded media, review comments, and technical records needed to provide the service. Payment providers process payment credentials; Azyume stores provider references and reconciliation records rather than full card details.",
  },
  {
    title: "How we use information",
    body: "We use customer information to authenticate accounts, validate uploads, translate and structure production instructions, create and deliver edits, issue invoices, reconcile payments, provide support, prevent abuse, and measure service cost and reliability.",
  },
  {
    title: "Media processing and AI",
    body: "Uploaded media and instructions may be processed by Azyume infrastructure and configured service providers for analysis, transcription, translation, editing, rendering, quality checks, and delivery. Production does not begin until the related payment is confirmed or an authorized administrator approves a supported manual payment.",
  },
  {
    title: "Storage and access",
    body: "Customer uploads and rendered outputs are kept in private object storage. Access is provided through authenticated requests or short-lived signed links. Administrative access is restricted to authorized operators and recorded for sensitive actions.",
  },
  {
    title: "Sharing and publication",
    body: "We share information only with service providers required to operate the platform, comply with a lawful request, protect the service, or complete a customer-authorized transaction. A testimonial, prompt, name, brand, or video is never published as a showcase item without explicit customer consent and administrator approval.",
  },
  {
    title: "Retention and deletion",
    body: "Records are retained for delivery, security, accounting, dispute handling, and legal obligations. Media retention can vary by package and project state. Customers may request access, correction, or deletion, subject to records that must be retained for legitimate accounting, fraud prevention, or legal purposes.",
  },
  {
    title: "Contact",
    body: "For privacy questions or account-data requests, contact support@azharinoyume.cloud from the email address associated with your account.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div className="mb-10 sm:mb-14">
        <div className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-amber-300">Legal</div>
        <h1 className="mb-4 text-4xl font-black sm:text-5xl">Privacy Policy</h1>
        <p className="max-w-2xl leading-relaxed text-muted-foreground">
          This policy explains how Azyume Studio handles information used by the customer studio and private opportunity system.
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
