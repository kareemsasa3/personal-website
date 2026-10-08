import React from "react";
import { Terminal } from "../components/Terminal";
import GamesRedirect from "../components/GamesRedirect";

// Helper for route object typing
interface AppRoute {
  path: string;
  element: React.ReactElement;
  index?: boolean;
}

// Lazy load all page components so each route is its own chunk
const Home = React.lazy(() => import("../pages/Home"));
const Projects = React.lazy(() => import("../pages/Projects"));
const CaseStudies = React.lazy(() => import("../pages/CaseStudies"));
const CaseStudyAether = React.lazy(() => import("../pages/CaseStudyAether"));
const CaseStudyErebus = React.lazy(() => import("../pages/CaseStudyErebus"));
const CaseStudyArachne = React.lazy(() => import("../pages/CaseStudyArachne"));
const CaseStudySpecification = React.lazy(() => import("../pages/CaseStudySpecification"));
const Writing = React.lazy(() => import("../pages/Writing"));
const Article = React.lazy(() => import("../pages/Article"));
const Simulations = React.lazy(() => import("../pages/Simulations"));
const OrbitalSimulator = React.lazy(() => import("../pages/OrbitalSimulator"));
const TrafficSimulator = React.lazy(() => import("../pages/TrafficSimulator"));
const Annals = React.lazy(() => import("../pages/Annals"));
const ProceduralAnimations = React.lazy(() => import("../pages/ProceduralAnimations"));
const SnakeGame = React.lazy(() => import("../pages/SnakeGame"));
const SpiderSolitaire = React.lazy(() => import("../pages/SpiderSolitaire"));
const RhythmLab = React.lazy(() => import("../pages/RhythmLab"));
const Work = React.lazy(() => import("../pages/Work"));
const Journey = React.lazy(() => import("../pages/Journey"));

const NotFound = React.lazy(() => import("../pages/NotFound"));

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
  {
    path: "case-studies/where-the-specification-lived",
    element: React.createElement(CaseStudySpecification),
  },
  { path: "writing", element: React.createElement(Writing) },
  { path: "writing/:slug", element: React.createElement(Article) },
  { path: "simulations", element: React.createElement(Simulations) },
  { path: "simulations/orbital-simulator", element: React.createElement(OrbitalSimulator) },
  { path: "simulations/traffic-simulator", element: React.createElement(TrafficSimulator) },
  { path: "simulations/annals", element: React.createElement(Annals) },
  { path: "simulations/snake", element: React.createElement(SnakeGame) },
  { path: "simulations/spider", element: React.createElement(SpiderSolitaire) },
  { path: "procedural-animations", element: React.createElement(ProceduralAnimations) },
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
