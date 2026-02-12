export interface CodeDescription {
  code: string | number;
  description: string;
}

export interface CourseMeta {
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
}

export interface Tag {
  code: string;
  type: string;
  description: string;
}

export interface Skill {
  code: string;
  framework: string;
  description: string;
  industry?: CodeDescription;
  type?: CodeDescription;
  titleCodeLevel?: string;
}

export interface UniqueSkill {
  id: string;
  type: string;
  title: string;
  skillTag: string;
  seaSource: string;
}

export interface Bundle {
  code: string;
  type: string;
  description: string;
}

export interface SupportPeriod {
  startDate: string;
  endDate: string;
}

export interface Support {
  code: number;
  description: string;
  period: SupportPeriod[];
}

export interface EmailAddress {
  full: string;
  localPart: string;
  atSign: string;
  domain: string;
}

export interface PhoneNumber {
  internationalPrefix: string;
  countryCode: string;
  areaCode: string;
  number: string;
}

export interface ContactPerson {
  fullName: string;
  designation: string;
  role: CodeDescription;
  salutation: CodeDescription;
  emailAddress: EmailAddress;
  officeNumber: PhoneNumber;
}

export interface CostComponent {
  type: CodeDescription;
  amount: number;
}

export interface CostOfTraining {
  cost: number;
  currency: string;
  feeType: CodeDescription;
}

export interface ModeOfLearning {
  type: CodeDescription;
  hours: number;
}

export interface TrainingPartner {
  uen: string;
  code: string;
  name: string;
}

export interface SupportingAgency {
  uen: string;
  code: string;
  name: string;
}

export interface ExternalAccreditation {
  accreditingAgency: {
    name: string;
    certification: string;
  };
}

export interface TrainingLocation {
  code: number;
  description: string;
  country?: CodeDescription;
}

export interface Course {
  url: string;
  meta: CourseMeta;
  tags: Tag[];
  title: string;
  skills: Skill[];
  bundles: Bundle[];
  support: Support[];
  isActive: string;
  languages: CodeDescription[];
  objectives: string;
  description: string;
  trainingMode: CodeDescription;
  uniqueSkills: UniqueSkill[];
  programmeType: CodeDescription;
  areaOfTraining: CodeDescription;
  contactPersons: ContactPerson[];
  costComponents: CostComponent[];
  isCorporateRun: string;
  submissionType: CodeDescription;
  targetAudience: CodeDescription;
  learningPathway: CodeDescription;
  modesOfLearning: ModeOfLearning[];
  referenceNumber: string;
  trainingPartner: TrainingPartner;
  natureOfTraining: CodeDescription;
  noOfTrainingDays: number;
  suitableJobRoles: string;
  trainingLocation: TrainingLocation;
  endorsingAgencyUEN: string;
  isCourseExaminable: string;
  supportingAgencies: SupportingAgency[];
  accreditingAgencyUEN: string;
  externalAccreditations: ExternalAccreditation[];
  migratedReferenceNumber: string;
  costOfTrainingPerTrainee: CostOfTraining;
  minimumEntryRequirements: string;
  assessmentPartneringCenter: TrainingPartner;
  totalTrainingDurationHours: number;
  lengthOfCourseDurationMonths: number;
}

export interface QualityRating {
  average: number;
  starsRating: number;
}

export interface CourseQuality {
  numberOfRespondents: number;
  customerService: QualityRating;
  trainerCourseContent: QualityRating;
  learning: QualityRating;
  overallQuality: QualityRating;
  meta: {
    createBy: string;
    updateBy: string;
    createDate: string;
    updateDate: string;
  };
}

export interface CourseQualityResponse {
  status: number;
  data: {
    quality: CourseQuality;
  };
  meta: Record<string, unknown>;
  error: Record<string, unknown>;
}

export interface CourseOutcome {
  numberOfRespondents: number;
  ableToApplyLearning: QualityRating;
  betterJobPerformance: QualityRating;
  expandedJobScope: QualityRating;
  overallOutcome: QualityRating;
  meta: {
    createBy: string;
    updateBy: string;
    createDate: string;
    updateDate: string;
  };
}

export interface CourseOutcomeResponse {
  status: number;
  data: {
    outcome: CourseOutcome;
  };
  meta: Record<string, unknown>;
  error: Record<string, unknown>;
}

export interface SessionVenue {
  block: string;
  street: string;
  floor: string;
  unit: string;
  building: string;
  postalCode: number;
  room: string;
  wheelChairAccess: boolean;
}

export interface AttendanceTrainee {
  individualId: string;
  accountType: string;
  name: string;
  id: string;
  attendeeType: string;
  idType: CodeDescription;
  email: string;
  contactNumber: {
    countryCode: number;
    areaCode: number;
    mobile: string;
  };
  surveyLanguage: CodeDescription;
}

