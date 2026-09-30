import React, { useEffect, useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faUndo,
  faDownload,
  faUpload,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  DOCK_SIZE_CONFIG,
  DOCK_STIFFNESS_CONFIG,
  MAGNIFICATION_CONFIG,
  BACKGROUND_MOTION_SPEED_CONFIG,
} from "./settingsConstants";
import {
  SegmentedControl,
  SettingRow,
  SettingSlider,
  SettingSwitch,
  SettingsSection,
} from "./SettingsControls";
import BuildIdentifier from "./BuildIdentifier";
import {
  resetAllSettings,
  getAllSettings,
  parseSettingsImport,
  SETTINGS_EXPORT_VERSION,
  DEFAULT_SETTINGS,
} from "../../utils/settings";
import { useTheme, type Theme } from "../../contexts/ThemeContext";
import { useNavigationMode } from "../../contexts/NavigationModeContext";
import type { NavigationMode } from "../../contexts/NavigationModeContextTypes";
import { useWindowSize } from "../../hooks";
import { Modal, useToast } from "../common";
import ViewportPortal from "../common/ViewportPortal";
import "./SettingsPanel.css";

interface SettingsPanelProps {
  onDockSizeChange: (size: number) => void;
  currentDockSize: number;
  onDockStiffnessChange: (stiffness: number) => void;
  currentDockStiffness: number;
  onMagnificationChange: (magnification: number) => void;
  currentMagnification: number;
  isAnimationPaused: boolean;
  onAnimationToggle: (paused: boolean) => void;
  isOpen: boolean;
  onClose: () => void;
  backgroundMotionSpeed?: number;
  onBackgroundMotionSpeedChange?: (speed: number) => void;
}

