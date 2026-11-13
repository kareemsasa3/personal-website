import test from "node:test";
import assert from "node:assert/strict";
import {
  UNKNOWN_DATE,
  formatCalendarDate,
  isCalendarDate,
  isKnownDate,
  publicationDisplay,
  publicationStructuredData,
  todayInPublicationTimeZone,
  validatePublicationDates,
} from "../src/utils/publicationDates.mjs";

// Every check passes `today` or a fixed instant explicitly, so no result depends
// on the wall clock or on the time zone of the machine running the suite.
const TODAY = "2026-11-13";
const caseStudy = (dates, today = TODAY) =>
  validatePublicationDates("study", dates, { kind: "case-study", today });
const essay = (dates, today = TODAY) => validatePublicationDates("essay", dates, { kind: "essay", today });

test("calendar dates are YYYY-MM-DD days that exist, including leap days", () => {
  for (const value of ["2026-11-13", "2024-02-29", "2000-02-29", "2026-12-31", "2026-04-30"]) {
    assert.equal(isCalendarDate(value), true, value);
  }
  for (const value of [
    "2026-02-29", // not a leap year
    "2100-02-29", // century, not divisible by 400
    "2026-04-31",
    "2026-13-01",
    "2026-00-10",
    "2026-11-00",
    "2026-1-13",
    "26-11-13",
    "2026-11-13T00:00:00Z",
    " 2026-11-13",
    "unknown",
    "",
    undefined,
    20261113,
  ]) {
    assert.equal(isCalendarDate(value), false, String(value));
  }
});

test("unknown is a marker, not a known date", () => {
  assert.equal(isKnownDate(UNKNOWN_DATE), false);
  assert.equal(isKnownDate("2026-11-12"), true);
});

test("today is the America/Chicago calendar day, across midnight UTC and DST", () => {
  // 05:30 UTC on 13 November is 23:30 CST on the 12th (UTC-6 after DST ends).
  assert.equal(todayInPublicationTimeZone(new Date("2026-11-13T05:30:00Z")), "2026-11-12");
  assert.equal(todayInPublicationTimeZone(new Date("2026-11-13T06:00:00Z")), "2026-11-13");
  // 04:30 UTC on 1 July is 23:30 CDT on 30 June (UTC-5 in summer).
  assert.equal(todayInPublicationTimeZone(new Date("2026-07-01T04:30:00Z")), "2026-06-30");
  assert.equal(todayInPublicationTimeZone(new Date("2026-07-01T05:00:00Z")), "2026-07-01");
  // The night DST ends (1 November 2026, 02:00 CDT -> 01:00 CST).
  assert.equal(todayInPublicationTimeZone(new Date("2026-11-02T05:59:00Z")), "2026-11-01");
  assert.equal(todayInPublicationTimeZone(new Date("2026-11-02T06:00:00Z")), "2026-11-02");
});

test("dates format from their own fields", () => {
  assert.equal(formatCalendarDate("2026-11-12"), "November 12, 2026");
  assert.equal(formatCalendarDate("2024-02-29"), "February 29, 2024");
  assert.equal(formatCalendarDate("2026-01-01"), "January 1, 2026");
  assert.throws(() => formatCalendarDate("unknown"));
  assert.throws(() => formatCalendarDate("2026-02-30"));
});

test("case studies require both fields, each a date or unknown", () => {
  assert.deepEqual(caseStudy({ published: "2026-11-12", updated: "2026-11-13" }), []);
  assert.deepEqual(caseStudy({ published: UNKNOWN_DATE, updated: "2026-11-10" }), []);
  assert.deepEqual(caseStudy({ published: UNKNOWN_DATE, updated: UNKNOWN_DATE }), []);
  assert.deepEqual(caseStudy({ published: "2026-11-12", updated: "2026-11-12" }), []);
  assert.match(caseStudy({ updated: "2026-11-12" }).join(), /published is required/);
  assert.match(caseStudy({ published: "2026-11-12" }).join(), /updated is required/);
  assert.match(caseStudy({ published: "2026-02-29", updated: UNKNOWN_DATE }).join(), /real calendar date/);
  assert.match(caseStudy({ published: "Nov 12", updated: UNKNOWN_DATE }).join(), /real calendar date/);
});

