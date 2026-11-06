// §06 (Numeric readout; Numerals): a live value holds one width while it changes, so the labels and units beside it stay
// where they are. In the mono face every character takes one cell, so a constant character count is a constant width:
// shorter text is padded at the start with spaces (the value's CSS preserves them), and a value that rounds to zero is
// shown without a sign.
export const fixedWidth = (text: string, width: number) =>
  (/^-[0.]+$/.test(text) ? text.slice(1) : text).padStart(width);
