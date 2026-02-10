import type { CourseRun } from '../types/course';
import { formatDate } from '../utils';

interface CourseRunsTableProps {
  runs: CourseRun[];
}

function formatVenue(run: CourseRun) {
  const parts: string[] = [];
  if (run.block) parts.push(run.block);
  if (run.street) parts.push(run.street);
  if (run.floor && run.unit) parts.push(`#${run.floor}-${run.unit}`);
  if (run.building) parts.push(run.building);
  if (run.postalCode) parts.push(String(run.postalCode));
  return parts.join(', ') || 'TBA';
}

export default function CourseRunsTable({ runs }: CourseRunsTableProps) {
  if (!runs || runs.length === 0) return null;

  return (
    <div className="card course-runs">
      <h3>Course Runs ({runs.length})</h3>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Registration</th>
              <th>Course Dates</th>
              <th>Schedule</th>
              <th>Venue</th>
              <th>Vacancy</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id}>
                <td>
                  {formatDate(run.registrationOpeningDate)} - {formatDate(run.registrationClosingDate)}
                </td>
                <td>
                  {formatDate(run.courseStartDate)} - {formatDate(run.courseEndDate)}
                </td>
                <td>{run.scheduleInfo || '-'}</td>
                <td>{formatVenue(run)}</td>
                <td>
                  {run.courseVacancy ? (
                    <span className={`vacancy-badge vacancy-${run.courseVacancy.code}`}>
                      {run.courseVacancy.description}
                    </span>
                  ) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
