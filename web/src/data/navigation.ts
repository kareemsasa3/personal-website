import {
  faHome,
  faFolderOpen,
  faBriefcase,
  faRoute,
  faGamepad,
  faTerminal,
  faBookOpen,
} from "@fortawesome/free-solid-svg-icons";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";

export interface SiteNavItem {
  path: string;
  label: string;
  icon: IconDefinition;
}

const baseNavItems: SiteNavItem[] = [
  { path: "/", label: "Home", icon: faHome },
  { path: "/projects", label: "Projects", icon: faFolderOpen },
  { path: "/case-studies", label: "Case Studies", icon: faBookOpen },
  { path: "/work", label: "Work", icon: faBriefcase },
  { path: "/terminal", label: "Terminal", icon: faTerminal },
  { path: "/journey", label: "Journey", icon: faRoute },
  { path: "/games", label: "Games", icon: faGamepad },
];

export const navItems = baseNavItems;
