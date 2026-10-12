/**
 * Vector Math & Dimensionality Reduction Algorithms
 * High-precision vector mathematics for semantic similarity & projection
 */

export class VectorMath {
  /**
   * Dot Product of two vectors
   */
  static dotProduct(a, b) {
    if (a.length !== b.length) throw new Error('Vector dimensions must match');
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i];
    }
    return sum;
  }

  /**
   * Euclidean Norm (Magnitude) of a vector
   */
  static magnitude(v) {
    let sum = 0;
    for (let i = 0; i < v.length; i++) {
      sum += v[i] * v[i];
    }
    return Math.sqrt(sum);
  }

  /**
   * Normalize a vector to unit length (L2 norm)
   */
  static normalize(v) {
    const mag = this.magnitude(v);
    if (mag === 0) return v.slice();
    return v.map(val => val / mag);
  }

  /**
   * Cosine Similarity: dot(a, b) / (|a| * |b|)
   * Range: [-1, 1] (Usually [0, 1] for positive embeddings)
   */
  static cosineSimilarity(a, b) {
    const magA = this.magnitude(a);
    const magB = this.magnitude(b);
    if (magA === 0 || magB === 0) return 0;
    const dot = this.dotProduct(a, b);
    return Math.max(-1, Math.min(1, dot / (magA * magB)));
  }

  /**
   * Cosine Distance: 1 - CosineSimilarity
   * Range: [0, 2]
   */
  static cosineDistance(a, b) {
    return 1 - this.cosineSimilarity(a, b);
  }

  /**
   * Euclidean Distance (L2): sqrt(sum((a_i - b_i)^2))
   */
  static euclideanDistance(a, b) {
    if (a.length !== b.length) throw new Error('Vector dimensions must match');
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  /**
   * Manhattan Distance (L1): sum(|a_i - b_i|)
   */
  static manhattanDistance(a, b) {
    if (a.length !== b.length) throw new Error('Vector dimensions must match');
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.abs(a[i] - b[i]);
    }
    return sum;
  }

  /**
   * Vector Addition: a + b
   */
  static add(a, b) {
    return a.map((val, idx) => val + (b[idx] || 0));
  }

  /**
   * Vector Subtraction: a - b
   */
  static subtract(a, b) {
    return a.map((val, idx) => val - (b[idx] || 0));
  }

  /**
   * Scalar Multiplication: s * a
   */
  static scale(a, s) {
    return a.map(val => val * s);
  }

  /**
   * Vector Linear Combination (Concept Arithmetic)
   * Example: King - Man + Woman
   */
  static linearCombination(terms) {
    // terms: array of { vector: number[], weight: number }
    if (!terms || terms.length === 0) return [];
    const dim = terms[0].vector.length;
    const result = new Array(dim).fill(0);

    for (const term of terms) {
      for (let i = 0; i < dim; i++) {
        result[i] += term.vector[i] * term.weight;
      }
    }
    return this.normalize(result);
  }

  /**
   * Fast PCA (Principal Component Analysis) to project High-D (e.g. 64-D, 128-D) vectors to 3D.
   * Computes covariance approximation and power iteration for top 3 eigenvectors.
   */
  static projectPCA(vectors, targetDim = 3) {
    const N = vectors.length;
    if (N === 0) return [];
    const D = vectors[0].length;

    // 1. Center vectors (subtract mean)
    const mean = new Array(D).fill(0);
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < D; j++) {
        mean[j] += vectors[i][j];
      }
    }
    for (let j = 0; j < D; j++) mean[j] /= N;

    const centered = vectors.map(v => v.map((val, j) => val - mean[j]));

    // 2. Power iteration to find top `targetDim` principal components
    const components = [];
    const deflated = centered.map(row => row.slice());

    for (let comp = 0; comp < targetDim; comp++) {
      // Random initial vector
      let eigen = new Array(D).fill(0).map(() => Math.random() - 0.5);
      eigen = this.normalize(eigen);

      // Power iteration (25 iterations for fast convergence)
      for (let iter = 0; iter < 25; iter++) {
        const nextEigen = new Array(D).fill(0);
        for (let i = 0; i < N; i++) {
          const projection = this.dotProduct(deflated[i], eigen);
          for (let j = 0; j < D; j++) {
            nextEigen[j] += projection * deflated[i][j];
          }
        }
        eigen = this.normalize(nextEigen);
      }

      components.push(eigen);

      // Deflate matrix: remove projection of current component
      for (let i = 0; i < N; i++) {
        const proj = this.dotProduct(deflated[i], eigen);
        for (let j = 0; j < D; j++) {
          deflated[i][j] -= proj * eigen[j];
        }
      }
    }

    // 3. Project centered data onto top principal components
    const projected = centered.map(v => {
      const point = [];
      for (let c = 0; c < targetDim; c++) {
        point.push(this.dotProduct(v, components[c]));
      }
      return point;
    });

    // Scale to standard box [-100, 100]
    return this.scaleToBoundingBox(projected, 85);
  }

  /**
   * t-SNE / Force-directed layout simulation for high-D semantic clustering
   */
  static projectTSNE(vectors, targetDim = 3, perplexity = 15, iterations = 60) {
    const N = vectors.length;
    if (N === 0) return [];
    
    // Initialize with PCA for rapid convergence
    const points = this.projectPCA(vectors, targetDim);

    // Compute pairwise high-dimensional distances (Gaussian affinities)
    const pDist = [];
    for (let i = 0; i < N; i++) {
      pDist[i] = [];
      for (let j = 0; j < N; j++) {
        if (i === j) {
          pDist[i][j] = 0;
        } else {
          const sim = this.cosineSimilarity(vectors[i], vectors[j]);
          // Affinity proportional to semantic similarity
          pDist[i][j] = Math.max(0.001, (sim + 1) / 2);
        }
      }
    }

    // Force relaxation steps
    const learningRate = 0.8;
    for (let iter = 0; iter < iterations; iter++) {
      const forces = points.map(() => new Array(targetDim).fill(0));

      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          // Low-D distance
          let distSq = 0;
          const diff = [];
          for (let d = 0; d < targetDim; d++) {
            const dVal = points[i][d] - points[j][d];
            diff.push(dVal);
            distSq += dVal * dVal;
          }
          const dist = Math.max(0.1, Math.sqrt(distSq));
          
          // Attractive force based on high-D similarity
          const targetDist = 120 * (1 - pDist[i][j]);
          const force = (dist - targetDist) * 0.05 * pDist[i][j];

          // Repulsive force for non-similar points
          const repulsion = 40 / (distSq + 10);

          for (let d = 0; d < targetDim; d++) {
            const unit = diff[d] / dist;
            const netForce = (force - repulsion) * learningRate;
            forces[i][d] -= netForce * unit;
            forces[j][d] += netForce * unit;
          }
        }
      }

      // Apply forces
      for (let i = 0; i < N; i++) {
        for (let d = 0; d < targetDim; d++) {
          points[i][d] += forces[i][d];
        }
      }
    }

    return this.scaleToBoundingBox(points, 85);
  }

  /**
   * Helper: Scale array of points into a centered bounding box [-scale, scale]
   */
  static scaleToBoundingBox(points, targetScale = 80) {
    if (points.length === 0) return [];
    const dim = points[0].length;
    
    let minVals = new Array(dim).fill(Infinity);
    let maxVals = new Array(dim).fill(-Infinity);

    for (const p of points) {
      for (let d = 0; d < dim; d++) {
        if (p[d] < minVals[d]) minVals[d] = p[d];
        if (p[d] > maxVals[d]) maxVals[d] = p[d];
      }
    }

    let maxSpan = 0;
    for (let d = 0; d < dim; d++) {
      const span = maxVals[d] - minVals[d];
      if (span > maxSpan) maxSpan = span;
    }
    if (maxSpan === 0) maxSpan = 1;

    const factor = (targetScale * 2) / maxSpan;
    const center = minVals.map((min, d) => (min + maxVals[d]) / 2);

    return points.map(p => {
      return p.map((val, d) => (val - center[d]) * factor);
    });
  }

  /**
   * Generate pseudo-random semantic embedding vector seeded by text/hash
   */
  static generateEmbedding(text, dimension = 64) {
    // Deterministic hash-based feature extraction with semantic token biases
    const vector = new Array(dimension).fill(0);
    const words = text.toLowerCase().match(/\b[a-z0-9_-]+\b/g) || [text];

    for (let wIdx = 0; wIdx < words.length; wIdx++) {
      const word = words[wIdx];
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = (hash << 5) - hash + word.charCodeAt(i);
        hash |= 0;
      }

      for (let d = 0; d < dimension; d++) {
        // Multi-frequency harmonic representation
        const angle = (Math.abs(hash) * (d + 1) * 0.173 + wIdx * 0.41) % (2 * Math.PI);
        const weight = 1 / (1 + Math.abs(Math.sin(angle * 3)));
        vector[d] += Math.sin(angle) * weight;
      }
    }

    return this.normalize(vector);
  }
}
