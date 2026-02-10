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
