import { getBuildLabel } from "../../data/buildInfo";

const BuildIdentifier = () => {
  const { text, href, accessibleName } = getBuildLabel();

  return (
    <p className="settings-build df-annotation">
      {href ? (
        <a
          className="settings-build__link df-control df-control--light"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={accessibleName}
        >
          {text} <span aria-hidden="true">↗</span>
        </a>
      ) : (
        text
      )}
    </p>
  );
};

export default BuildIdentifier;
