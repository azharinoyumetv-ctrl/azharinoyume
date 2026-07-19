import bcrypt from "bcrypt";
import { describe, expect, it } from "vitest";
import { parseLoginCredentials, verifyPasswordHash } from "./password";

describe("password authentication", () => {
  it("normalizes valid email credentials", () => {
    expect(parseLoginCredentials({ email: "  Admin@Example.COM ", password: "correct horse" })).toEqual({
      email: "admin@example.com",
      password: "correct horse",
    });
  });

  it("rejects malformed and oversized credentials", () => {
    expect(parseLoginCredentials({ email: "not-an-email", password: "secret" })).toBeNull();
    expect(parseLoginCredentials({ email: "admin@example.com", password: "x".repeat(257) })).toBeNull();
  });

  it("accepts only the password matching the stored bcrypt hash", async () => {
    const hash = await bcrypt.hash("real-password", 4);
    await expect(verifyPasswordHash("real-password", hash)).resolves.toBe(true);
    await expect(verifyPasswordHash("wrong-password", hash)).resolves.toBe(false);
    await expect(verifyPasswordHash("real-password", null)).resolves.toBe(false);
  });
});
