import type { Article } from "../data/generated/articles";
import { formatCalendarDate } from "./publicationDates.mjs";

export const KIND_LABELS: Record<Article["kind"], string> = {
  essay: "Essay",
  "field-note": "Field Note",
};

// Calendar dates format from their own fields, independent of time zone.
export const formatPublished = (published: string) => formatCalendarDate(published);

export const formatSeriesPosition = (series: NonNullable<Article["series"]>) =>
  `Part ${series.part} of ${series.total}`;
