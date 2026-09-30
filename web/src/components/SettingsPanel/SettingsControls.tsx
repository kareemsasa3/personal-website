import type { CSSProperties, ReactNode } from "react";

interface SettingsSectionProps {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
}

export const SettingsSection = ({
  id,
  title,
  children,
  className = "",
}: SettingsSectionProps) => (
  <section
    className={`settings-section ${className}`.trim()}
    aria-labelledby={`${id}-heading`}
  >
    <h4 id={`${id}-heading`} className="settings-section-title">
      {title}
    </h4>
    {children}
  </section>
);

interface SettingRowProps {
  labelId: string;
  label: string;
  children: ReactNode;
}

// A label on the left and a compact control on the right; wraps when narrow.
export const SettingRow = ({ labelId, label, children }: SettingRowProps) => (
  <div className="setting-row">
    <span id={labelId} className="setting-label">
      {label}
    </span>
    {children}
  </div>
);

interface SegmentedControlProps<T extends string> {
  labelledBy: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export const SegmentedControl = <T extends string>({
  labelledBy,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) => (
  <div className="settings-segmented" role="group" aria-labelledby={labelledBy}>
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        className="settings-segmented__button"
        aria-pressed={option.value === value}
        onClick={() => onChange(option.value)}
      >
        {option.label}
      </button>
    ))}
  </div>
);

interface SettingSwitchProps {
  labelledBy: string;
  describedBy?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

export const SettingSwitch = ({
  labelledBy,
  describedBy,
  checked,
  disabled = false,
  onChange,
}: SettingSwitchProps) => (
  <button
    type="button"
    role="switch"
    className="setting-switch"
    aria-checked={checked}
    aria-labelledby={labelledBy}
    aria-describedby={describedBy}
    disabled={disabled}
    onClick={() => onChange(!checked)}
  >
    <span className="setting-switch__state" aria-hidden="true">
      {checked ? "On" : "Off"}
    </span>
    <span className="setting-switch__track" aria-hidden="true">
      <span className="setting-switch__thumb" />
    </span>
  </button>
);

interface SettingSliderProps {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  displayValue: string;
  spokenValue?: string;
  describedBy?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}

export const SettingSlider = ({
  id,
  label,
  min,
  max,
  step,
  value,
  displayValue,
  spokenValue = displayValue,
  describedBy,
  disabled = false,
  onChange,
}: SettingSliderProps) => {
  const fill = `${((value - min) / (max - min)) * 100}%`;

  return (
    <div className="setting-slider">
      <div className="setting-slider__head">
        <label htmlFor={id} className="setting-label">
          {label}
        </label>
        <span className="setting-value" aria-hidden="true">
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        id={id}
        className="setting-range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={spokenValue}
        aria-describedby={describedBy}
        style={{ "--range-fill": fill } as CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
};
