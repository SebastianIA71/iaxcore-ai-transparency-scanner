import { describe, expect, it } from "vitest";
import * as scanner from "./index.js";

describe("superficie pública de @iaxcore/scanner", () => {
  it("exporta el guard SSRF", () => {
    expect(typeof scanner.checkUrl).toBe("function");
    expect(typeof scanner.classifyAddress).toBe("function");
  });

  it("exporta el navegador seguro y su guard de requests", () => {
    expect(typeof scanner.launchSecureBrowser).toBe("function");
    expect(typeof scanner.createSecureContext).toBe("function");
    expect(typeof scanner.installSsrfGuard).toBe("function");
  });
});
