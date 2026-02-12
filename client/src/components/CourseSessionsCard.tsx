import type { CourseRunSession } from '../types/course';

function formatDate(dateStr: string) {
  if (dateStr.length === 8) {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }
  return dateStr;
}

function formatVenue(venue: CourseRunSession['venue']) {
  if (!venue) return '-';
  const parts = [venue.block, venue.street, venue.building].filter(Boolean);
  let str = parts.join(', ');
  if (venue.floor) str += ` #${venue.floor}`;
  if (venue.unit) str += `-${venue.unit}`;
  if (venue.postalCode) str += ` (${venue.postalCode})`;
  return str || '-';
}

export default function CourseSessionsCard({ sessions }: { sessions: CourseRunSession[] }) {
  return (
    <div className="card">
      <h3>Course Sessions ({sessions.length})</h3>
      {sessions.length === 0 ? (
        <p className="no-results">No sessions found.</p>
      ) : (
        <div className="attendance-table-wrapper">
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Session ID</th>
                <th>Date</th>
                <th>Time</th>
                <th>Mode</th>
                <th>Venue</th>
                <th>Attendance Taken</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td>{session.id}</td>
                  <td>
                    {formatDate(session.startDate)}
                    {session.endDate !== session.startDate && ` to ${formatDate(session.endDate)}`}
                  </td>
                  <td>{session.startTime} - {session.endTime}</td>
                  <td>{session.modeOfTraining}</td>
                  <td>{formatVenue(session.venue)}</td>
                  <td>
                    <span className={`attendance-status attendance-status--${session.attendanceTaken ? 'confirmed' : 'pending'}`}>
                      {session.attendanceTaken ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td>
                    <span className={`attendance-status attendance-status--${session.deleted ? 'absent' : 'confirmed'}`}>
                      {session.deleted ? 'Deleted' : 'Active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
