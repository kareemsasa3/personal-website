import { getBuildLabel } from "../../data/buildInfo";

const BuildIdentifier = () => {
  const { text, href, accessibleName } = getBuildLabel();

  return (
    <p className="settings-build">
      {href ? (
        <a
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
