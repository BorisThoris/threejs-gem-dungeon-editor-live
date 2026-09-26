/** Conservative disc clearance for the movement probe. Existing hazard overlap
 * may be escaped only by moving monotonically outward to a clear endpoint. */
export function segmentClearsDisc(a, b, disc, margin, allowEscape = false) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const ax = a.x - disc.x, az = a.z - disc.z;
  const radiusSquared = (disc.r + margin) ** 2;
  const lengthSquared = dx * dx + dz * dz;
  const outward = ax * dx + az * dz;
  if (allowEscape && ax * ax + az * az <= radiusSquared && outward >= 0
    && (b.x - disc.x) ** 2 + (b.z - disc.z) ** 2 > radiusSquared) return true;
  const t = Math.max(0, Math.min(1, -outward / (lengthSquared || 1)));
  return (ax + dx * t) ** 2 + (az + dz * t) ** 2 > radiusSquared;
}
