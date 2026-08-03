import { describe, expect, it } from "vitest";
import { DB_PACKAGE_PLACEHOLDER } from "./index.js";

describe("bootstrap", () => {
  it("loads the db package", () => {
    expect(DB_PACKAGE_PLACEHOLDER).toBe(true);
  });
});
