import { useEffect, useMemo, useState } from 'react'

export const DEFAULT_PAGE_SIZE = 10

function usePagination(items, options = {}) {
  const { pageSize = DEFAULT_PAGE_SIZE, resetDeps = [] } = options
  const [currentPage, setCurrentPage] = useState(1)

  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  useEffect(() => {
    setCurrentPage(1)
  }, resetDeps)

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages))
  }, [totalPages])

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return items.slice(startIndex, startIndex + pageSize)
  }, [currentPage, items, pageSize])

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endItem = totalItems === 0 ? 0 : Math.min(currentPage * pageSize, totalItems)

  return {
    currentPage,
    endItem,
    pageSize,
    paginatedItems,
    setCurrentPage,
    startIndex: startItem === 0 ? 0 : startItem - 1,
    startItem,
    totalItems,
    totalPages,
  }
}

export default usePagination
