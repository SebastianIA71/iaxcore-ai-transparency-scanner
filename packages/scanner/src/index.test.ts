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

  it("exporta robots.txt, selección de páginas y EvidenceStore", () => {
    expect(typeof scanner.parseRobotsTxt).toBe("function");
    expect(typeof scanner.isAllowedByRobots).toBe("function");
    expect(typeof scanner.selectPages).toBe("function");
    expect(typeof scanner.createLocalEvidenceStore).toBe("function");
  });

  it("exporta el manejo del banner de consentimiento", () => {
    expect(typeof scanner.handleConsentBanner).toBe("function");
  });
});
