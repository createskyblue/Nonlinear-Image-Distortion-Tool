import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type ClipboardEvent } from 'react'
import {
  Camera,
  Download,
  FileImage,
  Info,
  Play,
  RefreshCw,
  Shield,
  Upload,
  Waves,
} from 'lucide-react'
import './App.css'
import { createRandomSeed, downloadObjectUrl, imageDataToObjectUrl, loadImageFile, type ImageLoadResult } from './lib/image-io'
import { getFirstImageFileFromFileList, getFirstImageFileFromItems } from './lib/input-files'
import { decodeParameterCode, encodeParameterCode } from './lib/parameter-code'
import { decodePersistedSettings, encodePersistedSettings, PERSISTED_SETTINGS_KEY, type PersistedSettings } from './lib/persisted-settings'
import { processImagePipelineAsync } from './lib/pipeline'
import { continueWithResult, swapWorkspaceImages } from './lib/workspace-images'

type ProcessMode = 'scramble' | 'restore'

const fallbackSettings: PersistedSettings = {
  mode: 'scramble',
  offset: {
    amplitude: 2,
    cellSize: 10,
    key: createRandomSeed(),
    swirl: 0.25,
  },
  copyResultToClipboard: false,
}

function loadInitialSettings(): PersistedSettings {
  const stored = typeof localStorage === 'undefined'
    ? null
    : decodePersistedSettings(localStorage.getItem(PERSISTED_SETTINGS_KEY))
  return stored ?? fallbackSettings
}

const initialSettings = loadInitialSettings()

type SliderProps = {
  label: string
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  onChange: (value: number) => void
}

type WorkspaceImage = ImageLoadResult

function Slider({ label, value, min, max, step = 1, suffix = '', onChange }: SliderProps) {
  return (
    <label className="control">
      <span>
        {label}
        <b>
          {value}
          {suffix}
        </b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  )
}

function PreviewPanel({ title, image, meta }: { title: string; image?: string; meta?: string }) {
  return (
    <section className="preview-panel">
      <div className="panel-title">
        <FileImage size={18} aria-hidden="true" />
        <span>{title}</span>
        {meta ? <small>{meta}</small> : null}
      </div>
      <div className="preview-frame">
        {image ? <img src={image} alt={title} /> : <span className="empty-preview">等待图像</span>}
      </div>
    </section>
  )
}

function GitHubMark() {
  return (
    <svg className="github-mark" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.16c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.16 1.18.92-.26 1.9-.38 2.88-.39.98.01 1.96.13 2.88.39 2.2-1.49 3.16-1.18 3.16-1.18.62 1.58.23 2.75.11 3.04.73.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.13v3.16c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"
      />
    </svg>
  )
}

