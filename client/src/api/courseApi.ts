import axios from 'axios';
import type { CourseResponse, CourseSearchResponse } from '../types/course';

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
  },
});

export async function getCourseByRefNo(refNo: string, includeExpired = true) {
  const response = await apiClient.get<CourseResponse>(
    `/courses/${encodeURIComponent(refNo)}`,
    { params: { includeExpired } }
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
