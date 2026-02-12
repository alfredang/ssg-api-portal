import type { AttendanceCourseRun } from '../types/course';

function formatDate(dateStr: string) {
  if (dateStr.length === 8) {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }
  return dateStr;
}

function formatCourseDateNum(dateNum: number) {
  const s = String(dateNum);
  if (s.length === 8) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }
  return s;
}

export default function SessionAttendanceCard({ courseRun }: { courseRun: AttendanceCourseRun }) {
  return (
    <div className="card">
      <h3>{courseRun.title}</h3>
      <div className="attendance-run-info">
        <div className="meta-grid">
          <span className="meta-label">Run ID</span>
          <span className="meta-value">{courseRun.id}</span>
          <span className="meta-label">Reference No</span>
          <span className="meta-value">{courseRun.referenceNumber}</span>
          <span className="meta-label">Mode of Training</span>
          <span className="meta-value">{courseRun.modeOfTraining}</span>
          {courseRun.courseDates && (
            <>
              <span className="meta-label">Course Dates</span>
              <span className="meta-value">
                {formatCourseDateNum(courseRun.courseDates.start)} to {formatCourseDateNum(courseRun.courseDates.end)}
              </span>
            </>
          )}
        </div>
      </div>

      {courseRun.sessions?.map((session) => (
        <div key={session.id} className="attendance-session">
          <h4 className="attendance-session-title">Session: {session.id}</h4>
          <div className="meta-grid">
            <span className="meta-label">Date</span>
            <span className="meta-value">
              {formatDate(session.startDate)}
              {session.endDate !== session.startDate && ` to ${formatDate(session.endDate)}`}
            </span>
            <span className="meta-label">Time</span>
            <span className="meta-value">{session.startTime} - {session.endTime}</span>
            <span className="meta-label">Mode</span>
            <span className="meta-value">{session.modeOfTraining}</span>
            {session.venue && (
              <>
                <span className="meta-label">Venue</span>
                <span className="meta-value">
                  {[session.venue.block, session.venue.street, session.venue.building]
                    .filter(Boolean).join(', ')}
                  {session.venue.floor && ` #${session.venue.floor}`}
                  {session.venue.unit && `-${session.venue.unit}`}
                  {session.venue.postalCode ? ` (${session.venue.postalCode})` : ''}
                </span>
              </>
            )}
          </div>

          {session.attendance && session.attendance.length > 0 ? (
            <div className="attendance-table-wrapper">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>ID</th>
                    <th>Status</th>
                    <th>Entry Mode</th>
                    <th>Type</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {session.attendance.map((att) => (
                    <tr key={att.id}>
                      <td>{att.trainee?.name || '-'}</td>
                      <td>{att.trainee?.id || att.nric || '-'}</td>
                      <td>
                        <span className={`attendance-status attendance-status--${att.status?.toLowerCase()}`}>
                          {att.status}
                        </span>
                      </td>
                      <td>{att.entryMode}</td>
                      <td>{att.trainee?.attendeeType || '-'}</td>
                      <td>{att.trainee?.email || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="no-results">No attendance records for this session.</p>
          )}
        </div>
      ))}

      {(!courseRun.sessions || courseRun.sessions.length === 0) && (
        <p className="no-results">No sessions found for this course run.</p>
      )}
    </div>
  );
}
