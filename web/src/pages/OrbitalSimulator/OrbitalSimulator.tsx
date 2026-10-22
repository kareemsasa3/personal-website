import { useState } from "react";
import { Link } from "react-router-dom";
import OrbitalCanvas from "../../components/OrbitalSimulator/OrbitalCanvas";
import BodyInspector from "../../components/OrbitalSimulator/BodyInspector";
import SimulationControls from "../../components/OrbitalSimulator/SimulationControls";
import { useOrbitalSimulation } from "../../components/OrbitalSimulator/useOrbitalSimulation";
import { presets } from "../../components/OrbitalSimulator/physics/presets";
import {
  fitExtent,
  type Camera,
} from "../../components/OrbitalSimulator/renderer";
import "./OrbitalSimulator.css";
export default function OrbitalSimulator() {
  const simulation = useOrbitalSimulation();
  const [selected, setSelected] = useState("planet");
  const [trails, setTrails] = useState(true);
  const [editing, setEditing] = useState(false);
  const [camera, setCamera] = useState<Camera>({
    extent: presets[0].extent,
    target: "barycenter",
    offset: { x: 0, y: 0 },
  });
  const preset = presets.find((p) => p.id === simulation.scenario)!;
  const select = (id: string) => {
    setSelected(id);
    setEditing(false);
    setCamera((c) => ({ ...c, offset: { x: 0, y: 0 } }));
  };
  const reset = (id = simulation.scenario) => {
    const next = presets.find((p) => p.id === id)!;
    simulation.reset(id);
    setSelected(next.bodies[1].id);
    setEditing(false);
    setCamera({
      extent: next.extent,
      target: "barycenter",
      offset: { x: 0, y: 0 },
    });
  };
  const zoom = (factor: number) =>
    setCamera((c) => ({
      ...c,
      extent: Math.max(0.1, Math.min(10000, c.extent * factor)),
    }));
  const pan = (x: number, y: number) =>
    setCamera((c) => ({
      ...c,
      offset: {
        x: Math.max(-1e6, Math.min(1e6, c.offset.x + x)),
        y: Math.max(-1e6, Math.min(1e6, c.offset.y + y)),
      },
    }));
  // §05: a value that is changing now is Live (the shared grammar's signal and weight step).
  const live = simulation.playing ? " df-data--live" : "";
  const energyChange =
    ((simulation.state.energy - simulation.state.referenceEnergy) /
      Math.max(1e-12, Math.abs(simulation.state.referenceEnergy))) *
    100;
  return (
    <div className="page-content orbital-page">
      <div className="orbital-container">
        <header className="orbital-header prose-surface">
          <Link className="orbital-back df-control df-control--light df-label" to="/simulations">← Simulations</Link>
          <p className="orbital-eyebrow df-body-sm">
            Gravity / initial conditions / emergence
          </p>
          <h1 className="df-heading-1">Orbital Simulator</h1>
          <p className="orbital-lead df-prose df-body-lg">
            Set a system in motion. Change one body. See what gravity makes of
            it.
          </p>
        </header>
        <SimulationControls
          simulation={simulation}
          onReset={reset}
          trails={trails}
          setTrails={setTrails}
          editing={editing}
        />
        <div className="orbital-workspace">
          <section
            className="orbital-panel orbital-field"
            aria-label="Orbital field"
          >
            {/* §06: Instrument labels and units beside Machine values; §05: the values are Live while running. */}
            <div className="orbital-status">
              <span className={`df-label-sm df-context${simulation.playing ? " df-context--live" : ""}`}>
                {simulation.playing ? "Running" : "Paused"}
              </span>
              <span>
                <span className="df-label-sm">Elapsed</span>{" "}
                <output className={`orbital-value df-data${live}`} aria-label="Elapsed years" aria-live="off">
                  {simulation.state.time.toFixed(3)}
                </output>{" "}
                <span className="df-label-sm">yr</span>
              </span>
              <span title="Relative change in total softened kinetic + potential energy since reset or edit.">
                <span className="df-label-sm">Δ energy</span>{" "}
                <span className={`orbital-value df-data${live}`}>{energyChange.toFixed(4)}</span>
                <span className="df-label-sm">%</span>
              </span>
            </div>
            <OrbitalCanvas
              engine={simulation.engine}
              camera={camera}
              selected={selected}
              trails={trails}
              onSelect={select}
              onPan={pan}
            />
            <div className="orbital-camera" aria-label="Camera controls">
              <div className="orbital-actions">
                <button className="df-control df-label" onClick={() => zoom(0.8)}>
                  Zoom in
                </button>
                <button className="df-control df-label" onClick={() => zoom(1.25)}>
                  Zoom out
                </button>
                <button
                  className="df-control df-label"
                  onClick={() =>
                    setCamera({
                      extent: fitExtent(simulation.engine.current),
                      target: "barycenter",
                      offset: { x: 0, y: 0 },
                    })
                  }
                >
                  Fit all
                </button>
                <button
                  className="df-control df-label"
                  onClick={() =>
                    setCamera({
                      extent: preset.extent,
                      target: "barycenter",
                      offset: { x: 0, y: 0 },
                    })
                  }
                >
                  Reset camera
                </button>
              </div>
              <label className="orbital-label df-label-sm">
                <span id="orbital-camera-label">Camera follows</span>
                <select
                  className="df-field df-data"
                  aria-labelledby="orbital-camera-label"
                  value={camera.target}
                  onChange={(e) =>
                    setCamera((c) => ({
                      ...c,
                      target: e.target.value as Camera["target"],
                      offset: { x: 0, y: 0 },
                    }))
                  }
                >
                  <option value="barycenter">Barycenter</option>
                  <option value="selected">Selected body</option>
                </select>
              </label>
              <div
                className="orbital-actions"
                role="group"
                aria-label="Pan camera"
              >
                <button className="df-control df-label" onClick={() => pan(-camera.extent * 0.25, 0)}>
                  Pan left
                </button>
                <button className="df-control df-label" onClick={() => pan(camera.extent * 0.25, 0)}>
                  Pan right
                </button>
                <button className="df-control df-label" onClick={() => pan(0, camera.extent * 0.25)}>
                  Pan up
                </button>
                <button className="df-control df-label" onClick={() => pan(0, -camera.extent * 0.25)}>
                  Pan down
                </button>
              </div>
              <p className="orbital-note df-body-sm">
                Drag the field to pan; tap a body to inspect it. Trails show
                past positions in the inertial frame.
              </p>
            </div>
          </section>
          <BodyInspector
            simulation={simulation}
            selected={selected}
            onSelect={select}
            editing={editing}
            setEditing={setEditing}
          />
        </div>
        {(simulation.error || simulation.limited || editing) && (
          <div className="orbital-messages">
            {simulation.error && (
              <p id="orbital-error" className="orbital-panel orbital-warning df-error df-body-sm" role="alert">
                {simulation.error}
              </p>
            )}
            {simulation.limited && (
              <p role="status" className="orbital-note df-warning df-body-sm">
                Step budget reached: simulated time is advancing slower than
                requested. Lower the speed for smoother playback.
              </p>
            )}
            {editing && (
              <p id="orbital-editing-note" role="status" className="orbital-note df-body-sm">
                Paused for editing. Apply or cancel your changes before pressing
                Play.
              </p>
            )}
          </div>
        )}
        <section
          className="orbital-panel orbital-context df-body"
          aria-labelledby="orbital-experiment-title"
        >
          <div>
            <h2 id="orbital-experiment-title" className="df-heading-3">
              Try an experiment
            </h2>
            <p>{preset.description}</p>
            <p>{preset.experiment}</p>
          </div>
          <div>
            <h2 className="df-heading-3">About the model</h2>
            <p>
              Every body attracts every other body. Distances are in
              astronomical units (AU), masses in solar masses (M☉), and time in
              years. One AU is roughly the Earth–Sun distance.
            </p>
            <p>
              Sizes are enlarged for readability. Bodies pass through each other
              without merging. Gravity is softened below 0.025 AU; unresolved
              close approaches pause with an explanation.
            </p>
            <p>
              This is a 2D numerical experiment, not a precision ephemeris.
              Reset restores the preset. Motion starts paused when reduced
              motion is preferred.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
