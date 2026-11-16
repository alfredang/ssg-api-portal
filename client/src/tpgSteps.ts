// TPG process data: phases and the 13 steps (pure data, also used by the SEO generator).

export interface Step { id: number; slug: string; seoTitle: string; title: string; file: string; desc: string; pages: number; phase: string; icon: string; groups: string[] }
export interface Phase { id: string; name: string; blurb: string; color: string; tint: string }

export const TPG_PHASES: Phase[] = [
  { id: 'setup', name: 'Set up', blurb: 'Get the course approved and scheduled', color: '#2F5BE6', tint: '#E3EAFC' },
  { id: 'enrol', name: 'Enrol', blurb: 'Price the course and enrol trainees', color: '#0E8A6A', tint: '#DDF3EC' },
  { id: 'deliver', name: 'Deliver', blurb: 'Run the class and assess', color: '#B45309', tint: '#FBEBD3' },
  { id: 'fund', name: 'Fund', blurb: 'Grants, claims and money', color: '#7C3AED', tint: '#EBE3FC' },
  { id: 'close', name: 'Close', blurb: 'Report outcomes and certify', color: '#BE185D', tint: '#FBE1EC' },
];

export const TPG_STEPS: Step[] = [
  { id: 1, slug: 'course-dashboards', seoTitle: 'TPG Course Dashboards: TPGateway overview', title: 'Course Dashboards', file: '1-course-dashboards.pdf', pages: 6, phase: 'setup', icon: 'dashboard', desc: 'See every course, run and task at a glance on TPGateway.', groups: ['courses'] },
  { id: 2, slug: 'course-applications', seoTitle: 'TPG Course Application Process', title: 'Course Applications', file: '2-course-applications.pdf', pages: 7, phase: 'setup', icon: 'form', desc: 'Submit and manage course applications for approval.', groups: ['courses'] },
  { id: 3, slug: 'course-runs', seoTitle: 'TPG Course Run Process: add course runs and sessions', title: 'Course Runs', file: '3-course-runs.pdf', pages: 8, phase: 'setup', icon: 'calendar', desc: 'Add course runs with their sessions and trainers.', groups: ['training-providers'] },
  { id: 4, slug: 'grant-calculator', seoTitle: 'SWDA Grant Calculator: estimate training grants', title: 'Grant Calculator', file: '4-grant-calculator.pdf', pages: 3, phase: 'enrol', icon: 'calculator', desc: 'Estimate the grant and the nett fee a trainee pays.', groups: ['grant-calculator'] },
  { id: 5, slug: 'trainee-enrolment', seoTitle: 'SWDA Enrolment Process: enrol trainees on TPGateway', title: 'Trainee Enrolment', file: '5-trainee-enrolment.pdf', pages: 11, phase: 'enrol', icon: 'userPlus', desc: 'Enrol trainees into a course run, singly or in bulk.', groups: ['enrolments', 'direct-applications'] },
  { id: 6, slug: 'attendance', seoTitle: 'TPG Attendance Process: take and upload attendance', title: 'Attendance', file: '6-attendance.pdf', pages: 9, phase: 'deliver', icon: 'check', desc: 'Take and upload attendance for every session.', groups: ['training-providers'] },
  { id: 7, slug: 'assessments', seoTitle: 'TPG Assessment Process: submit assessment results', title: 'Assessments', file: '7-assessments.pdf', pages: 9, phase: 'deliver', icon: 'clipboard', desc: 'Submit each trainee’s assessment result.', groups: ['assessments'] },
  { id: 8, slug: 'grants', seoTitle: 'SWDA Grant Process: view and manage training grants', title: 'Grants', file: '8-grants.pdf', pages: 3, phase: 'fund', icon: 'bank', desc: 'Track the grants raised for your enrolments.', groups: ['grant-calculator'] },
  { id: 9, slug: 'claims', seoTitle: 'TPG Claim Process: submit and track claims', title: 'Claims', file: '9-claims.pdf', pages: 5, phase: 'fund', icon: 'send', desc: 'Submit and follow up claims.', groups: ['sfc-pay'] },
  { id: 10, slug: 'outcome-submission', seoTitle: 'TPG Outcome Submission Process', title: 'Outcome Submission', file: '10-outcome-submission.pdf', pages: 5, phase: 'close', icon: 'target', desc: 'Report training outcomes and competency results.', groups: ['assessments', 'course-feedback'] },
  { id: 11, slug: 'financial-transactions', seoTitle: 'TPG Financial Transactions and Disbursements', title: 'Financial Transactions', file: '11-financial-transactions.pdf', pages: 2, phase: 'fund', icon: 'money', desc: 'View disbursements and other transactions.', groups: ['enrolments'] },
  { id: 12, slug: 'refunds', seoTitle: 'TPG Refund Process', title: 'Refunds', file: '12-refunds.pdf', pages: 3, phase: 'fund', icon: 'refund', desc: 'Process refunds and adjustments.', groups: ['enrolments', 'sfc-pay'] },
  { id: 13, slug: 'certificates', seoTitle: 'TPG e-Certificate Process', title: 'Certificates', file: '13-certificates.pdf', pages: 3, phase: 'close', icon: 'award', desc: 'Generate and download e-certificates.', groups: ['assessments'] },
];


export const stepBySlug = (slug: string) => TPG_STEPS.find((s) => s.slug === slug || String(s.id) === slug);
