/**
 * projects.ts
 *
 * ── Stage 7 ──
 * Stage 6 added real information and gave it nowhere to live, so all of it
 * landed in the scroll. Three structural changes here fix that at the data
 * level, and Projects.tsx does the rest:
 *
 *  · `board` replaces the old `showcase: "kestrel"` flag. It is generic, so
 *    Kestrel and ChronoShield share one component instead of one of them
 *    getting a bespoke display and the other getting a plain card.
 *  · `board` and `comparison` are both *drawer* content now. Nothing renders
 *    them inside the card, so a card is a card whatever project it holds and
 *    the deck has a predictable height.
 *  · `status` is gone. Half the list carried "in progress", which reads as a
 *    list of unfinished things rather than a body of work.
 *
 * The honesty rules from stage 6 still hold. Copy uses only facts already in
 * the record, and nothing on a board is estimated. Where a project is genuinely
 * partial, that is stated once in its own note rather than stamped on the card.
 */

/** A single before/after row. `null` means the measurement has not been taken. */
export interface ComparisonRow {
  label: string;
  before: number | null;
  after: number | null;
  unit: string;
  /** True when a smaller number is the better one, which is most of them. */
  lowerBetter?: boolean;
}

export interface Comparison {
  caption: string;
  /**
   * Where the numbers came from. Rendered verbatim, because a measurement
   * without a source is a decoration.
   */
  source: string;
  rows: ComparisonRow[];
}

export interface BoardModule {
  name: string;
  detail: string;
}

export interface BoardMetric {
  value: number;
  /** Rendered before the number. For approximations: "~650 tests". */
  prefix?: string;
  suffix?: string;
  decimals?: number;
  label: string;
}

/**
 * The richer display for a project that has more to say than a card can hold.
 * Deliberately leads with what is built: `next` is a quiet list of names, not a
 * table of empty rows, because a roadmap rendered at the same weight as the
 * shipped work makes finished work look unfinished.
 */
export interface ProjectBoard {
  /** Heading over the module list. */
  built: string;
  modules: BoardModule[];
  metrics: BoardMetric[];
  /** Standards and practices actually in the shipped code. */
  chips: string[];
  /** Named, unweighted, and clearly not claimed as done. */
  next?: string[];
  note: string;
}

export interface Project {
  id: number;
  title: string;
  /** One line. The claim, not the stack. */
  takeaway: string;
  description: string;
  technologies: string[];
  category: string;
  github: string | null;
  live: string | null;
  /** Drawer content. Never rendered inside the card. */
  board?: ProjectBoard;
  comparison?: Comparison;
}

