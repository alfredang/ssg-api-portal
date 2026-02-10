import { useApi } from './hooks/useApi';
import { getCourseByRefNo } from './api/courseApi';
import SearchForm from './components/SearchForm';
import CourseOverview from './components/CourseOverview';
import TrainingProviderCard from './components/TrainingProviderCard';
import CourseRunsTable from './components/CourseRunsTable';
import CourseMetadata from './components/CourseMetadata';
import type { CourseResponse } from './types/course';
import './App.css';

function App() {
  const { data, loading, error, execute } = useApi<CourseResponse>();

  const handleSearch = async (refNo: string, includeExpired: boolean) => {
    await execute(() => getCourseByRefNo(refNo, includeExpired));
  };

  const courses = data?.data?.courses;

  return (
    <div className="app">
      <header className="app-header">
        <h1>SSG Course Directory Explorer</h1>
        <p>Look up course details by reference number</p>
      </header>

      <main>
        <SearchForm onSearch={handleSearch} loading={loading} />

        {error && <div className="error-alert">{error}</div>}

        {loading && <div className="loading">Loading course details...</div>}

        {courses && courses.length === 0 && (
          <div className="no-results">No courses found for this reference number.</div>
        )}

        {courses && courses.map((course, idx) => (
          <div key={idx} className="course-result">
            <CourseOverview course={course} />
            <TrainingProviderCard course={course} />
            <CourseRunsTable runs={course.runs} />
            <CourseMetadata course={course} />
          </div>
        ))}
      </main>
    </div>
  );
}

export default App;
