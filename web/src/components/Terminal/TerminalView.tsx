import React, { useRef, useEffect, useLayoutEffect, useState, useCallback } from "react";
import { useTheme } from "../../contexts/useTheme";
import "./TerminalView.css";

interface CommandHistoryItem {
  text: string;
  type?: string;
  highlightedText?: string;
}

interface TerminalViewProps {
  commandHistory: CommandHistoryItem[];
  currentCommand: string;
  showPrompt: boolean;
  currentDirectory: string;
  hasShownIntro: boolean;
  isReverseSearch: boolean;
  reverseSearchTerm: string;
  reverseSearchResults: string[];
  reverseSearchIndex: number;
  autocompleteSuggestions: string[];
  autocompleteIndex: number;
  onCommandChange: (value: string) => void;
  onCommandSubmit: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onIntroComplete: () => void;
  terminalRef: React.RefObject<HTMLDivElement>;
}

const TerminalView: React.FC<TerminalViewProps> = ({
  commandHistory,
  currentCommand,
  showPrompt,
  currentDirectory,
  hasShownIntro,
  isReverseSearch,
  reverseSearchTerm,
  reverseSearchResults,
  reverseSearchIndex,
  autocompleteSuggestions,
  autocompleteIndex,
  onCommandChange,
  onCommandSubmit,
  onKeyDown,
  onIntroComplete,
  terminalRef,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const followOutputRef = useRef(true);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const { theme } = useTheme();
  // The block cursor (§17 Composite recipes, Cursor): shown only while the input has focus, never during IME
  // composition (the browser's own caret marks the composition then), and never over a selected range.
  const [focused, setFocused] = useState(false);
  const [composing, setComposing] = useState(false);
  const [caret, setCaret] = useState<{ left: number; glyph: string } | null>(null);

  // One character per cell (the glyph style): the caret's cell is its index times the cell width, less the input's
  // own horizontal scroll. Characters wider than a cell (CJK, emoji) are not on this grid. `reveal` is set only by a
  // resize; every other caller (caret moves, the user's own scrolling) leaves the scroll alone.
  const place = useCallback((reveal: boolean) => {
    const input = inputRef.current;
    if (!input || document.activeElement !== input) return setCaret(null);
    const start = input.selectionStart;
    if (start === null || start !== input.selectionEnd) return setCaret(null);
    const cellW = parseFloat(getComputedStyle(input).getPropertyValue("--cell-w"));
    // A narrower input (a resize) can leave the caret's cell scrolled out of view, where the browser does not bring it
    // back on its own: then, and only then, scroll just enough to show it.
    const at = start * cellW;
    if (reveal && at - input.scrollLeft < 0) input.scrollLeft = at;
    else if (reveal && at + cellW - input.scrollLeft > input.clientWidth) input.scrollLeft = at + cellW - input.clientWidth;
    const left = at - input.scrollLeft;
    // The input keeps one cell of padding after its text, so a caret at the end of a scrolled line still has a whole
    // cell inside the input's box (and its focus ring). A cell outside that box (the user scrolled the line) gets no
    // block until the caret moves back into view.
    if (left < -0.5 || left + cellW > input.clientWidth + 0.5) return setCaret(null);
    const glyph = input.value ? ([...input.value.slice(start)][0] ?? "") : (input.placeholder[0] ?? "");
    setCaret((prev) => (prev && prev.left === left && prev.glyph === glyph ? prev : { left, glyph }));
  }, []);
  const placeCursor = useCallback(() => place(false), [place]);

  // A value set from outside (history, completion, a cleared prompt, the search mode) moves the caret too.
  useLayoutEffect(() => {
    placeCursor();
  }, [placeCursor, currentCommand, reverseSearchTerm, isReverseSearch, showPrompt, focused]);

  // While focused, the block follows the caret as it moves (a held arrow, Home, End, word jumps fire selectionchange
  // before keyup) and when the input's box changes size (a resize can change its scroll).
  useEffect(() => {
    const input = inputRef.current;
    if (!focused || !input) return;
    document.addEventListener("selectionchange", placeCursor);
    const resize = new ResizeObserver(() => place(true));
    resize.observe(input);
    return () => {
      document.removeEventListener("selectionchange", placeCursor);
      resize.disconnect();
    };
  }, [focused, isReverseSearch, showPrompt, place, placeCursor]);

  // Each move restarts the blink, so the block is on while the caret moves.
  useLayoutEffect(() => {
    for (const animation of cursorRef.current?.getAnimations() ?? []) animation.currentTime = 0;
  }, [caret]);

  // The welcome line is plain text, so the intro is complete on mount.
  useEffect(() => {
    if (!hasShownIntro) {
      onIntroComplete();
    }
    // Mount only: the callback is re-created every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Focus input when prompt is shown
  useEffect(() => {
    if (showPrompt && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showPrompt]);

  // Remember the user's position before new output changes the scroll height.
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    followOutputRef.current =
      container.scrollHeight - container.clientHeight - container.scrollTop <= 50;
  };

  useLayoutEffect(() => {
    const container = terminalRef.current;
    if (container && followOutputRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [commandHistory, showPrompt, terminalRef]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (isReverseSearch) {
        // In reverse search mode, execute the matched command and exit search
        if (reverseSearchResults.length > 0) {
          const selectedCommand = reverseSearchResults[reverseSearchIndex];
          onCommandChange(selectedCommand);
          followOutputRef.current = true;
          onCommandSubmit();
        }
      } else if (currentCommand.trim()) {
        followOutputRef.current = true;
        onCommandSubmit();
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onCommandChange(value);
  };

  // Both inputs (the command and the reverse search) report focus and caret moves to the one block.
  const cursorEvents = {
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    onSelect: placeCursor,
    onKeyUp: placeCursor,
    onScroll: placeCursor,
    onCompositionStart: () => setComposing(true),
    onCompositionEnd: () => setComposing(false),
  };
  const cursor = focused && !composing && caret && (
    <span
      ref={cursorRef}
      // The glow follows the site theme, not the tokens in scope: inside a scoped [data-theme] wrapper (P5-1) this
      // would need the wrapper's theme instead.
      className={`terminal-cursor df-glyph${theme === "dark" ? " terminal-cursor--glow" : ""}`}
      style={{ left: caret.left }}
      aria-hidden="true"
    >
      {caret.glyph}
    </span>
  );

  return (
    <div className="terminal-body" ref={terminalRef} onScroll={handleScroll} onClick={(event) => {
      if (!window.getSelection()?.toString() && !(event.target as HTMLElement).closest("a, button")) inputRef.current?.focus();
    }}>
      <div className="terminal-message df-glyph">
        <span>Welcome to my terminal.</span>
      </div>

      <div className="command-history">
        {commandHistory.map((line, index) => (
          <div key={index} className={`history-line df-glyph ${line.type || ""}`}>
            {line.highlightedText ? (
              <span
                dangerouslySetInnerHTML={{
                  __html: line.highlightedText.replace(
                    // Grep emits ANSI escape characters around each match.
                    // eslint-disable-next-line no-control-regex
                    /\x1b\[1;31m(.*?)\x1b\[0m/g,
                    '<span class="grep-highlight">$1</span>'
                  ),
                }}
              />
            ) : (
              line.text
            )}
          </div>
        ))}
      </div>

      {showPrompt && (
        <div className="command-prompt">
          {isReverseSearch ? (
            <div className="reverse-search-prompt">
              <span className="reverse-search-indicator df-glyph">
                (reverse-i-search)`{reverseSearchTerm}&apos;:
              </span>
              <span className="reverse-search-command df-glyph">
                {reverseSearchResults.length > 0
                  ? reverseSearchResults[reverseSearchIndex]
                  : ""}
              </span>
              <span className="command-input-field">
                <input
                  ref={inputRef}
                  type="text"
                  value={reverseSearchTerm}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  onKeyDown={onKeyDown}
                  {...cursorEvents}
                  className="command-input reverse-search-input df-glyph"
                  placeholder="Type to search command history"
                  autoFocus
                />
                {cursor}
              </span>
              {reverseSearchResults.length > 0 && (
                <span className="reverse-search-info df-glyph">
                  {reverseSearchIndex + 1}/{reverseSearchResults.length}
                </span>
              )}
            </div>
          ) : (
            <>
              <span className="prompt-symbol df-glyph">
                portfolio@kareem-sasa:
                {currentDirectory === "/" ? "~" : currentDirectory}$
              </span>
              <span className="command-input-field">
                <input
                  ref={inputRef}
                  type="text"
                  value={currentCommand}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  onKeyDown={onKeyDown}
                  {...cursorEvents}
                  className="command-input df-glyph"
                  placeholder="Type 'help' for available commands"
                  autoFocus
                />
                {cursor}
              </span>
            </>
          )}
        </div>
      )}

      {/* Autocomplete Suggestions */}
      {autocompleteSuggestions.length > 1 && showPrompt && !isReverseSearch && (
        <div className="autocomplete-suggestions df-data">
          <div className="suggestions-header">Multiple matches:</div>
          <div className="suggestions-list">
            {autocompleteSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className={`suggestion-item ${
                  index === autocompleteIndex ? "selected" : ""
                }`}
              >
                {suggestion}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TerminalView;
