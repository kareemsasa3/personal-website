import type { World, InterventionLog } from "../Annals";

export function replay(seed: number, interventions: InterventionLog[], toYear: number): World;
