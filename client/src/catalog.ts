// SSG / SWDA API catalogue shown on the public "Discover APIs" page.
// Grouping follows https://developer.swda.gov.sg/webapp/api-discovery
// (Courses · Programmes for Individual · Skills · Resources). `page` is the
// id of the matching test page in the signed-in console (App.tsx).

export type AuthMode = 'cert' | 'cert+oauth' | 'cert+aes' | 'local';
export type HttpMethod = 'GET' | 'POST';

export interface ApiEntry {
  page: string;
  name: string;
  method: HttpMethod;
  path: string;
  version: string;
  auth: AuthMode;
  desc: string;
  /** true when the call changes data on SSG (create / update / cancel / upload). */
  writes?: boolean;
  /** ISO date this exact request was last seen returning 200 from live SSG. */
  verified?: string;
}

export interface ApiGroup {
  id: string;
  name: string;
  desc: string;
  docs?: string;
  apis: ApiEntry[];
}

export interface ApiProduct {
  id: string;
  name: string;
  desc: string;
  groups: ApiGroup[];
}

const DOCS = 'https://developer.swda.gov.sg/webapp/docs/product';

export const CATALOG: ApiProduct[] = [
  {
    id: 'courses',
    name: 'Courses',
    desc: 'Course information on MySkillsFuture and the Training Partners Gateway: directory, feedback, course runs, sessions and trainers.',
    groups: [
      {
        id: 'courses',
        name: 'Courses',
        desc: 'Search and retrieve SkillsFuture Credit eligible courses and their details.',
        docs: `${DOCS}/6kYpfJEWVb7NyYVVHvUmHi/group/2reSbYZjfhi3WWeLp4BlQ4`,
        apis: [
          { page: 'course-lookup', name: 'Course Lookup by Reference Number', method: 'GET', path: '/courses/directory/{refNo}', version: 'v1.2', auth: 'cert+oauth', desc: 'Retrieve one course by its TGS reference number.', verified: '2026-11-16' },
          { page: 'course-search', name: 'Course Search (TPG Registry)', method: 'POST', path: '/tpg/courses/registry/search', version: 'v2.0', auth: 'cert', desc: 'Search the TPG course registry by keyword, with paging.', verified: '2026-11-16' },
          { page: 'course-lookup', name: 'Course Details (TPG Registry)', method: 'GET', path: '/tpg/courses/registry/details/{refNo}', version: 'v2.0', auth: 'cert', desc: 'Full registry record of a course, including funding support.', verified: '2026-11-16' },
          { page: 'popular-courses', name: 'Popular Courses', method: 'GET', path: '/courses/directory/popular', version: 'v1.2', auth: 'cert+oauth', desc: 'Courses most viewed on MySkillsFuture.' },
          { page: 'tp-courses', name: 'Courses by Training Provider UEN', method: 'POST', path: '/tpg/courses/registry/search', version: 'v2.0', auth: 'cert', desc: 'List every course registered under a training provider UEN.', verified: '2026-11-16' },
        ],
      },
      {
        id: 'course-feedback',
        name: 'Course Feedback',
        desc: 'Trainee feedback on courses: quality ratings and outcomes.',
        docs: `${DOCS}/6kYpfJEWVb7NyYVVHvUmHi/group/4ZAnZL1CuTqNCd8pqGJewr`,
        apis: [
          { page: 'course-quality', name: 'Retrieve Course Quality', method: 'GET', path: '/courses/directory/{refNo}/quality', version: 'v2.0', auth: 'cert+oauth', desc: 'Quality survey ratings for a course.' },
          { page: 'course-outcome', name: 'Retrieve Course Outcome', method: 'GET', path: '/courses/directory/{refNo}/outcome', version: 'v2.0', auth: 'cert+oauth', desc: 'Outcome survey results for a course.' },
        ],
      },
      {
        id: 'training-providers',
        name: 'Training Providers',
        desc: 'Course runs, sessions, attendance and trainers for training providers.',
        docs: `${DOCS}/6kYpfJEWVb7NyYVVHvUmHi/group/374zmR5D0tQeS87eA1hrLV`,
        apis: [
          { page: 'course-sessions', name: 'Retrieve Course Sessions', method: 'GET', path: '/courses/runs/{runId}/sessions', version: 'v1.5', auth: 'cert+oauth', desc: 'Sessions of a course run.' },
          { page: 'session-attendance', name: 'Retrieve Session Attendance', method: 'GET', path: '/courses/runs/{runId}/sessions/attendance', version: 'v1.5', auth: 'cert+oauth', desc: 'Attendance records of a course session.' },
          { page: 'upload-attendance', name: 'Upload Session Attendance', method: 'POST', path: '/courses/runs/{runId}/sessions/attendance', version: 'v1.5', auth: 'cert+aes', desc: 'Upload a trainee attendance record for a session.', writes: true },
          { page: 'trainer-details', name: 'Retrieve Trainer Details', method: 'GET', path: '/trainingProviders/{uen}/trainers', version: 'v2.0', auth: 'cert+oauth', desc: 'Trainers registered under a training provider.' },
          { page: 'update-trainer', name: 'Update / Delete Trainer', method: 'POST', path: '/trainingProviders/{uen}/trainers/{trainerId}', version: 'v2.0', auth: 'cert+oauth', desc: 'Update or remove a trainer profile.', writes: true },
          { page: 'publish-course-run', name: 'Publish Course Run', method: 'POST', path: '/courses/courseRuns/publish', version: 'v1.2', auth: 'cert+aes', desc: 'Publish a new course run with sessions and trainers.', writes: true },
          { page: 'edit-course-run', name: 'Update / Delete Course Run', method: 'POST', path: '/courses/courseRuns/edit/{runId}', version: 'v1.2', auth: 'cert+aes', desc: 'Edit or delete an existing course run.', writes: true },
          { page: 'course-run-by-id', name: 'Retrieve Course Run by ID', method: 'GET', path: '/courses/courseRuns/id/{runId}', version: 'v1.0', auth: 'cert+oauth', desc: 'One course run by its run ID.' },
          { page: 'course-runs-by-ref', name: 'Retrieve Course Runs by Reference Number', method: 'GET', path: '/courses/courseRuns/reference', version: 'v1.0', auth: 'cert+oauth', desc: 'All course runs of a course reference number.' },
        ],
      },
    ],
  },
  {
    id: 'programmes',
    name: 'Programmes for Individual',
    desc: 'Grant Calculator, SkillsFuture Credit Pay, enrolments and assessments.',
    groups: [
      {
        id: 'grant-calculator',
        name: 'Grant Calculator',
        desc: 'Compute nett course fees and look up grants.',
        docs: `${DOCS}/7KU1xrpxljJZnsIkJP6QNF/group/IUAJ3XXeGEZuk9yGpoUX3`,
        apis: [
          { page: 'grant-baseline', name: 'Grant Calculator — Baseline Scheme', method: 'POST', path: '/grantCalculators/individual', version: 'v1.0', auth: 'cert+oauth', desc: 'Baseline funding and nett fee for a course.' },
          { page: 'grant-personalised', name: 'Grant Calculator — Personalised', method: 'POST', path: '/grantCalculators/individual/personalised', version: 'v1.0', auth: 'cert+oauth', desc: 'Funding for a named trainee based on eligibility.' },
          { page: 'grant-search', name: 'Search Grants', method: 'POST', path: '/tpg/grants/search', version: 'none', auth: 'cert+aes', desc: 'Search grant records by course, trainee or enrolment.', verified: '2026-11-16' },
          { page: 'grant-view', name: 'View Grant Details', method: 'GET', path: '/tpg/grants/details/{grantRefNo}', version: 'v1', auth: 'cert+oauth', desc: 'One grant record by its reference number.' },
          { page: 'grant-codes', name: 'Grants Code Lookup', method: 'GET', path: '/tpg/codes/grants/fundingComponent', version: 'v1', auth: 'cert+oauth', desc: 'Funding component codes.' },
        ],
      },
      {
        id: 'sfc-pay',
        name: 'SkillsFuture Credit Pay',
        desc: 'SkillsFuture Credit claims made during course registration.',
        docs: `${DOCS}/7KU1xrpxljJZnsIkJP6QNF/group/2RTLOUTuE3Dkgf7MOdn0Cm`,
        apis: [
          { page: 'sf-view-claim', name: 'View Claim Details', method: 'GET', path: '/skillsFutureCredits/claims/{claimId}', version: 'v2', auth: 'cert+oauth', desc: 'Status and details of a SkillsFuture Credit claim.' },
          { page: 'sf-cancel-claim', name: 'Cancel Claim', method: 'POST', path: '/skillsFutureCredits/claims/{claimId}', version: 'v2', auth: 'cert+oauth', desc: 'Cancel a SkillsFuture Credit claim.', writes: true },
          { page: 'sf-upload-docs', name: 'Upload Supporting Documents', method: 'POST', path: '/skillsFutureCredits/claims/{claimId}/supportingdocuments', version: 'v2', auth: 'cert+oauth', desc: 'Attach supporting documents to a claim.', writes: true },
          { page: 'sf-encrypt-request', name: 'Request Encryption', method: 'POST', path: '/skillsFutureCredits/claims/encryptRequests', version: 'v2', auth: 'cert+aes', desc: 'Encrypt a claim request before redirecting the trainee.' },
          { page: 'sf-decrypt-request', name: 'Request Decryption', method: 'POST', path: '/skillsFutureCredits/claims/decryptRequests', version: 'v2', auth: 'cert+aes', desc: 'Decrypt the claim response returned to your site.' },
        ],
      },
      {
        id: 'enrolments',
        name: 'Enrolments',
        desc: 'Trainee enrolment records on the Training Partners Gateway.',
        docs: `${DOCS}/7KU1xrpxljJZnsIkJP6QNF/group/adg1EGw5xjv6Fs40BTrK8`,
        apis: [
          { page: 'enrol-create', name: 'Create Enrolment', method: 'POST', path: '/tpg/enrolments', version: 'v3.0', auth: 'cert+aes', desc: 'Enrol a trainee in a course run.', writes: true },
          { page: 'enrol-update', name: 'Update / Cancel Enrolment', method: 'POST', path: '/tpg/enrolments/details/{refNo}', version: 'v3.0', auth: 'cert+aes', desc: 'Update or cancel an enrolment record.', writes: true },
          { page: 'enrol-search', name: 'Search Enrolments', method: 'POST', path: '/tpg/enrolments/search', version: 'none', auth: 'cert+aes', desc: 'Search enrolments by course run, trainee or status.', verified: '2026-11-16' },
          { page: 'enrol-view', name: 'View Enrolment', method: 'GET', path: '/tpg/enrolments/details/{refNo}', version: 'v3.0', auth: 'cert+oauth', desc: 'One enrolment record by its reference number.' },
          { page: 'enrol-fee-collection', name: 'Update Enrolment Fee Collection', method: 'POST', path: '/tpg/enrolments/feeCollections/{refNo}', version: 'v3.0', auth: 'cert+aes', desc: 'Update the fee collection status of an enrolment.', writes: true },
          { page: 'enrol-codes', name: 'Enrolment Code Lookup', method: 'GET', path: '/tpg/enrolments/codes', version: 'v1.0.0', auth: 'cert+oauth', desc: 'Sponsorship type and other enrolment codes.' },
        ],
      },
      {
        id: 'assessments',
        name: 'Assessments',
        desc: 'Trainee assessment records on the Training Partners Gateway.',
        docs: `${DOCS}/7KU1xrpxljJZnsIkJP6QNF/group/3540ZmPQma3rcanoBfNYff`,
        apis: [
          { page: 'assess-create', name: 'Create Assessment', method: 'POST', path: '/tpg/assessments', version: 'v1', auth: 'cert+aes', desc: 'Submit an assessment result for a trainee.', writes: true },
          { page: 'assess-update', name: 'Update / Void Assessment', method: 'POST', path: '/tpg/assessments/details/{refNo}', version: 'v1', auth: 'cert+aes', desc: 'Update or void an assessment record.', writes: true },
          { page: 'assess-search', name: 'Search Assessments', method: 'POST', path: '/tpg/assessments/search', version: 'v1', auth: 'cert+aes', desc: 'Search assessments by course run or trainee.' },
          { page: 'assess-view', name: 'View Assessment', method: 'GET', path: '/tpg/assessments/details/{refNo}', version: 'v1', auth: 'cert+oauth', desc: 'One assessment record by its reference number.' },
          { page: 'assess-codes', name: 'Assessment Code Lookup', method: 'GET', path: '/tpg/codes/assessments/idType', version: 'v1', auth: 'cert+oauth', desc: 'ID type codes used in assessment records.' },
        ],
      },
    ],
  },
  {
    id: 'skills',
    name: 'Skills',
    desc: 'Individuals’ skills data and skills extraction.',
    groups: [
      {
        id: 'skills-passport',
        name: 'Skills Passport',
        desc: 'Qualification codes from the Skills Passport.',
        docs: `${DOCS}/4ZCqa7uABJeR6vtKUjsxyx/group/6NqcljmEXinhh5SP9drNXL`,
        apis: [
          { page: 'sp-qualifications', name: 'Retrieve Qualifications', method: 'GET', path: '/skillsPassport/codes/qualifications', version: 'v1', auth: 'cert+oauth', desc: 'SSEC-EQA qualification codes.' },
        ],
      },
      {
        id: 'sea',
        name: 'Skills Extraction (SEA)',
        desc: 'Extract and search skills from free text.',
        apis: [
          { page: 'sea-skill-extract', name: 'Skill Extraction', method: 'POST', path: '/skillExtract', version: 'v1', auth: 'cert+oauth', desc: 'Extract skills from a text description.' },
          { page: 'sea-skill-search', name: 'Skill Search', method: 'POST', path: '/skillSearch', version: 'v1', auth: 'cert+oauth', desc: 'Search the skills taxonomy by keyword.' },
        ],
      },
    ],
  },
  {
    id: 'resources',
    name: 'Resources',
    desc: 'Skills Framework: sectors, occupations, job roles and competencies.',
    groups: [
      {
        id: 'skills-framework',
        name: 'Skills Framework',
        desc: 'Sector information, job roles, technical (TSC) and generic (GSC/CCS) skills.',
        docs: `${DOCS}/6Gl44K5M46EuDgn7LCsAs2/group/5uyNzClV5UJk6Uo0wDg7Mt`,
        apis: [
          { page: 'sfw-job-roles', name: 'Get Job Role Details', method: 'GET', path: '/skillsFramework/jobRoles/details', version: 'v1', auth: 'cert+oauth', desc: 'Details of a Skills Framework job role.' },
          { page: 'sfw-skills', name: 'Get Skills Details', method: 'GET', path: '/sfw/skillsFramework/skills', version: 'v1.0', auth: 'cert+oauth', desc: 'Details of Skills Framework skills.' },
          { page: 'sfw-gsc-codes', name: 'GSC Code Lookup', method: 'GET', path: '/skillsFramework/codes/skillsAndCompetencies/generic/autocomplete', version: 'v1.1', auth: 'cert+oauth', desc: 'Autocomplete generic skills and competencies codes.' },
          { page: 'sfw-ccs-details', name: 'CCS Details', method: 'GET', path: '/skillsFramework/codes/skillsAndCompetencies/generic/details', version: 'v1.1', auth: 'cert+oauth', desc: 'Critical core skills details.' },
          { page: 'sfw-tsc-codes', name: 'TSC Code Lookup', method: 'GET', path: '/skillsFramework/codes/skillsAndCompetencies/technical/autocomplete', version: 'v1.1', auth: 'cert+oauth', desc: 'Autocomplete technical skills and competencies codes.' },
          { page: 'sfw-tsc-codes-details', name: 'TSC Code Details', method: 'GET', path: '/skillsFramework/codes/skillsAndCompetencies/technical/autocomplete/details', version: 'v1.1', auth: 'cert+oauth', desc: 'Details for TSC codes returned by the lookup.' },
          { page: 'sfw-tsc-details', name: 'TSC Full Details', method: 'GET', path: '/skillsFramework/codes/skillsAndCompetencies/technical/details', version: 'v1.1', auth: 'cert+oauth', desc: 'Full technical skill record: proficiency levels, knowledge and abilities.' },
          { page: 'sfw-job-roles-search', name: 'Search Job Roles', method: 'GET', path: '/skillsFramework/jobRoles', version: 'v1', auth: 'cert+oauth', desc: 'Search job roles by keyword or sector.' },
          { page: 'sfw-job-role-profile', name: 'Job Role Profile', method: 'GET', path: '/skillsFramework/jobRoles/profile', version: 'v1', auth: 'cert+oauth', desc: 'Profile of a job role: tasks and skills.' },
          { page: 'sfw-occupations', name: 'List Occupations', method: 'GET', path: '/skillsFramework/occupations', version: 'v1', auth: 'cert+oauth', desc: 'Occupations in the Skills Framework.' },
          { page: 'sfw-job-role-codes', name: 'Job Role Codes by Occupation', method: 'GET', path: '/skillsFramework/{occupationId}/jobRoles', version: 'v1', auth: 'cert+oauth', desc: 'Job role codes under an occupation.' },
        ],
      },
    ],
  },
  {
    id: 'tools',
    name: 'Developer Tools',
    desc: 'Local helpers for setting up an SSG app. They do not call SSG.',
    groups: [
      {
        id: 'tools',
        name: 'Certificates & Keys',
        desc: 'Generate the certificate, signature key pair and encryption key an SSG app needs.',
        docs: 'https://developer.swda.gov.sg/webapp/guides',
        apis: [
          { page: 'tools-generate-cert', name: 'Generate Certificate', method: 'POST', path: '(local) self-signed X.509 certificate + private key', version: '—', auth: 'local', desc: 'Create a self-signed certificate to upload to the Developer Portal.' },
          { page: 'tools-generate-keypair', name: 'Generate Digital Signature Key Pair', method: 'POST', path: '(local) RSA key pair', version: '—', auth: 'local', desc: 'Create the RSA key pair used for request signatures.' },
          { page: 'tools-encryption-key', name: 'Generate Encryption Key', method: 'POST', path: '(local) AES-256 key', version: '—', auth: 'local', desc: 'Create a 32-byte base64 AES key for payload encryption.' },
        ],
      },
    ],
  },
];

export const AUTH_LABEL: Record<AuthMode, string> = {
  'cert': 'Certificate',
  'cert+oauth': 'Certificate + OAuth',
  'cert+aes': 'Certificate + AES',
  'local': 'Local tool',
};

export type FlatApi = ApiEntry & { slug: string; product: string; productId: string; group: string; groupId: string };

/** URL slug of an API, from its name: "Course Search (TPG Registry)" -> "course-search-tpg-registry". */
export const slugOf = (a: ApiEntry) => a.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const ALL_APIS: FlatApi[] = CATALOG.flatMap((p) =>
  p.groups.flatMap((g) => g.apis.map((a) => ({ ...a, slug: slugOf(a), product: p.name, productId: p.id, group: g.name, groupId: g.id })))
);

export const findApi = (slug: string) => ALL_APIS.find((a) => a.slug === slug);
export const findGroup = (id: string) => CATALOG.flatMap((p) => p.groups).find((g) => g.id === id);

export const BASE_URLS = {
  cert: 'https://api.ssg-wsg.sg',
  oauth: 'https://public-api.ssg-wsg.sg',
};
