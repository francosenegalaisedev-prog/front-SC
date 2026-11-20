/** Icônes SVG de la fiche (tracés 24×24, trait `currentColor`). */
export const PATHS: Record<string, string> = {
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-3.3 3.6-6 8-6s8 2.7 8 6",
  globe:
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9S14.5 18.3 12 21c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  menu: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5",
  image: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9h.01",
  play: "M5 4h14v16H5zM10 9l5 3-5 3z",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  chat: "M4 5h16v11H9l-5 4z",
  cal: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  pin: "M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z",
  text: "M5 6h14M5 12h14M5 18h9",
  wa: "M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3z",
  phone:
    "M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z",
  mail: "M3 6h18v12H3zM3.5 6.5l8.5 6.5 8.5-6.5",
  home: "M4 11l8-7 8 7M6 10v10h12V10M10 20v-6h4v6",
  close: "M6 6l12 12M18 6L6 18",
  bed: "M3 19v-9h18v9M3 15h18M7 10V7h5v3",
  bath: "M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM6 12V6a2 2 0 0 1 4 0",
  area: "M4 4h16v16H4zM9 4v5H4M20 15h-5v5",
  drag: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01",
  plus: "M12 5v14M5 12h14",
  down: "M12 4v11M7 10l5 5 5-5M5 20h14",
  chev: "M6 9l6 6 6-6",
  arrow: "M7 17L17 7M9 7h8v8",
  left: "M15 5l-7 7 7 7",
  right: "M9 5l7 7-7 7",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2",
  share: "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13",
  instagram:
    "M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zM16 11.4a4 4 0 1 1-7.9 1.2 4 4 0 0 1 7.9-1.2zM17.5 6.5h.01",
  facebook:
    "M15 3h-3a4 4 0 0 0-4 4v3H5v4h3v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h2z",
  tiktok:
    "M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5",
  linkedin:
    "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 4a2 2 0 1 0 0 .01",
  x: "M4 4l16 16M20 4L4 20",
  youtube:
    "M21.5 8.5a2.8 2.8 0 0 0-2-2C17.8 6 12 6 12 6s-5.8 0-7.5.5a2.8 2.8 0 0 0-2 2A29 29 0 0 0 2 12a29 29 0 0 0 .5 3.5 2.8 2.8 0 0 0 2 2C6.2 18 12 18 12 18s5.8 0 7.5-.5a2.8 2.8 0 0 0 2-2A29 29 0 0 0 22 12a29 29 0 0 0-.5-3.5zM10 9.5l5 2.5-5 2.5z",
  snapchat:
    "M12 3c-3 0-5 2-5 5.2v2.1c-.6.2-1.4.2-1.8.6-.3.3-.1.9.5 1.1.5.2 1 .4 1 .8 0 .9-1.5 2.1-3.2 2.7-.5.2-.5.8 0 1 .9.4 2 .5 2.5 1 .4.4.4 1.1 1.3 1.2 1 .1 1.8-.3 2.7-.3s1.7.4 2.7.3c.9-.1.9-.8 1.3-1.2.5-.5 1.6-.6 2.5-1 .5-.2.5-.8 0-1-1.7-.6-3.2-1.8-3.2-2.7 0-.4.5-.6 1-.8.6-.2.8-.8.5-1.1-.4-.4-1.2-.4-1.8-.6V8.2C17 5 15 3 12 3z",
  pinterest:
    "M12 3a9 9 0 0 0-3.3 17.4l1.4-5.4s-.4-.7-.4-1.8c0-1.7 1-3 2.2-3 1 0 1.5.8 1.5 1.7 0 1-.7 2.6-1 4-.3 1.2.6 2.2 1.8 2.2 2.1 0 3.7-2.2 3.7-5.4 0-2.8-2-4.8-5-4.8-3.4 0-5.4 2.5-5.4 5.2 0 1 .4 2.1.9 2.7",
  telegram: "M21 4L3 11l6.5 2.5L18 7l-6.5 8.5L17 20l4-16zM9.5 13.5V19l3-3",
  threads:
    "M19 12a7 7 0 1 1-2.2-5.1M15 11.5c0-2-1.2-3.5-3.2-3.5-2 0-3.3 1.5-3.3 3.5s1.3 3.5 3.3 3.5c1.8 0 3.2-1.1 3.2-3.5v1c0 1.7 1 2.5 2.2 2.5 1.5 0 2.3-1.3 2.3-3.2",
  github:
    "M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21",
};

const SOCIAL_MATCHERS: ReadonlyArray<{
  icon: string;
  hosts: RegExp;
  labels: RegExp;
}> = [
  { icon: "instagram", hosts: /(^|\.)(instagram\.com|instagr\.am)$/i, labels: /\b(instagram|insta)\b/i },
  { icon: "facebook", hosts: /(^|\.)(facebook\.com|fb\.com|fb\.me)$/i, labels: /\b(facebook|fb)\b/i },
  { icon: "tiktok", hosts: /(^|\.)tiktok\.com$/i, labels: /\b(tiktok|tik\s*tok)\b/i },
  { icon: "linkedin", hosts: /(^|\.)(linkedin\.com|lnkd\.in)$/i, labels: /\blinked\s*in\b/i },
  { icon: "x", hosts: /(^|\.)(x\.com|twitter\.com)$/i, labels: /\b(twitter|x)\b/i },
  { icon: "youtube", hosts: /(^|\.)(youtube\.com|youtu\.be)$/i, labels: /\b(youtube|yt)\b/i },
  { icon: "wa", hosts: /(^|\.)(wa\.me|whatsapp\.com)$/i, labels: /\bwhatsapp\b/i },
  { icon: "snapchat", hosts: /(^|\.)snapchat\.com$/i, labels: /\b(snapchat|snap)\b/i },
  { icon: "pinterest", hosts: /(^|\.)(pinterest\.[a-z.]+|pin\.it)$/i, labels: /\bpinterest\b/i },
  { icon: "telegram", hosts: /(^|\.)(t\.me|telegram\.me|telegram\.org)$/i, labels: /\btelegram\b/i },
  { icon: "threads", hosts: /(^|\.)threads\.(net|com)$/i, labels: /\bthreads\b/i },
  { icon: "github", hosts: /(^|\.)github\.com$/i, labels: /\bgithub\b/i },
];

/** Déduit l'icône d'un réseau social à partir de son URL (prioritaire) ou de son libellé, sinon `globe`. */
export function socialIconFor(label?: string, url?: string): string {
  const rawUrl = (url ?? "").trim();
  if (rawUrl) {
    try {
      const host = new URL(
        /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`,
      ).hostname.toLowerCase();
      const byHost = SOCIAL_MATCHERS.find(m => m.hosts.test(host));
      if (byHost) return byHost.icon;
    } catch {
      /* URL incomplète en cours de saisie : on tente le libellé */
    }
  }
  const rawLabel = (label ?? "").trim();
  if (rawLabel) {
    const byLabel = SOCIAL_MATCHERS.find(m => m.labels.test(rawLabel));
    if (byLabel) return byLabel.icon;
  }
  return "globe";
}
export const I = ({ n, s = 18 }: { n: string; s?: number }) => (
  <svg
    width={s}
    height={s}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={PATHS[n]} />
  </svg>
);
