/**
 * KestrelBoard.tsx
 *
 * Kestrel has 0 stars and 0 forks, so it cannot borrow credibility from social
 * proof. What it does have is a documented module lifecycle and a test
 * discipline most portfolio contracts do not, and that only reads as credible
 * if it is shown as data. Buried in a description paragraph, the same facts
 * read as claims.
 *
 * So this is a status board rather than a card: what is shipped, what is not,
 * which standards are actually implemented, and what the test suite covers.
 * The unbuilt modules are shown on purpose. A roadmap with six "planned" rows
 * is more believable than one that lists only the finished work, and it is what
 * the repository's own README says.
 *
 * ── Provenance of every number here ──
 * Module names and statuses come from the repository README. The test count,
 * coverage figure and invariant configuration come from the repository's own
 * `hardhat test solidity` and `--coverage` output. Nothing is estimated. There
 * is deliberately no line count, no gas figure and no "audited" claim, because
 * those were not available to verify, and the point of this board is that its
 * numbers survive being checked.
 */
import { CountUp } from "../motion/CountUp";
import { useRevealed } from "../motion/Reveal";

type Status = "shipped" | "in progress" | "planned";

interface Module {
  name: string;
  detail: string;
  status: Status;
}

/** Straight from the README's module table, in its order. */
const MODULES: Module[] = [
  {
    name: "Governance",
    detail: "RoleManager, ProjectMultisig, tiered timelock",
    status: "shipped",
  },
  { name: "Yield Vault", detail: "ERC-4626", status: "shipped" },
  {
    name: "Membership Pass",
    detail: "UUPS-upgradeable ERC-721, V1 to V2 without redeploy",
    status: "in progress",
  },
  { name: "Smart Wallet", detail: "ERC-4337 account", status: "planned" },
  { name: "KSTR Token", detail: "ERC-20 with votes", status: "planned" },
  { name: "Treasury Manager", detail: "protocol-owned funds", status: "planned" },
  { name: "Merkle Airdrop", detail: "claim distribution", status: "planned" },
  { name: "Staking Rewards", detail: "emissions", status: "planned" },
  { name: "Governor", detail: "onchain proposals", status: "planned" },
];

const STANDARDS = ["ERC-4626", "ERC-721 UUPS", "ERC-4337", "ERC-20 Votes"] as const;

const DISCIPLINE = [
  "Unit, fuzz and invariant suites",
  "Checks-effects-interactions",
  "Gas profiling",
  "SECURITY.md per module",
] as const;

const shipped = MODULES.filter((m) => m.status === "shipped").length;
const active = MODULES.filter((m) => m.status === "in progress").length;
const planned = MODULES.filter((m) => m.status === "planned").length;

export const KestrelBoard = () => {
  /*
   * The rows stagger in on reveal rather than on mount. A CSS animation with a
   * delay would otherwise run while the card was still below the fold and
   * finish before anyone saw it, which is the same failure stage 5 fixed for
   * the boot screen. `both` fill means the pre-delay state is the hidden one
   * and, crucially, that rows stay visible if the observer never fires at all.
   */
  const revealed = useRevealed();
  const inAttr = revealed ? "true" : "false";

  return (
  <div className="kb">
    <div className="kb-head">
      <span className="mono-label">Module lifecycle</span>
      <span className="kb-count">
        <CountUp value={shipped} /> of {MODULES.length} shipped
      </span>
    </div>

    {/*
      A segmented bar rather than a percentage. Three states are the actual
      information, and collapsing them to "22% complete" would throw away the
      distinction between started and not started.
    */}
    <div className="kb-bar" data-in={inAttr} aria-hidden="true">
      <span className="kb-seg" data-s="shipped" style={{ flexGrow: shipped }} />
      <span className="kb-seg" data-s="active" style={{ flexGrow: active }} />
      <span className="kb-seg" data-s="planned" style={{ flexGrow: planned }} />
    </div>

    <ul className="kb-list" data-in={inAttr}>
      {MODULES.map((m, i) => (
        <li
          className="kb-row"
          key={m.name}
          data-s={m.status}
          /* Staggered by index, so the board assembles top down on reveal. */
          style={{ animationDelay: `${140 + i * 45}ms` }}
        >
          <span className="kb-dot" aria-hidden="true" />
          <span className="kb-name">{m.name}</span>
          <span className="kb-detail">{m.detail}</span>
          <span className="kb-status">{m.status}</span>
        </li>
      ))}
    </ul>

    <div className="kb-metrics">
      <div className="kb-metric">
        <span className="kb-metric-value">
          <CountUp value={94} />
        </span>
        <span className="kb-metric-label">
          governance tests, unit, fuzz and invariant
        </span>
      </div>
      <div className="kb-metric">
        <span className="kb-metric-value">
          <CountUp value={100} suffix="%" />
        </span>
        <span className="kb-metric-label">
          line and statement coverage on both governance contracts
        </span>
      </div>
      <div className="kb-metric">
        <span className="kb-metric-value">
          <CountUp value={128} />
          <span className="kb-metric-x">&times;</span>
          <CountUp value={64} />
        </span>
        <span className="kb-metric-label">invariant runs by depth</span>
      </div>
    </div>

    <div className="kb-chips">
      {STANDARDS.map((s) => (
        <span className="chip" key={s}>
          {s}
        </span>
      ))}
      {DISCIPLINE.map((d) => (
        <span className="chip chip-quiet" key={d}>
          {d}
        </span>
      ))}
    </div>

    <p className="kb-note">
      Solidity tests run under both Hardhat 3 and plain Foundry from the same
      files. Deployed to public testnet only. No real funds, not audited.
    </p>
  </div>
  );
};
