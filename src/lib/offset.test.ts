import { describe, expect, it } from 'vitest'
import { buildOffsetMap, nonlinearOffsetImage, restoreNonlinearOffsetImage, type OffsetVector } from './offset'

function makeStripes(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4
      data[i] = x % 2 === 0 ? 240 : 20
      data[i + 1] = y % 2 === 0 ? 200 : 40
      data[i + 2] = 120
      data[i + 3] = 255
    }
  }
  return new ImageData(data, width, height)
}

function makeGradient(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4
      data[i] = Math.round((x / Math.max(1, width - 1)) * 255)
      data[i + 1] = Math.round((y / Math.max(1, height - 1)) * 255)
      data[i + 2] = Math.round(((x + y) / Math.max(1, width + height - 2)) * 255)
      data[i + 3] = 255
    }
  }
  return new ImageData(data, width, height)
}

function makePixelArtBlocks(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4)
  const colors = [
    [188, 188, 188],
    [255, 255, 255],
    [0, 0, 0],
  ]
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4
      const color = x % 24 === 0 || y % 24 === 0 ? colors[2] : x < width / 2 ? colors[0] : colors[1]
      data[i] = color[0]
      data[i + 1] = color[1]
      data[i + 2] = color[2]
      data[i + 3] = 255
    }
  }
  return new ImageData(data, width, height)
}

function meanAbsoluteRgbDifference(a: ImageData, b: ImageData): number {
  let total = 0
  for (let i = 0; i < a.data.length; i += 4) {
    total += Math.abs(a.data[i] - b.data[i])
    total += Math.abs(a.data[i + 1] - b.data[i + 1])
    total += Math.abs(a.data[i + 2] - b.data[i + 2])
  }
  return total / ((a.data.length / 4) * 3)
}

function countUniqueColors(image: ImageData): number {
  const colors = new Set<string>()
  for (let i = 0; i < image.data.length; i += 4) {
    colors.add(`${image.data[i]},${image.data[i + 1]},${image.data[i + 2]},${image.data[i + 3]}`)
  }
  return colors.size
}

function countHorizontalSamplingFolds(map: OffsetVector[], width: number, height: number): number {
  let folds = 0
  for (let y = 0; y < height; y += 1) {
    let previousSampleX = 0
    for (let x = 0; x < width; x += 1) {
      const vector = map[y * width + x]
      const sampleX = x - vector.dx
      if (x > 0 && sampleX < previousSampleX) {
        folds += 1
      }
      previousSampleX = sampleX
    }
  }
  return folds
}

function sampleX(map: OffsetVector[], width: number, x: number, y: number): number {
  return x - map[y * width + x].dx
}

function minHorizontalSampleStepNear(
  map: OffsetVector[],
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  radius: number,
): number {
  let minStep = Number.POSITIVE_INFINITY
  const startY = Math.max(0, centerY - radius)
  const endY = Math.min(height - 1, centerY + radius)
  const startX = Math.max(0, centerX - radius)
  const endX = Math.min(width - 2, centerX + radius)

  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      minStep = Math.min(minStep, sampleX(map, width, x + 1, y) - sampleX(map, width, x, y))
    }
  }

  return minStep
}

function sampleY(map: OffsetVector[], width: number, x: number, y: number): number {
  return y - map[y * width + x].dy
}

