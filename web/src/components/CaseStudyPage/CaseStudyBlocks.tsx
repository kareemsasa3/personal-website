import type { CaseStudyBlock } from "../../data/caseStudies";
import ProjectMedia from "../ProjectMedia";

/** Section blocks for studies whose argument needs more than the standard fields. */
const CaseStudyBlocks = ({ blocks }: { blocks?: CaseStudyBlock[] }) => {
  if (!blocks?.length) {
    return null;
  }

  return (
    <>
      {blocks.map((block, index) => {
        const key = `${block.kind}-${index}`;

        switch (block.kind) {
          case "prose":
            return (
              <div key={key} className="case-study-block">
                {block.heading && <h3>{block.heading}</h3>}
                {block.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            );
          case "list":
            return (
              <div key={key} className="case-study-block">
                {block.heading && <h3>{block.heading}</h3>}
                <ul className="case-study-list">
                  {block.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            );
          case "prompts":
            return (
              <div key={key} className="case-study-block">
                {block.heading && <h3>{block.heading}</h3>}
                {block.prompts.map((prompt) => (
                  <details key={prompt.label} className="case-study-prompt">
                    <summary>
                      <span>{prompt.label}</span>
                      <span className="case-study-prompt__meta">{prompt.summary}</span>
                    </summary>
                    <pre>{prompt.text}</pre>
                  </details>
                ))}
              </div>
            );
          case "images":
            return (
              <figure key={key} className="case-study-block case-study-figure">
                <div className="case-study-figure__images">
                  {block.images.map((image) => (
                    // Shown no larger than its CSS size, so its text stays at the size it was captured.
                    <div
                      key={image.src}
                      className="case-study-figure__item"
                      style={{ maxWidth: image.width / (image.density ?? 1) }}
                    >
                      <ProjectMedia media={{ poster: image }} label={image.label} />
                    </div>
                  ))}
                </div>
                <figcaption>{block.caption}</figcaption>
              </figure>
            );
          case "recording":
            return (
              <ProjectMedia
                key={key}
                media={block.media}
                label={block.label}
                mode="video"
                className="case-study-block case-study-recording"
              />
            );
          case "comparison":
            return (
              <div key={key} className="case-study-block case-study-comparison">
                <table>
                  <caption>{block.caption}</caption>
                  <thead>
                    <tr>
                      <td />
                      {block.columns.map((column) => (
                        <th key={column} scope="col">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row) => (
                      <tr key={row.label}>
                        <th scope="row">{row.label}</th>
                        {row.values.map((value, column) => (
                          <td key={block.columns[column]} data-label={block.columns[column]}>
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {block.note && <p className="case-study-comparison__note">{block.note}</p>}
              </div>
            );
          default:
            return null;
        }
      })}
    </>
  );
};

export default CaseStudyBlocks;
