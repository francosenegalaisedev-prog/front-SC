import { describe, expect, it } from "vitest";
import { PATHS, socialIconFor } from "./Icon";

describe("socialIconFor", () => {
  it.each([
    ["Instagram", "https://instagram.com/sunset", "instagram"],
    ["Mon profil", "https://www.facebook.com/sunset", "facebook"],
    ["TikTok", "https://www.tiktok.com/@sunset", "tiktok"],
    ["LinkedIn", "https://sn.linkedin.com/in/awa", "linkedin"],
    ["Twitter", "https://x.com/sunset", "x"],
    ["Chaîne", "https://youtu.be/abc123", "youtube"],
    ["WhatsApp", "https://wa.me/221770000000", "wa"],
    ["Snapchat", "", "snapchat"],
    ["Pinterest", "https://pin.it/xyz", "pinterest"],
    ["Telegram", "https://t.me/sunset", "telegram"],
    ["Threads", "https://www.threads.net/@sunset", "threads"],
    ["GitHub", "https://github.com/sunset", "github"],
    ["Mon blog perso", "https://mon-site.sn", "globe"],
  ])("associe (%s, %s) à l'icône %s", (label, url, expected) => {
    const icon = socialIconFor(label, url);
    expect(icon).toBe(expected);
    expect(PATHS[icon]).toBeTruthy();
  });
});
