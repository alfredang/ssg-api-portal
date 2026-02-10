import { useState } from 'react';

interface SearchFormProps {
  onSearch: (refNo: string, includeExpired: boolean) => void;
  loading: boolean;
}

export default function SearchForm({ onSearch, loading }: SearchFormProps) {
  const [refNo, setRefNo] = useState('');
  const [includeExpired, setIncludeExpired] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refNo.trim()) return;
    onSearch(refNo.trim(), includeExpired);
  };

  return (
    <form onSubmit={handleSubmit} className="search-form">
      <div className="search-input-group">
        <label htmlFor="refNo">Course Reference Number</label>
        <input
          id="refNo"
          type="text"
          value={refNo}
          onChange={(e) => setRefNo(e.target.value)}
          placeholder="e.g. SCN-198202248E-01-CRS-N-0027685"
          disabled={loading}
        />
      </div>
      <div className="search-options">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={includeExpired}
            onChange={(e) => setIncludeExpired(e.target.checked)}
          />
          Include expired courses
        </label>
        <button type="submit" disabled={loading || !refNo.trim()}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
    </form>
  );
}
