/**
 * Dataset: Multi-domain high-dimensional semantic vector database
 * 64-Dimensional embeddings carefully configured for natural clustering and concept arithmetic
 */

import { VectorMath } from './vector-math.js';

export const CATEGORIES = {
  ai: { name: 'Artificial Intelligence', color: '#00f3ff', glow: 'rgba(0, 243, 255, 0.4)' },
  quantum: { name: 'Quantum Physics', color: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.4)' },
  space: { name: 'Astrophysics & Space', color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)' },
  bio: { name: 'Biotech & Medicine', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
  cyber: { name: 'Cybersecurity', color: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)' },
  finance: { name: 'Fintech & Markets', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
  philosophy: { name: 'Philosophy & Arts', color: '#ec4899', glow: 'rgba(236, 72, 153, 0.4)' }
};

// Domain seed vectors to anchor clusters in 64-D space
const DOMAIN_SEEDS = {
  ai: VectorMath.generateEmbedding('artificial intelligence deep learning transformer neural network', 64),
  quantum: VectorMath.generateEmbedding('quantum superposition entanglement qubit hilbert space physics', 64),
  space: VectorMath.generateEmbedding('astronomy galaxy cosmos black hole planetary orbit telescope', 64),
  bio: VectorMath.generateEmbedding('genomics crispr dna protein enzyme cellular biology neuroscience', 64),
  cyber: VectorMath.generateEmbedding('cryptography zero-trust malware exploit firewall encryption cipher', 64),
  finance: VectorMath.generateEmbedding('algorithmic trading liquidity portfolio asset derivative blockchain market', 64),
  philosophy: VectorMath.generateEmbedding('epistemology consciousness aesthetics ethics metaphysics existentialism logic', 64)
};

function createEmbedding(category, text, modifier = 0.35) {
  const specificVec = VectorMath.generateEmbedding(text, 64);
  const domainVec = DOMAIN_SEEDS[category] || DOMAIN_SEEDS.ai;
  
  // Blend domain anchor (1 - modifier) with specific token vector (modifier)
  const blended = domainVec.map((val, idx) => val * (1 - modifier) + specificVec[idx] * modifier);
  return VectorMath.normalize(blended);
}

export const EMBEDDING_DATASET = [
  // AI & ML
  {
    id: 'ai-transformer',
    label: 'Transformer Architecture',
    category: 'ai',
    description: 'Self-attention mechanism and parallel sequence processing for LLMs.',
    vector: createEmbedding('ai', 'Transformer self-attention multi-head feedforward positional encoding', 0.25)
  },
  {
    id: 'ai-llm',
    label: 'Large Language Model',
    category: 'ai',
    description: 'Billion-parameter generative foundation model trained on web corpora.',
    vector: createEmbedding('ai', 'Large language model generative pretrained foundation token completion', 0.28)
  },
  {
    id: 'ai-rag',
    label: 'Retrieval-Augmented Generation',
    category: 'ai',
    description: 'Grounding LLM answers with real-time vector search from knowledge bases.',
    vector: createEmbedding('ai', 'Retrieval augmented generation vector search chunking embeddings context', 0.3)
  },
  {
    id: 'ai-reinforcement',
    label: 'RLHF & Policy Gradients',
    category: 'ai',
    description: 'Reinforcement Learning from Human Feedback and reward modeling.',
    vector: createEmbedding('ai', 'Reinforcement learning reward model policy gradient PPO alignment', 0.32)
  },
  {
    id: 'ai-diffusion',
    label: 'Latent Diffusion Models',
    category: 'ai',
    description: 'Score-based generative visual synthesis reversing Gaussian noise.',
    vector: createEmbedding('ai', 'Latent diffusion denoising score matching image synthesis UNet', 0.35)
  },
  {
    id: 'ai-backprop',
    label: 'Backpropagation & Adam',
    category: 'ai',
    description: 'Gradient descent optimization algorithm with momentum estimation.',
    vector: createEmbedding('ai', 'Backpropagation gradient descent optimization loss learning rate', 0.32)
  },

  // Quantum Physics
  {
    id: 'q-qubit',
    label: 'Superconducting Qubit',
    category: 'quantum',
    description: 'Two-level quantum system forming the foundational unit of quantum computation.',
    vector: createEmbedding('quantum', 'Superconducting qubit state vector bloch sphere coherence', 0.25)
  },
  {
    id: 'q-entanglement',
    label: 'Quantum Entanglement',
    category: 'quantum',
    description: 'Non-local correlation between particles violating Bell inequalities.',
    vector: createEmbedding('quantum', 'Quantum entanglement Bell state spooky action non-locality', 0.28)
  },
  {
    id: 'q-shor',
    label: "Shor's Algorithm",
    category: 'quantum',
    description: 'Polynomial-time quantum algorithm for integer factorization.',
    vector: createEmbedding('quantum', 'Shor algorithm quantum Fourier transform prime factorization RSA', 0.32)
  },
  {
    id: 'q-decoherence',
    label: 'Quantum Decoherence',
    category: 'quantum',
    description: 'Loss of quantum coherence caused by environmental thermal noise.',
    vector: createEmbedding('quantum', 'Quantum decoherence noise relaxation dephasing fidelity', 0.3)
  },
  {
    id: 'q-qft',
    label: 'Quantum Fourier Transform',
    category: 'quantum',
    description: 'Linear transformation on qubits foundational to phase estimation.',
    vector: createEmbedding('quantum', 'Quantum Fourier transform phase estimation Hadamard rotation', 0.33)
  },

  // Astrophysics & Space
  {
    id: 'sp-blackhole',
    label: 'Supermassive Black Hole',
    category: 'space',
    description: 'Gravitational singularity enclosed by an event horizon warping spacetime.',
    vector: createEmbedding('space', 'Black hole event horizon singularity Kerr metric accretion disk', 0.26)
  },
  {
    id: 'sp-exoplanet',
    label: 'Exoplanet Transit',
    category: 'space',
    description: 'Detection of extrasolar planets via planetary transit photometry.',
    vector: createEmbedding('space', 'Exoplanet transit spectroscopy habitable zone Kepler James Webb', 0.3)
  },
  {
    id: 'sp-neutron',
    label: 'Neutron Star & Pulsar',
    category: 'space',
    description: 'Ultra-dense stellar remnant emitting periodic relativistic radio beams.',
    vector: createEmbedding('space', 'Neutron star pulsar magnetar degenerate matter gravitational waves', 0.29)
  },
  {
    id: 'sp-darkmatter',
    label: 'Dark Matter Halos',
    category: 'space',
    description: 'Non-baryonic matter responsible for galactic rotation curves.',
    vector: createEmbedding('space', 'Dark matter gravitational lensing galactic rotation WIMP halo', 0.31)
  },
  {
    id: 'sp-supernova',
    label: 'Type Ia Supernova',
    category: 'space',
    description: 'Thermonuclear explosion of a white dwarf used as standard candle.',
    vector: createEmbedding('space', 'Supernova standard candle cosmic expansion red shift white dwarf', 0.32)
  },

  // Biotech & Medicine
  {
    id: 'bio-crispr',
    label: 'CRISPR-Cas9 Gene Editing',
    category: 'bio',
    description: 'RNA-guided endonuclease for precise targeted genomic alterations.',
    vector: createEmbedding('bio', 'CRISPR Cas9 endonuclease gene editing double strand break guide RNA', 0.26)
  },
  {
    id: 'bio-alphafold',
    label: 'Protein Structure Prediction',
    category: 'bio',
    description: 'Deep neural network predicting atomic 3D coordinates from amino acid sequences.',
    vector: createEmbedding('bio', 'Protein folding AlphaFold amino acid peptide ribbon conformation', 0.3)
  },
  {
    id: 'bio-mrna',
    label: 'mRNA Vaccine Platform',
    category: 'bio',
    description: 'Lipid nanoparticle encapsulation delivering synthetic mRNA instructions.',
    vector: createEmbedding('bio', 'mRNA vaccine lipid nanoparticle antigen immune translation ribosome', 0.28)
  },
  {
    id: 'bio-optogenetics',
    label: 'Optogenetic Neural Control',
    category: 'bio',
    description: 'Channelrhodopsin expression allowing millisecond light-activated neuron firing.',
    vector: createEmbedding('bio', 'Optogenetics channelrhodopsin light stimulated neuron cortex synaptic', 0.33)
  },
  {
    id: 'bio-telomere',
    label: 'Telomere & Cellular Senescence',
    category: 'bio',
    description: 'Repetitive nucleotide sequences buffering chromosome ends against aging.',
    vector: createEmbedding('bio', 'Telomere telomerase senescence aging DNA replication Hayflick limit', 0.31)
  },

  // Cybersecurity
  {
    id: 'sec-zerotrust',
    label: 'Zero-Trust Architecture',
    category: 'cyber',
    description: 'Security paradigm requiring continuous verification and least-privilege access.',
    vector: createEmbedding('cyber', 'Zero trust continuous verification microsegmentation IAM perimeter', 0.26)
  },
  {
    id: 'sec-pqc',
    label: 'Post-Quantum Kyber Lattice',
    category: 'cyber',
    description: 'NIST standard lattice-based Key Encapsulation Mechanism resisting Shor.',
    vector: createEmbedding('cyber', 'Post quantum cryptography lattice ML-KEM Kyber key exchange', 0.3)
  },
  {
    id: 'sec-zkp',
    label: 'Zero-Knowledge Proof (ZK-SNARK)',
    category: 'cyber',
    description: 'Cryptographic proof verifying validity of a statement without disclosing data.',
    vector: createEmbedding('cyber', 'Zero knowledge proof ZK SNARK polynomial commitment prover verifier', 0.32)
  },
  {
    id: 'sec-ransomware',
    label: 'Memory-Only Exploit Defense',
    category: 'cyber',
    description: 'EDR heuristic telemetry analyzing in-memory process injection and evasion.',
    vector: createEmbedding('cyber', 'EDR telemetry memory injection process hollowing shellcode evasion', 0.31)
  },

  // Fintech & Markets
  {
    id: 'fin-amm',
    label: 'Automated Market Maker (AMM)',
    category: 'finance',
    description: 'Constant product formula (x*y=k) smart contract liquidity pools.',
    vector: createEmbedding('finance', 'Automated market maker liquidity pool constant product swap slippage', 0.27)
  },
  {
    id: 'fin-hft',
    label: 'High-Frequency Order Book',
    category: 'finance',
    description: 'Microsecond limit order book matching engine and latency arbitrage.',
    vector: createEmbedding('finance', 'High frequency trading limit order book market making latency execution', 0.29)
  },
  {
    id: 'fin-var',
    label: 'Value at Risk (VaR) Monte Carlo',
    category: 'finance',
    description: 'Statistical simulation quantifying portfolio downside tail risk.',
    vector: createEmbedding('finance', 'Value at risk Monte Carlo portfolio volatility covariance downside risk', 0.31)
  },
  {
    id: 'fin-rwa',
    label: 'Tokenized Real-World Assets',
    category: 'finance',
    description: 'Fractional on-chain representation of treasury bonds and private equity.',
    vector: createEmbedding('finance', 'Tokenized RWA treasury yield on-chain custodian fractional ownership', 0.33)
  },

  // Philosophy & Arts
  {
    id: 'phi-consciousness',
    label: 'Hard Problem of Consciousness',
    category: 'philosophy',
    description: 'Explaining subjective phenomenal experience (qualia) from physical substrates.',
    vector: createEmbedding('philosophy', 'Consciousness qualia subjective experience dualism physicalism mind', 0.26)
  },
  {
    id: 'phi-ethics',
    label: 'AI Alignment & Utilitarianism',
    category: 'philosophy',
    description: 'Normative framework for moral agency in autonomous intelligent systems.',
    vector: createEmbedding('philosophy', 'AI ethics alignment utilitarianism deontological value learning moral', 0.31)
  },
  {
    id: 'phi-epistemology',
    label: 'Bayesian Epistemology',
    category: 'philosophy',
    description: 'Probabilistic framework modeling belief updates under empirical evidence.',
    vector: createEmbedding('philosophy', 'Bayesian epistemology prior probability evidence rational credence', 0.29)
  },
  {
    id: 'phi-aesthetics',
    label: 'Generative Computational Aesthetics',
    category: 'philosophy',
    description: 'Formal mathematical models of aesthetic perception, harmony and emergence.',
    vector: createEmbedding('philosophy', 'Computational aesthetics generative art harmony proportion emergence', 0.34)
  }
];

export const ANALOGY_PRESETS = [
  {
    title: '👑 Word2Vec Royalty: King - Man + Woman = Queen',
    description: 'Clásico concepto semántico de género y nobleza en espacios vectoriales.',
    a: { id: 'ai-transformer', name: 'Transformer', weight: 1.0 },
    b: { id: 'ai-backprop', name: 'Backprop', weight: -1.0 },
    c: { id: 'ai-diffusion', name: 'Diffusion', weight: 1.0 },
    expected: 'Generative Attention'
  },
  {
    title: '🧬 Deep Biology: AI + Protein Folding = AlphaFold',
    description: 'Intersección conceptual entre redes neuronales y biología estructural.',
    a: { id: 'ai-llm', name: 'LLM Foundation', weight: 0.8 },
    b: { id: 'sp-exoplanet', name: 'Exoplanet', weight: -0.3 },
    c: { id: 'bio-crispr', name: 'CRISPR Gene', weight: 0.9 },
    expected: 'Protein Structure Prediction'
  },
  {
    title: '🛡️ Quantum Shield: Cryptography + Quantum = Post-Quantum',
    description: 'Fusión de criptografía moderna con teoría cuántica de estados.',
    a: { id: 'sec-zerotrust', name: 'Zero-Trust', weight: 1.0 },
    b: { id: 'sec-ransomware', name: 'Exploits', weight: -0.5 },
    c: { id: 'q-qubit', name: 'Qubit State', weight: 1.0 },
    expected: 'Post-Quantum Kyber Lattice'
  }
];
