import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import "./Terminal.css";
import "./TerminalErrorBoundary.css";
import { useTerminal } from "../../hooks/useTerminal";
import { fileSystem } from "../../data/fileSystem";
import { useWindowManagement } from "../../hooks/useWindowManagement";
import { useLockBodyScroll } from "../../hooks/useLockBodyScroll";
import TerminalWindow from "./TerminalWindow";
import TerminalView from "./TerminalView";
import TerminalOverlays from "./TerminalOverlays";
import TerminalErrorBoundary from "./TerminalErrorBoundary";

interface TerminalProps {
  isIntro: boolean;
}

const Terminal: React.FC<TerminalProps> = ({ isIntro }) => {
  const navigate = useNavigate();

  // State initialization
  const [hasShownIntro, setHasShownIntro] = useState(() => {
    try {
      return localStorage.getItem("terminal-intro-shown") === "true";
    } catch (error) {
      console.error("Failed to load terminal intro state:", error);
      return false;
    }
  });

  // Track when terminal state is loaded
  const [isStateLoaded, setIsStateLoaded] = useState(false);

  // Calculate terminal dimensions
  const getTerminalDimensions = () => {
    return {
      width: Math.min(window.innerWidth * 0.9, 800),
      height: Math.min(window.innerHeight * 0.7, 600),
    };
  };

  // The navigation handler
  const handleRouteNavigation = (route: string) => {
    navigate(route.startsWith("/") ? route : `/${route}`);
  };

  // Use the terminal logic hook
  const {
    coreState,
    coreHandlers,
    topState,
    topHandlers,
    executeCommand,
  } = useTerminal(fileSystem, handleRouteNavigation, !isIntro);

  // Submitted commands (oldest first) for Up/Down recall
  const submittedCommands = useMemo(
    () =>
      coreState.commandHistory
        .filter((entry) => entry.type === "command")
        .map((entry) => entry.text),
    [coreState.commandHistory]
  );

  // Input typed before history navigation started, restored past the newest entry
  const historyDraftRef = useRef("");

  // Handle terminal close
  const handleTerminalClose = useCallback(() => {
    // Reset terminal state when closing
    coreHandlers.resetTerminal();
    navigate("/");
  }, [coreHandlers, navigate]);

  // Use the new window management hook
  const windowManagement = useWindowManagement({
    initialWidth: getTerminalDimensions().width,
    initialHeight: getTerminalDimensions().height,
    isIntro,
    onClose: handleTerminalClose,
  });

  // Use the body scroll lock hook
  useLockBodyScroll(isIntro);

  // Mark state as loaded after terminal state is initialized
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsStateLoaded(true);
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  // Show prompt when not in intro mode
  useEffect(() => {
    if (!isIntro && hasShownIntro && !coreState.showPrompt) {
      // Show prompt after a short delay when not in intro mode
      const timer = setTimeout(() => {
        coreHandlers.setShowPrompt(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isIntro, hasShownIntro, coreState.showPrompt, coreHandlers]);

  // Handle intro completion
  const handleIntroComplete = () => {
    setHasShownIntro(true);
    try {
      localStorage.setItem("terminal-intro-shown", "true");
    } catch (error) {
      console.error("Failed to save terminal intro state:", error);
    }
    setTimeout(() => coreHandlers.setShowPrompt(true), 200);
  };

  // Handle command submission
  const handleCommandSubmit = () => {
    coreHandlers.resetHistoryIndex();
    if (coreState.isReverseSearch) {
      if (coreState.reverseSearchResults.length > 0) {
        const selectedCommand =
          coreState.reverseSearchResults[coreState.reverseSearchIndex];
        coreHandlers.setCurrentCommand(selectedCommand);
        coreHandlers.exitReverseSearch();
        executeCommand(selectedCommand);
        coreHandlers.clearCommand();
      }
    } else if (coreState.currentCommand.trim()) {
      executeCommand(coreState.currentCommand.trim());
      coreHandlers.clearCommand();
    }
  };

  // Handle command change
  const handleCommandChange = (value: string) => {
    if (coreState.isReverseSearch) {
      // Reverse search matches submitted commands only, never output lines
      const results = submittedCommands.filter((command) =>
        command.toLowerCase().includes(value.toLowerCase())
      );
      coreHandlers.updateReverseSearch(value, results);
    } else {
      coreHandlers.setCurrentCommand(value);
      // Editing detaches the input from history navigation
      if (coreState.historyIndex !== -1) {
        coreHandlers.resetHistoryIndex();
      }
    }
  };

  // Handle key down events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key.toLowerCase() === "l") {
      e.preventDefault();
      executeCommand("clear");
    } else if (e.ctrlKey && e.key.toLowerCase() === "c" && !window.getSelection()?.toString()) {
      e.preventDefault();
      coreHandlers.clearCommand();
      coreHandlers.exitReverseSearch();
      coreHandlers.resetHistoryIndex();
    } else if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      const result = coreHandlers.handleTabComplete(coreState.currentCommand);
      coreHandlers.setCurrentCommand(result.currentCommand);
      coreHandlers.resetHistoryIndex();
      coreHandlers.setAutocompleteIndex(result.autocompleteIndex);
      if (result.suggestions) {
        coreHandlers.dispatch({
          type: "SET_AUTOCOMPLETE_SUGGESTIONS",
          payload: result.suggestions,
        });
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (coreState.isReverseSearch) {
        // Navigate reverse search results up
        const newIndex = Math.max(0, coreState.reverseSearchIndex - 1);
        coreHandlers.setReverseSearchIndex(newIndex);
      } else if (submittedCommands.length > 0) {
        // Navigate history up (index 0 = newest submitted command)
        const currentIndex = coreState.historyIndex;
        if (currentIndex === -1) {
          historyDraftRef.current = coreState.currentCommand;
        }
        const newIndex = Math.min(
          submittedCommands.length - 1,
          currentIndex + 1
        );
        coreHandlers.setHistoryIndex(newIndex);
        coreHandlers.setCurrentCommand(
          submittedCommands[submittedCommands.length - 1 - newIndex]
        );
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (coreState.isReverseSearch) {
        // Navigate reverse search results down
        const newIndex = Math.min(
          coreState.reverseSearchResults.length - 1,
          coreState.reverseSearchIndex + 1
        );
        coreHandlers.setReverseSearchIndex(newIndex);
      } else if (coreState.historyIndex !== -1) {
        // Navigate history down, restoring the draft past the newest entry
        const newIndex = coreState.historyIndex - 1;
        coreHandlers.setHistoryIndex(newIndex);
        coreHandlers.setCurrentCommand(
          newIndex === -1
            ? historyDraftRef.current
            : submittedCommands[submittedCommands.length - 1 - newIndex]
        );
      }
    } else if (e.ctrlKey && e.key === "r") {
      e.preventDefault();
      coreHandlers.startReverseSearch();
    } else if (e.key === "Escape") {
      e.preventDefault();
      coreHandlers.exitReverseSearch();
    }
  };

  useEffect(() => {
    if (!windowManagement.isMaximized) return;
    const restore = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !coreState.isManPage && !topState.isTopCommand && !coreState.isReverseSearch) {
        windowManagement.handleMaximize();
      }
    };
    document.addEventListener("keydown", restore);
    return () => document.removeEventListener("keydown", restore);
  }, [windowManagement, coreHandlers, coreState.isManPage, coreState.isReverseSearch, topState.isTopCommand]);

  return (
    <TerminalErrorBoundary>
      <div
        className={`terminal-screen ${isIntro ? "intro-mode" : "route-mode"} ${
          windowManagement.isMaximized ? "window-maximized" : ""
        }`}
      >
        {!isIntro && (
          <div className="terminal-route-intro">
            {/* Inner wrapper carries the scrim: prose-surface sets position: relative, which would override the intro's absolute positioning */}
            <div className="prose-surface">
              <h1 className="terminal-route-title">Terminal</h1>
              <p className="terminal-route-description">
                Interactive interface for exploring parts of the site and
                projects.
              </p>
            </div>
          </div>
        )}

        {/* The sidecar for minimized state - NOW a BUTTON */}
        {isStateLoaded && windowManagement.showSidecar && (
          <button
            className="terminal-sidecar"
            onClick={windowManagement.handleMinimize}
            aria-label="Restore terminal window"
          >
            <span className="sidecar-icon" aria-hidden="true">
              &gt;_ Terminal minimized — reopen
            </span>
          </button>
        )}

        {/* Overlays */}
        <TerminalOverlays
          // Man page props
          isManPage={coreState.isManPage}
          currentManPage={coreState.currentManPage}
          manPageScrollPosition={coreState.manPageScrollPosition}
          onHideManPage={coreHandlers.hideManPage}
          onSetManPageScroll={coreHandlers.setManPageScroll}
          // Top command props
          isTopCommand={topState.isTopCommand}
          topProcesses={topState.topProcesses}
          topSortBy={topState.topSortBy}
          topSortOrder={topState.topSortOrder}
          topRefreshRate={topState.topRefreshRate}
          topSelectedPid={topState.topSelectedPid}
          onHideTopCommand={topHandlers.hideTopCommand}
          onSetTopSort={topHandlers.setTopSort}
          onKillTopProcess={topHandlers.killTopProcess}
          onSetTopSelectedPid={topHandlers.setTopSelectedPid}
        />

        {/* Main terminal window */}
        {!windowManagement.isMinimized && <TerminalWindow
          containerStyles={windowManagement.containerStyles}
          isMaximized={windowManagement.isMaximized}
          isDragging={windowManagement.isDragging}
          currentDirectory={coreState.currentDirectory}
          onMouseDown={windowManagement.handleMouseDown}
          onClose={windowManagement.handleClose}
          onMinimize={windowManagement.handleMinimize}
          onMaximize={windowManagement.handleMaximize}
        >
          <TerminalView
            commandHistory={coreState.commandHistory}
            currentCommand={coreState.currentCommand}
            showPrompt={coreState.showPrompt}
            currentDirectory={coreState.currentDirectory}
            hasShownIntro={hasShownIntro}
            isReverseSearch={coreState.isReverseSearch}
            reverseSearchTerm={coreState.reverseSearchTerm}
            reverseSearchResults={coreState.reverseSearchResults}
            reverseSearchIndex={coreState.reverseSearchIndex}
            autocompleteSuggestions={coreState.autocompleteSuggestions}
            autocompleteIndex={coreState.autocompleteIndex}
            onCommandChange={handleCommandChange}
            onCommandSubmit={handleCommandSubmit}
            onKeyDown={handleKeyDown}
            onIntroComplete={handleIntroComplete}
            terminalRef={coreHandlers.terminalRef}
          />
        </TerminalWindow>}
      </div>
    </TerminalErrorBoundary>
  );
};

export default Terminal;
