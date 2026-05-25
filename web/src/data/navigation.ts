import {
  faHome,
  faFolderOpen,
  faBriefcase,
  faRoute,
  faCubes,
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
  { path: "/experience", label: "Experience", icon: faBriefcase },
  { path: "/terminal", label: "Terminal", icon: faTerminal },
  { path: "/journey", label: "Journey", icon: faRoute },
  { path: "/simulations", label: "Simulations", icon: faCubes },
];

export const navItems = baseNavItems;
