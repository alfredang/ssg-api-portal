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
          <span className={`badge badge-${course.isActive === 'Yes' ? 'active' : 'inactive'}`}>
            {course.isActive === 'Yes' ? 'Active' : 'Inactive'}
          </span>
          {course.trainingMode && (
            <span className="badge badge-category">{course.trainingMode.description}</span>
          )}
        </div>
      </div>

      <div className="course-meta-grid">
        <div className="meta-item">
          <span className="meta-label">Reference No.</span>
          <span className="meta-value">{course.referenceNumber}</span>
        </div>
        {course.migratedReferenceNumber && (
          <div className="meta-item">
            <span className="meta-label">Migrated Ref</span>
            <span className="meta-value">{course.migratedReferenceNumber}</span>
          </div>
        )}
        <div className="meta-item">
          <span className="meta-label">Duration</span>
          <span className="meta-value">
            {course.noOfTrainingDays} day(s) / {course.totalTrainingDurationHours} hour(s)
          </span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Cost per Trainee</span>
          <span className="meta-value">
            {course.costOfTrainingPerTrainee?.cost != null
              ? `${course.costOfTrainingPerTrainee.currency || 'SGD'} $${course.costOfTrainingPerTrainee.cost.toFixed(2)}`
              : 'N/A'}
          </span>
        </div>
        {course.areaOfTraining && (
          <div className="meta-item">
            <span className="meta-label">Area of Training</span>
            <span className="meta-value">{course.areaOfTraining.description}</span>
          </div>
        )}
        {course.programmeType && (
          <div className="meta-item">
            <span className="meta-label">Programme Type</span>
            <span className="meta-value">{course.programmeType.description}</span>
          </div>
        )}
        {course.meta?.createdDate && (
          <div className="meta-item">
            <span className="meta-label">Created</span>
            <span className="meta-value">{formatDate(course.meta.createdDate)}</span>
          </div>
        )}
        {course.isCourseExaminable && (
          <div className="meta-item">
            <span className="meta-label">Examinable</span>
            <span className="meta-value">{course.isCourseExaminable}</span>
          </div>
        )}
      </div>

      {course.objectives && (
        <div className="course-section">
          <h3>Objectives</h3>
          <p>{course.objectives}</p>
        </div>
      )}

      {course.description && (
        <div className="course-section">
          <h3>Description</h3>
          <p>{course.description}</p>
        </div>
      )}

      {course.minimumEntryRequirements && (
        <div className="course-section">
          <h3>Entry Requirements</h3>
          <p>{course.minimumEntryRequirements}</p>
        </div>
      )}
    </div>
  );
}
