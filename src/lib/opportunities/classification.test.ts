import { describe, expect, it } from "vitest";
import { campaignAllows, scoreOpportunity, type CanonicalOpportunity } from "./classification";

function opportunity(overrides: Partial<CanonicalOpportunity>): CanonicalOpportunity {
  return {
    externalId: "1",
    title: "Generic opportunity",
    description: "A sufficiently detailed legitimate opportunity description that explains the role, responsibilities, requirements, and expected outcomes.",
    sourceUrl: "https://jobs.example.com/1",
    source: "remotive",
    attribution: "Example",
    ...overrides,
  };
}

describe("opportunity classification and product routing", () => {
  it("keeps DevOps roles out of WMP even when the description mentions React and websites", () => {
    const result = scoreOpportunity(opportunity({
      title: "Senior DevOps Engineer",
      category: "Engineering",
      description: "Operate Kubernetes, Terraform, CI/CD, AWS, and production infrastructure. Collaborate with React teams and support the company website deployment pipeline.",
    }));
    expect(result.category).toBe("DevOps & Infrastructure");
    expect(result.productRoute).toBe("Opportunity Gap Radar");
    expect(result.routeDecision).toBe("PRODUCT_RESEARCH");
  });

  it("routes explicit video editing work to Azyume", () => {
    const result = scoreOpportunity(opportunity({ title: "Short-form Video Editor" }));
    expect(result.category).toBe("Video Editing");
    expect(result.productRoute).toBe("Azyume Studio");
    expect(result.routeDecision).toBe("DIRECT_FULFILMENT");
  });

  it("routes explicit website work to WMP", () => {
    const result = scoreOpportunity(opportunity({ title: "WordPress Website Developer" }));
    expect(result.category).toBe("Web Development");
    expect(result.productRoute).toBe("Website Master Platform");
  });

  it("does not route a marketing job to business systems from a stray CRM mention", () => {
    const result = scoreOpportunity(opportunity({
      title: "Lifecycle Marketing Manager",
      description: "Own lifecycle campaigns, email analytics, segmentation, and report campaign results in the existing CRM.",
    }));
    expect(result.category).toBe("Marketing");
    expect(result.productRoute).toBe("Opportunity Gap Radar");
  });

  it("applies category, job type, source, route, and minimum-budget campaign fields", () => {
    const job = opportunity({
      title: "Video Editor",
      engagementModel: "Contract",
      budgetType: "project",
      budgetPeriod: "project",
      budgetMin: 500,
      budgetMax: 800,
    });
    const allowed = campaignAllows(job, [{
      categories: ["Video Editing"],
      keywords: ["video"],
      excludedKeywords: [],
      locations: [],
      languages: ["en"],
      sources: ["remotive"],
      productRoutes: ["Azyume Studio"],
      jobTypes: ["Contract"],
      minimumBudget: 400,
    }]);
    expect(allowed).toBe(true);
  });

  it("rejects missing budgets when a campaign has a minimum", () => {
    const allowed = campaignAllows(opportunity({ title: "Video Editor" }), [{
      categories: [], keywords: [], excludedKeywords: [], locations: [], languages: [], sources: [], productRoutes: [], jobTypes: [], minimumBudget: 100,
    }]);
    expect(allowed).toBe(false);
  });
});
