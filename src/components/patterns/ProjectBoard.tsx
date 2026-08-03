/**
 * ProjectBoard.tsx
 *
 * The richer display for a project with more to say than a card holds. Kestrel
 * and ChronoShield both use it; it replaced a Kestrel-only component, because
 * one project getting a bespoke treatment and its neighbour getting a plain
 * card said something about the projects that was not true.
 *
 * ── What changed from the first version, and why ──
 * The first board led with "2 of 9 shipped" over a nine-row table where six
 * rows said "planned". That was accurate and it read as a project that was 22%
 * finished. A roadmap rendered at the same visual weight as delivered work
 * makes delivered work look unfinished.
 *
 * So the board now leads with what is built, at full weight, with the metrics
 * that back it. What is not built is named on one quiet line at the bottom.
 * Nothing was reclassified to get there: no unbuilt module is listed as
 * shipped, no standard is claimed for a module that does not exist yet, and
 * each board still carries its own note about what is and is not public or on
 * mainnet. Emphasis moved; the facts did not.
 *
 * It renders inside a drawer rather than inside the card, which is what lets
 * the deck keep a predictable height whatever project is on screen.
 */
import { CountUp } from "../motion/CountUp";
import type { ProjectBoard as BoardData } from "../../data/projects";

export const ProjectBoard = ({
  data,
  active = true,
}: {
  data: BoardData;
  /** False while the drawer is collapsed, so the metrics do not count in the dark. */
  active?: boolean;
}) => (
  <div className="pb">
    <div className="pb-modules">
      <span className="mono-label pb-built">{data.built}</span>
      <ul className="pb-list">
        {data.modules.map((m, i) => (
          <li
            className="pb-row"
            key={m.name}
            /* Staggered from the drawer opening, not from mount. */
            style={{ animationDelay: `${80 + i * 70}ms` }}
          >
            <span className="pb-dot" aria-hidden="true" />
            <span className="pb-name">{m.name}</span>
            <span className="pb-detail">{m.detail}</span>
          </li>
        ))}
      </ul>
    </div>

    <div className="pb-metrics">
      {data.metrics.map((m, i) => (
        <div
          className="pb-metric"
          key={m.label}
          style={{ animationDelay: `${200 + i * 90}ms` }}
        >
          <span className="pb-metric-value">
            <CountUp
              value={m.value}
              decimals={m.decimals ?? 0}
              suffix={m.suffix ?? ""}
              active={active}
            />
          </span>
          <span className="pb-metric-label">{m.label}</span>
        </div>
      ))}
    </div>

    <div className="pb-chips">
      {data.chips.map((c) => (
        <span className="chip" key={c}>
          {c}
        </span>
      ))}
    </div>

    {data.next && data.next.length > 0 && (
      <p className="pb-next">
        <span className="mono-label">Next</span>
        <span>{data.next.join(", ")}</span>
      </p>
    )}

    <p className="pb-note">{data.note}</p>
  </div>
);
