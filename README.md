# TrafficWeave

> Quantum-Inspired Metaheuristic Engine for Dynamic Vehicle Routing and Multi-Depot Traffic Optimization.

TrafficWeave is a high-performance optimization platform designed for the Multi-Depot Capacitated Vehicle Routing Problem with Time Windows (MD-CVRPTW) under dynamic, non-stationary urban traffic conditions. The platform implements Quantum Particle Swarm Optimization (QPSO), Quantum Genetic Algorithms (QGA), and classical metaheuristic benchmarks with real OpenStreetMap network integration across Indian metropolitan areas.

---

## 1. Problem Formulation

The system models the transportation network as a time-dependent directed graph $G = (V, E, W(t))$, where $V = V_{\text{depot}} \cup V_{\text{customer}}$ and $E$ is the set of traversable road links.

The scalarized composite objective function is defined as:

$$\min F(S) = w_1 \sum_{k} D_k + w_2 \sum_{k} T_k(t) + w_3 \sum_{k} C_k(t) + w_4 \sum_{k} E_k(m, v) + P_{\text{penalties}}$$

Subject to:
1. **Capacity Constraints**: $\sum_{i \in R_k} q_i \le Q_k, \quad \forall k \in K$
2. **Time Windows**: $t_i \in [e_i, l_i]$, with quadratic penalty for late arrival: $P_i = \lambda \cdot \max(0, t_i - l_i)^2$
3. **Dynamic Travel Times**: $T_e(t) = \frac{L_e}{v_e(t)}$, where $v_e(t) = \frac{v_{\text{base}}}{1 + \beta \cdot \text{Congestion}(t)}$
4. **COPERT Physics Emission**: $E(d, v, m) = d \cdot r_{\text{base}} \cdot f_{\text{speed}}(v) \cdot f_{\text{load}}(m)$

---

## 2. Implemented Optimization Algorithms

| Algorithm | Type | Description | Key Characteristic |
| :--- | :--- | :--- | :--- |
| **QPSO** | Quantum Metaheuristic | Delta-potential well particle swarm with mean best attractor | Avoids local minima trapping via quantum tunneling |
| **Classical PSO** | Metaheuristic | Standard inertia weight & velocity vector kinematics | Baseline swarm optimization |
| **QGA** | Quantum Genetic | Qubit angle encoding with dynamic rotation gates | Continuous-to-discrete probability mapping |
| **Classical GA** | Metaheuristic | Order Crossover (OX) & swap mutation | Traditional evolutionary search |
| **Simulated Annealing**| Metaheuristic | Metropolis-Hastings acceptance criterion | Thermodynamic cooling schedule |
| **Clarke-Wright** | Construction Heuristic | Greedy savings calculation | Deterministic baseline initialization |
| **Exact B&B** | Exact Solver | Depth-first Branch & Bound with Lower Bound pruning | Provably optimal reference for $N \le 10$ nodes |

---

## 3. Quantum Metaheuristic Mechanics

### Quantum-Behaved Particle Swarm Optimization (QPSO)
In QPSO, particle states are described by a wave function $\psi(x, t)$ within a one-dimensional Delta potential well centered at the local attractor $p_{ij}$:

$$\psi(x) = \frac{1}{\sqrt{L}} \exp\left(-\frac{|x - p_{ij}|}{L}\right)$$

where the characteristic length $L_{ij}(t) = 2 \alpha |mbest_j - x_{ij}(t)|$ and $mbest$ represents the swarm mean best position:

$$mbest_j = \frac{1}{M} \sum_{i=1}^{M} pbest_{ij}$$

Monte Carlo inverse cumulative sampling yields the position update:

$$x_{ij}(t+1) = p_{ij}(t) \pm \alpha |mbest_j - x_{ij}(t)| \ln\left(\frac{1}{u}\right), \quad u \sim U(0, 1)$$

### Contraction-Expansion Schedule
The parameter $\alpha(t)$ follows an adaptive cosine cooling schedule:

$$\alpha(t) = \alpha_{\min} + (\alpha_{\max} - \alpha_{\min}) \cdot \frac{1 + \cos(\pi t / T_{\max})}{2}$$

---

## 4. Supported Metropolitan Networks

The platform integrates real road topology, depot hubs, and customer delivery points for major Indian metropolitan areas:

- **Mumbai Metropolitan Region**: Depots in JNPT Port Terminal and Bhiwandi Logistics Park; customer distribution across South Mumbai, BKC, Navi Mumbai, and Thane.
- **Delhi National Capital Region**: Depots in Okhla Phase III and Gurgaon Udyog Vihar; nodes spanning Connaught Place, Noida Sector 62, and Cyber Hub.
- **Bengaluru Tech Corridor**: Depots in Electronic City and Peenya Industrial Estate; delivery points through Whitefield, Indiranagar, and Hebbal.
- **Hyderabad Hi-Tech Network**: Depots in Gachibowli and Shamshabad Cargo Terminal; distribution through HITEC City, Begumpet, and Secunderabad.
- **Chennai Coastal Logistics**: Depots in Chennai Port Hub and Sriperumbudur Corridor; nodes across Guindy, OMR, and T. Nagar.

---

## 5. System Modules

1. **Map Simulator**: Real Leaflet OpenStreetMap view with dynamic speed heatmaps, incident injection, route polylines, and live vehicle playback.
2. **Algorithm Tournament Arena**: Side-by-side synchronized execution of competing algorithms with live iteration logs and convergence metrics.
3. **Routing Systems Lab**:
   - D-Wave / Qiskit Ising & QUBO Matrix Formulation export.
   - Emergency Green-Wave signal preemption corridor.
   - Indian Monsoon Hydrological potential barrier rerouting.
   - Topological EV Energy Hamiltonian & aerodynamic platooning.
   - Post-Quantum Cryptographic route sealing (NIST FIPS 204 ML-DSA standard).
4. **Benchmark Suite**: Monte Carlo statistical distributions ($N = 10 \dots 30$), Welch's two-sample $t$-tests ($p$-values), optimality gap evaluations, and COPERT emissions modeling.

---

## 6. Getting Started

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)

### Installation
```bash
# Clone repository
git clone https://github.com/your-org/trafficweave.git
cd trafficweave

# Install dependencies
npm install

# Launch development server
npm run dev
```

### Production Build & Validation
```bash
# Type check and build
npm run build

# Run local preview
npm run preview
```

---

## 7. License

Academic & Enterprise Research License. Developed for technical benchmarking and smart-city logistics research.
