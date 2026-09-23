/**
 * Splits a terminal command line into arguments. This is argument
 * tokenization only: no pipes, redirection, globbing, or expansion.
 *
 * - Unquoted whitespace separates arguments; runs of whitespace count as one.
 * - Single quotes preserve everything literally up to the closing quote.
 * - Double quotes preserve everything, except `\"` and `\\` are unescaped.
 * - Outside quotes, a backslash before whitespace, a quote, or a backslash
 *   makes that character literal. Any other backslash is kept as-is.
 * - Adjacent quoted and unquoted segments join into one argument, and an
 *   empty quoted string (`""` or `''`) is an empty argument.
 * - An unterminated quote is an error; no partial token list is returned.
 */
export type TokenizeResult =
  | { ok: true; tokens: string[] }
  | { ok: false; error: string };

export const COMMAND_PARSE_ERROR = "parse error: unmatched quote";

const isWhitespace = (char: string) => /\s/.test(char);

export function tokenizeCommand(input: string): TokenizeResult {
  const tokens: string[] = [];
  let current = "";
  let inToken = false;
  let quote: "'" | '"' | null = null;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const next = input[i + 1];

    if (quote === "'") {
      if (char === "'") quote = null;
      else current += char;
      continue;
    }

    if (quote === '"') {
      if (char === '"') {
        quote = null;
      } else if (char === "\\" && (next === '"' || next === "\\")) {
        current += next;
        i++;
      } else {
        current += char;
      }
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      inToken = true;
    } else if (
      char === "\\" &&
      next !== undefined &&
      (isWhitespace(next) || next === "'" || next === '"' || next === "\\")
    ) {
      current += next;
      inToken = true;
      i++;
    } else if (isWhitespace(char)) {
      if (inToken) {
        tokens.push(current);
        current = "";
        inToken = false;
      }
    } else {
      current += char;
      inToken = true;
    }
  }

  if (quote) return { ok: false, error: COMMAND_PARSE_ERROR };
  if (inToken) tokens.push(current);
  return { ok: true, tokens };
}
