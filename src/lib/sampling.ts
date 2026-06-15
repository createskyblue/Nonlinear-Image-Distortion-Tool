export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function getPixel(data: Uint8ClampedArray, width: number, x: number, y: number): [number, number, number, number] {
  const index = (y * width + x) * 4
  return [data[index], data[index + 1], data[index + 2], data[index + 3]]
}

export function bilinearSample(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): [number, number, number, number] {
  const sx = clamp(x, 0, width - 1)
  const sy = clamp(y, 0, height - 1)
  const x0 = Math.floor(sx)
  const y0 = Math.floor(sy)
  const x1 = Math.min(width - 1, x0 + 1)
  const y1 = Math.min(height - 1, y0 + 1)
  const tx = sx - x0
  const ty = sy - y0

  const p00 = getPixel(data, width, x0, y0)
  const p10 = getPixel(data, width, x1, y0)
  const p01 = getPixel(data, width, x0, y1)
  const p11 = getPixel(data, width, x1, y1)

  return [0, 1, 2, 3].map((channel) => {
    const top = p00[channel] * (1 - tx) + p10[channel] * tx
    const bottom = p01[channel] * (1 - tx) + p11[channel] * tx
    return Math.round(top * (1 - ty) + bottom * ty)
  }) as [number, number, number, number]
}

export function setPixel(data: Uint8ClampedArray, width: number, x: number, y: number, pixel: ArrayLike<number>): void {
  const index = (y * width + x) * 4
  data[index] = pixel[0]
  data[index + 1] = pixel[1]
  data[index + 2] = pixel[2]
  data[index + 3] = pixel[3]
}
