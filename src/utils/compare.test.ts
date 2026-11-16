import { describe, expect, it } from "vitest";
import { normalize, outputsMatch } from "./compare";

describe("normalize", () => {
  it("strips trailing whitespace on each line", () => {
    expect(normalize("6  \n42\t\n")).toBe("6\n42");
  });

  it("drops trailing blank lines", () => {
    expect(normalize("6\n\n\n")).toBe("6");
  });

  it("treats null/undefined as empty string", () => {
    expect(normalize(null)).toBe("");
    expect(normalize(undefined)).toBe("");
  });
});

describe("outputsMatch", () => {
  it("matches identical output", () => {
    expect(outputsMatch("6\n", "6")).toBe(true);
  });

  it("ignores trailing whitespace/newline differences", () => {
    expect(outputsMatch("6  \n", "6")).toBe(true);
    expect(outputsMatch("6\n\n\n", "6")).toBe(true);
  });

  it("rejects genuinely different output", () => {
    expect(outputsMatch("6", "7")).toBe(false);
  });

  it("is sensitive to internal whitespace differences", () => {
    expect(outputsMatch("1 2 3", "1  2 3")).toBe(false);
  });
});
