import type { Article } from "../data/generated/articles";

export const KIND_LABELS: Record<Article["kind"], string> = {
  essay: "Essay",
  "field-note": "Field Note",
};

export const formatPublished = (published: string) =>
  new Date(`${published}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
