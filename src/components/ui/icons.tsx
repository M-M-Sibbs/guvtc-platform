// Simple line icons (stroke = currentColor). Hand-drawn set to avoid an icon dependency.
import type { SVGProps } from "react";
type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 20) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true });

export const Icon = {
  Needle: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M19 3 6 16" /><path d="M17 3h4v4" /><path d="M6 16c-2 1-3 3-2 4s3 0 4-2" /><path d="M14 9c3 1 5 4 4 8" /></svg>,
  Comb: ({ size, ...p }: P) => <svg {...base(size)} {...p}><rect x="3" y="4" width="18" height="5" rx="1.5" /><path d="M6 9v10M9 9v8M12 9v10M15 9v8M18 9v10" /></svg>,
  Monitor: ({ size, ...p }: P) => <svg {...base(size)} {...p}><rect x="3" y="4" width="18" height="12" rx="1.5" /><path d="M8 20h8M12 16v4" /></svg>,
  Wrench: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M14.7 6.3a4 4 0 0 0 5 5L13 18l-3 3-3-3 3-3 6.7-6.7Z" /><path d="M14.7 6.3 18 3l3 3-3.3 3.3" /></svg>,
  Whisk: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M4 20l7-7" /><path d="M11 13c-1-4 1-9 5-10 3-1 5 1 4 4-1 4-6 6-9 6Z" /><path d="M13 11c1-2 3-4 5-5" /></svg>,
  Spark: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><path d="m6.5 6.5 2 2M15.5 15.5l2 2M17.5 6.5l-2 2M8.5 15.5l-2 2" /><circle cx="12" cy="12" r="2.5" /></svg>,
  Search: ({ size, ...p }: P) => <svg {...base(size)} {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4-4" /></svg>,
  Menu: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>,
  Close: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>,
  Phone: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" /></svg>,
  Mail: ({ size, ...p }: P) => <svg {...base(size)} {...p}><rect x="3" y="5" width="18" height="14" rx="1.5" /><path d="m3 7 9 6 9-6" /></svg>,
  Pin: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>,
  Calendar: ({ size, ...p }: P) => <svg {...base(size)} {...p}><rect x="3" y="5" width="18" height="16" rx="1.5" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>,
  Clock: ({ size, ...p }: P) => <svg {...base(size)} {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></svg>,
  Play: ({ size, ...p }: P) => <svg {...base(size)} {...p}><circle cx="12" cy="12" r="9" /><path d="m10 8.5 5 3.5-5 3.5Z" fill="currentColor" /></svg>,
  Video: ({ size, ...p }: P) => <svg {...base(size)} {...p}><rect x="3" y="6" width="13" height="12" rx="1.5" /><path d="m16 10 5-3v10l-5-3" /></svg>,
  File: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M14 3H6v18h12V7Z" /><path d="M14 3v4h4M9 13h6M9 17h6" /></svg>,
  Check: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="m5 12 5 5 9-10" /></svg>,
  Upload: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></svg>,
  Download: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M12 4v12M7 11l5 5 5-5M4 20h16" /></svg>,
  Chart: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3" /></svg>,
  Users: ({ size, ...p }: P) => <svg {...base(size)} {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6" /></svg>,
  Book: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z" /><path d="M4 19V5M8 7h7" /></svg>,
  Megaphone: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M3 10v4h3l8 5V5L6 10Z" /><path d="M18 9a4 4 0 0 1 0 6M7 14l1 6h3l-1-5" /></svg>,
  Inbox: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M3 13h5l1.5 3h5L16 13h5" /><path d="M5 5h14l2 8v6H3v-6Z" /></svg>,
  Coins: ({ size, ...p }: P) => <svg {...base(size)} {...p}><ellipse cx="9" cy="7" rx="6" ry="3" /><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7" /><path d="M9 15v2c0 1.7 2.7 3 6 3s6-1.3 6-3v-5c0-1.6-2.4-2.9-5.5-3" /></svg>,
  Box: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="m3 7 9-4 9 4v10l-9 4-9-4Z" /><path d="m3 7 9 4 9-4M12 11v10" /></svg>,
  Shield: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z" /><path d="m9 12 2 2 4-4" /></svg>,
  Grid: ({ size, ...p }: P) => <svg {...base(size)} {...p}><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></svg>,
  Bell: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4Z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>,
  Logout: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" /></svg>,
  Whatsapp: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M4 20l1.3-4A8 8 0 1 1 8 19Z" /><path d="M9 9c0 3 3 6 6 6l1-1.5-2-1-1 .8a4 4 0 0 1-2.3-2.3l.8-1-1-2Z" /></svg>,
  Share: ({ size, ...p }: P) => <svg {...base(size)} {...p}><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6" /></svg>,
  Settings: ({ size, ...p }: P) => <svg {...base(size)} {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" /></svg>,
  Arrow: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  Back: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>,
};

export const CATEGORY_ICON: Record<string, (p: P) => React.ReactElement> = {
  "fashion-textiles": Icon.Needle,
  "beauty-personal-care": Icon.Comb,
  "digital-business": Icon.Monitor,
  "technical-mechanical": Icon.Wrench,
  "hospitality-food": Icon.Whisk,
  "artificial-intelligence": Icon.Spark,
};
