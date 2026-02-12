import type { CourseOutcome, QualityRating } from '../types/course';

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

const OUTCOME_FIELDS: { key: keyof CourseOutcome; label: string }[] = [
  { key: 'overallOutcome', label: 'Overall Outcome' },
  { key: 'ableToApplyLearning', label: 'Able to Apply Learning' },
  { key: 'betterJobPerformance', label: 'Better Job Performance' },
  { key: 'expandedJobScope', label: 'Expanded Job Scope' },
];

export default function CourseOutcomeCard({ outcome }: { outcome: CourseOutcome }) {
  return (
    <div className="card">
      <h3>Course Outcome Feedback</h3>
      <p className="quality-respondents">
        Based on <strong>{outcome.numberOfRespondents}</strong> respondent(s)
      </p>
      <div className="quality-ratings">
        {OUTCOME_FIELDS.map(({ key, label }) => {
          const rating = outcome[key] as QualityRating | undefined;
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
      {outcome.meta?.updateDate && (
        <p className="quality-meta">
          Last updated: {new Date(outcome.meta.updateDate).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
