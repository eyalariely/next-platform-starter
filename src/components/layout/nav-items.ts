import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Briefcase,
  ListTree,
  LineChart,
  ShieldAlert,
  GitCompareArrows,
  SlidersHorizontal,
  Star,
  PiggyBank,
  Globe2,
  Sparkles,
  Settings,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown directly in the mobile bottom bar; the rest live behind "עוד". */
  primary?: boolean;
};

// Section 49 of the spec, in display order.
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "לוח בקרה", icon: LayoutDashboard, primary: true },
  { href: "/portfolio", label: "תיק השקעות", icon: Briefcase, primary: true },
  { href: "/holdings", label: "אחזקות", icon: ListTree, primary: true },
  { href: "/performance", label: "ביצועים", icon: LineChart },
  { href: "/risk", label: "סיכון", icon: ShieldAlert, primary: true },
  { href: "/scenarios", label: "תרחישים", icon: GitCompareArrows },
  { href: "/optimization", label: "אופטימיזציה", icon: SlidersHorizontal },
  { href: "/watchlist", label: "רשימת מעקב", icon: Star },
  { href: "/investment-plan", label: "תוכנית השקעה", icon: PiggyBank },
  { href: "/macro", label: "מאקרו", icon: Globe2 },
  { href: "/advisor", label: "יועץ AI", icon: Sparkles },
  { href: "/settings", label: "הגדרות", icon: Settings },
];
