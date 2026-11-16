import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';

// Fills SWDA's "API Subscription Form for SWDA APIs" (v1.12, Sections 1-3) and
// returns a real .docx. public/subscription-form-template.docx is the official
// form with {{placeholders}} in the answer cells; the layout, fonts and wording
// are SWDA's and are not changed here.

export interface ApiRequest { name: string; use: string }
export interface FormData {
  company: string; uen: string; contactName: string; contactNumber: string; contactEmail: string;
  ownerName: string; ownerEmail: string; appName: string;
  systemType: 'TP' | 'TMS';
  tmsName: string; tmsUen: string; tmsAbbrev: string; gateway: string;
  apis: ApiRequest[];
}

const esc = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Text for inside a <w:t>: escaped, with line breaks as Word line breaks. */
const wText = (s: string) => esc(s.replace(/\r\n?/g, '\n').trim()).split('\n').join('</w:t><w:br/><w:t xml:space="preserve">');

function put(xml: string, key: string, value: string): string {
  const token = `{{${key}}}`;
  if (!xml.includes(token)) throw new Error(`Form template is missing ${token}`);
  return xml.split(token).join(wText(value));
}

/** The whole <w:tr> or <w:p> element around a placeholder. */
function around(xml: string, token: string, tag: 'w:tr' | 'w:p'): [start: number, end: number] {
  const at = xml.indexOf(token);
  if (at < 0) throw new Error(`Form template is missing ${token}`);
  const open = new RegExp(`<${tag}[ >]`, 'g');
  let start = -1;
  for (let m = open.exec(xml); m && m.index < at; m = open.exec(xml)) start = m.index;
  const close = `</${tag}>`;
  return [start, xml.indexOf(close, at) + close.length];
}

export function fillSubscriptionForm(template: Uint8Array, data: FormData): Uint8Array {
  const files = unzipSync(template);
  let xml = strFromU8(files['word/document.xml']);

  // At least three API rows, as on the blank form.
  const apis = data.apis.filter((a) => a.name.trim() || a.use.trim());
  while (apis.length < 3) apis.push({ name: '', use: '' });

  // One "API name" row per API.
  let [s, e] = around(xml, '{{apiName}}', 'w:tr');
  const nameRow = xml.slice(s, e);
  xml = xml.slice(0, s) + apis.map((a) => put(nameRow, 'apiName', a.name)).join('') + xml.slice(e);

  // One "reason" row per API: the first carries the question, the rest repeat.
  [s, e] = around(xml, '{{rName}}', 'w:tr');
  const reasonRow = xml.slice(s, e);
  xml = xml.slice(0, s) + apis.slice(1).map((a) => put(put(reasonRow, 'rName', a.name), 'rUse', a.use)).join('') + xml.slice(e);
  xml = put(put(xml, 'rName0', apis[0].name), 'rUse0', apis[0].use);

  // (2a) has no answer cell on the form: add the line only when something was entered.
  if (data.gateway.trim()) xml = put(xml, 'gateway', data.gateway);
  else { [s, e] = around(xml, '{{gateway}}', 'w:p'); xml = xml.slice(0, s) + xml.slice(e); }

  xml = xml.replace('{{tp}}', data.systemType === 'TP' ? ' X ' : '  ').replace('{{tms}}', data.systemType === 'TMS' ? ' X ' : '  ');
  for (const k of ['company', 'uen', 'contactName', 'contactNumber', 'contactEmail', 'ownerName', 'ownerEmail', 'appName', 'tmsName', 'tmsUen', 'tmsAbbrev'] as const) xml = put(xml, k, data[k]);
  if (xml.includes('{{')) throw new Error('Form template has an unfilled placeholder');

  files['word/document.xml'] = strToU8(xml);
  return zipSync(files, { level: 6 });
}
