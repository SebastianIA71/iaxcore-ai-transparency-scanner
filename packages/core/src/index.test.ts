import { describe, expect, it } from "vitest";
import { CORE_PACKAGE_PLACEHOLDER } from "./index.js";

describe("bootstrap", () => {
  it("loads the core package", () => {
    expect(CORE_PACKAGE_PLACEHOLDER).toBe(true);
  });
});
