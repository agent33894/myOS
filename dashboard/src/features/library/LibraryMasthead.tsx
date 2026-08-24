interface LibraryMastheadProps {
  counts: { total: number; typeCount: number };
}

/** Serif masthead with live vault counts. */
export function LibraryMasthead({ counts }: LibraryMastheadProps) {
  return (
    <header className="chronicle-index-masthead chronicle-library-masthead">
      <h1>Library</h1>
      <p className="chronicle-detail-meta">
        {counts.total} artifacts · {counts.typeCount} types
      </p>
    </header>
  );
}
