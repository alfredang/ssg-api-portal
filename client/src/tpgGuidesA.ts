// TPGateway quick-reference guides 1-6, transcribed from the SSG PDFs in
// public/tpg-process/ into structured content (see tpgTypes.ts).
// Screens are schematic redraws of the guides' screenshots; any personal
// data shown in the originals is replaced with placeholders.
import type { Guide } from './tpgTypes';

const SERVICE_PORTAL_NOTE =
  'For any technical issues, provide a description of the issue and screenshot(s) via the [service portal](https://service-portal.skillsfuture.gov.sg/s/).';

const SESSIONS_MANDATORY =
  'It is **mandatory** to create session(s) for course runs to facilitate **both** digital (via attendance code/QR code) and manual attendance taking (where required) for grant disbursements.';

const REPEAT_EXCEPTION =
  'Sessions are created/repeated daily based on the Start Date and End Date by default. {{REPEAT}} and {{EXCEPTION}} may be used to set a deviation from the default creation of daily sessions.';

const JUST_CREATED_RUN =
  'Just created a course run? It may take up to 1.5 – 2 hours before the course run details will be synced. Kindly enrol trainee into the course run only after it has been processed.';

const FORM_VARIES =
  'Depending on the responses provided in the pre-application form, a different set of questions will be surfaced in your course application form.';

const ATTENDANCE_SEARCH_STEPS = [
  { text: 'To search for sessions, begin by entering the course title in the search bar, which will then suggest keywords based on course titles.' },
  { text: 'Based on the selected course title, course runs and sessions will be viewable in the drop-down list.' },
  { text: 'The details of the selected session(s) will be displayed in the list of search results.' },
];

const NON_CERTIFIABLE_75 =
  'Grants for non-certifiable courses will not be processed if trainee does not meet the 75% attendance requirement.';

