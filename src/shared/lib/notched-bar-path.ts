/**
 * Outline of a bottom bar with rounded top corners and a concave notch centered on its top
 * edge, drawn only with lines and cubic Bézier curves. The notch is a circle around the
 * floating button joined to the top edge by two fillets, all tangent to each other, so the
 * outline has no corners from one side to the other.
 */
export interface NotchedBarGeometry {
  // Bar size in px; the width is the rendered width, so the notch never stretches
  width: number
  height: number
  // Radius of the two top corners (the bottom edge sits on the screen edge)
  cornerRadius: number
  // Radius of the cut-out: the floating button radius plus the gap around it
  notchRadius: number
  // Vertical position of the notch center from the top edge (0 = on the edge)
  notchCenterY: number
  // Radius of the curves that lead the top edge into the notch
  filletRadius: number
}

interface Point {
  x: number
  y: number
}

const round = (value: number) => Math.round(value * 100) / 100
const point = ({ x, y }: Point) => `${round(x)},${round(y)}`

/**
 * Cubic Bézier segments for a circular arc, split in pieces of at most 90° so each one
 * stays within 0.03% of the true circle. Angles in radians, in screen coordinates (y down).
 */
interface Arc {
  center: Point
  radius: number
  from: number
  to: number
}

function arcCurves({ center, radius, from, to }: Arc): string[] {
  const pieces = Math.max(1, Math.ceil(Math.abs(to - from) / (Math.PI / 2) - 1e-9))
  const step = (to - from) / pieces
  // Distance of the control points along the tangents
  const handle = (4 / 3) * Math.tan(step / 4) * radius
  const at = (angle: number): Point => ({
    x: center.x + radius * Math.cos(angle),
    y: center.y + radius * Math.sin(angle),
  })

  return Array.from({ length: pieces }, (_, index) => {
    const start = from + step * index
    const end = start + step
    const p0 = at(start)
    const p3 = at(end)
    const c1 = { x: p0.x - handle * Math.sin(start), y: p0.y + handle * Math.cos(start) }
    const c2 = { x: p3.x + handle * Math.sin(end), y: p3.y - handle * Math.cos(end) }
    return `C${point(c1)} ${point(c2)} ${point(p3)}`
  })
}

export function notchedBarPath(geometry: NotchedBarGeometry): string {
  const {
    width,
    height,
    cornerRadius: r,
    notchRadius: R,
    notchCenterY: cy,
    filletRadius: f,
  } = geometry
  const cx = width / 2

  // Each fillet circle touches the top edge (center f below it) and the notch circle from
  // outside (centers R + f apart)
  const filletOffset = Math.sqrt((R + f) ** 2 - (f - cy) ** 2)
  const leftFillet = { x: cx - filletOffset, y: f }
  const rightFillet = { x: cx + filletOffset, y: f }
  // Angle, seen from the notch center, of the point where the right fillet meets the notch
  const meet = Math.atan2(f - cy, filletOffset)

  return [
    `M0,${height}`,
    `L0,${r}`,
    // Top-left corner: from pointing up to pointing right
    ...arcCurves({ center: { x: r, y: r }, radius: r, from: Math.PI, to: (3 * Math.PI) / 2 }),
    `L${point({ x: leftFillet.x, y: 0 })}`,
    // Into the notch: the fillet turns down until it meets the notch circle
    ...arcCurves({ center: leftFillet, radius: f, from: -Math.PI / 2, to: -meet }),
    // Under the button: the notch circle, from the left meeting point around the bottom
    ...arcCurves({ center: { x: cx, y: cy }, radius: R, from: Math.PI - meet, to: meet }),
    // Out of the notch, back up to the top edge
    ...arcCurves({ center: rightFillet, radius: f, from: Math.PI + meet, to: (3 * Math.PI) / 2 }),
    `L${point({ x: width - r, y: 0 })}`,
    // Top-right corner
    ...arcCurves({ center: { x: width - r, y: r }, radius: r, from: -Math.PI / 2, to: 0 }),
    `L${width},${height}`,
    'Z',
  ].join(' ')
}
