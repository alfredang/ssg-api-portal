import type { Course, CodeDescription } from '../types/course';

interface CourseMetadataProps {
  course: Course;
}

function TagList({ label, items }: { label: string; items?: CodeDescription[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="tag-group">
      <span className="tag-label">{label}</span>
      <div className="tags">
        {items.map((item, i) => (
          <span key={i} className="tag">{item.description}</span>
        ))}
      </div>
    </div>
  );
}

export default function CourseMetadata({ course }: CourseMetadataProps) {
  const hasAnyMetadata =
    course.modeOfTrainings?.length ||
    course.methodOfDeliveries?.length ||
    course.mediumOfInstructions?.length ||
    course.areaOfTrainings?.length ||
    course.jobLevels?.length ||
    course.sectors?.length ||
    course.targetWorkforceSegment ||
    course.publicFundingIndicator;

  if (!hasAnyMetadata) return null;

  return (
    <div className="card course-metadata">
      <h3>Additional Details</h3>

      <TagList label="Mode of Training" items={course.modeOfTrainings} />
      <TagList label="Method of Delivery" items={course.methodOfDeliveries} />
      <TagList label="Medium of Instruction" items={course.mediumOfInstructions} />
      <TagList label="Area of Training" items={course.areaOfTrainings} />
      <TagList label="Job Levels" items={course.jobLevels} />
      <TagList label="Sectors" items={course.sectors} />

      {course.targetWorkforceSegment && (
        <div className="tag-group">
          <span className="tag-label">Target Workforce</span>
          <div className="tags">
            <span className="tag">{course.targetWorkforceSegment.description}</span>
          </div>
        </div>
      )}

      {course.publicFundingIndicator && (
        <div className="tag-group">
          <span className="tag-label">Public Funding</span>
          <div className="tags">
            <span className="tag">{course.publicFundingIndicator.description}</span>
          </div>
        </div>
      )}

      {course.jobRoles?.length > 0 && (
        <div className="tag-group">
          <span className="tag-label">Related Job Roles</span>
          <div className="tags">
            {course.jobRoles.map((role, i) => (
              <span key={i} className="tag">
                {role.title}
                {role.salaryRange && ` ($${role.salaryRange})`}
              </span>
            ))}
          </div>
        </div>
      )}

      {course.modules?.length > 0 && (
        <div className="modules-section">
          <h4>Modules</h4>
          <ul>
            {course.modules.map((mod, i) => (
              <li key={i}>
                <strong>{mod.courseReferenceNumber}</strong> - {mod.courseTitle}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