function localSamplingDiagnostics(
  map: OffsetVector[],
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  radius: number,
): Record<string, number> {
  let minStepX = Number.POSITIVE_INFINITY
  let maxStepX = Number.NEGATIVE_INFINITY
  let maxStepXJump = 0
  let maxVerticalSampleXJump = 0
  let minStepY = Number.POSITIVE_INFINITY
  let maxStepY = Number.NEGATIVE_INFINITY
  let maxStepYJump = 0
  let maxHorizontalSampleYJump = 0
  const startY = Math.max(0, centerY - radius)
  const endY = Math.min(height - 1, centerY + radius)
  const startX = Math.max(0, centerX - radius)
  const endX = Math.min(width - 1, centerX + radius)

  for (let y = startY; y <= endY; y += 1) {
    let previousStepX: number | null = null
    for (let x = startX; x < endX; x += 1) {
      const step = sampleX(map, width, x + 1, y) - sampleX(map, width, x, y)
      minStepX = Math.min(minStepX, step)
      maxStepX = Math.max(maxStepX, step)
      if (previousStepX !== null) {
        maxStepXJump = Math.max(maxStepXJump, Math.abs(step - previousStepX))
      }
      previousStepX = step
    }
  }

  for (let x = startX; x <= endX; x += 1) {
    let previousStepY: number | null = null
    for (let y = startY; y < endY; y += 1) {
      const step = sampleY(map, width, x, y + 1) - sampleY(map, width, x, y)
      minStepY = Math.min(minStepY, step)
      maxStepY = Math.max(maxStepY, step)
      if (previousStepY !== null) {
        maxStepYJump = Math.max(maxStepYJump, Math.abs(step - previousStepY))
      }
      previousStepY = step
    }
  }

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      maxVerticalSampleXJump = Math.max(
        maxVerticalSampleXJump,
        Math.abs(sampleX(map, width, x, y + 1) - sampleX(map, width, x, y)),
      )
    }
  }

  for (let x = startX; x < endX; x += 1) {
    for (let y = startY; y <= endY; y += 1) {
      maxHorizontalSampleYJump = Math.max(
        maxHorizontalSampleYJump,
        Math.abs(sampleY(map, width, x + 1, y) - sampleY(map, width, x, y)),
      )
    }
  }

  return {
    minStepX,
    maxStepX,
    maxStepXJump,
    maxVerticalSampleXJump,
    minStepY,
    maxStepY,
    maxStepYJump,
    maxHorizontalSampleYJump,
  }
}

function countOutOfRangeSamplingSteps(
  map: OffsetVector[],
  width: number,
  height: number,
  minimumStep: number,
  maximumStep: number,
  inset: number,
): number {
  let outOfRange = 0

  for (let y = inset; y < height - inset; y += 1) {
    for (let x = inset; x < width - inset - 1; x += 1) {
      const step = sampleX(map, width, x + 1, y) - sampleX(map, width, x, y)
      if (step < minimumStep || step > maximumStep) outOfRange += 1
    }
  }

  for (let y = inset; y < height - inset - 1; y += 1) {
    for (let x = inset; x < width - inset; x += 1) {
      const step = sampleY(map, width, x, y + 1) - sampleY(map, width, x, y)
      if (step < minimumStep || step > maximumStep) outOfRange += 1
    }
  }

  return outOfRange
}

