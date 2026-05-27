import '../styles/Pagination.css'

function PaginationControls({
  currentPage,
  endItem,
  onPageChange,
  startItem,
  totalItems,
  totalPages,
}) {
  if (totalItems <= 10) {
    return null
  }

  const pageNumbers = []
  const startPage = Math.max(1, currentPage - 1)
  const endPage = Math.min(totalPages, startPage + 2)
  const normalizedStartPage = Math.max(1, endPage - 2)

  for (let page = normalizedStartPage; page <= endPage; page += 1) {
    pageNumbers.push(page)
  }

  return (
    <div className="pagination-bar">
      <div className="pagination-summary">
        Showing {startItem}-{endItem} of {totalItems}
      </div>
      <div className="pagination-actions">
        <button
          type="button"
          className="pagination-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        {pageNumbers.map((page) => (
          <button
            key={page}
            type="button"
            className={page === currentPage ? 'pagination-btn is-active' : 'pagination-btn'}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        ))}
        <button
          type="button"
          className="pagination-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  )
}

export default PaginationControls
