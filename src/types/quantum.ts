export interface BlochCoordinate {
  theta: number; // Polar angle (0 to PI)
  phi: number;   // Azimuthal angle (0 to 2*PI)
  x: number;     // Bloch sphere 3D Cartesian coordinates
  y: number;
  z: number;
  probability0: number; // cos^2(theta / 2)
  probability1: number; // sin^2(theta / 2)
}

export interface DeltaPotentialWellState {
  centerAttractor: number;
  particlePosition: number;
  characteristicLength: number; // L = 2 * alpha * |mbest - x|
  waveFunctionPsi: number;      // psi(x) = (1 / sqrt(L)) * exp(-|x - p| / L)
  probabilityDensity: number;   // |psi(x)|^2
  tunnelingProbability: number;
}

export interface QuantumSimulationFrame {
  iteration: number;
  particles: {
    id: number;
    currentPos: number[];
    pbestPos: number[];
    attractorPos: number[];
    deltaLength: number;
    blochStates: BlochCoordinate[];
  }[];
  mbest: number[];
  alpha: number;
  quantumEntropy: number;
}
