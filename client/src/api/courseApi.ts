import axios from 'axios';
import type { CourseResponse, CourseSearchResponse, CourseQualityResponse, CourseOutcomeResponse, SessionAttendanceResponse, CourseSessionsResponse, UploadAttendanceRequest, UploadAttendanceResponse, TrainersResponse, UpdateTrainerRequest, UpdateTrainerResponse, PopularCoursesResponse, PublishCourseRunRequest, PublishCourseRunResponse, EditCourseRunRequest, EditCourseRunResponse, CourseRunByIdResponse, CourseRunsByRefResponse, GrantBaselineRequest, GrantBaselineResponse, GrantPersonalisedRequest, GrantPersonalisedResponse, GrantSearchRequest, GrantSearchResponse, GrantDetailsResponse, GrantCodeLookupResponse, SfClaimDetailsResponse, SfCancelClaimRequest, SfCancelClaimResponse, EnrolmentResponse } from '../types/course';

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
  },
});

// Attach the selected certificate ID to every request
apiClient.interceptors.request.use((config) => {
  const certId = localStorage.getItem('ssg-active-cert') || '1';
  config.headers['x-cert-id'] = certId;
  return config;
});

export async function getCourseByRefNo(refNo: string, includeExpired = true) {
  const response = await apiClient.get<CourseResponse>(
    `/courses/${encodeURIComponent(refNo)}`,
    { params: { includeExpired } }
  );
  return response.data;
}

export async function getCourseQuality(refNo: string) {
  const response = await apiClient.get<CourseQualityResponse>(
    `/courses/${encodeURIComponent(refNo)}/quality`
  );
  return response.data;
}

export async function getCourseOutcome(refNo: string) {
  const response = await apiClient.get<CourseOutcomeResponse>(
    `/courses/${encodeURIComponent(refNo)}/outcome`
  );
  return response.data;
}

export async function getSessionAttendance(params: {
  runId: string;
  uen: string;
  courseReferenceNumber: string;
  sessionId?: string;
}) {
  const queryParams: Record<string, string> = {
    uen: params.uen,
    courseReferenceNumber: params.courseReferenceNumber,
  };
  if (params.sessionId) queryParams.sessionId = params.sessionId;

  const response = await apiClient.get<SessionAttendanceResponse>(
    `/courses/runs/${encodeURIComponent(params.runId)}/sessions/attendance`,
    { params: queryParams }
  );
  return response.data;
}

export async function getCourseSessions(params: {
  runId: string;
  uen: string;
  courseReferenceNumber: string;
  sessionMonth?: string;
  includeExpiredCourses?: boolean;
}) {
  const queryParams: Record<string, string> = {
    uen: params.uen,
    courseReferenceNumber: params.courseReferenceNumber,
  };
  if (params.sessionMonth) queryParams.sessionMonth = params.sessionMonth;
  if (params.includeExpiredCourses !== undefined) queryParams.includeExpiredCourses = String(params.includeExpiredCourses);

  const response = await apiClient.get<CourseSessionsResponse>(
    `/courses/runs/${encodeURIComponent(params.runId)}/sessions`,
    { params: queryParams }
  );
  return response.data;
}

export async function getCourseDetails(refNo: string, uen: string, courseRunStartDate?: string) {
  const params: Record<string, string> = { uen };
  if (courseRunStartDate) params.courseRunStartDate = courseRunStartDate;

  const response = await apiClient.get<CourseResponse>(
    `/courses/details/${encodeURIComponent(refNo)}`,
    { params }
  );
  return response.data;
}

export async function uploadSessionAttendance(runId: string, body: UploadAttendanceRequest) {
  const response = await apiClient.post<UploadAttendanceResponse>(
    `/courses/runs/${encodeURIComponent(runId)}/sessions/attendance/upload`,
    body
  );
  return response.data;
}

export async function getTrainers(params: {
  uen: string;
  pageSize?: number;
  page?: number;
  keyword?: string;
}) {
  const queryParams: Record<string, string> = {
    pageSize: String(params.pageSize ?? 20),
    page: String(params.page ?? 0),
  };
  if (params.keyword) queryParams.keyword = params.keyword;

  const response = await apiClient.get<TrainersResponse>(
    `/training-providers/${encodeURIComponent(params.uen)}/trainers`,
    { params: queryParams }
  );
  return response.data;
}

