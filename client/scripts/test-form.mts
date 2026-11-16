// Fills the subscription form with sample data and writes it out, to check the .docx opens.
import { readFileSync, writeFileSync } from 'node:fs';
import { fillSubscriptionForm } from '../src/subscriptionDocx.ts';
const out = process.argv[2];
const tpl = new Uint8Array(readFileSync(new URL('../public/subscription-form-template.docx', import.meta.url)));
const apis = Array.from({ length: Number(process.argv[3] || 5) }, (_, i) => ({ name: `Sample API ${i + 1} <v1.0> & co`, use: `Line one of the use case for API ${i + 1}.\nLine two, with "quotes" & an ampersand.` }));
writeFileSync(out, fillSubscriptionForm(tpl, { company: 'Example Training Pte. Ltd.', uen: '201912345A', contactName: 'Jamie Tan', contactNumber: '6123 4567', contactEmail: 'jamie@example.com', ownerName: 'Jamie Tan', ownerEmail: 'jamie@example.com', appName: 'EXAMPLETMS ETP', systemType: 'TP', tmsName: 'Example TMS Pte. Ltd.', tmsUen: '201800001B', tmsAbbrev: 'EXAMPLETMS', gateway: '', apis }));
console.log('wrote', out);
