import { describe, expect, it } from "vitest";
import { DETECTORS_PACKAGE_PLACEHOLDER } from "./index.js";

describe("bootstrap", () => {
  it("loads the detectors package", () => {
    expect(DETECTORS_PACKAGE_PLACEHOLDER).toBe(true);
  });
});