export async function updateTrainer(uen: string, trainerId: string, body: UpdateTrainerRequest) {
  const response = await apiClient.post<UpdateTrainerResponse>(
    `/training-providers/${encodeURIComponent(uen)}/trainers/${encodeURIComponent(trainerId)}`,
    body
  );
  return response.data;
}

export async function getPopularCourses(params: {
  pageSize?: number;
  page?: number;
  taggingCode?: string;
}) {
  const queryParams: Record<string, string> = {
    pageSize: String(params.pageSize ?? 20),
    page: String(params.page ?? 0),
  };
  if (params.taggingCode) queryParams.taggingCode = params.taggingCode;

  const response = await apiClient.get<PopularCoursesResponse>(
    '/courses/popular',
    { params: queryParams }
  );
  return response.data;
}

export async function publishCourseRun(body: PublishCourseRunRequest, includeExpiredCourses = true) {
  const response = await apiClient.post<PublishCourseRunResponse>(
    '/courses/courseRuns/publish',
    body,
    { params: { includeExpiredCourses } }
  );
  return response.data;
}

export async function getCourseRunById(runId: string, includeExpiredCourses = true) {
  const response = await apiClient.get<CourseRunByIdResponse>(
    `/courses/courseRuns/id/${encodeURIComponent(runId)}`,
    { params: { includeExpiredCourses } }
  );
  return response.data;
}

export async function getCourseRunsByRef(params: {
  courseReferenceNumber: string;
  uen?: string;
  pageSize?: number;
  page?: number;
  tpCode?: string;
  courseRunStartDate?: string;
  includeExpiredCourses?: boolean;
}) {
  const queryParams: Record<string, string> = {
    courseReferenceNumber: params.courseReferenceNumber,
    pageSize: String(params.pageSize ?? 20),
    page: String(params.page ?? 0),
  };
  if (params.uen) queryParams.uen = params.uen;
  if (params.tpCode) queryParams.tpCode = params.tpCode;
  if (params.courseRunStartDate) queryParams.courseRunStartDate = params.courseRunStartDate;
  if (params.includeExpiredCourses !== undefined) queryParams.includeExpiredCourses = String(params.includeExpiredCourses);

  const response = await apiClient.get<CourseRunsByRefResponse>(
    '/courses/courseRuns/reference',
    { params: queryParams }
  );
  return response.data;
}

export async function editCourseRun(runId: string, body: EditCourseRunRequest, includeExpiredCourses = true) {
  const response = await apiClient.post<EditCourseRunResponse>(
    `/courses/courseRuns/edit/${encodeURIComponent(runId)}`,
    body,
    { params: { includeExpiredCourses } }
  );
  return response.data;
}

