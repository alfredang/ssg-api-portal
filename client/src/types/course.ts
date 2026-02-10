export interface CodeDescription {
  code: string | number;
  description: string;
}

export interface Email {
  full: string;
  localPart: string;
  atSign: string;
  domain: string;
}

export interface Telephone {
  internationalPrefix: string;
  countryCode: number;
  areaCode: number;
  number: number;
}

export interface Meta {
  createBy: string;
  createDate: string;
  updateBy: string;
  updateDate: string;
}

export interface ContactPerson {
  id: string;
  fullName: string;
  email: Email;
  salutation: string;
  designation: string;
  role: string;
  telephone: Telephone;
  meta: Meta;
}

export interface Address {
  id: number;
  uen: string;
  typeId: string;
  block: string;
  street: string;
  floor: string;
  unit: string;
  building: string;
  postalCode: string;
  meta: Meta;
}

export interface TrainingProvider {
  uen: string;
  code: string;
  name: string;
  email: string;
  websiteUrl: string;
  yearOfEstablishment: string;
  trainingProviderType: string;
  address: Address[];
  contactNumber: { id: number; telephone: Telephone }[];
}

export interface CourseRun {
  id: number;
  referenceNumber: string;
  registrationOpeningDate: number;
  registrationClosingDate: number;
  courseStartDate: number;
  courseEndDate: number;
  scheduleInfoType: CodeDescription;
  scheduleInfo: string;
  block: string;
  street: string;
  floor: string;
  unit: string;
  building: string;
  postalCode: number | string;
  room: string;
  wheelChairAccess: boolean;
  intakeSize: number;
  modeOfTraining: string;
  courseAdminEmail: string;
  courseVacancy: CodeDescription;
}

export interface WsqFramework {
  wsqFrameworkCode: string;
  wsqFrameworkDescription: string;
  competencyStandardCode: string;
  competencyStandardDescription: string;
}

export interface Fee {
  id: number;
  feeType: string;
  feeTypeEffectiveDate: number;
  feeUpdateDate: number;
}

export interface CourseModule {
  courseReferenceNumber: string;
  courseTitle: string;
}

export interface JobRole {
  typeId: string;
  code: string;
  title: string;
  salaryRange: string;
  sectorCode: string;
  sectorDescription: string;
}

export interface Course {
  referenceNumber: string;
  skillsConnectReferenceNumber: string;
  externalReferenceNumber: string;
  title: string;
  objective: string;
  content: string;
  url: string;
  registrationUrl: string;
  numberOfTrainingDay: number;
  totalTrainingDurationHour: number;
  totalCostOfTrainingPerTrainee: number;
  lengthOfCourseDuration: number;
  trainingProviderAlias: string;
  entryRequirement: string;
  createDate: number;
  initiatives: string;
  isExaminable: string;
  targetWorkforceSegment: CodeDescription;
  publicFundingIndicator: CodeDescription;
  cluster: CodeDescription;
  qualificationAttained: CodeDescription;
  contactPerson: ContactPerson[];
  trainingProvider: TrainingProvider;
  status: CodeDescription;
  category: CodeDescription;
  fees: Fee[];
  view: CodeDescription;
  runs: CourseRun[];
  jobRoles: JobRole[];
  sectors: CodeDescription[];
  areaOfTrainings: CodeDescription[];
  methodOfDeliveries: CodeDescription[];
  modeOfTrainings: CodeDescription[];
  mediumOfInstructions: CodeDescription[];
  jobLevels: CodeDescription[];
  targetTrainingGroups: CodeDescription[];
  locationOfTrainings: CodeDescription[];
  wsqFrameworks: WsqFramework[];
  modules: CourseModule[];
  description: string;
}

export interface CourseResponse {
  status: number;
  data: {
    courses: Course[];
  };
  meta: Record<string, unknown>;
}
