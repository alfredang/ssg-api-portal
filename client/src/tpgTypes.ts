// Content model for the TPG Process guides, rendered as HTML by
// components/TpgGuide.tsx. No PDF pages or screenshots are embedded: every
// visual (process flow, buttons, screen layouts) is drawn by the site.
//
// Inline markup allowed in any text string:
//   **bold**            emphasis
//   [[Add Course Run]]  a TPGateway button, drawn as a button chip
//   {{Course Run ID}}   a field, tile, tab or menu name on TPGateway, drawn as a label chip
//   [text](https://…)   a link

/** A numbered instruction. `sub` holds its bullet points; `note` a short remark under it. */
export interface StepItem { text: string; sub?: string[]; note?: string }

/** One element of a schematic TPGateway screen. */
export type ScreenEl =
  | { kind: 'heading'; label: string }
  | { kind: 'tabs'; items: string[]; active?: string }
  | { kind: 'search'; placeholder: string }
  | { kind: 'field'; label: string; value?: string; required?: boolean }
  | { kind: 'dropdown'; label: string; value?: string; required?: boolean }
  | { kind: 'checkbox'; label: string; checked?: boolean }
  | { kind: 'upload'; label: string }
  | { kind: 'buttons'; items: { label: string; primary?: boolean }[] }
  | { kind: 'tiles'; items: string[]; active?: string }
  | { kind: 'table'; head: string[]; rows: string[][] }
  | { kind: 'text'; text: string };

export type Block =
  | { type: 'p'; text: string }
  | { type: 'steps'; items: StepItem[]; start?: number }
  | { type: 'list'; items: string[] }
  | { type: 'note'; tone: 'info' | 'warn' | 'tip'; title?: string; text: string }
  | { type: 'table'; head: string[]; rows: string[][]; caption?: string }
  | { type: 'defs'; items: { term: string; text: string }[] }
  /** Schematic of a TPGateway screen, drawn in HTML. Only what the guide shows. */
  | { type: 'screen'; title: string; caption?: string; elements: ScreenEl[] };

export interface Section {
  /** Stable id for links, kebab-case, unique within the guide. */
  id: string;
  title: string;
  /** One line under the heading. */
  summary?: string;
  /** Pre-requisites listed for this task in the guide. */
  prerequisites?: string[];
  blocks: Block[];
}

export interface Guide {
  /** Matches TPG_STEPS id (1..13). */
  id: number;
  /** Who the guide is for and what it covers, from the guide's opening lines. */
  intro: string;
  /** "Training Providers" or "Programme Partners", as printed on the guide. */
  audience: string;
  /** "updated as of" date printed on the guide, e.g. "29 December 2023". */
  updated?: string;
  /** Node of the end-to-end process diagram this guide covers (exact label from FLOW_NODES), if any. */
  flowNode?: string;
  sections: Section[];
}

/** End-to-end TPGateway process for Training Providers, as drawn on every guide. */
export const FLOW_NODES = [
  'Submit Org Application',
  'Submit Course Application',
  'Add Course Runs',
  'Calculate Estimated Grant',
  'Submit Enrolment',
  'Take Attendance',
  'Submit Assessment',
  'Manage Grants and Receive Disbursements',
  'Download eCert',
] as const;
