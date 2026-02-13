import { useState, useMemo } from 'react';
import { useApi } from './hooks/useApi';
import { getCourseDetails, searchCourses, getCourseQuality, getCourseOutcome, getSessionAttendance, getCourseSessions, uploadSessionAttendance, getTrainers, updateTrainer, getPopularCourses, publishCourseRun, editCourseRun, getCourseRunById, getCourseRunsByRef, getGrantBaseline, getGrantPersonalised, searchGrants, getGrantDetails, getGrantCodes, getSfClaimDetails, cancelSfClaim, uploadSfSupportingDocs, encryptSfClaimRequest, decryptSfClaimRequest, createEnrolment, updateCancelEnrolment, searchEnrolments, viewEnrolment, updateFeeCollection, getEnrolmentCodes, createAssessment, updateVoidAssessment, searchAssessments, viewAssessment, getAssessmentCodes, getQualifications, postSkillExtract, postSkillSearch, getSkillsFrameworkJobs, getSkillsFrameworkSkills, generateCertificate, generateKeypair, generateEncryptionKey, getTrainingProviderCourses } from './api/courseApi';
import SearchForm from './components/SearchForm';
import CourseSearchForm from './components/CourseSearchForm';
import CourseOverview from './components/CourseOverview';
import TrainingProviderCard from './components/TrainingProviderCard';
import CourseSupportTable from './components/CourseRunsTable';
import CourseMetadata from './components/CourseMetadata';
import CourseQualityCard from './components/CourseQualityCard';
import CourseOutcomeCard from './components/CourseOutcomeCard';
import SessionAttendanceCard from './components/SessionAttendanceCard';
import CourseSessionsCard from './components/CourseSessionsCard';
import type { Course, CourseResponse, CourseSearchResponse, CourseQualityResponse, CourseOutcomeResponse, SessionAttendanceResponse, CourseSessionsResponse, UploadAttendanceRequest, UploadAttendanceResponse, TrainersResponse, UpdateTrainerRequest, UpdateTrainerResponse, PopularCoursesResponse, PublishCourseRunRequest, PublishCourseRunResponse, EditCourseRunRequest, EditCourseRunResponse, CourseRunByIdResponse, CourseRunsByRefResponse, GrantBaselineResponse, GrantPersonalisedResponse, GrantSearchResponse, GrantDetailsResponse, GrantCodeLookupResponse, SfClaimDetailsResponse, SfCancelClaimResponse, EnrolmentResponse } from './types/course';
import './App.css';

