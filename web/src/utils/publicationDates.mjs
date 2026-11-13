// Publication and revision dates for case studies and essays.
//
// Plain JavaScript so the same rules run in the article build script (plain
// Node), the Vite config, the app and the node:test suites. Types live in
// publicationDates.d.mts.
//
// Semantics (see docs/publication-dates.md):
// - published: the first verified successful production release carrying the
//   work, as an America/Chicago calendar date, or "unknown".
// - updated: the most recent substantive published change, same calendar.
// Dates are calendar days, never instants, so nothing here depends on the
// time zone of the machine running it.

export const UNKNOWN_DATE = "unknown";
export const PUBLICATION_TIME_ZONE = "America/Chicago";

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const isLeapYear = (year) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

const daysInMonth = (year, month) =>
  month === 2 ? (isLeapYear(year) ? 29 : 28) : [4, 6, 9, 11].includes(month) ? 30 : 31;

/** True for a real calendar day written as YYYY-MM-DD. */
export const isCalendarDate = (value) => {
  if (typeof value !== "string") return false;
  const match = CALENDAR_DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
};

/** A known date, as opposed to the explicit "unknown" marker. */
export const isKnownDate = (value) => value !== UNKNOWN_DATE && isCalendarDate(value);

/** Today's calendar date in America/Chicago, whatever the host's time zone. */
export const todayInPublicationTimeZone = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PUBLICATION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type) => parts.find((entry) => entry.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
};

/** "November 12, 2026". Built from the date's own fields, never from an instant. */
export const formatCalendarDate = (value) => {
  if (!isCalendarDate(value)) {
    throw new Error(`formatCalendarDate: not a calendar date: ${JSON.stringify(value)}`);
  }
  const [year, month, day] = value.split("-").map(Number);
  return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
};

const checkDateField = (errors, label, field, value, { allowUnknown, today }) => {
  if (value === UNKNOWN_DATE) {
    if (!allowUnknown) errors.push(`${label}: ${field} may not be "unknown"`);
    return;
  }
  if (!isCalendarDate(value)) {
    errors.push(`${label}: ${field} must be a real calendar date (YYYY-MM-DD)${allowUnknown ? ' or "unknown"' : ""}, got ${JSON.stringify(value)}`);
    return;
  }
  if (value > today) {
    errors.push(`${label}: ${field} ${value} is after today (${today}, ${PUBLICATION_TIME_ZONE})`);
  }
};

/**
 * Validates one work's dates and returns every problem found.
 *
 * Case studies: published and updated are both required, each a date or
 * "unknown". Essays: published is a required date; updated is optional and,
 * when present, a date.
 */
export const validatePublicationDates = (
  label,
  { published, updated },
  { kind, today = todayInPublicationTimeZone() }
) => {
  if (kind !== "case-study" && kind !== "essay") {
    throw new Error(`validatePublicationDates: unknown kind ${JSON.stringify(kind)}`);
  }
  if (!isCalendarDate(today)) {
    throw new Error(`validatePublicationDates: today must be a calendar date, got ${JSON.stringify(today)}`);
  }
  const caseStudy = kind === "case-study";
  const errors = [];

  if (published === undefined) {
    errors.push(`${label}: published is required`);
  } else {
    checkDateField(errors, label, "published", published, { allowUnknown: caseStudy, today });
  }

  if (updated === undefined) {
    if (caseStudy) errors.push(`${label}: updated is required`);
  } else {
    checkDateField(errors, label, "updated", updated, { allowUnknown: caseStudy, today });
  }

  if (isKnownDate(published) && isKnownDate(updated) && updated < published) {
    errors.push(`${label}: updated ${updated} precedes published ${published}`);
  }
  return errors;
};

/**
 * What a page shows. Unknown values are omitted, never replaced; "updated" is
 * shown only as a distinct revision: later than a known publication date, or
 * on its own when publication is unknown.
 */
export const publicationDisplay = ({ published, updated }) => {
  const knownPublished = isKnownDate(published) ? published : undefined;
  const knownUpdated =
    isKnownDate(updated) && (knownPublished === undefined || updated > knownPublished)
      ? updated
      : undefined;
  return { published: knownPublished, updated: knownUpdated };
};

/** schema.org fields: only known values, never placeholders. */
export const publicationStructuredData = ({ published, updated }) => ({
  ...(isKnownDate(published) ? { datePublished: published } : {}),
  ...(isKnownDate(updated) ? { dateModified: updated } : {}),
});
