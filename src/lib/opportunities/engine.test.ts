import { describe, expect, it } from "vitest";
import {
  connectorTypeIsSupported,
  normalizeHimalayasJobs,
  normalizeRemoteOkJobs,
  normalizeRemotiveJobs,
  normalizeRssFeed,
  normalizeEmailAlert,
} from "./engine";

describe("opportunity connector normalization", () => {
  it("recognizes only implemented connector adapters", () => {
    expect(connectorTypeIsSupported("remotive_api")).toBe(true);
    expect(connectorTypeIsSupported("remoteok_api")).toBe(true);
    expect(connectorTypeIsSupported("himalayas_api")).toBe(true);
    expect(connectorTypeIsSupported("rss_feed")).toBe(true);
    expect(connectorTypeIsSupported("email_alerts_imap")).toBe(true);
    expect(connectorTypeIsSupported("official_api")).toBe(false);
  });

  it("preserves salary scale and period instead of treating it as a project budget", () => {
    const [job] = normalizeRemotiveJobs([{
      id: 12,
      url: "https://remotive.com/remote-jobs/software/senior-engineer-12",
      title: "Senior engineer",
      description: "Build and operate reliable distributed systems for global customers.",
      salary: "$80k - $100k per year",
    }]);
    expect(job).toMatchObject({
      budgetMin: 80_000,
      budgetMax: 100_000,
      budgetType: "salary",
      budgetPeriod: "year",
    });
  });

  it("normalizes RSS items without inventing missing jobs", () => {
    const jobs = normalizeRssFeed(`<?xml version="1.0"?><rss><channel><item><guid>job-1</guid><title>Video Editor</title><link>https://jobs.example.com/1</link><description><![CDATA[Edit weekly creator videos.]]></description><category>Creative</category></item><item><title>Missing URL</title></item></channel></rss>`, {
      source: "rss_example",
      attribution: "Example Jobs",
    });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      externalId: "job-1",
      source: "rss_example",
      title: "Video Editor",
      category: "Creative",
    });
  });

  it("normalizes an email alert using its real listing link", () => {
    const job = normalizeEmailAlert({
      messageId: "alert-1@example.com",
      subject: "Job alert: DevOps Engineer",
      text: "A new role is available: https://jobs.example.com/devops-1",
      from: "alerts@example.com",
    });
    expect(job).toMatchObject({
      externalId: "alert-1@example.com",
      title: "DevOps Engineer",
      sourceUrl: "https://jobs.example.com/devops-1",
      source: "email_alert",
    });
  });

  it("normalizes Remotive records and drops incomplete rows", () => {
    const jobs = normalizeRemotiveJobs([
      {
        id: 10,
        url: "https://remotive.com/remote-jobs/design/video-editor-10",
        title: "Video editor",
        description: "<p>Edit creator videos</p>",
        salary: "$300 - $500",
        candidate_required_location: "Worldwide",
      },
      { id: 11, title: "Missing URL" },
    ]);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      externalId: "10",
      source: "remotive",
      attribution: "Remotive",
      description: "Edit creator videos",
      budgetMin: 300,
      budgetMax: 500,
    });
  });

  it("ignores the Remote OK terms row and retains attribution", () => {
    const jobs = normalizeRemoteOkJobs([
      { description: "API terms" },
      {
        id: "20",
        position: "Social video producer",
        description: "<p>Create reels</p>",
        apply_url: "https://remoteok.com/remote-jobs/20",
        salary_min: 60_000,
        salary_max: 80_000,
      },
    ]);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      externalId: "20",
      source: "remoteok",
      attribution: "Remote OK",
      description: "Create reels",
      currency: "USD",
    });
  });

  it("repairs UTF-8 punctuation that a source decoded as Latin-1", () => {
    const jobs = normalizeRemoteOkJobs([
      {
        id: 17,
        position: "Editor",
        url: "https://remoteok.com/remote-jobs/17",
        description: "Remote \u00e2\u0080\u0094 creator\u00e2\u0080\u0099s role",
      },
    ]);

    expect(jobs[0]?.description).toBe("Remote — creator’s role");
  });

  it("repairs non-breaking spaces before whitespace normalization", () => {
    const brokenSpace = String.fromCharCode(0xc2, 0xa0);
    const jobs = normalizeRemoteOkJobs([
      {
        id: 18,
        position: "Editor",
        url: "https://remoteok.com/remote-jobs/18",
        description: `Remote${brokenSpace}hiring`,
      },
    ]);

    expect(jobs[0]?.description).toBe("Remote hiring");
  });

  it("repairs upstream mojibake in opportunity titles", () => {
    const brokenMiddleDot = String.fromCharCode(0xc2, 0xb7);
    const brokenAWithTilde = String.fromCharCode(0xc3, 0xa3);
    const jobs = normalizeRemoteOkJobs([
      {
        id: 19,
        position: `Product Manager ${brokenMiddleDot} S${brokenAWithTilde}o Paulo`,
        url: "https://remoteok.com/remote-jobs/19",
        description: "Own the product roadmap",
      },
    ]);

    expect(jobs[0]?.title).toBe("Product Manager · São Paulo");
  });

  it("normalizes Himalayas salary, location, and stable GUID", () => {
    const jobs = normalizeHimalayasJobs([
      {
        guid: "https://himalayas.app/jobs/30",
        applicationLink: "https://himalayas.app/jobs/30",
        title: "Automation specialist",
        description: "<p>Build n8n workflows</p>",
        locationRestrictions: [{ name: "Worldwide", alpha2: "WW" }],
        employmentType: "Contractor",
        minSalary: 50,
        maxSalary: 80,
        currency: "USD",
        categories: ["Automation"],
        pubDate: 1_788_000_000_000,
      },
    ]);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      externalId: "https://himalayas.app/jobs/30",
      source: "himalayas",
      attribution: "Himalayas",
      location: "Worldwide",
      engagementModel: "Contractor",
      budgetMin: 50,
      budgetMax: 80,
      publishedAt: new Date(1_788_000_000_000).toISOString(),
    });
  });
});
