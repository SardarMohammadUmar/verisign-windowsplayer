/** Normalize to [0, 360). */
export function normalizeAngleDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** True for 90° and 270° (portrait↔landscape swap). */
export function isQuarterTurnRotation(deg: number): boolean {
  const r = normalizeAngleDeg(deg);
  return r === 90 || r === 270;
}

/**
 * Center + rotate. For quarter-turns, pair with swapped width/height (100vh×100vw or section vars)
 * so the media fills the container after rotation.
 */
export function centeredRotationTransform(deg: number): string {
  const r = normalizeAngleDeg(deg);
  return `translate(-50%, -50%) rotate(${r}deg)`;
}
