import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the processing workspace with file, camera, process, and download actions', () => {
    render(<App />)

    expect(screen.getByText('密钥追踪')).toBeTruthy()
    expect(screen.getByText('怎么用')).toBeTruthy()
    expect(screen.getByText('先选一张图片，也可以直接粘贴截图；粘贴后会自动处理。')).toBeTruthy()
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
    expect(screen.getByText('处理后自动复制结果')).toBeTruthy()
    expect(screen.getByText('非线性偏移')).toBeTruthy()
    expect(screen.getByText('原图预览')).toBeTruthy()
    expect(screen.getByText('结果预览')).toBeTruthy()
  })
})