export interface SessionAttendance {
  id: number;
  entryMode: string;
  status: string;
  nric: string;
  editedByTP: string;
  sentToTraqom: string;
  latitude: string;
  longitude: string;
  manuallyAdded: boolean;
  trainee: AttendanceTrainee;
  errorMessage: string | null;
}

export interface CourseSession {
  id: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  modeOfTraining: string;
  venue: SessionVenue;
  attendance: SessionAttendance[];
}

export interface AttendanceCourseRun {
  id: number;
  title: string;
  referenceNumber: string;
  externalReferenceNumber: string;
  modeOfTraining: string;
  courseDates: {
    start: number;
    end: number;
  };
  sessions: CourseSession[];
}

export interface SessionAttendanceResponse {
  status: number;
  data: {
    courseRun: AttendanceCourseRun;
  };
  meta: {
    total: number;
  };
  error: Record<string, unknown>;
}

export interface CourseRunSession {
  id: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  modeOfTraining: string;
  venue: SessionVenue;
  attendanceTaken: boolean;
  deleted: boolean;
}

export interface CourseSessionsResponse {
  status: number;
  data: {
    sessions: CourseRunSession[];
  };
  meta: {
    total: number;
  };
  error: Record<string, unknown>;
}

export interface UploadAttendanceRequest {
  uen: string;
  course: {
    sessionID: string;
    attendance: {
      status: {
        code: string;
      };
      trainee: {
        id: string;
        name: string;
        email: string;
        idType: {
          code: string;
        };
        contactNumber: {
          mobile: string;
          areaCode: string | null;
          countryCode: number;
        };
        numberOfHours: number;
        surveyLanguage: {
          code: string;
        };
      };
    };
    referenceNumber: string;
  };
  corppassId: string;
}

export interface UploadAttendanceResponse {
  status: number;
  data: Record<string, unknown>;
  meta: Record<string, unknown>;
  error: Record<string, unknown>;
}

export interface Trainer {
  indexNumber: number;
  id: string;
  name: string;
  email: string;
  idNumber: string;
  idType: { id: string; description: string };
  roles: { role: { id: number; description: string } }[];
  inTrainingProviderProfile: boolean;
  domainAreaOfPractice: string;
  experience: string;
  linkedInURL: string;
  salutationId: number;
  totalCourseRunLinkWithTrainer: number;
  qualifications: { description: string; level: CodeDescription }[];
  photo: { name: string; content: string } | null;
}

export interface TrainersResponse {
  status: number;
  data: {
    trainers: Trainer[];
  };
  meta: {
    total: number;
    page: number;
    pageSize: number;
  };
  error: Record<string, unknown>;
}

export interface UpdateTrainerRequest {
  trainer: {
    name: string;
    email: string;
    photo?: {
      name: string;
      content: string;
    } | null;
    roles: { role: { id: number; description: string } }[];
    action: 'update' | 'delete';
    idType: {
      code: string;
      description: string;
    };
    idNumber: string;
    experience: string;
    linkedInURL: string;
    salutationId: number;
    qualifications: { level: { code: string }; description: string }[];
    domainAreaOfPractice: string;
  };
}

export interface UpdateTrainerResponse {
  status: number;
  data: Record<string, unknown>;
  meta: Record<string, unknown>;
  error: Record<string, unknown>;
}

export interface PopularCoursesResponse {
  status: number;
  data: {
    courses: Course[];
  };
  meta: {
    total: number;
    page: number;
    pageSize: number;
  };
  error: Record<string, unknown>;
}

export interface PublishCourseRunVenue {
  block: string;
  street: string;
  floor: string;
  unit: string;
  building: string;
  postalCode: string;
  room: string;
  wheelChairAccess: boolean;
  primaryVenue?: boolean;
}

export interface PublishCourseRunSession {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  modeOfTraining: string;
  venue: PublishCourseRunVenue;
}

export interface PublishCourseRunTrainer {
  trainerType: CodeDescription;
  indexNumber: number;
  id: string;
  name: string;
  email: string;
  idNumber: string;
  idType: CodeDescription;
  roles: { role: { id: number; description: string } }[];
  inTrainingProviderProfile: boolean;
  domainAreaOfPractice: string;
  experience: string;
  linkedInURL: string;
  salutationId: number;
  photo: { name: string; content: string } | null;
  linkedSsecEQAs?: { description: string; ssecEQA: { code: string } }[];
}

