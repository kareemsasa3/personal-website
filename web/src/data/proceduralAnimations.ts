export interface ProceduralAnimation {
  slug: string;
  title: string;
  description: string;
  /** Still frame for the gallery card, rendered from the piece itself. */
  poster: string;
  /** Self-contained artifact under public/, framed by the piece's route. */
  artifactPath: string;
}

export const proceduralAnimationsData: ProceduralAnimation[] = [
  {
    slug: "mechanical-time",
    title: "Mechanical Time",
    description:
      "A mechanical watch movement assembles itself: components emerge, energy flows through the gear train, and the escapement releases time one tick at a time.",
    poster: "/media/mechanical-time-card.webp",
    artifactPath: "/procedural-animations/mechanical-time/piece.html",
  },
  {
    slug: "descent",
    title: "DESCENT",
    description:
      "A descent from the ocean surface to 2,437 metres, through the sunlight, twilight, and midnight zones, past fish and glowing jellyfish.",
    poster: "/media/descent-card.webp",
    artifactPath: "/procedural-animations/descent/piece.html",
  },
  {
    slug: "observing",
    title: "Observing",
    description:
      "On a rainy rooftop, an engineer and a small holographic dog look out over a cyberpunk skyline as a face built from glyphs emerges above the city.",
    poster: "/media/observing-card.webp",
    artifactPath: "/procedural-animations/observing/piece.html",
  },
  {
    slug: "one-quiet-day",
    title: "One Quiet Day",
    description:
      "A meadow in the Blue Ridge foothills through one autumn day, compressed into a minute, with optional synthesized sound.",
    poster: "/media/one-quiet-day-card.webp",
    artifactPath: "/procedural-animations/one-quiet-day/piece.html",
  },
];
