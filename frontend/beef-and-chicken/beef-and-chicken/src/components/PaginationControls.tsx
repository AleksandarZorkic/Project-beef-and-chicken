export function PaginationControls({
  page,
  totalPages,
  totalCount,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div
      style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}
    >
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Prethodna
      </button>

      <span>
        Strana {page} od {totalPages} — ukupno {totalCount}
      </span>

      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Sledeća
      </button>
    </div>
  );
}
