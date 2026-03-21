import { describe, it, expect } from "vitest";
import { SeamError, validateName } from "../../src/core/errors.js";

describe("SeamError", () => {
  it("carries a code and message", () => {
    const err = new SeamError("version_conflict", "Section was updated.");
    expect(err.code).toBe("version_conflict");
    expect(err.message).toBe("Section was updated.");
    expect(err).toBeInstanceOf(Error);
  });

  it("carries optional data", () => {
    const err = new SeamError("version_conflict", "Conflict.", {
      current_version: 3,
      your_version: 1,
    });
    expect(err.data).toEqual({ current_version: 3, your_version: 1 });
  });
});

describe("validateName", () => {
  it("accepts lowercase alphanumeric with hyphens", () => {
    expect(validateName("design-philosophy")).toBe(true);
    expect(validateName("my-project")).toBe(true);
    expect(validateName("v2")).toBe(true);
    expect(validateName("a")).toBe(true);
  });

  it("rejects uppercase", () => {
    expect(validateName("Design-Philosophy")).toBe(false);
  });

  it("rejects spaces", () => {
    expect(validateName("my project")).toBe(false);
  });

  it("rejects special characters", () => {
    expect(validateName("my_project")).toBe(false);
    expect(validateName("my.project")).toBe(false);
    expect(validateName("my/project")).toBe(false);
  });

  it("rejects leading hyphen", () => {
    expect(validateName("-leading")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validateName("")).toBe(false);
  });
});
