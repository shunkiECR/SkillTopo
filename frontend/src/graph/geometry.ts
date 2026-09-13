/** 放射状マップ用。中心(360,360)、0度を上、時計回りの角度としてSVG座標に変換する。 */
export function point(r: number, angle: number): [number, number] {
  const a = ((angle - 90) * Math.PI) / 180;
  return [360 + r * Math.cos(a), 360 + r * Math.sin(a)];
}
/** 外周→内周の順に円弧を結び、塗りつぶし可能な扇形のパスを返す。 */
export function sector(inner: number, outer: number, start: number, end: number) {
  const large = end - start > 180 ? 1 : 0;
  return `M${point(outer, start)} A${outer},${outer} 0 ${large} 1 ${point(outer, end)} L${point(inner, end)} A${inner},${inner} 0 ${large} 0 ${point(inner, start)} Z`;
}
