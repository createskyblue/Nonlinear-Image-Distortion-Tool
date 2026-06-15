import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('App', () => {
  it('renders the processing workspace with file, camera, process, and download actions', () => {
    render(<App />)

    expect(screen.getByText('密钥追踪')).toBeTruthy()
    expect(screen.getByText('怎么用')).toBeTruthy()
    expect(screen.getByText('先选一张图片，也可以直接粘贴截图或拖入图片；放进来后会自动处理。')).toBeTruthy()
    expect(screen.getByText('别人把图片放大或缩小后再发回来，也可以用同一个参数码尝试还原。')).toBeTruthy()
    expect(screen.getByText('点“变模糊”会自动加扰再还原一次，可以连续点，细节会一层层变软。')).toBeTruthy()
    expect(screen.getByRole('button', { name: '选文件' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '拍照' })).toBeTruthy()
    expect(screen.getByText('也可以直接粘贴截图，或把图片拖进页面。')).toBeTruthy()
    expect(screen.getByRole('button', { name: '加扰' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '还原' })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: '参数码' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /处理/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: '变模糊' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /下载/ })).toBeTruthy()
    expect(screen.getByRole('link', { name: '打开 GitHub 仓库' }).getAttribute('href')).toBe('https://github.com/createskyblue/Nonlinear-Image-Distortion-Tool')
    expect(screen.getByText('处理后自动复制结果')).toBeTruthy()
    expect(screen.getByText('非线性偏移')).toBeTruthy()
    expect(screen.getByText('原图预览')).toBeTruthy()
    expect(screen.getByText('结果预览')).toBeTruthy()
  })

  it('switches between Chinese and English labels', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'English' }))

    expect(screen.getByRole('heading', { name: 'Nonlinear Image Distortion Tool' })).toBeTruthy()
    expect(screen.getByText('How to use')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Choose file' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Restore' })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Parameter code' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Open GitHub repository' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '中文' }))

    expect(screen.getByRole('heading', { name: '图片非线性扰动工具' })).toBeTruthy()
    expect(screen.getByText('怎么用')).toBeTruthy()
  })

  it('keeps preview images at natural size until they exceed the preview frame', () => {
    const styles = readFileSync(resolve(__dirname, 'App.css'), 'utf8')

    expect(styles).toContain('.preview-frame img')
    expect(styles).toContain('width: auto')
    expect(styles).toContain('max-width: 100%')
  })
})
