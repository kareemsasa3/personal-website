import { useState, type FormEvent } from "react";
import { LIMITS, type Body } from "./physics/model";
import type { OrbitalSimulation } from "./useOrbitalSimulation";
import { fixedWidth } from "./readout";
const format = (n: number) =>
  Math.abs(n) > 0 && Math.abs(n) < 0.001 ? n.toExponential(3) : n.toFixed(4);
// A position or velocity component changes sign and form as the body moves; it keeps a constant character count
// (readout.ts) that fits a sign with either form: "-999.9999" or "-1.234e-4".
const component = (n: number) => fixedWidth(format(n), 9);
const fields = [
  {
    key: "mass",
    label: "Mass (solar masses)",
    bounds: LIMITS.mass,
    step: "0.000001",
  },
  { key: "x", label: "X position (AU)", bounds: LIMITS.position, step: "any" },
  { key: "y", label: "Y position (AU)", bounds: LIMITS.position, step: "any" },
  {
    key: "vx",
    label: "X velocity (AU/yr)",
    bounds: LIMITS.velocity,
    step: "any",
  },
  {
    key: "vy",
    label: "Y velocity (AU/yr)",
    bounds: LIMITS.velocity,
    step: "any",
  },
] as const;
function Editor({
  body,
  simulation,
  onClose,
}: {
  body: Body;
  simulation: OrbitalSimulation;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState({
    mass: String(body.mass),
    x: String(body.position.x),
    y: String(body.position.y),
    vx: String(body.velocity.x),
    vy: String(body.velocity.y),
  });
  const [error, setError] = useState("");
  // §13 Errors: a field the browser rejects on submit is marked invalid until it is changed.
  const [invalid, setInvalid] = useState<ReadonlySet<string>>(new Set());
  const mark = (key: string, on: boolean) =>
    setInvalid((current) => {
      if (current.has(key) === on) return current;
      const next = new Set(current);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    try {
      if (Object.values(draft).some((value) => !value.trim()))
        throw new Error("Fill in every value.");
      simulation.edit(body.id, {
        mass: Number(draft.mass),
        position: { x: Number(draft.x), y: Number(draft.y) },
        velocity: { x: Number(draft.vx), y: Number(draft.vy) },
      });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invalid values.");
    }
  };
  return (
    <form className="orbital-editor" onSubmit={submit}>
      <p className="df-body-sm">
        Editing {body.name}. Changes apply together; trails and the energy
        baseline restart.
      </p>
      {fields.map((field) => (
        <label key={field.key} className="orbital-label df-label-sm">
          {field.label}
          <input
            className="df-field df-data"
            type="number"
            required
            min={field.bounds[0]}
            max={field.bounds[1]}
            step={field.step}
            value={draft[field.key]}
            aria-invalid={invalid.has(field.key) || undefined}
            onInvalid={() => mark(field.key, true)}
            onChange={(e) => {
              mark(field.key, false);
              setDraft({ ...draft, [field.key]: e.target.value });
            }}
          />
        </label>
      ))}
      {error && (
        <p className="orbital-editor-error df-error df-body-sm" role="alert">{error}</p>
      )}
      <div className="orbital-actions">
        <button className="df-control df-label" type="submit">
          Apply changes
        </button>
        <button className="df-control df-label" type="button" onClick={onClose}>
          Cancel edit
        </button>
      </div>
    </form>
  );
}
export default function BodyInspector({
  simulation,
  selected,
  onSelect,
  editing,
  setEditing,
}: {
  simulation: OrbitalSimulation;
  selected: string;
  onSelect: (id: string) => void;
  editing: boolean;
  setEditing: (value: boolean) => void;
}) {
  const live = simulation.playing ? " df-data--live" : "";
  const body =
    simulation.state.bodies.find((b) => b.id === selected) ??
    simulation.state.bodies[0];
  return (
    <section
      className="orbital-panel orbital-inspector"
      aria-labelledby="orbital-inspector-title"
    >
      {/* §05: while the simulation runs the readout group is Live; its heading carries the shared • marker. */}
      <h2
        id="orbital-inspector-title"
        className={`df-heading-3${simulation.playing ? " df-context--live" : ""}`}
      >
        Body inspector
      </h2>
      <label className="orbital-label df-label-sm">
        <span id="orbital-body-label">Selected body</span>
        <select
          className="df-field df-data"
          aria-labelledby="orbital-body-label"
          value={body.id}
          onChange={(e) => onSelect(e.target.value)}
        >
          {simulation.state.bodies.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <p className="orbital-note df-body-sm">
        The outlined body is selected. All values use the system’s inertial
        frame.
      </p>
      {/* §06: each value is Machine with its unit as a label beside it; §05: a value is Live while it changes. */}
      <dl className="orbital-readout">
        <div>
          <dt className="df-label-sm">Mass</dt>
          <dd>
            {/* Mass is fixed while the simulation runs, so it is never Live. */}
            <span className="orbital-value orbital-value--fixed df-data">
              {format(body.mass)}
            </span>{" "}
            <span className="df-label-sm">M☉</span>
          </dd>
        </div>
        <div>
          <dt className="df-label-sm">Speed</dt>
          <dd>
            <span className={`orbital-value df-data${live}`}>
              {format(Math.hypot(body.velocity.x, body.velocity.y))}
            </span>{" "}
            <span className="df-label-sm">AU/yr</span>
          </dd>
        </div>
        <div>
          <dt className="df-label-sm">Position X / Y</dt>
          <dd>
            <span className={`orbital-value df-data${live}`}>
              {component(body.position.x)} / {component(body.position.y)}
            </span>{" "}
            <span className="df-label-sm">AU</span>
          </dd>
        </div>
        <div>
          <dt className="df-label-sm">Velocity X / Y</dt>
          <dd>
            <span className={`orbital-value df-data${live}`}>
              {component(body.velocity.x)} / {component(body.velocity.y)}
            </span>{" "}
            <span className="df-label-sm">AU/yr</span>
          </dd>
        </div>
      </dl>
      {editing ? (
        <Editor
          key={body.id}
          body={body}
          simulation={simulation}
          onClose={() => setEditing(false)}
        />
      ) : (
        <button
          className="orbital-edit df-control df-label"
          onClick={() => {
            simulation.pause();
            setEditing(true);
          }}
        >
          Pause & edit body
        </button>
      )}
    </section>
  );
}
