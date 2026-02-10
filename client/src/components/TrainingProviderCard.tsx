import type { Course } from '../types/course';

interface TrainingProviderCardProps {
  course: Course;
}

function formatPhone(phone: { countryCode: string; number: string }) {
  return `+${phone.countryCode} ${phone.number}`;
}

export default function TrainingProviderCard({ course }: TrainingProviderCardProps) {
  const partner = course.trainingPartner;
  if (!partner) return null;

  return (
    <div className="card training-provider">
      <h3>Training Partner</h3>

      <div className="provider-details">
        <div className="meta-item">
          <span className="meta-label">Name</span>
          <span className="meta-value">{partner.name}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">UEN</span>
          <span className="meta-value">{partner.uen}</span>
        </div>
        {course.url && (
          <div className="meta-item">
            <span className="meta-label">Website</span>
            <span className="meta-value">
              <a href={course.url.startsWith('http') ? course.url : `https://${course.url}`} target="_blank" rel="noopener noreferrer">
                {course.url}
              </a>
            </span>
          </div>
        )}
      </div>

      {course.contactPersons?.length > 0 && (
        <div className="contact-persons">
          <h4>Contact Person(s)</h4>
          {course.contactPersons.map((person, i) => (
            <div key={i} className="contact-person">
              <span className="contact-name">
                {person.salutation?.description} {person.fullName}
              </span>
              <span className="contact-role">{person.role?.description}</span>
              {person.emailAddress && <span className="contact-email">{person.emailAddress.full}</span>}
              {person.officeNumber && <span className="contact-phone">{formatPhone(person.officeNumber)}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
