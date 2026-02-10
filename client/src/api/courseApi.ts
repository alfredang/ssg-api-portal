import axios from 'axios';
import type { CourseResponse } from '../types/course';

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
