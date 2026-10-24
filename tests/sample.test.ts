import { describe, it, expect } from "vitest";
import fc from "fast-check";

describe("sample", () => {
  it("does basic math", () => {
    expect(1 + 1).toBe(2);
  });

  it("string concatenation is associative (property)", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), fc.string(), (a, b, c) => {
        expect((a + b) + c).toBe(a + (b + c));
      }),
    );
  });
});
