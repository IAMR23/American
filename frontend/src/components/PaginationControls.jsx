export default function PaginationControls({
  page,
  totalPages,
  total,
  onPageChange,
}) {
  const currentPage = Math.max(Number(page) || 1, 1);
  const pages = Math.max(Number(totalPages) || 1, 1);

  if (pages <= 1 && !total) return null;

  return (
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 my-3">
      <small className="text-muted">
        Total: {Number(total) || 0} registros
      </small>

      <div className="btn-group" role="group" aria-label="Paginacion">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Anterior
        </button>
        <span className="btn btn-outline-secondary btn-sm disabled">
          {currentPage} / {pages}
        </span>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          disabled={currentPage >= pages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
