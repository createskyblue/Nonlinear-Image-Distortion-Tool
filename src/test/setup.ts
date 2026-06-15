class TestImageData {
  readonly data: Uint8ClampedArray
  readonly width: number
  readonly height: number
  readonly colorSpace = 'srgb'

  constructor(dataOrWidth: Uint8ClampedArray | number, width: number, height?: number) {
    if (typeof dataOrWidth === 'number') {
      this.width = dataOrWidth
      this.height = width
      this.data = new Uint8ClampedArray(this.width * this.height * 4)
      return
    }

    if (height === undefined) {
      throw new Error('ImageData height is required when data is provided.')
    }
    this.data = dataOrWidth
    this.width = width
    this.height = height
  }
}

Object.defineProperty(globalThis, 'ImageData', {
  value: TestImageData,
  writable: true,
})
