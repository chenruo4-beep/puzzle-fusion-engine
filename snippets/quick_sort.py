from typing import List, TypeVar

T = TypeVar("T")


def quick_sort(arr: List[T]) -> List[T]:
    """快速排序（经典 Lomuto 分区方案）"""
    if len(arr) <= 1:
        return arr

    pivot = arr[-1]
    left = [x for x in arr[:-1] if x <= pivot]
    right = [x for x in arr[:-1] if x > pivot]

    return quick_sort(left) + [pivot] + quick_sort(right)


def quick_sort_inplace(arr: List[T], lo: int = 0, hi: int | None = None) -> None:
    """原地快速排序，避免额外空间"""
    if hi is None:
        hi = len(arr) - 1

    if lo < hi:
        p = _partition(arr, lo, hi)
        quick_sort_inplace(arr, lo, p - 1)
        quick_sort_inplace(arr, p + 1, hi)


def _partition(arr: List[T], lo: int, hi: int) -> int:
    """Lomuto 分区，返回 pivot 最终位置"""
    pivot = arr[hi]
    i = lo
    for j in range(lo, hi):
        if arr[j] <= pivot:
            arr[i], arr[j] = arr[j], arr[i]
            i += 1
    arr[i], arr[hi] = arr[hi], arr[i]
    return i