test("known updated may not precede known published", () => {
  assert.match(caseStudy({ published: "2026-11-12", updated: "2026-11-11" }).join(), /precedes published/);
  assert.match(essay({ published: "2026-09-13", updated: "2026-09-12" }).join(), /precedes published/);
  // An unknown publication date imposes no ordering.
  assert.deepEqual(caseStudy({ published: UNKNOWN_DATE, updated: "2026-01-01" }), []);
});

test("no date may be later than today in America/Chicago", () => {
  assert.match(caseStudy({ published: "2026-11-14", updated: UNKNOWN_DATE }).join(), /after today/);
  assert.match(caseStudy({ published: "2026-11-12", updated: "2026-11-14" }).join(), /after today/);
  assert.match(essay({ published: "2026-11-14" }).join(), /after today/);
  assert.deepEqual(caseStudy({ published: "2026-11-13", updated: "2026-11-13" }), []);
  // Same instant, Chicago date: 05:30 UTC on the 13th is still the 12th there.
  const chicagoToday = todayInPublicationTimeZone(new Date("2026-11-13T05:30:00Z"));
  assert.match(caseStudy({ published: "2026-11-13", updated: UNKNOWN_DATE }, chicagoToday).join(), /after today/);
});

test("essays keep a required published date and accept an optional updated date", () => {
  assert.deepEqual(essay({ published: "2026-09-13" }), []);
  assert.deepEqual(essay({ published: "2026-09-13", updated: "2026-10-01" }), []);
  assert.match(essay({}).join(), /published is required/);
  assert.match(essay({ published: UNKNOWN_DATE }).join(), /may not be "unknown"/);
  assert.match(essay({ published: "2026-09-13", updated: UNKNOWN_DATE }).join(), /may not be "unknown"/);
  assert.match(essay({ published: "2026-09-13", updated: "2026-09-31" }).join(), /real calendar date/);
});

test("validation refuses an unknown kind or an invalid today", () => {
  assert.throws(() => validatePublicationDates("x", { published: "2026-01-01" }, { kind: "article" }));
  assert.throws(() =>
    validatePublicationDates("x", { published: "2026-01-01" }, { kind: "essay", today: "2026-02-30" })
  );
});

test("display shows known dates and only a distinct revision", () => {
  assert.deepEqual(publicationDisplay({ published: "2026-11-12", updated: "2026-11-13" }), {
    published: "2026-11-12",
    updated: "2026-11-13",
  });
  assert.deepEqual(publicationDisplay({ published: "2026-11-12", updated: "2026-11-12" }), {
    published: "2026-11-12",
    updated: undefined,
  });
  assert.deepEqual(publicationDisplay({ published: UNKNOWN_DATE, updated: "2026-11-10" }), {
    published: undefined,
    updated: "2026-11-10",
  });
  assert.deepEqual(publicationDisplay({ published: UNKNOWN_DATE, updated: UNKNOWN_DATE }), {
    published: undefined,
    updated: undefined,
  });
  assert.deepEqual(publicationDisplay({ published: "2026-09-13" }), {
    published: "2026-09-13",
    updated: undefined,
  });
});

test("structured data carries only known dates", () => {
  assert.deepEqual(publicationStructuredData({ published: "2026-11-12", updated: "2026-11-13" }), {
    datePublished: "2026-11-12",
    dateModified: "2026-11-13",
  });
  assert.deepEqual(publicationStructuredData({ published: "2026-11-12", updated: "2026-11-12" }), {
    datePublished: "2026-11-12",
    dateModified: "2026-11-12",
  });
  assert.deepEqual(publicationStructuredData({ published: UNKNOWN_DATE, updated: "2026-11-10" }), {
    dateModified: "2026-11-10",
  });
  assert.deepEqual(publicationStructuredData({ published: UNKNOWN_DATE, updated: UNKNOWN_DATE }), {});
  assert.deepEqual(publicationStructuredData({ published: "2026-09-13" }), { datePublished: "2026-09-13" });
});
