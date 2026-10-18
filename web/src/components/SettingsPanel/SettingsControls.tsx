import type { KeyboardEvent, ReactNode } from "react";

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
    <h4 id={`${id}-heading`} className="settings-section-title df-label">
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
    <span id={labelId} className="setting-label df-label">
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
        className="settings-segmented__button df-control df-label"
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
    className="setting-switch df-control df-control--latch df-label"
    aria-checked={checked}
    aria-labelledby={labelledBy}
    aria-describedby={describedBy}
    // §13 Disabled: stays focusable so the reason (describedBy) can be read; the handler ignores it.
    aria-disabled={disabled || undefined}
    onClick={() => {
      if (!disabled) onChange(!checked);
    }}
  >
    <span className="setting-switch__state" aria-hidden="true">
      {checked ? "On" : "Off"}
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
  // WAI-ARIA Authoring Practices slider pattern: Page Up and Page Down move by a larger step (here ten steps), clamped at the
  // limits; arrows, Home and End are the input's own.
  const pageStep = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "PageUp" && event.key !== "PageDown") return;
    event.preventDefault();
    if (disabled) return;
    const steps = Math.round((value - min) / step) + (event.key === "PageUp" ? 10 : -10);
    const next = Math.min(max, Math.max(min, min + steps * step));
    const decimals = (String(step).split(".")[1] ?? "").length;
    onChange(Number(next.toFixed(decimals)));
  };

  return (
    <div className="setting-slider">
      <div className="setting-slider__head">
        <label htmlFor={id} className="setting-label df-label">
          {label}
        </label>
        <span className="setting-value df-data" aria-hidden="true">
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
        // §13 Disabled: stays focusable so the reason (describedBy) can be read; the value stays put.
        aria-disabled={disabled || undefined}
        aria-valuetext={spokenValue}
        aria-describedby={describedBy}
        onChange={(event) => {
          if (!disabled) onChange(Number(event.target.value));
        }}
        onKeyDown={pageStep}
      />
    </div>
  );
};
