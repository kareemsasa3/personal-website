import {
  formatCalendarDate,
  publicationDisplay,
  type PublicationDate,
} from "../../utils/publicationDates.mjs";

interface PublicationDatesProps {
  published?: PublicationDate | string;
  updated?: PublicationDate | string;
  /** Prefix the publication date with "Published" (case studies do; essay metadata lines don't). */
  labelPublished?: boolean;
}

/**
 * Inline publication and revision dates. Unknown dates are omitted, never
 * replaced, and "Updated" appears only for a distinct known revision. Renders
 * nothing when no date is known, so callers decide whether to render a wrapper.
 */
const PublicationDates = ({ published, updated, labelPublished = false }: PublicationDatesProps) => {
  const shown = publicationDisplay({ published, updated });
  if (!shown.published && !shown.updated) return null;

  return (
    <>
      {shown.published ? (
        <span>
          {labelPublished ? "Published " : null}
          <time dateTime={shown.published}>{formatCalendarDate(shown.published)}</time>
        </span>
      ) : null}
      {shown.published && shown.updated ? <span aria-hidden="true"> · </span> : null}
      {shown.updated ? (
        <span>
          Updated <time dateTime={shown.updated}>{formatCalendarDate(shown.updated)}</time>
        </span>
      ) : null}
    </>
  );
};

export default PublicationDates;
