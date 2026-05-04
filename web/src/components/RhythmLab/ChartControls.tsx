import type { RhythmLabChart } from "./library/types";
import {
  type ActiveChartMode,
  CHART_NAME_MAX_LENGTH,
  formatChartOptionLabel,
} from "./helpers";

interface ChartControlsProps {
  activeChartMode: ActiveChartMode;
  recordedChartId: string | null;
  recordedCharts: RhythmLabChart[];
  activeSongId: string | null;
  chartBestLabel: string;
  hasSelectedRecordedChart: boolean;
  isRecording: boolean;
  isRenamingChart: boolean;
  chartNameDraft: string;
  pendingChartAction: "rename" | "delete" | null;
  onSelectStarterMode: () => void;
  onSelectRecordedChart: (chartId: string) => void;
  onStartRecording: () => void;
  onBeginRename: () => void;
  onCancelRename: () => void;
  onSaveRename: () => void;
  onDeleteChart: () => void;
  onChartNameChange: (name: string) => void;
}

const ChartControls = ({
  activeChartMode,
  recordedChartId,
  recordedCharts,
  activeSongId,
  chartBestLabel,
  hasSelectedRecordedChart,
  isRecording,
  isRenamingChart,
  chartNameDraft,
  pendingChartAction,
  onSelectStarterMode,
  onSelectRecordedChart,
  onStartRecording,
  onBeginRename,
  onCancelRename,
  onSaveRename,
  onDeleteChart,
  onChartNameChange,
}: ChartControlsProps) => (
  <div
    className="rhythm-lab-recording-controls"
    aria-label="Chart recording controls"
  >
    <button
      className="rhythm-lab-chart-mode-button"
      type="button"
      aria-pressed={activeChartMode === "starter"}
      disabled={isRecording}
      onClick={onSelectStarterMode}
    >
      Starter chart
    </button>
    {recordedCharts.length > 0 ? (
      <label
        className="rhythm-lab-chart-selector"
        aria-label="Recorded chart selector"
      >
        <span>Recorded chart</span>
        <select
          value={
            activeChartMode === "recorded" ? recordedChartId ?? "" : ""
          }
          disabled={isRecording}
          onChange={(event) =>
            onSelectRecordedChart(event.currentTarget.value)
          }
        >
          <option value="" disabled>
            Select chart
          </option>
          {recordedCharts.map((chart) => (
            <option key={chart.id} value={chart.id}>
              {formatChartOptionLabel(chart)}
            </option>
          ))}
        </select>
      </label>
    ) : (
      activeSongId && (
        <span className="rhythm-lab-chart-empty">No recorded charts</span>
      )
    )}
    <span
      className="rhythm-lab-chart-best"
      aria-label={`Selected chart best stats: ${chartBestLabel}`}
    >
      {chartBestLabel}
    </span>
    <button
      className="rhythm-lab-record-button"
      type="button"
      onClick={onStartRecording}
    >
      Record chart
    </button>
    {hasSelectedRecordedChart && (
      <div
        className="rhythm-lab-chart-management"
        aria-label="Recorded chart management"
      >
        {isRenamingChart ? (
          <>
            <input
              className="rhythm-lab-chart-name-input"
              type="text"
              aria-label="Recorded chart name"
              value={chartNameDraft}
              maxLength={CHART_NAME_MAX_LENGTH}
              disabled={pendingChartAction !== null}
              onChange={(event) =>
                onChartNameChange(event.currentTarget.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void onSaveRename();
                }

                if (event.key === "Escape") {
                  event.preventDefault();
                  onCancelRename();
                }
              }}
            />
            <button
              className="rhythm-lab-chart-management-button"
              type="button"
              disabled={pendingChartAction !== null}
              onClick={() => {
                void onSaveRename();
              }}
            >
              Save
            </button>
            <button
              className="rhythm-lab-chart-management-button"
              type="button"
              disabled={pendingChartAction !== null}
              onClick={onCancelRename}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              className="rhythm-lab-chart-management-button"
              type="button"
              disabled={pendingChartAction !== null}
              onClick={onBeginRename}
            >
              Rename
            </button>
            <button
              className="rhythm-lab-chart-management-button rhythm-lab-chart-management-danger"
              type="button"
              disabled={pendingChartAction !== null}
              onClick={() => {
                void onDeleteChart();
              }}
            >
              Delete
            </button>
          </>
        )}
      </div>
    )}
  </div>
);

export default ChartControls;
