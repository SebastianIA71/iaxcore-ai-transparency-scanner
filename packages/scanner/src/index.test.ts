import { describe, expect, it } from "vitest";
import { SCANNER_PACKAGE_PLACEHOLDER } from "./index.js";

describe("bootstrap", () => {
  it("loads the scanner package", () => {
    expect(SCANNER_PACKAGE_PLACEHOLDER).toBe(true);
  });
});
