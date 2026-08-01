/**
 * sections.ts — the section order, owned in one place.
 *
 * Both the DOM app (nav scroll-spy) and the 3D app (flight waypoints) need
 * this list, and they must never disagree: if the nav thinks Projects is
 * third and the camera thinks it's fourth, the flight desynchronises from
 * the content and there is no obvious place to look for the bug.
 */
export const SECTION_IDS = [
  "home",
  "about",
  "projects",
  "skills",
  "experience",
  "contact",
] as const;

export type SectionId = (typeof SECTION_IDS)[number];
