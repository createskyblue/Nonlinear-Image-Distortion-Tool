import { makePrng } from './random'
import { bilinearSample, setPixel } from './sampling'

export type OffsetOptions = {
  algorithm?: 'legacy-grid' | 'smooth-grid'
  amplitude: number
  cellSize: number
  key: string
  swirl: number
}

export type OffsetVector = {
  dx: number
  dy: number
}

export type ProgressCallback = (progress: number) => void

const MIN_SAMPLE_STEP = 0.05

function scaleRelativeLength(value: number, width: number, height: number): number {
  return (Math.min(width, height) * value) / 100
}

function smoothstep(value: number): number {
  return value * value * (3 - 2 * value)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function randomVector(seed: string, gridX: number, gridY: number, amplitude: number): OffsetVector {
  const random = makePrng(`${seed}:${gridX}:${gridY}`)
  const angle = random() * Math.PI * 2
  const radius = amplitude * (0.35 + random() * 0.65)
  return {
    dx: Math.cos(angle) * radius,
    dy: Math.sin(angle) * radius,
  }
}

type OffsetContext = {
  amplitude: number
  cellSize: number
  centerX: number
  centerY: number
  maxRadius: number
  options: OffsetOptions
}

function createOffsetContext(width: number, height: number, options: OffsetOptions): OffsetContext {
  return {
    amplitude: Math.max(0, scaleRelativeLength(options.amplitude, width, height)),
    cellSize: Math.max(4, scaleRelativeLength(options.cellSize, width, height)),
    centerX: width / 2,
    centerY: height / 2,
    maxRadius: Math.hypot(width / 2, height / 2) || 1,
    options,
  }
}

function buildOffsetVectorAt(x: number, y: number, context: OffsetContext): OffsetVector {
  const gx = Math.floor(x / context.cellSize)
  const gy = Math.floor(y / context.cellSize)
  const tx = smoothstep((x % context.cellSize) / context.cellSize)
  const ty = smoothstep((y % context.cellSize) / context.cellSize)

  const v00 = randomVector(context.options.key, gx, gy, context.amplitude)
  const v10 = randomVector(context.options.key, gx + 1, gy, context.amplitude)
  const v01 = randomVector(context.options.key, gx, gy + 1, context.amplitude)
  const v11 = randomVector(context.options.key, gx + 1, gy + 1, context.amplitude)
  const dx = lerp(lerp(v00.dx, v10.dx, tx), lerp(v01.dx, v11.dx, tx), ty)
  const dy = lerp(lerp(v00.dy, v10.dy, tx), lerp(v01.dy, v11.dy, tx), ty)

  const rx = x - context.centerX
  const ry = y - context.centerY
  const radius = Math.hypot(rx, ry)
  const normalizedRadius = Math.min(1, radius / context.maxRadius)
  const swirlAmount = context.options.swirl * context.amplitude * Math.sin(normalizedRadius * Math.PI)
  const tangentX = radius > 0 ? -ry / radius : 0
  const tangentY = radius > 0 ? rx / radius : 0

  return {
    dx: dx + tangentX * swirlAmount,
    dy: dy + tangentY * swirlAmount,
  }
}

function buildRawOffsetMap(width: number, height: number, options: OffsetOptions): OffsetVector[] {
  const context = createOffsetContext(width, height, options)
  const map: OffsetVector[] = []

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      map.push(buildOffsetVectorAt(x, y, context))
    }
  }

  return map
}

function constrainMonotonicSamples(values: number[], maxValue: number): number[] {
  if (values.length <= 1) return values
  const constrained = values.map((value) => Math.min(maxValue, Math.max(0, value)))

  constrained[constrained.length - 1] = Math.min(constrained[constrained.length - 1], maxValue)
  for (let i = constrained.length - 2; i >= 0; i -= 1) {
    constrained[i] = Math.min(constrained[i], constrained[i + 1] - MIN_SAMPLE_STEP)
  }

  constrained[0] = Math.max(0, constrained[0])
  for (let i = 1; i < constrained.length; i += 1) {
    constrained[i] = Math.max(constrained[i], constrained[i - 1] + MIN_SAMPLE_STEP)
  }

  return constrained
}

function stabilizeOffsetMap(map: OffsetVector[], width: number, height: number): OffsetVector[] {
  const stabilized = map.map((vector) => ({ ...vector }))

  for (let y = 0; y < height; y += 1) {
    const sampleXs: number[] = []
    for (let x = 0; x < width; x += 1) {
      sampleXs.push(x - stabilized[y * width + x].dx)
    }
    const constrained = constrainMonotonicSamples(sampleXs, width - 1)
    for (let x = 0; x < width; x += 1) {
      stabilized[y * width + x].dx = x - constrained[x]
    }
  }

  for (let x = 0; x < width; x += 1) {
    const sampleYs: number[] = []
    for (let y = 0; y < height; y += 1) {
      sampleYs.push(y - stabilized[y * width + x].dy)
    }
    const constrained = constrainMonotonicSamples(sampleYs, height - 1)
    for (let y = 0; y < height; y += 1) {
      stabilized[y * width + x].dy = y - constrained[y]
    }
  }

  return stabilized
}

