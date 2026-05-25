import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ToastProvider, useToast } from '@/components/Toast'

// 测试用的消费组件
function TestConsumer() {
  const { toast } = useToast()
  return (
    <div>
      <button onClick={() => toast('操作成功', 'success')}>触发成功</button>
      <button onClick={() => toast('出错了', 'error')}>触发错误</button>
      <button onClick={() => toast('普通提示')}>触发默认</button>
    </div>
  )
}

describe('ToastProvider', () => {
  // 不用 fake timers，避免和 waitFor 冲突
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('提供 toast 方法给子组件', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    )

    expect(screen.getByText('触发成功')).toBeInTheDocument()
  })

  it('显示 success 类型 toast', async () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    )

    const btn = screen.getByText('触发成功')
    btn.click()

    // waitFor 用 real timers，默认 1000ms 超时，toast 是同步渲染的所以很快
    await waitFor(() => {
      expect(screen.getByText('操作成功')).toBeInTheDocument()
    })
    expect(screen.getByText('✅')).toBeInTheDocument()
  })

  it('显示 error 类型 toast', async () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    )

    const btn = screen.getByText('触发错误')
    btn.click()

    await waitFor(() => {
      expect(screen.getByText('出错了')).toBeInTheDocument()
    })
    expect(screen.getByText('❌')).toBeInTheDocument()
  })

  it('默认类型为 info', async () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    )

    const btn = screen.getByText('触发默认')
    btn.click()

    await waitFor(() => {
      expect(screen.getByText('普通提示')).toBeInTheDocument()
    })
    expect(screen.getByText('💡')).toBeInTheDocument()
  })

  // 这个测试需要等 3 秒，单独设长 timeout
  it('3秒后自动消失', async () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    )

    const btn = screen.getByText('触发成功')
    btn.click()

    // 确认 toast 出现
    await waitFor(() => {
      expect(screen.getByText('操作成功')).toBeInTheDocument()
    })

    // 等 3.5 秒让 toast 自动消失（3s + 300ms 动画）
    await new Promise(r => setTimeout(r, 3500))

    // 应该用 queryByText 因为它可能已经不在了
    expect(screen.queryByText('操作成功')).not.toBeInTheDocument()
  }, 10000) // 10 秒超时
})
