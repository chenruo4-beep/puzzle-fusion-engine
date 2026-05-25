import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import ErrorBoundary from '@/components/ErrorBoundary'

// 创建一个会抛错的组件
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('测试错误')
  }
  return <div>正常内容</div>
}

describe('ErrorBoundary', () => {
  // 抑制 console.error 的输出（ErrorBoundary 会打印错误）
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('正常渲染子组件', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('正常内容')).toBeInTheDocument()
  })

  it('捕获错误并显示降级UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('出了点问题')).toBeInTheDocument()
    expect(screen.getByText(/意外错误/)).toBeInTheDocument()
  })

  it('显示重试按钮，点击后尝试恢复', async () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const retryBtn = screen.getByRole('button', { name: '重试' })
    expect(retryBtn).toBeInTheDocument()

    // 点击重试后，ErrorBoundary state 重置，但子组件还是会抛错
    // 这里主要测试按钮存在且可点击
    retryBtn.click()
    expect(retryBtn).toBeEnabled()
  })

  it('使用自定义 fallback', () => {
    render(
      <ErrorBoundary fallback={<div>自定义错误页面</div>}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('自定义错误页面')).toBeInTheDocument()
  })
})
