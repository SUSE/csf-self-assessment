import type { Workbook } from '../schema';

// The "New workbook" seed: the core ten dimensions with the
// EC-floor six critical (Edge and Facilities not critical), the five SEAL levels,
// and the EC's eight objectives with their inherited weights (audit D-4: keep +
// document) — question lists EMPTY. The starter is draft-valid but strict-INVALID
// on purpose: the validity badge and the coverage grid are the author's to-do
// list, and Preview unlocks only once every remaining objective holds a question
// and the weights still sum to 100. The audit's reference profiles A / BASE / M
// ship as test estates, answers empty.
export function starterWorkbook(): Workbook {
  return {
    meta: { id: 'my-workbook', version: '0.1.0', title: 'Untitled workbook' },
    frontSheet: [],
    sealLevels: [
      { seal: 0, name: 'No Sovereignty', description: 'No sovereign control; fully dependent on a foreign-controlled provider.' },
      { seal: 1, name: 'Jurisdictional Sovereignty', description: 'Operated under EU jurisdiction, but control can still be overridden from outside.' },
      { seal: 2, name: 'Data Sovereignty', description: 'The EU controls the data even under stress; outside parties cannot compel access.' },
      { seal: 3, name: 'Technological Sovereignty', description: 'The EU controls the technology and can keep operating if a foreign supplier withdraws.' },
      { seal: 4, name: 'Full Digital Sovereignty', description: 'Complete sovereign control across law, data, and technology, down to the supply chain.' },
    ],
    dimensions: [
      { id: 'compute', name: 'Compute', strata: ['service', 'software', 'hardware', 'chips'], critical: true },
      { id: 'storage', name: 'Storage', strata: ['service', 'software', 'hardware', 'chips'], critical: true },
      { id: 'network', name: 'Network', critical: true },
      { id: 'iam', name: 'IAM', critical: true },
      { id: 'platform', name: 'Platform (containers & PaaS)', critical: true },
      { id: 'aiml', name: 'AI/ML platform', critical: false },
      { id: 'software-supply', name: 'Software supply & development', critical: false },
      { id: 'security', name: 'Security', critical: true },
      { id: 'edge', name: 'Edge (CDN/DDoS/DNS)', critical: false },
      { id: 'facilities', name: 'Facilities (power/cooling/building)', critical: false },
    ],
    roles: [
      { id: 'ARCH', name: 'Architecture', description: 'Designs the estate; owns topology and platform choices.' },
      { id: 'OPS', name: 'Platform ops', description: 'Runs the estate day to day.' },
      { id: 'SEC', name: 'Security', description: 'Owns controls, identity, and incident response.' },
      { id: 'LEG', name: 'Legal', description: 'Owns contracts, jurisdiction, and data-protection law.' },
      { id: 'PROC', name: 'Procurement', description: 'Owns supplier selection, exit, and commercial terms.' },
      { id: 'FAC', name: 'Facilities/ESG', description: 'Owns data-centre siting, power, and sustainability.' },
    ],
    parties: [
      { id: 'institution', name: 'Institution', kind: 'assessed', description: 'The assessed party — the estate owner (EC: Contracting Authority).' },
      { id: 'primary-provider', name: 'Primary provider', kind: 'third-party', description: 'The contractor delivering the service.' },
      { id: 'subprocessor', name: 'Subprocessor', kind: 'third-party', description: 'A legal entity involved in delivery of the contract.' },
      { id: 'supplier', name: 'Supplier', kind: 'third-party', description: 'Delivers hardware/software; no unsupervised access.' },
    ],
    objectives: [
      { id: 'SOV-1', name: 'Strategic Sovereignty', weight: 20, questions: [] },
      { id: 'SOV-2', name: 'Legal & Jurisdictional Sovereignty', weight: 10, questions: [] },
      { id: 'SOV-3', name: 'Data & AI Sovereignty', weight: 10, questions: [] },
      { id: 'SOV-4', name: 'Operational Sovereignty', weight: 15, questions: [] },
      { id: 'SOV-5', name: 'Supply Chain Sovereignty', weight: 10, questions: [] },
      { id: 'SOV-6', name: 'Technology Sovereignty', weight: 15, questions: [] },
      { id: 'SOV-7', name: 'Security & Compliance Sovereignty', weight: 15, questions: [] },
      { id: 'SOV-8', name: 'Environmental Sovereignty', weight: 5, questions: [] },
    ],
    testEstates: [
      {
        id: 'profile-a',
        name: 'Profile A',
        description: 'Wholly on a non-EU hyperscaler, with an excellent programme.',
        parties: [
          { id: 'inst', name: 'Institution', type: 'institution', serves: [] },
          {
            id: 'hyperscaler',
            name: 'Hyperscaler',
            type: 'primary-provider',
            serves: ['compute', 'storage', 'network', 'iam', 'platform', 'aiml', 'software-supply', 'security'],
          },
        ],
        answers: [],
      },
      {
        id: 'profile-base',
        name: 'Profile BASE',
        description: 'EU/open stack, EU keys, EU SOC, no foreign parent, but thin paperwork.',
        parties: [{ id: 'inst', name: 'Institution', type: 'institution', serves: [] }],
        answers: [],
      },
      {
        id: 'profile-m',
        name: 'Profile M',
        description: 'An honest median EU public institution.',
        parties: [
          { id: 'inst', name: 'Institution', type: 'institution', serves: [] },
          {
            id: 'provider',
            name: 'Primary provider',
            type: 'primary-provider',
            serves: ['compute', 'storage', 'network'],
          },
        ],
        answers: [],
      },
    ],
    recommendations: [],
  };
}
