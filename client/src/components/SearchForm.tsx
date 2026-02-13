import { useState } from 'react';

interface SearchFormProps {
  onSearch: (params: { refNo: string; uen: string; courseRunStartDate: string }) => void;
  loading: boolean;
  defaults?: Record<string, string>;
}

export default function SearchForm({ onSearch, loading, defaults = {} }: SearchFormProps) {
  const [refNo, setRefNo] = useState(defaults.courseRefNo || 'TGS-2020505444');
  const [uen, setUen] = useState(defaults.uen || '201200696W');
  const [courseRunStartDate, setCourseRunStartDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refNo.trim() || !uen.trim()) return;
    onSearch({
      refNo: refNo.trim(),
      uen: uen.trim(),
      courseRunStartDate,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="search-form" autoComplete="off">
      <div className="search-input-group">
        <label htmlFor="refNo">Course Reference Number (required)</label>
        <input
          id="refNo"
          type="text"
          value={refNo}
          onChange={(e) => setRefNo(e.target.value)}
          placeholder="e.g. TGS-2020505444"
          disabled={loading}
        />
      </div>
      <div className="search-input-group">
        <label htmlFor="lookup-uen">UEN (required)</label>
        <input
          id="lookup-uen"
          type="text"
          value={uen}
          onChange={(e) => setUen(e.target.value)}
          placeholder="e.g. 201200696W"
          disabled={loading}
        />
      </div>
      <div className="search-input-group">
        <label htmlFor="courseRunStartDate">Course Run Start Date (optional)</label>
        <input
          id="courseRunStartDate"
          type="date"
          value={courseRunStartDate}
          onChange={(e) => setCourseRunStartDate(e.target.value)}
          disabled={loading}
        />
      </div>
      <div className="search-options">
        <span />
        <button type="submit" disabled={loading || !refNo.trim() || !uen.trim()}>
          {loading ? 'Loading...' : 'Lookup Course'}
        </button>
      </div>
    </form>
  );
}
