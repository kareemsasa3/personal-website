/** A calendar day in America/Chicago, written YYYY-MM-DD. Validated at build time. */
export type CalendarDate = `${number}-${number}-${number}`;
export type UnknownDate = "unknown";
/** A date, or an explicit statement that no reliable evidence establishes it. */
export type PublicationDate = CalendarDate | UnknownDate;

export interface PublicationDates {
  published: PublicationDate;
  updated?: PublicationDate;
}

export declare const UNKNOWN_DATE: UnknownDate;
export declare const PUBLICATION_TIME_ZONE: "America/Chicago";

export declare const isCalendarDate: (value: unknown) => value is CalendarDate;
export declare const isKnownDate: (value: unknown) => value is CalendarDate;
export declare const todayInPublicationTimeZone: (now?: Date) => CalendarDate;
export declare const formatCalendarDate: (value: string) => string;

export declare const validatePublicationDates: (
  label: string,
  dates: { published?: string; updated?: string },
  options: { kind: "case-study" | "essay"; today?: string }
) => string[];

export declare const publicationDisplay: (dates: { published?: string; updated?: string }) => {
  published?: CalendarDate;
  updated?: CalendarDate;
};

export declare const publicationStructuredData: (dates: { published?: string; updated?: string }) => {
  datePublished?: CalendarDate;
  dateModified?: CalendarDate;
};