const THEME_OPTIONS: readonly { value: Theme; label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

const NAV_MODE_OPTIONS: readonly { value: NavigationMode; label: string }[] = [
  { value: "dock", label: "Dock" },
  { value: "header", label: "Header" },
];

// Mirrors Dock.tsx: at this width and below the dock fixes its icon size and
// turns magnification off, so the tuning sliders have no effect.
const DOCK_COMPACT_MAX_WIDTH = 768;

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  onDockSizeChange,
  currentDockSize,
  onDockStiffnessChange,
  currentDockStiffness,
  onMagnificationChange,
  currentMagnification,
  isAnimationPaused,
  onAnimationToggle,
  isOpen,
  onClose,
  backgroundMotionSpeed,
  onBackgroundMotionSpeedChange,
}) => {
  const { showSuccess, showError } = useToast();
  const { theme, setTheme } = useTheme();
  const { navMode, setNavMode, isDockAvailable } = useNavigationMode();
  const reducedMotion = useReducedMotion() ?? false;
  const { width: windowWidth } = useWindowSize();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isDockTuningOpen, setIsDockTuningOpen] = useState(false);

  // Keep controls honest about what the dock and background actually do.
  const isDockTuningInert = windowWidth <= DOCK_COMPACT_MAX_WIDTH;
  // Reduced motion also turns magnification off, and the responsiveness
  // spring only animates magnification.
  const isMagnificationInert = isDockTuningInert || reducedMotion;
  const dockTuningNote = isDockTuningInert
    ? "Dock tuning applies on wider screens."
    : reducedMotion
      ? "Magnification and responsiveness are off while your system prefers reduced motion."
      : undefined;
  const motionSpeed =
    typeof backgroundMotionSpeed === "number" ? backgroundMotionSpeed : 1;

  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    return () => {
      if (opener?.isConnected) opener.focus();
      else document.querySelector<HTMLButtonElement>('[aria-label="Open settings"]')?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showResetModal) {
          setShowResetModal(false);
          return;
        }

        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, showResetModal]);

  const handleResetToDefaults = () => {
    setShowResetModal(true);
  };

  const confirmResetToDefaults = () => {
    try {
      // Clear localStorage
      resetAllSettings();

      // Reset all settings to defaults using the provided handlers
      onDockSizeChange(DEFAULT_SETTINGS.dockSize);
      onDockStiffnessChange(DEFAULT_SETTINGS.dockStiffness);
      onMagnificationChange(DEFAULT_SETTINGS.magnification);
      onAnimationToggle(DEFAULT_SETTINGS.isAnimationPaused);
      onBackgroundMotionSpeedChange?.(
        DEFAULT_SETTINGS.backgroundMotionSpeed ?? 1
      );
      setNavMode(DEFAULT_SETTINGS.navMode);
      setTheme("dark");

      showSuccess(
        "Settings Reset",
        "All settings have been reset to defaults."
      );
    } catch {
      showError("Reset Failed", "Failed to reset settings. Please try again.");
    }
  };

  const handleExportSettings = () => {
    try {
      const settings = { version: SETTINGS_EXPORT_VERSION, ...getAllSettings(theme) };
      const settingsBlob = new Blob([JSON.stringify(settings, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(settingsBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `web-settings-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSuccess(
        "Settings Exported",
        "Your settings have been exported successfully."
      );
    } catch (_error) {
      console.error("Failed to export settings:", _error);
      showError(
        "Export Failed",
        "Failed to export settings. Please try again."
      );
    }
  };

  const handleImportSettings = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const settings = parseSettingsImport(JSON.parse(e.target?.result as string));
            if (settings.dockSize !== undefined) onDockSizeChange(settings.dockSize);
            if (settings.dockStiffness !== undefined) onDockStiffnessChange(settings.dockStiffness);
            if (settings.magnification !== undefined) onMagnificationChange(settings.magnification);
            if (settings.theme !== undefined) setTheme(settings.theme);
            if (settings.navMode !== undefined) setNavMode(settings.navMode);
            if (settings.isAnimationPaused !== undefined) onAnimationToggle(settings.isAnimationPaused);
            if (settings.backgroundMotionSpeed !== undefined) onBackgroundMotionSpeedChange?.(settings.backgroundMotionSpeed);

            showSuccess(
              "Settings Imported",
              "Settings have been imported successfully."
            );
          } catch (error) {
            console.error("Failed to import settings:", error);
            showError(
              "Import Failed",
              "Failed to import settings. Please check the file format."
            );
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <ViewportPortal layer="panel">
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Settings Panel */}
            <motion.aside
              className="settings-sidebar"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 220 }}
              role="dialog"
              aria-modal="false"
              aria-labelledby="settings-title"
            >
              <div className="settings-panel">
                <div className="settings-header">
                  <h3 id="settings-title">Settings</h3>
                  <motion.button
                    className="settings-close"
                    ref={closeButtonRef}
                    onClick={onClose}
                    aria-label="Close settings"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </motion.button>
                </div>

                <motion.div
                  className="settings-content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.2 }}
                >
                <SettingsSection id="settings-appearance" title="Appearance">
                  <SettingRow labelId="settings-theme-label" label="Theme">
                    <SegmentedControl
                      labelledBy="settings-theme-label"
                      options={THEME_OPTIONS}
                      value={theme}
                      onChange={setTheme}
                    />
                  </SettingRow>
                </SettingsSection>

                <SettingsSection id="settings-navigation" title="Navigation">
                  <SettingRow labelId="settings-nav-style-label" label="Style">
                    {isDockAvailable ? (
                      <SegmentedControl
                        labelledBy="settings-navigation-heading settings-nav-style-label"
                        options={NAV_MODE_OPTIONS}
                        value={navMode}
                        onChange={setNavMode}
                      />
                    ) : (
                      <span className="setting-static-value">Header</span>
                    )}
                  </SettingRow>
                  {!isDockAvailable && (
                    <p className="setting-note">
                      The dock is available on screens at least 430 px wide;
                      this screen uses the header.
                    </p>
                  )}

                  {navMode === "dock" && (
                    <div className="settings-disclosure">
                      <button
                        type="button"
                        id="dock-tuning-toggle"
                        className="settings-disclosure__toggle"
                        aria-expanded={isDockTuningOpen}
                        aria-controls="dock-tuning-panel"
                        onClick={() => setIsDockTuningOpen((open) => !open)}
                      >
                        <FontAwesomeIcon
                          icon={faChevronRight}
                          className="settings-disclosure__icon"
                        />
                        Dock tuning
                      </button>
                      <div
                        id="dock-tuning-panel"
                        className="settings-disclosure__panel"
                        role="group"
                        aria-labelledby="dock-tuning-toggle"
                        hidden={!isDockTuningOpen}
                      >
                        {dockTuningNote && (
                          <p id="dock-tuning-note" className="setting-note">
                            {dockTuningNote}
                          </p>
                        )}
                        <SettingSlider
                          id="dock-size"
                          label="Size"
                          {...DOCK_SIZE_CONFIG}
                          value={currentDockSize}
                          displayValue={`${currentDockSize} px`}
                          disabled={isDockTuningInert}
                          describedBy={isDockTuningInert ? "dock-tuning-note" : undefined}
                          onChange={onDockSizeChange}
                        />
                        <SettingSlider
                          id="dock-stiffness"
                          label="Responsiveness"
                          {...DOCK_STIFFNESS_CONFIG}
                          value={currentDockStiffness}
                          displayValue={String(currentDockStiffness)}
                          disabled={isMagnificationInert}
                          describedBy={isMagnificationInert ? "dock-tuning-note" : undefined}
                          onChange={onDockStiffnessChange}
                        />
                        <SettingSlider
                          id="magnification"
                          label="Magnification"
                          {...MAGNIFICATION_CONFIG}
                          value={currentMagnification}
                          displayValue={`${currentMagnification}%`}
                          disabled={isMagnificationInert}
                          describedBy={isMagnificationInert ? "dock-tuning-note" : undefined}
                          onChange={onMagnificationChange}
                        />
                      </div>
                    </div>
                  )}
                </SettingsSection>

                <SettingsSection id="settings-motion" title="Motion">
                  <SettingRow
                    labelId="background-animation-label"
                    label="Background animation"
                  >
                    <SettingSwitch
                      labelledBy="background-animation-label"
                      describedBy={reducedMotion ? "reduced-motion-note" : undefined}
                      checked={!isAnimationPaused && !reducedMotion}
                      disabled={reducedMotion}
                      onChange={(checked) => onAnimationToggle(!checked)}
                    />
                  </SettingRow>
                  <SettingSlider
                    id="background-motion-speed"
                    label="Speed"
                    {...BACKGROUND_MOTION_SPEED_CONFIG}
                    value={motionSpeed}
                    displayValue={`${motionSpeed.toFixed(1)}×`}
                    spokenValue={`${motionSpeed.toFixed(1)} times`}
                    disabled={isAnimationPaused || reducedMotion}
                    describedBy={reducedMotion ? "reduced-motion-note" : undefined}
                    onChange={(speed) => onBackgroundMotionSpeedChange?.(speed)}
                  />
                  {reducedMotion && (
                    <p id="reduced-motion-note" className="setting-note">
                      Your system prefers reduced motion; the background stays
                      still.
                    </p>
                  )}
                </SettingsSection>

                <SettingsSection id="settings-data" title="Data">
                  <div className="settings-actions">
                    <button
                      type="button"
                      className="settings-action"
                      onClick={handleExportSettings}
                      aria-label="Export settings"
                    >
                      <FontAwesomeIcon icon={faDownload} />
                      <span>Export</span>
                    </button>
                    <button
                      type="button"
                      className="settings-action"
                      onClick={handleImportSettings}
                      aria-label="Import settings"
                    >
                      <FontAwesomeIcon icon={faUpload} />
                      <span>Import</span>
                    </button>
                    <button
                      type="button"
                      className="settings-action settings-action--danger"
                      onClick={handleResetToDefaults}
                      aria-label="Reset all settings to defaults"
                    >
                      <FontAwesomeIcon icon={faUndo} />
                      <span>Reset…</span>
                    </button>
                  </div>
                </SettingsSection>

                <SettingsSection
                  id="settings-about"
                  title="About"
                  className="settings-about"
                >
                  <p className="settings-about__name">Personal website</p>
                  <p>React · TypeScript · Framer Motion</p>
                  <BuildIdentifier />
                </SettingsSection>
                </motion.div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset Settings"
        type="warning"
        onConfirm={confirmResetToDefaults}
        onCancel={() => setShowResetModal(false)}
        confirmText="Reset"
        cancelText="Cancel"
      >
        <p>
          Are you sure you want to reset all settings to their default values?
          This action cannot be undone.
        </p>

      </Modal>
    </ViewportPortal>
  );
};

export default SettingsPanel;
