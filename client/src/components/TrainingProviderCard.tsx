import type { Course } from '../types/course';

interface TrainingProviderCardProps {
  course: Course;
}

function formatAddress(addr: { block?: string; street?: string; floor?: string; unit?: string; building?: string; postalCode?: string | number }) {
  const parts: string[] = [];
  if (addr.block) parts.push(addr.block);
  if (addr.street) parts.push(addr.street);
  if (addr.floor && addr.unit) {
    parts.push(`#${addr.floor}-${addr.unit}`);
  }
  if (addr.building) parts.push(addr.building);
  if (addr.postalCode) parts.push(`Singapore ${addr.postalCode}`);
  return parts.join(', ');
}

function formatPhone(tel: { countryCode: number; number: number }) {
  return `+${tel.countryCode} ${tel.number}`;
}

export default function TrainingProviderCard({ course }: TrainingProviderCardProps) {
  const provider = course.trainingProvider;
  if (!provider) return null;

  return (
    <div className="card training-provider">
      <h3>Training Provider</h3>

      <div className="provider-details">
        <div className="meta-item">
          <span className="meta-label">Name</span>
          <span className="meta-value">{provider.name}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">UEN</span>
          <span className="meta-value">{provider.uen}</span>
        </div>
        {provider.email && (
          <div className="meta-item">
            <span className="meta-label">Email</span>
            <span className="meta-value">{provider.email}</span>
          </div>
        )}
        {provider.websiteUrl && (
          <div className="meta-item">
            <span className="meta-label">Website</span>
            <span className="meta-value">
              <a href={provider.websiteUrl.startsWith('http') ? provider.websiteUrl : `https://${provider.websiteUrl}`} target="_blank" rel="noopener noreferrer">
                {provider.websiteUrl}
              </a>
            </span>
          </div>
        )}
        {provider.address?.length > 0 && (
          <div className="meta-item">
            <span className="meta-label">Address</span>
            <span className="meta-value">{formatAddress(provider.address[0])}</span>
          </div>
        )}
        {provider.contactNumber?.length > 0 && (
          <div className="meta-item">
            <span className="meta-label">Phone</span>
            <span className="meta-value">{formatPhone(provider.contactNumber[0].telephone)}</span>
          </div>
        )}
      </div>

      {course.contactPerson?.length > 0 && (
        <div className="contact-persons">
          <h4>Contact Person(s)</h4>
          {course.contactPerson.map((person) => (
            <div key={person.id} className="contact-person">
              <span className="contact-name">
                {person.salutation} {person.fullName}
              </span>
              <span className="contact-role">{person.role}</span>
              {person.email && <span className="contact-email">{person.email.full}</span>}
              {person.telephone && <span className="contact-phone">{formatPhone(person.telephone)}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
