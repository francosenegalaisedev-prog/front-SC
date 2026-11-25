import { describe, expect, it } from "vitest";
import { carteStatusOptions } from "./production";

describe("carteStatusOptions", () => {
  it("only offers allowed next actions for a card request", () => {
    expect(carteStatusOptions("envoyee")).toEqual([
      "envoyee",
      "traitee",
      "livree",
    ]);
    expect(carteStatusOptions("traitee")).toEqual([
      "traitee",
      "livree",
      "envoyee",
    ]);
    expect(carteStatusOptions("livree")).toEqual(["livree", "traitee"]);
  });
});
