import type { CourseQuality, QualityRating } from '../types/course';

function StarRating({ rating, label, average }: { rating: number; label: string; average: number }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.25;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <div className="quality-row">
      <span className="quality-label">{label}</span>
      <span className="quality-stars">
        {'★'.repeat(fullStars)}
        {hasHalf && '½'}
        {'☆'.repeat(emptyStars)}
      </span>
      <span className="quality-score">{average.toFixed(1)} / 5.0</span>
    </div>
  );
}

const RATING_FIELDS: { key: keyof CourseQuality; label: string }[] = [
  { key: 'overallQuality', label: 'Overall Quality' },
  { key: 'trainerCourseContent', label: 'Trainer & Content' },
  { key: 'learning', label: 'Learning' },
  { key: 'customerService', label: 'Customer Service' },
];

export default function CourseQualityCard({ quality }: { quality: CourseQuality }) {
  return (
    <div className="card">
      <h3>Course Quality Feedback</h3>
      <p className="quality-respondents">
        Based on <strong>{quality.numberOfRespondents}</strong> respondent(s)
      </p>
      <div className="quality-ratings">
        {RATING_FIELDS.map(({ key, label }) => {
          const rating = quality[key] as QualityRating | undefined;
          if (!rating) return null;
          return (
            <StarRating
              key={key}
              label={label}
              rating={rating.starsRating}
              average={rating.average}
            />
          );
        })}
      </div>
      {quality.meta?.updateDate && (
        <p className="quality-meta">
          Last updated: {new Date(quality.meta.updateDate).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