export const projectsData: Project[] = [
  {
    id: 1,
    title: "Kestrel Protocol",
    takeaway:
      "Nine production modules, ~650 tests across unit, fuzz and invariant suites, and a governance system that migrates from a security council to token-holder voting without redeploying anything.",
    description:
      "A complete onchain financial protocol written as a reference for production Solidity practice: a role registry with delayed grants, a multisig timelock whose delay scales with how dangerous the call is, an ERC-4626 yield vault, an upgradeable membership program, an ERC-4337 smart wallet, a fixed-supply governance token, a treasury that manages protocol revenue and its own liquidity, and a Governor that lets token holders steer fees, upgrades, and treasury spend through the same timelock the council already uses. The same .t.sol test files run under both Hardhat 3 and plain Foundry, so the suite is not hostage to one toolchain.",
    technologies: [
      "Solidity",
      "Foundry",
      "Hardhat 3",
      "OpenZeppelin 5",
      "ERC-4626",
      "ERC-721 UUPS",
      "ERC-4337",
      "ERC20Votes",
      "Governor",
    ],
    category: "blockchain",
    github: "https://github.com/Atreusx1/production-solidity-patterns",
    live: null,
    board: {
      built: "Shipped",
      modules: [
        {
          name: "Governance",
          detail:
            "RoleManager and ProjectMultisig. Timelock delay scales with the danger of the call.",
        },
        {
          name: "Yield Vault",
          detail: "ERC-4626 with a deposit fee and a TVL cap.",
        },
        {
          name: "Membership Pass",
          detail:
            "Upgradeable ERC-721. V2 adds a loyalty-points tier mechanic via a machine-verified storage migration.",
        },
        {
          name: "Smart Wallet",
          detail:
            "ERC-4337 account with batched execution, deployed deterministically via CREATE2.",
        },
        {
          name: "KSTR Token",
          detail: "Fixed-supply ERC20Votes token, minted once to the treasury.",
        },
        {
          name: "Treasury Manager",
          detail:
            "Collects protocol revenue, runs a buyback mechanism, and manages protocol-owned liquidity on an existing DEX.",
        },
        {
          name: "Merkle Airdrop",
          detail:
            "Bitmap-based claim tracking with linear vesting after claim.",
        },
        {
          name: "Staking Rewards",
          detail:
            "Two reward streams: decaying bootstrap emissions plus a share of real protocol fee revenue.",
        },
        {
          name: "Governor",
          detail:
            "Token-holder voting layered onto the same timelock the security council already proposes into.",
        },
      ],
      metrics: [
        {
          value: 650,
          prefix: "~",
          label: "tests across unit, fuzz and invariant suites",
        },
        {
          value: 98,
          suffix: "%+",
          label: "line and statement coverage across all modules",
        },
        {
          value: 35,
          prefix: "~",
          label: "invariant properties, 128 runs at depth 64 each",
        },
      ],
      chips: [
        "ERC-4626",
        "ERC-721 UUPS",
        "ERC-4337",
        "ERC20Votes",
        "Governor + Timelock",
        "Checks-effects-interactions",
        "Gas profiling",
        "SECURITY.md per module",
      ],
      next: ["Cross-chain KSTR (LayerZero OFT) — planned"],
      note: "Solidity tests run under both Hardhat 3 and plain Foundry from the same files. Deployed to public testnet, so no real funds are at stake and it has not been audited.",
    },
  },
  {
    id: 2,
    title: "ChronoShield",
    takeaway:
      "Provenance survives the dealer. The contract refuses a second certificate for a document hash it has already seen.",
    description:
      "Luxury watch authentication where every piece carries an NFT certificate holding its provenance. Uniqueness is enforced on-chain rather than by the application: a document hash maps to exactly one token, and a certificate cannot move again for thirty days after a transfer, which makes churning provenance expensive. Dealers buy an annual minting quota and sign their mints, and the relayer holds the gas and forwards them, so a dealer never needs ETH.",
    technologies: [
      "Solidity",
      "ERC-721",
      "UUPS Proxy",
      "EIP-712",
      "Meta-transactions",
      "React",
      "Node.js",
      "Express",
    ],
    category: "blockchain",
    github: "https://github.com/Atreusx1/Watch-Authentication",
    live: null,
    board: {
      built: "Contracts",
      modules: [
        {
          name: "WatchCertificate.sol",
          detail:
            "ERC-721 with Enumerable and URIStorage. One token per document hash, a thirty-day transfer cooldown, and public verification by hash.",
        },
        {
          name: "SubscriptionManager.sol",
          detail:
            "Three dealer tiers priced in a six-decimal stablecoin, each with an annual certificate quota that minting draws down.",
        },
        {
          name: "Relayer.sol",
          detail:
            "EIP-712 meta-transactions behind a function-selector allowlist, with per-dealer nonces and gas accounting.",
        },
      ],
      metrics: [
        { value: 3, label: "contracts, all UUPS-upgradeable behind proxies" },
        { value: 30, label: "days a certificate must rest between transfers" },
        { value: 0, label: "ETH a dealer needs to mint, renew or transfer" },
      ],
      chips: [
        "ERC-721",
        "UUPS upgradeable",
        "EIP-712 meta-transactions",
        "Selector allowlist",
        "Packed structs",
        "Custom errors",
        "Batch operations",
      ],
      note: "The contracts are what is public here. The Express API and admin application in front of them, including the auditor and super-admin roles, are complete but live in a separate private repository.",
    },
  },
  {
    id: 3,
    title: "Portfolio",
    takeaway:
      "One continuous camera flight past six motifs, driven entirely by scroll position.",
    description:
      "The site you are reading. A single React Three Fiber canvas behind the whole document: the camera flies one corridor and each section has a motif waiting at its waypoint, so the background is one journey rather than six effects. The globe's lattice is drawn along the spiral arms of its own point distribution, and the projects section runs a live order book terminal.",
    technologies: [
      "React",
      "TypeScript",
      "Three.js",
      "React Three Fiber",
      "GLSL",
      "Vite",
    ],
    category: "web",
    github: "Private REPO",
    live: "https://anishk-portfolio.vercel.app/",
  },
  {
    id: 4,
    title: "Enhanced zkSNARK-based Transaction System",
    takeaway:
      "Proofs are verified by a custom Substrate pallet on-chain, not checked off-chain and trusted.",
    description:
      "A Substrate solochain with a pallet that accepts and verifies Circom-generated zkSNARK proofs. Transfers commit to a Merkle tree and the circuit proves membership without revealing the amounts or the parties. The circuits are modular, so a new statement does not mean a new chain.",
    technologies: ["Rust", "Circom", "Substrate", "SnarkJS"],
    category: "blockchain",
    github: "https://github.com/Atreusx1/ZKSnark-SoloChain",
    live: null,
  },
  {
    id: 5,
    title: "Knights Fin Real Estate",
    takeaway:
      "A live client site where listings, media and 3D models are all editable without a deploy.",
    description:
      "A real estate site with the whole catalogue behind an admin panel: CRUD over listings, imagery and interactive 3D walkthroughs, so the agency changes the site without touching the codebase. React and Three.js on the front, Express and MongoDB behind it, media on S3.",
    technologies: [
      "React",
      "Three.js",
      "Node.js",
      "Express",
      "MongoDB",
      "AWS S3",
    ],
    category: "web",
    github: "Private REPO",
    live: "https://knightsfinestates.com/",
  },
  {
    id: 6,
    title: "Decentralized Voting DApp",
    takeaway:
      "The tally is contract state, so a voter can verify the result without trusting the site.",
    description:
      "A voting dApp where the count lives in a Solidity contract rather than a database. The Next.js front end reads through ethers, which means the number on screen can be checked against the chain by anyone who doubts it.",
    technologies: ["Next.js", "Solidity", "Ether.js", "Hardhat"],
    category: "blockchain",
    github: "https://github.com/Atreusx1/Voting-Dapp.git",
    live: "https://voting-dapp-wine-sigma.vercel.app/",
  },
  {
    id: 7,
    title: "Decentralized Blog DApp",
    takeaway:
      "Post bodies live on IPFS and the contract stores only the hash, so there is no server to take down.",
    description:
      "A blogging dApp that writes a content hash on-chain and keeps the post itself on IPFS, which keeps writes cheap and makes removal a question of unpinning rather than deletion. MetaMask is the only identity, so there are no accounts and no password reset.",
    technologies: ["Solidity", "Hardhat", "IPFS", "Next.js", "MetaMask"],
    category: "blockchain",
    github: "https://github.com/Atreusx1/MirrorX",
    live: null,
  },
  {
    id: 8,
    title: "React Build Optimization Toolkit",
    takeaway:
      "Post-build scripts that make the shipped bundle smaller. The numbers are the point.",
    description:
      "Node scripts that run after a React build rather than inside it: purge unused CSS against the emitted markup, compress images, obfuscate and minify JavaScript, emit Gzip alongside the originals, and generate the sitemap. Running after the build means it works on any bundler output without a plugin.",
    technologies: ["Node.js", "Shell Scripting", "PurgeCSS", "Gzip"],
    category: "build-tools",
    github: "https://github.com/Atreusx1/React-Prod-Scripts",
    live: null,
    comparison: {
      caption: "One production build, before and after the scripts run",
      // Deliberately not filled in. A toolkit whose entire claim is "things get
      // smaller" needs real measurements, and inventing plausible ones would be
      // the exact failure this rewrite exists to fix.
      source: "Awaiting measurement",
      rows: [
        {
          label: "CSS bundle",
          before: null,
          after: null,
          unit: "kB",
          lowerBetter: true,
        },
        {
          label: "JS bundle",
          before: null,
          after: null,
          unit: "kB",
          lowerBetter: true,
        },
        {
          label: "Images",
          before: null,
          after: null,
          unit: "kB",
          lowerBetter: true,
        },
        {
          label: "Total transfer",
          before: null,
          after: null,
          unit: "kB",
          lowerBetter: true,
        },
        {
          label: "Lighthouse performance",
          before: null,
          after: null,
          unit: "",
          lowerBetter: false,
        },
      ],
    },
  },
  {
    id: 9,
    title: "The Market 360",
    takeaway:
      "Trend-ranked product discovery with per-link affiliate attribution.",
    description:
      "A dropshipping and affiliate platform on the MERN stack: it ranks products by trend, automates the reorder workflow, and attributes revenue back to the affiliate link that produced it.",
    technologies: ["React", "Node.js", "MongoDB", "Vercel"],
    category: "fullstack",
    github: "Private REPO",
    live: "https://market-360-frontend-zeta.vercel.app/",
  },
  {
    id: 10,
    title: "Project Tracker",
    takeaway:
      "Per-project work sessions, rendered back as a history you can read.",
    description:
      "A time tracker with a TypeScript Express API over MongoDB. It logs work sessions against projects and renders the accumulated history as Chart.js reports, behind authenticated accounts.",
    technologies: [
      "React",
      "TypeScript",
      "Node.js",
      "Express",
      "MongoDB",
      "Chart.js",
      "Tailwind CSS",
    ],
    category: "fullstack",
    github: "https://github.com/Atreusx1/MirrorX",
    live: null,
  },
  {
    id: 11,
    title: "Seasonal Portfolio Website",
    takeaway:
      "The predecessor to this site: five seasonal scenes, switchable at runtime.",
    description:
      "Five themes that each change the whole scene rather than just the palette: day, night, rain, snow and sakura, every one with its own Three.js particle behaviour and its own generated background art.",
    technologies: ["React", "Three.js", "Tailwind CSS"],
    category: "web",
    github: "Private REPO",
    live: null,
  },
];
