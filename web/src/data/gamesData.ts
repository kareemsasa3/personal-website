export type GamePreviewType = "snake" | "spider" | "rhythm-lab" | "placeholder";

export interface GameData {
  id: string;
  title: string;
  description: string;
  path: string;
  previewType: GamePreviewType;
  isAvailable: boolean;
  modeLabel?: string;
}

export const gamesData: GameData[] = [
  {
    id: "snake",
    title: "Snake Game",
    description: "Classic snake game with wrap-around edges",
    path: "/games/snake",
    previewType: "snake",
    isAvailable: true,
  },
  {
    id: "spider-solitaire",
    title: "Spider Solitaire",
    description: "One-suit Spider Solitaire with smooth card play",
    path: "/games/spider",
    previewType: "spider",
    isAvailable: true,
  },
  {
    id: "rhythm-lab",
    title: "Rhythm Lab",
    description:
      "Three-lane timing prototype for input windows, chart data, and mobile rhythm ergonomics.",
    path: "/games/rhythm-lab",
    previewType: "rhythm-lab",
    isAvailable: true,
    modeLabel: "Fullscreen prototype",
  },
  // Future games will be added here
  // Example:
  // {
  //   id: 'tetris',
  //   title: 'Tetris',
  //   description: 'Classic block-stacking puzzle game',
  //   path: '/games/tetris',
  //   previewType: 'placeholder',
  //   isAvailable: false,
  // },
];