export interface PublishCourseRun {
  sequenceNumber: number;
  registrationDates: { opening: number; closing: number };
  courseDates: { start: number; end: number };
  scheduleInfoType: CodeDescription;
  scheduleInfo: string;
  venue: PublishCourseRunVenue;
  intakeSize: number;
  threshold: number;
  registeredUserCount: number;
  modeOfTraining: string;
  courseAdminEmail: string;
  toAppendCourseApplicationURL: boolean;
  courseApplicationUrl: string;
  courseVacancy: CodeDescription;
  notShownToPublic: boolean;
  file?: { Name: string; content: string } | null;
  sessions: PublishCourseRunSession[];
  linkCourseRunTrainer: { trainer: PublishCourseRunTrainer }[];
}

export interface PublishCourseRunRequest {
  course: {
    courseReferenceNumber: string;
    trainingProvider: { uen: string };
    runs: PublishCourseRun[];
  };
}

export interface PublishCourseRunResponse {
  status: number;
  data: Record<string, unknown>;
  meta: Record<string, unknown>;
  error: Record<string, unknown>;
}

export interface EditCourseRunSession {
  action: 'update' | 'delete';
  sessionId: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  modeOfTraining: string;
  venue: PublishCourseRunVenue;
}

export interface EditCourseRun {
  action: 'update' | 'delete';
  sequenceNumber: number;
  registrationDates: { opening: number; closing: number };
  courseDates: { start: number; end: number | string };
  scheduleInfoType: CodeDescription;
  scheduleInfo: string;
  venue: PublishCourseRunVenue;
  intakeSize: number;
  threshold: number;
  registeredUserCount: number;
  modeOfTraining: string;
  courseAdminEmail: string;
  toAppendCourseApplicationURL: boolean;
  courseApplicationUrl: string;
  courseVacancy: CodeDescription;
  notShownToPublic: boolean;
  file?: { Name: string; content: string } | null;
  sessions: EditCourseRunSession[];
  linkCourseRunTrainer: { trainer: PublishCourseRunTrainer }[];
}

export interface EditCourseRunRequest {
  course: {
    courseReferenceNumber: string;
    trainingProvider: { uen: string };
    run: EditCourseRun;
  };
}

export interface EditCourseRunResponse {
  status: number;
  data: Record<string, unknown>;
  meta: Record<string, unknown>;
  error: Record<string, unknown>;
}

export interface CourseRunsByRefResponse {
  status: number;
  data: Record<string, unknown>;
  meta: {
    total: number;
    page: number;
    pageSize: number;
  };
  error: Record<string, unknown>;
}

export interface CourseRunByIdResponse {
  status: number;
  data: Record<string, unknown>;
  meta: Record<string, unknown>;
  error: Record<string, unknown>;
}

export interface CourseResponse {
  status: number;
  data: {
    courses: Course[];
  };
  meta: Record<string, unknown>;
}

export interface CourseSearchResponse {
  status: number;
  data: {
    courses: Course[];
  };
  meta: {
    total: number;
  };
}

// Grant Calculator types
export interface GrantBaselineRequest {
  courses: {
    trainingPartnerUen: string;
    courseReferenceNumber: string;
  }[];
}

export interface GrantBaselineResponse {
  status?: number;
  data?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  error?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface GrantPersonalisedRequest {
  courses: {
    trainingPartnerUen: string;
    courseReferenceNumber: string;
  }[];
  applicant: {
    sme: string;
    nric: string;
    nricType: string;
    employerSponsored: string;
  };
  course: {
    referenceNumber: string;
    startDate: string;
  };
  trainee: {
    idType: string;
    id: string;
    dateOfBirth: string;
    sponsoringEmployerUen: string;
    modularisedSCTPBundleCourseStartDate?: string;
  };
}

export interface GrantPersonalisedResponse {
  status?: number;
  data?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  error?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface GrantSearchRequest {
  meta?: {
    lastUpdateDateTo?: string;
    lastUpdateDateFrom?: string;
  };
  grants?: {
    course?: {
      run?: { id: string };
      referenceNumber?: string;
    };
    trainee?: { id: string };
    employer?: { uen: string };
    enrolment?: { referenceNumber: string };
    trainingPartner?: { uen: string; code: string };
  };
  sortBy?: { field: string; order: string };
  parameters?: { page: number; pageSize: number };
}

export interface GrantSearchResponse {
  status?: number;
  data?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  error?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface GrantDetailsResponse {
  status?: number;
  data?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  error?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface GrantCodeLookupResponse {
  status?: number;
  data?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  error?: Record<string, unknown>;
  [key: string]: unknown;
}

// SkillsFuture Credit Pay types
export interface SfClaimDetailsResponse {
  status?: number;
  data?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  error?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SfCancelClaimRequest {
  nric: string;
  claimCancelCode: string;
}

export interface SfCancelClaimResponse {
  status?: number;
  data?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  error?: Record<string, unknown>;
  [key: string]: unknown;
}

// Enrolment types
export interface EnrolmentResponse {
  status?: number;
  data?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  error?: Record<string, unknown>;
  [key: string]: unknown;
}