export const GUIDES_A: Guide[] = [
  // ───────────────────────────────────────────── 1. Course Dashboards
  {
    id: 1,
    audience: 'SSG/WSG Training Providers',
    updated: 'November 2024',
    intro:
      'This guide is meant for SSG/WSG Training Providers to manage courses via the course dashboard. It covers updating Unique Skills tagging, applying for course funding (non-WSQ courses under the PE Act), viewing the Course Attendance Score and submitting a renewal application.',
    sections: [
      {
        id: 'at-a-glance',
        title: '“Course Registry” tile at a glance',
        summary: 'The tabs of the Courses dashboard and what each one shows.',
        blocks: [
          {
            type: 'screen',
            title: 'Courses',
            caption: 'The Course Registry tile opens the Courses dashboard. The ellipsis at the end of a row opens the Edit / Renew / Copy menu.',
            elements: [
              { kind: 'buttons', items: [{ label: 'New Course', primary: true }] },
              { kind: 'tabs', items: ['Submissions', 'Course Listing', 'Inactive Courses', 'Rejected Applications', 'Course Attendance Score'], active: 'Course Listing' },
              { kind: 'dropdown', label: 'Course Type' },
              { kind: 'dropdown', label: 'Skill Code' },
              { kind: 'dropdown', label: 'Skill Title' },
              { kind: 'field', label: 'Dates' },
              { kind: 'search', placeholder: 'Search' },
              {
                kind: 'table',
                head: ['Course Ref. No.', 'Course Title', 'Valid From', 'Valid To', 'Status', 'Course Type', 'Version', ''],
                rows: [['TGS-2021011645', 'Introduction to TPGateway', '01-01-2021', '31-12-2023', 'Active', 'Non WSQ', '1', '•••']],
              },
              { kind: 'text', text: 'Row menu (•••): Edit · Renew · Copy' },
            ],
          },
          {
            type: 'defs',
            items: [
              { term: 'Submissions', text: 'View status of course applications.' },
              { term: 'Course Listing', text: 'View list of approved courses.' },
              { term: 'Inactive Courses', text: 'View list of expired courses.' },
              { term: 'Rejected Applications', text: 'View list of rejected course applications.' },
              { term: 'Course Attendance Score', text: 'View list of Course Attendance Score.' },
            ],
          },
        ],
      },
      {
        id: 'update-unique-skills-tagging',
        title: 'Update Unique Skills Tagging',
        prerequisites: [
          '“Full Access” to {{Course Registry}} tile',
          '**Non-WSQ course** (without skill(s) identified from the national SFw) has been approved',
        ],
        blocks: [
          {
            type: 'note',
            tone: 'warn',
            text: 'To update unique skills tagged for WSQ courses and/or Non-WSQ courses with skill(s) identified from the national SFw, please re-submit your WSQ course for re-accreditation or apply for a new WSQ and/or non-WSQ course.',
          },
          { type: 'note', tone: 'warn', text: 'Unique skills tagging is not applicable for SFC-only courses uploaded via DCT.' },
          {
            type: 'steps',
            items: [
              { text: 'Click on the {{Course Listing}} tab.' },
              { text: 'Search for the course you wish to edit, click on the ellipsis (•••) and select **Edit**.' },
              { text: 'Click [[Next]] till the {{Skills and Industry Relevance}} page.' },
              { text: 'Where applicable, update the fields under the {{Unique Skills}} section.' },
              { text: 'Click [[Retrieve Unique Skills]] to retrieve Unique Skills from source “SEA Extract”.' },
            ],
          },
          {
            type: 'screen',
            title: 'Unique Skills',
            caption: 'Retrieve Unique Skills adds rows with source “SEA Extract”.',
            elements: [
              { kind: 'text', text: 'Unique skills are extracted from the original set of skills in the Skills Framework where skills share similarities in essence but duplicated across various sectors. Training providers are required to retrieve unique skills by clicking on the button to retrieve unique skills.' },
              { kind: 'buttons', items: [{ label: 'Retrieve Unique Skills', primary: true }, { label: '+ Add More Skills' }] },
              {
                kind: 'table',
                head: ['Unique Skill', 'Source', 'Skills Type', 'Skills Label', 'Action'],
                rows: [['Consumer Intelligence Analysis', 'SEA Extract', 'tsc', 'Others', 'Remove']],
              },
            ],
          },
          {
            type: 'note',
            tone: 'tip',
            title: 'Unique Skills from “SEA Extract”',
            text: 'Unique Skills from source **“SEA Extract”** are generated from analysing course information from {{Course Title}} and {{What You’ll Learn}}. To update the list of Unique Skills from “SEA Extract”, you may edit the course information (i.e. {{Course Title}} and {{What You’ll Learn}}) under the {{Basic Information}} page.',
          },
          {
            type: 'note',
            tone: 'warn',
            title: 'Minor edit vs major edit',
            text: 'Updates to course information (i.e. {{Course Title}} and {{What You’ll Learn}}) for Non-WSQ courses without skill(s) identified from the national SFw will be a **minor edit up till 31 Dec 2024, 11.59pm**. From 1 Jan 2025, updates to the course information will be a major edit (i.e. approval is required).',
          },
          {
            type: 'steps',
            start: 6,
            items: [
              { text: '(If necessary) Click [[+ Add More Skills]] to retrieve additional Unique Skills from source “SEA Search” that are relevant to the course.' },
              { text: 'A pop-up window will appear to {{Enter Keyword}} in the search box.' },
              { text: 'Click [[Add]] to add the selected Unique Skills based on keyword search.' },
            ],
          },
          {
            type: 'screen',
            title: 'Unique Skills – Add More Skills',
            caption: 'Skills added through the keyword search show the source “SEA Search”.',
            elements: [
              { kind: 'buttons', items: [{ label: 'Retrieve Unique Skills' }, { label: '+ Add More Skills', primary: true }] },
              {
                kind: 'table',
                head: ['Unique Skill', 'Source', 'Skills Type', 'Skills Label', 'Action'],
                rows: [['Integrated Marketing', 'SEA Search', 'tsc', 'Others', 'Remove']],
              },
            ],
          },
          {
            type: 'note',
            tone: 'warn',
            text: 'Important to only tag skills that are **key to the learning outcomes of the course**. A limited and well-defined set of skills will improve the searchability and matching algorithms. **Skills declared will eventually be measured via TRAQOM**.',
          },
          {
            type: 'note',
            tone: 'tip',
            text: 'Unique Skills from source **“SEA Search”** are skills from the keyword search to tag the relevant Unique Skills to the course.',
          },
          {
            type: 'steps',
            start: 9,
            items: [
              { text: '(If necessary) TPs may suggest additional Unique Skills by entering the skills in the {{Unique Skills Free Text}} box.' },
            ],
          },
          {
            type: 'screen',
            title: 'Unique Skills Free Text',
            elements: [
              { kind: 'field', label: 'Unique Skills Free Text' },
              { kind: 'text', text: 'Skills Extraction Algorithm (SEA) is powered by a skills taxonomy developed using TSCs and CCS from the Skills Framework. If you cannot locate specific skills within the existing skills taxonomy, you may enter those skills. Do note that the skills you input will not be tagged to your course, but will undergo further evaluation by SSG to assess their potential inclusion in the skills taxonomy.' },
            ],
          },
          {
            type: 'note',
            tone: 'tip',
            text: 'Unique Skills entered in the **“Unique Skills Free Text”** box are skills that are not located within the existing skills taxonomy. Further evaluation by SSG will be required to assess the potential inclusion in the skills taxonomy.',
          },
          {
            type: 'steps',
            start: 10,
            items: [
              { text: 'Click [[Next]] till the {{Review your Application}} page. Ensure your edits have been correctly captured.' },
              { text: 'Click [[Submit]].' },
            ],
          },
        ],
      },
      {
        id: 'apply-for-course-funding',
        title: 'Apply for Course Funding',
        summary: 'Only for a non-WSQ course that falls under the PE Act.',
        prerequisites: [
          '“Full Access” to {{Course Registry}} tile',
          'Course permission has been approved on GoBusiness Licensing portal',
          'Only applicable for **Non-WSQ course** that falls under the **Private Education (PE) Act** and funding has not been approved previously',
        ],
        blocks: [
          {
            type: 'steps',
            items: [
              { text: 'Click on the {{Course Listing}} tab.' },
              { text: 'Search for the non-WSQ course you wish to apply for course funding.' },
              { text: 'Click on the ellipsis (•••) and select **Apply**.' },
              { text: 'Complete the fields in {{Getting you started}} (pre-application form) where applicable.' },
            ],
          },
          {
            type: 'note',
            tone: 'tip',
            title: 'Course supported under an “Agreement”',
            text: 'If your course is supported under an “Agreement” by SkillsFuture Singapore (SSG) or Workforce Singapore (WSG), select “Yes” for either question, where applicable: {{Will this course be supported under an “Agreement” issued by SSG?}} or {{Will this course be supported under an “Agreement” issued by WSG?}}. You will be required to input the “Agreement” Reference Number in your Course Application. If unsure, please confirm with SSG or WSG.',
          },
          {
            type: 'steps',
            start: 5,
            items: [
              { text: 'Click [[Next]].' },
              { text: 'Review the information on the {{Journey Ahead}} page and click [[Proceed]].' },
              { text: 'Ensure your course permission details have been correctly captured in the {{Course Permission Information}} page.' },
              { text: 'Click [[Next]] to begin Course Application.' },
              { text: 'Review your application to ensure that all information entered is accurate in the {{Review your Application}} page.' },
              { text: 'Read and agree to the Terms and Conditions and make the necessary Declarations.' },
              { text: 'Click [[Proceed to Payment]] and complete your payment.' },
              { text: 'You will receive an **“Application Acknowledgement”** message.' },
            ],
          },
          {
            type: 'screen',
            title: 'Course Listing – apply for funding',
            caption: 'Schematic: the row menu of a non-WSQ course on the Course Listing tab, then the buttons used through the application.',
            elements: [
              { kind: 'tabs', items: ['Submissions', 'Course Listing', 'Inactive Courses', 'Rejected Applications', 'Course Attendance Score'], active: 'Course Listing' },
              { kind: 'text', text: 'Row menu (•••): Apply' },
              { kind: 'buttons', items: [{ label: 'Next' }, { label: 'Proceed' }, { label: 'Proceed to Payment', primary: true }] },
            ],
          },
          {
            type: 'note',
            tone: 'warn',
            text: 'You will be prompted to renew your course funding before funding expiry date. Refer to the **Course Dashboards Quick Reference Guide** (the “Submit Renewal Application” section) to **submit manual course renewal**.',
          },
        ],
      },
      {
        id: 'view-course-attendance-score',
        title: 'View Course Attendance Score',
        prerequisites: [
          '“Full Access” to {{Course Registry}} tile',
          'Registered WSQ or Non-WSQ course with “Active” status',
        ],
        blocks: [
          {
            type: 'steps',
            items: [
              { text: 'Click on the {{Course Attendance Score}} tab.' },
              {
                text: 'Click [[Download Course Attendance Score Report]] to bulk download all Course Attendance Score (CAS) records for active registered courses in an Excel.',
                note: 'The CAS report computes the results of trainees’ attendance scores on a weekly basis.',
              },
              { text: 'Search for specific active Registered Courses using the following filters.' },
            ],
          },
          {
            type: 'table',
            head: ['Filter', 'Description'],
            rows: [
              ['Course Type', 'Filter based on {{Course Type}} using the drop-down: WSQ; Non-WSQ'],
              ['CAS Value', 'Filter based on {{CAS Value}} using the drop-down: 0% ≤ CAS < 25%; 25% ≤ CAS < 50%; 50% ≤ CAS < 75%; CAS ≥ 75%'],
              ['Valid To', 'Filter based on “Course Validity End Date” of the course'],
              ['Search', 'Perform keyword search to retrieve specific registered course'],
            ],
          },
          {
            type: 'screen',
            title: 'Courses – Course Attendance Score',
            caption: 'Schematic of the tab and its filters, as described in the guide.',
            elements: [
              { kind: 'tabs', items: ['Submissions', 'Course Listing', 'Inactive Courses', 'Rejected Applications', 'Course Attendance Score'], active: 'Course Attendance Score' },
              { kind: 'buttons', items: [{ label: 'Download Course Attendance Score Report' }] },
              { kind: 'dropdown', label: 'Course Type', value: 'WSQ / Non-WSQ' },
              { kind: 'dropdown', label: 'CAS Value', value: 'CAS ≥ 75%' },
              { kind: 'field', label: 'Valid To' },
              { kind: 'search', placeholder: 'Search' },
            ],
          },
          { type: 'note', tone: 'info', text: 'At least one search criteria is required.' },
          { type: 'note', tone: 'info', text: 'Only Registered Courses with an “Active” status will be displayed in the Course Attendance Score tab.' },
          {
            type: 'note',
            tone: 'tip',
            text: 'CAS is computed on a weekly basis. The updated CAS results for trainees will be reflected in the {{Course Attendance Score}} column and within the CAS report.',
          },
        ],
      },
      {
        id: 'submit-renewal-application',
        title: 'Submit Renewal Application',
        summary: 'Eligibility for course renewal, then how to submit a renewal application.',
        prerequisites: [
          '“Full Access” to {{Course Registry}} tile',
          'Course is under a programme that is eligible for course renewal. Do check with your supporting agency if they accept course renewal requests.',
          'Course requires a renewal application to be submitted. You will be prompted to renew your course before course expiry date via in-system notifications.',
        ],
        blocks: [
          { type: 'p', text: '**Eligibility for Course Renewal – timing and criteria for renewal**' },
          {
            type: 'list',
            items: [
              'Renewal checks will commence from 6 months before the course validity end date.',
              'From 1 January 2025, Course Attendance Score (CAS) will be computed, and only Registered Courses that achieve at least 75% CAS and meet other conditions (if applicable) such as conditions set out in the Funding Agreement, endorsement from a Singapore Government agency for the sector, etc., will be considered for renewal.',
              'RTPs will have to put in a renewal application via Training Partners Gateway (see the steps below), for the renewal of the following course types: WSQ Assessment-only Pathway (AOP) courses; WSQ Accreditation-only courses; and WSQ In-house courses.',
              'For other course types, the renewal approach remains status quo.',
            ],
          },
          {
            type: 'note',
            tone: 'tip',
            text: 'If you do not wish to continue delivering the course after the course has been renewed, you should submit a **course edit application** to end the validity period of the course.',
          },
          {
            type: 'note',
            tone: 'tip',
            text: 'If your course is not renewed because it does not meet the course renewal criteria, you may submit a new WSQ or Non-WSQ course application that reference the unique skill(s) for which the non-renewed course was previously approved after the 3-month improvement period. Please note the prevailing non-refundable fee applies for each new course application.',
          },
          { type: 'p', text: '**Submission of Renewal Application**' },
          {
            type: 'steps',
            items: [
              { text: 'Click on the {{Course Listing}} tab.' },
              { text: 'Search for the course you wish to edit, click on the ellipsis (•••) and select **Renew**.' },
              { text: '(Optional) Update the fields in the course application.' },
              { text: 'Ensure your edits have been correctly captured in the {{Review your Application}} page.' },
              { text: 'Click [[Submit]].' },
            ],
          },
          {
            type: 'screen',
            title: 'Course Listing – renew a course',
            elements: [
              { kind: 'tabs', items: ['Submissions', 'Course Listing', 'Inactive Courses', 'Rejected Applications', 'Course Attendance Score'], active: 'Course Listing' },
              {
                kind: 'table',
                head: ['Course Ref. No.', 'Course Title', 'Valid To', 'Status', ''],
                rows: [['TGS-2021011645', 'Introduction to TPGateway', '31-12-2023', 'Active', '•••']],
              },
              { kind: 'text', text: 'Row menu (•••): Edit · Renew · Copy' },
              { kind: 'buttons', items: [{ label: 'Submit', primary: true }] },
            ],
          },
          {
            type: 'note',
            tone: 'warn',
            text: 'To submit course renewals for SFC-only courses uploaded via DCT, please contact your supporting agency.',
          },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────── 2. Course Applications
  {
    id: 2,
    audience: 'Training Providers',
    updated: '16 May 2024',
    flowNode: 'Submit Course Application',
    intro:
      'This guide is meant for Training Providers to submit and delete Course Applications. It walks through the pre-application form and each page of the Course Application form, and how to delete a draft or pending-payment application.',
    sections: [
      {
        id: 'at-a-glance',
        title: '“Course Registry” tile at a glance',
        summary: 'Where course applications start and are tracked.',
        blocks: [
          {
            type: 'note',
            tone: 'warn',
            title: 'Non-WSQ courses under the PE Act',
            text: 'Do not submit a course application if you are offering a **Non-WSQ** course that falls under the **Private Education (PE) Act**. For such courses, you will need to apply for course permission via GoBusiness Licensing portal first. Upon approval of the course permission, you may apply for course funding via the {{Course Listing}} dashboard on TPGateway. Refer to the **Course Dashboards** Quick Reference Guide to **apply for course funding**.',
          },
          {
            type: 'screen',
            title: 'Courses',
            elements: [
              { kind: 'buttons', items: [{ label: 'New Course', primary: true }] },
              { kind: 'tabs', items: ['Submissions', 'Course Listing', 'Inactive Courses', 'Rejected Applications', 'Bulk Edit'], active: 'Submissions' },
              { kind: 'dropdown', label: 'Course Type' },
              { kind: 'dropdown', label: 'Status' },
              { kind: 'dropdown', label: 'Type' },
              { kind: 'field', label: 'Date' },
              { kind: 'search', placeholder: 'Search' },
              {
                kind: 'table',
                head: ['Date Submitted', 'Application Ref. No.', 'Course Ref. No.', 'Course Title', 'Submission Type', 'Course Type', 'Status', 'Remarks'],
                rows: [['No items to show…', '', '', '', '', '', '', '']],
              },
            ],
          },
        ],
      },
      {
        id: 'submit-a-course-application',
        title: 'Submit a Course Application',
        prerequisites: [
          '“Full Access” to {{Course Registry}} tile',
          'Approved Organisation Profile, **unless** you are submitting a combined Organisation Registration & Course Application (New TPs only)',
          'Your course is **not** an SFC-only course (please upload SFC-only courses via DCT)',
        ],
        blocks: [
          {
            type: 'note',
            tone: 'info',
            text: 'Skip to **Step 8** if you are submitting a combined Organisation Registration & Course Application.',
          },
          {
            type: 'steps',
            items: [{ text: 'Click on [[New Course]] to start a new course application.' }],
          },
          { type: 'p', text: '**Getting you started (pre-application form for your Course Application)**' },
          {
            type: 'note',
            tone: 'tip',
            text: 'You are required to complete all required fields (where applicable) in the Course Application Form. Note: Not all questions will be covered in this guide.',
          },
          {
            type: 'steps',
            start: 2,
            items: [
              {
                text: 'For the question {{Is your organisation an Institute of Higher Learning (IHL) or Government Agency?}}: indicate “Government Agency” if your organisation is a Government Agency or an Institute of Higher Learning (IHL).',
                note: 'Institute of Higher Learning (IHL) includes Autonomous Universities (AU) and Post-Secondary Education Institutes (PSEI).',
              },
              { text: 'For the question {{Which agency does this course fall under?}}: select the agency which the programme you are applying for falls under.' },
              {
                text: 'For the question {{For Training Partners with a valid hashcode, what type of course are you applying for?}}: if your organisation has a **valid hashcode**, select the type of course that you are applying for and enter your hashcode. Otherwise, select “Not Applicable – I do not have a hashcode.”',
              },
            ],
          },
          {
            type: 'note',
            tone: 'warn',
            title: 'Hashcodes',
            text: 'Hashcodes are only applicable for: an Assessment-only-Pathway (AOP) course, or a course supported by SSG Industry Development Division (IDD). For the above course types, **failure to indicate a valid Hashcode** will render your **submission invalid** and **forfeiture of your application fee**.',
          },
          {
            type: 'steps',
            start: 5,
            items: [
              {
                text: 'For the question {{What is the programme that this course falls under?}}: select the programme type that the intended course falls under.',
                note: 'The list of programmes available in the drop down will be dependent on the agency you have selected in the question “Which agency does this course fall under?”',
              },
            ],
          },
          {
            type: 'note',
            tone: 'info',
            text: 'There will be additional questions to be answered in the “Getting Started” questionnaire if you are applying for a programme under SkillsFuture Singapore or Workforce Singapore.',
          },
          {
            type: 'note',
            tone: 'warn',
            text: 'Ensure all information is accurate before proceeding; no changes allowed to these fields once you have started the Course Application.',
          },
          {
            type: 'steps',
            start: 6,
            items: [
              { text: 'Click [[Next]].' },
              { text: 'Review the information on the {{Journey Ahead}} page and click [[Proceed]] to begin Organisation Registration.' },
            ],
          },
          {
            type: 'screen',
            title: 'Getting you started (pre-application form)',
            caption: 'Schematic of the pre-application questions covered in steps 2 to 6.',
            elements: [
              { kind: 'dropdown', label: 'Is your organisation an Institute of Higher Learning (IHL) or Government Agency?', value: 'Government Agency' },
              { kind: 'dropdown', label: 'Which agency does this course fall under?' },
              { kind: 'dropdown', label: 'For Training Partners with a valid hashcode, what type of course are you applying for?', value: 'Not Applicable – I do not have a hashcode.' },
              { kind: 'dropdown', label: 'What is the programme that this course falls under?' },
              { kind: 'buttons', items: [{ label: 'Next', primary: true }] },
            ],
          },
          { type: 'p', text: '**Basic Information**' },
          { type: 'note', tone: 'tip', text: FORM_VARIES },
          {
            type: 'steps',
            start: 8,
            items: [
              {
                text: 'Under {{About This Course}} (suggest 100-word cap), ensure the following information is captured:',
                sub: [
                  'Give a high level overview of your course',
                  'Highlight the benefits your course offers including skills, competencies and needs that the course will address',
                  'Explain how the course is relevant to the industry and how it may impact the learner’s career in terms of employment/job upgrading opportunities',
                  'Indicate if the course is for beginner, intermediate or advanced learners',
                ],
              },
              {
                text: 'Under {{What You’ll Learn}}, ensure the following information is captured:',
                sub: [
                  'What skills/knowledge can trainees learn from the course',
                  'Course syllabus outline (if applicable)',
                  'Ensure keywords relevant to the course are included to facilitate learners’ course search',
                ],
              },
              {
                text: 'Under {{Minimum Entry Requirements}}, ensure the following information is captured:',
                sub: [
                  'Language and literacy proficiency level',
                  'Target age group',
                  'Prerequisite skills and knowledge',
                  'Required years of experience in relevant domain',
                  'Minimum education level',
                  'Other relevant details on entry requirements',
                ],
              },
              {
                text: 'To complete the {{Frequency of training}} table:',
                sub: [
                  '{{Total Number of Months}} should capture the expected course duration (e.g. for a course with 1 week duration, indicate 0.25 month)',
                  '{{Total Number of Days per week}} and {{Total Number of Hours per day}} should capture the frequency of course curriculum',
                ],
              },
            ],
          },
          {
            type: 'screen',
            title: 'Basic Information',
            caption: 'Schematic of the fields covered in steps 8 to 11.',
            elements: [
              { kind: 'field', label: 'About This Course', value: 'Overview, benefits, industry relevance, learner level (about 100 words)' },
              { kind: 'field', label: 'What You’ll Learn', value: 'Skills/knowledge, syllabus outline, search keywords' },
              { kind: 'field', label: 'Minimum Entry Requirements' },
              {
                kind: 'table',
                head: ['Frequency of training', 'Value'],
                rows: [
                  ['Total Number of Months', '0.25 (for a 1-week course)'],
                  ['Total Number of Days per week', ''],
                  ['Total Number of Hours per day', ''],
                ],
              },
            ],
          },
          { type: 'p', text: '**Details and Course Fees**' },
          { type: 'note', tone: 'tip', text: FORM_VARIES },
          {
            type: 'steps',
            start: 12,
            items: [
              { text: 'For {{Is this a blended training programme?}}, indicate “Yes” if the programme comprises of more than one learning mode (e.g. Classroom Training + Practical Training).' },
              { text: 'For {{What is/are the mode(s) of training for this course?}}, click [[+ Add Record]] to select the Mode of Training and Proposed Duration (hours) according to the guidelines below.' },
            ],
          },
          {
            type: 'defs',
            items: [
              { term: 'Classroom Facilitated Training', text: 'Interactive and trainer-led training in classroom setting.' },
              { term: 'On the Job Training (OJT)', text: 'Initiated by employers for own employees while employees are performing actual job. TPs to submit OJT blueprints to SSG for evaluation (applicable to in-house courses only).' },
              { term: 'Supervised Field training (SFT)', text: 'Trainee returns to the workplace for coaching under a mentor. TPs to ensure existence of structured lesson plan and training is conducted at the workplace.' },
              { term: 'Practical/Practicum Training', text: 'Supplements classroom training through practice by allowing trainees to observe method of doing work and physically try it out. Includes supervised training. Practicum is initiated by TPs as part of training programmes, where there is supervised training that allows trainees to perform application of skills. This takes place usually in generic worksites.' },
              { term: 'Synchronous e-Learning', text: 'Conducted online via webinars or video conferencing etc.' },
              { term: 'Asynchronous e-Learning', text: 'Conducted online via Learning Management System where trainees learn at their own pace.' },
            ],
          },
          {
            type: 'note',
            tone: 'info',
            text: 'Sum of {{Breakdown of cost components}} should tally with proposed course fees per trainee.',
          },
          {
            type: 'steps',
            start: 14,
            items: [
              {
                text: 'Under {{Justification of course fees}}, ensure the following information is captured:',
                sub: ['Cost breakdowns', 'Comparisons of course fee pricing with similar courses'],
              },
            ],
          },
          { type: 'p', text: '**Skills and Industry Relevance**' },
          { type: 'note', tone: 'tip', text: FORM_VARIES },
          {
            type: 'steps',
            start: 15,
            items: [
              { text: 'Under {{Which job role(s) would this course be suitable for?}}, indicate the occupations/job roles that the course caters to.' },
              {
                text: 'Under {{Select the Industry Transformation Map (ITM) that this course is referenced to}}, indicate the appropriate “Cluster” and “Sector”.',
                note: 'Visit [https://www.mti.gov.sg/ITMs/Overview](https://www.mti.gov.sg/ITMs/Overview) to learn about ITM.',
              },
              {
                text: 'Under {{Keyword Tags}}, click [[Get Tags]] to generate the recommended keyword tags.',
                note: 'This is optional for input as it is designed to provide you with recommendations on the keyword tags relevant to your course based on the inputs you have provided.',
              },
              {
                text: 'Under {{Is this course aligned to any areas identified under the Progressive Wage Model (PWM) sectors?}}, indicate “Yes” if this course is aligned to any of the below Frameworks and Technical Skills and Competencies (TSC) codes endorsed by the respective Tripartite Cluster:',
                sub: [
                  'Skills Framework for Environmental Services',
                  'Skills Framework for Landscape',
                  'Skills Framework for Security',
                  'Skills Framework for Retail',
                  'Lift PWM course',
                ],
              },
              { text: 'Under {{Which skill(s) is this course mapped to?}}, click [[+ Add Record]] to enter a new row of selected skill, and select the relevant “Skill Title”, “Skill Code”, and “Skill Certificate Template”.' },
            ],
          },
          { type: 'p', text: '**Contact Persons, Course Admin and Adult Educators**' },
          { type: 'note', tone: 'tip', text: FORM_VARIES },
          {
            type: 'steps',
            start: 20,
            items: [
              { text: 'Under {{Contact Persons for Public Enquiries}}, ensure that the correct email address(es) and contact number(s) of the personnel handling public enquiries are captured.' },
              {
                text: 'Under {{Course Administrators}}, ensure that the correct email address(es) of Course Administrator(s) is/are captured.',
                note: 'Course Administrator(s) will not receive system notifications if there are errors in the email addresses provided.',
              },
            ],
          },
          { type: 'p', text: '**Supporting Documents**' },
          {
            type: 'steps',
            start: 22,
            items: [
              { text: 'Download the {{Supporting Documents to Upload Checklist}} which will show you the list of mandatory supporting documents for the respective Agency.' },
              { text: 'Click [[Upload Documents]] to upload any relevant supporting documents apart from the documents requested as part of the Application.' },
              {
                text: 'Click on the {{Upload}} hyperlink to upload the support documents for the requested documents.',
                sub: [
                  'The acceptable file formats are .doc, .docx, .xls, .xlsx, and .pdf',
                  'Ensure there are no special characters in the supporting documents',
                ],
              },
              { text: 'Click [[Next]].' },
            ],
          },
          {
            type: 'note',
            tone: 'warn',
            text: 'The system may require up to 10-15 minutes to perform a file scan on the uploaded supporting documents.',
          },
          {
            type: 'screen',
            title: 'Supporting Documents',
            caption: 'Schematic of the upload controls described in steps 22 to 25.',
            elements: [
              { kind: 'text', text: 'Supporting Documents to Upload Checklist (download)' },
              { kind: 'buttons', items: [{ label: 'Upload Documents' }] },
              { kind: 'upload', label: 'Upload (hyperlink beside each requested document) – .doc, .docx, .xls, .xlsx, .pdf' },
              { kind: 'buttons', items: [{ label: 'Next', primary: true }] },
            ],
          },
          { type: 'p', text: '**Review your Application**' },
          {
            type: 'steps',
            start: 26,
            items: [
              { text: 'Review your application to ensure that all information entered is accurate.' },
              { text: 'Read and agree to the Terms and Conditions and make the necessary Declarations.' },
              { text: 'Click [[Proceed to Payment]] and complete your payment.' },
              { text: 'You will receive an **“Application Acknowledgement”** message.' },
            ],
          },
        ],
      },
      {
        id: 'delete-a-course-application',
        title: 'Delete a Course Application',
        prerequisites: [
          '“Full Access” to {{Course Registry}} tile',
          'Your course is **not** an SFC-only course (please upload SFC-only courses via DCT)',
        ],
        blocks: [
          {
            type: 'screen',
            title: 'Courses – Submissions',
            caption: 'A draft application on the Submissions tab. The ellipsis at the extreme right of the row opens Copy / Delete.',
            elements: [
              { kind: 'buttons', items: [{ label: 'New Course', primary: true }] },
              { kind: 'tabs', items: ['Submissions', 'Course Listing', 'Inactive Courses', 'Rejected Applications'], active: 'Submissions' },
              { kind: 'dropdown', label: 'Course Type' },
              { kind: 'dropdown', label: 'Status' },
              { kind: 'dropdown', label: 'Type' },
              { kind: 'search', placeholder: 'Search' },
              {
                kind: 'table',
                head: ['Course Ref. No.', 'Course Title', 'Submission Type', 'Course Type', 'Status', 'Remarks', ''],
                rows: [['', 'Sample Course Title', 'New', 'WSQ', 'Draft', '', '•••']],
              },
              { kind: 'text', text: 'Row menu (•••): Copy · Delete' },
            ],
          },
          {
            type: 'steps',
            items: [
              { text: 'Click on the {{Submissions}} tab to view a dashboard of your course applications. Skip to Step 5 if the status of the course application to be deleted is “Draft”. If the status of the course application is “Pending Payment”, please proceed with Step 2.' },
              { text: 'Select the application that is to be deleted.' },
              { text: 'Click on step **6** (the numbered step marker in the application form) to review your application.' },
              { text: 'Scroll to the bottom of the page and click on [[Save As Draft]].' },
              { text: 'When back at the dashboard, the status of the course application will be “Draft”. Click on the ellipsis (•••) at the extreme right of the row, using the horizontal scroll bar if required.' },
              { text: 'Select **Delete** to delete the course application.' },
            ],
          },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────── 3. Course Runs
  {
    id: 3,
    audience: 'Training Providers',
    updated: '29 December 2023',
    flowNode: 'Add Course Runs',
    intro:
      'This guide is meant for Training Providers to manage Course Runs. It covers adding, bulk-uploading, searching, editing and deleting course runs and their sessions.',
    sections: [
      {
        id: 'overview',
        title: 'Create course runs in Training Partners Gateway',
        summary: 'Two ways to create course runs, and what to know before you start.',
        blocks: [
          {
            type: 'table',
            caption: 'Two ways to create course runs',
            head: ['Way', 'How'],
            rows: [
              ['1. Via TPGateway Interface', 'Click [[Maintain Course Runs]], then click [[Add Course Run]]'],
              ['2. Via Bulk Upload Template', 'Click [[Upload Course Runs]], then click [[Download File Template]]. Use the template to create **multiple** course runs and sessions simultaneously.'],
            ],
          },
          {
            type: 'defs',
            items: [
              { term: 'Course runs', text: 'Period that the course is available for.' },
              { term: 'Course sessions', text: 'Specific course time/date within the Course run period.' },
              { term: 'Venue to enter for e-learning', text: 'Asynchronous or On-the-Job “Mode of Training”: not mandatory to indicate venue. Synchronous e-learning “Mode of Training”: indicate venue as default classroom venue or training organisation’s office address.' },
              { term: 'When to create sessions', text: 'For Courses with **both** classroom and e-learning components: create sessions with differing “Modes of Training”. For Course Runs with an **“Assessment”** component. For more information, refer to the Course Runs FAQ on “How many sessions should I create for my course runs?”' },
              { term: 'Requirements to enable attendance taking', text: 'Both course runs and course session(s) are required for attendance to be taken. Attendance for “Assessment” sessions will also be taken.' },
            ],
          },
          {
            type: 'note',
            tone: 'tip',
            title: 'Having issues? Check these',
            text: 'Ensure you have full access to the Course Runs tile. Ensure your course application has been approved. Ensure that the fields in the templates are filled in according to the acceptable formats (e.g. dates in Course Runs should be entered as YYYYMMDD).',
          },
        ],
      },
      {
        id: 'at-a-glance',
        title: '“Course Runs” tile at a glance',
        blocks: [
          {
            type: 'screen',
            title: 'Course Runs',
            caption: 'Manage course information and course runs.',
            elements: [
              { kind: 'tabs', items: ['Profile', 'Course Run', 'Trainers', 'Course Tagging', 'Brochures', 'Certificates Download', 'Attendance'], active: 'Course Run' },
              { kind: 'buttons', items: [{ label: 'Upload Free & Special Rate Courses', primary: true }, { label: 'Upload Course Runs', primary: true }, { label: 'Upload Course Details', primary: true }] },
              { kind: 'dropdown', label: 'Sort by', value: 'Course Start Date (from Earliest)' },
              { kind: 'search', placeholder: 'Search by keyword' },
              { kind: 'buttons', items: [{ label: 'Search', primary: true }] },
              { kind: 'text', text: '49 result(s) found' },
            ],
          },
        ],
      },
      {
        id: 'add-course-runs-and-sessions',
        title: 'Add Course Runs and Sessions',
        prerequisites: ['“Full Access” to {{Course Runs}} tile', 'Course Application has been approved'],
        blocks: [
          { type: 'p', text: '**Add Course Runs**' },
          {
            type: 'steps',
            items: [
              { text: 'Search for course(s) using the search bar (input the course title to display suggested keywords).' },
              { text: 'The details of the selected course will be displayed in the list of search results.' },
              { text: 'Click [[Maintain Course Runs]] to the right, corresponding to the course.' },
              { text: 'Click the expand arrow (⌄) to view detailed information on the selected course run.' },
              {
                text: 'Click [[Add Course Run]] and input course run information into the form.',
                sub: [
                  'Input course {{Registration Date}} and {{Course Date}}. Under {{Course Run End Date}}, input course end date or assessment end date, **whichever is later**.',
                  'Indicate course run {{Mode of Training}}. Mode of Training will be “Classroom” by default.',
                  'Input training venue information. Asynchronous or On-the-Job “Mode of Training”: not mandatory to indicate venue. Synchronous e-learning “Mode of Training”: indicate venue as default classroom venue or training organisation’s office address.',
                  '(Optional) Input Trainer(s) information. Trainer(s)’ information will be published on MySkillsFuture Course Directory and trainer(s) indicated under the course run will receive the link containing the attendance code and QR code via email from MySkillsFuture.',
                ],
              },
            ],
          },
          {
            type: 'table',
            caption: 'Adding trainer(s) information',
            head: ['To add **existing** trainer(s) information', 'To add **new** trainer(s) information'],
            rows: [
              ['a) Click [[+ Add Trainer]]', 'a) Click {{New}} to add trainer’s profile and information'],
              ['b) Click {{Existing}} to select existing trainer(s)', 'b) Click [[OK]] to display the trainer in the list'],
              ['c) Click [[Add Trainer]] to display all selected trainer(s) in the list', 'c) Click [[Add Trainer]] to display all selected trainer(s) in the list'],
            ],
          },
          {
            type: 'screen',
            title: 'Add Course Run',
            caption: 'Schematic of the course run form described in step 5.',
            elements: [
              { kind: 'field', label: 'Registration Date', required: true },
              { kind: 'field', label: 'Course Date', required: true },
              { kind: 'field', label: 'Course Run End Date', value: 'Course end date or assessment end date, whichever is later' },
              { kind: 'dropdown', label: 'Mode of Training', value: 'Classroom' },
              { kind: 'field', label: 'Venue' },
              { kind: 'buttons', items: [{ label: '+ Add Trainer' }] },
              { kind: 'buttons', items: [{ label: 'Save and Continue', primary: true }] },
            ],
          },
          {
            type: 'note',
            tone: 'warn',
            title: 'Create course runs early',
            text: 'Please create the course runs and course sessions **at least 5 days before the course starts** to facilitate a smooth trainee enrolment process. Do remember that it is important to submit the course runs before the course starts.',
          },
          {
            type: 'note',
            tone: 'warn',
            title: 'Sync time',
            text: 'It may take up to **1.5 – 2 hours** before the course run details will be synced within the portal to be reflected on the {{Enrolments}} tile. Enrolment of trainees can only be performed after the course runs have been synced.',
          },
          { type: 'p', text: '**Add Course Runs Sessions**' },
          {
            type: 'steps',
            start: 6,
            items: [
              { text: 'After inputting the course run information, click [[Save and Continue]], which will direct you to the Add Sessions page.' },
              {
                text: 'Click [[Add Sessions]] to input course run schedule (i.e. session information for the course run).',
                note: SESSIONS_MANDATORY,
                sub: [
                  '(Where required) Edit session {{Start Date}} and {{End Date}}. Session start and end dates are based on the course run dates.',
                  'Input {{Session Start Time}} and {{Session End Time}}. If “Mode of Training” is Classroom / Synchronous / In-house / Practical (Practicum) / Supervised Field / Traineeship, create 2 sessions (1 for AM, 1 for PM) for each day and exclude lunch hours (if applicable).',
                  'Indicate session {{Mode of Training}}. Mode of Training will be “Classroom” by default. Please create session(s) based on the approved Course Application, including “Assessment” session(s) for course runs with an assessment component.',
                  'Input training venue information. Asynchronous or On-the-Job “Mode of Training”: not mandatory to indicate venue. Synchronous e-learning “Mode of Training”: indicate venue as default classroom venue or training organisation’s office address.',
                ],
              },
              { text: 'Click [[Populate]] to confirm session information.' },
              { text: '(Where applicable) Click [[Add Sessions]] to add additional session(s) for the course run.' },
              { text: 'Click [[Submit Run]] to submit the course run and session(s).' },
              { text: 'Click [[OK]] to confirm.' },
            ],
          },
          {
            type: 'screen',
            title: 'Add Sessions',
            caption: 'Schematic of the session form described in steps 7 to 10.',
            elements: [
              { kind: 'buttons', items: [{ label: 'Add Sessions' }] },
              { kind: 'field', label: 'Start Date' },
              { kind: 'field', label: 'End Date' },
              { kind: 'field', label: 'Session Start Time' },
              { kind: 'field', label: 'Session End Time' },
              { kind: 'dropdown', label: 'Mode of Training', value: 'Classroom' },
              { kind: 'checkbox', label: 'REPEAT' },
              { kind: 'checkbox', label: 'EXCEPTION' },
              { kind: 'buttons', items: [{ label: 'Populate', primary: true }, { label: 'Submit Run', primary: true }] },
            ],
          },
          { type: 'note', tone: 'tip', text: REPEAT_EXCEPTION },
          {
            type: 'note',
            tone: 'info',
            title: 'Backdate Course Runs and Sessions',
            text: 'Upload backdated course runs and sessions via the **“Upload Course Runs”** function using the Course Runs **Excel** Template. Refer to the “Upload Course Runs and Sessions” section for more information.',
          },
        ],
      },
      {
        id: 'upload-course-runs-and-sessions',
        title: 'Upload Course Runs and Sessions',
        prerequisites: ['“Full Access” to {{Course Runs}} tile', 'Course Application has been approved'],
        blocks: [
          {
            type: 'steps',
            items: [
              { text: 'Click [[Upload Course Runs]].' },
              { text: 'Click [[Download File Template]], which will download a Course Run Template in Excel format.' },
              {
                text: 'Proceed to input the required information and save the Course Run Template file.',
                sub: [
                  'For guidance, refer to the “Definition” tab in the Course Run Template file',
                  '(Where applicable) Repeat row(s) (i.e. copy and paste) to add additional session(s) for the course run and edit session information accordingly',
                ],
              },
              { text: 'Upload the completed Course Run Template file by clicking the upload icon.' },
              { text: 'Review the uploaded course run and session(s) information by clicking the expand arrow (⌄).' },
              { text: 'To publish course run and session(s) information, click [[Publish Course Run]].' },
            ],
          },
          {
            type: 'screen',
            title: 'Upload Course Runs',
            caption: 'Schematic of the upload page controls named in the steps.',
            elements: [
              { kind: 'buttons', items: [{ label: 'Download File Template', primary: true }] },
              { kind: 'upload', label: 'Upload the completed Course Run Template (Excel)' },
              { kind: 'text', text: 'Uploaded course run ⌄ (expand to review course run and session information)' },
              { kind: 'buttons', items: [{ label: 'Edit' }, { label: 'Publish Course Run', primary: true }] },
            ],
          },
          {
            type: 'note',
            tone: 'warn',
            title: 'Adding sessions to an existing course run',
            text: 'To add session(s) to an **existing** course run (i.e. update an existing Course Run ID with session(s)), ensure that the following fields under “Course Run Information” are the same. If any of the field(s) is changed, a **new** Course Run ID will be created.',
          },
          {
            type: 'list',
            items: [
              'Course Reference Number',
              'Course Run Course Start Date',
              'Course Run Course End Date',
              'Course Run Mode of Training',
              'Course Run Venue – Postal Code',
              'Course Run Venue – Floor Number',
              'Course Run Venue – Room',
              'Course Run Venue – Unit Number',
            ],
          },
          {
            type: 'note',
            tone: 'tip',
            text: 'Should there be an error, you will see a notification in red. Click on the notification or [[Edit]] to change the information. If you see a message “There are one or more duplicated course runs, do you still want to proceed?”, review the information. Click [[OK]] and [[Publish Course Run]] to update your **existing** course run with session(s) information.',
          },
          {
            type: 'note',
            tone: 'info',
            title: 'Backdate Course Runs and Sessions',
            text: 'Upload backdated course runs and sessions via the **“Upload Course Runs”** function using the Course Runs **Excel** Template. You may delete backdated course runs within 5 days from creation date via the “Maintain Course Runs” page.',
          },
        ],
      },
      {
        id: 'search-and-view-course-runs-and-sessions',
        title: 'Search and View Course Runs and Sessions',
        prerequisites: ['“Full Access” to {{Course Runs}} tile', 'Course Run(s) created in {{Course Runs}} tile'],
        blocks: [
          {
            type: 'steps',
            items: [
              { text: 'Search for course(s) using the search bar (input the course title to display suggested keywords).' },
              { text: 'The details of the selected course will be displayed in the list of search results.' },
              { text: 'Click [[Maintain Course Runs]] to the right, corresponding to the course.' },
              { text: 'Click the expand arrow (⌄) to view detailed information on the selected course run.' },
              { text: 'Click [[View Sessions]] to view session(s) created under the course run.', note: SESSIONS_MANDATORY },
            ],
          },
          {
            type: 'screen',
            title: 'Course Runs – search',
            caption: 'Schematic: search for a course, open its course runs, then view the sessions.',
            elements: [
              { kind: 'dropdown', label: 'Sort by', value: 'Course Start Date (from Earliest)' },
              { kind: 'search', placeholder: 'Search by keyword' },
              { kind: 'buttons', items: [{ label: 'Search', primary: true }] },
              { kind: 'buttons', items: [{ label: 'Maintain Course Runs' }] },
              { kind: 'text', text: 'Course run ⌄ (expand to view detailed information)' },
              { kind: 'buttons', items: [{ label: 'View Sessions' }] },
            ],
          },
          {
            type: 'note',
            tone: 'tip',
            title: 'Quick Tip',
            text: 'Use the **SORT** function to sort courses by course run start date or end date, alphabetical order, title or cost of fees. Use the **FILTER** function to further refine your search by course runs status or course type.',
          },
        ],
      },
      {
        id: 'edit-course-runs-and-sessions',
        title: 'Edit Course Runs and Sessions',
        prerequisites: [
          '“Full Access” to {{Course Runs}} tile',
          'Course Run(s) created in {{Course Runs}} tile',
          'Course Run(s) and/or Session(s) have not ended (i.e. future or in progress)',
        ],
        blocks: [
          {
            type: 'steps',
            items: [
              { text: 'Search for course(s) using the search bar (input the course title to display suggested keywords).' },
              { text: 'The details of the selected course will be displayed in the list of search results.' },
              { text: 'Click [[Maintain Course Runs]] to the right, corresponding to the course.' },
              { text: 'Click the expand arrow (⌄) to view detailed information on the selected course run.' },
              { text: 'Click [[Edit]].' },
              { text: 'After editing the course run information, proceed to confirm by clicking [[Save and Continue]], which will redirect you to the Add Sessions page.' },
              { text: 'Click [[Add Sessions]] to edit / input course run schedule (i.e. session information for the course run).', note: SESSIONS_MANDATORY },
              { text: 'Click [[Populate]] to confirm session information.' },
              { text: '(Where applicable) Click [[Add Sessions]] to add additional session(s) for the course run.' },
              { text: 'Click [[Submit Run]] to submit the course run and session(s).' },
              { text: 'Click [[OK]] to confirm.' },
            ],
          },
          {
            type: 'screen',
            title: 'Edit a course run',
            caption: 'Schematic of the buttons used, in order.',
            elements: [
              { kind: 'buttons', items: [{ label: 'Maintain Course Runs' }] },
              { kind: 'text', text: 'Course run ⌄ (expand to view detailed information)' },
              { kind: 'buttons', items: [{ label: 'Edit' }, { label: 'Save and Continue', primary: true }] },
              { kind: 'buttons', items: [{ label: 'Add Sessions' }, { label: 'Populate', primary: true }, { label: 'Submit Run', primary: true }] },
              { kind: 'checkbox', label: 'REPEAT' },
              { kind: 'checkbox', label: 'EXCEPTION' },
            ],
          },
          { type: 'note', tone: 'tip', text: REPEAT_EXCEPTION },
          {
            type: 'note',
            tone: 'info',
            text: '**Course Run:** You may edit future **or** in progress course run details via TPGateway Interface. **Session:** You may add/edit future session details via TPGateway Interface.',
          },
        ],
      },
      {
        id: 'delete-course-runs-and-sessions',
        title: 'Delete Course Runs and Sessions',
        prerequisites: ['“Full Access” to {{Course Runs}} tile', 'Course Run(s) created in {{Course Runs}} tile'],
        blocks: [
          {
            type: 'steps',
            items: [
              { text: 'Search for course(s) using the search bar (input the course title to display suggested keywords).' },
              { text: 'The details of the selected course will be displayed in the list of search results.' },
              { text: 'Click [[Maintain Course Runs]].' },
            ],
          },
          { type: 'p', text: '**Delete Course Runs**' },
          {
            type: 'steps',
            start: 4,
            items: [
              { text: 'Click the checkbox (☑) to select the course run(s) to be deleted.', note: '{{Select All}} may be used to select all displayed course runs to be deleted.' },
              { text: 'Click [[Delete Selected Course Run]].' },
              { text: 'Click [[OK]] to proceed and confirm.' },
            ],
          },
          {
            type: 'screen',
            title: 'Maintain Course Runs – delete',
            elements: [
              { kind: 'checkbox', label: 'Select All' },
              { kind: 'checkbox', label: 'Course run to be deleted', checked: true },
              { kind: 'buttons', items: [{ label: 'Delete Selected Course Run' }] },
              { kind: 'buttons', items: [{ label: 'OK', primary: true }] },
            ],
          },
          {
            type: 'note',
            tone: 'warn',
            text: 'You may only delete **future** course runs (i.e. course run cannot be deleted if the course registration or course run has started).',
          },
          { type: 'p', text: '**Delete Course Run Sessions** (continue from Step 3)' },
          {
            type: 'steps',
            items: [
              { text: 'Click the expand arrow (⌄) to view detailed information on the selected course run.' },
              { text: 'Click [[Edit]].' },
              { text: 'From the Course Run Information page, click [[Save and Continue]], which will direct you to the Course Run Schedule (i.e. session information) page.' },
              { text: 'Click the expand arrow (⌄) to view detailed information on the selected session.' },
              { text: 'Click [[Delete]] to delete the selected session.' },
              { text: 'Click [[Submit Run]] to proceed.' },
              { text: 'Click [[OK]] to confirm.' },
            ],
          },
          {
            type: 'note',
            tone: 'warn',
            text: 'You may only delete **future** sessions (i.e. session cannot be deleted if the session has started).',
          },
          { type: 'note', tone: 'info', text: SERVICE_PORTAL_NOTE },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────── 4. Grant Calculator
  {
    id: 4,
    audience: 'Training Providers',
    updated: '10 October 2022',
    flowNode: 'Calculate Estimated Grant',
    intro:
      'This guide is meant for Training Providers to use the Grant Calculator. It covers estimating the baseline or personalised grant amount for a course run and reading the Grant Calculator summary.',
    sections: [
      {
        id: 'at-a-glance',
        title: '“Grant Calculator” tile at a glance',
        blocks: [
          {
            type: 'screen',
            title: 'Grant Calculator',
            caption: 'Course Information is required. Trainee Details (optional) are for personalised estimated funding.',
            elements: [
              { kind: 'heading', label: 'Course Information' },
              { kind: 'dropdown', label: 'Course', value: 'Select Course', required: true },
              { kind: 'dropdown', label: 'Course Run (Start Date)', value: 'Select Course Run', required: true },
              { kind: 'heading', label: 'Trainee Details (Optional)' },
              { kind: 'dropdown', label: 'ID Type', value: 'Select Id Type' },
              { kind: 'field', label: 'ID' },
              { kind: 'field', label: 'Date Of Birth', value: 'DD-MM-YYYY' },
              { kind: 'dropdown', label: 'Sponsorship Type', value: 'Select Sponsorship Type' },
              { kind: 'field', label: 'Employer UEN' },
            ],
          },
        ],
      },
      {
        id: 'using-the-grant-calculator',
        title: 'Using the Grant Calculator',
        prerequisites: [
          '“Full Access” to {{Grant Calculator}} tile',
          'Course Run(s) created in {{Course Runs}} tile',
          'Course Run(s) created have not started (i.e. future dated start date)',
        ],
        blocks: [
          {
            type: 'steps',
            items: [
              { text: 'Click {{Select Course}} to select a course from the drop-down list.' },
              { text: 'Click {{Select Course Run}} to select a course run from the drop-down list.', note: 'The course run must have a future start date.' },
              {
                text: '(Optional) Enter Trainee Details (i.e. ID Type, ID, Date of Birth and Sponsorship Type) to compute personalised grant amount.',
                note: 'If Sponsorship Type = Employer, enter sponsoring employer’s UEN.',
              },
              { text: 'Click [[Calculate]].' },
              { text: 'Estimated funding for the selected course run and trainee (where applicable) will be shown.' },
              { text: '(Optional and where applicable) Click [[Enrol Trainee]] to proceed with enrolment.' },
            ],
          },
          {
            type: 'note',
            tone: 'tip',
            text: 'Trainee Details is required to estimate the **personalised grant amount** for an eligible trainee for the selected course. If Trainee Details is left blank, the Grant Calculator will only estimate the **baseline grant amount or return no funding** for the selected course.',
          },
          {
            type: 'screen',
            title: 'Grant Calculator – calculate',
            caption: 'Schematic with example values and placeholder trainee details.',
            elements: [
              { kind: 'dropdown', label: 'Course', value: 'Digital Marketing for Manufacturers', required: true },
              { kind: 'dropdown', label: 'Course Run (Start Date)', value: 'CR0001 (20-04-2020)', required: true },
              { kind: 'dropdown', label: 'ID Type', value: 'NRIC' },
              { kind: 'field', label: 'ID', value: 'S1234567A' },
              { kind: 'field', label: 'Date Of Birth', value: 'DD-MM-YYYY' },
              { kind: 'dropdown', label: 'Sponsorship Type', value: 'Employer' },
              { kind: 'field', label: 'Employer UEN' },
              { kind: 'buttons', items: [{ label: 'Calculate', primary: true }, { label: 'Enrol Trainee', primary: true }] },
            ],
          },
        ],
      },
      {
        id: 'grant-calculator-summary',
        title: 'Grant Calculator Summary',
        blocks: [
          { type: 'p', text: '**Estimated Baseline Grant Amount**' },
          {
            type: 'screen',
            title: 'Grants Summary (baseline)',
            caption: 'Example from the guide: only the estimated baseline grant amount for the selected course is shown if Trainee Details have NOT been provided.',
            elements: [
              { kind: 'field', label: 'Course Title (Course Ref. No.)', value: 'Digital Marketing for Manufacturers (SSG-CSM-123-123-2XU923)' },
              { kind: 'field', label: 'Course Run (Start Date)', value: 'CR0001 (20-04-2020)' },
              {
                kind: 'table',
                head: ['Grants Summary', 'Amount'],
                rows: [
                  ['Approved Course Fees', '$1,200.00'],
                  ['Total Funding', '$340.00'],
                  ['– Baseline SkillsFuture Funding', '$340.00'],
                  ['Nett Fee', '$860.00'],
                ],
              },
            ],
          },
          { type: 'note', tone: 'warn', text: 'No funding will be shown if baseline funding is not applicable.' },
          { type: 'note', tone: 'info', text: 'Only estimated baseline grant amount for the selected course will be shown if Trainee Details have NOT been provided.' },
          { type: 'p', text: '**Estimated Personalised Grant Amount**' },
          {
            type: 'p',
            text: 'If Trainee Details have been provided, the Grant Calculator will verify the trainee’s entitlement against the multiple grant schemes available to provide the **optimal grant selection** to the trainee.',
          },
          {
            type: 'screen',
            title: 'Course Fee Grant Summary (personalised)',
            caption: 'Example from the guide. The Nett Fee is the amount to bill your trainee; “Eligible for” only indicates eligibility.',
            elements: [
              { kind: 'field', label: 'Course Title (Course Ref. No.)', value: 'Digital Marketing for Manufacturers (SSG-CSM-123-123-2XU923)' },
              { kind: 'field', label: 'Course Run (Start Date)', value: 'CR0001 (20-04-2020)' },
              {
                kind: 'table',
                head: ['Course Fee Grant Summary', 'Amount'],
                rows: [
                  ['Approved Course Fees', '$1,000.00'],
                  ['Total Funding', '$950.00'],
                  ['– Baseline SkillsFuture Funding', '$800.00'],
                  ['– Mid-Career Enhanced Subsidy', '$100.00'],
                  ['– SCTP Additional Funding Support', '$50.00'],
                  ['Nett Fee', '$50.00'],
                ],
              },
              {
                kind: 'table',
                head: ['Eligible for', ''],
                rows: [
                  ['Absentee Payroll', 'No'],
                  ['Training Allowance', 'No'],
                  ['SkillsFuture Credits', 'Yes'],
                ],
              },
            ],
          },
          { type: 'note', tone: 'info', text: '{{Nett Fee}} is the amount to bill your trainee.' },
          { type: 'note', tone: 'info', text: 'The {{Eligible for}} panel only indicates **eligibility**.' },
          { type: 'note', tone: 'warn', text: 'Please check with trainee directly if he/she has sufficient SFC balance.' },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────── 5. Trainee Enrolment
  {
    id: 5,
    audience: 'Training Providers',
    updated: 'March 2025',
    flowNode: 'Submit Enrolment',
    intro:
      'This guide is meant for Training Providers to submit trainee enrolments. It covers single and bulk enrolment, cancelling an enrolment, common error messages, and generating, downloading and interpreting the Enrolment Funding Analyser report to analyse enrolments for grant eligibility.',
    sections: [
      {
        id: 'at-a-glance',
        title: '“Enrolments” tile at a glance',
        blocks: [
          {
            type: 'note',
            tone: 'warn',
            title: 'Enrolment deadline',
            text: 'There is a deadline for enrolment record submissions. Refer to the relevant agency-specific deadlines.',
          },
          {
            type: 'screen',
            title: 'Enrolments',
            elements: [
              { kind: 'buttons', items: [{ label: 'Analyse Enrolments' }, { label: 'Bulk Upload' }, { label: 'Add Enrolment', primary: true }] },
              { kind: 'field', label: 'Start date from', value: '20-11-2024' },
              { kind: 'field', label: 'Start date to', value: '19-05-2025' },
              { kind: 'search', placeholder: 'Course/Course Title' },
              { kind: 'search', placeholder: 'Course Run' },
              {
                kind: 'table',
                head: ['Course Run', 'Course Title', 'Course', 'Start Date', 'End Date', 'Pending Payment (Confirmed Enrolments)', 'Full Payment (Confirmed Enrolments)'],
                rows: [['No courses to show…', '', '', '', '', '', '']],
              },
            ],
          },
        ],
      },
      {
        id: 'submit-single-enrolment',
        title: 'Submit Single Enrolment',
        prerequisites: [
          '“Full Access” to {{Enrolments}} tile',
          'Course Run(s) created in {{Course Runs}} tile. ' + JUST_CREATED_RUN,
        ],
        blocks: [
          { type: 'steps', items: [{ text: 'Click [[Add Enrolment]].' }] },
          { type: 'p', text: '**Under Trainee Details**' },
          {
            type: 'steps',
            start: 2,
            items: [
              {
                text: 'Enter trainee’s ID Type, ID and Date of Birth.',
                sub: [
                  'If ID Type = FIN/Others, enter trainee’s name per trainee’s ID',
                  'Only if trainee has incomplete Date of Birth (DoB) information (i.e. no day and/or month), please input “01” at the appropriate day and/or month fields',
                ],
              },
              { text: 'Click [[Submit Trainee]].' },
            ],
          },
          {
            type: 'screen',
            title: 'Add Enrolment – Trainee Details',
            caption: 'Schematic with placeholder trainee data.',
            elements: [
              { kind: 'dropdown', label: 'ID Type', value: 'NRIC', required: true },
              { kind: 'field', label: 'ID', value: 'S1234567A', required: true },
              { kind: 'field', label: 'Date of Birth', value: 'DD-MM-YYYY', required: true },
              { kind: 'field', label: 'Name (if ID Type = FIN/Others)', value: 'Tan Ah Kow' },
              { kind: 'buttons', items: [{ label: 'Submit Trainee', primary: true }] },
            ],
          },
          { type: 'p', text: '**Under Enrolment Details**' },
          {
            type: 'steps',
            start: 4,
            items: [
              { text: 'Enter trainee’s Email and Contact Number.' },
              { text: 'Select a Course and the Course Run which the trainee is enrolling in.' },
              { text: '(Where applicable) Enter Course Fee Discount.', note: 'Input numerical values only (please do not include the minus (-) sign).' },
              { text: 'Select the Sponsorship Type.', note: 'If Sponsorship Type = Employer, enter sponsoring employer’s UEN.' },
              { text: 'Click [[Calculate Funding]].' },
            ],
          },
          {
            type: 'screen',
            title: 'Add Enrolment – Enrolment Details',
            caption: 'Schematic with placeholder contact data.',
            elements: [
              { kind: 'field', label: 'Email', value: 'trainee@example.com' },
              { kind: 'field', label: 'Contact Number', value: '9123 4567' },
              { kind: 'dropdown', label: 'Course' },
              { kind: 'dropdown', label: 'Course Run' },
              { kind: 'field', label: 'Course Fee Discount', value: 'Numbers only, no minus sign' },
              { kind: 'dropdown', label: 'Sponsorship Type', value: 'Individual / Employer' },
              { kind: 'field', label: 'Employer UEN (if Sponsorship Type = Employer)' },
              { kind: 'buttons', items: [{ label: 'Calculate Funding', primary: true }] },
            ],
          },
          { type: 'p', text: '**Under Enrolment Fees**' },
          {
            type: 'steps',
            start: 9,
            items: [
              {
                text: '(Where applicable) Update Enrolment Fee Collection Status.',
                sub: [
                  'Value is defaulted to “Pending Payment”',
                  'To receive funding, please ensure to update the trainee’s {{Fee Collection Status}} to “Full Payment”',
                ],
              },
              { text: 'Click [[Confirm Enrolment]].' },
              { text: 'You should see a message banner and the enrolment record would have been created successfully with a unique Enrolment ID (e.g. ENR-2101-123456).' },
            ],
          },
          {
            type: 'screen',
            title: 'Add Enrolment – Enrolment Fees',
            elements: [
              { kind: 'dropdown', label: 'Fee Collection Status', value: 'Pending Payment' },
              { kind: 'buttons', items: [{ label: 'Confirm Enrolment', primary: true }] },
            ],
          },
        ],
      },
      {
        id: 'submit-bulk-enrolment',
        title: 'Submit Bulk Enrolment',
        prerequisites: [
          '“Full Access” to {{Enrolments}} tile',
          'Course Run(s) created in {{Course Runs}} tile. ' + JUST_CREATED_RUN,
        ],
        blocks: [
          { type: 'steps', items: [{ text: 'Click [[Bulk Upload]].' }] },
          { type: 'p', text: '**Complete Bulk Upload Enrolments Template**' },
          {
            type: 'steps',
            start: 2,
            items: [
              {
                text: 'Select a course from the drop-down list and click [[Submit]].',
                note: 'Enrolment records from different course runs can be uploaded within the same template for the **selected course** by specifying the course run reference numbers.',
              },
              { text: 'Click {{the attached excel template}} to download bulk upload template.' },
              { text: 'Refer to the “Instructions” tab.' },
              {
                text: 'Complete the “Enrolment Upload Template” tab.',
                sub: [
                  'Complete all mandatory fields',
                  'Not more than 500 records',
                  'Save document in CSV (comma delimited) (*.csv) format on your desktop',
                ],
              },
              { text: 'Click {{Drop a file here or browse to upload}} to upload completed file.' },
              { text: 'Click [[Submit]].' },
            ],
          },
          {
            type: 'screen',
            title: 'Bulk Upload Enrolments',
            caption: 'Schematic of the bulk upload page controls named in steps 2 to 7.',
            elements: [
              { kind: 'dropdown', label: 'Course' },
              { kind: 'buttons', items: [{ label: 'Submit', primary: true }] },
              { kind: 'text', text: 'the attached excel template (link to download the bulk upload template)' },
              { kind: 'upload', label: 'Drop a file here or browse to upload' },
              { kind: 'buttons', items: [{ label: 'Submit', primary: true }] },
            ],
          },
          { type: 'p', text: '**Verify Enrolments**' },
          {
            type: 'steps',
            start: 8,
            items: [
              {
                text: 'Verify information populated.',
                sub: [
                  'Changes can be made to all fields except trainee name',
                  'If ID Type = FIN/Others, ensure trainee’s name is reflected as per trainee’s ID',
                  'If ID Type = NRIC, trainee’s name as shown on trainee’s NRIC will be auto-populated if field has been left blank in the template',
                ],
              },
              { text: 'Click [[Save]] after reviewing the records.' },
              { text: 'You should see a message banner and the submitted enrolment records will be sent for processing.' },
              {
                text: 'You will be redirected back to the {{Enrolments}} page.',
                sub: [
                  'There will be an in-system notification with a URL link to your enrolment records once your bulk upload has been processed',
                  'A unique Enrolment ID (e.g. ENR-2101-123456) will be created for each successfully saved enrolment record',
                  'Otherwise, refer to the “Reason for Failure” column to rectify the error(s) and re-upload the unsuccessful enrolment record(s) for re-processing',
                ],
              },
            ],
          },
          {
            type: 'note',
            tone: 'tip',
            title: 'Bulk upload tips',
            text: 'You can upload enrolment records from different course runs for a single course in the same template by specifying the respective course run IDs. As there may be a time lag before the newly created course run(s) information will be synced to the {{Enrolments}} tile, enrol your trainees into the new course run(s) **1 – 1.5 hours later**. Under the “Date of Birth” field, please “format cells” and choose a **“custom date” format** with “dd-mm-yyyy” or “dd/mm/yyyy”. Limit of **500 records** per bulk upload.',
          },
        ],
      },
      {
        id: 'cancel-enrolment',
        title: 'Cancel Enrolment',
        prerequisites: [
          '“Full Access” to {{Enrolments}} tile',
          'Course Run(s) created in {{Course Runs}} tile',
          'Enrolment(s) created in {{Enrolments}} tile',
        ],
        blocks: [
          {
            type: 'steps',
            items: [
              { text: 'Select a course run from the Enrolment page.' },
              { text: 'Select the enrolment ID.' },
              { text: 'Click [[Cancel Enrolment]].' },
              { text: 'Click [[Confirm]].' },
              { text: 'You should see a message banner stating that the enrolment has been cancelled successfully.' },
            ],
          },
          {
            type: 'screen',
            title: 'Enrolment record – cancel',
            caption: 'Schematic with a placeholder enrolment ID.',
            elements: [
              { kind: 'field', label: 'Enrolment ID', value: 'ENR-2101-123456' },
              { kind: 'buttons', items: [{ label: 'Cancel Enrolment' }, { label: 'Confirm', primary: true }] },
            ],
          },
          {
            type: 'note',
            tone: 'warn',
            text: 'It is not possible to cancel an enrolment if the grant has been disbursed. Please contact your Account Manager if you are not able to cancel the enrolment.',
          },
        ],
      },
      {
        id: 'common-error-messages',
        title: 'Common Error Messages',
        blocks: [
          {
            type: 'table',
            caption: 'Formatting and Size Errors',
            head: ['Error message', 'What went wrong?', 'How to fix the error?'],
            rows: [
              ['Maximum record count exceeded in upload file. Please try again with 500 records or less.', 'Bulk import file exceeds 500 records', 'Ensure no more than 500 records are included in the upload file'],
              ['Date of Birth is mandatory in DD-MM-YYYY format', 'Missing or incorrect date format', 'Ensure that the date format is either DD-MM-YYYY or DD/MM/YYYY format'],
            ],
          },
          {
            type: 'table',
            caption: 'Trainee/Employer Detail Errors',
            head: ['Error message', 'What went wrong?', 'How to fix the error?'],
            rows: [
              ['Please check particulars of this trainee', 'One of the following errors found: Trainee ID and ID type mismatch; Trainee ID not valid; Trainee ID and DOB do not match', 'Check the particulars of the trainees to ensure there is no typo'],
              ['Invalid Trainee ID type', 'Trainee ID type is incorrect', 'Only values in the dropdown list are allowed (“NRIC”, “FIN” or “Others”)'],
              ['Invalid trainee / employer contact country code', 'Country code for trainee\'s contact number is invalid', 'Ensure that only digits and “+” sign are indicated. Note: “+” sign is optional'],
              ['Invalid trainee / employer contact phone number', 'Trainee\'s contact number is invalid', 'Ensure that the contact number indicated is valid'],
              ['Invalid trainee / employer email address', 'Trainee\'s email address is invalid', 'Ensure that the email address indicated is valid'],
            ],
          },
          {
            type: 'table',
            caption: 'Other Errors',
            head: ['Error message', 'What went wrong?', 'How to fix the error?'],
            rows: [
              ['Course run does not belong to the course', 'Course run is not associated to the course reference number in the request', 'Ensure no typos for course run ID indicated'],
              ['Invalid enrolment sponsorship type', 'Sponsorship type does not match the values in the static entity', 'Only values in the dropdown list are allowed (“Individual” or “Employer”)'],
              ['<Field Name> is mandatory', 'Missing mandatory fields from the upload file', 'Ensure all mandatory fields are filled'],
            ],
          },
        ],
      },
      {
        id: 'analyse-enrolments',
        title: 'Analyse Enrolments',
        summary: 'Generate, download and interpret the Enrolment Funding Analyser report, and use it to check grant eligibility.',
        prerequisites: [
          '“Full Access” to {{Enrolments}} tile',
          'Course Run(s) created in {{Course Runs}} tile. ' + JUST_CREATED_RUN,
        ],
        blocks: [
          { type: 'p', text: '**Generate Enrolment Funding Analyser Report**' },
          {
            type: 'steps',
            items: [
              { text: 'Click [[Analyse Enrolments]].' },
              {
                text: 'Enter **at least one** of the following details in the fields: Course Run(s), Trainee ID(s), or Employer UEN(s).',
                sub: [
                  'Up to 10 entries for each of the above fields (i.e. Course Run(s), Trainee ID(s) and Employer UEN(s)) are allowed; please separate each entry with a comma',
                  'If you entered Trainee ID(s) and/or Employer UEN(s), please also specify the {{Course Run Start Date From}} and {{Course Run Start Date To}} fields to generate the report',
                ],
              },
              {
                text: 'Click [[Analyse and Generate]]. A confirmation banner should appear at the top of the page to acknowledge the request to generate the Enrolment Funding Analyser report for the indicated field(s).',
                note: 'Banner: “Enrolment funding analyser request created successfully.”',
              },
              {
                text: 'Each Enrolment Funding Analyser request will be represented with a “Request ID” and “Status”. Each “Request ID” will have one of the following statuses: “Ready for Processing” or “Completed”, depending on the stage of file processing for the request.',
                note: 'View your request status under the {{Status}} column.',
              },
            ],
          },
          {
            type: 'screen',
            title: 'Enrolment Funding Analyser',
            caption: 'Schematic of the request form and request list, with placeholder values.',
            elements: [
              { kind: 'field', label: 'Course Run(s)', value: 'Up to 10, separated by commas' },
              { kind: 'field', label: 'Trainee ID(s)', value: 'S1234567A' },
              { kind: 'field', label: 'Employer UEN(s)' },
              { kind: 'field', label: 'Course Run Start Date From' },
              { kind: 'field', label: 'Course Run Start Date To' },
              { kind: 'buttons', items: [{ label: 'Analyse and Generate' }] },
              { kind: 'text', text: 'Enrolment funding analyser request created successfully.' },
              {
                kind: 'table',
                head: ['Request ID', 'Status', 'Filename'],
                rows: [
                  ['(Request ID)', 'Ready for Processing', ''],
                  ['(Request ID)', 'Completed', '(link to download the report)'],
                ],
              },
            ],
          },
          {
            type: 'table',
            head: ['Status', 'Description'],
            rows: [
              ['Ready for Processing', 'Enrolment Funding Analyser request has been submitted and is ready to be processed by the system'],
              ['Completed', 'Request has been successfully processed by the system, and the Enrolment Funding Analyser report is ready for download'],
            ],
          },
          {
            type: 'note',
            tone: 'warn',
            title: 'Processing time',
            text: 'Each Enrolment Funding Analyser request may take **up to 1 hour** to process and generate the report. For requests submitted **after 7pm**, the Enrolment Funding Analyser report will only be available the next day **at 9am**.',
          },
          {
            type: 'note',
            tone: 'warn',
            title: 'Report retention',
            text: 'The Enrolment Funding Analyser report generated will only be **available for 7 days** from the date of request to ensure enrolment information remains up to date. You may submit a request to generate a new report after the 7 days retention period if necessary.',
          },
          {
            type: 'note',
            tone: 'tip',
            text: 'A bell notification will be sent in TPGateway once the Enrolment Funding Analyser report is ready for download. See “Access and Download Enrolment Funding Analyser Report” below on how to access and download the report.',
          },
          { type: 'p', text: '**Access and Download Enrolment Funding Analyser Report**' },
          { type: 'p', text: 'Once the Enrolment Funding Analyser report has been generated, you may access and download the report through one of the following ways:' },
          {
            type: 'steps',
            items: [
              {
                text: '**Via Bell Notification**',
                sub: [
                  'Click on the bell (notification) icon',
                  'Click on the specific Enrolment Funding Analyser notification; alternatively, filter for “Enrolment Funding Analyser” notifications under the {{Select Category}} search field in the “Notifications” page',
                  'Click on the URL link within the notification',
                  'You will be directed to the “Enrolment Funding Analyser” page',
                  'Under the {{Filename}} column, click on the URL link to download the Enrolment Funding Analyser report',
                ],
              },
              {
                text: '**Proceed directly to Enrolment Funding Analyser page**',
                sub: [
                  'In the Enrolments tile, click [[Analyse Enrolments]]',
                  'You will be directed to the “Enrolment Funding Analyser” page',
                  'Under the {{Filename}} column, click on the URL link to download the Enrolment Funding Analyser report',
                ],
              },
            ],
          },
          { type: 'p', text: '**Interpret Enrolment Funding Analyser Report**' },
          {
            type: 'table',
            caption: 'The downloaded Enrolment Funding Analyser Report will contain the following',
            head: ['Tab', 'Description'],
            rows: [
              ['Glossary', 'A list with descriptions of the fields to support interpretation of the results'],
              ['Report', 'Enrolment information extracted from the course run(s) to analyse grant eligibility at (a) enrolment and/or (b) post system check stages'],
            ],
          },
          {
            type: 'note',
            tone: 'tip',
            text: 'The default value of the fields that are not applicable at the time of enrolment and the post system check stage will be displayed as a hyphen “-”.',
          },
          { type: 'p', text: '**Common Grant Eligibility Queries** – how to check using the Enrolment Funding Analyser report. Screenshots and data displayed are for illustration purposes only.' },
          {
            type: 'table',
            head: ['Common query', 'How to check using Enrolment Funding Analyser?'],
            rows: [
              [
                'Is my trainee enrolled?',
                'Refer to **Column B: Enrolment ID** and filter for trainee’s Enrolment ID. Refer to **Column F: Enrolment Status** to view your trainee’s enrolment status (i.e. Confirmed or Cancelled).',
              ],
              [
                'Is my trainee enrolled late?',
                'Refer to **Column B: Enrolment ID** and filter for trainee’s Enrolment ID. Refer to **Column C: Decision Report** and filter for Enrolment. Refer to **Column H: Enrolment Date**. Refer to **Column I: Enrolment Submission Cut-off Date**. Note: If the date reflected in **Column H** is after the date reflected in **Column I**, this means that the trainee’s enrolment has been created after the cut-off date of enrolment submission. This will be considered as a late enrolment and no grants will be accorded.',
              ],
              [
                'Is my trainee eligible for funding?',
                'Refer to **Column B: Enrolment ID** and filter for trainee’s Enrolment ID. Refer to **Column G: Funding Eligibility** to view your trainee’s eligibility for funding (i.e. Trainee is eligible for funding, Trainee is not eligible for funding, or The enrolment has been cancelled).',
              ],
              [
                'Is my trainee eligible for funding for attending the same course?',
                'Refer to **Column B: Enrolment ID** and filter for trainee’s Enrolment ID. Refer to **Column U: Refresher Course**. Refer to **Column AD: Received Funding for Course Previously**. Trainee is eligible for funding if: **Column U** = YES and **Column AD** = YES or NO; or **Column U** = NO and **Column AD** = NO. Trainee is ineligible for funding if: **Column U** = NO and **Column AD** = YES.',
              ],
              [
                'Is my trainee eligible for Enhanced Training Support for SMEs (ETSS)?',
                'Refer to **Column B: Enrolment ID** and filter for trainee’s Enrolment ID. Refer to **Column O: Employer’s SME Status**. Employer-sponsored trainee is eligible for ETSS funding if **Column O = Yes**.',
              ],
              [
                'Why have my trainee\'s grants not been disbursed yet?',
                'Refer to **Column B: Enrolment ID** and filter for trainee’s Enrolment ID, then check the grants disbursement criteria and the employer-sponsored enrolment details listed below this table.',
              ],
            ],
          },
          {
            type: 'screen',
            title: 'Enrolment Funding Analyser report (Excel) – “Report” tab',
            caption: 'Illustrative rows showing the columns referred to in the queries above. Enrolment IDs are placeholders.',
            elements: [
              {
                kind: 'table',
                head: ['B: Enrolment ID', 'C: Decision Report', 'F: Enrolment Status', 'G: Funding Eligibility', 'H: Enrolment Date', 'I: Enrolment Submission Cut-off Date'],
                rows: [
                  ['ENR-2412-000001', 'Enrolment', 'Confirmed', 'Trainee is eligible for funding', '04/12/2024', '05/12/2024'],
                  ['ENR-2412-000001', 'Post System Check', 'Confirmed', 'Trainee is eligible for funding', '04/12/2024', '05/12/2024'],
                ],
              },
              {
                kind: 'table',
                head: ['B: Enrolment ID', 'O: Employer’s SME Status', 'U: Refresher Course', 'AD: Received Funding for Course Previously'],
                rows: [['ENR-2412-000001', 'Yes', 'No', 'No']],
              },
            ],
          },
          { type: 'p', text: '**Why have my trainee’s grants not been disbursed yet?** Ensure the following grants disbursement criteria are met:' },
          {
            type: 'list',
            items: [
              '**Column W: Examinable Course:** Yes',
              '**Column AE: Fee Collection Status** = Full Payment',
              '**Column AF: Attendance Score** = at least 75. Note: Trainee met 75% minimum attendance requirement (for non-certifiable courses) until SSG ceases funding for such courses after 31 Dec 2024 / Trainee has at least 1 attendance record (for certifiable courses and courses offered by SSG-appointed CET Centres).',
              '**Column AG: Assessment Result** = PASS or EXEMPT. Note: TP should ensure that trainee pass the assessment for examinable course.',
            ],
          },
          { type: 'p', text: 'TP to ensure the following enrolment details for employer-sponsored trainee:' },
          {
            type: 'list',
            items: [
              '**Column L: Sponsorship Type** = Employer',
              'Refer to **Column M: Employer UEN**',
              '**Column C: Decision Report** = Post System Check and **Column AH:** UEN Verification Passed = YES',
              'Refer to **Column AI: Last UEN Verification Date** for the date on which verification of employer-employee relationship was last checked. Note: The declared Employer UEN must be the direct employer of the trainee and pays for the employee’s salary and other statutory benefits (e.g. CPF contribution, medical benefits, leave etc). The Employer UEN will be used to verify the employer-employee relationship between the trainee and the entity.',
            ],
          },
          {
            type: 'screen',
            title: 'Enrolment Funding Analyser report – disbursement columns',
            caption: 'Illustrative rows from the guide. Enrolment ID and Employer UEN are placeholders.',
            elements: [
              {
                kind: 'table',
                head: ['B: Enrolment ID', 'W: Examinable Course', 'AE: Fee Collection Status', 'AF: Attendance Score', 'AG: Assessment Result'],
                rows: [
                  ['ENR-2412-000001', 'Yes', 'Full Payment', '-', '-'],
                  ['ENR-2412-000001', 'Yes', 'Full Payment', '100', 'PASS'],
                ],
              },
              {
                kind: 'table',
                head: ['C: Decision Report', 'L: Sponsorship Type', 'M: Employer UEN', 'AH: UEN Verification Passed', 'AI: Last UEN Verification Date'],
                rows: [
                  ['Enrolment', 'Employer', '201912345A', '-', '-'],
                  ['Post System Check', 'Employer', '201912345A', 'Yes', '14-02-2025'],
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────── 6. Attendance
  {
    id: 6,
    audience: 'Training Providers',
    updated: '29 December 2023',
    flowNode: 'Take Attendance',
    intro:
      'This guide is meant for Training Providers to manage Attendance. It covers searching and viewing attendance records, adding, editing, confirming and deleting attendance, and troubleshooting common attendance problems.',
    sections: [
      {
        id: 'at-a-glance',
        title: '“Attendance” tile at a glance',
        blocks: [
          {
            type: 'screen',
            title: 'Attendance',
            elements: [
              { kind: 'tabs', items: ['Profile', 'Course Run', 'Trainers', 'Course Tagging', 'Brochures', 'Certificates Download', 'Attendance'], active: 'Attendance' },
              { kind: 'search', placeholder: 'Course Title – Search by keyword' },
              { kind: 'dropdown', label: 'Course Run', value: 'Not Available' },
              { kind: 'dropdown', label: 'Session', value: 'Not Available' },
              { kind: 'buttons', items: [{ label: 'Search', primary: true }] },
            ],
          },
        ],
      },
      {
        id: 'search-and-view-attendance-records',
        title: 'Search and View Attendance Records',
        prerequisites: [
          '“Full Access” to {{Attendance}} tile',
          'Attendance records synced/uploaded to {{Attendance}} tile',
        ],
        blocks: [
          { type: 'p', text: '**Search and View List of Sessions**' },
          { type: 'steps', items: ATTENDANCE_SEARCH_STEPS },
          { type: 'p', text: '**View all Sessions**' },
          {
            type: 'steps',
            items: [
              { text: 'Click [[View All Sessions]] to view all available sessions under the Course Run.' },
              { text: 'To export session information, received in the form of an Excel file, click [[Export]].' },
            ],
          },
          {
            type: 'screen',
            title: 'Attendance – search results',
            caption: 'Schematic of the search form and the buttons named in the steps.',
            elements: [
              { kind: 'search', placeholder: 'Course Title – Search by keyword' },
              { kind: 'dropdown', label: 'Course Run' },
              { kind: 'dropdown', label: 'Session' },
              { kind: 'buttons', items: [{ label: 'Search', primary: true }] },
              { kind: 'buttons', items: [{ label: 'View All Sessions', primary: true }, { label: 'Export', primary: true }] },
              { kind: 'text', text: 'Session ⌄ (expand to check information on attendance)' },
            ],
          },
          { type: 'note', tone: 'tip', text: 'To check information on attendance, click the expand arrow (⌄).' },
        ],
      },
      {
        id: 'add-attendance',
        title: 'Add Attendance',
        prerequisites: ['“Full Access” to {{Attendance}} tile', 'Course Runs and Course Run Sessions created'],
        blocks: [
          {
            type: 'steps',
            items: [
              ...ATTENDANCE_SEARCH_STEPS,
              { text: 'Click [[Add Attendee(s)]] in the list of search results.' },
              { text: 'Select the sessions to add Attendance to, then click [[Download File Template]]. The downloaded file will be auto-populated with the selected session information.' },
              { text: 'Proceed to fill up the Attendee Template file.' },
              { text: 'Click the upload icon to upload the Attendee Template file and review uploaded information.' },
              { text: 'Click [[Save]] to save Attendee information.' },
              { text: 'Proceed to confirm by clicking [[Publish Attendee(s)]], which will then publish information on Attendees.' },
              { text: 'Scroll down and select the course run session(s).' },
              { text: 'Tick the checkbox on the left and click [[Confirm]] after reviewing the information on Attendees.' },
            ],
          },
          {
            type: 'screen',
            title: 'Add Attendee(s)',
            caption: 'Schematic of the controls named in steps 4 to 11.',
            elements: [
              { kind: 'buttons', items: [{ label: 'Add Attendee(s)', primary: true }] },
              { kind: 'checkbox', label: 'Session(s) to add attendance to', checked: true },
              { kind: 'buttons', items: [{ label: 'Download File Template' }] },
              { kind: 'upload', label: 'Upload the completed Attendee Template file' },
              { kind: 'buttons', items: [{ label: 'Save', primary: true }, { label: 'Publish Attendee(s)', primary: true }] },
              { kind: 'checkbox', label: 'Course run session (tick after reviewing the Attendees)', checked: true },
              { kind: 'buttons', items: [{ label: 'Edit' }, { label: 'Confirm' }] },
            ],
          },
          { type: 'note', tone: 'tip', text: 'To update or rectify information on Attendees, click [[Edit]] or the error message.' },
          {
            type: 'note',
            tone: 'warn',
            title: 'Attendance submission deadline',
            text: 'There is a deadline for attendance record submissions based on the agency you are transacting with. Please refer [here](https://www.tpgateway.gov.sg/faq/attendance) for the respective deadlines.',
          },
        ],
      },
      {
        id: 'edit-attendance',
        title: 'Edit Attendance',
        summary: 'Edit attendee information, and confirm or unconfirm attendance.',
        prerequisites: ['“Full Access” to {{Attendance}} tile', 'Attendance records uploaded to {{Attendance}} tile'],
        blocks: [
          {
            type: 'steps',
            items: [
              ...ATTENDANCE_SEARCH_STEPS,
              { text: 'Select a session, and click [[Edit]] in the list of search results.' },
              { text: 'After updating Attendee information, proceed to confirm by clicking [[Update]].' },
            ],
          },
          { type: 'p', text: '**Confirm Attendance**' },
          {
            type: 'steps',
            items: [
              { text: 'Select a session under the search list.' },
              { text: 'Review the information on Attendees and click [[Confirm]].' },
            ],
          },
          { type: 'p', text: '**Unconfirm Attendance**' },
          {
            type: 'steps',
            items: [
              { text: 'Select a session under the search list.' },
              { text: 'Review the information on Attendees and click [[Unconfirm]].' },
            ],
          },
          {
            type: 'screen',
            title: 'Session – attendee actions',
            caption: 'Schematic of the buttons available on a selected session.',
            elements: [
              { kind: 'checkbox', label: 'Selected session', checked: true },
              { kind: 'buttons', items: [{ label: 'Edit' }, { label: 'Update', primary: true }] },
              { kind: 'buttons', items: [{ label: 'Confirm' }, { label: 'Unconfirm' }] },
            ],
          },
        ],
      },
      {
        id: 'delete-attendance',
        title: 'Delete Attendance',
        prerequisites: ['“Full Access” to {{Attendance}} tile', 'Attendance records uploaded to {{Attendance}} tile'],
        blocks: [
          {
            type: 'steps',
            items: [
              ...ATTENDANCE_SEARCH_STEPS,
              { text: 'Select an Attendee, and click [[Delete]] in the list of search results.' },
              { text: 'Click [[Yes]] to confirm deletion.' },
            ],
          },
          {
            type: 'screen',
            title: 'Delete an attendee',
            elements: [
              { kind: 'checkbox', label: 'Selected attendee', checked: true },
              { kind: 'buttons', items: [{ label: 'Delete' }] },
              { kind: 'text', text: 'Confirm deletion?' },
              { kind: 'buttons', items: [{ label: 'Yes', primary: true }] },
            ],
          },
        ],
      },
      {
        id: 'troubleshoot-attendance',
        title: 'Troubleshoot Attendance',
        summary: 'Five common problems faced with attendance, and how to check each one.',
        blocks: [
          {
            type: 'table',
            caption: 'Common problems faced with attendance',
            head: ['#', 'Problem', 'Question to ask'],
            rows: [
              ['1', 'Late attendance', 'Was the attendance record submitted before the submission deadline?'],
              ['2', 'Unconfirmed attendance', 'Was the attendance record confirmed after uploading?'],
              ['3', 'Attendance before enrolment', 'Was the attendance record submitted before enrolment was submitted?'],
              ['4', 'Make-up attendance', 'Was the attendance record uploaded under a make-up course run session?'],
              ['5', 'Mismatch ID Type and/or ID Number', 'Was the attendance record uploaded with the same ID Type and ID Number as enrolment?'],
            ],
          },

          { type: 'p', text: '**1. Was the attendance record submitted before the submission deadline?**' },
          { type: 'p', text: 'Check the course run end date and attendance submission date to determine if the attendance record was uploaded within the **attendance submission deadline**.' },
          { type: 'p', text: 'To check the attendance submission deadline for the respective course run:' },
          {
            type: 'steps',
            items: [
              { text: 'Click on the {{Grants}} tile.' },
              { text: 'Search for the Course Run and click on the Course Run ID.' },
              { text: 'From the Training Summary page, refer to {{Attendance Submission Cut-off}}.' },
            ],
          },
          {
            type: 'note',
            tone: 'warn',
            text: 'There is a deadline for attendance record submissions based on the agency you are transacting with. Please refer [here](https://www.tpgateway.gov.sg/faq/attendance) for the respective deadlines.',
          },
          {
            type: 'note',
            tone: 'warn',
            text: 'Attendance record submitted after the submission deadline will not be taken into consideration as part of the grants disbursement criteria. ' + NON_CERTIFIABLE_75,
          },

          { type: 'p', text: '**2. Was the attendance record confirmed after uploading?**' },
          { type: 'p', text: 'Search for the relevant course run session to check if the attendance record has been **confirmed**.' },
          {
            type: 'list',
            items: [
              'Refer to the “Search and View Attendance Records” section to find out how to search for a course run session',
              'Refer to the “Edit Attendance” section to find out how to confirm an attendance record after uploading',
            ],
          },
          {
            type: 'note',
            tone: 'warn',
            text: 'Attendance record that was not confirmed OR confirmed after the submission deadline will not be taken into consideration as part of the grants disbursement criteria. ' + NON_CERTIFIABLE_75,
          },

          { type: 'p', text: '**3. Was the attendance record submitted before enrolment was submitted?**' },
          { type: 'p', text: 'Check the attendance submission date and enrolment date to determine if the attendance record was submitted **before the trainee was enrolled**.' },
          {
            type: 'note',
            tone: 'info',
            text: 'To rectify this, delete the attendance record submitted prior to enrolment and resubmit the attendance record (after enrolment has been created). You will then have to submit a request to rescore the attendance via the [service portal](https://service-portal.skillsfuture.gov.sg/).',
          },
          {
            type: 'note',
            tone: 'tip',
            text: 'If attendance record is submitted before the trainee was enrolled, there is no enrolment to be matched to the attendance record. The attendance record will then be matched to the trainee’s previous enrolment under the same course (if any) as a makeup attendance.',
          },
          {
            type: 'note',
            tone: 'warn',
            text: 'Attendance record submitted under an incorrect course run will not be taken into consideration as part of the grants disbursement criteria. ' + NON_CERTIFIABLE_75,
          },

          { type: 'p', text: '**4. Was the attendance record uploaded under a make-up course run session?**' },
          { type: 'p', text: 'Check if the attendance record was uploaded under the correct course run.' },
          {
            type: 'list',
            items: [
              'Refer to the “Search and View Attendance Records” section to find out how to search for a course run',
              'Refer to the “TPGateway: Make-up Attendance and Assessment Arrangements” video under the “Attendance” section [here](https://www.tpgateway.gov.sg/who-we-are/self-help-guides) for more information on make-up attendance',
            ],
          },

          { type: 'p', text: '**5. Was the attendance record uploaded with the same ID Type and ID Number as enrolment?**' },
          { type: 'p', text: 'Check the ID Type and ID Number of the enrolment record against the attendance record via the **“Enrolment Detail” page and “Training Session” page** respectively, to determine if the ID Type and ID Number are correct and consistent.' },
          { type: 'p', text: 'Accessing the “Enrolment Detail” page:' },
          {
            type: 'steps',
            items: [
              { text: 'Click on the {{Enrolments}} tile.' },
              { text: 'Click on the course run that the trainee is enrolled in.' },
              { text: 'Click on the {{Enrolment ID}} of the trainee.' },
              { text: 'Locate the ID Type and ID Number of the trainee under {{Trainee Details}}.' },
            ],
          },
          { type: 'p', text: 'Accessing the “Training Session” page:' },
          {
            type: 'steps',
            items: [
              { text: 'Click on the {{Attendance}} tile.' },
              { text: 'To search for sessions, begin by entering the course title in the search bar, which will then suggest keywords based on course titles.' },
              { text: 'Based on the selected course title, course runs and sessions will be viewable in the drop-down list.' },
              { text: 'Click on [[View All Sessions]].' },
              { text: 'Locate the ID Type and ID Number of the trainee.' },
            ],
          },
          {
            type: 'screen',
            title: 'Compare ID Type and ID Number',
            caption: 'Schematic with placeholder trainee data: the two records must match.',
            elements: [
              { kind: 'heading', label: 'Enrolment Detail – Trainee Details' },
              { kind: 'field', label: 'ID Type', value: 'NRIC' },
              { kind: 'field', label: 'ID Number', value: 'S1234567A' },
              { kind: 'heading', label: 'Training Session – attendee' },
              { kind: 'field', label: 'ID Type', value: 'NRIC' },
              { kind: 'field', label: 'ID Number', value: 'S1234567A' },
            ],
          },
          {
            type: 'note',
            tone: 'warn',
            text: 'Attendance record with inconsistent ID Type and ID Number as the enrolment record will not be taken into consideration as part of the grants disbursement criteria. ' + NON_CERTIFIABLE_75,
          },
        ],
      },
    ],
  },
];
