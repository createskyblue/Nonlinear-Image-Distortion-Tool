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

function meanAbsoluteRgbDifference(a: ImageData, b: ImageData): number {
  let total = 0
  for (let i = 0; i < a.data.length; i += 4) {
    total += Math.abs(a.data[i] - b.data[i])
    total += Math.abs(a.data[i + 1] - b.data[i + 1])
    total += Math.abs(a.data[i + 2] - b.data[i + 2])
  }
  return total / ((a.data.length / 4) * 3)
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
