import { useState } from 'react';

interface CourseSearchFormProps {
  onSearch: (params: {
    uen: string;
    dateFrom: string;
    dateTo: string;
    pageSize: number;
  }) => void;
  loading: boolean;
}

function getDefaultDateFrom() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

function getDefaultDateTo() {
  return new Date().toISOString().slice(0, 10);
}

export default function CourseSearchForm({ onSearch, loading }: CourseSearchFormProps) {
  const [uen, setUen] = useState('201200696W');
  const [dateFrom, setDateFrom] = useState(getDefaultDateFrom);
  const [dateTo, setDateTo] = useState(getDefaultDateTo);
  const [pageSize, setPageSize] = useState(10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uen.trim()) return;
    onSearch({
      uen: uen.trim(),
      dateFrom,
      dateTo,
      pageSize,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="search-form">
      <div className="search-input-group">
        <label htmlFor="uen">UEN (required)</label>
        <input
          id="uen"
          type="text"
          value={uen}
          onChange={(e) => setUen(e.target.value)}
          placeholder="e.g. 201200696W"
          disabled={loading}
        />
      </div>

      <div className="search-row">
        <div className="search-input-group">
          <label htmlFor="dateFrom">Updated From</label>
          <input
            id="dateFrom"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="search-input-group">
          <label htmlFor="dateTo">Updated To</label>
          <input
            id="dateTo"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="search-input-group">
          <label htmlFor="pageSize">Page Size</label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            disabled={loading}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={300}>300</option>
            <option value={350}>350</option>
          </select>
        </div>
      </div>

      <div className="search-options">
        <span />
        <button type="submit" disabled={loading || !uen.trim()}>
          {loading ? 'Searching...' : 'Search Courses'}
        </button>
      </div>
    </form>
  );
}
