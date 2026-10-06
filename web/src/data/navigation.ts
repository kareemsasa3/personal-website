import {
  faHome,
  faFolderOpen,
  faBriefcase,
  faRoute,
  faCubes,
  faTerminal,
  faBookOpen,
  faPenNib,
} from "@fortawesome/free-solid-svg-icons";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { normalizeRoutePath } from "./routeMetadata";

export type NavGroup = "home" | "core" | "explore";

export interface SiteNavItem {
  path: string;
  label: string;
  icon: IconDefinition;
  group: NavGroup;
  /** Other paths that should mark this item as the current page. */
  aliases?: readonly string[];
}

const baseNavItems: SiteNavItem[] = [
  { path: "/", label: "Home", icon: faHome, group: "home" },
  { path: "/projects", label: "Projects", icon: faFolderOpen, group: "core" },
  { path: "/case-studies", label: "Case Studies", icon: faBookOpen, group: "core" },
  { path: "/writing", label: "Writing", icon: faPenNib, group: "core" },
  { path: "/experience", label: "Experience", icon: faBriefcase, group: "core", aliases: ["/work"] },
  { path: "/terminal", label: "Terminal", icon: faTerminal, group: "explore" },
  { path: "/journey", label: "Journey", icon: faRoute, group: "explore" },
  { path: "/simulations", label: "Simulations", icon: faCubes, group: "explore" },
];

export const navItems = baseNavItems;
export const coreNavItems = navItems.filter((item) => item.group === "core");
export const exploreNavItems = navItems.filter((item) => item.group === "explore");

const isAtOrBelow = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

// Home matches only "/"; every other item also matches its child routes and aliases.
export const isNavItemActive = (item: SiteNavItem, pathname: string): boolean => {
  const path = pathname.toLowerCase();
  if (item.path === "/") return path === "/";
  return [item.path, ...(item.aliases ?? [])].some((base) => isAtOrBelow(path, base));
};

// A simulation's own page, not the /simulations index; production serves both as `/path/`.
export const isSimulationDetailRoute = (pathname: string) =>
  normalizeRoutePath(pathname).startsWith("/simulations/");
