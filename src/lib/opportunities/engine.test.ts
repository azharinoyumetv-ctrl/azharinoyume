import { describe, expect, it } from "vitest";
import {
  connectorTypeIsSupported,
  normalizeHimalayasJobs,
  normalizeRemoteOkJobs,
  normalizeRemotiveJobs,
} from "./engine";

describe("opportunity connector normalization", () => {
  it("recognizes only implemented connector adapters", () => {
    expect(connectorTypeIsSupported("remotive_api")).toBe(true);
    expect(connectorTypeIsSupported("remoteok_api")).toBe(true);
    expect(connectorTypeIsSupported("himalayas_api")).toBe(true);
    expect(connectorTypeIsSupported("official_api")).toBe(false);
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
