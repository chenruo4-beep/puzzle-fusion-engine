import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EmptyState from '@/components/EmptyState'
import { describe, it, expect, vi } from 'vitest'

describe('EmptyState', () => {
  it('渲染标题', () => {
    render(<EmptyState title="暂无数据" />)
    expect(screen.getByText('暂无数据')).toBeInTheDocument()
  })

  it('渲染描述文字', () => {
    render(<EmptyState title="暂无数据" description="请先创建一些内容" />)
    expect(screen.getByText('请先创建一些内容')).toBeInTheDocument()
  })

  it('渲染操作按钮并响应点击', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()

    render(
      <EmptyState
        title="暂无数据"
        action={{ label: '去创建', onClick }}
      />
    )

    const btn = screen.getByRole('button', { name: '去创建' })
    expect(btn).toBeInTheDocument()

    await user.click(btn)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
