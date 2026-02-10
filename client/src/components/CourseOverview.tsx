import type { Course } from '../types/course';
import { formatDate } from '../utils';

interface CourseOverviewProps {
  course: Course;
}

export default function CourseOverview({ course }: CourseOverviewProps) {
  return (
    <div className="card course-overview">
      <div className="course-header">
        <h2>{course.title}</h2>
        <div className="badges">
          {course.status && (
            <span className={`badge badge-${course.status.code === '1' ? 'active' : 'inactive'}`}>
              {course.status.description}
            </span>
          )}
          {course.category && (
            <span className="badge badge-category">{course.category.description}</span>
          )}
        </div>
      </div>

      <div className="course-meta-grid">
        <div className="meta-item">
          <span className="meta-label">Reference No.</span>
          <span className="meta-value">{course.referenceNumber}</span>
        </div>
        {course.skillsConnectReferenceNumber && (
          <div className="meta-item">
            <span className="meta-label">SkillsConnect Ref</span>
            <span className="meta-value">{course.skillsConnectReferenceNumber}</span>
          </div>
        )}
        <div className="meta-item">
          <span className="meta-label">Duration</span>
          <span className="meta-value">
            {course.numberOfTrainingDay} day(s) / {course.totalTrainingDurationHour} hour(s)
          </span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Cost per Trainee</span>
          <span className="meta-value">
            {course.totalCostOfTrainingPerTrainee != null
              ? `$${course.totalCostOfTrainingPerTrainee.toFixed(2)}`
              : 'N/A'}
          </span>
        </div>
        {course.qualificationAttained && (
          <div className="meta-item">
            <span className="meta-label">Qualification</span>
            <span className="meta-value">{course.qualificationAttained.description}</span>
          </div>
        )}
        {course.initiatives && (
          <div className="meta-item">
            <span className="meta-label">Initiatives</span>
            <span className="meta-value">{course.initiatives}</span>
          </div>
        )}
        {course.createDate && (
          <div className="meta-item">
            <span className="meta-label">Created</span>
            <span className="meta-value">{formatDate(course.createDate)}</span>
          </div>
        )}
        {course.isExaminable && (
          <div className="meta-item">
            <span className="meta-label">Examinable</span>
            <span className="meta-value">{course.isExaminable}</span>
          </div>
        )}
      </div>

      {course.objective && (
        <div className="course-section">
          <h3>Objective</h3>
          <p>{course.objective}</p>
        </div>
      )}

      {course.content && (
        <div className="course-section">
          <h3>Content</h3>
          <p>{course.content}</p>
        </div>
      )}

      {course.entryRequirement && (
        <div className="course-section">
          <h3>Entry Requirements</h3>
          <div dangerouslySetInnerHTML={{ __html: course.entryRequirement }} />
        </div>
      )}
    </div>
  );
}
