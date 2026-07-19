import { describe, expect, it } from "vitest";
import { sha256, timingSafeEqual } from "./crypto";

describe("security helpers", () => {
  it("compares secrets without accepting different lengths", () => {
    expect(timingSafeEqual("same", "same")).toBe(true);
    expect(timingSafeEqual("same", "different")).toBe(false);
  });

  it("produces a stable SHA-256 digest", () => {
    expect(sha256("azyume")).toBe("e3eb2f0c14e15368446feedb14d29d0f2fe7381ce2748af692e21610738a77d3");
  });
});