function App() {
  const [source, setSource] = useState<WorkspaceImage | null>(null)
  const [result, setResult] = useState<WorkspaceImage | null>(null)
  const [resultName, setResultName] = useState('sanitized.png')
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)

  const [mode, setMode] = useState<ProcessMode>(initialSettings.mode)
  const [offsetSeed, setOffsetSeed] = useState(initialSettings.offset.key)
  const [offsetAmplitude, setOffsetAmplitude] = useState(initialSettings.offset.amplitude)
  const [offsetCellSize, setOffsetCellSize] = useState(initialSettings.offset.cellSize)
  const [offsetSwirl, setOffsetSwirl] = useState(Math.round(initialSettings.offset.swirl * 100))
  const [parameterCodeInput, setParameterCodeInput] = useState('')
  const [isEditingParameterCode, setIsEditingParameterCode] = useState(false)
  const [isDraggingImage, setIsDraggingImage] = useState(false)
  const [copyResultToClipboard, setCopyResultToClipboard] = useState(initialSettings.copyResultToClipboard)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const sourceRef = useRef<WorkspaceImage | null>(null)
  const resultRef = useRef<WorkspaceImage | null>(null)

  useEffect(() => {
    sourceRef.current = source
  }, [source])

  useEffect(() => {
    resultRef.current = result
  }, [result])

  useEffect(() => {
    if (typeof localStorage === 'undefined' || offsetSeed.trim().length === 0) return
    localStorage.setItem(
      PERSISTED_SETTINGS_KEY,
      encodePersistedSettings({
        mode,
        offset: {
          amplitude: offsetAmplitude,
          cellSize: offsetCellSize,
          key: offsetSeed.trim(),
          swirl: offsetSwirl / 100,
        },
        copyResultToClipboard,
      }),
    )
  }, [mode, offsetSeed, offsetAmplitude, offsetCellSize, offsetSwirl, copyResultToClipboard])

  useEffect(() => {
    return () => {
      if (sourceRef.current?.url) URL.revokeObjectURL(sourceRef.current.url)
      if (resultRef.current?.url) URL.revokeObjectURL(resultRef.current.url)
    }
  }, [])

  const sourceMeta = useMemo(() => {
    if (!source) return undefined
    return `${source.width} x ${source.height}`
  }, [source])

  function currentOffsetOptions() {
    return {
      amplitude: offsetAmplitude,
      cellSize: offsetCellSize,
      key: offsetSeed.trim(),
      swirl: offsetSwirl / 100,
    }
  }

  const syncedParameterCode = encodeParameterCode(currentOffsetOptions())
  const displayedParameterCode = isEditingParameterCode ? parameterCodeInput : syncedParameterCode

  function handleParameterCodeChange(value: string) {
    setIsEditingParameterCode(true)
    setParameterCodeInput(value)
    if (value.trim().length === 0) return
    try {
      const decoded = decodeParameterCode(value)
      setOffsetSeed(decoded.key)
      setOffsetAmplitude(decoded.amplitude)
      setOffsetCellSize(decoded.cellSize)
      setOffsetSwirl(Math.round(decoded.swirl * 100))
      setIsEditingParameterCode(false)
      setParameterCodeInput('')
    } catch (error) {
      if (!(error instanceof Error)) throw error
    }
  }

  async function loadSourceFile(file: File): Promise<WorkspaceImage | null> {
    try {
      const loaded = await loadImageFile(file)
      if (source?.url) URL.revokeObjectURL(source.url)
      if (result?.url) URL.revokeObjectURL(result.url)
      setSource(loaded)
      setResult(null)
      setResultName('sanitized.png')
      return loaded
    } catch (error) {
      if (!(error instanceof Error)) throw error
      return null
    }
  }

  async function readSelectedFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files ? getFirstImageFileFromFileList(event.target.files) : null
    event.target.value = ''
    if (!file) return
    const loaded = await loadSourceFile(file)
    if (loaded) {
      await processCurrentImage(mode, loaded)
    }
  }

  async function handlePaste(event: ClipboardEvent<HTMLElement>) {
    const file = getFirstImageFileFromItems(event.clipboardData.items)
    if (!file) return
    event.preventDefault()
    const loaded = await loadSourceFile(file)
    if (loaded) {
      await processCurrentImage(mode, loaded)
    }
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    if (!getFirstImageFileFromItems(event.dataTransfer.items) && !getFirstImageFileFromFileList(Array.from(event.dataTransfer.files))) {
      return
    }
    event.preventDefault()
    setIsDraggingImage(true)
  }

  function handleDragLeave(event: DragEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDraggingImage(false)
    }
  }

  async function handleDrop(event: DragEvent<HTMLElement>) {
    const file = getFirstImageFileFromItems(event.dataTransfer.items) ?? getFirstImageFileFromFileList(Array.from(event.dataTransfer.files))
    if (!file) return
    event.preventDefault()
    setIsDraggingImage(false)
    const loaded = await loadSourceFile(file)
    if (loaded) {
      await processCurrentImage(mode, loaded)
    }
  }

  async function handleProcess() {
    await processCurrentImage(mode)
  }

  async function handleBlur() {
    await processCurrentImage('blur')
  }

  async function processCurrentImage(processMode: ProcessMode | 'blur', inputSource = source) {
    if (!inputSource) return
    if (offsetSeed.trim().length === 0) return

    setIsProcessing(true)
    setProgress(0)
    try {
      const processed = await processImagePipelineAsync(
        inputSource.imageData,
        {
          mode: processMode,
          offset: {
            ...currentOffsetOptions(),
          },
        },
        (value) => setProgress(Math.min(100, Math.max(0, Math.round(value)))),
      )
      const suffix = processMode === 'restore' ? 'restored' : processMode === 'blur' ? 'softened' : 'scrambled'
      const nextResultName = `${inputSource.name.replace(/\.[^.]+$/, '') || 'image'}-${suffix}.png`
      const nextResultUrl = await imageDataToObjectUrl(processed.image)
      const nextSourceUrl = processMode === 'blur' ? await imageDataToObjectUrl(processed.image) : ''
      const nextResult = {
        imageData: processed.image,
        url: nextResultUrl,
        width: processed.image.width,
        height: processed.image.height,
        name: nextResultName,
      }
      if (result?.url) URL.revokeObjectURL(result.url)
      if (processMode === 'blur') {
        if (inputSource.url) URL.revokeObjectURL(inputSource.url)
        const nextSource = {
          ...nextResult,
          url: nextSourceUrl,
        }
        const nextPair = continueWithResult({ source: nextSource, result: nextResult })
        setSource(nextPair.source)
        setResult(nextPair.result)
      } else {
        setResult(nextResult)
      }
      setResultName(nextResultName)
      if (copyResultToClipboard) {
        await copyImageToClipboard(processed.image)
      }
    } catch (error) {
      if (!(error instanceof Error)) throw error
    } finally {
      setIsProcessing(false)
      setProgress(100)
    }
  }

  async function copyImageToClipboard(image: ImageData) {
    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
      return
    }
    const blob = await new Promise<Blob>((resolve, reject) => {
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext('2d')
      if (!context) {
        reject(new Error('Cannot create a 2D canvas context.'))
        return
      }
      context.putImageData(image, 0, 0)
      canvas.toBlob((resultBlob) => {
        if (resultBlob) resolve(resultBlob)
        else reject(new Error('Failed to export the image.'))
      }, 'image/png')
    })
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
  }

  function handleDownload() {
    if (!result) return
    downloadObjectUrl(result.url, resultName)
  }

  function handleModeChange(nextMode: ProcessMode) {
    if (nextMode !== mode && result) {
      const swapped = swapWorkspaceImages({ source, result })
      setSource(swapped.source)
      setResult(swapped.result)
      setResultName(swapped.result?.name ?? 'sanitized.png')
    }
    setMode(nextMode)
  }

  return (
    <main
      className={`app-shell ${isDraggingImage ? 'dragging-image' : ''}`}
      onPaste={handlePaste}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <header className="topbar">
        <div>
          <span className="eyebrow">Nonlinear image distortion tool</span>
          <h1>图片非线性扰动工具</h1>
        </div>
        <div className="mode-badge">
          <Shield size={18} aria-hidden="true" />
          密钥追踪
        </div>
        <a
          className="github-link"
          href="https://github.com/createskyblue/Nonlinear-Image-Distortion-Tool"
          target="_blank"
          rel="noreferrer"
          aria-label="打开 GitHub 仓库"
          title="打开 GitHub 仓库"
        >
          <GitHubMark />
          <span>GitHub</span>
        </a>
      </header>

      <div className="workspace">
        <aside className="controls">
          <section className="panel guide-panel">
            <div className="section-title">
              <Info size={18} aria-hidden="true" />
              <h2>怎么用</h2>
            </div>
            <ul>
              <li>先选一张图片，也可以直接粘贴截图或拖入图片；放进来后会自动处理。</li>
              <li>点“加扰”后下载图片，把参数码一起保存好；参数码就是以后还原用的钥匙。</li>
              <li>别人把图片放大或缩小后再发回来，也可以用同一个参数码尝试还原。</li>
              <li>点“还原”会自动把右侧结果换到左侧，方便立刻对比还原效果。</li>
              <li>点“变模糊”会自动加扰再还原一次，可以连续点，细节会一层层变软。</li>
            </ul>
          </section>

          <section className="panel">
            <div className="section-title">
              <Upload size={18} aria-hidden="true" />
              <h2>输入</h2>
            </div>
            <div className="button-grid">
              <button type="button" onClick={() => fileInputRef.current?.click()}>
                <FileImage size={18} aria-hidden="true" />
                选文件
              </button>
              <button type="button" onClick={() => cameraInputRef.current?.click()}>
                <Camera size={18} aria-hidden="true" />
                拍照
              </button>
            </div>
            <p className="input-hint">也可以直接粘贴截图，或把图片拖进页面。</p>
            <input ref={fileInputRef} className="hidden-input" type="file" accept="image/*" onChange={readSelectedFile} />
            <input ref={cameraInputRef} className="hidden-input" type="file" accept="image/*" capture="environment" onChange={readSelectedFile} />
          </section>

          <section className="panel">
            <div className="section-title">
              <Waves size={18} aria-hidden="true" />
              <h2>非线性偏移</h2>
            </div>
            <div className="mode-switch" role="group" aria-label="处理模式">
              <button type="button" className={mode === 'scramble' ? 'active' : ''} onClick={() => handleModeChange('scramble')}>
                加扰
              </button>
              <button type="button" className={mode === 'restore' ? 'active' : ''} onClick={() => handleModeChange('restore')}>
                还原
              </button>
            </div>
            <div className="seed-row">
              <label>
                密钥 / 随机种子
                <input value={offsetSeed} onChange={(event) => setOffsetSeed(event.target.value)} />
              </label>
              <button type="button" aria-label="重新生成随机种子" title="重新生成随机种子" onClick={() => setOffsetSeed(createRandomSeed())}>
                <RefreshCw size={18} aria-hidden="true" />
              </button>
            </div>
            <Slider label="偏移强度" value={offsetAmplitude} min={0} max={12} step={0.1} suffix="%" onChange={setOffsetAmplitude} />
            <Slider label="网格尺度" value={offsetCellSize} min={2} max={40} step={0.5} suffix="%" onChange={setOffsetCellSize} />
            <Slider label="旋转扰动" value={offsetSwirl} min={0} max={100} suffix="%" onChange={setOffsetSwirl} />
            <label className="copy-toggle">
              <span>
                <strong>处理后自动复制结果</strong>
                <small>成功后把结果图放到剪贴板，方便直接粘贴到聊天或文档。</small>
              </span>
              <input type="checkbox" checked={copyResultToClipboard} onChange={(event) => setCopyResultToClipboard(event.target.checked)} />
            </label>
            <label className="parameter-code">
              参数码
              <textarea value={displayedParameterCode} placeholder="复制或粘贴 NO2: 开头的参数码" rows={3} onChange={(event) => handleParameterCodeChange(event.target.value)} />
            </label>
            <p className="hint-line">偏移强度和网格尺度按图片短边比例计算；还原时必须使用与加扰时完全相同的密钥和参数。</p>
          </section>

          <div className="action-row">
            <button className="primary-button" type="button" disabled={isProcessing} onClick={handleProcess}>
              <Play size={18} aria-hidden="true" />
              {isProcessing ? '处理中' : '处理'}
            </button>
            <button type="button" disabled={isProcessing} onClick={handleBlur}>
              <Waves size={18} aria-hidden="true" />
              变模糊
            </button>
            <button type="button" onClick={handleDownload}>
              <Download size={18} aria-hidden="true" />
              下载
            </button>
          </div>
          {isProcessing ? (
            <div className="progress-panel" role="status" aria-live="polite">
              <div className="progress-header">
                <span>处理中</span>
                <strong>{progress}%</strong>
              </div>
              <div className="progress-track" aria-label="处理进度">
                <span style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : null}
        </aside>

        <section className="preview-grid">
          <PreviewPanel title="原图预览" image={source?.url} meta={sourceMeta} />
          <PreviewPanel title="结果预览" image={result?.url} meta={result ? resultName : undefined} />
        </section>
      </div>
    </main>
  )
}

export default App
