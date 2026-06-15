import { describe, expect, it } from 'vitest'
import { processImagePipeline, processImagePipelineAsync } from './pipeline'

function makeTextured(width: number, height: number, value = 96): ImageData {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4
      data[i] = (value + x * 3 + y) % 256
      data[i + 1] = (value + x + y * 2) % 256
      data[i + 2] = (value + x * 2 + y * 4) % 256
      data[i + 3] = 255
    }
  }
  return new ImageData(data, width, height)
}

describe('processing pipeline', () => {
  it('scrambles the image with the configured nonlinear offset', () => {
    const base = makeTextured(128, 96)
    const result = processImagePipeline(base, {
      mode: 'scramble',
      offset: {
        amplitude: 6,
        cellSize: 24,
        key: 'owner-a',
        swirl: 0.2,
      },
    })

    expect(result.steps).toEqual(['scramble'])
    expect(Array.from(result.image.data)).not.toEqual(Array.from(base.data))
  })

  it('restores the image path with the same offset parameters', () => {
    const base = makeTextured(128, 96)
    const scrambled = processImagePipeline(base, {
      mode: 'scramble',
      offset: {
        amplitude: 6,
        cellSize: 24,
        key: 'owner-a',
        swirl: 0.2,
      },
    })
    const restored = processImagePipeline(scrambled.image, {
      mode: 'restore',
      offset: {
        amplitude: 6,
        cellSize: 24,
        key: 'owner-a',
        swirl: 0.2,
      },
    })

    expect(restored.steps).toEqual(['restore'])
    expect(restored.image.width).toBe(base.width)
    expect(restored.image.height).toBe(base.height)
  })

  it('softens the image by scrambling and restoring in one pass', () => {
    const base = makeTextured(128, 96)
    const softened = processImagePipeline(base, {
      mode: 'blur',
      offset: {
        amplitude: 6,
        cellSize: 24,
        key: 'owner-a',
        swirl: 0.2,
      },
    })

    expect(softened.steps).toEqual(['scramble', 'restore'])
    expect(softened.image.width).toBe(base.width)
    expect(softened.image.height).toBe(base.height)
    expect(Array.from(softened.image.data)).not.toEqual(Array.from(base.data))
  })

  it('reports progress while processing asynchronously', async () => {
    const base = makeTextured(64, 48)
    const progress: number[] = []
    const result = await processImagePipelineAsync(
      base,
      {
        mode: 'blur',
        offset: {
          amplitude: 6,
          cellSize: 24,
          key: 'owner-a',
          swirl: 0.2,
        },
      },
      (value) => progress.push(value),
    )

    expect(result.steps).toEqual(['scramble', 'restore'])
    expect(progress[0]).toBe(0)
    expect(progress.at(-1)).toBe(100)
    expect(progress.some((value) => value > 0 && value < 100)).toBe(true)
  })
})
