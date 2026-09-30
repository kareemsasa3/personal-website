import type { ProjectMedia as ProjectMediaData } from "../../data/projects";

interface MediaCaptionProps {
  video: NonNullable<ProjectMediaData["video"]>;
  id?: string;
  className?: string;
  /** "figcaption" inside the inline figure; "div" inside the viewer dialog. */
  as?: "figcaption" | "div";
}

/** What a recording shows and why it matters as evidence. */
const MediaCaption = ({
  video,
  id,
  className,
  as: Element = "div",
}: MediaCaptionProps) => (
  <Element id={id} className={["project-media__caption", className].filter(Boolean).join(" ")}>
    <p>
      <span className="project-media__caption-term">Shows</span> {video.label}
    </p>
    <p>
      <span className="project-media__caption-term">Why it matters</span>{" "}
      {video.significance}
    </p>
  </Element>
);

export default MediaCaption;
