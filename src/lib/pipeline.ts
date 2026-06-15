import {
  nonlinearOffsetImage,
  nonlinearOffsetImageAsync,
  restoreNonlinearOffsetImage,
  restoreNonlinearOffsetImageAsync,
  type OffsetOptions,
  type ProgressCallback,
} from './offset'

export type PipelineOptions = {
  mode: 'scramble' | 'restore' | 'blur'
  offset: OffsetOptions
}

export type PipelineResult = {
  image: ImageData
  steps: string[]
}

export function processImagePipeline(source: ImageData, options: PipelineOptions): PipelineResult {
  let image = new ImageData(new Uint8ClampedArray(source.data), source.width, source.height)
  const steps: string[] = []

  if (options.offset.amplitude > 0) {
    if (options.mode === 'blur') {
      image = nonlinearOffsetImage(image, options.offset)
      steps.push('scramble')
      image = restoreNonlinearOffsetImage(image, options.offset)
      steps.push('restore')
    } else {
      image = options.mode === 'restore'
        ? restoreNonlinearOffsetImage(image, options.offset)
        : nonlinearOffsetImage(image, options.offset)
      steps.push(options.mode)
    }
  }

  return { image, steps }
}

function scaleProgress(onProgress: ProgressCallback, start: number, end: number): ProgressCallback {
  return (progress) => onProgress(start + (progress / 100) * (end - start))
}

export async function processImagePipelineAsync(
  source: ImageData,
  options: PipelineOptions,
  onProgress: ProgressCallback,
): Promise<PipelineResult> {
  let image = new ImageData(new Uint8ClampedArray(source.data), source.width, source.height)
  const steps: string[] = []
  onProgress(0)

  if (options.offset.amplitude > 0) {
    if (options.mode === 'blur') {
      image = await nonlinearOffsetImageAsync(image, options.offset, scaleProgress(onProgress, 0, 50))
      steps.push('scramble')
      image = await restoreNonlinearOffsetImageAsync(image, options.offset, scaleProgress(onProgress, 50, 100))
      steps.push('restore')
    } else if (options.mode === 'restore') {
      image = await restoreNonlinearOffsetImageAsync(image, options.offset, onProgress)
      steps.push('restore')
    } else {
      image = await nonlinearOffsetImageAsync(image, options.offset, onProgress)
      steps.push('scramble')
    }
  }

  onProgress(100)
  return { image, steps }
}
