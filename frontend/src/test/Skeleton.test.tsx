import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Skeleton, SkeletonCard, SkeletonHeader } from '@/components/Skeleton'

describe('Skeleton', () => {
  it('渲染基础骨架', () => {
    render(<Skeleton />)
    // 默认 className 包含 animate-shimmer
    const el = document.querySelector('.animate-shimmer')
    expect(el).toBeInTheDocument()
  })

  it('应用自定义高度', () => {
    render(<Skeleton height="h-8" />)
    const el = document.querySelector('.h-8')
    expect(el).toBeInTheDocument()
  })

  it('应用自定义宽度', () => {
    render(<Skeleton width="w-1/2" />)
    const el = document.querySelector('.w-1\\/2')
    expect(el).toBeInTheDocument()
  })

  it('应用自定义圆角', () => {
    render(<Skeleton rounded="rounded-full" />)
    const el = document.querySelector('.rounded-full')
    expect(el).toBeInTheDocument()
  })
})

describe('SkeletonCard', () => {
  it('渲染卡片骨架', () => {
    render(<SkeletonCard />)
    // 应该包含多个 Skeleton，检查 animate-shimmer 数量
    const els = document.querySelectorAll('.animate-shimmer')
    expect(els.length).toBeGreaterThanOrEqual(3)
  })
})

describe('SkeletonHeader', () => {
  it('渲染标题骨架', () => {
    render(<SkeletonHeader />)
    const els = document.querySelectorAll('.animate-shimmer')
    expect(els.length).toBe(2)
  })
})
