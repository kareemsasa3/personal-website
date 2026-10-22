import React, { useRef, useEffect, useLayoutEffect } from "react";
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
              <input
                ref={inputRef}
                type="text"
                value={reverseSearchTerm}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                onKeyDown={onKeyDown}
                className="command-input reverse-search-input df-glyph"
                placeholder="Type to search command history"
                autoFocus
              />
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
              <input
                ref={inputRef}
                type="text"
                value={currentCommand}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                onKeyDown={onKeyDown}
                className="command-input df-glyph"
                placeholder="Type 'help' for available commands"
                autoFocus
              />
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