export interface CourseSearchParams {
  uen: string;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export async function searchCourses(params: CourseSearchParams) {
  const body: Record<string, unknown> = {
    uen: params.uen,
    keyword: params.keyword || '',
    page: params.page ?? 0,
    pageSize: params.pageSize ?? 5,
    details: 'FULL',
    sortBy: {
      field: 'updatedDate',
      order: 'desc',
    },
    course: {
      meta: {
        updatedDate: {
          from: params.dateFrom || '2019-01-01',
          to: params.dateTo || new Date().toISOString().slice(0, 10),
        },
      },
    },
  };

  const response = await apiClient.post<CourseSearchResponse>('/courses/search', body);
  return response.data;
}

export async function getTrainingProviderCourses(params: {
  uen: string;
  pageSize?: number;
  page?: number;
  keyword?: string;
  includeExpiredCourses?: boolean;
}) {
  const queryParams: Record<string, string> = {
    pageSize: String(params.pageSize ?? 20),
    page: String(params.page ?? 0),
  };
  if (params.keyword) queryParams.keyword = params.keyword;
  if (params.includeExpiredCourses !== undefined) queryParams.includeExpiredCourses = String(params.includeExpiredCourses);

  const response = await apiClient.get<Record<string, unknown>>(
    `/training-providers/${encodeURIComponent(params.uen)}/courses`,
    { params: queryParams }
  );
  return response.data;
}

// Grant Calculator APIs

export async function getGrantBaseline(body: GrantBaselineRequest) {
  const response = await apiClient.post<GrantBaselineResponse>('/grants/baseline', body);
  return response.data;
}

export async function getGrantPersonalised(body: GrantPersonalisedRequest) {
  const response = await apiClient.post<GrantPersonalisedResponse>('/grants/personalised', body);
  return response.data;
}

export async function searchGrants(body: GrantSearchRequest, uen: string) {
  const response = await apiClient.post<GrantSearchResponse>('/grants/search', body, {
    headers: { 'Uen': uen },
  });
  return response.data;
}

export async function getGrantDetails(grantRefNo: string) {
  const response = await apiClient.get<GrantDetailsResponse>(
    `/grants/details/${encodeURIComponent(grantRefNo)}`
  );
  return response.data;
}

export async function getGrantCodes() {
  const response = await apiClient.get<GrantCodeLookupResponse>('/grants/codes/fundingComponent');
  return response.data;
}

// SkillsFuture Credit Pay APIs

export async function getSfClaimDetails(claimId: string, nric: string) {
  const response = await apiClient.get<SfClaimDetailsResponse>(
    `/sf-credits/claims/${encodeURIComponent(claimId)}`,
    { params: { nric } }
  );
  return response.data;
}

export async function cancelSfClaim(claimId: string, body: SfCancelClaimRequest) {
  const response = await apiClient.post<SfCancelClaimResponse>(
    `/sf-credits/claims/${encodeURIComponent(claimId)}/cancel`,
    body
  );
  return response.data;
}

export async function uploadSfSupportingDocs(claimId: string, body: { nric: string; attachments: { fileName: string; fileSize: string; fileType: string; attachmentId: string; attachmentByte: string }[] }) {
  const response = await apiClient.post<SfCancelClaimResponse>(
    `/sf-credits/claims/${encodeURIComponent(claimId)}/supportingdocuments`,
    body
  );
  return response.data;
}

export async function encryptSfClaimRequest(body: Record<string, unknown>) {
  const response = await apiClient.post<SfCancelClaimResponse>(
    '/sf-credits/claims/encryptRequests',
    body
  );
  return response.data;
}

export async function decryptSfClaimRequest(body: Record<string, unknown>) {
  const response = await apiClient.post<SfCancelClaimResponse>(
    '/sf-credits/claims/decryptRequests',
    body
  );
  return response.data;
}

// Enrolment APIs

export async function createEnrolment(body: Record<string, unknown>) {
  const response = await apiClient.post<EnrolmentResponse>('/enrolments', body);
  return response.data;
}

export async function updateCancelEnrolment(enrolmentRefNo: string, body: Record<string, unknown>, uen: string) {
  const response = await apiClient.post<EnrolmentResponse>(
    `/enrolments/details/${encodeURIComponent(enrolmentRefNo)}`,
    body,
    { headers: { 'uen': uen } }
  );
  return response.data;
}

export async function searchEnrolments(body: Record<string, unknown>) {
  const response = await apiClient.post<EnrolmentResponse>('/enrolments/search', body);
  return response.data;
}

export async function updateFeeCollection(enrolmentRefNo: string, body: Record<string, unknown>) {
  const response = await apiClient.post<EnrolmentResponse>(
    `/enrolments/feeCollections/${encodeURIComponent(enrolmentRefNo)}`,
    body
  );
  return response.data;
}

export async function viewEnrolment(enrolmentRefNo: string) {
  const response = await apiClient.get<EnrolmentResponse>(
    `/enrolments/details/${encodeURIComponent(enrolmentRefNo)}`
  );
  return response.data;
}

export async function getEnrolmentCodes() {
  const response = await apiClient.get<EnrolmentResponse>('/enrolments/codes/sponsorshipType');
  return response.data;
}

// Assessment APIs

export async function createAssessment(body: Record<string, unknown>) {
  const response = await apiClient.post<EnrolmentResponse>('/assessments', body);
  return response.data;
}

export async function updateVoidAssessment(assessmentRefNo: string, body: Record<string, unknown>) {
  const response = await apiClient.post<EnrolmentResponse>(
    `/assessments/details/${encodeURIComponent(assessmentRefNo)}`,
    body
  );
  return response.data;
}

export async function searchAssessments(body: Record<string, unknown>) {
  const response = await apiClient.post<EnrolmentResponse>('/assessments/search', body);
  return response.data;
}

export async function viewAssessment(assessmentRefNo: string) {
  const response = await apiClient.get<EnrolmentResponse>(
    `/assessments/details/${encodeURIComponent(assessmentRefNo)}`
  );
  return response.data;
}

export async function getAssessmentCodes() {
  const response = await apiClient.get<EnrolmentResponse>('/assessments/codes/idType');
  return response.data;
}

// Skills Passport APIs

export async function getQualifications(level?: string) {
  const params = level ? { level } : {};
  const response = await apiClient.get<Record<string, unknown>>('/skills-passport/qualifications', { params });
  return response.data;
}

// SEA (Skill Extraction API)

export async function postSkillExtract(body: { textData: string; modelVersion: string }) {
  const response = await apiClient.post<Record<string, unknown>>('/skill-extract', body);
  return response.data;
}

export async function postSkillSearch(body: { textData: string; modelVersion: string }) {
  const response = await apiClient.post<Record<string, unknown>>('/skill-search', body);
  return response.data;
}

// Skills Framework APIs

export async function getSkillsFrameworkJobs(params: Record<string, string>) {
  const response = await apiClient.get<Record<string, unknown>>('/skills-framework/jobs', { params });
  return response.data;
}

export async function getSkillsFrameworkSkills(params: Record<string, string>) {
  const response = await apiClient.get<Record<string, unknown>>('/skills-framework/skills', { params });
  return response.data;
}

export async function getSkillsFrameworkGscCodes(params: Record<string, string>) {
  const response = await apiClient.get<Record<string, unknown>>('/skills-framework/gsc-codes', { params });
  return response.data;
}

export async function getSkillsFrameworkCcsDetails(params: Record<string, string>) {
  const response = await apiClient.get<Record<string, unknown>>('/skills-framework/ccs-details', { params });
  return response.data;
}

export async function getSkillsFrameworkTscCodes(params: Record<string, string>) {
  const response = await apiClient.get<Record<string, unknown>>('/skills-framework/tsc-codes', { params });
  return response.data;
}

export async function getSkillsFrameworkTscCodesDetails(params: Record<string, string>) {
  const response = await apiClient.get<Record<string, unknown>>('/skills-framework/tsc-codes-details', { params });
  return response.data;
}

export async function getSkillsFrameworkTscDetails(params: Record<string, string>) {
  const response = await apiClient.get<Record<string, unknown>>('/skills-framework/tsc-details', { params });
  return response.data;
}

export async function getSkillsFrameworkJobRoles(params: Record<string, string>) {
  const response = await apiClient.get<Record<string, unknown>>('/skills-framework/job-roles', { params });
  return response.data;
}

export async function getSkillsFrameworkJobRoleProfile(params: Record<string, string>) {
  const response = await apiClient.get<Record<string, unknown>>('/skills-framework/job-role-profile', { params });
  return response.data;
}

export async function getSkillsFrameworkOccupations(params: Record<string, string>) {
  const response = await apiClient.get<Record<string, unknown>>('/skills-framework/occupations', { params });
  return response.data;
}

export async function getSkillsFrameworkJobRoleCodes(occupationId: string) {
  const response = await apiClient.get<Record<string, unknown>>(`/skills-framework/occupations/${occupationId}/jobRoles`);
  return response.data;
}

export async function getSkillsFrameworkSectorProfile(sectorId: string) {
  const response = await apiClient.get<Record<string, unknown>>(`/skills-framework/sector-profile/${sectorId}`);
  return response.data;
}

// Tools

export async function generateCertificate(body: { 
  commonName: string; 
  organization: string; 
  organizationalUnit: string;
  country: string; 
  state: string;
  locality: string;
  emailAddress: string;
  days: string; 
  keySize: string 
}) {
  const response = await apiClient.post<{ cert: string; key: string; command: string }>('/tools/generate-cert', body);
  return response.data;
}

export async function generateKeypair(body: { keySize: string }) {
  const response = await apiClient.post<{ privateKey: string; publicKeyPem: string; publicKeyStripped: string; commands: string[] }>('/tools/generate-keypair', body);
  return response.data;
}

export async function generateEncryptionKey(body: { bytes: string }) {
  const response = await apiClient.post<{ key: string; command: string }>('/tools/generate-encryption-key', body);
  return response.data;
}
