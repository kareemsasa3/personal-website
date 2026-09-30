import type { BuildInfo } from "../types/buildInfo";

export const SITE_REPOSITORY_URL =
  "https://github.com/kareemsasa3/personal-website";

const SHORT_SHA_LENGTH = 7;

export interface BuildLabel {
  text: string;
  href?: string;
  accessibleName?: string;
}

// Only CI builds link out: a local commit may not exist on GitHub yet.
export const getBuildLabel = (info: BuildInfo = __BUILD_INFO__): BuildLabel => {
  if (info.source === "none") return { text: "Development build" };

  const shortSha = info.sha.slice(0, SHORT_SHA_LENGTH);
  if (info.source === "local") {
    return {
      text: `Local build · ${shortSha}${info.dirty ? " · modified" : ""}`,
    };
  }

  return {
    text: `Build ${shortSha}`,
    href: `${SITE_REPOSITORY_URL}/commit/${info.sha}`,
    accessibleName: `Build ${shortSha}, view commit on GitHub`,
  };
};