type Page = 'course-lookup' | 'course-search' | 'popular-courses' | 'tp-courses'
  | 'course-quality' | 'course-outcome'
  | 'course-sessions' | 'session-attendance' | 'upload-attendance' | 'trainer-details' | 'update-trainer' | 'publish-course-run' | 'edit-course-run' | 'course-run-by-id' | 'course-runs-by-ref' | 'training-provider'
  | 'grant-baseline' | 'grant-personalised' | 'grant-search' | 'grant-view' | 'grant-codes'
  | 'sf-view-claim' | 'sf-cancel-claim' | 'sf-upload-docs' | 'sf-encrypt-request' | 'sf-decrypt-request'
  | 'enrol-create' | 'enrol-update' | 'enrol-search' | 'enrol-view' | 'enrol-fee-collection' | 'enrol-codes'
  | 'assess-create' | 'assess-update' | 'assess-search' | 'assess-view' | 'assess-codes'
  | 'sp-qualifications'
  | 'sea-skill-extract' | 'sea-skill-search'
  | 'sfw-job-roles' | 'sfw-skills'
  | 'tools-generate-cert' | 'tools-generate-keypair' | 'tools-encryption-key'
  | 'api-issues';

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
      { id: 'popular-courses', label: 'Popular Courses' },
      { id: 'tp-courses', label: 'Courses by TP UEN' },
    ],
  },
  {
    label: 'Course Feedback',
    children: [
      { id: 'course-quality', label: 'Retrieve Course Quality' },
      { id: 'course-outcome', label: 'Retrieve Course Outcome' },
    ],
  },
  {
    label: 'Training Providers',
    children: [
      { id: 'course-sessions', label: 'Course Sessions' },
      { id: 'session-attendance', label: 'Session Attendance' },
      { id: 'upload-attendance', label: 'Upload Attendance' },
      { id: 'trainer-details', label: 'Trainer Details' },
      { id: 'update-trainer', label: 'Update/Delete Trainer' },
      { id: 'publish-course-run', label: 'Publish Course Run' },
      { id: 'edit-course-run', label: 'Update/Delete Course Run' },
      { id: 'course-run-by-id', label: 'Course Run by ID' },
      { id: 'course-runs-by-ref', label: 'Course Runs by Ref No' },
    ],
  },
  {
    label: 'Grant Calculator',
    children: [
      { id: 'grant-baseline', label: 'Baseline Scheme' },
      { id: 'grant-personalised', label: 'Personalised' },
      { id: 'grant-search', label: 'Search Grants' },
      { id: 'grant-view', label: 'View Grant Details' },
      { id: 'grant-codes', label: 'Grants Code Lookup' },
    ],
  },
  {
    label: 'SkillsFuture Credit Pay',
    children: [
      { id: 'sf-view-claim', label: 'View Claim Details' },
      { id: 'sf-cancel-claim', label: 'Cancel Claim' },
      { id: 'sf-upload-docs', label: 'Upload Supporting Docs' },
      { id: 'sf-encrypt-request', label: 'Request Encryption' },
      { id: 'sf-decrypt-request', label: 'Request Decryption' },
    ],
  },
  {
    label: 'Enrolments',
    children: [
      { id: 'enrol-create', label: 'Create Enrolment' },
      { id: 'enrol-update', label: 'Update/Cancel Enrolment' },
      { id: 'enrol-search', label: 'Search Enrolments' },
      { id: 'enrol-view', label: 'View Enrolment' },
      { id: 'enrol-fee-collection', label: 'Update Fee Collection' },
      { id: 'enrol-codes', label: 'Enrolment Code Lookup' },
    ],
  },
  {
    label: 'Assessments',
    children: [
      { id: 'assess-create', label: 'Create Assessment' },
      { id: 'assess-update', label: 'Update/Void Assessment' },
      { id: 'assess-search', label: 'Search Assessments' },
      { id: 'assess-view', label: 'View Assessment' },
      { id: 'assess-codes', label: 'Assessment Code Lookup' },
    ],
  },
  {
    label: 'Skills Passport',
    children: [
      { id: 'sp-qualifications', label: 'Retrieve Qualification' },
    ],
  },
  {
    label: 'SEA',
    children: [
      { id: 'sea-skill-extract', label: 'Skill Extraction' },
      { id: 'sea-skill-search', label: 'Skill Search' },
    ],
  },
  {
    label: 'Skills Framework',
    children: [
      { id: 'sfw-job-roles', label: 'Get Job Role Details' },
      { id: 'sfw-skills', label: 'Get Skills Details' },
    ],
  },
  {
    label: 'Tools',
    children: [
      { id: 'tools-generate-cert', label: 'Generate Certificate' },
      { id: 'tools-generate-keypair', label: 'Generate Digital Signature' },
      { id: 'tools-encryption-key', label: 'Generate Encryption Key' },
    ],
  },
  { label: 'Known API Issues', id: 'api-issues' },
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
  const qualityApi = useApi<CourseQualityResponse>();
  const outcomeApi = useApi<CourseOutcomeResponse>();
  const attendanceApi = useApi<SessionAttendanceResponse>();
  const sessionsApi = useApi<CourseSessionsResponse>();
  const uploadAttendanceApi = useApi<UploadAttendanceResponse>();
  const trainersApi = useApi<TrainersResponse>();
  const updateTrainerApi = useApi<UpdateTrainerResponse>();
  const popularCoursesApi = useApi<PopularCoursesResponse>();
  const tpCoursesApi = useApi<Record<string, unknown>>();
  const publishCourseRunApi = useApi<PublishCourseRunResponse>();
  const editCourseRunApi = useApi<EditCourseRunResponse>();
  const courseRunByIdApi = useApi<CourseRunByIdResponse>();
  const courseRunsByRefApi = useApi<CourseRunsByRefResponse>();
  const grantBaselineApi = useApi<GrantBaselineResponse>();
  const grantPersonalisedApi = useApi<GrantPersonalisedResponse>();
  const grantSearchApi = useApi<GrantSearchResponse>();
  const grantDetailsApi = useApi<GrantDetailsResponse>();
  const grantCodesApi = useApi<GrantCodeLookupResponse>();
  const sfClaimApi = useApi<SfClaimDetailsResponse>();
  const sfCancelApi = useApi<SfCancelClaimResponse>();
  const sfUploadDocsApi = useApi<SfCancelClaimResponse>();
  const sfEncryptApi = useApi<SfCancelClaimResponse>();
  const sfDecryptApi = useApi<SfCancelClaimResponse>();
  const enrolCreateApi = useApi<EnrolmentResponse>();
  const enrolUpdateApi = useApi<EnrolmentResponse>();
  const enrolSearchApi = useApi<EnrolmentResponse>();
  const enrolViewApi = useApi<EnrolmentResponse>();
  const enrolFeeApi = useApi<EnrolmentResponse>();
  const enrolCodesApi = useApi<EnrolmentResponse>();
  const assessCreateApi = useApi<EnrolmentResponse>();
  const assessUpdateApi = useApi<EnrolmentResponse>();
  const assessSearchApi = useApi<EnrolmentResponse>();
  const assessViewApi = useApi<EnrolmentResponse>();
  const assessCodesApi = useApi<EnrolmentResponse>();
  const spQualificationsApi = useApi<Record<string, unknown>>();
  const seaSkillExtractApi = useApi<Record<string, unknown>>();
  const seaSkillSearchApi = useApi<Record<string, unknown>>();
  const sfwJobRolesApi = useApi<Record<string, unknown>>();
  const sfwSkillsApi = useApi<Record<string, unknown>>();
  const generateCertApi = useApi<{ cert: string; key: string; command: string }>();
  const generateKeypairApi = useApi<{ privateKey: string; publicKeyPem: string; publicKeyStripped: string; commands: string[] }>();
  const encryptionKeyApi = useApi<{ key: string; command: string }>();

  const handleLookup = async (params: { refNo: string; uen: string; courseRunStartDate: string }) => {
    searchApi.reset();
    await lookupApi.execute(() => getCourseDetails(params.refNo, params.uen, params.courseRunStartDate || undefined));
  };

  const handleQualityLookup = async (refNo: string) => {
    await qualityApi.execute(() => getCourseQuality(refNo));
  };

  const handleOutcomeLookup = async (refNo: string) => {
    await outcomeApi.execute(() => getCourseOutcome(refNo));
  };

  const handleAttendanceLookup = async (params: {
    runId: string;
    uen: string;
    courseReferenceNumber: string;
    sessionId?: string;
  }) => {
    await attendanceApi.execute(() => getSessionAttendance(params));
  };

  const handleTrainersLookup = async (params: { uen: string; keyword?: string; pageSize?: number; page?: number }) => {
    await trainersApi.execute(() => getTrainers(params));
  };

  const handleUploadAttendance = async (runId: string, body: UploadAttendanceRequest) => {
    await uploadAttendanceApi.execute(() => uploadSessionAttendance(runId, body));
  };

  const handleUpdateTrainer = async (uen: string, trainerId: string, body: UpdateTrainerRequest) => {
    await updateTrainerApi.execute(() => updateTrainer(uen, trainerId, body));
  };

  const handlePopularCourses = async (params: { pageSize?: number; page?: number; taggingCode?: string }) => {
    await popularCoursesApi.execute(() => getPopularCourses(params));
  };

  const handleTpCourses = async (params: { uen: string; pageSize?: number; page?: number; keyword?: string; includeExpiredCourses?: boolean }) => {
    await tpCoursesApi.execute(() => getTrainingProviderCourses(params));
  };

  const handlePublishCourseRun = async (body: PublishCourseRunRequest, includeExpiredCourses: boolean) => {
    await publishCourseRunApi.execute(() => publishCourseRun(body, includeExpiredCourses));
  };

  const handleEditCourseRun = async (runId: string, body: EditCourseRunRequest, includeExpiredCourses: boolean) => {
    await editCourseRunApi.execute(() => editCourseRun(runId, body, includeExpiredCourses));
  };

  const handleCourseRunById = async (runId: string, includeExpiredCourses: boolean) => {
    await courseRunByIdApi.execute(() => getCourseRunById(runId, includeExpiredCourses));
  };

  const handleCourseRunsByRef = async (params: {
    courseReferenceNumber: string;
    uen?: string;
    pageSize?: number;
    page?: number;
    tpCode?: string;
    courseRunStartDate?: string;
    includeExpiredCourses?: boolean;
  }) => {
    await courseRunsByRefApi.execute(() => getCourseRunsByRef(params));
  };

  const handleGrantBaseline = async (courses: { trainingPartnerUen: string; courseReferenceNumber: string }[]) => {
    await grantBaselineApi.execute(() => getGrantBaseline({ courses }));
  };

  const handleGrantPersonalised = async (body: Parameters<typeof getGrantPersonalised>[0]) => {
    await grantPersonalisedApi.execute(() => getGrantPersonalised(body));
  };

  const handleGrantSearch = async (body: Parameters<typeof searchGrants>[0], uen: string) => {
    await grantSearchApi.execute(() => searchGrants(body, uen));
  };

  const handleGrantView = async (grantRefNo: string) => {
    await grantDetailsApi.execute(() => getGrantDetails(grantRefNo));
  };

  const handleGrantCodes = async () => {
    await grantCodesApi.execute(() => getGrantCodes());
  };

  const handleSfViewClaim = async (claimId: string, nric: string) => {
    await sfClaimApi.execute(() => getSfClaimDetails(claimId, nric));
  };

  const handleSfCancelClaim = async (claimId: string, nric: string, claimCancelCode: string) => {
    await sfCancelApi.execute(() => cancelSfClaim(claimId, { nric, claimCancelCode }));
  };

  const handleSfUploadDocs = async (claimId: string, body: Parameters<typeof uploadSfSupportingDocs>[1]) => {
    await sfUploadDocsApi.execute(() => uploadSfSupportingDocs(claimId, body));
  };

  const handleSfEncrypt = async (body: Record<string, unknown>) => {
    await sfEncryptApi.execute(() => encryptSfClaimRequest(body));
  };

  const handleSfDecrypt = async (body: Record<string, unknown>) => {
    await sfDecryptApi.execute(() => decryptSfClaimRequest(body));
  };

  const handleEnrolCreate = async (body: Record<string, unknown>) => {
    await enrolCreateApi.execute(() => createEnrolment(body));
  };

  const handleEnrolUpdate = async (refNo: string, body: Record<string, unknown>, uen: string) => {
    await enrolUpdateApi.execute(() => updateCancelEnrolment(refNo, body, uen));
  };

  const handleEnrolSearch = async (body: Record<string, unknown>) => {
    await enrolSearchApi.execute(() => searchEnrolments(body));
  };

  const handleEnrolView = async (refNo: string) => {
    await enrolViewApi.execute(() => viewEnrolment(refNo));
  };

  const handleEnrolFee = async (refNo: string, body: Record<string, unknown>) => {
    await enrolFeeApi.execute(() => updateFeeCollection(refNo, body));
  };

  const handleEnrolCodes = async () => {
    await enrolCodesApi.execute(() => getEnrolmentCodes());
  };

  const handleAssessCreate = async (body: Record<string, unknown>) => {
    await assessCreateApi.execute(() => createAssessment(body));
  };

  const handleAssessUpdate = async (refNo: string, body: Record<string, unknown>) => {
    await assessUpdateApi.execute(() => updateVoidAssessment(refNo, body));
  };

  const handleAssessSearch = async (body: Record<string, unknown>) => {
    await assessSearchApi.execute(() => searchAssessments(body));
  };

  const handleAssessView = async (refNo: string) => {
    await assessViewApi.execute(() => viewAssessment(refNo));
  };

  const handleAssessCodes = async () => {
    await assessCodesApi.execute(() => getAssessmentCodes());
  };

  const handleSpQualifications = async (level?: string) => {
    await spQualificationsApi.execute(() => getQualifications(level));
  };

  const handleSeaSkillExtract = async (body: { textData: string; modelVersion: string }) => {
    await seaSkillExtractApi.execute(() => postSkillExtract(body));
  };

  const handleSeaSkillSearch = async (body: { textData: string; modelVersion: string }) => {
    await seaSkillSearchApi.execute(() => postSkillSearch(body));
  };

  const handleSfwJobRoles = async (params: Record<string, string>) => {
    await sfwJobRolesApi.execute(() => getSkillsFrameworkJobs(params));
  };

  const handleSfwSkills = async (params: Record<string, string>) => {
    await sfwSkillsApi.execute(() => getSkillsFrameworkSkills(params));
  };

  const handleGenerateCert = async (body: { commonName: string; organization: string; country: string; days: string; keySize: string }) => {
    await generateCertApi.execute(() => generateCertificate(body));
  };

  const handleGenerateKeypair = async (keySize: string) => {
    await generateKeypairApi.execute(() => generateKeypair({ keySize }));
  };

  const handleEncryptionKey = async (bytes: string) => {
    await encryptionKeyApi.execute(() => generateEncryptionKey({ bytes }));
  };

  const handleSessionsLookup = async (params: {
    runId: string;
    uen: string;
    courseReferenceNumber: string;
    sessionMonth?: string;
    includeExpiredCourses?: boolean;
  }) => {
    await sessionsApi.execute(() => getCourseSessions(params));
  };

  const handleSearch = async (params: {
    uen: string;
    keyword: string;
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
    qualityApi.reset();
    outcomeApi.reset();
    attendanceApi.reset();
    sessionsApi.reset();
    uploadAttendanceApi.reset();
    trainersApi.reset();
    updateTrainerApi.reset();
    popularCoursesApi.reset();
    tpCoursesApi.reset();
    publishCourseRunApi.reset();
    editCourseRunApi.reset();
    courseRunByIdApi.reset();
    courseRunsByRefApi.reset();
    grantBaselineApi.reset();
    grantPersonalisedApi.reset();
    grantSearchApi.reset();
    grantDetailsApi.reset();
    grantCodesApi.reset();
    sfClaimApi.reset();
    sfCancelApi.reset();
    sfUploadDocsApi.reset();
    sfEncryptApi.reset();
    sfDecryptApi.reset();
    enrolCreateApi.reset();
    enrolUpdateApi.reset();
    enrolSearchApi.reset();
    enrolViewApi.reset();
    enrolFeeApi.reset();
    enrolCodesApi.reset();
    assessCreateApi.reset();
    assessUpdateApi.reset();
    assessSearchApi.reset();
    assessViewApi.reset();
    assessCodesApi.reset();
  };

  const loading = lookupApi.loading || searchApi.loading;
  const error = lookupApi.error || searchApi.error;
  const rawCourses = lookupApi.data?.data?.courses || searchApi.data?.data?.courses;

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
    'grant-calculator': 'Grant Calculator',
    'sf-credit-pay': 'SkillsFuture Credit Pay',
    'enrolments': 'Enrolments',
    'assessments': 'Assessments',
    'update-trainer': 'Update / Delete Trainer',
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

    if (activePage === 'popular-courses') {
      return (
        <>
          <h2 className="page-title">Popular Courses</h2>
          <form
            className="search-form"
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const taggingCode = (form.elements.namedItem('popTaggingCode') as HTMLInputElement).value.trim();
              const ps = parseInt((form.elements.namedItem('popPageSize') as HTMLInputElement).value.trim(), 10) || 20;
              const pg = parseInt((form.elements.namedItem('popPage') as HTMLInputElement).value.trim(), 10) || 0;
              handlePopularCourses({ taggingCode: taggingCode || undefined, pageSize: ps, page: pg });
            }}
          >
            <div className="search-input-group">
              <label htmlFor="popTaggingCode">Tagging Code (optional)</label>
              <input id="popTaggingCode" name="popTaggingCode" type="text" defaultValue="SFC" placeholder="e.g. SFC" disabled={popularCoursesApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="popPageSize">Page Size</label>
              <input id="popPageSize" name="popPageSize" type="number" defaultValue="20" min="1" max="100" disabled={popularCoursesApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="popPage">Page (0-indexed)</label>
              <input id="popPage" name="popPage" type="number" defaultValue="0" min="0" disabled={popularCoursesApi.loading} />
            </div>
            <div className="search-options">
              <span />
              <button type="submit" disabled={popularCoursesApi.loading}>
                {popularCoursesApi.loading ? 'Loading...' : 'Retrieve Popular Courses'}
              </button>
            </div>
          </form>

          {popularCoursesApi.error && <div className="error-alert">{popularCoursesApi.error}</div>}
          {popularCoursesApi.loading && <div className="loading">Loading popular courses...</div>}
          {popularCoursesApi.data?.data?.courses && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 12, color: '#666', fontSize: 14 }}>
                Found {popularCoursesApi.data.meta?.total ?? popularCoursesApi.data.data.courses.length} course(s)
              </div>
              <table className="sessions-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Reference No</th>
                    <th>Title</th>
                    <th>Training Provider</th>
                    <th>Area of Training</th>
                    <th>Training Mode</th>
                    <th>Duration (hrs)</th>
                  </tr>
                </thead>
                <tbody>
                  {popularCoursesApi.data.data.courses.map((course, idx) => (
                    <tr key={course.referenceNumber || idx}>
                      <td>{idx + 1}</td>
                      <td>{course.referenceNumber || '-'}</td>
                      <td>{course.title || '-'}</td>
                      <td>{course.trainingPartner?.name || '-'}</td>
                      <td>{course.areaOfTraining?.description || '-'}</td>
                      <td>{course.trainingMode?.description || '-'}</td>
                      <td>{course.totalTrainingDurationHours ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'tp-courses') {
      return (
        <>
          <h2 className="page-title">Courses by Training Provider UEN</h2>
          <p style={{ color: '#666', fontSize: 14, margin: '0 0 16px' }}>
            GET to production API (api.ssg-wsg.sg) with mTLS certificate, OAuth fallback. API version v1.1.
          </p>
          <form
            className="search-form"
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const uen = (form.elements.namedItem('tpcUen') as HTMLInputElement).value.trim();
              if (!uen) return;
              const keyword = (form.elements.namedItem('tpcKeyword') as HTMLInputElement).value.trim();
              const ps = parseInt((form.elements.namedItem('tpcPageSize') as HTMLInputElement).value.trim(), 10) || 20;
              const pg = parseInt((form.elements.namedItem('tpcPage') as HTMLInputElement).value.trim(), 10) || 0;
              const inclExpired = (form.elements.namedItem('tpcIncludeExpired') as HTMLInputElement).checked;
              handleTpCourses({ uen, keyword: keyword || undefined, pageSize: ps, page: pg, includeExpiredCourses: inclExpired });
            }}
          >
            <div className="search-input-group">
              <label htmlFor="tpcUen">Training Provider UEN (required)</label>
              <input id="tpcUen" name="tpcUen" type="text" defaultValue="201200696W" placeholder="e.g. 201200696W" disabled={tpCoursesApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="tpcKeyword">Keyword (optional)</label>
              <input id="tpcKeyword" name="tpcKeyword" type="text" defaultValue="" placeholder="e.g. testing" disabled={tpCoursesApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="tpcPageSize">Page Size</label>
              <input id="tpcPageSize" name="tpcPageSize" type="number" defaultValue="20" min="1" max="100" disabled={tpCoursesApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="tpcPage">Page (0-indexed)</label>
              <input id="tpcPage" name="tpcPage" type="number" defaultValue="0" min="0" disabled={tpCoursesApi.loading} />
            </div>
            <div className="search-input-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input id="tpcIncludeExpired" name="tpcIncludeExpired" type="checkbox" defaultChecked disabled={tpCoursesApi.loading} />
              <label htmlFor="tpcIncludeExpired" style={{ margin: 0 }}>Include Expired Courses</label>
            </div>
            <div className="search-options">
              <span />
              <button type="submit" disabled={tpCoursesApi.loading || false}>
                {tpCoursesApi.loading ? 'Loading...' : 'Retrieve Courses'}
              </button>
            </div>
          </form>

          {tpCoursesApi.error && <div className="error-alert">{tpCoursesApi.error}</div>}
          {tpCoursesApi.loading && <div className="loading">Loading courses...</div>}
          {tpCoursesApi.data && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13, background: '#f5f5f5', padding: 16, borderRadius: 8, maxHeight: 600, overflow: 'auto' }}>
                {JSON.stringify(tpCoursesApi.data, null, 2)}
              </pre>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'course-quality') {
      return (
        <>
          <h2 className="page-title">Course Quality Feedback</h2>
          <form
            className="search-form"
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const refNo = (form.elements.namedItem('qualityRefNo') as HTMLInputElement).value.trim();
              if (refNo) handleQualityLookup(refNo);
            }}
          >
            <div className="search-input-group">
              <label htmlFor="qualityRefNo">Course Reference Number (required)</label>
              <input
                id="qualityRefNo"
                name="qualityRefNo"
                type="text"
                defaultValue="TGS-2020505444"
                placeholder="e.g. TGS-2020505444"
                disabled={qualityApi.loading}
              />
            </div>
            <div className="search-options">
              <span />
              <button type="submit" disabled={qualityApi.loading}>
                {qualityApi.loading ? 'Loading...' : 'Retrieve Quality'}
              </button>
            </div>
          </form>

          {qualityApi.error && <div className="error-alert">{qualityApi.error}</div>}
          {qualityApi.loading && <div className="loading">Loading quality feedback...</div>}
          {qualityApi.data?.data?.quality && (
            <CourseQualityCard quality={qualityApi.data.data.quality} />
          )}
        </>
      );
    }

    if (activePage === 'course-outcome') {
      return (
        <>
          <h2 className="page-title">Course Outcome Feedback</h2>
          <form
            className="search-form"
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const refNo = (form.elements.namedItem('outcomeRefNo') as HTMLInputElement).value.trim();
              if (refNo) handleOutcomeLookup(refNo);
            }}
          >
            <div className="search-input-group">
              <label htmlFor="outcomeRefNo">Course Reference Number (required)</label>
              <input
                id="outcomeRefNo"
                name="outcomeRefNo"
                type="text"
                defaultValue="TGS-2020505444"
                placeholder="e.g. TGS-2020505444"
                disabled={outcomeApi.loading}
              />
            </div>
            <div className="search-options">
              <span />
              <button type="submit" disabled={outcomeApi.loading}>
                {outcomeApi.loading ? 'Loading...' : 'Retrieve Outcome'}
              </button>
            </div>
          </form>

          {outcomeApi.error && <div className="error-alert">{outcomeApi.error}</div>}
          {outcomeApi.loading && <div className="loading">Loading outcome feedback...</div>}
          {outcomeApi.data?.data?.outcome && (
            <CourseOutcomeCard outcome={outcomeApi.data.data.outcome} />
          )}
        </>
      );
    }

    if (activePage === 'course-sessions') {
      return (
        <>
          <h2 className="page-title">Course Sessions</h2>
          <form
            className="search-form"
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const runId = (form.elements.namedItem('sessRunId') as HTMLInputElement).value.trim();
              const uen = (form.elements.namedItem('sessUen') as HTMLInputElement).value.trim();
              const courseRef = (form.elements.namedItem('sessCourseRef') as HTMLInputElement).value.trim();
              const sessionMonth = (form.elements.namedItem('sessMonth') as HTMLInputElement).value.trim();
              if (runId && uen && courseRef) {
                handleSessionsLookup({
                  runId,
                  uen,
                  courseReferenceNumber: courseRef,
                  sessionMonth: sessionMonth || undefined,
                  includeExpiredCourses: true,
                });
              }
            }}
          >
            <div className="search-input-group">
              <label htmlFor="sessRunId">Course Run ID (required)</label>
              <input
                id="sessRunId"
                name="sessRunId"
                type="text"
                defaultValue="1234567"
                placeholder="e.g. 1234567"
                disabled={sessionsApi.loading}
              />
            </div>
            <div className="search-input-group">
              <label htmlFor="sessUen">UEN (required)</label>
              <input
                id="sessUen"
                name="sessUen"
                type="text"
                defaultValue="201200696W"
                placeholder="e.g. 201200696W"
                disabled={sessionsApi.loading}
              />
            </div>
            <div className="search-input-group">
              <label htmlFor="sessCourseRef">Course Reference Number (required)</label>
              <input
                id="sessCourseRef"
                name="sessCourseRef"
                type="text"
                defaultValue="TGS-2020505444"
                placeholder="e.g. TGS-2020505444"
                disabled={sessionsApi.loading}
              />
            </div>
            <div className="search-input-group">
              <label htmlFor="sessMonth">Session Month (optional, e.g. 112019)</label>
              <input
                id="sessMonth"
                name="sessMonth"
                type="text"
                placeholder="e.g. 112019"
                disabled={sessionsApi.loading}
              />
            </div>
            <div className="search-options">
              <span />
              <button type="submit" disabled={sessionsApi.loading}>
                {sessionsApi.loading ? 'Loading...' : 'Retrieve Sessions'}
              </button>
            </div>
          </form>

          {sessionsApi.error && <div className="error-alert">{sessionsApi.error}</div>}
          {sessionsApi.loading && <div className="loading">Loading course sessions...</div>}
          {sessionsApi.data?.data?.sessions && (
            <CourseSessionsCard sessions={sessionsApi.data.data.sessions} />
          )}
        </>
      );
    }

    if (activePage === 'session-attendance') {
      return (
        <>
          <h2 className="page-title">Course Session Attendance</h2>
          <form
            className="search-form"
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const runId = (form.elements.namedItem('attRunId') as HTMLInputElement).value.trim();
              const uen = (form.elements.namedItem('attUen') as HTMLInputElement).value.trim();
              const courseRef = (form.elements.namedItem('attCourseRef') as HTMLInputElement).value.trim();
              const sessionId = (form.elements.namedItem('attSessionId') as HTMLInputElement).value.trim();
              if (runId && uen && courseRef) {
                handleAttendanceLookup({
                  runId,
                  uen,
                  courseReferenceNumber: courseRef,
                  sessionId: sessionId || undefined,
                });
              }
            }}
          >
            <div className="search-input-group">
              <label htmlFor="attRunId">Course Run ID (required)</label>
              <input
                id="attRunId"
                name="attRunId"
                type="text"
                defaultValue="4161800"
                placeholder="e.g. 4161800"
                disabled={attendanceApi.loading}
              />
            </div>
            <div className="search-input-group">
              <label htmlFor="attUen">UEN (required)</label>
              <input
                id="attUen"
                name="attUen"
                type="text"
                defaultValue="201200696W"
                placeholder="e.g. 201200696W"
                disabled={attendanceApi.loading}
              />
            </div>
            <div className="search-input-group">
              <label htmlFor="attCourseRef">Course Reference Number (required)</label>
              <input
                id="attCourseRef"
                name="attCourseRef"
                type="text"
                defaultValue="TGS-2020505444"
                placeholder="e.g. TGS-2020505444"
                disabled={attendanceApi.loading}
              />
            </div>
            <div className="search-input-group">
              <label htmlFor="attSessionId">Session ID (optional)</label>
              <input
                id="attSessionId"
                name="attSessionId"
                type="text"
                placeholder="e.g. TEST 166-4161800-S1"
                disabled={attendanceApi.loading}
              />
            </div>
            <div className="search-options">
              <span />
              <button type="submit" disabled={attendanceApi.loading}>
                {attendanceApi.loading ? 'Loading...' : 'Retrieve Attendance'}
              </button>
            </div>
          </form>

          {attendanceApi.error && <div className="error-alert">{attendanceApi.error}</div>}
          {attendanceApi.loading && <div className="loading">Loading session attendance...</div>}
          {attendanceApi.data?.data?.courseRun && (
            <SessionAttendanceCard courseRun={attendanceApi.data.data.courseRun} />
          )}
        </>
      );
    }

    if (activePage === 'trainer-details') {
      return (
        <>
          <h2 className="page-title">Retrieve Trainer Details</h2>
          <form
            className="search-form"
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const uen = (form.elements.namedItem('trainerUen') as HTMLInputElement).value.trim();
              const kw = (form.elements.namedItem('trainerKeyword') as HTMLInputElement).value.trim();
              const ps = parseInt((form.elements.namedItem('trainerPageSize') as HTMLInputElement).value.trim(), 10) || 20;
              const pg = parseInt((form.elements.namedItem('trainerPage') as HTMLInputElement).value.trim(), 10) || 0;
              if (uen) {
                handleTrainersLookup({ uen, keyword: kw || undefined, pageSize: ps, page: pg });
              }
            }}
          >
            <div className="search-input-group">
              <label htmlFor="trainerUen">Training Provider UEN (required)</label>
              <input id="trainerUen" name="trainerUen" type="text" defaultValue="201200696W" placeholder="e.g. 201200696W" disabled={trainersApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="trainerKeyword">Keyword (optional)</label>
              <input id="trainerKeyword" name="trainerKeyword" type="text" defaultValue="" placeholder="e.g. WSQ, IT, Digital" disabled={trainersApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="trainerPageSize">Page Size</label>
              <input id="trainerPageSize" name="trainerPageSize" type="number" defaultValue="20" min="1" max="100" disabled={trainersApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="trainerPage">Page (0-indexed)</label>
              <input id="trainerPage" name="trainerPage" type="number" defaultValue="0" min="0" disabled={trainersApi.loading} />
            </div>
            <div className="search-options">
              <span />
              <button type="submit" disabled={trainersApi.loading}>
                {trainersApi.loading ? 'Loading...' : 'Retrieve Trainers'}
              </button>
            </div>
          </form>

          {trainersApi.error && <div className="error-alert">{trainersApi.error}</div>}
          {trainersApi.loading && <div className="loading">Loading trainer details...</div>}
          {trainersApi.data?.data?.trainers && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 12, color: '#666', fontSize: 14 }}>
                Found {trainersApi.data.meta?.total ?? trainersApi.data.data.trainers.length} trainer(s)
              </div>
              <table className="sessions-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>ID Number</th>
                    <th>ID Type</th>
                    <th>Roles</th>
                    <th>Domain / Area of Practice</th>
                    <th>In TP Profile</th>
                  </tr>
                </thead>
                <tbody>
                  {trainersApi.data.data.trainers.map((trainer, idx) => (
                    <tr key={trainer.id || idx}>
                      <td>{trainer.indexNumber ?? idx + 1}</td>
                      <td>{trainer.name || '-'}</td>
                      <td>{trainer.email || '-'}</td>
                      <td>{trainer.idNumber || '-'}</td>
                      <td>{trainer.idType?.description || trainer.idType?.id || '-'}</td>
                      <td>{trainer.roles?.map(r => r.role?.description).filter(Boolean).join(', ') || '-'}</td>
                      <td>{trainer.domainAreaOfPractice || '-'}</td>
                      <td>{trainer.inTrainingProviderProfile ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'update-trainer') {
      return (
        <>
          <h2 className="page-title">Update / Delete Trainer</h2>
          <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>
            POST to production API — certificate first, OAuth fallback. Set action to &quot;update&quot; or &quot;delete&quot;.
          </p>
          <form
            className="search-form"
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const uen = (form.elements.namedItem('utUen') as HTMLInputElement).value.trim();
              const trainerId = (form.elements.namedItem('utTrainerId') as HTMLInputElement).value.trim();
              const action = (form.elements.namedItem('utAction') as HTMLSelectElement).value as 'update' | 'delete';
              const name = (form.elements.namedItem('utName') as HTMLInputElement).value.trim();
              const email = (form.elements.namedItem('utEmail') as HTMLInputElement).value.trim();
              const idTypeCode = (form.elements.namedItem('utIdTypeCode') as HTMLSelectElement).value;
              const idTypeDesc = (form.elements.namedItem('utIdTypeCode') as HTMLSelectElement).selectedOptions[0]?.textContent?.split(' - ')[1] || '';
              const idNumber = (form.elements.namedItem('utIdNumber') as HTMLInputElement).value.trim();
              const experience = (form.elements.namedItem('utExperience') as HTMLInputElement).value.trim();
              const linkedInURL = (form.elements.namedItem('utLinkedIn') as HTMLInputElement).value.trim();
              const salutationId = parseInt((form.elements.namedItem('utSalutation') as HTMLSelectElement).value, 10);
              const domain = (form.elements.namedItem('utDomain') as HTMLInputElement).value.trim();
              const roleId = parseInt((form.elements.namedItem('utRoleId') as HTMLSelectElement).value, 10);
              const roleDesc = (form.elements.namedItem('utRoleId') as HTMLSelectElement).selectedOptions[0]?.textContent?.split(' - ')[1] || '';
              const qualLevel = (form.elements.namedItem('utQualLevel') as HTMLInputElement).value.trim();
              const qualDesc = (form.elements.namedItem('utQualDesc') as HTMLInputElement).value.trim();

              if (!uen || !trainerId || !name) return;

              const body: UpdateTrainerRequest = {
                trainer: {
                  name,
                  email,
                  photo: null,
                  roles: [{ role: { id: roleId, description: roleDesc } }],
                  action,
                  idType: { code: idTypeCode, description: idTypeDesc },
                  idNumber,
                  experience,
                  linkedInURL,
                  salutationId,
                  qualifications: qualLevel ? [{ level: { code: qualLevel }, description: qualDesc }] : [],
                  domainAreaOfPractice: domain,
                },
              };
              handleUpdateTrainer(uen, trainerId, body);
            }}
          >
            <div className="search-input-group">
              <label htmlFor="utUen">Training Provider UEN (required)</label>
              <input id="utUen" name="utUen" type="text" defaultValue="201200696W" disabled={updateTrainerApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="utTrainerId">Trainer ID (required)</label>
              <input id="utTrainerId" name="utTrainerId" type="text" defaultValue="FE9DA6F2-103D-4E2A-8AD1-013D8E246E00" disabled={updateTrainerApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="utAction">Action</label>
              <select id="utAction" name="utAction" defaultValue="update" disabled={updateTrainerApi.loading}>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
              </select>
            </div>
            <div className="search-input-group">
              <label htmlFor="utName">Trainer Name (required)</label>
              <input id="utName" name="utName" type="text" defaultValue="Ahmad Rahman" disabled={updateTrainerApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="utEmail">Email</label>
              <input id="utEmail" name="utEmail" type="email" defaultValue="ahmad.rahman@tertiary.edu.sg" disabled={updateTrainerApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="utIdTypeCode">ID Type</label>
              <select id="utIdTypeCode" name="utIdTypeCode" defaultValue="SP" disabled={updateTrainerApi.loading}>
                <option value="SB">SB - Singapore Blue Identification Card</option>
                <option value="SP">SP - Singapore Pink Identification Card</option>
                <option value="SO">SO - Fin/Work Permit</option>
                <option value="OT">OT - Others</option>
              </select>
            </div>
            <div className="search-input-group">
              <label htmlFor="utIdNumber">ID Number</label>
              <input id="utIdNumber" name="utIdNumber" type="text" defaultValue="S9876543A" disabled={updateTrainerApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="utRoleId">Role</label>
              <select id="utRoleId" name="utRoleId" defaultValue="1" disabled={updateTrainerApi.loading}>
                <option value="1">1 - Trainer</option>
                <option value="2">2 - Assessor</option>
                <option value="3">3 - Mentor</option>
              </select>
            </div>
            <div className="search-input-group">
              <label htmlFor="utSalutation">Salutation</label>
              <select id="utSalutation" name="utSalutation" defaultValue="1" disabled={updateTrainerApi.loading}>
                <option value="1">Mr</option>
                <option value="2">Ms</option>
                <option value="3">Mdm</option>
                <option value="4">Mrs</option>
                <option value="5">Dr</option>
              </select>
            </div>
            <div className="search-input-group">
              <label htmlFor="utExperience">Experience</label>
              <input id="utExperience" name="utExperience" type="text" defaultValue="10 years in IT training and curriculum development" disabled={updateTrainerApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="utLinkedIn">LinkedIn URL</label>
              <input id="utLinkedIn" name="utLinkedIn" type="text" defaultValue="https://www.linkedin.com/in/ahmad-rahman" disabled={updateTrainerApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="utDomain">Domain / Area of Practice</label>
              <input id="utDomain" name="utDomain" type="text" defaultValue="EduTrust Star" disabled={updateTrainerApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="utQualLevel">Qualification Level Code</label>
              <input id="utQualLevel" name="utQualLevel" type="text" defaultValue="21" placeholder="e.g. 21" disabled={updateTrainerApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="utQualDesc">Qualification Description</label>
              <input id="utQualDesc" name="utQualDesc" type="text" defaultValue="Master of Science in Information Technology" disabled={updateTrainerApi.loading} />
            </div>
            <div className="search-options">
              <span />
              <button type="submit" disabled={updateTrainerApi.loading}>
                {updateTrainerApi.loading ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>

          {updateTrainerApi.error && <div className="error-alert">{updateTrainerApi.error}</div>}
          {updateTrainerApi.loading && <div className="loading">Submitting trainer update...</div>}
          {updateTrainerApi.data && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <h3>Response</h3>
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 13 }}>
                {JSON.stringify(updateTrainerApi.data, null, 2)}
              </pre>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'publish-course-run') {
      return (
        <>
          <h2 className="page-title">Publish Course Run(s) with Sessions</h2>
          <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>
            POST to production API — certificate first, OAuth fallback. Publishes course run(s) with sessions and trainer details.
          </p>
          <form
            className="search-form"
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const courseRefNo = (form.elements.namedItem('pcrCourseRefNo') as HTMLInputElement).value.trim();
              const uen = (form.elements.namedItem('pcrUen') as HTMLInputElement).value.trim();
              const includeExpired = (form.elements.namedItem('pcrIncludeExpired') as HTMLInputElement).checked;
              const regOpening = (form.elements.namedItem('pcrRegOpening') as HTMLInputElement).value.trim();
              const regClosing = (form.elements.namedItem('pcrRegClosing') as HTMLInputElement).value.trim();
              const courseStart = (form.elements.namedItem('pcrCourseStart') as HTMLInputElement).value.trim();
              const courseEnd = (form.elements.namedItem('pcrCourseEnd') as HTMLInputElement).value.trim();
              const scheduleInfoTypeCode = (form.elements.namedItem('pcrSchedTypeCode') as HTMLInputElement).value.trim();
              const scheduleInfoTypeDesc = (form.elements.namedItem('pcrSchedTypeDesc') as HTMLInputElement).value.trim();
              const scheduleInfo = (form.elements.namedItem('pcrSchedInfo') as HTMLInputElement).value.trim();
              const venueBlock = (form.elements.namedItem('pcrVenueBlock') as HTMLInputElement).value.trim();
              const venueStreet = (form.elements.namedItem('pcrVenueStreet') as HTMLInputElement).value.trim();
              const venueFloor = (form.elements.namedItem('pcrVenueFloor') as HTMLInputElement).value.trim();
              const venueUnit = (form.elements.namedItem('pcrVenueUnit') as HTMLInputElement).value.trim();
              const venueBuilding = (form.elements.namedItem('pcrVenueBuilding') as HTMLInputElement).value.trim();
              const venuePostalCode = (form.elements.namedItem('pcrVenuePostal') as HTMLInputElement).value.trim();
              const venueRoom = (form.elements.namedItem('pcrVenueRoom') as HTMLInputElement).value.trim();
              const venueWheelchair = (form.elements.namedItem('pcrVenueWheelchair') as HTMLInputElement).checked;
              const intakeSize = parseInt((form.elements.namedItem('pcrIntakeSize') as HTMLInputElement).value.trim(), 10) || 50;
              const threshold = parseInt((form.elements.namedItem('pcrThreshold') as HTMLInputElement).value.trim(), 10) || 10;
              const registeredUserCount = parseInt((form.elements.namedItem('pcrRegUserCount') as HTMLInputElement).value.trim(), 10) || 50;
              const modeOfTraining = (form.elements.namedItem('pcrModeOfTraining') as HTMLSelectElement).value;
              const courseAdminEmail = (form.elements.namedItem('pcrAdminEmail') as HTMLInputElement).value.trim();
              const courseAppUrl = (form.elements.namedItem('pcrCourseAppUrl') as HTMLInputElement).value.trim();
              const vacancyCode = (form.elements.namedItem('pcrVacancyCode') as HTMLSelectElement).value;
              const vacancyDesc = (form.elements.namedItem('pcrVacancyCode') as HTMLSelectElement).selectedOptions[0]?.textContent?.split(' - ')[1] || '';
              const sessStartDate = (form.elements.namedItem('pcrSessStartDate') as HTMLInputElement).value.trim();
              const sessEndDate = (form.elements.namedItem('pcrSessEndDate') as HTMLInputElement).value.trim();
              const sessStartTime = (form.elements.namedItem('pcrSessStartTime') as HTMLInputElement).value.trim();
              const sessEndTime = (form.elements.namedItem('pcrSessEndTime') as HTMLInputElement).value.trim();
              const sessModeOfTraining = (form.elements.namedItem('pcrSessModeOfTraining') as HTMLSelectElement).value;
              const trainerName = (form.elements.namedItem('pcrTrainerName') as HTMLInputElement).value.trim();
              const trainerEmail = (form.elements.namedItem('pcrTrainerEmail') as HTMLInputElement).value.trim();
              const trainerIdNumber = (form.elements.namedItem('pcrTrainerIdNumber') as HTMLInputElement).value.trim();
              const trainerIdTypeCode = (form.elements.namedItem('pcrTrainerIdType') as HTMLSelectElement).value;
              const trainerIdTypeDesc = (form.elements.namedItem('pcrTrainerIdType') as HTMLSelectElement).selectedOptions[0]?.textContent?.split(' - ')[1] || '';

              if (!courseRefNo || !uen) return;

              const body: PublishCourseRunRequest = {
                course: {
                  courseReferenceNumber: courseRefNo,
                  trainingProvider: { uen },
                  runs: [
                    {
                      sequenceNumber: 0,
                      registrationDates: {
                        opening: parseInt(regOpening.replace(/-/g, ''), 10) || 20191022,
                        closing: parseInt(regClosing.replace(/-/g, ''), 10) || 20191025,
                      },
                      courseDates: {
                        start: parseInt(courseStart.replace(/-/g, ''), 10) || 20191101,
                        end: parseInt(courseEnd.replace(/-/g, ''), 10) || 20191105,
                      },
                      scheduleInfoType: { code: scheduleInfoTypeCode || '01', description: scheduleInfoTypeDesc || 'Description' },
                      scheduleInfo: scheduleInfo || 'Sat / 5 Sats / 9am - 6pm',
                      venue: {
                        block: venueBlock, street: venueStreet, floor: venueFloor, unit: venueUnit,
                        building: venueBuilding, postalCode: venuePostalCode, room: venueRoom,
                        wheelChairAccess: venueWheelchair,
                      },
                      intakeSize,
                      threshold,
                      registeredUserCount,
                      modeOfTraining,
                      courseAdminEmail,
                      toAppendCourseApplicationURL: !!courseAppUrl,
                      courseApplicationUrl: courseAppUrl,
                      courseVacancy: { code: vacancyCode, description: vacancyDesc },
                      notShownToPublic: false,
                      file: null,
                      sessions: [
                        {
                          startDate: sessStartDate.replace(/-/g, '') || '20190814',
                          endDate: sessEndDate.replace(/-/g, '') || '20190814',
                          startTime: sessStartTime || '15:30',
                          endTime: sessEndTime || '17:30',
                          modeOfTraining: sessModeOfTraining,
                          venue: {
                            block: venueBlock, street: venueStreet, floor: venueFloor, unit: venueUnit,
                            building: venueBuilding, postalCode: venuePostalCode, room: venueRoom,
                            wheelChairAccess: venueWheelchair, primaryVenue: false,
                          },
                        },
                      ],
                      linkCourseRunTrainer: trainerName ? [
                        {
                          trainer: {
                            trainerType: { code: '2', description: 'New' },
                            indexNumber: 0,
                            id: '',
                            name: trainerName,
                            email: trainerEmail,
                            idNumber: trainerIdNumber,
                            idType: { code: trainerIdTypeCode, description: trainerIdTypeDesc },
                            roles: [{ role: { id: 1, description: 'Trainer' } }],
                            inTrainingProviderProfile: true,
                            domainAreaOfPractice: '',
                            experience: '',
                            linkedInURL: '',
                            salutationId: 1,
                            photo: null,
                          },
                        },
                      ] : [],
                    },
                  ],
                },
              };
              handlePublishCourseRun(body, includeExpired);
            }}
          >
            <h3 style={{ gridColumn: '1 / -1', margin: '8px 0 0' }}>Course</h3>
            <div className="search-input-group">
              <label htmlFor="pcrCourseRefNo">Course Reference Number (required)</label>
              <input id="pcrCourseRefNo" name="pcrCourseRefNo" type="text" defaultValue="XX-201200696W-01-TEST 166" disabled={publishCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="pcrUen">Training Provider UEN (required)</label>
              <input id="pcrUen" name="pcrUen" type="text" defaultValue="201200696W" disabled={publishCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="pcrIncludeExpired">
                <input id="pcrIncludeExpired" name="pcrIncludeExpired" type="checkbox" defaultChecked disabled={publishCourseRunApi.loading} />
                {' '}Include Expired Courses
              </label>
            </div>

            <h3 style={{ gridColumn: '1 / -1', margin: '16px 0 0' }}>Registration &amp; Course Dates</h3>
            <div className="search-input-group">
              <label htmlFor="pcrRegOpening">Registration Opening (YYYYMMDD)</label>
              <input id="pcrRegOpening" name="pcrRegOpening" type="text" defaultValue="20191022" disabled={publishCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="pcrRegClosing">Registration Closing (YYYYMMDD)</label>
              <input id="pcrRegClosing" name="pcrRegClosing" type="text" defaultValue="20191025" disabled={publishCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="pcrCourseStart">Course Start (YYYYMMDD)</label>
              <input id="pcrCourseStart" name="pcrCourseStart" type="text" defaultValue="20191101" disabled={publishCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="pcrCourseEnd">Course End (YYYYMMDD)</label>
              <input id="pcrCourseEnd" name="pcrCourseEnd" type="text" defaultValue="20191105" disabled={publishCourseRunApi.loading} />
            </div>

            <h3 style={{ gridColumn: '1 / -1', margin: '16px 0 0' }}>Schedule</h3>
            <div className="search-input-group">
              <label htmlFor="pcrSchedTypeCode">Schedule Info Type Code</label>
              <input id="pcrSchedTypeCode" name="pcrSchedTypeCode" type="text" defaultValue="01" disabled={publishCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="pcrSchedTypeDesc">Schedule Info Type Description</label>
              <input id="pcrSchedTypeDesc" name="pcrSchedTypeDesc" type="text" defaultValue="Weekday Afternoon" disabled={publishCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="pcrSchedInfo">Schedule Info</label>
              <input id="pcrSchedInfo" name="pcrSchedInfo" type="text" defaultValue="Sat / 5 Sats / 9am - 6pm" disabled={publishCourseRunApi.loading} />
            </div>

            <h3 style={{ gridColumn: '1 / -1', margin: '16px 0 0' }}>Venue</h3>
            <div className="search-input-group">
              <label htmlFor="pcrVenueBlock">Block</label>
              <input id="pcrVenueBlock" name="pcrVenueBlock" type="text" defaultValue="112A" disabled={publishCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="pcrVenueStreet">Street</label>
              <input id="pcrVenueStreet" name="pcrVenueStreet" type="text" defaultValue="Bukit Batok Street 22" disabled={publishCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="pcrVenueFloor">Floor</label>
              <input id="pcrVenueFloor" name="pcrVenueFloor" type="text" defaultValue="15" disabled={publishCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="pcrVenueUnit">Unit</label>
              <input id="pcrVenueUnit" name="pcrVenueUnit" type="text" defaultValue="001" disabled={publishCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="pcrVenueBuilding">Building</label>
              <input id="pcrVenueBuilding" name="pcrVenueBuilding" type="text" defaultValue="Tertiary Infotech Academy" disabled={publishCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="pcrVenuePostal">Postal Code</label>
              <input id="pcrVenuePostal" name="pcrVenuePostal" type="text" defaultValue="659581" disabled={publishCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="pcrVenueRoom">Room</label>
              <input id="pcrVenueRoom" name="pcrVenueRoom" type="text" defaultValue="24" disabled={publishCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="pcrVenueWheelchair">
                <input id="pcrVenueWheelchair" name="pcrVenueWheelchair" type="checkbox" defaultChecked disabled={publishCourseRunApi.loading} />
                {' '}Wheelchair Access
              </label>
            </div>

            <h3 style={{ gridColumn: '1 / -1', margin: '16px 0 0' }}>Course Run Details</h3>
            <div className="search-input-group">
              <label htmlFor="pcrIntakeSize">Intake Size</label>
              <input id="pcrIntakeSize" name="pcrIntakeSize" type="number" defaultValue="50" disabled={publishCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="pcrThreshold">Threshold</label>
              <input id="pcrThreshold" name="pcrThreshold" type="number" defaultValue="10" disabled={publishCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="pcrRegUserCount">Registered User Count</label>
              <input id="pcrRegUserCount" name="pcrRegUserCount" type="number" defaultValue="50" disabled={publishCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="pcrModeOfTraining">Mode of Training</label>
              <select id="pcrModeOfTraining" name="pcrModeOfTraining" defaultValue="1" disabled={publishCourseRunApi.loading}>
                <option value="1">1 - Classroom</option>
                <option value="2">2 - Asynchronous eLearning</option>
                <option value="3">3 - In-house</option>
                <option value="4">4 - On-the-Job</option>
                <option value="5">5 - Practical / Practicum</option>
                <option value="6">6 - Supervised Field</option>
                <option value="7">7 - Traineeship</option>
                <option value="8">8 - Assessment</option>
                <option value="9">9 - Synchronous eLearning</option>
              </select>
            </div>
            <div className="search-input-group">
              <label htmlFor="pcrAdminEmail">Course Admin Email</label>
              <input id="pcrAdminEmail" name="pcrAdminEmail" type="email" defaultValue="admin@tertiary.edu.sg" disabled={publishCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="pcrCourseAppUrl">Course Application URL</label>
              <input id="pcrCourseAppUrl" name="pcrCourseAppUrl" type="text" defaultValue="https://course-application.com" disabled={publishCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="pcrVacancyCode">Course Vacancy</label>
              <select id="pcrVacancyCode" name="pcrVacancyCode" defaultValue="L" disabled={publishCourseRunApi.loading}>
                <option value="A">A - Available</option>
                <option value="F">F - Full</option>
                <option value="L">L - Limited Vacancy</option>
              </select>
            </div>

            <h3 style={{ gridColumn: '1 / -1', margin: '16px 0 0' }}>Session</h3>
            <div className="search-input-group">
              <label htmlFor="pcrSessStartDate">Session Start Date (YYYYMMDD)</label>
              <input id="pcrSessStartDate" name="pcrSessStartDate" type="text" defaultValue="20190814" disabled={publishCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="pcrSessEndDate">Session End Date (YYYYMMDD)</label>
              <input id="pcrSessEndDate" name="pcrSessEndDate" type="text" defaultValue="20190814" disabled={publishCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="pcrSessStartTime">Session Start Time (HH:mm)</label>
              <input id="pcrSessStartTime" name="pcrSessStartTime" type="text" defaultValue="15:30" disabled={publishCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="pcrSessEndTime">Session End Time (HH:mm)</label>
              <input id="pcrSessEndTime" name="pcrSessEndTime" type="text" defaultValue="17:30" disabled={publishCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="pcrSessModeOfTraining">Session Mode of Training</label>
              <select id="pcrSessModeOfTraining" name="pcrSessModeOfTraining" defaultValue="1" disabled={publishCourseRunApi.loading}>
                <option value="1">1 - Classroom</option>
                <option value="2">2 - Asynchronous eLearning</option>
                <option value="3">3 - In-house</option>
                <option value="4">4 - On-the-Job</option>
                <option value="5">5 - Practical / Practicum</option>
                <option value="6">6 - Supervised Field</option>
                <option value="7">7 - Traineeship</option>
                <option value="8">8 - Assessment</option>
                <option value="9">9 - Synchronous eLearning</option>
              </select>
            </div>

            <h3 style={{ gridColumn: '1 / -1', margin: '16px 0 0' }}>Trainer (optional)</h3>
            <div className="search-input-group">
              <label htmlFor="pcrTrainerName">Trainer Name</label>
              <input id="pcrTrainerName" name="pcrTrainerName" type="text" defaultValue="Ahmad Rahman" disabled={publishCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="pcrTrainerEmail">Trainer Email</label>
              <input id="pcrTrainerEmail" name="pcrTrainerEmail" type="email" defaultValue="trainer@tertiary.edu.sg" disabled={publishCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="pcrTrainerIdNumber">Trainer ID Number</label>
              <input id="pcrTrainerIdNumber" name="pcrTrainerIdNumber" type="text" defaultValue="S3158356Z" disabled={publishCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="pcrTrainerIdType">Trainer ID Type</label>
              <select id="pcrTrainerIdType" name="pcrTrainerIdType" defaultValue="SP" disabled={publishCourseRunApi.loading}>
                <option value="SB">SB - Singapore Blue Identification Card</option>
                <option value="SP">SP - Singapore Pink Identification Card</option>
                <option value="SO">SO - Fin/Work Permit</option>
                <option value="OT">OT - Others</option>
              </select>
            </div>

            <div className="search-options" style={{ gridColumn: '1 / -1' }}>
              <span />
              <button type="submit" disabled={publishCourseRunApi.loading}>
                {publishCourseRunApi.loading ? 'Publishing...' : 'Publish Course Run'}
              </button>
            </div>
          </form>

          {publishCourseRunApi.error && <div className="error-alert">{publishCourseRunApi.error}</div>}
          {publishCourseRunApi.loading && <div className="loading">Publishing course run...</div>}
          {publishCourseRunApi.data && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <h3>Response</h3>
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 13 }}>
                {JSON.stringify(publishCourseRunApi.data, null, 2)}
              </pre>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'edit-course-run') {
      return (
        <>
          <h2 className="page-title">Update / Delete Course Run with Sessions</h2>
          <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>
            POST to production API — certificate first, OAuth fallback. Set action to &quot;update&quot; or &quot;delete&quot; for the run and each session.
          </p>
          <form
            className="search-form"
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const runId = (form.elements.namedItem('ecrRunId') as HTMLInputElement).value.trim();
              const courseRefNo = (form.elements.namedItem('ecrCourseRefNo') as HTMLInputElement).value.trim();
              const uen = (form.elements.namedItem('ecrUen') as HTMLInputElement).value.trim();
              const includeExpired = (form.elements.namedItem('ecrIncludeExpired') as HTMLInputElement).checked;
              const runAction = (form.elements.namedItem('ecrRunAction') as HTMLSelectElement).value as 'update' | 'delete';
              const regOpening = (form.elements.namedItem('ecrRegOpening') as HTMLInputElement).value.trim();
              const regClosing = (form.elements.namedItem('ecrRegClosing') as HTMLInputElement).value.trim();
              const courseStart = (form.elements.namedItem('ecrCourseStart') as HTMLInputElement).value.trim();
              const courseEnd = (form.elements.namedItem('ecrCourseEnd') as HTMLInputElement).value.trim();
              const scheduleInfoTypeCode = (form.elements.namedItem('ecrSchedTypeCode') as HTMLInputElement).value.trim();
              const scheduleInfoTypeDesc = (form.elements.namedItem('ecrSchedTypeDesc') as HTMLInputElement).value.trim();
              const scheduleInfo = (form.elements.namedItem('ecrSchedInfo') as HTMLInputElement).value.trim();
              const venueBlock = (form.elements.namedItem('ecrVenueBlock') as HTMLInputElement).value.trim();
              const venueStreet = (form.elements.namedItem('ecrVenueStreet') as HTMLInputElement).value.trim();
              const venueFloor = (form.elements.namedItem('ecrVenueFloor') as HTMLInputElement).value.trim();
              const venueUnit = (form.elements.namedItem('ecrVenueUnit') as HTMLInputElement).value.trim();
              const venueBuilding = (form.elements.namedItem('ecrVenueBuilding') as HTMLInputElement).value.trim();
              const venuePostalCode = (form.elements.namedItem('ecrVenuePostal') as HTMLInputElement).value.trim();
              const venueRoom = (form.elements.namedItem('ecrVenueRoom') as HTMLInputElement).value.trim();
              const venueWheelchair = (form.elements.namedItem('ecrVenueWheelchair') as HTMLInputElement).checked;
              const intakeSize = parseInt((form.elements.namedItem('ecrIntakeSize') as HTMLInputElement).value.trim(), 10) || 50;
              const threshold = parseInt((form.elements.namedItem('ecrThreshold') as HTMLInputElement).value.trim(), 10) || 10;
              const registeredUserCount = parseInt((form.elements.namedItem('ecrRegUserCount') as HTMLInputElement).value.trim(), 10) || 10;
              const modeOfTraining = (form.elements.namedItem('ecrModeOfTraining') as HTMLSelectElement).value;
              const courseAdminEmail = (form.elements.namedItem('ecrAdminEmail') as HTMLInputElement).value.trim();
              const courseAppUrl = (form.elements.namedItem('ecrCourseAppUrl') as HTMLInputElement).value.trim();
              const vacancyCode = (form.elements.namedItem('ecrVacancyCode') as HTMLSelectElement).value;
              const vacancyDesc = (form.elements.namedItem('ecrVacancyCode') as HTMLSelectElement).selectedOptions[0]?.textContent?.split(' - ')[1] || '';
              const sessAction = (form.elements.namedItem('ecrSessAction') as HTMLSelectElement).value as 'update' | 'delete';
              const sessSessionId = (form.elements.namedItem('ecrSessSessionId') as HTMLInputElement).value.trim();
              const sessStartDate = (form.elements.namedItem('ecrSessStartDate') as HTMLInputElement).value.trim();
              const sessEndDate = (form.elements.namedItem('ecrSessEndDate') as HTMLInputElement).value.trim();
              const sessStartTime = (form.elements.namedItem('ecrSessStartTime') as HTMLInputElement).value.trim();
              const sessEndTime = (form.elements.namedItem('ecrSessEndTime') as HTMLInputElement).value.trim();
              const sessModeOfTraining = (form.elements.namedItem('ecrSessModeOfTraining') as HTMLSelectElement).value;
              const trainerName = (form.elements.namedItem('ecrTrainerName') as HTMLInputElement).value.trim();
              const trainerEmail = (form.elements.namedItem('ecrTrainerEmail') as HTMLInputElement).value.trim();
              const trainerIdNumber = (form.elements.namedItem('ecrTrainerIdNumber') as HTMLInputElement).value.trim();
              const trainerIdTypeCode = (form.elements.namedItem('ecrTrainerIdType') as HTMLSelectElement).value;
              const trainerIdTypeDesc = (form.elements.namedItem('ecrTrainerIdType') as HTMLSelectElement).selectedOptions[0]?.textContent?.split(' - ')[1] || '';

              if (!runId || !courseRefNo || !uen) return;

              const body: EditCourseRunRequest = {
                course: {
                  courseReferenceNumber: courseRefNo,
                  trainingProvider: { uen },
                  run: {
                    action: runAction,
                    sequenceNumber: 0,
                    registrationDates: {
                      opening: parseInt(regOpening.replace(/-/g, ''), 10) || 20191022,
                      closing: parseInt(regClosing.replace(/-/g, ''), 10) || 20191025,
                    },
                    courseDates: {
                      start: parseInt(courseStart.replace(/-/g, ''), 10) || 20191101,
                      end: courseEnd || '20191105',
                    },
                    scheduleInfoType: { code: scheduleInfoTypeCode || '01', description: scheduleInfoTypeDesc || 'Description' },
                    scheduleInfo: scheduleInfo || 'Sat / 5 Sats / 9am - 6pm',
                    venue: {
                      block: venueBlock, street: venueStreet, floor: venueFloor, unit: venueUnit,
                      building: venueBuilding, postalCode: venuePostalCode, room: venueRoom,
                      wheelChairAccess: venueWheelchair,
                    },
                    intakeSize,
                    threshold,
                    registeredUserCount,
                    modeOfTraining,
                    courseAdminEmail,
                    toAppendCourseApplicationURL: !!courseAppUrl,
                    courseApplicationUrl: courseAppUrl,
                    courseVacancy: { code: vacancyCode, description: vacancyDesc },
                    notShownToPublic: false,
                    file: null,
                    sessions: [
                      {
                        action: sessAction,
                        sessionId: sessSessionId,
                        startDate: sessStartDate.replace(/-/g, '') || '20190814',
                        endDate: sessEndDate.replace(/-/g, '') || '20190814',
                        startTime: sessStartTime || '15:30:00',
                        endTime: sessEndTime || '17:30:00',
                        modeOfTraining: sessModeOfTraining,
                        venue: {
                          block: venueBlock, street: venueStreet, floor: venueFloor, unit: venueUnit,
                          building: venueBuilding, postalCode: venuePostalCode, room: venueRoom,
                          wheelChairAccess: venueWheelchair, primaryVenue: false,
                        },
                      },
                    ],
                    linkCourseRunTrainer: trainerName ? [
                      {
                        trainer: {
                          trainerType: { code: '2', description: 'New' },
                          indexNumber: 0,
                          id: '',
                          name: trainerName,
                          email: trainerEmail,
                          idNumber: trainerIdNumber,
                          idType: { code: trainerIdTypeCode, description: trainerIdTypeDesc },
                          roles: [{ role: { id: 1, description: 'Trainer' } }],
                          inTrainingProviderProfile: true,
                          domainAreaOfPractice: '',
                          experience: '',
                          linkedInURL: '',
                          salutationId: 1,
                          photo: null,
                        },
                      },
                    ] : [],
                  },
                },
              };
              handleEditCourseRun(runId, body, includeExpired);
            }}
          >
            <h3 style={{ gridColumn: '1 / -1', margin: '8px 0 0' }}>Course Run</h3>
            <div className="search-input-group">
              <label htmlFor="ecrRunId">Course Run ID (required)</label>
              <input id="ecrRunId" name="ecrRunId" type="text" defaultValue="1001000" disabled={editCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="ecrCourseRefNo">Course Reference Number (required)</label>
              <input id="ecrCourseRefNo" name="ecrCourseRefNo" type="text" defaultValue="XX-201200696W-01-TEST 166" disabled={editCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="ecrUen">Training Provider UEN (required)</label>
              <input id="ecrUen" name="ecrUen" type="text" defaultValue="201200696W" disabled={editCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="ecrRunAction">Run Action</label>
              <select id="ecrRunAction" name="ecrRunAction" defaultValue="update" disabled={editCourseRunApi.loading}>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
              </select>
            </div>
            <div className="search-input-group">
              <label htmlFor="ecrIncludeExpired">
                <input id="ecrIncludeExpired" name="ecrIncludeExpired" type="checkbox" defaultChecked disabled={editCourseRunApi.loading} />
                {' '}Include Expired Courses
              </label>
            </div>

            <h3 style={{ gridColumn: '1 / -1', margin: '16px 0 0' }}>Registration &amp; Course Dates</h3>
            <div className="search-input-group">
              <label htmlFor="ecrRegOpening">Registration Opening (YYYYMMDD)</label>
              <input id="ecrRegOpening" name="ecrRegOpening" type="text" defaultValue="20191022" disabled={editCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="ecrRegClosing">Registration Closing (YYYYMMDD)</label>
              <input id="ecrRegClosing" name="ecrRegClosing" type="text" defaultValue="20191025" disabled={editCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="ecrCourseStart">Course Start (YYYYMMDD)</label>
              <input id="ecrCourseStart" name="ecrCourseStart" type="text" defaultValue="20191101" disabled={editCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="ecrCourseEnd">Course End (YYYYMMDD)</label>
              <input id="ecrCourseEnd" name="ecrCourseEnd" type="text" defaultValue="20191105" disabled={editCourseRunApi.loading} />
            </div>

            <h3 style={{ gridColumn: '1 / -1', margin: '16px 0 0' }}>Schedule</h3>
            <div className="search-input-group">
              <label htmlFor="ecrSchedTypeCode">Schedule Info Type Code</label>
              <input id="ecrSchedTypeCode" name="ecrSchedTypeCode" type="text" defaultValue="01" disabled={editCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="ecrSchedTypeDesc">Schedule Info Type Description</label>
              <input id="ecrSchedTypeDesc" name="ecrSchedTypeDesc" type="text" defaultValue="Weekday Afternoon" disabled={editCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="ecrSchedInfo">Schedule Info</label>
              <input id="ecrSchedInfo" name="ecrSchedInfo" type="text" defaultValue="Sat / 5 Sats / 9am - 6pm" disabled={editCourseRunApi.loading} />
            </div>

            <h3 style={{ gridColumn: '1 / -1', margin: '16px 0 0' }}>Venue</h3>
            <div className="search-input-group">
              <label htmlFor="ecrVenueBlock">Block</label>
              <input id="ecrVenueBlock" name="ecrVenueBlock" type="text" defaultValue="112A" disabled={editCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="ecrVenueStreet">Street</label>
              <input id="ecrVenueStreet" name="ecrVenueStreet" type="text" defaultValue="Bukit Batok Street 22" disabled={editCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="ecrVenueFloor">Floor</label>
              <input id="ecrVenueFloor" name="ecrVenueFloor" type="text" defaultValue="15" disabled={editCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="ecrVenueUnit">Unit</label>
              <input id="ecrVenueUnit" name="ecrVenueUnit" type="text" defaultValue="001" disabled={editCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="ecrVenueBuilding">Building</label>
              <input id="ecrVenueBuilding" name="ecrVenueBuilding" type="text" defaultValue="Tertiary Infotech Academy" disabled={editCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="ecrVenuePostal">Postal Code</label>
              <input id="ecrVenuePostal" name="ecrVenuePostal" type="text" defaultValue="659581" disabled={editCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="ecrVenueRoom">Room</label>
              <input id="ecrVenueRoom" name="ecrVenueRoom" type="text" defaultValue="24" disabled={editCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="ecrVenueWheelchair">
                <input id="ecrVenueWheelchair" name="ecrVenueWheelchair" type="checkbox" defaultChecked disabled={editCourseRunApi.loading} />
                {' '}Wheelchair Access
              </label>
            </div>

            <h3 style={{ gridColumn: '1 / -1', margin: '16px 0 0' }}>Course Run Details</h3>
            <div className="search-input-group">
              <label htmlFor="ecrIntakeSize">Intake Size</label>
              <input id="ecrIntakeSize" name="ecrIntakeSize" type="number" defaultValue="50" disabled={editCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="ecrThreshold">Threshold</label>
              <input id="ecrThreshold" name="ecrThreshold" type="number" defaultValue="10" disabled={editCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="ecrRegUserCount">Registered User Count</label>
              <input id="ecrRegUserCount" name="ecrRegUserCount" type="number" defaultValue="10" disabled={editCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="ecrModeOfTraining">Mode of Training</label>
              <select id="ecrModeOfTraining" name="ecrModeOfTraining" defaultValue="1" disabled={editCourseRunApi.loading}>
                <option value="1">1 - Classroom</option>
                <option value="2">2 - Asynchronous eLearning</option>
                <option value="3">3 - In-house</option>
                <option value="4">4 - On-the-Job</option>
                <option value="5">5 - Practical / Practicum</option>
                <option value="6">6 - Supervised Field</option>
                <option value="7">7 - Traineeship</option>
                <option value="8">8 - Assessment</option>
                <option value="9">9 - Synchronous eLearning</option>
              </select>
            </div>
            <div className="search-input-group">
              <label htmlFor="ecrAdminEmail">Course Admin Email</label>
              <input id="ecrAdminEmail" name="ecrAdminEmail" type="email" defaultValue="admin@tertiary.edu.sg" disabled={editCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="ecrCourseAppUrl">Course Application URL</label>
              <input id="ecrCourseAppUrl" name="ecrCourseAppUrl" type="text" defaultValue="https://course-application.com" disabled={editCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="ecrVacancyCode">Course Vacancy</label>
              <select id="ecrVacancyCode" name="ecrVacancyCode" defaultValue="L" disabled={editCourseRunApi.loading}>
                <option value="A">A - Available</option>
                <option value="F">F - Full</option>
                <option value="L">L - Limited Vacancy</option>
              </select>
            </div>

            <h3 style={{ gridColumn: '1 / -1', margin: '16px 0 0' }}>Session</h3>
            <div className="search-input-group">
              <label htmlFor="ecrSessAction">Session Action</label>
              <select id="ecrSessAction" name="ecrSessAction" defaultValue="update" disabled={editCourseRunApi.loading}>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
              </select>
            </div>
            <div className="search-input-group">
              <label htmlFor="ecrSessSessionId">Session ID</label>
              <input id="ecrSessSessionId" name="ecrSessSessionId" type="text" defaultValue="Fuchun 019-41618-S1" disabled={editCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="ecrSessStartDate">Session Start Date (YYYYMMDD)</label>
              <input id="ecrSessStartDate" name="ecrSessStartDate" type="text" defaultValue="20190814" disabled={editCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="ecrSessEndDate">Session End Date (YYYYMMDD)</label>
              <input id="ecrSessEndDate" name="ecrSessEndDate" type="text" defaultValue="20190814" disabled={editCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="ecrSessStartTime">Session Start Time (HH:mm:ss)</label>
              <input id="ecrSessStartTime" name="ecrSessStartTime" type="text" defaultValue="15:30:00" disabled={editCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="ecrSessEndTime">Session End Time (HH:mm:ss)</label>
              <input id="ecrSessEndTime" name="ecrSessEndTime" type="text" defaultValue="17:30:00" disabled={editCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="ecrSessModeOfTraining">Session Mode of Training</label>
              <select id="ecrSessModeOfTraining" name="ecrSessModeOfTraining" defaultValue="1" disabled={editCourseRunApi.loading}>
                <option value="1">1 - Classroom</option>
                <option value="2">2 - Asynchronous eLearning</option>
                <option value="3">3 - In-house</option>
                <option value="4">4 - On-the-Job</option>
                <option value="5">5 - Practical / Practicum</option>
                <option value="6">6 - Supervised Field</option>
                <option value="7">7 - Traineeship</option>
                <option value="8">8 - Assessment</option>
                <option value="9">9 - Synchronous eLearning</option>
              </select>
            </div>

            <h3 style={{ gridColumn: '1 / -1', margin: '16px 0 0' }}>Trainer (optional)</h3>
            <div className="search-input-group">
              <label htmlFor="ecrTrainerName">Trainer Name</label>
              <input id="ecrTrainerName" name="ecrTrainerName" type="text" defaultValue="Ahmad Rahman" disabled={editCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="ecrTrainerEmail">Trainer Email</label>
              <input id="ecrTrainerEmail" name="ecrTrainerEmail" type="email" defaultValue="trainer@tertiary.edu.sg" disabled={editCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="ecrTrainerIdNumber">Trainer ID Number</label>
              <input id="ecrTrainerIdNumber" name="ecrTrainerIdNumber" type="text" defaultValue="S3158356Z" disabled={editCourseRunApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="ecrTrainerIdType">Trainer ID Type</label>
              <select id="ecrTrainerIdType" name="ecrTrainerIdType" defaultValue="SP" disabled={editCourseRunApi.loading}>
                <option value="SB">SB - Singapore Blue Identification Card</option>
                <option value="SP">SP - Singapore Pink Identification Card</option>
                <option value="SO">SO - Fin/Work Permit</option>
                <option value="OT">OT - Others</option>
              </select>
            </div>

            <div className="search-options" style={{ gridColumn: '1 / -1' }}>
              <span />
              <button type="submit" disabled={editCourseRunApi.loading}>
                {editCourseRunApi.loading ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>

          {editCourseRunApi.error && <div className="error-alert">{editCourseRunApi.error}</div>}
          {editCourseRunApi.loading && <div className="loading">Submitting course run update...</div>}
          {editCourseRunApi.data && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <h3>Response</h3>
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 13 }}>
                {JSON.stringify(editCourseRunApi.data, null, 2)}
              </pre>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'course-run-by-id') {
      return (
        <>
          <h2 className="page-title">Retrieve Course Run by ID</h2>
          <form
            className="search-form"
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const runId = (form.elements.namedItem('crbRunId') as HTMLInputElement).value.trim();
              const includeExpired = (form.elements.namedItem('crbIncludeExpired') as HTMLInputElement).checked;
              if (runId) handleCourseRunById(runId, includeExpired);
            }}
          >
            <div className="search-input-group">
              <label htmlFor="crbRunId">Course Run ID (required)</label>
              <input id="crbRunId" name="crbRunId" type="text" defaultValue="1234567" placeholder="e.g. 1234567" disabled={courseRunByIdApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="crbIncludeExpired">
                <input id="crbIncludeExpired" name="crbIncludeExpired" type="checkbox" defaultChecked disabled={courseRunByIdApi.loading} />
                {' '}Include Expired Courses
              </label>
            </div>
            <div className="search-options">
              <span />
              <button type="submit" disabled={courseRunByIdApi.loading}>
                {courseRunByIdApi.loading ? 'Loading...' : 'Retrieve Course Run'}
              </button>
            </div>
          </form>

          {courseRunByIdApi.error && <div className="error-alert">{courseRunByIdApi.error}</div>}
          {courseRunByIdApi.loading && <div className="loading">Loading course run...</div>}
          {courseRunByIdApi.data && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <h3>Response</h3>
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 13 }}>
                {JSON.stringify(courseRunByIdApi.data, null, 2)}
              </pre>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'course-runs-by-ref') {
      return (
        <>
          <h2 className="page-title">Course Runs by Reference Number</h2>
          <form
            className="search-form"
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const courseReferenceNumber = (form.elements.namedItem('crrCourseRef') as HTMLInputElement).value.trim();
              const uen = (form.elements.namedItem('crrUen') as HTMLInputElement).value.trim();
              const tpCode = (form.elements.namedItem('crrTpCode') as HTMLInputElement).value.trim();
              const courseRunStartDate = (form.elements.namedItem('crrStartDate') as HTMLInputElement).value.trim();
              const ps = parseInt((form.elements.namedItem('crrPageSize') as HTMLInputElement).value.trim(), 10) || 20;
              const pg = parseInt((form.elements.namedItem('crrPage') as HTMLInputElement).value.trim(), 10) || 0;
              const includeExpired = (form.elements.namedItem('crrIncludeExpired') as HTMLInputElement).checked;
              if (courseReferenceNumber) {
                handleCourseRunsByRef({
                  courseReferenceNumber,
                  uen: uen || undefined,
                  tpCode: tpCode || undefined,
                  courseRunStartDate: courseRunStartDate || undefined,
                  pageSize: ps,
                  page: pg,
                  includeExpiredCourses: includeExpired,
                });
              }
            }}
          >
            <div className="search-input-group">
              <label htmlFor="crrCourseRef">Course Reference Number (required)</label>
              <input id="crrCourseRef" name="crrCourseRef" type="text" defaultValue="TGS-2020505444" placeholder="e.g. TGS-2020505444" disabled={courseRunsByRefApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="crrUen">UEN (optional)</label>
              <input id="crrUen" name="crrUen" type="text" placeholder="e.g. Txxxxxxx01" disabled={courseRunsByRefApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="crrTpCode">TP Code (optional)</label>
              <input id="crrTpCode" name="crrTpCode" type="text" placeholder="e.g. 190000032G-01" disabled={courseRunsByRefApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="crrStartDate">Course Run Start Date (optional, YYYYMMDD)</label>
              <input id="crrStartDate" name="crrStartDate" type="text" placeholder="e.g. 20210408" disabled={courseRunsByRefApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="crrPageSize">Page Size</label>
              <input id="crrPageSize" name="crrPageSize" type="number" defaultValue="20" min="1" max="100" disabled={courseRunsByRefApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="crrPage">Page (0-indexed)</label>
              <input id="crrPage" name="crrPage" type="number" defaultValue="0" min="0" disabled={courseRunsByRefApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="crrIncludeExpired">
                <input id="crrIncludeExpired" name="crrIncludeExpired" type="checkbox" defaultChecked disabled={courseRunsByRefApi.loading} />
                {' '}Include Expired Courses
              </label>
            </div>
            <div className="search-options">
              <span />
              <button type="submit" disabled={courseRunsByRefApi.loading}>
                {courseRunsByRefApi.loading ? 'Loading...' : 'Retrieve Course Runs'}
              </button>
            </div>
          </form>

          {courseRunsByRefApi.error && <div className="error-alert">{courseRunsByRefApi.error}</div>}
          {courseRunsByRefApi.loading && <div className="loading">Loading course runs...</div>}
          {courseRunsByRefApi.data && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 12, color: '#666', fontSize: 14 }}>
                Found {courseRunsByRefApi.data.meta?.total ?? 0} course run(s)
              </div>
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 13 }}>
                {JSON.stringify(courseRunsByRefApi.data, null, 2)}
              </pre>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'upload-attendance') {
      return (
        <>
          <h2 className="page-title">Upload Course Session Attendance</h2>
          <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>
            POST to production API (api.ssg-wsg.sg) with mTLS certificate + AES-256 payload encryption.
          </p>
          <form
            className="search-form"
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const runId = (form.elements.namedItem('uplRunId') as HTMLInputElement).value.trim();
              const uen = (form.elements.namedItem('uplUen') as HTMLInputElement).value.trim();
              const sessionID = (form.elements.namedItem('uplSessionId') as HTMLInputElement).value.trim();
              const corppassId = (form.elements.namedItem('uplCorppassId') as HTMLInputElement).value.trim();
              const referenceNumber = (form.elements.namedItem('uplRefNo') as HTMLInputElement).value.trim();
              const statusCode = (form.elements.namedItem('uplStatusCode') as HTMLInputElement).value.trim();
              const traineeId = (form.elements.namedItem('uplTraineeId') as HTMLInputElement).value.trim();
              const traineeName = (form.elements.namedItem('uplTraineeName') as HTMLInputElement).value.trim();
              const traineeEmail = (form.elements.namedItem('uplTraineeEmail') as HTMLInputElement).value.trim();
              const idTypeCode = (form.elements.namedItem('uplIdType') as HTMLInputElement).value.trim();
              const mobile = (form.elements.namedItem('uplMobile') as HTMLInputElement).value.trim();
              const countryCode = parseInt((form.elements.namedItem('uplCountryCode') as HTMLInputElement).value.trim(), 10) || 65;
              const numberOfHours = parseFloat((form.elements.namedItem('uplHours') as HTMLInputElement).value.trim()) || 0;
              const surveyLangCode = (form.elements.namedItem('uplSurveyLang') as HTMLInputElement).value.trim();

              if (!runId || !uen || !sessionID || !corppassId || !referenceNumber || !traineeId || !traineeName) return;

              const body: UploadAttendanceRequest = {
                uen,
                course: {
                  sessionID,
                  attendance: {
                    status: { code: statusCode || '1' },
                    trainee: {
                      id: traineeId,
                      name: traineeName,
                      email: traineeEmail,
                      idType: { code: idTypeCode || 'SB' },
                      contactNumber: {
                        mobile,
                        areaCode: null,
                        countryCode,
                      },
                      numberOfHours,
                      surveyLanguage: { code: surveyLangCode || 'EL' },
                    },
                  },
                  referenceNumber,
                },
                corppassId,
              };
              handleUploadAttendance(runId, body);
            }}
          >
            <div className="search-input-group">
              <label htmlFor="uplRunId">Course Run ID (required)</label>
              <input id="uplRunId" name="uplRunId" type="text" defaultValue="4161800" disabled={uploadAttendanceApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="uplUen">UEN (required)</label>
              <input id="uplUen" name="uplUen" type="text" defaultValue="201200696W" placeholder="e.g. 201200696W" disabled={uploadAttendanceApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="uplSessionId">Session ID (required)</label>
              <input id="uplSessionId" name="uplSessionId" type="text" defaultValue="TEST 166-4161800-S1" disabled={uploadAttendanceApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="uplRefNo">Course Reference Number (required)</label>
              <input id="uplRefNo" name="uplRefNo" type="text" defaultValue="XX-201200696W-01-TEST 166" disabled={uploadAttendanceApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="uplCorppassId">Corppass ID (required)</label>
              <input id="uplCorppassId" name="uplCorppassId" type="text" defaultValue="S9876543A" disabled={uploadAttendanceApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="uplStatusCode">Attendance Status Code</label>
              <select id="uplStatusCode" name="uplStatusCode" defaultValue="1" disabled={uploadAttendanceApi.loading}>
                <option value="1">1 - Confirmed</option>
                <option value="2">2 - Unconfirmed</option>
                <option value="3">3 - Rejected</option>
                <option value="4">4 - TP Voided</option>
              </select>
            </div>
            <div className="search-input-group">
              <label htmlFor="uplTraineeId">Trainee ID (required)</label>
              <input id="uplTraineeId" name="uplTraineeId" type="text" defaultValue="S0118316H" disabled={uploadAttendanceApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="uplTraineeName">Trainee Name (required)</label>
              <input id="uplTraineeName" name="uplTraineeName" type="text" defaultValue="Jon Chua" disabled={uploadAttendanceApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="uplTraineeEmail">Trainee Email</label>
              <input id="uplTraineeEmail" name="uplTraineeEmail" type="email" defaultValue="trainer@tertiary.edu.sg" disabled={uploadAttendanceApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="uplIdType">ID Type Code</label>
              <select id="uplIdType" name="uplIdType" defaultValue="SB" disabled={uploadAttendanceApi.loading}>
                <option value="SB">SB - Singapore Blue IC</option>
                <option value="SP">SP - Singapore Pink IC</option>
                <option value="SO">SO - Fin/Work Permit</option>
                <option value="OT">OT - Others</option>
              </select>
            </div>
            <div className="search-input-group">
              <label htmlFor="uplCountryCode">Country Code</label>
              <input id="uplCountryCode" name="uplCountryCode" type="number" defaultValue="65" disabled={uploadAttendanceApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="uplMobile">Mobile Number</label>
              <input id="uplMobile" name="uplMobile" type="text" defaultValue="91234567" disabled={uploadAttendanceApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="uplHours">Number of Hours</label>
              <input id="uplHours" name="uplHours" type="number" step="0.5" defaultValue="3.5" disabled={uploadAttendanceApi.loading} />
            </div>
            <div className="search-input-group">
              <label htmlFor="uplSurveyLang">Survey Language</label>
              <select id="uplSurveyLang" name="uplSurveyLang" defaultValue="EL" disabled={uploadAttendanceApi.loading}>
                <option value="EL">EL - English</option>
                <option value="MN">MN - Mandarin</option>
                <option value="ML">ML - Malay</option>
                <option value="TM">TM - Tamil</option>
              </select>
            </div>
            <div className="search-options">
              <span />
              <button type="submit" disabled={uploadAttendanceApi.loading}>
                {uploadAttendanceApi.loading ? 'Uploading...' : 'Upload Attendance'}
              </button>
            </div>
          </form>

          {uploadAttendanceApi.error && <div className="error-alert">{uploadAttendanceApi.error}</div>}
          {uploadAttendanceApi.loading && <div className="loading">Uploading attendance...</div>}
          {uploadAttendanceApi.data && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <h3>Upload Response</h3>
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 13 }}>
                {JSON.stringify(uploadAttendanceApi.data, null, 2)}
              </pre>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'grant-baseline') {
      return (
        <>
          <h2 className="page-title">Grant Calculator — Baseline Scheme</h2>
          <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>
            Calculate baseline grant amounts for courses. POST to <code>/grantCalculators/individual</code> (v3.0).
          </p>
          <form className="course-result" autoComplete="off" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const courses = (fd.get('courses') as string).split('\n').filter(Boolean).map(line => {
              const [trainingPartnerUen, courseReferenceNumber] = line.split(',').map(s => s.trim());
              return { trainingPartnerUen, courseReferenceNumber };
            });
            handleGrantBaseline(courses);
          }}>
            <div className="form-group">
              <label htmlFor="gbCourses">Courses (one per line: UEN, CourseRefNo)</label>
              <textarea id="gbCourses" name="courses" rows={3} defaultValue="201200696W, TGS-2020505444" disabled={grantBaselineApi.loading} style={{ width: '100%', fontFamily: 'monospace', padding: 8 }} />
            </div>
            <div style={{ marginTop: 12 }}>
              <button type="submit" disabled={grantBaselineApi.loading}>
                {grantBaselineApi.loading ? 'Calculating...' : 'Calculate Baseline Grant'}
              </button>
            </div>
          </form>
          {grantBaselineApi.error && <div className="error-alert">{grantBaselineApi.error}</div>}
          {grantBaselineApi.loading && <div className="loading">Calculating grant...</div>}
          {grantBaselineApi.data && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <h3>Grant Calculator Response</h3>
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 500, fontSize: 13 }}>
                {JSON.stringify(grantBaselineApi.data, null, 2)}
              </pre>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'grant-personalised') {
      return (
        <>
          <h2 className="page-title">Grant Calculator — Personalised</h2>
          <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>
            Calculate personalised grant amounts based on trainee profile. POST to <code>/grantCalculators/individual/personalised</code> (v3.0).
          </p>
          <form className="course-result" autoComplete="off" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            handleGrantPersonalised({
              courses: [{
                trainingPartnerUen: fd.get('tpUen') as string,
                courseReferenceNumber: fd.get('courseRef') as string,
              }],
              applicant: {
                sme: fd.get('sme') as string,
                nric: fd.get('nric') as string,
                nricType: fd.get('nricType') as string,
                employerSponsored: fd.get('employerSponsored') as string,
              },
              course: {
                referenceNumber: fd.get('courseRefDetail') as string,
                startDate: fd.get('startDate') as string,
              },
              trainee: {
                idType: fd.get('idType') as string,
                id: fd.get('traineeId') as string,
                dateOfBirth: fd.get('dob') as string,
                sponsoringEmployerUen: fd.get('sponsorUen') as string,
                modularisedSCTPBundleCourseStartDate: (fd.get('modStartDate') as string) || undefined,
              },
            });
          }}>
            <h4 style={{ marginBottom: 8 }}>Course</h4>
            <div className="form-group">
              <label htmlFor="gpTpUen">Training Partner UEN</label>
              <input id="gpTpUen" name="tpUen" type="text" defaultValue="201200696W" disabled={grantPersonalisedApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="gpCourseRef">Course Reference Number</label>
              <input id="gpCourseRef" name="courseRef" type="text" defaultValue="TGS-2020505444" disabled={grantPersonalisedApi.loading} />
            </div>
            <h4 style={{ marginTop: 16, marginBottom: 8 }}>Applicant</h4>
            <div className="form-group">
              <label htmlFor="gpSme">SME (Y/N)</label>
              <input id="gpSme" name="sme" type="text" defaultValue="Y" disabled={grantPersonalisedApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="gpNric">NRIC</label>
              <input id="gpNric" name="nric" type="text" defaultValue="S0118316H" disabled={grantPersonalisedApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="gpNricType">NRIC Type</label>
              <input id="gpNricType" name="nricType" type="text" defaultValue="SP" disabled={grantPersonalisedApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="gpEmployerSponsored">Employer Sponsored (Y/N)</label>
              <input id="gpEmployerSponsored" name="employerSponsored" type="text" defaultValue="Y" disabled={grantPersonalisedApi.loading} />
            </div>
            <h4 style={{ marginTop: 16, marginBottom: 8 }}>Course Details</h4>
            <div className="form-group">
              <label htmlFor="gpCourseRefDetail">Course Reference Number</label>
              <input id="gpCourseRefDetail" name="courseRefDetail" type="text" defaultValue="TGS-2020505444" disabled={grantPersonalisedApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="gpStartDate">Course Start Date</label>
              <input id="gpStartDate" name="startDate" type="text" defaultValue="2020-05-15" placeholder="YYYY-MM-DD" disabled={grantPersonalisedApi.loading} />
            </div>
            <h4 style={{ marginTop: 16, marginBottom: 8 }}>Trainee</h4>
            <div className="form-group">
              <label htmlFor="gpIdType">ID Type</label>
              <input id="gpIdType" name="idType" type="text" defaultValue="NRIC" disabled={grantPersonalisedApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="gpTraineeId">Trainee ID</label>
              <input id="gpTraineeId" name="traineeId" type="text" defaultValue="S0118316H" disabled={grantPersonalisedApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="gpDob">Date of Birth</label>
              <input id="gpDob" name="dob" type="text" defaultValue="1980-05-15" placeholder="YYYY-MM-DD" disabled={grantPersonalisedApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="gpSponsorUen">Sponsoring Employer UEN</label>
              <input id="gpSponsorUen" name="sponsorUen" type="text" defaultValue="201200696W" disabled={grantPersonalisedApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="gpModStartDate">Modularised SCTP Bundle Course Start Date (optional)</label>
              <input id="gpModStartDate" name="modStartDate" type="text" placeholder="YYYY-MM-DD" disabled={grantPersonalisedApi.loading} />
            </div>
            <div style={{ marginTop: 12 }}>
              <button type="submit" disabled={grantPersonalisedApi.loading}>
                {grantPersonalisedApi.loading ? 'Calculating...' : 'Calculate Personalised Grant'}
              </button>
            </div>
          </form>
          {grantPersonalisedApi.error && <div className="error-alert">{grantPersonalisedApi.error}</div>}
          {grantPersonalisedApi.loading && <div className="loading">Calculating personalised grant...</div>}
          {grantPersonalisedApi.data && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <h3>Personalised Grant Response</h3>
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 500, fontSize: 13 }}>
                {JSON.stringify(grantPersonalisedApi.data, null, 2)}
              </pre>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'grant-search') {
      return (
        <>
          <h2 className="page-title">Search Grants</h2>
          <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>
            Search for grants. POST to <code>/tpg/grants/search</code> (v1.0). Requires UEN header.
          </p>
          <form className="course-result" autoComplete="off" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const uen = fd.get('uen') as string;
            handleGrantSearch({
              meta: {
                lastUpdateDateFrom: (fd.get('dateFrom') as string) || undefined,
                lastUpdateDateTo: (fd.get('dateTo') as string) || undefined,
              },
              grants: {
                course: {
                  run: { id: fd.get('runId') as string },
                  referenceNumber: fd.get('courseRef') as string,
                },
                trainee: { id: fd.get('traineeId') as string },
                employer: { uen: fd.get('employerUen') as string },
                enrolment: { referenceNumber: fd.get('enrolmentRef') as string },
                trainingPartner: {
                  uen: fd.get('tpUen') as string,
                  code: fd.get('tpCode') as string,
                },
              },
              sortBy: { field: 'updatedOn', order: 'asc' },
              parameters: {
                page: Number(fd.get('page')) || 0,
                pageSize: Number(fd.get('pageSize')) || 20,
              },
            }, uen);
          }}>
            <div className="form-group">
              <label htmlFor="gsUen">UEN (header)</label>
              <input id="gsUen" name="uen" type="text" defaultValue="201200696W" disabled={grantSearchApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="gsCourseRef">Course Reference Number</label>
              <input id="gsCourseRef" name="courseRef" type="text" defaultValue="TGS-2020505444" disabled={grantSearchApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="gsRunId">Course Run ID</label>
              <input id="gsRunId" name="runId" type="text" defaultValue="1002600" disabled={grantSearchApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="gsTraineeId">Trainee ID</label>
              <input id="gsTraineeId" name="traineeId" type="text" defaultValue="S0118316H" disabled={grantSearchApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="gsEmployerUen">Employer UEN</label>
              <input id="gsEmployerUen" name="employerUen" type="text" defaultValue="201200696W" disabled={grantSearchApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="gsEnrolmentRef">Enrolment Reference</label>
              <input id="gsEnrolmentRef" name="enrolmentRef" type="text" defaultValue="ENR-1912-000123" disabled={grantSearchApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="gsTpUen">Training Partner UEN</label>
              <input id="gsTpUen" name="tpUen" type="text" defaultValue="201200696W" disabled={grantSearchApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="gsTpCode">Training Partner Code</label>
              <input id="gsTpCode" name="tpCode" type="text" defaultValue="201200696W-01" disabled={grantSearchApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="gsDateFrom">Last Update Date From</label>
              <input id="gsDateFrom" name="dateFrom" type="text" defaultValue="2020-01-01" placeholder="YYYY-MM-DD" disabled={grantSearchApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="gsDateTo">Last Update Date To</label>
              <input id="gsDateTo" name="dateTo" type="text" defaultValue="2020-01-01" placeholder="YYYY-MM-DD" disabled={grantSearchApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="gsPage">Page</label>
              <input id="gsPage" name="page" type="number" defaultValue="0" min="0" disabled={grantSearchApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="gsPageSize">Page Size</label>
              <input id="gsPageSize" name="pageSize" type="number" defaultValue="20" min="1" max="100" disabled={grantSearchApi.loading} />
            </div>
            <div style={{ marginTop: 12 }}>
              <button type="submit" disabled={grantSearchApi.loading}>
                {grantSearchApi.loading ? 'Searching...' : 'Search Grants'}
              </button>
            </div>
          </form>
          {grantSearchApi.error && <div className="error-alert">{grantSearchApi.error}</div>}
          {grantSearchApi.loading && <div className="loading">Searching grants...</div>}
          {grantSearchApi.data && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <h3>Search Grants Response</h3>
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 500, fontSize: 13 }}>
                {JSON.stringify(grantSearchApi.data, null, 2)}
              </pre>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'grant-view') {
      return (
        <>
          <h2 className="page-title">View Grant Details</h2>
          <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>
            View details for a specific grant. GET <code>/tpg/grants/details/&#123;grantRefNo&#125;</code> (v1.0).
          </p>
          <form className="course-result" autoComplete="off" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            handleGrantView(fd.get('grantRefNo') as string);
          }}>
            <div className="form-group">
              <label htmlFor="gvRefNo">Grant Reference Number</label>
              <input id="gvRefNo" name="grantRefNo" type="text" defaultValue="GRN-2002-123456" disabled={grantDetailsApi.loading} />
            </div>
            <div style={{ marginTop: 12 }}>
              <button type="submit" disabled={grantDetailsApi.loading}>
                {grantDetailsApi.loading ? 'Loading...' : 'View Grant'}
              </button>
            </div>
          </form>
          {grantDetailsApi.error && <div className="error-alert">{grantDetailsApi.error}</div>}
          {grantDetailsApi.loading && <div className="loading">Loading grant details...</div>}
          {grantDetailsApi.data && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <h3>Grant Details Response</h3>
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 500, fontSize: 13 }}>
                {JSON.stringify(grantDetailsApi.data, null, 2)}
              </pre>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'grant-codes') {
      return (
        <>
          <h2 className="page-title">Grants Code Lookup</h2>
          <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>
            Lookup funding component codes. GET <code>/tpg/codes/grants/fundingComponent</code> (v1.0).
          </p>
          <div className="course-result">
            <button onClick={handleGrantCodes} disabled={grantCodesApi.loading}>
              {grantCodesApi.loading ? 'Loading...' : 'Fetch Funding Component Codes'}
            </button>
          </div>
          {grantCodesApi.error && <div className="error-alert">{grantCodesApi.error}</div>}
          {grantCodesApi.loading && <div className="loading">Loading codes...</div>}
          {grantCodesApi.data && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <h3>Funding Component Codes</h3>
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 500, fontSize: 13 }}>
                {JSON.stringify(grantCodesApi.data, null, 2)}
              </pre>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'sf-view-claim') {
      return (
        <>
          <h2 className="page-title">View Claim Details</h2>
          <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>
            View SkillsFuture Credit claim details. GET <code>/skillsFutureCredits/claims/&#123;claimId&#125;</code> (v2.0).
          </p>
          <form className="course-result" autoComplete="off" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            handleSfViewClaim(fd.get('claimId') as string, fd.get('nric') as string);
          }}>
            <div className="form-group">
              <label htmlFor="sfvcClaimId">Claim ID</label>
              <input id="sfvcClaimId" name="claimId" type="text" defaultValue="2000217252" disabled={sfClaimApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="sfvcNric">NRIC</label>
              <input id="sfvcNric" name="nric" type="text" defaultValue="T1234567J" disabled={sfClaimApi.loading} />
            </div>
            <div style={{ marginTop: 12 }}>
              <button type="submit" disabled={sfClaimApi.loading}>
                {sfClaimApi.loading ? 'Loading...' : 'View Claim'}
              </button>
            </div>
          </form>
          {sfClaimApi.error && <div className="error-alert">{sfClaimApi.error}</div>}
          {sfClaimApi.loading && <div className="loading">Loading claim details...</div>}
          {sfClaimApi.data && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <h3>Claim Details Response</h3>
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 500, fontSize: 13 }}>
                {JSON.stringify(sfClaimApi.data, null, 2)}
              </pre>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'sf-cancel-claim') {
      return (
        <>
          <h2 className="page-title">Cancel Claim</h2>
          <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>
            Cancel a SkillsFuture Credit claim. POST <code>/skillsFutureCredits/claims/&#123;claimId&#125;</code> (v2.0).
          </p>
          <form className="course-result" autoComplete="off" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            handleSfCancelClaim(fd.get('claimId') as string, fd.get('nric') as string, fd.get('cancelCode') as string);
          }}>
            <div className="form-group">
              <label htmlFor="sfccClaimId">Claim ID</label>
              <input id="sfccClaimId" name="claimId" type="text" defaultValue="2000217252" disabled={sfCancelApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="sfccNric">NRIC</label>
              <input id="sfccNric" name="nric" type="text" defaultValue="T1234567J" disabled={sfCancelApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="sfccCode">Claim Cancel Code</label>
              <input id="sfccCode" name="cancelCode" type="text" defaultValue="51" disabled={sfCancelApi.loading} />
            </div>
            <div style={{ marginTop: 12 }}>
              <button type="submit" disabled={sfCancelApi.loading}>
                {sfCancelApi.loading ? 'Cancelling...' : 'Cancel Claim'}
              </button>
            </div>
          </form>
          {sfCancelApi.error && <div className="error-alert">{sfCancelApi.error}</div>}
          {sfCancelApi.loading && <div className="loading">Cancelling claim...</div>}
          {sfCancelApi.data && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <h3>Cancel Claim Response</h3>
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 500, fontSize: 13 }}>
                {JSON.stringify(sfCancelApi.data, null, 2)}
              </pre>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'sf-upload-docs') {
      return (
        <>
          <h2 className="page-title">Upload Supporting Documents</h2>
          <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>
            Upload supporting documents for a claim. POST <code>/skillsFutureCredits/claims/&#123;claimId&#125;/supportingdocuments</code> (v2.0).
          </p>
          <form className="course-result" autoComplete="off" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            handleSfUploadDocs(fd.get('claimId') as string, {
              nric: fd.get('nric') as string,
              attachments: [{
                fileName: fd.get('fileName') as string,
                fileSize: fd.get('fileSize') as string,
                fileType: fd.get('fileType') as string,
                attachmentId: fd.get('attachmentId') as string,
                attachmentByte: fd.get('attachmentByte') as string,
              }],
            });
          }}>
            <div className="form-group">
              <label htmlFor="sfudClaimId">Claim ID</label>
              <input id="sfudClaimId" name="claimId" type="text" defaultValue="2000217252" disabled={sfUploadDocsApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="sfudNric">NRIC</label>
              <input id="sfudNric" name="nric" type="text" defaultValue="T1234567J" disabled={sfUploadDocsApi.loading} />
            </div>
            <h4 style={{ marginTop: 16, marginBottom: 8 }}>Attachment</h4>
            <div className="form-group">
              <label htmlFor="sfudFileName">File Name</label>
              <input id="sfudFileName" name="fileName" type="text" defaultValue="File001.doc" disabled={sfUploadDocsApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="sfudFileSize">File Size</label>
              <input id="sfudFileSize" name="fileSize" type="text" defaultValue="1.2 MB" disabled={sfUploadDocsApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="sfudFileType">File Type</label>
              <input id="sfudFileType" name="fileType" type="text" defaultValue="doc" disabled={sfUploadDocsApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="sfudAttachmentId">Attachment ID</label>
              <input id="sfudAttachmentId" name="attachmentId" type="text" defaultValue="attachment001" disabled={sfUploadDocsApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="sfudAttachmentByte">Attachment Byte (base64)</label>
              <textarea id="sfudAttachmentByte" name="attachmentByte" rows={3} defaultValue="iVBORw0KGgoAAAAN..." disabled={sfUploadDocsApi.loading} style={{ width: '100%', fontFamily: 'monospace', padding: 8 }} />
            </div>
            <div style={{ marginTop: 12 }}>
              <button type="submit" disabled={sfUploadDocsApi.loading}>
                {sfUploadDocsApi.loading ? 'Uploading...' : 'Upload Documents'}
              </button>
            </div>
          </form>
          {sfUploadDocsApi.error && <div className="error-alert">{sfUploadDocsApi.error}</div>}
          {sfUploadDocsApi.loading && <div className="loading">Uploading documents...</div>}
          {sfUploadDocsApi.data && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <h3>Upload Response</h3>
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 500, fontSize: 13 }}>
                {JSON.stringify(sfUploadDocsApi.data, null, 2)}
              </pre>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'sf-encrypt-request') {
      return (
        <>
          <h2 className="page-title">Request Encryption</h2>
          <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>
            Encrypt a claim request. POST <code>/skillsFutureCredits/claims/encryptRequests</code> (v2.0).
          </p>
          <form className="course-result" autoComplete="off" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            handleSfEncrypt({
              claimRequest: {
                course: {
                  id: fd.get('courseId') as string,
                  fee: fd.get('fee') as string,
                  runId: fd.get('runId') as string,
                  startDate: fd.get('startDate') as string,
                },
                individual: {
                  nric: fd.get('nric') as string,
                  email: fd.get('email') as string,
                  homeNumber: fd.get('homeNumber') as string,
                  mobileNumber: fd.get('mobileNumber') as string,
                },
                additionalInformation: fd.get('additionalInfo') as string,
              },
            });
          }}>
            <h4 style={{ marginBottom: 8 }}>Course</h4>
            <div className="form-group">
              <label htmlFor="sfeCourseld">Course ID</label>
              <input id="sfeCourseld" name="courseId" type="text" defaultValue="TGS-2020505444" disabled={sfEncryptApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="sfeFee">Fee</label>
              <input id="sfeFee" name="fee" type="text" defaultValue="12.50" disabled={sfEncryptApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="sfeRunId">Run ID</label>
              <input id="sfeRunId" name="runId" type="text" defaultValue="1002600" disabled={sfEncryptApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="sfeStartDate">Start Date</label>
              <input id="sfeStartDate" name="startDate" type="text" defaultValue="2019-05-22" placeholder="YYYY-MM-DD" disabled={sfEncryptApi.loading} />
            </div>
            <h4 style={{ marginTop: 16, marginBottom: 8 }}>Individual</h4>
            <div className="form-group">
              <label htmlFor="sfeNric">NRIC</label>
              <input id="sfeNric" name="nric" type="text" defaultValue="T5001072J" disabled={sfEncryptApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="sfeEmail">Email</label>
              <input id="sfeEmail" name="email" type="text" defaultValue="jon.chua@email.com" disabled={sfEncryptApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="sfeHome">Home Number</label>
              <input id="sfeHome" name="homeNumber" type="text" defaultValue="61234567" disabled={sfEncryptApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="sfeMobile">Mobile Number</label>
              <input id="sfeMobile" name="mobileNumber" type="text" defaultValue="98765432" disabled={sfEncryptApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="sfeAdditionalInfo">Additional Information</label>
              <input id="sfeAdditionalInfo" name="additionalInfo" type="text" defaultValue="This is additional information" disabled={sfEncryptApi.loading} />
            </div>
            <div style={{ marginTop: 12 }}>
              <button type="submit" disabled={sfEncryptApi.loading}>
                {sfEncryptApi.loading ? 'Encrypting...' : 'Encrypt Request'}
              </button>
            </div>
          </form>
          {sfEncryptApi.error && <div className="error-alert">{sfEncryptApi.error}</div>}
          {sfEncryptApi.loading && <div className="loading">Encrypting request...</div>}
          {sfEncryptApi.data && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <h3>Encryption Response</h3>
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 500, fontSize: 13 }}>
                {JSON.stringify(sfEncryptApi.data, null, 2)}
              </pre>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'sf-decrypt-request') {
      return (
        <>
          <h2 className="page-title">Request Decryption</h2>
          <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>
            Decrypt a claim request status. POST <code>/skillsFutureCredits/claims/decryptRequests</code> (v2.0).
          </p>
          <form className="course-result" autoComplete="off" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            handleSfDecrypt({
              claimRequestStatus: fd.get('ciphertext') as string,
            });
          }}>
            <div className="form-group">
              <label htmlFor="sfdCiphertext">Encrypted Claim Request Status</label>
              <textarea id="sfdCiphertext" name="ciphertext" rows={6} disabled={sfDecryptApi.loading} style={{ width: '100%', fontFamily: 'monospace', padding: 8 }} placeholder="Paste the encrypted claimRequestStatus string here..." />
            </div>
            <div style={{ marginTop: 12 }}>
              <button type="submit" disabled={sfDecryptApi.loading}>
                {sfDecryptApi.loading ? 'Decrypting...' : 'Decrypt Request'}
              </button>
            </div>
          </form>
          {sfDecryptApi.error && <div className="error-alert">{sfDecryptApi.error}</div>}
          {sfDecryptApi.loading && <div className="loading">Decrypting request...</div>}
          {sfDecryptApi.data && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <h3>Decryption Response</h3>
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 500, fontSize: 13 }}>
                {JSON.stringify(sfDecryptApi.data, null, 2)}
              </pre>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'enrol-create') {
      return (
        <>
          <h2 className="page-title">Create Enrolment</h2>
          <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>
            Create a new enrolment. POST <code>/tpg/enrolments</code> (v3.0).
          </p>
          <form className="course-result" autoComplete="off" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            handleEnrolCreate({
              enrolment: {
                course: { run: { id: fd.get('runId') as string }, referenceNumber: fd.get('courseRef') as string },
                trainee: {
                  id: fd.get('traineeId') as string,
                  idType: { type: fd.get('idType') as string },
                  fullName: fd.get('fullName') as string,
                  dateOfBirth: fd.get('dob') as string,
                  emailAddress: fd.get('email') as string,
                  contactNumber: { areaCode: '00', countryCode: '60', phoneNumber: fd.get('phone') as string },
                  enrolmentDate: fd.get('enrolDate') as string,
                  sponsorshipType: fd.get('sponsorship') as string,
                  employer: { uen: fd.get('employerUen') as string, contact: { fullName: fd.get('empContactName') as string, emailAddress: fd.get('empEmail') as string, contactNumber: { areaCode: '00', countryCode: '60', phoneNumber: fd.get('empPhone') as string } } },
                  fees: { discountAmount: Number(fd.get('discount')) || 0, collectionStatus: fd.get('feeStatus') as string },
                },
                trainingPartner: { uen: fd.get('tpUen') as string, code: fd.get('tpCode') as string },
              },
            });
          }}>
            <h4 style={{ marginBottom: 8 }}>Course</h4>
            <div className="form-group"><label>Course Run ID</label><input name="runId" type="text" defaultValue="1002600" disabled={enrolCreateApi.loading} /></div>
            <div className="form-group"><label>Course Reference Number</label><input name="courseRef" type="text" defaultValue="TGS-2020505444" disabled={enrolCreateApi.loading} /></div>
            <h4 style={{ marginTop: 16, marginBottom: 8 }}>Trainee</h4>
            <div className="form-group"><label>Trainee ID</label><input name="traineeId" type="text" defaultValue="S0118316H" disabled={enrolCreateApi.loading} /></div>
            <div className="form-group"><label>ID Type</label><input name="idType" type="text" defaultValue="NRIC" disabled={enrolCreateApi.loading} /></div>
            <div className="form-group"><label>Full Name</label><input name="fullName" type="text" defaultValue="Jon Chua" disabled={enrolCreateApi.loading} /></div>
            <div className="form-group"><label>Date of Birth</label><input name="dob" type="text" defaultValue="1950-10-16" disabled={enrolCreateApi.loading} /></div>
            <div className="form-group"><label>Email</label><input name="email" type="text" defaultValue="jon.chua@email.com" disabled={enrolCreateApi.loading} /></div>
            <div className="form-group"><label>Phone</label><input name="phone" type="text" defaultValue="91234567" disabled={enrolCreateApi.loading} /></div>
            <div className="form-group"><label>Enrolment Date</label><input name="enrolDate" type="text" defaultValue="2020-05-15" disabled={enrolCreateApi.loading} /></div>
            <div className="form-group"><label>Sponsorship Type</label><input name="sponsorship" type="text" defaultValue="EMPLOYER" disabled={enrolCreateApi.loading} /></div>
            <div className="form-group"><label>Discount Amount</label><input name="discount" type="number" defaultValue="50.25" disabled={enrolCreateApi.loading} /></div>
            <div className="form-group"><label>Fee Collection Status</label><input name="feeStatus" type="text" defaultValue="Full Payment" disabled={enrolCreateApi.loading} /></div>
            <h4 style={{ marginTop: 16, marginBottom: 8 }}>Employer</h4>
            <div className="form-group"><label>Employer UEN</label><input name="employerUen" type="text" defaultValue="201200696W" disabled={enrolCreateApi.loading} /></div>
            <div className="form-group"><label>Contact Name</label><input name="empContactName" type="text" defaultValue="Stephen Chua" disabled={enrolCreateApi.loading} /></div>
            <div className="form-group"><label>Contact Email</label><input name="empEmail" type="text" defaultValue="jon.chua@email.com" disabled={enrolCreateApi.loading} /></div>
            <div className="form-group"><label>Contact Phone</label><input name="empPhone" type="text" defaultValue="91234567" disabled={enrolCreateApi.loading} /></div>
            <h4 style={{ marginTop: 16, marginBottom: 8 }}>Training Partner</h4>
            <div className="form-group"><label>TP UEN</label><input name="tpUen" type="text" defaultValue="201200696W" disabled={enrolCreateApi.loading} /></div>
            <div className="form-group"><label>TP Code</label><input name="tpCode" type="text" defaultValue="201200696W-01" disabled={enrolCreateApi.loading} /></div>
            <div style={{ marginTop: 12 }}><button type="submit" disabled={enrolCreateApi.loading}>{enrolCreateApi.loading ? 'Creating...' : 'Create Enrolment'}</button></div>
          </form>
          {enrolCreateApi.error && <div className="error-alert">{enrolCreateApi.error}</div>}
          {enrolCreateApi.data && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <h3>Create Enrolment Response</h3>
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 500, fontSize: 13 }}>{JSON.stringify(enrolCreateApi.data, null, 2)}</pre>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'enrol-update') {
      return (
        <>
          <h2 className="page-title">Update/Cancel Enrolment</h2>
          <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>POST <code>/tpg/enrolments/details/&#123;enrolmentRefNo&#125;</code> (v3.0). Requires UEN header.</p>
          <form className="course-result" autoComplete="off" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            handleEnrolUpdate(fd.get('refNo') as string, {
              enrolment: {
                action: fd.get('action') as string,
                course: { run: { id: fd.get('runId') as string } },
                fees: { discountAmount: Number(fd.get('discount')) || 0, collectionStatus: fd.get('feeStatus') as string },
                trainee: { emailAddress: fd.get('email') as string, contactNumber: { areaCode: '00', countryCode: '60', phoneNumber: fd.get('phone') as string } },
                employer: { uen: fd.get('employerUen') as string, fullName: fd.get('empName') as string, emailAddress: fd.get('empEmail') as string, contactNumber: { areaCode: '00', countryCode: '60', phoneNumber: fd.get('empPhone') as string } },
                enrolmentDate: fd.get('enrolDate') as string,
              },
            }, fd.get('uen') as string);
          }}>
            <div className="form-group"><label>Enrolment Reference Number</label><input name="refNo" type="text" defaultValue="ENR-1912-000123" disabled={enrolUpdateApi.loading} /></div>
            <div className="form-group"><label>UEN (header)</label><input name="uen" type="text" defaultValue="201200696W" disabled={enrolUpdateApi.loading} /></div>
            <div className="form-group"><label>Action (Update/Cancel)</label><input name="action" type="text" defaultValue="Update" disabled={enrolUpdateApi.loading} /></div>
            <div className="form-group"><label>Course Run ID</label><input name="runId" type="text" defaultValue="1002600" disabled={enrolUpdateApi.loading} /></div>
            <div className="form-group"><label>Email</label><input name="email" type="text" defaultValue="jon.chua@email.com" disabled={enrolUpdateApi.loading} /></div>
            <div className="form-group"><label>Phone</label><input name="phone" type="text" defaultValue="91234567" disabled={enrolUpdateApi.loading} /></div>
            <div className="form-group"><label>Enrolment Date</label><input name="enrolDate" type="text" defaultValue="2020-05-15" disabled={enrolUpdateApi.loading} /></div>
            <div className="form-group"><label>Discount Amount</label><input name="discount" type="number" defaultValue="50.25" disabled={enrolUpdateApi.loading} /></div>
            <div className="form-group"><label>Fee Collection Status</label><input name="feeStatus" type="text" defaultValue="Full Payment" disabled={enrolUpdateApi.loading} /></div>
            <div className="form-group"><label>Employer UEN</label><input name="employerUen" type="text" defaultValue="201200696W" disabled={enrolUpdateApi.loading} /></div>
            <div className="form-group"><label>Employer Name</label><input name="empName" type="text" defaultValue="Stephen Chua" disabled={enrolUpdateApi.loading} /></div>
            <div className="form-group"><label>Employer Email</label><input name="empEmail" type="text" defaultValue="jon.chua@email.com" disabled={enrolUpdateApi.loading} /></div>
            <div className="form-group"><label>Employer Phone</label><input name="empPhone" type="text" defaultValue="91234567" disabled={enrolUpdateApi.loading} /></div>
            <div style={{ marginTop: 12 }}><button type="submit" disabled={enrolUpdateApi.loading}>{enrolUpdateApi.loading ? 'Updating...' : 'Update/Cancel Enrolment'}</button></div>
          </form>
          {enrolUpdateApi.error && <div className="error-alert">{enrolUpdateApi.error}</div>}
          {enrolUpdateApi.data && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <h3>Response</h3>
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 500, fontSize: 13 }}>{JSON.stringify(enrolUpdateApi.data, null, 2)}</pre>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'enrol-search') {
      return (
        <>
          <h2 className="page-title">Search Enrolments</h2>
          <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>POST <code>/tpg/enrolments/search</code> (v3.0).</p>
          <form className="course-result" autoComplete="off" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            handleEnrolSearch({
              meta: { lastUpdateDateFrom: fd.get('dateFrom') as string, lastUpdateDateTo: fd.get('dateTo') as string },
              sortBy: { field: 'updatedOn', order: 'asc' },
              enrolment: {
                status: fd.get('status') as string,
                course: { run: { id: fd.get('runId') as string }, referenceNumber: fd.get('courseRef') as string },
                trainee: { id: fd.get('traineeId') as string, idType: { type: fd.get('idType') as string }, employer: { uen: fd.get('employerUen') as string }, enrolmentDate: fd.get('enrolDate') as string, sponsorshipType: fd.get('sponsorship') as string, fees: { feeCollectionStatus: fd.get('feeStatus') as string } },
                trainingPartner: { uen: fd.get('tpUen') as string, code: fd.get('tpCode') as string },
              },
              parameters: { page: Number(fd.get('page')) || 0, pageSize: Number(fd.get('pageSize')) || 20 },
            });
          }}>
            <div className="form-group"><label>Course Run ID</label><input name="runId" type="text" defaultValue="1002600" disabled={enrolSearchApi.loading} /></div>
            <div className="form-group"><label>Course Reference Number</label><input name="courseRef" type="text" defaultValue="TGS-2020505444" disabled={enrolSearchApi.loading} /></div>
            <div className="form-group"><label>Trainee ID</label><input name="traineeId" type="text" defaultValue="S0118316H" disabled={enrolSearchApi.loading} /></div>
            <div className="form-group"><label>ID Type</label><input name="idType" type="text" defaultValue="NRIC" disabled={enrolSearchApi.loading} /></div>
            <div className="form-group"><label>Status</label><input name="status" type="text" defaultValue="Confirmed" disabled={enrolSearchApi.loading} /></div>
            <div className="form-group"><label>Employer UEN</label><input name="employerUen" type="text" defaultValue="201200696W" disabled={enrolSearchApi.loading} /></div>
            <div className="form-group"><label>Sponsorship Type</label><input name="sponsorship" type="text" defaultValue="EMPLOYER" disabled={enrolSearchApi.loading} /></div>
            <div className="form-group"><label>Fee Collection Status</label><input name="feeStatus" type="text" defaultValue="Full Payment" disabled={enrolSearchApi.loading} /></div>
            <div className="form-group"><label>Enrolment Date</label><input name="enrolDate" type="text" defaultValue="2020-05-15" disabled={enrolSearchApi.loading} /></div>
            <div className="form-group"><label>Training Partner UEN</label><input name="tpUen" type="text" defaultValue="201200696W" disabled={enrolSearchApi.loading} /></div>
            <div className="form-group"><label>Training Partner Code</label><input name="tpCode" type="text" defaultValue="201200696W-01" disabled={enrolSearchApi.loading} /></div>
            <div className="form-group"><label>Date From</label><input name="dateFrom" type="text" defaultValue="2020-01-01" disabled={enrolSearchApi.loading} /></div>
            <div className="form-group"><label>Date To</label><input name="dateTo" type="text" defaultValue="2020-02-01" disabled={enrolSearchApi.loading} /></div>
            <div className="form-group"><label>Page</label><input name="page" type="number" defaultValue="0" disabled={enrolSearchApi.loading} /></div>
            <div className="form-group"><label>Page Size</label><input name="pageSize" type="number" defaultValue="20" disabled={enrolSearchApi.loading} /></div>
            <div style={{ marginTop: 12 }}><button type="submit" disabled={enrolSearchApi.loading}>{enrolSearchApi.loading ? 'Searching...' : 'Search Enrolments'}</button></div>
          </form>
          {enrolSearchApi.error && <div className="error-alert">{enrolSearchApi.error}</div>}
          {enrolSearchApi.data && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <h3>Search Results</h3>
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 500, fontSize: 13 }}>{JSON.stringify(enrolSearchApi.data, null, 2)}</pre>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'enrol-view') {
      return (
        <>
          <h2 className="page-title">View Enrolment</h2>
          <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>GET <code>/tpg/enrolments/details/&#123;enrolmentRefNo&#125;</code> (v3.0).</p>
          <form className="course-result" autoComplete="off" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            handleEnrolView(fd.get('refNo') as string);
          }}>
            <div className="form-group"><label>Enrolment Reference Number</label><input name="refNo" type="text" defaultValue="ENR-2003-123456" disabled={enrolViewApi.loading} /></div>
            <div style={{ marginTop: 12 }}><button type="submit" disabled={enrolViewApi.loading}>{enrolViewApi.loading ? 'Loading...' : 'View Enrolment'}</button></div>
          </form>
          {enrolViewApi.error && <div className="error-alert">{enrolViewApi.error}</div>}
          {enrolViewApi.data && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <h3>Enrolment Details</h3>
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 500, fontSize: 13 }}>{JSON.stringify(enrolViewApi.data, null, 2)}</pre>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'enrol-fee-collection') {
      return (
        <>
          <h2 className="page-title">Update Enrolment Fee Collection</h2>
          <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>POST <code>/tpg/enrolments/feeCollections/&#123;enrolmentRefNo&#125;</code> (v3.0).</p>
          <form className="course-result" autoComplete="off" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            handleEnrolFee(fd.get('refNo') as string, {
              enrolment: { fees: { collectionStatus: fd.get('status') as string } },
            });
          }}>
            <div className="form-group"><label>Enrolment Reference Number</label><input name="refNo" type="text" defaultValue="ENR-123456" disabled={enrolFeeApi.loading} /></div>
            <div className="form-group"><label>Collection Status</label><input name="status" type="text" defaultValue="Full Payment" disabled={enrolFeeApi.loading} /></div>
            <div style={{ marginTop: 12 }}><button type="submit" disabled={enrolFeeApi.loading}>{enrolFeeApi.loading ? 'Updating...' : 'Update Fee Collection'}</button></div>
          </form>
          {enrolFeeApi.error && <div className="error-alert">{enrolFeeApi.error}</div>}
          {enrolFeeApi.data && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <h3>Response</h3>
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 500, fontSize: 13 }}>{JSON.stringify(enrolFeeApi.data, null, 2)}</pre>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'enrol-codes') {
      return (
        <>
          <h2 className="page-title">Enrolment Code Lookup</h2>
          <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>GET <code>/tpg/codes/enrolments/sponsorshipType</code> (v1).</p>
          <div className="course-result">
            <button onClick={handleEnrolCodes} disabled={enrolCodesApi.loading}>{enrolCodesApi.loading ? 'Loading...' : 'Fetch Sponsorship Type Codes'}</button>
          </div>
          {enrolCodesApi.error && <div className="error-alert">{enrolCodesApi.error}</div>}
          {enrolCodesApi.data && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <h3>Sponsorship Type Codes</h3>
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 500, fontSize: 13 }}>{JSON.stringify(enrolCodesApi.data, null, 2)}</pre>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'assess-create') {
      return (
        <>
          <h2 className="page-title">Create Assessment</h2>
          <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>POST <code>/tpg/assessments</code> (v1).</p>
          <form className="course-result" autoComplete="off" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            handleAssessCreate({
              assessment: {
                grade: fd.get('grade') as string,
                score: Number(fd.get('score')) || 0,
                result: fd.get('result') as string,
                course: { run: { id: fd.get('runId') as string }, referenceNumber: fd.get('courseRef') as string },
                trainee: { id: fd.get('traineeId') as string, idType: fd.get('idType') as string, fullName: fd.get('fullName') as string },
                skillCode: fd.get('skillCode') as string,
                assessmentDate: fd.get('assessDate') as string,
                trainingPartner: { uen: fd.get('tpUen') as string, code: fd.get('tpCode') as string },
                conferringInstitute: { code: fd.get('confCode') as string },
              },
            });
          }}>
            <div className="form-group"><label>Course Run ID</label><input name="runId" type="text" defaultValue="1022600" disabled={assessCreateApi.loading} /></div>
            <div className="form-group"><label>Course Reference Number</label><input name="courseRef" type="text" defaultValue="TGS-2020505444" disabled={assessCreateApi.loading} /></div>
            <div className="form-group"><label>Trainee ID</label><input name="traineeId" type="text" defaultValue="S0118316H" disabled={assessCreateApi.loading} /></div>
            <div className="form-group"><label>ID Type</label><input name="idType" type="text" defaultValue="NRIC" disabled={assessCreateApi.loading} /></div>
            <div className="form-group"><label>Full Name</label><input name="fullName" type="text" defaultValue="Jon Chua" disabled={assessCreateApi.loading} /></div>
            <div className="form-group"><label>Grade</label><input name="grade" type="text" defaultValue="B" disabled={assessCreateApi.loading} /></div>
            <div className="form-group"><label>Score</label><input name="score" type="number" defaultValue="80" disabled={assessCreateApi.loading} /></div>
            <div className="form-group"><label>Result</label><input name="result" type="text" defaultValue="Pass" disabled={assessCreateApi.loading} /></div>
            <div className="form-group"><label>Skill Code</label><input name="skillCode" type="text" defaultValue="TGS-MKG-234222" disabled={assessCreateApi.loading} /></div>
            <div className="form-group"><label>Assessment Date</label><input name="assessDate" type="text" defaultValue="2020-05-15" disabled={assessCreateApi.loading} /></div>
            <div className="form-group"><label>Training Partner UEN</label><input name="tpUen" type="text" defaultValue="201200696W" disabled={assessCreateApi.loading} /></div>
            <div className="form-group"><label>Training Partner Code</label><input name="tpCode" type="text" defaultValue="201200696W-01" disabled={assessCreateApi.loading} /></div>
            <div className="form-group"><label>Conferring Institute Code</label><input name="confCode" type="text" defaultValue="201200696W-01" disabled={assessCreateApi.loading} /></div>
            <div style={{ marginTop: 12 }}><button type="submit" disabled={assessCreateApi.loading}>{assessCreateApi.loading ? 'Creating...' : 'Create Assessment'}</button></div>
          </form>
          {assessCreateApi.error && <div className="error-alert">{assessCreateApi.error}</div>}
          {assessCreateApi.data && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <h3>Response</h3>
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 500, fontSize: 13 }}>{JSON.stringify(assessCreateApi.data, null, 2)}</pre>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'assess-update') {
      return (
        <>
          <h2 className="page-title">Update/Void Assessment</h2>
          <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>POST <code>/tpg/assessments/details/&#123;assessmentRefNo&#125;</code> (v1).</p>
          <form className="course-result" autoComplete="off" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            handleAssessUpdate(fd.get('refNo') as string, {
              assessment: {
                action: fd.get('action') as string,
                grade: fd.get('grade') as string,
                score: Number(fd.get('score')) || 0,
                result: fd.get('result') as string,
                trainee: { fullName: fd.get('fullName') as string },
                skillCode: fd.get('skillCode') as string,
                assessmentDate: fd.get('assessDate') as string,
              },
            });
          }}>
            <div className="form-group"><label>Assessment Reference Number</label><input name="refNo" type="text" defaultValue="ASM-1912-432432" disabled={assessUpdateApi.loading} /></div>
            <div className="form-group"><label>Action (update/void)</label><input name="action" type="text" defaultValue="update" disabled={assessUpdateApi.loading} /></div>
            <div className="form-group"><label>Full Name</label><input name="fullName" type="text" defaultValue="Jon Chua" disabled={assessUpdateApi.loading} /></div>
            <div className="form-group"><label>Grade</label><input name="grade" type="text" defaultValue="B" disabled={assessUpdateApi.loading} /></div>
            <div className="form-group"><label>Score</label><input name="score" type="number" defaultValue="80" disabled={assessUpdateApi.loading} /></div>
            <div className="form-group"><label>Result</label><input name="result" type="text" defaultValue="Pass" disabled={assessUpdateApi.loading} /></div>
            <div className="form-group"><label>Skill Code</label><input name="skillCode" type="text" defaultValue="TGS-MKG-234222" disabled={assessUpdateApi.loading} /></div>
            <div className="form-group"><label>Assessment Date</label><input name="assessDate" type="text" defaultValue="2020-05-15" disabled={assessUpdateApi.loading} /></div>
            <div style={{ marginTop: 12 }}><button type="submit" disabled={assessUpdateApi.loading}>{assessUpdateApi.loading ? 'Updating...' : 'Update/Void Assessment'}</button></div>
          </form>
          {assessUpdateApi.error && <div className="error-alert">{assessUpdateApi.error}</div>}
          {assessUpdateApi.data && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <h3>Response</h3>
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 500, fontSize: 13 }}>{JSON.stringify(assessUpdateApi.data, null, 2)}</pre>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'assess-search') {
      return (
        <>
          <h2 className="page-title">Search Assessments</h2>
          <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>POST <code>/tpg/assessments/search</code> (v1).</p>
          <form className="course-result" autoComplete="off" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            handleAssessSearch({
              meta: { lastUpdateDateFrom: fd.get('dateFrom') as string, lastUpdateDateTo: fd.get('dateTo') as string },
              sortBy: { field: 'updatedOn', order: 'asc' },
              parameters: { page: Number(fd.get('page')) || 0, pageSize: Number(fd.get('pageSize')) || 20 },
              assessments: {
                course: { run: { id: fd.get('runId') as string }, referenceNumber: fd.get('courseRef') as string },
                trainee: { id: fd.get('traineeId') as string },
                enrolment: { referenceNumber: fd.get('enrolRef') as string },
                skillCode: fd.get('skillCode') as string,
                trainingPartner: { uen: fd.get('tpUen') as string, code: fd.get('tpCode') as string },
              },
            });
          }}>
            <div className="form-group"><label>Course Run ID</label><input name="runId" type="text" defaultValue="1002600" disabled={assessSearchApi.loading} /></div>
            <div className="form-group"><label>Course Reference Number</label><input name="courseRef" type="text" defaultValue="TGS-2020505444" disabled={assessSearchApi.loading} /></div>
            <div className="form-group"><label>Trainee ID</label><input name="traineeId" type="text" defaultValue="S0118316H" disabled={assessSearchApi.loading} /></div>
            <div className="form-group"><label>Enrolment Reference</label><input name="enrolRef" type="text" defaultValue="ENR-2001-123414" disabled={assessSearchApi.loading} /></div>
            <div className="form-group"><label>Skill Code</label><input name="skillCode" type="text" defaultValue="TGS-MKG-234222" disabled={assessSearchApi.loading} /></div>
            <div className="form-group"><label>Training Partner UEN</label><input name="tpUen" type="text" defaultValue="201200696W" disabled={assessSearchApi.loading} /></div>
            <div className="form-group"><label>Training Partner Code</label><input name="tpCode" type="text" defaultValue="201200696W-01" disabled={assessSearchApi.loading} /></div>
            <div className="form-group"><label>Date From</label><input name="dateFrom" type="text" defaultValue="2020-01-01" disabled={assessSearchApi.loading} /></div>
            <div className="form-group"><label>Date To</label><input name="dateTo" type="text" defaultValue="2020-01-01" disabled={assessSearchApi.loading} /></div>
            <div className="form-group"><label>Page</label><input name="page" type="number" defaultValue="0" disabled={assessSearchApi.loading} /></div>
            <div className="form-group"><label>Page Size</label><input name="pageSize" type="number" defaultValue="20" disabled={assessSearchApi.loading} /></div>
            <div style={{ marginTop: 12 }}><button type="submit" disabled={assessSearchApi.loading}>{assessSearchApi.loading ? 'Searching...' : 'Search Assessments'}</button></div>
          </form>
          {assessSearchApi.error && <div className="error-alert">{assessSearchApi.error}</div>}
          {assessSearchApi.data && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <h3>Search Results</h3>
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 500, fontSize: 13 }}>{JSON.stringify(assessSearchApi.data, null, 2)}</pre>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'assess-view') {
      return (
        <>
          <h2 className="page-title">View Assessment</h2>
          <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>GET <code>/tpg/assessments/details/&#123;assessmentRefNo&#125;</code> (v1).</p>
          <form className="course-result" autoComplete="off" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            handleAssessView(fd.get('refNo') as string);
          }}>
            <div className="form-group"><label>Assessment Reference Number</label><input name="refNo" type="text" defaultValue="ASM-2002-123456" disabled={assessViewApi.loading} /></div>
            <div style={{ marginTop: 12 }}><button type="submit" disabled={assessViewApi.loading}>{assessViewApi.loading ? 'Loading...' : 'View Assessment'}</button></div>
          </form>
          {assessViewApi.error && <div className="error-alert">{assessViewApi.error}</div>}
          {assessViewApi.data && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <h3>Assessment Details</h3>
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 500, fontSize: 13 }}>{JSON.stringify(assessViewApi.data, null, 2)}</pre>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'assess-codes') {
      return (
        <>
          <h2 className="page-title">Assessment Code Lookup</h2>
          <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>GET <code>/tpg/codes/assessments/idType</code> (v1).</p>
          <div className="course-result">
            <button onClick={handleAssessCodes} disabled={assessCodesApi.loading}>{assessCodesApi.loading ? 'Loading...' : 'Fetch Assessment ID Type Codes'}</button>
          </div>
          {assessCodesApi.error && <div className="error-alert">{assessCodesApi.error}</div>}
          {assessCodesApi.data && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <h3>Assessment ID Type Codes</h3>
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 500, fontSize: 13 }}>{JSON.stringify(assessCodesApi.data, null, 2)}</pre>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'sp-qualifications') {
      return (
        <>
          <h2 className="page-title">Retrieve Qualification</h2>
          <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>
            Retrieve qualification codes from Skills Passport. GET <code>/skillsPassport/codes/qualifications</code> (v1).
          </p>
          <form className="course-result" autoComplete="off" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const level = (fd.get('level') as string) || undefined;
            handleSpQualifications(level);
          }}>
            <div className="form-group">
              <label htmlFor="spLevel">Level (optional)</label>
              <input id="spLevel" name="level" type="text" defaultValue="1" placeholder="e.g. 1, 2, 3..." disabled={spQualificationsApi.loading} />
            </div>
            <div style={{ marginTop: 12 }}>
              <button type="submit" disabled={spQualificationsApi.loading}>
                {spQualificationsApi.loading ? 'Loading...' : 'Retrieve Qualifications'}
              </button>
            </div>
          </form>
          {spQualificationsApi.error && <div className="error-alert">{spQualificationsApi.error}</div>}
          {spQualificationsApi.loading && <div className="loading">Loading qualifications...</div>}
          {spQualificationsApi.data && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <h3>Qualifications Response</h3>
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 500, fontSize: 13 }}>
                {JSON.stringify(spQualificationsApi.data, null, 2)}
              </pre>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'sea-skill-extract') {
      return (
        <>
          <h2 className="page-title">Skill Extraction</h2>
          <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>
            Extract skills from text descriptions. POST <code>/skillExtract</code>.
          </p>
          <form className="course-result" autoComplete="off" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            handleSeaSkillExtract({
              textData: fd.get('textData') as string,
              modelVersion: fd.get('modelVersion') as string,
            });
          }}>
            <div className="form-group">
              <label htmlFor="seaTextData">Text Data</label>
              <textarea id="seaTextData" name="textData" rows={5} defaultValue="Sustainable Built Environment - apply the systems approach to incorporate natural ecosystems into the built environment through design; gain the necessary knowledge and skills to design and operate green buildings in accordance with Green Mark standards; and embrace waste reduction strategies such as recycling, reuse, and recovery, and learn about eco-friendly building materials properties and performance" disabled={seaSkillExtractApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="seaModelVersion">Model Version</label>
              <input id="seaModelVersion" name="modelVersion" type="text" defaultValue="1.1-240712" disabled={seaSkillExtractApi.loading} />
            </div>
            <div style={{ marginTop: 12 }}>
              <button type="submit" disabled={seaSkillExtractApi.loading}>
                {seaSkillExtractApi.loading ? 'Extracting...' : 'Extract Skills'}
              </button>
            </div>
          </form>
          {seaSkillExtractApi.error && <div className="error-alert">{seaSkillExtractApi.error}</div>}
          {seaSkillExtractApi.loading && <div className="loading">Extracting skills...</div>}
          {seaSkillExtractApi.data && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <h3>Skill Extraction Response</h3>
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 500, fontSize: 13 }}>
                {JSON.stringify(seaSkillExtractApi.data, null, 2)}
              </pre>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'sea-skill-search') {
      return (
        <>
          <h2 className="page-title">Skill Search</h2>
          <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>
            Search for skills from text descriptions. POST <code>/skillSearch</code>.
          </p>
          <form className="course-result" autoComplete="off" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            handleSeaSkillSearch({
              textData: fd.get('textData') as string,
              modelVersion: fd.get('modelVersion') as string,
            });
          }}>
            <div className="form-group">
              <label htmlFor="ssTextData">Text Data</label>
              <textarea id="ssTextData" name="textData" rows={5} defaultValue="Develop and implement digital marketing strategies for e-commerce platforms" disabled={seaSkillSearchApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="ssModelVersion">Model Version</label>
              <input id="ssModelVersion" name="modelVersion" type="text" defaultValue="1.1-240712" disabled={seaSkillSearchApi.loading} />
            </div>
            <div style={{ marginTop: 12 }}>
              <button type="submit" disabled={seaSkillSearchApi.loading}>
                {seaSkillSearchApi.loading ? 'Searching...' : 'Search Skills'}
              </button>
            </div>
          </form>
          {seaSkillSearchApi.error && <div className="error-alert">{seaSkillSearchApi.error}</div>}
          {seaSkillSearchApi.loading && <div className="loading">Searching skills...</div>}
          {seaSkillSearchApi.data && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <h3>Skill Search Response</h3>
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 500, fontSize: 13 }}>
                {JSON.stringify(seaSkillSearchApi.data, null, 2)}
              </pre>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'sfw-job-roles') {
      return (
        <>
          <h2 className="page-title">Get Job Role Details</h2>
          <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>
            Retrieve job role details from Skills Framework. GET <code>/sfw/skillsFramework/jobs</code> (v1.0).
          </p>
          <form className="course-result" autoComplete="off" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const params: Record<string, string> = {};
            for (const [k, v] of fd.entries()) {
              if (v) params[k] = v as string;
            }
            handleSfwJobRoles(params);
          }}>
            <div className="form-group">
              <label htmlFor="sfwPage">Page</label>
              <input id="sfwPage" name="page" type="text" defaultValue="1" disabled={sfwJobRolesApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="sfwPageSize">Page Size</label>
              <input id="sfwPageSize" name="pageSize" type="text" defaultValue="200" disabled={sfwJobRolesApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="sfwSector">Sector Title (optional)</label>
              <input id="sfwSector" name="sectorTitle" type="text" defaultValue="Wholesale Trade" disabled={sfwJobRolesApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="sfwTrack">Track Title (optional)</label>
              <input id="sfwTrack" name="trackTitle" type="text" defaultValue="Finance and Regulations" disabled={sfwJobRolesApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="sfwJobrole">Job Role Title (optional)</label>
              <input id="sfwJobrole" name="jobroleTitle" type="text" defaultValue="Head of Trade Finance" disabled={sfwJobRolesApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="sfwKeytask">Key Task Content (optional)</label>
              <input id="sfwKeytask" name="keytaskContent" type="text" defaultValue="Manage department's recruitment and retention efforts" disabled={sfwJobRolesApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="sfwSkillTitle">Skill Title (optional)</label>
              <input id="sfwSkillTitle" name="skillTitle" type="text" defaultValue="Organisational Analysis" disabled={sfwJobRolesApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="sfwVersion">SFW Version (optional)</label>
              <input id="sfwVersion" name="sfwVersion" type="text" defaultValue="sfw1.0" disabled={sfwJobRolesApi.loading} />
            </div>
            <div style={{ marginTop: 12 }}>
              <button type="submit" disabled={sfwJobRolesApi.loading}>
                {sfwJobRolesApi.loading ? 'Loading...' : 'Get Job Role Details'}
              </button>
            </div>
          </form>
          {sfwJobRolesApi.error && <div className="error-alert">{sfwJobRolesApi.error}</div>}
          {sfwJobRolesApi.loading && <div className="loading">Loading job role details...</div>}
          {sfwJobRolesApi.data && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <h3>Job Role Details Response</h3>
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 500, fontSize: 13 }}>
                {JSON.stringify(sfwJobRolesApi.data, null, 2)}
              </pre>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'sfw-skills') {
      return (
        <>
          <h2 className="page-title">Get Skills Details</h2>
          <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>
            Retrieve skills details from Skills Framework. GET <code>/sfw/skillsFramework/skills</code> (v1.0).
          </p>
          <form className="course-result" autoComplete="off" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const params: Record<string, string> = {};
            for (const [k, v] of fd.entries()) {
              if (v) params[k] = v as string;
            }
            handleSfwSkills(params);
          }}>
            <div className="form-group">
              <label htmlFor="sfwsPage">Page</label>
              <input id="sfwsPage" name="page" type="text" defaultValue="1" disabled={sfwSkillsApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="sfwsPageSize">Page Size</label>
              <input id="sfwsPageSize" name="pageSize" type="text" defaultValue="200" disabled={sfwSkillsApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="sfwsSector">Sector Title (optional)</label>
              <input id="sfwsSector" name="sectorTitle" type="text" defaultValue="Wholesale Trade" disabled={sfwSkillsApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="sfwsSkillTitle">Skill Title (optional)</label>
              <input id="sfwsSkillTitle" name="skillTitle" type="text" defaultValue="Organisational Analysis" disabled={sfwSkillsApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="sfwsTscCode">TSC Code (optional)</label>
              <input id="sfwsTscCode" name="tscCode" type="text" defaultValue="WST-SPI-5002-1.1" disabled={sfwSkillsApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="sfwsSkillType">Skill Type (optional)</label>
              <input id="sfwsSkillType" name="skillType" type="text" defaultValue="tsc" disabled={sfwSkillsApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="sfwsVersion">SFW Version (optional)</label>
              <input id="sfwsVersion" name="sfwVersion" type="text" defaultValue="sfw1.0" disabled={sfwSkillsApi.loading} />
            </div>
            <div style={{ marginTop: 12 }}>
              <button type="submit" disabled={sfwSkillsApi.loading}>
                {sfwSkillsApi.loading ? 'Loading...' : 'Get Skills Details'}
              </button>
            </div>
          </form>
          {sfwSkillsApi.error && <div className="error-alert">{sfwSkillsApi.error}</div>}
          {sfwSkillsApi.loading && <div className="loading">Loading skills details...</div>}
          {sfwSkillsApi.data && (
            <div className="course-result" style={{ marginTop: 16 }}>
              <h3>Skills Details Response</h3>
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 500, fontSize: 13 }}>
                {JSON.stringify(sfwSkillsApi.data, null, 2)}
              </pre>
            </div>
          )}
        </>
      );
    }

    if (activePage === 'tools-generate-cert') {
      return (
        <>
          <h2 className="page-title">Generate Certificate</h2>
          <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>
            Generate a self-signed X.509 certificate using OpenSSL. Output files are in <code>.pem</code> format.
          </p>
          <form className="course-result" autoComplete="off" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            handleGenerateCert({
              commonName: fd.get('commonName') as string,
              organization: fd.get('organization') as string,
              country: fd.get('country') as string,
              days: fd.get('days') as string,
              keySize: fd.get('keySize') as string,
            });
          }}>
            <div className="form-group">
              <label htmlFor="certCN">Common Name (CN)</label>
              <input id="certCN" name="commonName" type="text" defaultValue="api.ssg-wsg.sg" disabled={generateCertApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="certO">Organization (O)</label>
              <input id="certO" name="organization" type="text" defaultValue="Tertiary Infotech Academy Pte Ltd" disabled={generateCertApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="certC">Country (C)</label>
              <input id="certC" name="country" type="text" defaultValue="SG" disabled={generateCertApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="certDays">Validity (days)</label>
              <input id="certDays" name="days" type="text" defaultValue="3650" disabled={generateCertApi.loading} />
            </div>
            <div className="form-group">
              <label htmlFor="certKeySize">Key Size (bits)</label>
              <input id="certKeySize" name="keySize" type="text" defaultValue="4096" disabled={generateCertApi.loading} />
            </div>
            <div style={{ marginTop: 12 }}>
              <button type="submit" disabled={generateCertApi.loading}>
                {generateCertApi.loading ? 'Generating...' : 'Generate Certificate'}
              </button>
            </div>
          </form>
          {generateCertApi.error && <div className="error-alert">{generateCertApi.error}</div>}
          {generateCertApi.loading && <div className="loading">Generating certificate with OpenSSL...</div>}
          {generateCertApi.data && (
            <>
              <div className="course-result" style={{ marginTop: 16 }}>
                <h3>OpenSSL Command Used</h3>
                <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 13 }}>
                  {generateCertApi.data.command}
                </pre>
              </div>
              <div className="course-result" style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>cert.pem</h3>
                  <button onClick={() => {
                    const blob = new Blob([generateCertApi.data!.cert], { type: 'application/x-pem-file' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = 'cert.pem'; a.click();
                    URL.revokeObjectURL(url);
                  }}>Download cert.pem</button>
                </div>
                <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 300, fontSize: 13, marginTop: 8 }}>
                  {generateCertApi.data.cert}
                </pre>
              </div>
              <div className="course-result" style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>key.pem</h3>
                  <button onClick={() => {
                    const blob = new Blob([generateCertApi.data!.key], { type: 'application/x-pem-file' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = 'key.pem'; a.click();
                    URL.revokeObjectURL(url);
                  }}>Download key.pem</button>
                </div>
                <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 300, fontSize: 13, marginTop: 8 }}>
                  {generateCertApi.data.key}
                </pre>
              </div>
            </>
          )}
        </>
      );
    }

    if (activePage === 'tools-generate-keypair') {
      return (
        <>
          <h2 className="page-title">Generate Digital Signature</h2>
          <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>
            Generate an RSA key pair using OpenSSL. Outputs private key (<code>key.pem</code>) and public key (<code>public.pem</code>) in .pem format, plus a stripped public key (no headers/newlines).
          </p>
          <form className="course-result" autoComplete="off" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            handleGenerateKeypair(fd.get('keySize') as string);
          }}>
            <div className="form-group">
              <label htmlFor="kpKeySize">Key Size (bits)</label>
              <input id="kpKeySize" name="keySize" type="text" defaultValue="2048" disabled={generateKeypairApi.loading} />
            </div>
            <div style={{ marginTop: 12 }}>
              <button type="submit" disabled={generateKeypairApi.loading}>
                {generateKeypairApi.loading ? 'Generating...' : 'Generate Key Pair'}
              </button>
            </div>
          </form>
          {generateKeypairApi.error && <div className="error-alert">{generateKeypairApi.error}</div>}
          {generateKeypairApi.loading && <div className="loading">Generating key pair with OpenSSL...</div>}
          {generateKeypairApi.data && (
            <>
              <div className="course-result" style={{ marginTop: 16 }}>
                <h3>OpenSSL Commands Used</h3>
                <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 13 }}>
                  {generateKeypairApi.data.commands.join('\n')}
                </pre>
              </div>
              <div className="course-result" style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>key.pem (Private Key)</h3>
                  <button onClick={() => {
                    const blob = new Blob([generateKeypairApi.data!.privateKey], { type: 'application/x-pem-file' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = 'key.pem'; a.click();
                    URL.revokeObjectURL(url);
                  }}>Download key.pem</button>
                </div>
                <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 300, fontSize: 13, marginTop: 8 }}>
                  {generateKeypairApi.data.privateKey}
                </pre>
              </div>
              <div className="course-result" style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>public.pem (Public Key)</h3>
                  <button onClick={() => {
                    const blob = new Blob([generateKeypairApi.data!.publicKeyPem], { type: 'application/x-pem-file' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = 'public.pem'; a.click();
                    URL.revokeObjectURL(url);
                  }}>Download public.pem</button>
                </div>
                <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 200, fontSize: 13, marginTop: 8 }}>
                  {generateKeypairApi.data.publicKeyPem}
                </pre>
              </div>
              <div className="course-result" style={{ marginTop: 16 }}>
                <h3>Public Key (stripped — no headers/newlines)</h3>
                <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 13, wordBreak: 'break-all' }}>
                  {generateKeypairApi.data.publicKeyStripped}
                </pre>
              </div>
            </>
          )}
        </>
      );
    }

    if (activePage === 'tools-encryption-key') {
      return (
        <>
          <h2 className="page-title">Generate Encryption Key</h2>
          <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>
            Generate a random base64-encoded encryption key using OpenSSL. Command: <code>openssl rand -base64 {'<bytes>'}</code>
          </p>
          <form className="course-result" autoComplete="off" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            handleEncryptionKey(fd.get('bytes') as string);
          }}>
            <div className="form-group">
              <label htmlFor="ekBytes">Key Size (bytes)</label>
              <input id="ekBytes" name="bytes" type="text" defaultValue="32" disabled={encryptionKeyApi.loading} />
            </div>
            <div style={{ marginTop: 12 }}>
              <button type="submit" disabled={encryptionKeyApi.loading}>
                {encryptionKeyApi.loading ? 'Generating...' : 'Generate Encryption Key'}
              </button>
            </div>
          </form>
          {encryptionKeyApi.error && <div className="error-alert">{encryptionKeyApi.error}</div>}
          {encryptionKeyApi.loading && <div className="loading">Generating encryption key...</div>}
          {encryptionKeyApi.data && (
            <>
              <div className="course-result" style={{ marginTop: 16 }}>
                <h3>OpenSSL Command Used</h3>
                <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 13 }}>
                  {encryptionKeyApi.data.command}
                </pre>
              </div>
              <div className="course-result" style={{ marginTop: 16 }}>
                <h3>Generated Key (base64)</h3>
                <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 13, wordBreak: 'break-all' }}>
                  {encryptionKeyApi.data.key}
                </pre>
              </div>
            </>
          )}
        </>
      );
    }

    if (activePage === 'api-issues') {
      return (
        <>
          <h2 className="page-title">Known API Issues</h2>
          <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>
            Issues encountered when calling SSG production APIs. Use this as a reference when troubleshooting API errors.
          </p>

          <div className="course-result" style={{ marginTop: 16 }}>
            <h3>APIs with Errors</h3>
            <table className="sessions-table">
              <thead>
                <tr>
                  <th>API</th>
                  <th>Auth Method</th>
                  <th>HTTP Method</th>
                  <th>Endpoint</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Error / Reason</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Course Lookup</td><td>Certificate</td><td>GET</td><td>api.ssg-wsg.sg/courses/directory/&#123;refNo&#125;</td><td>v1.2</td><td style={{ color: '#d32f2f', fontWeight: 600 }}>403</td><td>Access disallowed — OAuth fallback works</td></tr>
                <tr><td>Popular Courses</td><td>Certificate</td><td>GET</td><td>api.ssg-wsg.sg/courses/directory/popular</td><td>v1.1</td><td style={{ color: '#d32f2f', fontWeight: 600 }}>403</td><td>API version has expired</td></tr>
                <tr><td>Popular Courses</td><td>OAuth</td><td>GET</td><td>public-api.ssg-wsg.sg/courses/directory/popular</td><td>v1.1</td><td style={{ color: '#d32f2f', fontWeight: 600 }}>403</td><td>API version has expired</td></tr>
                <tr><td>Course Quality</td><td>Certificate</td><td>GET</td><td>api.ssg-wsg.sg/courses/directory/&#123;refNo&#125;/quality</td><td>v2.0</td><td style={{ color: '#d32f2f', fontWeight: 600 }}>403</td><td>Access disallowed — OAuth fallback returns 200</td></tr>
                <tr><td>Course Outcome</td><td>Certificate</td><td>GET</td><td>api.ssg-wsg.sg/courses/directory/&#123;refNo&#125;/outcome</td><td>v2.0</td><td style={{ color: '#d32f2f', fontWeight: 600 }}>403</td><td>Access disallowed — OAuth fallback returns 200</td></tr>
                <tr><td>Course Sessions</td><td>Certificate + OAuth</td><td>GET</td><td>api.ssg-wsg.sg/courses/runs/&#123;runId&#125;/sessions</td><td>v1.5</td><td style={{ color: '#d32f2f', fontWeight: 600 }}>403</td><td>Access to this API has been disallowed</td></tr>
                <tr><td>Session Attendance</td><td>Certificate + OAuth</td><td>GET</td><td>api.ssg-wsg.sg/courses/runs/&#123;runId&#125;/sessions/attendance</td><td>v1.5</td><td style={{ color: '#d32f2f', fontWeight: 600 }}>403</td><td>Access to this API has been disallowed</td></tr>
                <tr><td>Upload Attendance</td><td>Certificate + AES</td><td>POST</td><td>api.ssg-wsg.sg/courses/runs/&#123;runId&#125;/sessions/attendance</td><td>v1.5</td><td style={{ color: '#666' }}>Varies</td><td>No OAuth fallback — cert + AES only</td></tr>
                <tr><td>Course Run by ID</td><td>Certificate + OAuth</td><td>GET</td><td>api.ssg-wsg.sg/courses/courseRuns/id/&#123;runId&#125;</td><td>v1.0</td><td style={{ color: '#d32f2f', fontWeight: 600 }}>403</td><td>Access to this API has been disallowed</td></tr>
                <tr><td>Retrieve Trainer Details</td><td>Certificate + OAuth</td><td>GET</td><td>api.ssg-wsg.sg/trainingProviders/&#123;uen&#125;/trainers</td><td>v2.0</td><td style={{ color: '#d32f2f', fontWeight: 600 }}>500</td><td>Non-JSON response (possibly encrypted)</td></tr>
                <tr><td>Update/Delete Trainer</td><td>Certificate</td><td>POST</td><td>api.ssg-wsg.sg/trainingProviders/&#123;uen&#125;/trainers/&#123;trainerId&#125;</td><td>v2.0</td><td style={{ color: '#d32f2f', fontWeight: 600 }}>400</td><td>Unable to perform decryption due invalid request</td></tr>
                <tr><td>Update/Delete Trainer</td><td>OAuth</td><td>POST</td><td>public-api.ssg-wsg.sg/trainingProviders/&#123;uen&#125;/trainers/&#123;trainerId&#125;</td><td>v2.0</td><td style={{ color: '#d32f2f', fontWeight: 600 }}>403</td><td>Access to this API has been disallowed</td></tr>
                <tr><td>Grant Baseline</td><td>Certificate + OAuth</td><td>POST</td><td>api.ssg-wsg.sg/grants/calculator/baseline</td><td>v3.0</td><td style={{ color: '#d32f2f', fontWeight: 600 }}>403</td><td>This API version does not seem to exist</td></tr>
                <tr><td>Grant Personalised</td><td>Certificate + OAuth</td><td>POST</td><td>api.ssg-wsg.sg/grants/calculator/personalised</td><td>v3.0</td><td style={{ color: '#d32f2f', fontWeight: 600 }}>403</td><td>This API version does not seem to exist</td></tr>
                <tr><td>Grant Search</td><td>Certificate + OAuth</td><td>POST</td><td>api.ssg-wsg.sg/grants/search</td><td>v1.0</td><td style={{ color: '#d32f2f', fontWeight: 600 }}>500</td><td>Non-JSON response from OAuth fallback</td></tr>
                <tr><td>Grant Codes</td><td>Certificate + OAuth</td><td>GET</td><td>api.ssg-wsg.sg/grants/codes/fundingComponent</td><td>v1</td><td style={{ color: '#d32f2f', fontWeight: 600 }}>500</td><td>Non-JSON response from OAuth fallback</td></tr>
                <tr><td>SF View Claim</td><td>Certificate + OAuth</td><td>GET</td><td>api.ssg-wsg.sg/skillsFutureCredits/claims/&#123;claimId&#125;</td><td>v2</td><td style={{ color: '#d32f2f', fontWeight: 600 }}>403</td><td>Access to this API has been disallowed</td></tr>
                <tr><td>SF Cancel Claim</td><td>Certificate</td><td>POST</td><td>api.ssg-wsg.sg/skillsFutureCredits/claims/&#123;claimId&#125;/cancel</td><td>v2</td><td style={{ color: '#d32f2f', fontWeight: 600 }}>400</td><td>Unable to perform decryption due invalid request</td></tr>
                <tr><td>SF Encrypt Request</td><td>Certificate</td><td>POST</td><td>api.ssg-wsg.sg/skillsFutureCredits/claims/encryptRequests</td><td>v2</td><td style={{ color: '#d32f2f', fontWeight: 600 }}>400</td><td>Unable to perform decryption due invalid request</td></tr>
                <tr><td>SF Decrypt Request</td><td>Certificate</td><td>POST</td><td>api.ssg-wsg.sg/skillsFutureCredits/claims/decryptRequests</td><td>v2</td><td style={{ color: '#d32f2f', fontWeight: 600 }}>400</td><td>Unable to perform decryption due invalid request</td></tr>
                <tr><td>Enrolment Search</td><td>Certificate + OAuth</td><td>POST</td><td>api.ssg-wsg.sg/enrolments/search</td><td>v3.0</td><td style={{ color: '#d32f2f', fontWeight: 600 }}>500</td><td>Non-JSON response from OAuth fallback</td></tr>
                <tr><td>Enrolment Codes</td><td>Certificate + OAuth</td><td>GET</td><td>api.ssg-wsg.sg/enrolments/codes/sponsorshipType</td><td>v3.0</td><td style={{ color: '#d32f2f', fontWeight: 600 }}>500</td><td>Non-JSON response from OAuth fallback</td></tr>
                <tr><td>Assessment Search</td><td>Certificate + OAuth</td><td>POST</td><td>api.ssg-wsg.sg/assessments/search</td><td>v1</td><td style={{ color: '#d32f2f', fontWeight: 600 }}>500</td><td>Non-JSON response from OAuth fallback</td></tr>
                <tr><td>Assessment Codes</td><td>Certificate + OAuth</td><td>GET</td><td>api.ssg-wsg.sg/assessments/codes/idType</td><td>v1</td><td style={{ color: '#d32f2f', fontWeight: 600 }}>500</td><td>Non-JSON response from OAuth fallback</td></tr>
                <tr><td>Skills Passport Qualifications</td><td>Certificate + OAuth</td><td>GET</td><td>api.ssg-wsg.sg/skillsPassport/codes/qualifications</td><td>v1</td><td style={{ color: '#d32f2f', fontWeight: 600 }}>404</td><td>Not Found (API returns 404 inside 200 response)</td></tr>
                <tr><td>Skill Extraction (SEA)</td><td>Certificate + OAuth</td><td>POST</td><td>api.ssg-wsg.sg/skillExtract</td><td>v1</td><td style={{ color: '#d32f2f', fontWeight: 600 }}>500</td><td>Non-JSON response from OAuth fallback</td></tr>
                <tr><td>Skill Search (SEA)</td><td>Certificate + OAuth</td><td>POST</td><td>api.ssg-wsg.sg/skillSearch</td><td>v1</td><td style={{ color: '#d32f2f', fontWeight: 600 }}>500</td><td>Non-JSON response from OAuth fallback</td></tr>
                <tr><td>Skills Framework Jobs</td><td>Certificate + OAuth</td><td>GET</td><td>api.ssg-wsg.sg/sfw/skillsFramework/jobs</td><td>v1.0</td><td style={{ color: '#d32f2f', fontWeight: 600 }}>500</td><td>Non-JSON response from OAuth fallback</td></tr>
                <tr><td>Skills Framework Skills</td><td>Certificate + OAuth</td><td>GET</td><td>api.ssg-wsg.sg/sfw/skillsFramework/skills</td><td>v1.0</td><td style={{ color: '#d32f2f', fontWeight: 600 }}>500</td><td>Non-JSON response from OAuth fallback</td></tr>
              </tbody>
            </table>
          </div>

          <div className="course-result" style={{ marginTop: 16 }}>
            <h3>Working APIs</h3>
            <table className="sessions-table">
              <thead>
                <tr>
                  <th>API</th>
                  <th>Auth Method</th>
                  <th>HTTP Method</th>
                  <th>Endpoint</th>
                  <th>Version</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Course Search (TPG Registry)</td><td>Certificate</td><td>POST</td><td>api.ssg-wsg.sg/tpg/courses/registry/search</td><td>v8.0</td><td style={{ color: '#2e7d32', fontWeight: 600 }}>200</td></tr>
                <tr><td>Course Details (TPG Registry)</td><td>Certificate</td><td>GET</td><td>api.ssg-wsg.sg/tpg/courses/registry/details/&#123;refNo&#125;</td><td>v8.0</td><td style={{ color: '#2e7d32', fontWeight: 600 }}>200</td></tr>
                <tr><td>Courses by TP UEN</td><td>Certificate</td><td>POST</td><td>api.ssg-wsg.sg/tpg/courses/registry/search (via UEN filter)</td><td>v8.0</td><td style={{ color: '#2e7d32', fontWeight: 600 }}>200</td></tr>
                <tr><td>Course Lookup by Ref No</td><td>OAuth (fallback)</td><td>GET</td><td>public-api.ssg-wsg.sg/courses/directory/&#123;refNo&#125;</td><td>v1.2</td><td style={{ color: '#2e7d32', fontWeight: 600 }}>200</td></tr>
                <tr><td>Course Quality</td><td>OAuth (fallback)</td><td>GET</td><td>public-api.ssg-wsg.sg/courses/directory/&#123;refNo&#125;/quality</td><td>v2.0</td><td style={{ color: '#2e7d32', fontWeight: 600 }}>200</td></tr>
                <tr><td>Course Outcome</td><td>OAuth (fallback)</td><td>GET</td><td>public-api.ssg-wsg.sg/courses/directory/&#123;refNo&#125;/outcome</td><td>v2.0</td><td style={{ color: '#2e7d32', fontWeight: 600 }}>200</td></tr>
                <tr><td>Course Runs by Ref No</td><td>OAuth (fallback)</td><td>GET</td><td>public-api.ssg-wsg.sg/courses/courseRuns/reference</td><td>v1.0</td><td style={{ color: '#2e7d32', fontWeight: 600 }}>200</td></tr>
                <tr><td>Grant Details</td><td>Certificate + OAuth</td><td>GET</td><td>api.ssg-wsg.sg/grants/details/&#123;grantRefNo&#125;</td><td>v1</td><td style={{ color: '#2e7d32', fontWeight: 600 }}>200</td></tr>
                <tr><td>Enrolment View</td><td>Certificate + OAuth</td><td>GET</td><td>api.ssg-wsg.sg/enrolments/details/&#123;refNo&#125;</td><td>v3.0</td><td style={{ color: '#2e7d32', fontWeight: 600 }}>200</td></tr>
                <tr><td>Assessment View</td><td>Certificate + OAuth</td><td>GET</td><td>api.ssg-wsg.sg/assessments/details/&#123;refNo&#125;</td><td>v1</td><td style={{ color: '#2e7d32', fontWeight: 600 }}>200</td></tr>
              </tbody>
            </table>
          </div>

          <div className="course-result" style={{ marginTop: 16 }}>
            <h3>Common Error Codes</h3>
            <table className="sessions-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Meaning</th>
                  <th>Likely Cause</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style={{ fontWeight: 600 }}>400</td><td>Bad Request</td><td>Malformed payload; cert API may expect AES-encrypted body</td></tr>
                <tr><td style={{ fontWeight: 600 }}>403</td><td>Forbidden</td><td>Credentials lack permission for this endpoint, or API version expired</td></tr>
                <tr><td style={{ fontWeight: 600 }}>404</td><td>Not Found</td><td>Endpoint path incorrect or resource does not exist</td></tr>
                <tr><td style={{ fontWeight: 600 }}>500</td><td>Internal Server Error</td><td>SSG returns non-JSON (encrypted) response; OAuth fallback may also return encrypted data</td></tr>
              </tbody>
            </table>
          </div>
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
