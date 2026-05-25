import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import ThemeToggle from '@/components/ThemeToggle'

// 在测试前注入 matchMedia mock
beforeEach(() => {
  // 确保 window.matchMedia 存在
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  })
})

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('渲染切换按钮', () => {
    render(<ThemeToggle />)
    const btn = screen.getByRole('button', { name: /切换/ })
    expect(btn).toBeInTheDocument()
  })

  it('点击按钮切换主题', async () => {
    const user = (await import('@testing-library/user-event')).default.setup()
    render(<ThemeToggle />)

    const btn = screen.getByRole('button')
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    await user.click(btn)

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('再次点击切换回浅色', async () => {
    const user = (await import('@testing-library/user-event')).default.setup()
    render(<ThemeToggle />)

    const btn = screen.getByRole('button')
    await user.click(btn) // 切换到深色
    await user.click(btn) // 切换回浅色

    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('theme')).toBe('light')
  })

  it('从 localStorage 恢复深色主题', () => {
    localStorage.setItem('theme', 'dark')
    render(<ThemeToggle />)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('从 localStorage 恢复浅色主题', () => {
    localStorage.setItem('theme', 'light')
    render(<ThemeToggle />)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
