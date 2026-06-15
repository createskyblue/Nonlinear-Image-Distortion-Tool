export type ImageLoadResult = {
  imageData: ImageData
  url: string
  width: number
  height: number
  name: string
}

export async function loadImageFile(file: File): Promise<ImageLoadResult> {
  const url = URL.createObjectURL(file)
  try {
    const bitmap = await createImageBitmap(file)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Cannot create a 2D canvas context.')
    }
    context.drawImage(bitmap, 0, 0)
    bitmap.close()
    return {
      imageData: context.getImageData(0, 0, canvas.width, canvas.height),
      url,
      width: canvas.width,
      height: canvas.height,
      name: file.name,
    }
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
}

export function imageDataToBlob(imageData: ImageData, type = 'image/png', quality = 0.95): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  const context = canvas.getContext('2d')
  if (!context) {
    return Promise.reject(new Error('Cannot create a 2D canvas context.'))
  }
  context.putImageData(imageData, 0, 0)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
        return
      }
      reject(new Error('Failed to export the image.'))
    }, type, quality)
  })
}

export async function imageDataToObjectUrl(imageData: ImageData): Promise<string> {
  const blob = await imageDataToBlob(imageData)
  return URL.createObjectURL(blob)
}

export function downloadObjectUrl(url: string, filename: string): void {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
}

export function createRandomSeed(): string {
  const bytes = new Uint32Array(3)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (value) => value.toString(36)).join('-')
}
