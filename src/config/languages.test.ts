import { describe, expect, it } from "vitest";
import { getLanguageConfig } from "./languages";

describe("getLanguageConfig", () => {
  it("returns the registered config for javascript", () => {
    expect(getLanguageConfig("javascript")).toEqual({ image: "exec-js:1.0", fileName: "main.js" });
  });

  it("returns the registered config for python", () => {
    expect(getLanguageConfig("python")).toEqual({ image: "exec-python:1.0", fileName: "main.py" });
  });

  it("throws with the list of supported languages for an unknown language", () => {
    expect(() => getLanguageConfig("rust")).toThrow(/Unsupported language "rust".*javascript.*python/);
  });
});
