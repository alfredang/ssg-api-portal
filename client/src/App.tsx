import { useState, useMemo } from 'react';
import { useApi } from './hooks/useApi';
import { getCourseDetails, searchCourses } from './api/courseApi';
import SearchForm from './components/SearchForm';
import CourseSearchForm from './components/CourseSearchForm';
import CourseOverview from './components/CourseOverview';
import TrainingProviderCard from './components/TrainingProviderCard';
import CourseSupportTable from './components/CourseRunsTable';
import CourseMetadata from './components/CourseMetadata';
import type { Course, CourseResponse, CourseSearchResponse } from './types/course';
import './App.css';

type Page = 'course-lookup' | 'course-search'
  | 'course-feedback' | 'training-provider' | 'grant-calculator'
  | 'sf-credit-pay' | 'enrolments' | 'assessments'
  | 'skills-passport' | 'skills-framework'
  | 'resources' | 'articles' | 'events';

interface NavCategory {
  label: string;
  children?: { id: Page; label: string }[];
  id?: Page; // for categories with no children (leaf nodes)
}

const NAV_ITEMS: NavCategory[] = [
  {
    label: 'Courses',
    children: [
      { id: 'course-lookup', label: 'Lookup by Ref No' },
      { id: 'course-search', label: 'Course Search' },
    ],
  },
  { label: 'Course Feedback', id: 'course-feedback' },
  { label: 'Training Provider', id: 'training-provider' },
  { label: 'Grant Calculator', id: 'grant-calculator' },
  { label: 'SkillsFuture Credit Pay', id: 'sf-credit-pay' },
  { label: 'Enrolments', id: 'enrolments' },
  { label: 'Assessments', id: 'assessments' },
  { label: 'Skills Passport', id: 'skills-passport' },
  { label: 'Skills Framework', id: 'skills-framework' },
  { label: 'Resources', id: 'resources' },
  { label: 'Articles', id: 'articles' },
  { label: 'Events', id: 'events' },
];

function CollapsibleCourse({ course, defaultOpen }: { course: Course; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <div className="course-result">
      <button className="collapsible-header" onClick={() => setOpen(!open)}>
        <div className="collapsible-title">
          <h3>{course.title}</h3>
          <span className="collapsible-ref">{course.referenceNumber}</span>
        </div>
        <span className={`collapsible-arrow ${open ? 'open' : ''}`}>&#9660;</span>
      </button>
      {open && (
        <div className="collapsible-content">
          <CourseOverview course={course} />
          <TrainingProviderCard course={course} />
          <CourseSupportTable support={course.support} />
          <CourseMetadata course={course} />
        </div>
      )}
    </div>
  );
}

