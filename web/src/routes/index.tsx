import React from "react";
import { Terminal } from "../components/Terminal";
import GamesRedirect from "../components/GamesRedirect";
import { lazyWithMinTime } from "../utils/lazyWithMinTime";

// Helper for route object typing
interface AppRoute {
  path: string;
  element: React.ReactElement;
  index?: boolean;
}

// Lazy load all page components with a minimum display time for the loader
const Home = lazyWithMinTime(() => import("../pages/Home"));
const Projects = lazyWithMinTime(() => import("../pages/Projects"));
const CaseStudies = lazyWithMinTime(() => import("../pages/CaseStudies"));
const CaseStudyAether = lazyWithMinTime(
  () => import("../pages/CaseStudyAether")
);
const CaseStudyErebus = lazyWithMinTime(
  () => import("../pages/CaseStudyErebus")
);
const CaseStudyArachne = lazyWithMinTime(
  () => import("../pages/CaseStudyArachne")
);
const Simulations = lazyWithMinTime(() => import("../pages/Simulations"));
const SnakeGame = lazyWithMinTime(() => import("../pages/SnakeGame"));
const SpiderSolitaire = lazyWithMinTime(() => import("../pages/SpiderSolitaire"));
const RhythmLab = lazyWithMinTime(() => import("../pages/RhythmLab"), 0);
const Work = lazyWithMinTime(() => import("../pages/Work"));
const Journey = lazyWithMinTime(() => import("../pages/Journey"));

const NotFound = lazyWithMinTime(() => import("../pages/NotFound"));

// Main routes that use the Layout component
const routes: AppRoute[] = [
  { path: "projects", element: React.createElement(Projects) },
  { path: "case-studies", element: React.createElement(CaseStudies) },
  {
    path: "case-studies/aether",
    element: React.createElement(CaseStudyAether),
  },
  {
    path: "case-studies/erebus",
    element: React.createElement(CaseStudyErebus),
  },
  {
    path: "case-studies/arachne",
    element: React.createElement(CaseStudyArachne),
  },
  { path: "simulations", element: React.createElement(Simulations) },
  { path: "simulations/snake", element: React.createElement(SnakeGame) },
  { path: "simulations/spider", element: React.createElement(SpiderSolitaire) },
  { path: "experience", element: React.createElement(Work) },
  { path: "work", element: React.createElement(Work) },
  { path: "journey", element: React.createElement(Journey) },

  {
    path: "terminal",
    element: React.createElement(Terminal, { isIntro: false }),
  },

  // Legacy /games redirects — preserve subpaths
  { path: "games", element: React.createElement(GamesRedirect) },
  { path: "games/*", element: React.createElement(GamesRedirect) },
];

export const mainRoutes: AppRoute[] = routes;

// Immersive routes bypass the standard site Layout shell.
export const immersiveRoutes: AppRoute[] = [
  { path: "simulations/rhythm-lab", element: React.createElement(RhythmLab) },
];

// Default and catch-all routes
export const defaultRoute: AppRoute = {
  path: "/",
  element: React.createElement(Home),
  index: true,
};
export const notFoundRoute: AppRoute = {
  path: "*",
  element: React.createElement(NotFound),
};