export function buildOffsetMap(width: number, height: number, options: OffsetOptions): OffsetVector[] {
  const map = buildRawOffsetMap(width, height, options)
  if (options.algorithm === 'legacy-grid') {
    return map
  }
  return stabilizeOffsetMap(map, width, height)
}

function waitForFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve())
      return
    }
    setTimeout(resolve, 0)
  })
}

async function buildOffsetMapAsync(
  width: number,
  height: number,
  options: OffsetOptions,
  onProgress: ProgressCallback,
  start: number,
  end: number,
): Promise<OffsetVector[]> {
  const context = createOffsetContext(width, height, options)
  const map: OffsetVector[] = []
  const chunkRows = 12
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      map.push(buildOffsetVectorAt(x, y, context))
    }
    if (y % chunkRows === chunkRows - 1) {
      onProgress(start + ((y + 1) / height) * (end - start))
      await waitForFrame()
    }
  }
  onProgress(end)
  if (options.algorithm === 'legacy-grid') {
    return map
  }
  return stabilizeOffsetMap(map, width, height)
}

export function nonlinearOffsetImage(source: ImageData, options: OffsetOptions): ImageData {
  const output = new ImageData(source.width, source.height)
  const map = buildOffsetMap(source.width, source.height, options)
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const vector = map[y * source.width + x]
      const pixel = bilinearSample(source.data, source.width, source.height, x - vector.dx, y - vector.dy)
      setPixel(output.data, source.width, x, y, pixel)
    }
  }
  return output
}

export async function nonlinearOffsetImageAsync(source: ImageData, options: OffsetOptions, onProgress: ProgressCallback): Promise<ImageData> {
  const output = new ImageData(source.width, source.height)
  const map = await buildOffsetMapAsync(source.width, source.height, options, onProgress, 0, 45)
  const chunkRows = 12
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const vector = map[y * source.width + x]
      const pixel = bilinearSample(source.data, source.width, source.height, x - vector.dx, y - vector.dy)
      setPixel(output.data, source.width, x, y, pixel)
    }
    if (y % chunkRows === chunkRows - 1) {
      onProgress(45 + ((y + 1) / source.height) * 55)
      await waitForFrame()
    }
  }
  onProgress(100)
  return output
}

function sampleOffsetVector(map: OffsetVector[], width: number, height: number, x: number, y: number): OffsetVector {
  const sx = Math.min(width - 1, Math.max(0, x))
  const sy = Math.min(height - 1, Math.max(0, y))
  const x0 = Math.floor(sx)
  const y0 = Math.floor(sy)
  const x1 = Math.min(width - 1, x0 + 1)
  const y1 = Math.min(height - 1, y0 + 1)
  const tx = sx - x0
  const ty = sy - y0
  const v00 = map[y0 * width + x0]
  const v10 = map[y0 * width + x1]
  const v01 = map[y1 * width + x0]
  const v11 = map[y1 * width + x1]

  return {
    dx: lerp(lerp(v00.dx, v10.dx, tx), lerp(v01.dx, v11.dx, tx), ty),
    dy: lerp(lerp(v00.dy, v10.dy, tx), lerp(v01.dy, v11.dy, tx), ty),
  }
}

export function restoreNonlinearOffsetImage(source: ImageData, options: OffsetOptions): ImageData {
  const output = new ImageData(source.width, source.height)
  const map = buildOffsetMap(source.width, source.height, options)

  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      let sx = x
      let sy = y
      for (let i = 0; i < 5; i += 1) {
        const vector = sampleOffsetVector(map, source.width, source.height, sx, sy)
        sx = x + vector.dx
        sy = y + vector.dy
      }
      const pixel = bilinearSample(source.data, source.width, source.height, sx, sy)
      setPixel(output.data, source.width, x, y, pixel)
    }
  }

  return output
}

export async function restoreNonlinearOffsetImageAsync(source: ImageData, options: OffsetOptions, onProgress: ProgressCallback): Promise<ImageData> {
  const output = new ImageData(source.width, source.height)
  const map = await buildOffsetMapAsync(source.width, source.height, options, onProgress, 0, 35)
  const chunkRows = 12

  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      let sx = x
      let sy = y
      for (let i = 0; i < 5; i += 1) {
        const vector = sampleOffsetVector(map, source.width, source.height, sx, sy)
        sx = x + vector.dx
        sy = y + vector.dy
      }
      const pixel = bilinearSample(source.data, source.width, source.height, sx, sy)
      setPixel(output.data, source.width, x, y, pixel)
    }
    if (y % chunkRows === chunkRows - 1) {
      onProgress(35 + ((y + 1) / source.height) * 65)
      await waitForFrame()
    }
  }

  onProgress(100)
  return output
}