function Sidebar({ activePage, onNavigate }: { activePage: Page; onNavigate: (page: Page) => void }) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Courses']));

  const toggleCategory = (label: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const isChildActive = (cat: NavCategory) =>
    cat.children?.some((c) => c.id === activePage) ?? false;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>SSG API Portal</h1>
        <p>Developer Explorer</p>
      </div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((cat) => {
          if (cat.children) {
            const isOpen = expandedCategories.has(cat.label);
            return (
              <div className="nav-category" key={cat.label}>
                <button
                  className={`nav-category-btn ${isChildActive(cat) ? 'active' : ''}`}
                  onClick={() => toggleCategory(cat.label)}
                >
                  {cat.label}
                  <span className={`nav-category-arrow ${isOpen ? 'open' : ''}`}>&#9660;</span>
                </button>
                {isOpen && (
                  <div className="nav-subitems">
                    {cat.children.map((child) => (
                      <button
                        key={child.id}
                        className={`nav-subitem ${activePage === child.id ? 'active' : ''}`}
                        onClick={() => onNavigate(child.id)}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <div className="nav-category" key={cat.label}>
              <button
                className={`nav-category-btn no-children ${activePage === cat.id ? 'active' : ''}`}
                onClick={() => cat.id && onNavigate(cat.id)}
              >
                {cat.label}
              </button>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <>
      <h2 className="page-title">{title}</h2>
      <div className="placeholder-card">
        <h3>Coming Soon</h3>
        <p>This API integration is not yet available.</p>
      </div>
    </>
  );
}

function App() {
  const [activePage, setActivePage] = useState<Page>('course-lookup');
  const [keyword, setKeyword] = useState('');
  const lookupApi = useApi<CourseResponse>();
  const searchApi = useApi<CourseSearchResponse>();

  const handleLookup = async (params: { refNo: string; uen: string; courseRunStartDate: string }) => {
    searchApi.reset();
    await lookupApi.execute(() => getCourseDetails(params.refNo, params.uen, params.courseRunStartDate || undefined));
  };

  const handleSearch = async (params: {
    uen: string;
    dateFrom: string;
    dateTo: string;
    pageSize: number;
  }) => {
    lookupApi.reset();
    setKeyword('');
    await searchApi.execute(() => searchCourses(params));
  };

  const handleNavigate = (page: Page) => {
    setActivePage(page);
    setKeyword('');
    lookupApi.reset();
    searchApi.reset();
  };

  const loading = lookupApi.loading || searchApi.loading;
  const error = lookupApi.error || searchApi.error;
  const rawCourses = lookupApi.data?.data?.courses || searchApi.data?.data?.courses;
  const searchMeta = searchApi.data?.meta;

  const courses = useMemo(() => {
    if (!rawCourses) return undefined;
    if (!keyword) return rawCourses;
    const kw = keyword.toLowerCase();
    return rawCourses.filter(
      (c) => (c.title && c.title.toLowerCase().includes(kw)) ||
             (c.description && c.description.toLowerCase().includes(kw))
    );
  }, [rawCourses, keyword]);

  const PAGE_TITLES: Record<string, string> = {
    'course-feedback': 'Course Feedback',
    'training-provider': 'Training Provider',
    'grant-calculator': 'Grant Calculator',
    'sf-credit-pay': 'SkillsFuture Credit Pay',
    'enrolments': 'Enrolments',
    'assessments': 'Assessments',
    'skills-passport': 'Skills Passport',
    'skills-framework': 'Skills Framework',
    'resources': 'Resources',
    'articles': 'Articles',
    'events': 'Events',
  };

  const renderContent = () => {
    if (activePage === 'course-lookup') {
      return (
        <>
          <h2 className="page-title">Course Lookup by Ref No</h2>
          <SearchForm onSearch={handleLookup} loading={loading} />

          {error && <div className="error-alert">{error}</div>}
          {loading && <div className="loading">Loading course details...</div>}

          {courses && courses.map((course, idx) => (
            <div key={idx} className="course-result">
              <CourseOverview course={course} />
              <TrainingProviderCard course={course} />
              <CourseSupportTable support={course.support} />
              <CourseMetadata course={course} />
            </div>
          ))}

          {courses && courses.length === 0 && !loading && (
            <div className="no-results">No courses found.</div>
          )}
        </>
      );
    }

    if (activePage === 'course-search') {
      return (
        <>
          <h2 className="page-title">Course Search</h2>
          <CourseSearchForm onSearch={handleSearch} loading={loading} />

          {error && <div className="error-alert">{error}</div>}
          {loading && <div className="loading">Loading course details...</div>}

          {rawCourses && rawCourses.length > 0 && (
            <div className="results-filter">
              <div className="results-summary">
                {keyword
                  ? `Showing ${courses?.length} of ${rawCourses.length} course(s) matching "${keyword}"`
                  : `Found ${rawCourses.length} course(s)`}
              </div>
              <div className="filter-input-group">
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Filter results by keyword..."
                />
              </div>
            </div>
          )}

          {courses && courses.length === 0 && !loading && (
            <div className="no-results">No courses found.</div>
          )}

          {courses && courses.map((course, idx) => (
            <CollapsibleCourse key={idx} course={course} />
          ))}
        </>
      );
    }

    return <PlaceholderPage title={PAGE_TITLES[activePage] || activePage} />;
  };

  return (
    <div className="app">
      <Sidebar activePage={activePage} onNavigate={handleNavigate} />
      <main className="main-content">
        <div className="main-content-inner">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default App;
