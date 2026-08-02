type PaginationControlsProps = {
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
};

export function PaginationControls({
  page,
  totalPages,
  totalCount,
  onPageChange,
}: PaginationControlsProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className="pagination-controls" aria-label="Navigacija kroz stranice">
      <button
        type="button"
        className="pagination-controls__button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <span aria-hidden="true">←</span>
        Prethodna
      </button>

      <div className="pagination-controls__info">
        <span>
          Strana
          <strong>{page}</strong>
          od
          <strong>{totalPages}</strong>
        </span>

        <small>Ukupno {totalCount} korisnika</small>
      </div>

      <button
        type="button"
        className="pagination-controls__button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Sledeća
        <span aria-hidden="true">→</span>
      </button>
    </nav>
  );
}
