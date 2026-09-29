import { useState, type FormEvent } from "react";
import { LIMITS, type Body } from "./physics/model";
import type { OrbitalSimulation } from "./useOrbitalSimulation";
const format = (n: number) =>
  Math.abs(n) > 0 && Math.abs(n) < 0.001 ? n.toExponential(3) : n.toFixed(4);
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
      <p>
        Editing {body.name}. Changes apply together; trails and the energy
        baseline restart.
      </p>
      {fields.map((field) => (
        <label key={field.key}>
          {field.label}
          <input
            type="number"
            required
            min={field.bounds[0]}
            max={field.bounds[1]}
            step={field.step}
            value={draft[field.key]}
            onChange={(e) =>
              setDraft({ ...draft, [field.key]: e.target.value })
            }
          />
        </label>
      ))}
      {error && <p role="alert">{error}</p>}
      <div className="orbital-actions">
        <button type="submit">Apply changes</button>
        <button type="button" onClick={onClose}>
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
  const body =
    simulation.state.bodies.find((b) => b.id === selected) ??
    simulation.state.bodies[0];
  return (
    <section
      className="orbital-panel orbital-inspector"
      aria-labelledby="orbital-inspector-title"
    >
      <h2 id="orbital-inspector-title">Body inspector</h2>
      <label>
        <span id="orbital-body-label">Selected body</span>
        <select
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
      <p className="orbital-note">
        The outlined body is selected. All values use the system’s inertial
        frame.
      </p>
      <dl className="orbital-readout">
        <div>
          <dt>Mass</dt>
          <dd>{format(body.mass)} M☉</dd>
        </div>
        <div>
          <dt>Speed</dt>
          <dd>{format(Math.hypot(body.velocity.x, body.velocity.y))} AU/yr</dd>
        </div>
        <div>
          <dt>Position X / Y</dt>
          <dd>
            {format(body.position.x)} / {format(body.position.y)} AU
          </dd>
        </div>
        <div>
          <dt>Velocity X / Y</dt>
          <dd>
            {format(body.velocity.x)} / {format(body.velocity.y)} AU/yr
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
