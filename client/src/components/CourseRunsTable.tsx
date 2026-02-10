import type { Support } from '../types/course';

interface CourseSupportTableProps {
  support: Support[];
}

export default function CourseSupportTable({ support }: CourseSupportTableProps) {
  if (!support || support.length === 0) return null;

  return (
    <div className="card course-runs">
      <h3>Support &amp; Funding</h3>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Period</th>
            </tr>
          </thead>
          <tbody>
            {support.map((s, i) => (
              <tr key={i}>
                <td>{s.description}</td>
                <td>
                  {s.period?.map((p, j) => (
                    <div key={j}>{p.startDate} — {p.endDate}</div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
