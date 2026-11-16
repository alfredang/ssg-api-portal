// TPG Process guides 7–13, transcribed from SSG's TPGateway quick-reference
// guides (public/tpg-process/*.pdf). Rendered as HTML by components/TpgGuide.tsx.
import type { Guide, Block, ScreenEl } from './tpgTypes';

/** The search filters shown at the top of the Programme Partner agreement lists. */
const AGREEMENT_FILTERS: ScreenEl[] = [
  { kind: 'dropdown', label: 'Agreement Status' },
  { kind: 'field', label: 'Agreement Start Date' },
  { kind: 'field', label: 'Agreement End Date' },
  { kind: 'search', placeholder: 'Programme Ref. No. / Name' },
  { kind: 'search', placeholder: 'Agreement Ref. No. / Name' },
  { kind: 'buttons', items: [{ label: 'Search', primary: true }, { label: 'Clear Filters' }] },
];

/** "General process for Programme Partners" diagram printed on guides 9, 10 and 12. */
const PP_PROCESS: Block[] = [
  {
    type: 'steps',
    items: [
      {
        text: "**Submit Org Application** in the {{Organisation Profile}} tile, and **Submit Course Application*** in the {{Course Registry}} tile.",
        note: "*Submit Course Application is only applicable for Training Providers Programme Partners. Refer to the End-to-end TPGateway process for Training Providers.",
      },
      { text: "**Accept Agreement** in the {{Agreement}} tile." },
      {
        text: "**Submit Claim** in the {{Claim}} tile and **Submit Outcome** in the {{Outcome Submission}} tile.",
        sub: [
          "The diagram draws two routes out of the Agreement: **Advance**, which leads to the {{Claim}} tile, and **Reimbursement**, which leads to the {{Outcome Submission}} tile.",
          "The {{Claim}} and {{Outcome Submission}} tiles are linked in both directions.",
        ],
      },
      { text: "**View Financial Transaction** in the {{Financial Transactions}} tile." },
      {
        text: "**Submit Refund#** in the {{Refunds}} tile.",
        note: "#Where applicable. The {{Financial Transactions}} and {{Refunds}} tiles are linked in both directions.",
      },
    ],
  },
];

