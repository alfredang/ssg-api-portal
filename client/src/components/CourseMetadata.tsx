import type { Course, CodeDescription, Tag } from '../types/course';

interface CourseMetadataProps {
  course: Course;
}

function TagList({ label, items }: { label: string; items?: (CodeDescription | Tag)[] }) {
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
    course.modesOfLearning?.length ||
    course.languages?.length ||
    course.tags?.length ||
    course.skills?.length ||
    course.bundles?.length ||
    course.areaOfTraining ||
    course.targetAudience ||
    course.natureOfTraining ||
    course.suitableJobRoles;

  if (!hasAnyMetadata) return null;

  return (
    <div className="card course-metadata">
      <h3>Additional Details</h3>

      {course.modesOfLearning?.length > 0 && (
        <div className="tag-group">
          <span className="tag-label">Modes of Learning</span>
          <div className="tags">
            {course.modesOfLearning.map((m, i) => (
              <span key={i} className="tag">{m.type.description} ({m.hours}h)</span>
            ))}
          </div>
        </div>
      )}

      <TagList label="Languages" items={course.languages} />
      <TagList label="Tags" items={course.tags} />

      {course.areaOfTraining && (
        <div className="tag-group">
          <span className="tag-label">Area of Training</span>
          <div className="tags">
            <span className="tag">{course.areaOfTraining.description}</span>
          </div>
        </div>
      )}

      {course.targetAudience && (
        <div className="tag-group">
          <span className="tag-label">Target Audience</span>
          <div className="tags">
            <span className="tag">{course.targetAudience.description}</span>
          </div>
        </div>
      )}

      {course.natureOfTraining && (
        <div className="tag-group">
          <span className="tag-label">Nature of Training</span>
          <div className="tags">
            <span className="tag">{course.natureOfTraining.description}</span>
          </div>
        </div>
      )}

      {course.suitableJobRoles && (
        <div className="tag-group">
          <span className="tag-label">Suitable Job Roles</span>
          <div className="tags">
            {course.suitableJobRoles.split(',').map((role, i) => (
              <span key={i} className="tag">{role.trim()}</span>
            ))}
          </div>
        </div>
      )}

      {course.skills?.length > 0 && (
        <div className="tag-group">
          <span className="tag-label">Skills</span>
          <div className="tags">
            {course.skills.map((skill, i) => (
              <span key={i} className="tag">{skill.description} ({skill.framework})</span>
            ))}
          </div>
        </div>
      )}

      {course.bundles?.length > 0 && (
        <div className="tag-group">
          <span className="tag-label">Bundles</span>
          <div className="tags">
            {course.bundles.map((b, i) => (
              <span key={i} className="tag">{b.description} ({b.type})</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
