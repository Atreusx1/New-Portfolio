/**
 * BeforeAfter.tsx
 *
 * A comparison table for projects whose entire claim is "this got smaller" or
 * "this got faster". Nobody reads a paragraph describing what an optimisation
 * script does; they want the number it produced.
 *
 * ── The pending state is the important part ──
 * Most before/after components assume you have numbers. The honest case here is
 * that for the build toolkit, nobody has measured yet. So a row with
 * `before: null` renders as an explicitly empty slot with its metric named,
 * under a heading that says the measurement is outstanding.
 *
 * That is a deliberate choice over three worse options: inventing plausible
 * figures, quietly omitting the component until numbers exist, or writing
 * "significantly reduced bundle size" and hoping nobody asks. The first is
 * dishonest, the second loses the design work, and the third is the exact
 * register this whole pass exists to remove. An empty slot with a named metric
 * is also a to-do list: it says precisely which five numbers to go and get.
 *
 * Filled rows render a proportional bar so the delta is visible before it is
 * read, and the delta itself is computed rather than authored, so it cannot
 * disagree with the numbers beside it.
 */
import { useRevealed } from "../motion/Reveal";
import type { Comparison, ComparisonRow } from "../../data/projects";

const pct = (row: ComparisonRow): number | null => {
  if (row.before === null || row.after === null || row.before === 0) return null;
  return ((row.after - row.before) / row.before) * 100;
};

const fmt = (n: number, unit: string): string =>
  `${n % 1 === 0 ? n : n.toFixed(1)}${unit ? " " + unit : ""}`;

export const BeforeAfter = ({
  data,
  active = true,
}: {
  data: Comparison;
  /** False while the drawer holding this table is collapsed. */
  active?: boolean;
}) => {
  const measured = data.rows.some((r) => r.before !== null && r.after !== null);
  // Bars grow from zero when the table becomes visible. Revealed is necessary
  // and not sufficient: a collapsed drawer is revealed and zero pixels tall.
  const revealed = useRevealed() && active;

  return (
    <div className="cmp">
      <div className="cmp-head">
        <span className="cmp-caption">{data.caption}</span>
        <span className="cmp-source" data-pending={measured ? "false" : "true"}>
          {data.source}
        </span>
      </div>

      <div className="cmp-rows">
        {data.rows.map((row) => {
          const delta = pct(row);
          // A "win" is a smaller number for size metrics and a larger one for
          // scores, which is why lowerBetter exists rather than assuming.
          const good =
            delta === null ? null : row.lowerBetter === false ? delta > 0 : delta < 0;
          const ratio =
            row.before !== null && row.after !== null && row.before !== 0
              ? Math.min(1, row.after / row.before)
              : null;

          return (
            <div className="cmp-row" key={row.label}>
              <span className="cmp-label">{row.label}</span>

              {row.before === null || row.after === null ? (
                <span className="cmp-empty">not yet measured</span>
              ) : (
                <>
                  <span className="cmp-values">
                    <span className="cmp-before">{fmt(row.before, row.unit)}</span>
                    <span className="cmp-arrow" aria-hidden="true">
                      &rarr;
                    </span>
                    <span className="cmp-after">{fmt(row.after, row.unit)}</span>
                  </span>
                  <span className="cmp-bar" aria-hidden="true">
                    <span
                      className="cmp-bar-fill"
                      data-good={good ? "true" : "false"}
                      style={{ transform: `scaleX(${revealed ? (ratio ?? 1) : 0})` }}
                    />
                  </span>
                  <span className="cmp-delta" data-good={good ? "true" : "false"}>
                    {delta !== null
                      ? `${delta > 0 ? "+" : ""}${delta.toFixed(0)}%`
                      : ""}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
