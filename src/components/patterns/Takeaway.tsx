/**
 * Takeaway.tsx
 *
 * The five-second layer. One line that lands before the prose, not after it.
 *
 * The problem it solves: every section of this site asked a reviewer to read a
 * paragraph in order to extract the one fact that mattered. The only
 * headline-number pattern in the whole app was three small stat cards in About,
 * sitting below the fold of their own section. Somebody skimming got nothing.
 *
 * The treatment is deliberately the same everywhere it appears (Projects,
 * Experience, the order book brief) so that after the first one, a reader knows
 * what the accent rule means without being told: the line next to it is the
 * claim, and everything under it is the evidence.
 *
 * Visually it borrows the vocabulary already in the app rather than inventing
 * one. The vertical accent rule is the same device Experience already uses for
 * its hover rail, and the type is the body face at reading weight rather than a
 * label, because this is a sentence and should read like one.
 */
import type { ReactNode } from "react";

export interface TakeawayProps {
  children: ReactNode;
  /** `lead` is the section-level variant: larger, with more room around it. */
  size?: "default" | "lead";
}

export const Takeaway = ({ children, size = "default" }: TakeawayProps) => (
  <p className={size === "lead" ? "takeaway takeaway-lead" : "takeaway"}>
    <span className="takeaway-rule" aria-hidden="true" />
    <span className="takeaway-text">{children}</span>
  </p>
);
