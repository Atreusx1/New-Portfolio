export const RESUME = {
  name: "Anish Kadam",
  title: "Full-Stack Blockchain Developer",
  /*
   * Rewritten in stage 6. The old bio claimed "2+ years", which contradicted
   * About's derived figure of three and a half, and described "scalable Web2
   * and Web3 applications" and "production-ready decentralized applications",
   * which are five adjectives and no facts. No component reads this today, but
   * it is the string that would end up in a meta description or a resume
   * export, so it should not be the one place the site is wrong about itself.
   */
  bio: "Full-stack blockchain developer. Solidity and MERN, shipping to Ethereum, Polygon, Avalanche and Solana since 2023. Currently building Kestrel Protocol: an ERC-4626 vault and tiered-timelock governance, covered by fuzz and invariant tests.",
  email: "anishkadam92@gmail.com",
  github: "https://github.com/Atreusx1",
  linkedin: "https://www.linkedin.com/in/anish-defi/",
  twitter: "https://twitter.com",
};

export const SKILLS = {
  frontend: [
    "React",
    "Next.js",
    "TypeScript",
    "Tailwind CSS",
    "Three.js",
    "Vite",
    "Ethers.js",
  ],
  backend: [
    "Node.js",
    "Express",
    "Django",
    "MongoDB",
    "PostgreSQL",
    "DynamoDB",
  ],
  blockchain: [
    "Solidity",
    "Smart Contracts",
    "Hardhat",
    "Hyperledger Fabric Basics",
    "zkSNARK",
    "Ethereum",
    "IPFS",
    "Token Standards (ERC-20, ERC-721)",
  ],
  tools: [
    "Git",
    "Docker",
    "AWS (Lambda, S3, EC2)",
    "Alchemy",
    "MetaMask",
    "Prisma",
    "Linux",
  ],
};

/**
 * `impact` is stage 6's five-second layer: what changed because he was there,
 * not what the job title was. Every line is derived from facts already in the
 * description beside it, with the adjectives removed. Nothing was invented to
 * make a role sound larger than its own record.
 */
export const EXPERIENCE = [
  {
    id: 1,
    role: "Freelance Full-Stack Blockchain Developer",
    company: "Self-Employed",
    period: "Jun 2025 - Present",
    impact: "Buyers pay by card and never have to source ETH to complete a purchase.",
    description:
      "ICO platforms and NFT systems on MERN and Hardhat. Stripe covers the fiat leg, and meta-transactions cover gas, so the wallet requirement disappears from the buying flow. Cross-chain messaging where a product spans more than one network.",
  },
  {
    id: 2,
    role: "Full-Stack Blockchain Developer",
    company: "TecMetaverse",
    period: "Nov 2024 - Jun 2025",
    impact: "Took dApps live on four chains, and led the blockchain track that got them there.",
    description:
      "Shipped dApps to Ethereum, Polygon, Avalanche and Solana, including DeFi and staking contracts, with Node.js services on AWS behind them.",
  },
  {
    id: 3,
    role: "Software Developer Intern",
    company: "Portalwiz Technologies",
    period: "Feb 2024 - Aug 2024",
    impact: "First production Python: Django APIs behind React, with chatbot flows on top.",
    description:
      "Django APIs over MongoDB with React interfaces in front, plus chatbot flows for client-facing workflows.",
  },
  {
    id: 4,
    role: "Software Intern",
    company: "Alpha Analytics Services",
    period: "Jan 2023 - Dec 2023",
    impact: "Where the full-stack fundamentals came from, built end to end.",
    description:
      "MERN applications from React front end to Node API, with the profiling and debugging work to keep them responsive.",
  },
];