export const GUIDES_B: Guide[] = [
  // ───────────────────────────── 7. Assessments ─────────────────────────────
  {
    id: 7,
    audience: 'Training Providers',
    updated: '10 October 2022',
    flowNode: 'Submit Assessment',
    intro:
      "This guide is meant for Training Providers to upload and amend assessment records. It covers uploading single and bulk assessment records, editing and voiding records, working with Assessment Centres, and the common error messages.",
    sections: [
      {
        id: 'at-a-glance',
        title: '“Assessments” tile at a glance',
        summary: 'Where assessment records are uploaded, and the deadline that applies.',
        blocks: [
          {
            type: 'note',
            tone: 'warn',
            title: 'Submission deadline',
            text: "There is a deadline for assessment record submissions. Refer [here](https://www.tpgateway.gov.sg/faq/assessments) for the relevant agency specific deadlines.",
          },
          {
            type: 'screen',
            title: 'Assessments › Manage Assessment',
            caption: 'Uploaded assessment record(s) will be shown in the table.',
            elements: [
              { kind: 'heading', label: 'Manage Assessment' },
              { kind: 'buttons', items: [{ label: 'Back' }, { label: 'Add Assessment' }, { label: 'Bulk Upload' }] },
              { kind: 'text', text: 'How to Manage Time Efficiently · Course Code: TGS-2020000082 · Confirmed Enrolments: 0 · Assessments Received: 0' },
              { kind: 'buttons', items: [{ label: 'Clear Filter' }] },
              { kind: 'field', label: 'Assessment Date' },
              { kind: 'dropdown', label: 'Result' },
              { kind: 'search', placeholder: 'Search' },
              {
                kind: 'table',
                head: ['Enrolment ID', 'Assessment No.', 'ID Type *', 'Trainee ID *', 'Trainee', 'Course Run *', 'Result *', 'Grade', 'Score', 'Assessment Date *', 'Skill Code', 'Remarks'],
                rows: [['(edit icon)', 'Uploaded assessment record(s) will be shown here', '', '', '', '', '', '', '', '', '', '']],
              },
            ],
          },
        ],
      },
      {
        id: 'single-with-enrolment',
        title: 'Upload Single Assessment Record for Trainee with Enrolment',
        summary: 'Enter the result against an existing Enrolment ID.',
        prerequisites: [
          "“Full Access” to {{Assessments}} tile",
          "Course Run(s) created in {{Course Runs}} tile",
          "Enrolment(s) submitted in {{Enrolments}} tile",
        ],
        blocks: [
          {
            type: 'steps',
            items: [
              { text: "Search for the Course Run and click on the {{Course Run ID}}." },
              { text: "Click the **edit** (pencil) icon on the left of the {{Enrolment ID}}." },
              {
                text: "Enter the enrolled trainee's assessment result(s).",
                sub: [
                  "Please indicate {{Trainee Name}} as shown on the trainee's government ID. Trainee's name displayed on the e-Certificate (only for SSG training providers) is primarily retrieved from government verified information. If no government-verified information is available for the trainee (e.g. for some trainees with ID Type = FIN/Others), trainee's name will be retrieved from the assessment record submitted by you.",
                  "You are required to upload an assessment record per skill code. For e.g., if there are 3 skill codes indicated in the approved course, you are required to upload 3 assessment records (1 record for each skill code).",
                  "If no skill code is indicated in the approved course, you can leave the {{Skill Code}} field blank.",
                  "The system only auto-creates an entry to upload assessment record per Enrolment ID. If a course has multiple skill codes, please click [[Add Assessment]] or [[Bulk Upload]] function to upload additional assessment records.",
                ],
              },
              { text: "Click the **save** (disk) icon on the left of the {{Enrolment ID}}." },
              { text: "You should see a message banner and the assessment record would have been saved successfully with an unique Assessment No. (e.g. ASM-2101-12345) created." },
              { text: "(Where applicable) Proceed to enter additional assessment record(s) for the same trainee for a different skill code and/or next Enrolment ID." },
            ],
          },
          {
            type: 'screen',
            title: 'Manage Assessment: one row per Enrolment ID',
            caption: 'Schematic. The edit icon opens the row for entry; the save icon on the same row saves it.',
            elements: [
              { kind: 'buttons', items: [{ label: 'Back' }, { label: 'Add Assessment' }, { label: 'Bulk Upload' }] },
              {
                kind: 'table',
                head: ['', 'Enrolment ID', 'Assessment No.', 'ID Type *', 'Trainee ID *', 'Trainee', 'Result *', 'Assessment Date *', 'Skill Code'],
                rows: [['edit / save icon', '(Enrolment ID)', 'ASM-2101-12345', '', '', '', '', '', '']],
              },
            ],
          },
        ],
      },
      {
        id: 'single-without-enrolment',
        title: 'Upload Single Assessment Record for Trainee without Enrolment',
        summary: 'Add a record with [[Add Assessment]], then complete the enrolment.',
        prerequisites: [
          "“Full Access” to {{Assessments}} tile",
          "Course Run(s) created in {{Course Runs}} tile",
        ],
        blocks: [
          {
            type: 'note',
            tone: 'warn',
            title: 'Just created a course run?',
            text: "It may take up to 1.5 – 2 hours before the course run details will be synced. Kindly enrol trainee into the course run only after it has been processed.",
          },
          {
            type: 'steps',
            items: [
              { text: "Search for the Course Run and click on the {{Course Run ID}}." },
              { text: "Click [[Add Assessment]]." },
              {
                text: "Enter the enrolled trainee's assessment result(s).",
                sub: [
                  "Please indicate {{Trainee Name}} as shown on the trainee's government ID. Trainee's name displayed on the e-Certificate (only for SSG Training Providers) is primarily retrieved from government verified information. If no government-verified information is available for the trainee (e.g. for some trainees with ID Type = FIN/Others), trainee's name will be retrieved from the assessment record submitted by you.",
                  "You are required to upload an assessment record per skill code. For e.g., if there are 3 skill codes indicated in the approved course, you are required to upload 3 assessment records (1 record for each skill code).",
                  "If no skill code is indicated in the approved course, you can leave the {{Skill Code}} field blank.",
                ],
              },
              { text: "Click the **save** (disk) icon on the left of the blank {{Enrolment ID}}." },
              { text: "You should see a message banner and the assessment record would have been saved successfully with an unique Assessment No. (e.g. ASM-2101-12345) created." },
              { text: "(Where applicable) Proceed to enter additional assessment record(s) for the same trainee for a different skill code and/or next trainee." },
              {
                text: "(Where applicable) Click [[Add Enrolment]] under {{Remarks}} column to complete trainee's enrolment.",
                note: "Funding will NOT be applicable if the enrolment is only added **after** the submission deadline.",
              },
            ],
          },
        ],
      },
      {
        id: 'bulk-upload',
        title: 'Upload Bulk Assessment Records',
        summary: 'Fill in the CSV template (up to 500 records), upload, verify and save.',
        prerequisites: [
          "“Full Access” to {{Assessments}} tile",
          "Course Run(s) created in {{Course Runs}} tile",
        ],
        blocks: [
          {
            type: 'note',
            tone: 'warn',
            title: 'Just created a course run?',
            text: "It may take up to 1.5 – 2 hours before the course run details will be synced. Kindly enrol trainee into the course run only after it has been processed.",
          },
          { type: 'steps', items: [{ text: "Click [[Bulk Upload]]." }] },
          { type: 'p', text: "**Complete Bulk Upload Assessments Template**" },
          {
            type: 'steps',
            start: 2,
            items: [
              {
                text: "Click **the attached excel template** link to download bulk upload template.",
                sub: [
                  "Assessment records from different course runs can be uploaded within the same template for **multiple courses** by specifying the course run reference numbers.",
                  "You are required to upload an assessment record per skill code. For e.g., if there are 3 skill codes indicated in the approved course, you are required to upload 3 assessment records (1 record for each skill code).",
                  "If no skill code is indicated in the approved course, you can leave the {{Skill Code}} field blank.",
                ],
              },
              { text: "Refer to the {{Instructions}} tab." },
              {
                text: "Complete the {{Assessment Upload Template}} tab.",
                sub: [
                  "Complete all mandatory fields",
                  "Not more than 500 records",
                  "Save document in CSV (comma delimited) (*.csv) format on your desktop",
                ],
              },
              { text: "Click [[Drop a file here or browse to upload]] to upload completed file." },
              { text: "Click [[Submit]]." },
            ],
          },
          {
            type: 'note',
            tone: 'tip',
            title: 'Finding the right Skill Code',
            text: "The {{Skill Code}} field should match one of the skill codes present in the course details found within the {{Course Registry}} tile. Alternatively, the skill codes applicable to the course can be found within the {{Assessments}} tile. Steps: Click {{Course Run ID}} > Click [[Add Assessment]] > Scroll right to {{Skill Code}} column and click on dropdown.",
          },
          {
            type: 'note',
            tone: 'tip',
            text: "You can upload assessment records from different courses in the same template by specifying the respective course run IDs. As there may be a time lag before the newly created course run(s) information will be synced to the {{Assessments}} tile, upload your trainees' assessment records into the new course run(s) **10-15 minutes later**.",
          },
          {
            type: 'note',
            tone: 'tip',
            text: "Under {{Assessment Date}} field, please “format cells” and choose a **“custom date” format** with “dd-mm-yyyy” or “dd/mm/yyyy”.",
          },
          {
            type: 'screen',
            title: 'Bulk Upload',
            caption: 'Schematic of the bulk upload page.',
            elements: [
              { kind: 'text', text: 'Download the attached excel template (tabs: Instructions, Assessment Upload Template)' },
              { kind: 'upload', label: 'Drop a file here or browse to upload' },
              { kind: 'buttons', items: [{ label: 'Submit', primary: true }] },
            ],
          },
          { type: 'p', text: "**Verify Assessment Records**" },
          {
            type: 'steps',
            start: 7,
            items: [
              { text: "Verify information populated." },
              { text: "Click [[Save]]." },
              { text: "You should see a message banner and the submitted assessment records will be sent for processing." },
              {
                text: "You will be redirected back to the {{Assessments}} page.",
                sub: [
                  "There will be an in-system notification with an URL link to your assessment records once your bulk upload has been processed.",
                  "An unique Assessment No. (e.g. ASM-2101-12345) will be created for each successfully saved assessment record.",
                  "Otherwise, refer to {{Reason for Failure}} column to rectify the error(s) and re-upload the unsuccessful assessment record(s) for re-processing.",
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'edit-records',
        title: 'Edit Assessment Records',
        summary: 'Amend a saved record, or void one that was uploaded in error.',
        prerequisites: [
          "“Full Access” to {{Assessments}} tile",
          "Assessment record(s) uploaded to Course Run",
        ],
        blocks: [
          {
            type: 'note',
            tone: 'warn',
            text: "Assessment records can only be edited if the assessment submission window for the course run has not ended.",
          },
          {
            type: 'steps',
            items: [
              { text: "Search for the Course Run and click on the {{Course Run ID}}." },
              { text: "Click the **edit** (pencil) icon on left of the {{Enrolment ID}}." },
              {
                text: "Make the necessary edits.",
                note: "{{Trainee ID}} and {{Course Run}} fields are non-editable; erroneous records should be voided before creating a new record with the correct {{Trainee ID}} and/or {{Course Run ID}}.",
              },
              { text: "Click [[Save]]." },
            ],
          },
          {
            type: 'note',
            tone: 'info',
            title: 'Void Assessment Record',
            text: "Change the {{Result}} field to “Void” and click [[Save]].",
          },
          {
            type: 'screen',
            title: 'Voiding a record',
            caption: 'Schematic: set Result to Void, then save.',
            elements: [
              { kind: 'field', label: 'Trainee ID (non-editable)' },
              { kind: 'field', label: 'Course Run (non-editable)' },
              { kind: 'dropdown', label: 'Result', value: 'Void', required: true },
              { kind: 'buttons', items: [{ label: 'Save', primary: true }] },
            ],
          },
        ],
      },
      {
        id: 'assessment-centres',
        title: 'Upload Assessment Records via Assessment Centres',
        summary: 'When an Assessment Centre (AC) submits records on your behalf.',
        blocks: [
          { type: 'p', text: "If you are partnering with an Assessment Centre (AC) to submit assessment records on your behalf:" },
          {
            type: 'list',
            items: [
              "Authorise the AC by indicating the UEN of the AC in the Course Application (CA)",
              "Pass on the Course Reference No., Course Run ID and Enrolment details to the AC (offline)",
            ],
          },
          {
            type: 'note',
            tone: 'warn',
            text: "You will have **“view-only”** access to the course's assessment records if an AC has been authorised in the CA; the AC shall be responsible to upload assessment records on your behalf.",
          },
          {
            type: 'note',
            tone: 'tip',
            title: 'Attendance for examinable courses',
            text: "For examinable courses, trainees' attendance has to be captured for all course run sessions, including the “Assessment” course run session. Where an AC has been authorised to facilitate the assessment session, the Training Provider (TP) is to do the following.",
          },
          {
            type: 'list',
            items: [
              "TP to inform the AC to capture trainees' attendance",
              "TP to create the course run and course run sessions, including the “Assessment” course run session",
              "TP to generate and pass the digital attendance code and QR code to the AC to facilitate attendance taking; if trainees are unable to take attendance digitally, TP to ensure trainees' attendance are captured manually under the {{Attendance}} tile",
            ],
          },
          {
            type: 'note',
            tone: 'info',
            title: 'e-Cert (if applicable)',
            text: "Name printed on the e-Cert will be based on the entity that uploaded the assessment records and will be billed for the cost of the e-Cert.",
          },
        ],
      },
      {
        id: 'common-error-messages',
        title: 'Common Error Messages',
        summary: 'What each error means and how to fix it.',
        blocks: [
          {
            type: 'table',
            caption: 'Formatting and Size Errors',
            head: ['Error message', 'What went wrong?', 'How to fix the error?'],
            rows: [
              [
                'Maximum record count exceeded in upload file. Please try again with 500 records or less.',
                'Bulk import file exceeds 500 records',
                'Ensure no more than 500 records are included in the upload file',
              ],
              [
                'Assessment Date is mandatory in DD-MM-YYYY format',
                'Missing or incorrect date format',
                'Ensure that the date format is either DD-MM-YYYY or DD/MM/YYYY format',
              ],
            ],
          },
          {
            type: 'table',
            caption: 'Trainee Detail Errors',
            head: ['Error message', 'What went wrong?', 'How to fix the error?'],
            rows: [
              [
                'Please check particulars of this trainee',
                'One of the following errors found: Trainee ID and ID type mismatch; Trainee ID not valid',
                'Check the particulars of the trainees to ensure there is no typo',
              ],
              [
                'Invalid Trainee ID type',
                'Trainee ID type is incorrect',
                'Only values in the dropdown list are allowed (“NRIC”, “FIN” or “Others”)',
              ],
            ],
          },
          {
            type: 'table',
            caption: 'Other Errors',
            head: ['Error message', 'What went wrong?', 'How to fix the error?'],
            rows: [
              [
                'Course run does not belong to the course',
                'Course run is not associated to the course reference number in the request',
                'Ensure no typos for course run ID indicated',
              ],
              [
                '<Field Name> is mandatory',
                'Missing mandatory fields from the upload file',
                'Ensure all mandatory fields are filled',
              ],
              [
                'Invalid assessment grade',
                'Assessment grade is invalid',
                'Only values in the dropdown list are allowed (“A”, “B”, “C”, “D”, “E” or “F”)',
              ],
              [
                'Invalid assessment score',
                'Assessment score is invalid',
                'Only numerical values from 0 to 100 allowed',
              ],
              [
                'Invalid assessment result',
                'Assessment result is invalid',
                'Only values in the dropdown list are allowed (“Pass”, “Fail”, “Exempt”). Note: “Void” is used to void any records uploaded erroneously, and may only be updated over UI on existing records',
              ],
              [
                'Invalid assessment date',
                'One of the following errors found: Assessment date entered is a future date; Assessment date format is incorrect; Assessment date is invalid',
                'Ensure that the assessment date is within the course run period and not future-dated. Ensure that the date format is either DD-MM-YYYY or DD/MM/YYYY format',
              ],
            ],
          },
        ],
      },
    ],
  },

  // ─────────────────────────────── 8. Grants ───────────────────────────────
  {
    id: 8,
    audience: 'Training Providers',
    updated: '23 August 2024',
    flowNode: 'Manage Grants and Receive Disbursements',
    intro:
      "This guide is meant for Training Providers to manage training grants on TPGateway. It covers managing grants and enrolments for a course run and viewing the course run's grants.",
    sections: [
      {
        id: 'at-a-glance',
        title: '“Grants” tile at a glance',
        summary: 'The Grants Overview lists your course runs with their estimated and paid amounts.',
        blocks: [
          {
            type: 'screen',
            title: 'Grants Overview',
            elements: [
              { kind: 'heading', label: 'Grants Overview' },
              { kind: 'buttons', items: [{ label: 'Add Enrolment', primary: true }, { label: 'Clear Filters' }] },
              { kind: 'field', label: 'Start Date', value: '26-12-2020' },
              { kind: 'field', label: 'End Date', value: '24-06-2021' },
              { kind: 'search', placeholder: 'Course/Course Title' },
              { kind: 'search', placeholder: 'Course Run' },
              {
                kind: 'table',
                head: ['Course Run', 'Course', 'Course Title', 'Start Date', 'End Date', 'Confirmed Enrolments', 'Estimated Amount', 'Paid Amount'],
                rows: [],
              },
            ],
          },
        ],
      },
      {
        id: 'manage-grants-and-enrolments',
        title: 'Manage Grants and Enrolments',
        summary: 'Check each trainee against the grants disbursement criteria on the Training Summary page.',
        prerequisites: [
          "“Full Access” to {{Grants}} tile",
          "Course Run created",
          "Enrolment(s) submitted for Course Run",
        ],
        blocks: [
          {
            type: 'steps',
            items: [
              {
                text: "Search for the Course Run and click on the {{Course Run ID}}.",
                sub: [
                  "Search fields for {{Start Date}} and {{End Date}} under the Grants Overview will auto-populate to retrieve data spanning a 6 months period.",
                  "By default, the {{Start Date}} is set to 3 months prior today's date, and {{End Date}} is set to 3 months after today's date. Adjust the {{Start Date}} and {{End Date}} to display course runs beyond the 6 months period.",
                ],
              },
              { text: "The submission deadlines for Trainee Enrolment, Attendance and Assessment records tied to the course run will be indicated within the Training Summary Page." },
              {
                text: "**Under Training Summary:** under Trainee's section, you may view the following:",
                sub: [
                  "Enrolment ID",
                  "Trainee ID",
                  "Trainee",
                  "Enrolment Status (no funding for cancelled enrolments)",
                  "Attendance (no funding for non-certifiable courses if attendance score is below 75% and no funding for certifiable courses/courses offered by SSG-appointed CET Centres without at least 1 attendance record)",
                  "Assessment (no funding if assessment failed or NIL)",
                  "Fee Collection Status (no funding if full payment has not been collected)",
                ],
              },
              { text: "**Under Attendance Section:** (Where applicable) Click the **apps grid** icon to access the {{Attendance}} tile to manually upload attendance records." },
              { text: "**Under Assessments Section:** (Where applicable) Click [[Manage Assessments]] to upload assessment records." },
            ],
          },
          {
            type: 'note',
            tone: 'warn',
            title: 'Late records do not count',
            text: "The overall attendance and/or assessment (if applicable) scores will be populated **after** the submission deadline **and** only include records submitted **within** the submission deadlines (i.e. any late records will not be taken into consideration as part of the grants disbursement criteria).",
          },
          {
            type: 'note',
            tone: 'info',
            text: "The {{Assessment}} column will only be populated for courses with assessments.",
          },
          {
            type: 'note',
            tone: 'warn',
            title: 'Fee Collection Status',
            text: "To receive funding, please ensure that full payment has been received from the respective trainee or employer (where trainee is employer-sponsored) and update the trainee's {{Fee Collection Status}} promptly under the trainee's enrolment record.",
          },
          {
            type: 'note',
            tone: 'tip',
            text: "Click on the {{Enrolment ID}} to enter “Enrolment Detail” Page to update {{Fee Collection Status}}.",
          },
          {
            type: 'screen',
            title: 'Training Summary: Trainee section',
            caption: 'Schematic of the columns listed in the guide, with what removes funding.',
            elements: [
              {
                kind: 'table',
                head: ['Enrolment ID', 'Trainee ID', 'Trainee', 'Enrolment Status', 'Attendance', 'Assessment', 'Fee Collection Status'],
                rows: [['(link)', 'S1234567A', 'Tan Ah Kow', 'no funding if cancelled', 'see criteria', 'no funding if failed or NIL', 'no funding unless full payment collected']],
              },
              { kind: 'buttons', items: [{ label: 'Manage Assessments' }] },
            ],
          },
        ],
      },
      {
        id: 'view-course-run-grants',
        title: 'View Course Run Grants',
        summary: 'See all grants tied to a course run and download them to Excel.',
        prerequisites: [
          "“Full Access” to {{Grants}} tile",
          "Course Run created",
          "Enrolment(s) submitted for Course Run",
        ],
        blocks: [
          {
            type: 'steps',
            items: [
              {
                text: "Search for the Course Run and click on the {{Course Run ID}}.",
                note: "The default display is 3 months before and 3 months after today's date. Adjust the dates to search for course runs with start date and end date outside the default date range.",
              },
              {
                text: "Click [[View Grants]] to view all grants associated with the course run.",
                note: "The “Grants Estimated” is an indicative amount; the final grant amount disbursed is subject to the fulfilment of the grants disbursement criteria.",
              },
              { text: "Click [[Excel View]] to download your course run grants-related information in an Excel file." },
            ],
          },
          {
            type: 'note',
            tone: 'tip',
            text: "Click on the {{Enrolment ID}} to enter “Enrolment Detail” Page to view the breakdown of eligible grants and payment status for the selected trainee.",
          },
          {
            type: 'note',
            tone: 'tip',
            text: "You can search for a trainee's course run grants-related information using the {{Trainee ID}} search filter.",
          },
          {
            type: 'screen',
            title: 'Course run: grants actions',
            caption: 'Schematic of the buttons named in the guide.',
            elements: [
              { kind: 'buttons', items: [{ label: 'View Grants' }, { label: 'Excel View', primary: true }] },
              { kind: 'search', placeholder: 'Trainee ID' },
            ],
          },
        ],
      },
    ],
  },

  // ─────────────────────────────── 9. Claims ───────────────────────────────
  {
    id: 9,
    audience: 'Programme Partners',
    updated: '3 October 2022',
    intro:
      "This guide is meant for Programme Partners to manage claims for programme and grant administration transactions. It covers submitting a claim, checking the status of a claim submission, and re-submitting a claim that has been returned for edits or clarification.",
    sections: [
      {
        id: 'general-process',
        title: 'General process for Programme Partners',
        summary: 'Where claims sit in the Programme Partner journey. This guide covers **Submit Claim**.',
        blocks: PP_PROCESS,
      },
      {
        id: 'at-a-glance',
        title: '“Claim” tile at a glance',
        summary: 'The Agreement Claims overview lists your agreements.',
        blocks: [
          {
            type: 'screen',
            title: 'Claims › Agreement Claims - Overview',
            elements: [
              { kind: 'heading', label: 'Agreement Claims - Overview' },
              ...AGREEMENT_FILTERS,
              {
                kind: 'table',
                head: ['Agreement Ref. No.', 'Agreement Name', 'Agreement Status', 'Grant Agreement Funding', 'Agreement Paid Amount', 'Programme Ref. No. / Name'],
                rows: [['XXX-XXX', '<Name of Agreement>', 'Active', '$XXX.XX', '$XXX.XX', 'XXX-XXX']],
              },
            ],
          },
        ],
      },
      {
        id: 'claim-submission',
        title: 'Claim Submission',
        summary: 'Three parts: Claim Details, Supporting Information, Review Claim Application.',
        prerequisites: [
          "“Full Access” to {{Claim}} tile",
          "Agreement has been accepted and endorsed",
        ],
        blocks: [
          { type: 'p', text: "**Overview of TPGateway Claim Submission.** To submit a new claim, you will need to complete the following:" },
          {
            type: 'screen',
            title: 'Claim submission: top navigation bar',
            elements: [
              { kind: 'tabs', items: ['1 Claim Details', '2 Supporting Information', '3 Review Claim Application'], active: '1 Claim Details' },
            ],
          },
          { type: 'p', text: "**1. Claim Details**" },
          {
            type: 'steps',
            items: [
              { text: "Search for the Agreement you wish to submit claims for using the filters available." },
              { text: "Click on the {{Agreement Ref. No.}} to access the “Agreement Claim Summary” page of the selected Agreement." },
              { text: "Click [[Submit New Claim]]." },
              {
                text: "Check that the pre-populated fields under Programme Partner Information are accurate:",
                sub: ["Programme Partner Code / Name", "Programme Ref. No. / Name"],
                note: "Please work with your Agreement Officer In-Charge if you find any inaccuracies in the pre-populated field(s).",
              },
              {
                text: "Check that the pre-populated fields under Agreement Information are accurate:",
                sub: ["Agreement Ref. No. / Name", "Agreement Funding Period", "Grant Agreement Funding ($)", "Agreement Paid Amount ($)"],
              },
              {
                text: "Input {{Claim Period}}.",
                note: "Claim Start Date and Claim End Date may be later than Agreement End Date, provided that the Agreement is not closed.",
              },
              { text: "Input a description that will help to identify the content and/or purpose of the claim (e.g., Claim Submission for Oct 2022)." },
              { text: "If you are not submitting a last claim, click [[No]] when asked if this is the last claim." },
              { text: "Select the funding component(s) you are claiming for by clicking on [[Add Row]]." },
              { text: "Select the {{Payment Type}} (Advance or Reimbursement) and the claim amount." },
              {
                text: "Click the **tick** icon to save.",
                note: "You can claim for multiple funding components within the same submission.",
              },
              {
                text: "When asked if this claim is related to an outcome submission:",
                sub: [
                  "Click [[Yes]] if you are submitting a claim related to an outcome submission, and provide the outcome submission ID (e.g., SSG-OTC-2022-123456)",
                  "Click [[No]] if you are not submitting a claim related to an outcome submission",
                ],
              },
              { text: "Click [[Proceed]] to proceed to the next page." },
            ],
          },
          {
            type: 'defs',
            items: [
              { term: 'Last Claim', text: 'Last and final claim to be submitted that is related to the agreement.' },
              { term: 'Not a last claim', text: 'More claim(s) related to the agreement will be submitted.' },
            ],
          },
          {
            type: 'screen',
            title: 'Step 1 of 3: Claim Details',
            caption: 'Schematic of the fields the guide asks you to check and fill.',
            elements: [
              { kind: 'heading', label: 'Programme Partner Information (pre-populated)' },
              { kind: 'field', label: 'Programme Partner Code / Name' },
              { kind: 'field', label: 'Programme Ref. No. / Name' },
              { kind: 'heading', label: 'Agreement Information (pre-populated)' },
              { kind: 'text', text: 'Agreement Ref. No. / Name · Agreement Funding Period · Grant Agreement Funding ($) · Agreement Paid Amount ($)' },
              { kind: 'field', label: 'Claim Period', value: 'Claim Start Date – Claim End Date' },
              { kind: 'field', label: 'Description', value: 'Claim Submission for Oct 2022' },
              { kind: 'text', text: 'Is this the last claim?  ( ) Yes  (•) No' },
              { kind: 'table', head: ['Funding component', 'Payment Type', 'Claim amount', ''], rows: [['(selected component)', 'Advance / Reimbursement', '$XXX.XX', 'tick icon to save']] },
              { kind: 'buttons', items: [{ label: 'Add Row' }, { label: 'Proceed', primary: true }] },
            ],
          },
          { type: 'p', text: "**2. Supporting Information**" },
          {
            type: 'steps',
            start: 14,
            items: [
              {
                text: "Click [[Upload]] to upload any mandatory or additional supporting documents you wish to provide.",
                note: "Uploading of additional supporting documents is subjected to discussion with your Agreement Officer In-Charge.",
              },
              { text: "(Optional) Leave any note(s) for agency officers and click [[Add Note]] to save." },
              { text: "Click [[Proceed]] to proceed to the next page." },
            ],
          },
          {
            type: 'note',
            tone: 'warn',
            title: 'Please note the following when uploading document(s)',
            text: "Maximum File Size allowed: 20MB. Accepted File Format: .docx, .xlsx, pdf, jpg. Only single file uploads are allowed.",
          },
          {
            type: 'note',
            tone: 'warn',
            text: "Check {{Supporting Documents}} section for any mandatory documents required for your claim submission. Ensure any mandatory documents are uploaded to facilitate the claim approval process.",
          },
          {
            type: 'screen',
            title: 'Step 2 of 3: Supporting Information',
            caption: 'Schematic.',
            elements: [
              { kind: 'heading', label: 'Supporting Documents' },
              { kind: 'upload', label: 'Upload (max 20MB; .docx, .xlsx, pdf, jpg; single file)' },
              { kind: 'heading', label: 'Note to Agency Officers' },
              { kind: 'field', label: 'Note (optional)' },
              { kind: 'buttons', items: [{ label: 'Add Note' }, { label: 'Proceed', primary: true }] },
            ],
          },
          { type: 'p', text: "**3. Review Claim Application**" },
          {
            type: 'steps',
            start: 17,
            items: [
              { text: "Ensure all information reflected on the page is accurate." },
              { text: "Check the checkbox to agree to the Terms and Conditions under Declaration." },
              { text: "Click [[Submit]]." },
              { text: "Upon successful claim submission, you will see a success banner: “Claim submitted successfully”." },
            ],
          },
          {
            type: 'note',
            tone: 'warn',
            title: 'Automatic budget check',
            text: "Upon clicking [[Submit]], TPGateway will automatically perform a budget check to ensure Amount entered in claim submission page for funding component ≤ Available amount for funding component. If the check fails, you will not be able to submit the claim.",
          },
          {
            type: 'screen',
            title: 'Step 3 of 3: Review Claim Application',
            caption: 'Schematic.',
            elements: [
              { kind: 'heading', label: 'Declaration' },
              { kind: 'checkbox', label: 'I agree to the Terms and Conditions', checked: true },
              { kind: 'buttons', items: [{ label: 'Submit', primary: true }] },
              { kind: 'text', text: 'Claim submitted successfully' },
            ],
          },
        ],
      },
      {
        id: 'check-claim-status',
        title: 'Check status of Claim Submission',
        summary: 'Find the claim under Past Claims and read its Status.',
        prerequisites: [
          "“Full Access” to {{Claim}} tile",
          "You have submitted a claim request successfully or have initiated claim submission application",
        ],
        blocks: [
          {
            type: 'steps',
            items: [
              { text: "Search for the Agreement you wish to submit claims for using the filters available." },
              { text: "Click on the {{Agreement Ref. No.}} to access the “Agreement Claim Summary” page of the selected Agreement." },
              { text: "View your claim status under the {{Past Claims}} section (refer to the {{Status}} column)." },
            ],
          },
          {
            type: 'screen',
            title: 'Agreement Claims - Overview: search filters',
            elements: AGREEMENT_FILTERS,
          },
          {
            type: 'table',
            head: ['Status', 'Description'],
            rows: [
              ['Draft', 'Application has not been submitted and is still in the draft stage. Complete the application and submit your claim for processing.'],
              ['Submitted', 'Application has been submitted for processing.'],
              ['Approved', 'Application has been approved.'],
              ['Rejected', 'Application has been rejected. You may check the application details (e.g., reason for rejection) and reapply if needed.'],
              ['Returned', 'Application has been returned for your edit / clarification. Edit / provide clarification and submit your claim for processing.'],
            ],
          },
          {
            type: 'note',
            tone: 'info',
            title: 'Check reason(s) of a rejected claim',
            text: "You may view the reason(s) of a rejected claim via in-system notification; OR you may view claim details to check notes that agency officers have provided, if applicable.",
          },
        ],
      },
      {
        id: 'resubmit-returned-claim',
        title: 'Re-submit a claim that has been returned for edits / clarification',
        summary: 'Read the officer’s remarks, edit, and re-submit.',
        prerequisites: [
          "“Full Access” to {{Claim}} tile",
          "Your claim submission has been returned for your edits / clarification",
        ],
        blocks: [
          {
            type: 'steps',
            items: [
              { text: "From the “Claim Details” page, click {{2 Supporting Information}} on the top navigation bar to be directed to the Supporting Information page." },
              { text: "Refer to the {{Note to Agency Officers}} section for instructions / remarks provided by agency officer." },
              { text: "Edit the claim application accordingly and re-submit the claim request." },
            ],
          },
          {
            type: 'screen',
            title: 'Returned claim: top navigation bar',
            elements: [
              { kind: 'tabs', items: ['1 Claim Details', '2 Supporting Information', '3 Review Claim Application'], active: '2 Supporting Information' },
              { kind: 'heading', label: 'Note to Agency Officers' },
              { kind: 'text', text: 'Instructions / remarks provided by the agency officer appear here.' },
            ],
          },
        ],
      },
    ],
  },

  // ───────────────────────── 10. Outcome Submission ─────────────────────────
  {
    id: 10,
    audience: 'Programme Partners',
    updated: '3 October 2022',
    intro:
      "This guide is meant for Programme Partners to submit outcome progress on TPGateway. It covers viewing an agreement's outcome indicators and submitting outcome progress.",
    sections: [
      {
        id: 'general-process',
        title: 'General process for Programme Partners',
        summary: 'Where outcome submission sits in the Programme Partner journey. This guide covers **Submit Outcome**.',
        blocks: PP_PROCESS,
      },
      {
        id: 'at-a-glance',
        title: '“Outcome Submission” tile at a glance',
        summary: 'The Agreement Outcomes overview lists your agreements.',
        blocks: [
          {
            type: 'screen',
            title: 'Outcome Submission › Agreement Outcomes - Overview',
            elements: [
              { kind: 'heading', label: 'Agreement Outcomes - Overview' },
              ...AGREEMENT_FILTERS,
              {
                kind: 'table',
                head: ['Agreement Ref. No.', 'Agreement Name', 'Agreement Status', 'Agreement Start Date', 'Agreement End Date', 'Programme Ref. No. / Name', 'Last Submission'],
                rows: [['XXX-XXX', '<Name of Agreement>', 'Active', 'DD-MM-YYYY', 'DD-MM-YYYY', 'XXX-XXX', 'DD-MM-YYYY']],
              },
            ],
          },
        ],
      },
      {
        id: 'viewing-outcome-indicators',
        title: 'Viewing Outcome Indicators',
        summary: 'Open the Agreement Outcome Progress page for an agreement.',
        prerequisites: [
          "“Full Access” to {{Outcome Submission}} tile",
          "Active Agreement (that has not been closed) with Outcome Indicator(s)",
        ],
        blocks: [
          {
            type: 'steps',
            items: [
              { text: "Search for the Agreement you wish to view outcome indicators for using the filters available." },
              { text: "Click on the {{Agreement Ref. No.}} to access the “Agreement Outcome Progress” page of the selected Agreement." },
              { text: "You will be able to view the Agreement's outcome indicators, download progress reports, and view all past submissions in one place." },
            ],
          },
          {
            type: 'screen',
            title: 'Agreement Outcomes - Overview: search filters',
            elements: AGREEMENT_FILTERS,
          },
          {
            type: 'note',
            tone: 'info',
            title: 'Note',
            text: "Your outcome indicators for each agreement can also be viewed through the {{Agreement}} tile. To view them via this route:",
          },
          {
            type: 'steps',
            items: [
              { text: "Click into the {{Agreements}} tile on TPGateway and navigate to the {{Agreement Registry}} tab." },
              { text: "Browse through the list of your active agreements and click on the {{Agreement Ref. No.}} for the agreement of your choice." },
              { text: "On the Agreement details page, scroll down to the {{Outcome Indicators}} section to view your outcome indicators for the agreement." },
            ],
          },
          {
            type: 'note',
            tone: 'warn',
            text: "The Outcome Indicators listed in the {{Outcome Submission}} tile should match the Outcome Indicators listed under the {{Agreement}} tile. If you identify any discrepancies, please reach out to your Account Managers.",
          },
        ],
      },
      {
        id: 'submitting-outcome-progress',
        title: 'Submitting Outcome Progress',
        summary: 'Create a new outcome submission, enter cumulative progress, and submit.',
        prerequisites: [
          "“Full Access” to {{Outcome Submission}} tile",
          "Active Agreement with Outcome Indicators",
        ],
        blocks: [
          {
            type: 'steps',
            items: [
              { text: "Search for the Agreement you wish to submit outcome progress for using the filters available." },
              { text: "Click on the {{Agreement Ref. No.}} to access the “Agreement Outcome Progress” page of the selected Agreement." },
              { text: "On the “Agreement Outcome Progress” page, click [[New Outcome Submission]]." },
              {
                text: "On the “New Outcome Submission” page, enter a brief description in the {{Submission description}} field.",
                note: "This description will appear beside your Outcome Submission ID, under “Past Submissions” in the “Agreement Outcome Progress” page. You may enter a description that helps you identify what this submission entails, e.g. “Outcome Submission for Jan 2022 to Mar 2022”.",
              },
              { text: "Under {{Is this the last outcome submission?}}, select [[Yes]] if your submission is the last outcome submission before the conclusion of this agreement. Otherwise, select [[No]]." },
              { text: "Under the {{Agreement Outcomes}} section, locate the outcome indicator you wish to submit progress for, and click [[Submit Progress]]." },
              {
                text: "A new line item will appear under the {{New Outcome Progress}} section. Use the scrollbar to scroll to the right, and enter your outcome progress in the field of your choice.",
                sub: [
                  "The fields available for your outcome progress reporting will depend on the {{Update Frequency}} in your agreement (e.g. monthly, yearly, biannually, etc.). This can be viewed under the {{Agreement Outcomes}} section.",
                  "Only **numerical values** are allowed in the outcome progress reporting fields. If the Target is in % format, please enter the numerical value only (e.g., if progress is 80%, enter “80”).",
                  "Outcome reporting should be **cumulative of past progress**. For e.g., if you had an outcome progress of “50” in May, and you previously reported “70” for your outcome progress in April, please enter the cumulative value when reporting progress for May, i.e., 70 + 50 = 120.",
                  "You will be able to submit outcome progress throughout the validity period of an Agreement. If you would like to submit outcome progress after the Agreement End Date, you will be able to do so by updating the value(s) in the latest period.",
                ],
              },
              { text: "Click the **tick** icon to save." },
              { text: "(Optional) Leave any note(s) for agency officers and click [[Add Note]] to save." },
              {
                text: "(Optional) Click [[Upload]] to upload any additional supporting document(s).",
                note: "Uploading of additional supporting documents is subjected to discussion with your Agreement Officer In-Charge.",
              },
              { text: "Click [[Submit]]." },
              { text: "You will see a banner message upon successful outcome submission: “Outcome submitted successfully”." },
              { text: "Once your outcome submission has been reviewed, its Status will be updated under “Past Submissions” in the “Agreement Outcome Progress” page." },
            ],
          },
          {
            type: 'note',
            tone: 'warn',
            title: 'Please note the following when uploading document(s)',
            text: "Maximum File Size allowed: 20MB. Accepted File Format: docx, xlsx, pdf, jpg. Only single file uploads are allowed.",
          },
          {
            type: 'screen',
            title: 'New Outcome Submission',
            caption: 'Schematic of the page built up in steps 4 to 11.',
            elements: [
              { kind: 'field', label: 'Submission description', value: 'Outcome Submission for Jan 2022 to Mar 2022' },
              { kind: 'text', text: 'Is this the last outcome submission?  ( ) Yes  (•) No' },
              { kind: 'heading', label: 'Agreement Outcomes' },
              {
                kind: 'table',
                head: ['Category', 'Level', 'First Tier Indicator', 'Second Tier Indicator', 'Target', 'Update Frequency', 'Current Progress', ''],
                rows: [['Survey/study', 'Skills/Curriculum Development', '<First tier indicator>', '<Second tier indicator>', '80 %', 'Semi-annually', '85', 'Submit Progress']],
              },
              { kind: 'heading', label: 'New Outcome Progress' },
              { kind: 'text', text: 'A new line item appears here. Scroll right, enter the cumulative progress for the period, then click the tick icon to save.' },
              { kind: 'upload', label: 'Upload (optional; max 20MB; docx, xlsx, pdf, jpg; single file)' },
              { kind: 'buttons', items: [{ label: 'Add Note' }, { label: 'Exit' }, { label: 'Save' }, { label: 'Submit', primary: true }] },
            ],
          },
          {
            type: 'table',
            caption: 'Outcome submission statuses under “Past Submissions”',
            head: ['Status', 'Description', 'Action Required from Programme Partner'],
            rows: [
              ['Approved', 'Outcome has been approved by Officers', 'No action required'],
              ['Draft', 'Outcome has not been submitted to Officers for processing', 'Programme Partners are able to edit / withdraw the outcome submission'],
              ['Returned', 'Outcome has been returned to Programme Partners for edits', 'Programme Partners are able to edit / withdraw the outcome submission'],
              ['Submitted', 'Outcome has been submitted to Officers', 'Outcome submission is pending review by Officers, no further action required until submission is processed by Officers'],
            ],
          },
          {
            type: 'note',
            tone: 'tip',
            text: "“Current Progress” under the {{Agreement Outcomes}} section will be updated upon approval of each outcome submission.",
          },
          {
            type: 'p',
            text: "**Discarding a draft.** If you wish to discard your draft outcome submission without submitting, click [[Exit]] at the bottom of the page to return to the Agreement Outcome Progress page.",
          },
          {
            type: 'p',
            text: "**Saving a draft.** If you wish to save your outcome submission as a draft without submitting, click [[Save]] at the bottom of the page. To resume working on this draft at a later stage:",
          },
          {
            type: 'steps',
            items: [
              { text: "On the “Agreement Outcome Progress” page, scroll down to the {{Past Submissions}} section and locate your draft outcome submission (it should appear as “Draft” under the Status column)." },
              { text: "Click the **three dots** (•••) to view the menu, and select [[Resume]]." },
              { text: "Otherwise, select [[Withdraw]] if you wish to delete your draft outcome submission." },
            ],
          },
          {
            type: 'screen',
            title: 'Agreement Outcome Progress: Past Submissions',
            caption: 'Schematic. The ••• menu on a Draft row offers Resume and Withdraw.',
            elements: [
              { kind: 'heading', label: 'Past Submissions' },
              {
                kind: 'table',
                head: ['Outcome Submission ID', 'Submission description', 'Status', ''],
                rows: [['SSG-OTC-2022-123456', 'Outcome Submission for Jan 2022 to Mar 2022', 'Draft', '•••']],
              },
              { kind: 'buttons', items: [{ label: 'Resume' }, { label: 'Withdraw' }] },
            ],
          },
          {
            type: 'note',
            tone: 'warn',
            title: 'Withdrawing a submission',
            text: "Once an outcome is submitted, the submission cannot be withdrawn until it is returned by the processing officer. You can only withdraw outcome submissions in the **Draft** or **Returned** status.",
          },
          {
            type: 'note',
            tone: 'warn',
            title: 'One in-flight submission at a time',
            text: "You can only have one in-flight outcome submission (i.e. outcome submission in Submitted status) at a time. You will encounter an error message if you attempt to submit another outcome before the first one is processed: “Previous submission still under review. Withdraw previous submission or wait for officer approval to proceed with a new submission”.",
          },
        ],
      },
    ],
  },

  // ─────────────────────── 11. Financial Transactions ───────────────────────
  {
    id: 11,
    audience: 'Training Providers and Programme Partners',
    updated: '23 August 2024',
    flowNode: 'Manage Grants and Receive Disbursements',
    intro:
      "This guide is meant for Training Providers and Programme Partners to manage financial transactions on TPGateway. It covers viewing received disbursements and viewing recovery transactions.",
    sections: [
      {
        id: 'at-a-glance',
        title: '“Financial Transactions” tile at a glance',
        summary: 'Two tabs, Disbursement and Recovery, with search filters and an Excel download.',
        blocks: [
          {
            type: 'screen',
            title: 'Financial Transactions',
            elements: [
              { kind: 'heading', label: 'Financial Transactions' },
              { kind: 'buttons', items: [{ label: 'Excel View', primary: true }] },
              { kind: 'text', text: "The default display shows your organisation's financial transactions in the last 180 days. You can choose to view up to 180 days' financial transactions by specifying the date range using the \"Payment From\" and \"Payment To\" filters." },
              { kind: 'tabs', items: ['Disbursement', 'Recovery'], active: 'Disbursement' },
              { kind: 'field', label: 'Payment From' },
              { kind: 'field', label: 'Payment To' },
              { kind: 'dropdown', label: 'Funding Component' },
              { kind: 'dropdown', label: 'Status' },
              { kind: 'text', text: 'Search filters: Claim Funding Component · Employer Name · Trainee ID · Course Run · Claim ID · Agreement ID · Search · Bank Reference Id · Clear Filter' },
              {
                kind: 'table',
                head: ['Financial Transaction ID', 'Enrolment ID', 'Claim ID', 'Agreement ID', 'Course Title', 'Course Run', 'Start Date', 'End Date', 'Funding Component'],
                rows: [],
              },
            ],
          },
        ],
      },
      {
        id: 'view-received-disbursements',
        title: 'View Received Disbursements',
        summary: 'Find a disbursement, match it to your bank statement, and download to Excel.',
        prerequisites: [
          "“Full Access” to {{Financial Transactions}} tile",
          "Grants disbursement criteria has been met / Claims have been submitted and approved",
        ],
        blocks: [
          {
            type: 'steps',
            items: [
              { text: "View all your received disbursements in Financial Transactions page under the {{Disbursement}} tab." },
              { text: "Click [[Excel View]] to download the displayed disbursements in an Excel file." },
            ],
          },
          {
            type: 'note',
            tone: 'tip',
            title: 'Tip',
            text: "Use the **FTX or FTB reference number provided in bank statement** to identify a specific disbursed grants. Key in the FTX or FTB number shown in your bank statement details in the search filters available on the Financial Transactions Dashboard to retrieve corresponding claim and agreement records. For bank statement details showing **FTX**-xxxx-xxxxxx, use the {{Search}} filter. For bank statement details showing **FTB**-xxxx-xxxxxx, use the {{Bank Reference ID}} filter.",
          },
          {
            type: 'screen',
            title: 'Disbursement tab: matching a bank statement reference',
            caption: 'Schematic of the two filters named in the tip.',
            elements: [
              { kind: 'tabs', items: ['Disbursement', 'Recovery'], active: 'Disbursement' },
              { kind: 'search', placeholder: 'Search (FTX-xxxx-xxxxxx)' },
              { kind: 'search', placeholder: 'Bank Reference Id (FTB-xxxx-xxxxxx)' },
              { kind: 'search', placeholder: 'Trainee ID' },
              { kind: 'buttons', items: [{ label: 'Excel View', primary: true }] },
            ],
          },
          {
            type: 'note',
            tone: 'warn',
            title: 'PayNow is required',
            text: "You will be required to set up **PayNow** in order to receive disbursements via TPGateway. Disbursements will NOT proceed until PayNow account is set up and details are updated in TPGateway in the {{Organisation Profile}} tile.",
          },
          {
            type: 'note',
            tone: 'info',
            title: 'Information on PayNow',
            text: "Please visit [https://www.abs.org.sg/consumer-banking/pay-now](https://www.abs.org.sg/consumer-banking/pay-now). Alternatively, contact your local bank on how to link your corporate account to PayNow.",
          },
          {
            type: 'note',
            tone: 'tip',
            text: "You can search for disbursements received by a particular trainee using the {{Trainee ID}} search filter.",
          },
        ],
      },
      {
        id: 'view-recovery-transactions',
        title: 'View Recovery Transactions',
        summary: 'See recovery transactions and download them to Excel.',
        prerequisites: ["“Full Access” to {{Financial Transactions}} tile"],
        blocks: [
          {
            type: 'steps',
            items: [
              { text: "View all your recovery transactions in Financial Transactions page under the {{Recovery}} tab." },
              { text: "Click [[Excel View]] to download your recovery transactions in an Excel file." },
            ],
          },
          {
            type: 'screen',
            title: 'Recovery tab',
            caption: 'Schematic.',
            elements: [
              { kind: 'tabs', items: ['Disbursement', 'Recovery'], active: 'Recovery' },
              { kind: 'search', placeholder: 'Trainee ID' },
              { kind: 'buttons', items: [{ label: 'Excel View', primary: true }] },
              { kind: 'text', text: 'Shows recovery transactions that are "Pending Payment" and "Paid".' },
            ],
          },
          {
            type: 'note',
            tone: 'tip',
            text: "You can search for recovery transactions for a particular trainee using the {{Trainee ID}} search filter.",
          },
          {
            type: 'note',
            tone: 'tip',
            text: "Recovery transactions that are “Pending Payment” and “Paid” will be displayed in the {{Recovery}} tab.",
          },
          {
            type: 'note',
            tone: 'tip',
            text: "You can view any in-system recovery notification and reminders sent to you by clicking on the **bell** button at the top right of the page.",
          },
        ],
      },
    ],
  },

  // ─────────────────────────────── 12. Refunds ───────────────────────────────
  {
    id: 12,
    audience: 'Programme Partners',
    updated: '8 November 2022',
    intro:
      "This guide is meant for Programme Partners to submit refund requests for programme and grant administration transactions. It covers initiating a refund request.",
    sections: [
      {
        id: 'general-process',
        title: 'General process for Programme Partners',
        summary: 'Where refunds sit in the Programme Partner journey. This guide covers **Submit Refund** (where applicable).',
        blocks: PP_PROCESS,
      },
      {
        id: 'at-a-glance',
        title: '“Refunds” tile at a glance',
        summary: 'The Refunds page lists your refund requests and their status.',
        blocks: [
          {
            type: 'screen',
            title: 'Refunds',
            elements: [
              { kind: 'heading', label: 'Refunds' },
              { kind: 'buttons', items: [{ label: 'Excel View' }, { label: 'Initiate Refunds', primary: true }] },
              { kind: 'field', label: 'Agreement Ref. No.' },
              { kind: 'field', label: 'Claim ID' },
              { kind: 'dropdown', label: 'Status' },
              { kind: 'buttons', items: [{ label: 'Search', primary: true }, { label: 'Clear Filter' }] },
              {
                kind: 'table',
                head: ['Agreement Ref. No.', 'Claim ID', 'Grant ID', 'Financial Transaction ID', 'Amount', 'Request Submitted On', 'Status', 'Reason for Refund'],
                rows: [['XXX-XXX', 'XXX-XXX', 'XXX-XXX', 'XXX-XXX', '$XXX.XX', 'DD-MM-YYYY', 'Pending Review', '<Reason>']],
              },
            ],
          },
          {
            type: 'note',
            tone: 'info',
            text: "Click [[Excel View]] to view the table's details in an Excel file. All records will be downloaded if no filters are applied.",
          },
        ],
      },
      {
        id: 'initiate-refund-request',
        title: 'Initiate a Refund Request',
        summary: 'Pay the refund to the agency first, then record it on TPGateway.',
        prerequisites: [
          "“Full Access” to {{Refunds}} tile",
          "Registered Agreement (that has not been closed) and claim(s) in **Paid** status",
          "There are unutilised funds in the grants disbursed to you and/or you have been informed by agency officers/account managers to initiate a refund",
          "Programme Partner (PP) has liaised with Agency Officers offline to confirm payment details and refund amount",
          "PP has completed refund payment to the Agency and has obtained remittance proof",
        ],
        blocks: [
          {
            type: 'steps',
            items: [
              { text: "Click [[Initiate Refunds]]." },
              {
                text: "Enter the {{Agreement Reference Number}} and click [[Retrieve Grants]].",
                note: "Optional: You may input other parameters to narrow the search result if there are many grants tied to the Agreement.",
              },
              { text: "Check the checkbox to select the grants to submit the refund request for." },
              {
                text: "Provide input for {{Refund Amount}} and {{Reason for Refund}}.",
                note: "You may enter {{Refund Amount}} for multiple grants under the same claim in a single refund request submission.",
              },
              { text: "Enter the {{Payment Reference Number}}." },
              { text: "Click [[Proceed]]." },
              {
                text: "(Optional) Click [[Upload]] to upload any additional supporting documents and select the type of supporting documents from the dropdown.",
                note: "Uploading of additional supporting documents is subjected to discussion with your Agreement Officer In-Charge.",
              },
              { text: "Check the checkbox to agree to the declaration." },
              { text: "Click [[Submit]]." },
              { text: "Upon successful submission of refund request, you will see the following success banner message: “Refund request submitted successfully”." },
            ],
          },
          {
            type: 'defs',
            items: [
              {
                term: 'What is Payment Reference Number?',
                text: "Programme Partners (PPs) are required to complete their refund payment before initiating a Refund request on TPGateway. Payment Ref. No. is the receipt no. indicating proof of refund payment from the PP to the agency. For example, if a PP uploads the Bank Remittance Advice as a supporting document, the Payment Ref. No. should match the reference no. on this document.",
              },
            ],
          },
          {
            type: 'screen',
            title: 'Initiate Refunds: select grants and enter refund details',
            caption: 'Schematic of steps 2 to 6.',
            elements: [
              { kind: 'field', label: 'Agreement Reference Number', value: 'XXX-XXX', required: true },
              { kind: 'buttons', items: [{ label: 'Retrieve Grants' }] },
              {
                kind: 'table',
                head: ['Select', 'Claim ID', 'Grant ID', 'Refund Amount', 'Reason for Refund'],
                rows: [['[x]', 'XXX-XXX', 'XXX-XXX', '$XXX.XX', '<Reason>']],
              },
              { kind: 'field', label: 'Payment Reference Number', required: true },
              { kind: 'buttons', items: [{ label: 'Proceed', primary: true }] },
            ],
          },
          {
            type: 'note',
            tone: 'warn',
            title: 'Please note the following when uploading document(s)',
            text: "Maximum File Size allowed: 20MB. Accepted File Format: docx, xlsx, pdf, jpg. Only single file uploads are allowed.",
          },
          {
            type: 'screen',
            title: 'Initiate Refunds: supporting documents and declaration',
            caption: 'Schematic of steps 7 to 10.',
            elements: [
              { kind: 'upload', label: 'Upload (optional; max 20MB; docx, xlsx, pdf, jpg; single file)' },
              { kind: 'dropdown', label: 'Type of supporting documents' },
              { kind: 'checkbox', label: 'I agree to the declaration', checked: true },
              { kind: 'buttons', items: [{ label: 'Submit', primary: true }] },
              { kind: 'text', text: 'Refund request submitted successfully' },
            ],
          },
        ],
      },
    ],
  },

  // ───────────────────────────── 13. eCertificates ─────────────────────────────
  {
    id: 13,
    audience: 'Training Providers',
    updated: '5 April 2021',
    flowNode: 'Download eCert',
    intro:
      "This guide is meant for Training Providers to download eCertificates. It covers downloading eCertificates for individual trainees and requesting a mass OpenCerts download.",
    sections: [
      {
        id: 'at-a-glance',
        title: '“Certificates” tile at a glance',
        summary: 'The Certificates Download page searches eCertificates by trainee ID.',
        blocks: [
          {
            type: 'screen',
            title: 'Certificates Download',
            elements: [
              { kind: 'tabs', items: ['Profile', 'Course Run', 'Trainers', 'Course Tagging', 'Brochures', 'Certificates Download', 'Attendance'], active: 'Certificates Download' },
              { kind: 'heading', label: 'Certificates Download' },
              { kind: 'buttons', items: [{ label: 'MASS OPENCERTS DOWNLOAD', primary: true }] },
              { kind: 'text', text: 'Download the e-Cert based on the NRIC(s)/FIN(s)/Other(s). You can add up to 15 NRIC(s)/FIN(s)/Other(s).' },
              { kind: 'buttons', items: [{ label: '+ Add NRIC/FIN/Other' }] },
              { kind: 'field', label: 'NRIC(s)/FIN(s)/Other(s)' },
              { kind: 'field', label: 'Date of Assessment (optional)' },
              { kind: 'dropdown', label: 'Type of e-Cert', value: 'All' },
              { kind: 'buttons', items: [{ label: 'SEARCH', primary: true }] },
            ],
          },
          {
            type: 'note',
            tone: 'info',
            text: "Please check [https://www.tpgateway.gov.sg/who-we-are/self-help-guides](https://www.tpgateway.gov.sg/who-we-are/self-help-guides) regularly for any updates to the self-help materials.",
          },
        ],
      },
      {
        id: 'download-ecertificates',
        title: 'Download eCertificates',
        summary: 'Search by trainee ID (up to 15 per request) and download.',
        prerequisites: [
          "“Full Access” to {{Certificates}} tile",
          "Assessment records for WSQ course have been uploaded **at least one day before**",
        ],
        blocks: [
          {
            type: 'steps',
            items: [
              { text: "Enter trainee's ID." },
              { text: "(Optional) Click [[+ Add NRIC/FIN/Other]] to add more trainees (up to 15 per search request)." },
              { text: "Select {{Type of e-Cert}} from the dropdown." },
              { text: "Click [[SEARCH]]." },
              { text: "Select the eCertificates to download." },
            ],
          },
          {
            type: 'screen',
            title: 'Certificates Download: search',
            caption: 'Schematic, with a placeholder trainee ID.',
            elements: [
              { kind: 'buttons', items: [{ label: '+ Add NRIC/FIN/Other' }] },
              { kind: 'field', label: 'NRIC(s)/FIN(s)/Other(s)', value: 'S1234567A' },
              { kind: 'field', label: 'Date of Assessment (optional)' },
              { kind: 'dropdown', label: 'Type of e-Cert', value: 'All' },
              { kind: 'buttons', items: [{ label: 'SEARCH', primary: true }] },
            ],
          },
          {
            type: 'note',
            tone: 'tip',
            text: "eCertificates will be **automatically generated** and issued if trainees have met criteria.",
          },
        ],
      },
      {
        id: 'download-mass-opencerts',
        title: 'Download Mass OpenCerts',
        summary: 'Request a batch file of OpenCerts for a date range and course.',
        prerequisites: [
          "“Full Access” to {{Certificates}} tile",
          "Assessment records for WSQ course have been uploaded",
          "You must be a recognised OpenCerts issuer. Please refer to [https://docs.opencerts.io/identity_registry](https://docs.opencerts.io/identity_registry) to register your interest if you wish to be added to the registry of recognised issuers",
        ],
        blocks: [
          {
            type: 'steps',
            items: [
              { text: "Click [[MASS OPENCERTS DOWNLOAD]]." },
              { text: "Enter date range of assessment, type of OpenCerts and Course title." },
              {
                text: "Click [[Submit]] to request for mass OpenCerts download.",
                note: "Each file would be processed and made available for download within 24 hours.",
              },
            ],
          },
          {
            type: 'screen',
            title: 'Mass OpenCerts Download',
            caption: 'Schematic of the inputs named in the guide.',
            elements: [
              { kind: 'field', label: 'Date range of assessment' },
              { kind: 'dropdown', label: 'Type of OpenCerts' },
              { kind: 'field', label: 'Course title' },
              { kind: 'buttons', items: [{ label: 'Submit', primary: true }] },
            ],
          },
          {
            type: 'note',
            tone: 'warn',
            text: "Batch file will be purged **after 7 calendar days**.",
          },
        ],
      },
    ],
  },
];