describe('nonlinear offset', () => {
  it('builds a deterministic bounded displacement field', () => {
    const first = buildOffsetMap(24, 16, {
      amplitude: 5,
      cellSize: 8,
      key: 'private-grid',
      swirl: 0.4,
    })
    const second = buildOffsetMap(24, 16, {
      amplitude: 5,
      cellSize: 8,
      key: 'private-grid',
      swirl: 0.4,
    })

    expect(first).toEqual(second)
    expect(Math.max(...first.map((v) => Math.hypot(v.dx, v.dy)))).toBeLessThanOrEqual(8)
  })

  it('moves pixels without changing the canvas dimensions', () => {
    const source = makeStripes(32, 32)
    const shifted = nonlinearOffsetImage(source, {
      amplitude: 6,
      cellSize: 12,
      key: 'private-grid',
      swirl: 0.2,
    })

    expect(shifted.width).toBe(source.width)
    expect(shifted.height).toBe(source.height)
    expect(Array.from(shifted.data)).not.toEqual(Array.from(source.data))
  })

  it('adds a visible tangential displacement when swirl is increased', () => {
    const base = buildOffsetMap(160, 120, {
      amplitude: 14,
      cellSize: 72,
      key: 'private-grid',
      swirl: 0,
    })
    const swirled = buildOffsetMap(160, 120, {
      amplitude: 14,
      cellSize: 72,
      key: 'private-grid',
      swirl: 1,
    })
    const maxDelta = Math.max(
      ...base.map((vector, index) => Math.hypot(vector.dx - swirled[index].dx, vector.dy - swirled[index].dy)),
    )

    expect(maxDelta).toBeGreaterThan(10)
  })

  it('scales the displacement field with image size', () => {
    const options = {
      amplitude: 8,
      cellSize: 24,
      key: 'scale-proof',
      swirl: 0.4,
    }
    const small = buildOffsetMap(100, 80, options)
    const large = buildOffsetMap(200, 160, options)
    const smallVector = small[40 * 100 + 50]
    const largeVector = large[80 * 200 + 100]

    expect(largeVector.dx).toBeCloseTo(smallVector.dx * 2, 1)
    expect(largeVector.dy).toBeCloseTo(smallVector.dy * 2, 1)
  })

  it('keeps the default displacement field from folding into vertical tears', () => {
    const map = buildOffsetMap(240, 160, {
      amplitude: 6,
      cellSize: 10,
      key: 'tear-prone-owner',
      swirl: 0.25,
    })

    expect(countHorizontalSamplingFolds(map, 240, 160)).toBe(0)
  })

  it('keeps known tall-image parameters from collapsing into narrow vertical seams', () => {
    const width = 1030
    const height = 1533
    const map = buildOffsetMap(width, height, {
      algorithm: 'smooth-grid',
      amplitude: 1.1,
      cellSize: 20,
      key: '1fv3j33-zlkn2a-1yldygw',
      swirl: 0.25,
    })

    expect(minHorizontalSampleStepNear(map, width, height, 987, 1032, 12)).toBeGreaterThan(0.35)
    expect(minHorizontalSampleStepNear(map, width, height, 922, 868, 12)).toBeGreaterThan(0.35)
  }, 10_000)

  it('keeps the reported 1215 by 1087 pixel-art position free of sampling jumps', () => {
    const width = 1215
    const height = 1087
    const map = buildOffsetMap(width, height, {
      algorithm: 'smooth-grid',
      amplitude: 1.1,
      cellSize: 20,
      key: '1fv3j33-zlkn2a-1yldygw',
      swirl: 0.25,
    })

    expect(localSamplingDiagnostics(map, width, height, 922, 868, 32).maxStepXJump).toBeLessThan(0.01)
    expect(minHorizontalSampleStepNear(map, width, height, 922, 868, 12)).toBeGreaterThan(0.35)
  }, 10_000)

  it('keeps interior sampling steps from forming pixel-wide distortion lines', () => {
    const width = 1215
    const height = 1087
    const map = buildOffsetMap(width, height, {
      algorithm: 'smooth-grid',
      amplitude: 1.1,
      cellSize: 20,
      key: '1fv3j33-zlkn2a-1yldygw',
      swirl: 0.25,
    })

    expect(countOutOfRangeSamplingSteps(map, width, height, 0.65, 1.35, 32)).toBe(0)
  }, 10_000)

  it('keeps low-color pixel art from gaining blended seam colors', () => {
    const source = makePixelArtBlocks(96, 80)
    const shifted = nonlinearOffsetImage(source, {
      amplitude: 8,
      cellSize: 22,
      key: 'pixel-art-seam',
      swirl: 0.25,
    })

    expect(countUniqueColors(shifted)).toBeLessThanOrEqual(countUniqueColors(source))
  })

  it('restores the scrambled image better with the matching key than with a wrong key', () => {
    const source = makeGradient(96, 72)
    const options = {
      amplitude: 8,
      cellSize: 28,
      key: 'known-owner-key',
      swirl: 0.25,
    }
    const scrambled = nonlinearOffsetImage(source, options)
    const restored = restoreNonlinearOffsetImage(scrambled, options)
    const wrongKeyRestored = restoreNonlinearOffsetImage(scrambled, {
      ...options,
      key: 'wrong-owner-key',
    })

    expect(meanAbsoluteRgbDifference(source, restored)).toBeLessThan(meanAbsoluteRgbDifference(source, scrambled))
    expect(meanAbsoluteRgbDifference(source, restored)).toBeLessThan(meanAbsoluteRgbDifference(source, wrongKeyRestored))
  })
})
