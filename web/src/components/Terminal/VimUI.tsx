import React, { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
// Only import the most commonly used languages to reduce bundle size
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-css";
import "prismjs/components/prism-json";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-markup";
// Removed sourceFileSystem dependency
import { INSTANT, motionToken } from "../../utils/motionTokens";
import { useTheme } from "../../contexts/useTheme";
import "./VimUI.css";

interface VimUIProps {
  isVisible: boolean;
  filePath: string;
  content: string[];
  onClose: () => void;
  onSave?: (content: string[]) => void;
  isReadOnly?: boolean;
}

const VimUI: React.FC<VimUIProps> = ({
  isVisible,
  filePath,
  content,
  onClose,
  onSave,
  isReadOnly = false,
}) => {
  const reduce = useReducedMotion();
  const [editedContent, setEditedContent] = useState<string[]>(content);
  const [cursorPosition, setCursorPosition] = useState({ line: 0, column: 0 });
  const [scrollPosition, setScrollPosition] = useState(0);
  const [mode, setMode] = useState<"normal" | "insert" | "visual">("normal");
  const [commandLine, setCommandLine] = useState("");
  const [showCommandLine, setShowCommandLine] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const { theme } = useTheme();
  // The block cursor (§17 Composite recipes, Cursor) shows only while the editor, or a line inside it, has focus.
  const [editorFocused, setEditorFocused] = useState(false);
  // The editor's lines are on the cell grid (the glyph style): a column is one cell wide and a line one cell tall.
  const cell = useMemo(() => {
    const root = getComputedStyle(document.documentElement);
    return { w: parseFloat(root.getPropertyValue("--cell-w")), h: parseFloat(root.getPropertyValue("--cell-h")) };
  }, []);

  // Each move restarts the blink, so the block is on while the cursor moves.
  useLayoutEffect(() => {
    for (const animation of cursorRef.current?.getAnimations() ?? []) animation.currentTime = 0;
  }, [cursorPosition]);

  // Simple syntax language detection
  const getSyntaxLanguage = (path: string): string => {
    const ext = path.split(".").pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
      ts: "typescript",
      tsx: "typescript",
      js: "javascript",
      jsx: "javascript",
      json: "json",
      css: "css",
      html: "markup",
      md: "markdown",
      txt: "text",
    };
    return languageMap[ext || ""] || "text";
  };

  const language = getSyntaxLanguage(filePath);

  // Update content when file changes
  useEffect(() => {
    setEditedContent(content);
  }, [content]);

  // Highlight syntax when content changes
  useEffect(() => {
    if (editorRef.current) {
      Prism.highlightAllUnder(editorRef.current);
    }
  }, [editedContent, language]);

  const handleCommand = useCallback(
    (cmd: string) => {
      const trimmedCmd = cmd.trim();

      if (trimmedCmd === "q" || trimmedCmd === "quit") {
        onClose();
      } else if (trimmedCmd === "w" || trimmedCmd === "write") {
        if (onSave) {
          onSave(editedContent);
        }
      } else if (trimmedCmd === "wq" || trimmedCmd === "x") {
        if (onSave) {
          onSave(editedContent);
        }
        onClose();
      } else if (trimmedCmd.startsWith("set ")) {
        // Handle vim settings
        const setting = trimmedCmd.substring(4);
        if (setting === "readonly") {
          // Could implement readonly mode
        }
      }
    },
    [onClose, onSave, editedContent]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (showCommandLine) {
        if (e.key === "Enter") {
          handleCommand(commandLine);
          setShowCommandLine(false);
          setCommandLine("");
        } else if (e.key === "Escape") {
          setShowCommandLine(false);
          setCommandLine("");
        }
        return;
      }

      switch (e.key) {
        case "Escape":
          if (mode === "insert") {
            setMode("normal");
          }
          break;
        case ":":
          if (mode === "normal") {
            setShowCommandLine(true);
          }
          break;
        case "q":
          if (mode === "normal") {
            onClose();
          }
          break;
        case "i":
          if (mode === "normal" && !isReadOnly) {
            setMode("insert");
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (cursorPosition.line > 0) {
            setCursorPosition((prev) => ({
              line: prev.line - 1,
              column: Math.min(
                prev.column,
                editedContent[prev.line - 1]?.length || 0
              ),
            }));
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          if (cursorPosition.line < editedContent.length - 1) {
            setCursorPosition((prev) => ({
              line: prev.line + 1,
              column: Math.min(
                prev.column,
                editedContent[prev.line + 1]?.length || 0
              ),
            }));
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (cursorPosition.column > 0) {
            setCursorPosition((prev) => ({ ...prev, column: prev.column - 1 }));
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (
            cursorPosition.column <
            (editedContent[cursorPosition.line]?.length || 0)
          ) {
            setCursorPosition((prev) => ({ ...prev, column: prev.column + 1 }));
          }
          break;
        case "PageUp":
          e.preventDefault();
          setScrollPosition((prev) => Math.max(0, prev - 20));
          break;
        case "PageDown":
          e.preventDefault();
          setScrollPosition((prev) => prev + 20);
          break;
      }
    },
    [
      mode,
      cursorPosition,
      editedContent,
      showCommandLine,
      commandLine,
      isReadOnly,
      onClose,
      handleCommand,
    ]
  );

  const handleContentChange = (lineIndex: number, newLine: string) => {
    if (isReadOnly) return;

    const newContent = [...editedContent];
    newContent[lineIndex] = newLine;
    setEditedContent(newContent);
  };

  const renderLine = (line: string, lineIndex: number) => {
    const isCurrentLine = lineIndex === cursorPosition.line;
    const lineNumber = lineIndex + 1;

    return (
      <div
        key={lineIndex}
        className={`vim-line df-glyph ${isCurrentLine ? "vim-current-line" : ""}`}
        style={{ transform: `translateY(-${scrollPosition * cell.h}px)` }}
      >
        <span className="vim-line-number">
          {lineNumber.toString().padStart(4)}
        </span>
        <span className="vim-line-content">
          {isReadOnly ? (
            <code className={`language-${language}`}>{line}</code>
          ) : (
            <input
              type="text"
              value={line}
              onChange={(e) => handleContentChange(lineIndex, e.target.value)}
              className={`vim-line-input language-${language}`}
              disabled={isReadOnly}
            />
          )}
          {/* The cursor sits on the current line, on its column's cell, with the character under it knocked out. */}
          {editorFocused && isCurrentLine && (
            <span
              ref={cursorRef}
              // The glow follows the site theme; inside a scoped [data-theme] wrapper (P5-1) it would need that theme.
              className={`vim-cursor df-glyph${theme === "dark" ? " vim-cursor--glow" : ""}`}
              style={{ left: cursorPosition.column * cell.w }}
              aria-hidden="true"
            >
              {line[cursorPosition.column] ?? ""}
            </span>
          )}
        </span>
      </div>
    );
  };

  const getStatusBarText = () => {
    const totalLines = editedContent.length;
    const currentLine = cursorPosition.line + 1;
    const currentCol = cursorPosition.column + 1;
    const modeText = mode.toUpperCase();
    const readonlyText = isReadOnly ? " [READ ONLY]" : "";

    return `${filePath}${readonlyText} - ${currentLine},${currentCol} - ${totalLines} lines - ${modeText}`;
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="vim-overlay"
          initial={{ opacity: 0 }}
          // §12: state transition (create) · editor opened
          animate={{ opacity: 1, transition: reduce ? INSTANT : motionToken("--dur-base", "--ease-settle") }}
          // §12: state transition (remove) · editor closed
          exit={{ opacity: 0, transition: reduce ? INSTANT : motionToken("--dur-fast", "--ease-depart") }}
        >
          <div className="vim-container">
            {/* Vim Header */}
            <div className="vim-header">
              <div className="vim-title">VIM - {filePath}</div>
              <div className="vim-controls">
                <button className="vim-close-btn" onClick={onClose}>
                  ×
                </button>
              </div>
            </div>

            {/* Vim Editor */}
            <div
              className="vim-editor"
              ref={editorRef}
              onKeyDown={handleKeyDown}
              onFocus={() => setEditorFocused(true)}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setEditorFocused(false);
              }}
              tabIndex={0}
            >
              <div className="vim-content">
                {editedContent.map((line, index) => renderLine(line, index))}
              </div>
            </div>

            {/* Command Line */}
            {showCommandLine && (
              <div className="vim-command-line">
                <span className="vim-command-prompt">:</span>
                <input
                  type="text"
                  value={commandLine}
                  onChange={(e) => setCommandLine(e.target.value)}
                  className="vim-command-input"
                  autoFocus
                />
              </div>
            )}

            {/* Status Bar */}
            <div className="vim-status-bar">
              <span className="vim-status-text">{getStatusBarText()}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VimUI;
