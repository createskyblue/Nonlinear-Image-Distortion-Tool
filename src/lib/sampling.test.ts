import { describe, expect, it } from 'vitest'
import { nearestSample, shouldUseNearestSampling } from './sampling'

function makeImageData(colors: Array<[number, number, number, number]>): Uint8ClampedArray {
  const data = new Uint8ClampedArray(colors.length * 4)
  colors.forEach((color, index) => {
    data[index * 4] = color[0]
    data[index * 4 + 1] = color[1]
    data[index * 4 + 2] = color[2]
    data[index * 4 + 3] = color[3]
  })
  return data
}

describe('sampling', () => {
  it('uses nearest sampling for low-color hard-edge images', () => {
    const data = makeImageData([
      [0, 0, 0, 255],
      [188, 188, 188, 255],
      [255, 255, 255, 255],
      [188, 188, 188, 255],
    ])

    expect(shouldUseNearestSampling(data)).toBe(true)
  })

  it('keeps bilinear sampling available for color-rich images', () => {
    const colors = Array.from({ length: 129 }, (_, index) => [index, index, index, 255] as [number, number, number, number])

    expect(shouldUseNearestSampling(makeImageData(colors))).toBe(false)
  })

  it('samples the closest source pixel without blending', () => {
    const data = makeImageData([
      [0, 0, 0, 255],
      [255, 255, 255, 255],
      [188, 188, 188, 255],
      [64, 64, 64, 255],
    ])

    expect(nearestSample(data, 2, 2, 0.8, 0.1)).toEqual([255, 255, 255, 255])
  })
})
