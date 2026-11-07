const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Turns grep output into HTML for the terminal. Grep wraps each match in ANSI
 * bold-red codes; those become highlight spans. The matched text comes from file
 * contents, so it is escaped first and can never be parsed as markup.
 */
export const grepHighlightHtml = (text: string): string =>
  text
    .replace(/[&<>"']/g, (char) => HTML_ESCAPES[char])
    // eslint-disable-next-line no-control-regex
    .replace(/\x1b\[1;31m(.*?)\x1b\[0m/g, '<span class="grep-highlight">$1</span>');
