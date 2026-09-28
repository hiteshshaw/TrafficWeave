import { CityGraph, GraphNode, GraphEdge } from '../../types/graph';

export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(0.4, Math.round(R * c * 10) / 10);
}

export function buildAdjacencyMap(edges: GraphEdge[]): Map<string, Array<{ targetId: string; edge: GraphEdge }>> {
  const adj = new Map<string, Array<{ targetId: string; edge: GraphEdge }>>();
  for (const edge of edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    adj.get(edge.source)!.push({ targetId: edge.target, edge });

    if (!adj.has(edge.target)) adj.set(edge.target, []);
    adj.get(edge.target)!.push({ targetId: edge.source, edge });
  }
  return adj;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. HYDERABAD CYBERABAD & IT CORRIDOR REAL MAP
// ─────────────────────────────────────────────────────────────────────────────
export function generateHyderabadRealGraph(): CityGraph {
  const nodes: GraphNode[] = [
    // Depots
    { id: 'hyd_depot_rgia', name: 'RGIA Shamshabad Airport Air Cargo Hub', x: 200, y: 880, lat: 17.2403, lng: 78.4294, type: 'depot', demand: 0 },
    { id: 'hyd_depot_sanathnagar', name: 'Sanathnagar Industrial Logistics Park', x: 380, y: 220, lat: 17.4580, lng: 78.4420, type: 'depot', demand: 0 },
    { id: 'hyd_depot_cherlapally', name: 'Cherlapally Industrial Freight Hub', x: 820, y: 260, lat: 17.4720, lng: 78.6010, type: 'depot', demand: 0 },

    // Hospitals
    { id: 'hyd_hosp_apollo', name: 'Apollo Hospitals Jubilee Hills', x: 320, y: 440, lat: 17.4180, lng: 78.4110, type: 'hospital', demand: 210, priority: 5, timeWindow: { start: 20, end: 100, serviceDuration: 20 } },
    { id: 'hyd_hosp_nims', name: 'NIMS Nizam Institute Premier Hospital', x: 490, y: 420, lat: 17.4225, lng: 78.4520, type: 'hospital', demand: 180, priority: 5, timeWindow: { start: 25, end: 110, serviceDuration: 18 } },
    { id: 'hyd_hosp_aig', name: 'AIG Hospitals Gachibowli Medical Center', x: 220, y: 380, lat: 17.4430, lng: 78.3620, type: 'hospital', demand: 160, priority: 5, timeWindow: { start: 30, end: 120, serviceDuration: 16 } },

    // IT, Commercial & Urban Nodes
    { id: 'hyd_hitec', name: 'HITEC City Cyber Towers & Mindspace', x: 240, y: 340, lat: 17.4475, lng: 78.3762, type: 'customer', demand: 240, timeWindow: { start: 30, end: 95, serviceDuration: 15 } },
    { id: 'hyd_gachibowli', name: 'Gachibowli Financial District SEZ', x: 180, y: 460, lat: 17.4180, lng: 78.3480, type: 'customer', demand: 195, timeWindow: { start: 35, end: 110, serviceDuration: 14 } },
    { id: 'hyd_banjara', name: 'Banjara Hills Road No 1 & 12 CBD', x: 440, y: 460, lat: 17.4150, lng: 78.4450, type: 'customer', demand: 170, timeWindow: { start: 25, end: 90, serviceDuration: 12 } },
    { id: 'hyd_charminar', name: 'Charminar Old City Wholesale Hub', x: 540, y: 720, lat: 17.3616, lng: 78.4747, type: 'customer', demand: 220, timeWindow: { start: 40, end: 130, serviceDuration: 16 } },
    { id: 'hyd_secunderabad', name: 'Secunderabad Rail Interchange Station', x: 620, y: 320, lat: 17.4399, lng: 78.4983, type: 'customer', demand: 185, timeWindow: { start: 30, end: 105, serviceDuration: 14 } },
    { id: 'hyd_kukatpally', name: 'Kukatpally JNTU Commercial Corridor', x: 300, y: 180, lat: 17.4930, lng: 78.3990, type: 'customer', demand: 165, timeWindow: { start: 45, end: 135, serviceDuration: 13 } },
    { id: 'hyd_madhapur', name: 'Madhapur Inorbit Tech Park Corridor', x: 280, y: 400, lat: 17.4360, lng: 78.3880, type: 'customer', demand: 140, timeWindow: { start: 40, end: 120, serviceDuration: 12 } },
    { id: 'hyd_uppal', name: 'Uppal Tech SEZ & Metro Interchange', x: 740, y: 520, lat: 17.4020, lng: 78.5600, type: 'customer', demand: 150, timeWindow: { start: 50, end: 140, serviceDuration: 12 } },
  ];

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  interface RawEdgeDef {
    src: string;
    tgt: string;
    speed: number;
    cong: number;
    waypoints?: [number, number][];
  }

  const rawEdges: RawEdgeDef[] = [
    // PVNR Expressway from RGIA Airport to Banjara Hills
    {
      src: 'hyd_depot_rgia', tgt: 'hyd_banjara', speed: 80, cong: 1.5,
      waypoints: [[17.2403, 78.4294], [17.3100, 78.4350], [17.3750, 78.4400], [17.4150, 78.4450]],
    },
    // Airport to Gachibowli via Nehru Outer Ring Road (ORR)
    {
      src: 'hyd_depot_rgia', tgt: 'hyd_gachibowli', speed: 90, cong: 1.2,
      waypoints: [[17.2403, 78.4294], [17.2900, 78.3700], [17.3600, 78.3300], [17.4180, 78.3480]],
    },
    // Gachibowli to HITEC City
    {
      src: 'hyd_gachibowli', tgt: 'hyd_hitec', speed: 55, cong: 2.2,
      waypoints: [[17.4180, 78.3480], [17.4350, 78.3650], [17.4475, 78.3762]],
    },
    // HITEC City to AIG Hospital
    {
      src: 'hyd_hitec', tgt: 'hyd_hosp_aig', speed: 45, cong: 1.8,
      waypoints: [[17.4475, 78.3762], [17.4430, 78.3620]],
    },
    // HITEC City to Madhapur & Durgam Cheruvu Cable Bridge
    {
      src: 'hyd_hitec', tgt: 'hyd_madhapur', speed: 40, cong: 2.4,
      waypoints: [[17.4475, 78.3762], [17.4360, 78.3880]],
    },
    // Madhapur to Apollo Hospital Jubilee Hills via Durgam Cheruvu Cable Bridge
    {
      src: 'hyd_madhapur', tgt: 'hyd_hosp_apollo', speed: 50, cong: 1.7,
      waypoints: [[17.4360, 78.3880], [17.4280, 78.3950], [17.4180, 78.4110]],
    },
    // Apollo Jubilee Hills to Banjara Hills
    {
      src: 'hyd_hosp_apollo', tgt: 'hyd_banjara', speed: 45, cong: 2.1,
      waypoints: [[17.4180, 78.4110], [17.4150, 78.4450]],
    },
    // Banjara Hills to NIMS Hospital Punjagutta
    {
      src: 'hyd_banjara', tgt: 'hyd_hosp_nims', speed: 40, cong: 2.3,
      waypoints: [[17.4150, 78.4450], [17.4200, 78.4480], [17.4225, 78.4520]],
    },
    // NIMS Punjagutta to Sanathnagar Depot
    {
      src: 'hyd_hosp_nims', tgt: 'hyd_depot_sanathnagar', speed: 45, cong: 2.0,
      waypoints: [[17.4225, 78.4520], [17.4450, 78.4450], [17.4580, 78.4420]],
    },
    // Sanathnagar to Kukatpally JNTU
    {
      src: 'hyd_depot_sanathnagar', tgt: 'hyd_kukatpally', speed: 50, cong: 2.2,
      waypoints: [[17.4580, 78.4420], [17.4800, 78.4150], [17.4930, 78.3990]],
    },
    // Kukatpally to HITEC City
    {
      src: 'hyd_kukatpally', tgt: 'hyd_hitec', speed: 45, cong: 2.4,
      waypoints: [[17.4930, 78.3990], [17.4680, 78.3850], [17.4475, 78.3762]],
    },
    // NIMS Punjagutta to Secunderabad Rail Station (Around north of Hussain Sagar lake)
    {
      src: 'hyd_hosp_nims', tgt: 'hyd_secunderabad', speed: 40, cong: 2.2,
      waypoints: [[17.4225, 78.4520], [17.4350, 78.4750], [17.4399, 78.4983]],
    },
    // Secunderabad to Cherlapally Depot
    {
      src: 'hyd_secunderabad', tgt: 'hyd_depot_cherlapally', speed: 60, cong: 1.4,
      waypoints: [[17.4399, 78.4983], [17.4550, 78.5500], [17.4720, 78.6010]],
    },
    // Cherlapally to Uppal SEZ
    {
      src: 'hyd_depot_cherlapally', tgt: 'hyd_uppal', speed: 55, cong: 1.5,
      waypoints: [[17.4720, 78.6010], [17.4350, 78.5800], [17.4020, 78.5600]],
    },
    // Uppal to Charminar Old City via Inner Ring Road
    {
      src: 'hyd_uppal', tgt: 'hyd_charminar', speed: 45, cong: 2.5,
      waypoints: [[17.4020, 78.5600], [17.3800, 78.5200], [17.3616, 78.4747]],
    },
    // Charminar to Banjara Hills
    {
      src: 'hyd_charminar', tgt: 'hyd_banjara', speed: 35, cong: 2.6,
      waypoints: [[17.3616, 78.4747], [17.3850, 78.4550], [17.4150, 78.4450]],
    },
  ];

  const edges: GraphEdge[] = rawEdges.map((raw, idx) => {
    const n1 = nodeMap.get(raw.src)!;
    const n2 = nodeMap.get(raw.tgt)!;
    const dist = haversineDistanceKm(n1.lat, n1.lng, n2.lat, n2.lng);
    const points: [number, number][] = raw.waypoints ?? [[n1.lat, n1.lng], [n2.lat, n2.lng]];
    return {
      id: `edge_hyd_${idx}`,
      source: raw.src,
      target: raw.tgt,
      lengthKm: dist,
      baseSpeedKmh: raw.speed,
      currentSpeedKmh: Math.max(8, Math.round(raw.speed / raw.cong)),
      congestionFactor: raw.cong,
      capacityVehiclesPerHour: 2200,
      currentFlow: Math.round(raw.cong * 500),
      geoPoints: points,
    };
  });

  return {
    id: 'hyderabad_real',
    name: 'Hyderabad Cyberabad & IT Corridor (Real Map)',
    country: 'India (Telangana)',
    center: [17.4100, 78.4500],
    zoom: 12,
    description: 'Hyderabad road network: Nehru Outer Ring Road (ORR), PVNR Expressway, Durgam Cheruvu Cable Bridge, HITEC City, Gachibowli Financial District, and RGIA Airport logistics.',
    nodes, edges,
    adjacency: buildAdjacencyMap(edges),
    bounds: { minX: 50, maxX: 950, minY: 50, maxY: 950 },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CHENNAI METROPOLITAN & PORT CORRIDOR REAL MAP
// ─────────────────────────────────────────────────────────────────────────────
export function generateChennaiRealGraph(): CityGraph {
  const nodes: GraphNode[] = [
    // Depots
    { id: 'chn_depot_port', name: 'Chennai Port Trust Harbour Logistics Hub', x: 780, y: 180, lat: 13.0900, lng: 80.2980, type: 'depot', demand: 0 },
    { id: 'chn_depot_airport', name: 'Meenambakkam Airport Cargo Gateway', x: 260, y: 720, lat: 12.9850, lng: 80.1650, type: 'depot', demand: 0 },
    { id: 'chn_depot_sriperumbudur', name: 'Sriperumbudur Auto Industrial Corridor', x: 100, y: 760, lat: 12.9650, lng: 79.9450, type: 'depot', demand: 0 },

    // Hospitals
    { id: 'chn_hosp_apollo', name: 'Apollo Hospitals Greams Road', x: 560, y: 410, lat: 13.0600, lng: 80.2520, type: 'hospital', demand: 210, priority: 5, timeWindow: { start: 20, end: 100, serviceDuration: 20 } },
    { id: 'chn_hosp_rgggh', name: 'Rajiv Gandhi Govt General Hospital (RGGGH)', x: 680, y: 240, lat: 13.0800, lng: 80.2780, type: 'hospital', demand: 230, priority: 5, timeWindow: { start: 25, end: 110, serviceDuration: 22 } },
    { id: 'chn_hosp_malar', name: 'Fortis Malar Hospital Adyar', x: 580, y: 640, lat: 13.0060, lng: 80.2580, type: 'hospital', demand: 175, priority: 5, timeWindow: { start: 30, end: 120, serviceDuration: 18 } },

    // Commercial & Tech Nodes
    { id: 'chn_omr', name: 'OMR IT Expressway Silicon Corridor', x: 500, y: 840, lat: 12.9300, lng: 80.2310, type: 'customer', demand: 225, timeWindow: { start: 30, end: 95, serviceDuration: 15 } },
    { id: 'chn_guindy', name: 'Guindy Kathipara Industrial Interchange', x: 420, y: 620, lat: 13.0080, lng: 80.2050, type: 'customer', demand: 195, timeWindow: { start: 35, end: 110, serviceDuration: 14 } },
    { id: 'chn_tnagar', name: 'T. Nagar Commercial & Retail CBD', x: 500, y: 480, lat: 13.0400, lng: 80.2330, type: 'customer', demand: 240, timeWindow: { start: 25, end: 90, serviceDuration: 16 } },
    { id: 'chn_annanagar', name: 'Anna Nagar West Commercial Hub', x: 390, y: 220, lat: 13.0850, lng: 80.2100, type: 'customer', demand: 165, timeWindow: { start: 40, end: 120, serviceDuration: 12 } },
    { id: 'chn_koyambedu', name: 'Koyambedu Wholesale Market Complex', x: 340, y: 340, lat: 13.0700, lng: 80.1920, type: 'customer', demand: 250, timeWindow: { start: 30, end: 105, serviceDuration: 16 } },
    { id: 'chn_mylapore', name: 'Mylapore Marina Coastal Zone', x: 620, y: 520, lat: 13.0360, lng: 80.2670, type: 'customer', demand: 140, timeWindow: { start: 45, end: 130, serviceDuration: 12 } },
    { id: 'chn_velachery', name: 'Velachery Tech & Transit Hub', x: 460, y: 720, lat: 12.9780, lng: 80.2180, type: 'customer', demand: 160, timeWindow: { start: 35, end: 115, serviceDuration: 13 } },
  ];

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  interface RawEdgeDef {
    src: string;
    tgt: string;
    speed: number;
    cong: number;
    waypoints?: [number, number][];
  }

  const rawEdges: RawEdgeDef[] = [
    // Port to RGGGH Hospital via Rajaji Salai
    {
      src: 'chn_depot_port', tgt: 'chn_hosp_rgggh', speed: 45, cong: 2.1,
      waypoints: [[13.0900, 80.2980], [13.0850, 80.2880], [13.0800, 80.2780]],
    },
    // RGGGH to Apollo Greams Road via Anna Salai
    {
      src: 'chn_hosp_rgggh', tgt: 'chn_hosp_apollo', speed: 40, cong: 2.5,
      waypoints: [[13.0800, 80.2780], [13.0700, 80.2650], [13.0600, 80.2520]],
    },
    // Apollo Hospital to T. Nagar via GN Chetty Road
    {
      src: 'chn_hosp_apollo', tgt: 'chn_tnagar', speed: 35, cong: 2.6,
      waypoints: [[13.0600, 80.2520], [13.0500, 80.2420], [13.0400, 80.2330]],
    },
    // T. Nagar to Mylapore via Eldams Road
    {
      src: 'chn_tnagar', tgt: 'chn_mylapore', speed: 35, cong: 2.2,
      waypoints: [[13.0400, 80.2330], [13.0380, 80.2500], [13.0360, 80.2670]],
    },
    // Mylapore to Fortis Malar Hospital Adyar (Coastline & Adyar Bridge)
    {
      src: 'chn_mylapore', tgt: 'chn_hosp_malar', speed: 45, cong: 1.8,
      waypoints: [[13.0360, 80.2670], [13.0180, 80.2650], [13.0060, 80.2580]],
    },
    // Fortis Malar to OMR IT Expressway
    {
      src: 'chn_hosp_malar', tgt: 'chn_omr', speed: 50, cong: 2.0,
      waypoints: [[13.0060, 80.2580], [12.9750, 80.2480], [12.9300, 80.2310]],
    },
    // OMR to Velachery via SRP Tools junction
    {
      src: 'chn_omr', tgt: 'chn_velachery', speed: 45, cong: 2.2,
      waypoints: [[12.9300, 80.2310], [12.9550, 80.2250], [12.9780, 80.2180]],
    },
    // Velachery to Guindy Kathipara
    {
      src: 'chn_velachery', tgt: 'chn_guindy', speed: 50, cong: 2.3,
      waypoints: [[12.9780, 80.2180], [12.9950, 80.2100], [13.0080, 80.2050]],
    },
    // Guindy Kathipara to Meenambakkam Airport (GST Road)
    {
      src: 'chn_guindy', tgt: 'chn_depot_airport', speed: 65, cong: 1.8,
      waypoints: [[13.0080, 80.2050], [12.9980, 80.1850], [12.9850, 80.1650]],
    },
    // Airport to Sriperumbudur Auto Hub via NH-48
    {
      src: 'chn_depot_airport', tgt: 'chn_depot_sriperumbudur', speed: 75, cong: 1.4,
      waypoints: [[12.9850, 80.1650], [12.9750, 80.0500], [12.9650, 79.9450]],
    },
    // Sriperumbudur to Koyambedu via Chennai Bypass
    {
      src: 'chn_depot_sriperumbudur', tgt: 'chn_koyambedu', speed: 70, cong: 1.6,
      waypoints: [[12.9650, 79.9450], [13.0300, 80.1000], [13.0700, 80.1920]],
    },
    // Koyambedu to Anna Nagar West
    {
      src: 'chn_koyambedu', tgt: 'chn_annanagar', speed: 45, cong: 2.4,
      waypoints: [[13.0700, 80.1920], [13.0800, 78.2000], [13.0850, 80.2100]],
    },
    // Anna Nagar to RGGGH Central
    {
      src: 'chn_annanagar', tgt: 'chn_hosp_rgggh', speed: 40, cong: 2.3,
      waypoints: [[13.0850, 80.2100], [13.0820, 80.2450], [13.0800, 80.2780]],
    },
    // Koyambedu to T. Nagar
    {
      src: 'chn_koyambedu', tgt: 'chn_tnagar', speed: 40, cong: 2.5,
      waypoints: [[13.0700, 80.1920], [13.0550, 80.2150], [13.0400, 80.2330]],
    },
  ];

  const edges: GraphEdge[] = rawEdges.map((raw, idx) => {
    const n1 = nodeMap.get(raw.src)!;
    const n2 = nodeMap.get(raw.tgt)!;
    const dist = haversineDistanceKm(n1.lat, n1.lng, n2.lat, n2.lng);
    const points: [number, number][] = raw.waypoints ?? [[n1.lat, n1.lng], [n2.lat, n2.lng]];
    return {
      id: `edge_chn_${idx}`,
      source: raw.src,
      target: raw.tgt,
      lengthKm: dist,
      baseSpeedKmh: raw.speed,
      currentSpeedKmh: Math.max(8, Math.round(raw.speed / raw.cong)),
      congestionFactor: raw.cong,
      capacityVehiclesPerHour: 2000,
      currentFlow: Math.round(raw.cong * 450),
      geoPoints: points,
    };
  });

  return {
    id: 'chennai_real',
    name: 'Chennai Metropolitan & Port Corridor (Real Map)',
    country: 'India (Tamil Nadu)',
    center: [13.0400, 80.2300],
    zoom: 12,
    description: 'Chennai road network: OMR IT Expressway, Kathipara Flyover, GST Road, Chennai Port Trust, Sriperumbudur Auto Hub, and Marina coastline corridor.',
    nodes, edges,
    adjacency: buildAdjacencyMap(edges),
    bounds: { minX: 50, maxX: 950, minY: 50, maxY: 950 },
  };
}

export const PRESET_MAPS: Record<string, () => CityGraph> = {
  'mumbai_real': generateMumbaiRealGraph,
  'delhi_real': generateDelhiRealGraph,
  'bengaluru_real': generateBengaluruRealGraph,
  'hyderabad_real': generateHyderabadRealGraph,
  'chennai_real': generateChennaiRealGraph,
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. MUMBAI METROPOLITAN REAL MAP
// ─────────────────────────────────────────────────────────────────────────────
export function generateMumbaiRealGraph(): CityGraph {
  const nodes: GraphNode[] = [
    // Depots
    { id: 'mum_depot_nhava', name: 'Nhava Sheva JNPT Port Logistics Hub', x: 820, y: 820, lat: 18.9490, lng: 72.9480, type: 'depot', demand: 0 },
    { id: 'mum_depot_bkc', name: 'Bandra Kurla Complex Central Depot', x: 460, y: 420, lat: 19.0650, lng: 72.8650, type: 'depot', demand: 0 },
    { id: 'mum_depot_thane', name: 'Thane Industrial Logistics Park', x: 750, y: 180, lat: 19.2183, lng: 72.9781, type: 'depot', demand: 0 },

    // Hospitals
    { id: 'mum_hosp_kem', name: 'KEM Hospital & Research Centre', x: 340, y: 520, lat: 19.0000, lng: 72.8400, type: 'hospital', demand: 200, priority: 5, timeWindow: { start: 20, end: 110, serviceDuration: 20 } },
    { id: 'mum_hosp_lilavati', name: 'Lilavati Hospital Bandra', x: 360, y: 380, lat: 19.0515, lng: 72.8260, type: 'hospital', demand: 160, priority: 5, timeWindow: { start: 30, end: 120, serviceDuration: 18 } },

    // Commercial & Delivery Nodes
    { id: 'mum_nariman', name: 'Nariman Point Financial District', x: 260, y: 680, lat: 18.9256, lng: 72.8242, type: 'customer', demand: 180, timeWindow: { start: 25, end: 90, serviceDuration: 15 } },
    { id: 'mum_churchgate', name: 'Churchgate Station & Fort Area', x: 280, y: 620, lat: 18.9353, lng: 72.8265, type: 'customer', demand: 150, timeWindow: { start: 30, end: 100, serviceDuration: 14 } },
    { id: 'mum_dharavi', name: 'Dharavi Industrial Production Hub', x: 430, y: 490, lat: 19.0410, lng: 72.8540, type: 'customer', demand: 240, timeWindow: { start: 35, end: 115, serviceDuration: 16 } },
    { id: 'mum_worli', name: 'Worli Sea Link Trade District', x: 310, y: 510, lat: 19.0150, lng: 72.8155, type: 'customer', demand: 130, timeWindow: { start: 40, end: 120, serviceDuration: 12 } },
    { id: 'mum_andheri', name: 'Andheri East MIDC Industrial Zone', x: 430, y: 280, lat: 19.1136, lng: 72.8697, type: 'customer', demand: 210, timeWindow: { start: 30, end: 100, serviceDuration: 15 } },
    { id: 'mum_dadar', name: 'Dadar Central Hub & Wholesale Market', x: 370, y: 490, lat: 19.0200, lng: 72.8430, type: 'customer', demand: 175, timeWindow: { start: 40, end: 130, serviceDuration: 14 } },
    { id: 'mum_kurla', name: 'Kurla LBS Road Logistics Corridor', x: 530, y: 420, lat: 19.0726, lng: 72.8800, type: 'customer', demand: 195, timeWindow: { start: 30, end: 105, serviceDuration: 14 } },
    { id: 'mum_powai', name: 'Powai SEEPZ Tech & Export Park', x: 580, y: 300, lat: 19.1176, lng: 72.9060, type: 'customer', demand: 140, timeWindow: { start: 45, end: 130, serviceDuration: 12 } },
    { id: 'mum_vashi', name: 'Vashi Navi Mumbai CBD', x: 680, y: 620, lat: 19.0752, lng: 73.0000, type: 'customer', demand: 160, timeWindow: { start: 35, end: 115, serviceDuration: 13 } },
    { id: 'mum_borivali', name: 'Borivali West Logistics Hub', x: 310, y: 160, lat: 19.2310, lng: 72.8570, type: 'customer', demand: 125, timeWindow: { start: 50, end: 145, serviceDuration: 12 } },
  ];

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Edge definitions with realistic GPS waypoints along real road corridors & bridges
  interface RawEdgeDef {
    src: string;
    tgt: string;
    speed: number;
    cong: number;
    waypoints?: [number, number][];
  }

  const rawEdges: RawEdgeDef[] = [
    // Ghodbunder Road around national park / Vasai Creek
    {
      src: 'mum_depot_thane', tgt: 'mum_borivali', speed: 80, cong: 1.8,
      waypoints: [[19.2183, 72.9781], [19.2680, 72.9550], [19.2790, 72.9100], [19.2600, 72.8750], [19.2310, 72.8570]],
    },
    // Western Express Highway
    {
      src: 'mum_borivali', tgt: 'mum_andheri', speed: 70, cong: 2.1,
      waypoints: [[19.2310, 72.8570], [19.1900, 72.8550], [19.1550, 72.8600], [19.1136, 72.8697]],
    },
    // WEH from Andheri to BKC
    {
      src: 'mum_andheri', tgt: 'mum_depot_bkc', speed: 65, cong: 2.4,
      waypoints: [[19.1136, 72.8697], [19.0880, 72.8520], [19.0650, 72.8650]],
    },
    // BKC to Worli via Dharavi / Bandra connection
    {
      src: 'mum_depot_bkc', tgt: 'mum_worli', speed: 55, cong: 2.2,
      waypoints: [[19.0650, 72.8650], [19.0480, 72.8450], [19.0250, 72.8250], [19.0150, 72.8155]],
    },
    // Worli to Churchgate via Haji Ali, Pedder Rd & Marine Drive (on land)
    {
      src: 'mum_worli', tgt: 'mum_churchgate', speed: 40, cong: 2.5,
      waypoints: [[19.0150, 72.8155], [18.9880, 72.8150], [18.9680, 72.8110], [18.9500, 72.8200], [18.9353, 72.8265]],
    },
    // Churchgate to Nariman Point via Madame Cama Road
    {
      src: 'mum_churchgate', tgt: 'mum_nariman', speed: 35, cong: 2.0,
      waypoints: [[18.9353, 72.8265], [18.9290, 72.8250], [18.9256, 72.8242]],
    },
    // Nhava Sheva to Vashi via Palm Beach Road & Belapur (Navi Mumbai mainland)
    {
      src: 'mum_depot_nhava', tgt: 'mum_vashi', speed: 70, cong: 1.4,
      waypoints: [
        [18.9490, 72.9480],
        [18.9680, 72.9650],
        [18.9950, 73.0000],
        [19.0200, 73.0250],
        [19.0500, 73.0150],
        [19.0752, 73.0000],
      ],
    },
    // Vashi to Kurla via VASHI BRIDGE (Thane Creek Bridge) & Sion-Panvel Expy
    {
      src: 'mum_vashi', tgt: 'mum_kurla', speed: 60, cong: 1.8,
      waypoints: [
        [19.0752, 73.0000],
        [19.0660, 72.9820],
        [19.0570, 72.9550],
        [19.0520, 72.9300],
        [19.0550, 72.9050],
        [19.0726, 72.8800],
      ],
    },
    // Kurla to BKC
    {
      src: 'mum_kurla', tgt: 'mum_depot_bkc', speed: 55, cong: 2.0,
      waypoints: [[19.0726, 72.8800], [19.0680, 72.8720], [19.0650, 72.8650]],
    },
    // Nhava Sheva to KEM Parel via ATAL SETU (MTHL - Mumbai Trans Harbour Link)
    {
      src: 'mum_depot_nhava', tgt: 'mum_hosp_kem', speed: 75, cong: 1.6,
      waypoints: [
        [18.9490, 72.9480], // Nhava Sheva JNPT Port Hub
        [18.9680, 72.9580], // JNPT North approach
        [18.9890, 72.9550], // MTHL Mainland Landing / Shivaji Nagar Interchange
        [19.0040, 72.9380], // MTHL East Marine Section (north of Elephanta Island)
        [19.0075, 72.9100], // MTHL Main Navigation Channel
        [19.0060, 72.8850], // MTHL West Marine Span
        [19.0035, 72.8680], // Sewri MTHL Interchange
        [19.0015, 72.8550], // Sewri Station Road
        [19.0000, 72.8400], // KEM Hospital Parel
      ],
    },
    // Dadar to Dharavi
    {
      src: 'mum_dadar', tgt: 'mum_dharavi', speed: 45, cong: 2.3,
      waypoints: [[19.0200, 72.8430], [19.0320, 72.8480], [19.0410, 72.8540]],
    },
    // Dharavi to Kurla
    {
      src: 'mum_dharavi', tgt: 'mum_kurla', speed: 50, cong: 2.0,
      waypoints: [[19.0410, 72.8540], [19.0550, 72.8680], [19.0726, 72.8800]],
    },
    // Dadar to Worli
    {
      src: 'mum_dadar', tgt: 'mum_worli', speed: 45, cong: 2.4,
      waypoints: [[19.0200, 72.8430], [19.0180, 72.8280], [19.0150, 72.8155]],
    },
    // Dadar to KEM Hospital
    {
      src: 'mum_dadar', tgt: 'mum_hosp_kem', speed: 35, cong: 2.1,
      waypoints: [[19.0200, 72.8430], [19.0100, 72.8410], [19.0000, 72.8400]],
    },
    // KEM Hospital to Churchgate via Dr Ambedkar Rd & JJ Flyover
    {
      src: 'mum_hosp_kem', tgt: 'mum_churchgate', speed: 40, cong: 2.3,
      waypoints: [[19.0000, 72.8400], [18.9680, 72.8360], [18.9450, 72.8330], [18.9353, 72.8265]],
    },
    // Lilavati Bandra to BKC
    {
      src: 'mum_hosp_lilavati', tgt: 'mum_depot_bkc', speed: 40, cong: 1.8,
      waypoints: [[19.0515, 72.8260], [19.0570, 72.8450], [19.0650, 72.8650]],
    },
    // Lilavati Bandra to Worli via BANDRA-WORLI SEA LINK
    {
      src: 'mum_hosp_lilavati', tgt: 'mum_worli', speed: 65, cong: 1.5,
      waypoints: [[19.0515, 72.8260], [19.0430, 72.8190], [19.0300, 72.8130], [19.0180, 72.8150], [19.0150, 72.8155]],
    },
    // Andheri to Powai (JVLR - Jogeshwari Vikhroli Link Road)
    {
      src: 'mum_andheri', tgt: 'mum_powai', speed: 50, cong: 1.6,
      waypoints: [[19.1136, 72.8697], [19.1180, 72.8880], [19.1176, 72.9060]],
    },
    // Powai to Thane via Eastern Express Highway
    {
      src: 'mum_powai', tgt: 'mum_depot_thane', speed: 55, cong: 1.4,
      waypoints: [[19.1176, 72.9060], [19.1450, 72.9300], [19.1800, 72.9550], [19.2183, 72.9781]],
    },
    // Powai to Kurla via LBS Marg
    {
      src: 'mum_powai', tgt: 'mum_kurla', speed: 45, cong: 1.9,
      waypoints: [[19.1176, 72.9060], [19.0950, 72.8920], [19.0726, 72.8800]],
    },
  ];

  const edges: GraphEdge[] = rawEdges.map((raw, idx) => {
    const n1 = nodeMap.get(raw.src)!;
    const n2 = nodeMap.get(raw.tgt)!;
    const dist = haversineDistanceKm(n1.lat, n1.lng, n2.lat, n2.lng);
    const points: [number, number][] = raw.waypoints ?? [[n1.lat, n1.lng], [n2.lat, n2.lng]];
    return {
      id: `edge_mum_${idx}`,
      source: raw.src,
      target: raw.tgt,
      lengthKm: dist,
      baseSpeedKmh: raw.speed,
      currentSpeedKmh: Math.max(8, Math.round(raw.speed / raw.cong)),
      congestionFactor: raw.cong,
      capacityVehiclesPerHour: 1800,
      currentFlow: Math.round(raw.cong * 450),
      geoPoints: points,
    };
  });

  return {
    id: 'mumbai_real',
    name: 'Mumbai Metropolitan Region (Real Map)',
    country: 'India (Maharashtra)',
    center: [19.0760, 72.8777],
    zoom: 12,
    description: 'Mumbai road network: Western Express Highway, Atal Setu (MTHL), Bandra-Worli Sea Link, Vashi Bridge, Eastern Freeway, BKC financial hub, and JNPT port.',
    nodes, edges,
    adjacency: buildAdjacencyMap(edges),
    bounds: { minX: 50, maxX: 950, minY: 50, maxY: 950 },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. DELHI NCR REAL MAP
// ─────────────────────────────────────────────────────────────────────────────
export function generateDelhiRealGraph(): CityGraph {
  const nodes: GraphNode[] = [
    { id: 'del_depot_igi', name: 'IGI Airport Cargo & Logistics Terminal', x: 220, y: 600, lat: 28.5562, lng: 77.1000, type: 'depot', demand: 0 },
    { id: 'del_depot_okhla', name: 'Okhla Industrial Phase II Hub', x: 560, y: 680, lat: 28.5355, lng: 77.2790, type: 'depot', demand: 0 },
    { id: 'del_depot_gurgaon', name: 'Gurgaon NH-48 Freight Corridor', x: 120, y: 760, lat: 28.4595, lng: 77.0266, type: 'depot', demand: 0 },
    { id: 'del_hosp_aiims', name: 'AIIMS New Delhi Premier Medical Centre', x: 380, y: 560, lat: 28.5672, lng: 77.2100, type: 'hospital', demand: 220, priority: 5, timeWindow: { start: 20, end: 100, serviceDuration: 22 } },
    { id: 'del_hosp_safdarjung', name: 'Safdarjung Hospital Emergency Wing', x: 330, y: 530, lat: 28.5688, lng: 77.2000, type: 'hospital', demand: 180, priority: 5, timeWindow: { start: 25, end: 110, serviceDuration: 18 } },
    { id: 'del_cp', name: 'Connaught Place Central Business District', x: 440, y: 360, lat: 28.6329, lng: 77.2195, type: 'customer', demand: 200, timeWindow: { start: 30, end: 90, serviceDuration: 15 } },
    { id: 'del_karolbagh', name: 'Karol Bagh Wholesale Market District', x: 380, y: 330, lat: 28.6514, lng: 77.1907, type: 'customer', demand: 240, timeWindow: { start: 35, end: 120, serviceDuration: 16 } },
    { id: 'del_nehru_place', name: 'Nehru Place IT & Electronics Hub', x: 530, y: 620, lat: 28.5491, lng: 77.2512, type: 'customer', demand: 170, timeWindow: { start: 35, end: 110, serviceDuration: 14 } },
    { id: 'del_lajpat', name: 'Lajpat Nagar Market & Retail Zone', x: 500, y: 570, lat: 28.5700, lng: 77.2430, type: 'customer', demand: 145, timeWindow: { start: 40, end: 120, serviceDuration: 12 } },
    { id: 'del_saket', name: 'Saket Select CityWalk Mall Hub', x: 440, y: 640, lat: 28.5245, lng: 77.2152, type: 'customer', demand: 155, timeWindow: { start: 45, end: 130, serviceDuration: 13 } },
    { id: 'del_rohini', name: 'Rohini Sector-10 Residential & Commerce', x: 310, y: 200, lat: 28.7041, lng: 77.1025, type: 'customer', demand: 190, timeWindow: { start: 30, end: 100, serviceDuration: 14 } },
    { id: 'del_noida', name: 'Noida Sector 62 Tech Park', x: 720, y: 480, lat: 28.6262, lng: 77.3650, type: 'customer', demand: 185, timeWindow: { start: 35, end: 115, serviceDuration: 14 } },
    { id: 'del_dwarka', name: 'Dwarka Sector-10 Logistics Node', x: 160, y: 660, lat: 28.5921, lng: 77.0460, type: 'customer', demand: 140, timeWindow: { start: 40, end: 120, serviceDuration: 12 } },
    { id: 'del_faridabad', name: 'Faridabad IMT Industrial Township', x: 620, y: 810, lat: 28.4089, lng: 77.3178, type: 'customer', demand: 210, timeWindow: { start: 30, end: 105, serviceDuration: 15 } },
  ];

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const rawEdges: Array<[string, string, number, number]> = [
    ['del_depot_igi', 'del_dwarka', 65, 1.5],
    ['del_dwarka', 'del_depot_gurgaon', 60, 1.4],
    ['del_depot_igi', 'del_hosp_aiims', 55, 2.0],
    ['del_hosp_aiims', 'del_hosp_safdarjung', 30, 1.8],
    ['del_hosp_safdarjung', 'del_cp', 50, 2.4],
    ['del_cp', 'del_karolbagh', 40, 2.8],
    ['del_karolbagh', 'del_rohini', 60, 2.0],
    ['del_cp', 'del_lajpat', 45, 2.3],
    ['del_lajpat', 'del_nehru_place', 40, 2.0],
    ['del_nehru_place', 'del_depot_okhla', 35, 1.8],
    ['del_depot_okhla', 'del_faridabad', 55, 1.5],
    ['del_nehru_place', 'del_saket', 40, 2.1],
    ['del_saket', 'del_depot_igi', 50, 1.8],
    ['del_hosp_aiims', 'del_saket', 45, 2.0],
    ['del_depot_okhla', 'del_noida', 65, 1.7],
    ['del_noida', 'del_cp', 55, 2.2],
    ['del_noida', 'del_faridabad', 60, 1.4],
    ['del_depot_gurgaon', 'del_saket', 55, 1.9],
  ];

  const edges: GraphEdge[] = rawEdges.map(([src, tgt, speed, cong], idx) => {
    const n1 = nodeMap.get(src)!;
    const n2 = nodeMap.get(tgt)!;
    const dist = haversineDistanceKm(n1.lat, n1.lng, n2.lat, n2.lng);
    return {
      id: `edge_del_${idx}`,
      source: src, target: tgt,
      lengthKm: dist,
      baseSpeedKmh: speed,
      currentSpeedKmh: Math.max(8, Math.round(speed / cong)),
      congestionFactor: cong,
      capacityVehiclesPerHour: 2200,
      currentFlow: Math.round(cong * 550),
      geoPoints: [[n1.lat, n1.lng], [n2.lat, n2.lng]],
    };
  });

  return {
    id: 'delhi_real',
    name: 'Delhi NCR Metro Region (Real Map)',
    country: 'India (Delhi / NCR)',
    center: [28.6139, 77.2090],
    zoom: 11,
    description: 'National Capital Region: IGI Airport NH-48, Connaught Place CBD, AIIMS medical hub, Noida DND Flyway, Gurgaon expressway, Ring Road, and Faridabad industrial township.',
    nodes, edges,
    adjacency: buildAdjacencyMap(edges),
    bounds: { minX: 50, maxX: 950, minY: 50, maxY: 950 },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. BENGALURU REAL MAP
// ─────────────────────────────────────────────────────────────────────────────
export function generateBengaluruRealGraph(): CityGraph {
  const nodes: GraphNode[] = [
    { id: 'blr_depot_kia', name: 'Kempegowda International Airport Cargo', x: 280, y: 100, lat: 13.1986, lng: 77.7066, type: 'depot', demand: 0 },
    { id: 'blr_depot_peenya', name: 'Peenya Industrial Area Logistics Hub', x: 220, y: 330, lat: 13.0280, lng: 77.5200, type: 'depot', demand: 0 },
    { id: 'blr_depot_whitefield', name: 'Whitefield ITPL Export Hub', x: 760, y: 420, lat: 12.9698, lng: 77.7500, type: 'depot', demand: 0 },
    { id: 'blr_hosp_nimhans', name: 'NIMHANS National Institute', x: 430, y: 580, lat: 12.9427, lng: 77.5948, type: 'hospital', demand: 175, priority: 5, timeWindow: { start: 20, end: 100, serviceDuration: 18 } },
    { id: 'blr_hosp_victoria', name: 'Victoria Hospital Government Medical Centre', x: 390, y: 440, lat: 12.9731, lng: 77.5706, type: 'hospital', demand: 200, priority: 5, timeWindow: { start: 25, end: 110, serviceDuration: 20 } },
    { id: 'blr_mg_road', name: 'MG Road Central Business & Retail', x: 490, y: 400, lat: 12.9758, lng: 77.6095, type: 'customer', demand: 165, timeWindow: { start: 30, end: 95, serviceDuration: 14 } },
    { id: 'blr_koramangala', name: 'Koramangala Startup & Tech Village', x: 520, y: 530, lat: 12.9352, lng: 77.6245, type: 'customer', demand: 155, timeWindow: { start: 35, end: 110, serviceDuration: 13 } },
    { id: 'blr_electronic_city', name: 'Electronic City Phase II IT Campus', x: 480, y: 720, lat: 12.8399, lng: 77.6770, type: 'customer', demand: 190, timeWindow: { start: 30, end: 100, serviceDuration: 15 } },
    { id: 'blr_indiranagar', name: 'Indiranagar 100-ft Road Commercial', x: 580, y: 370, lat: 12.9784, lng: 77.6408, type: 'customer', demand: 130, timeWindow: { start: 40, end: 120, serviceDuration: 12 } },
    { id: 'blr_hebbal', name: 'Hebbal Flyover & Outer Ring Road Hub', x: 400, y: 220, lat: 13.0350, lng: 77.5970, type: 'customer', demand: 145, timeWindow: { start: 35, end: 105, serviceDuration: 12 } },
    { id: 'blr_bannerghatta', name: 'Bannerghatta Road Tech Corridor', x: 400, y: 680, lat: 12.8911, lng: 77.5970, type: 'customer', demand: 120, timeWindow: { start: 45, end: 135, serviceDuration: 11 } },
    { id: 'blr_yelahanka', name: 'Yelahanka New Town DRDO District', x: 340, y: 180, lat: 13.1005, lng: 77.5963, type: 'customer', demand: 105, timeWindow: { start: 50, end: 140, serviceDuration: 11 } },
    { id: 'blr_kr_market', name: 'K.R. Market Wholesale & Cold Chain', x: 390, y: 470, lat: 12.9637, lng: 77.5784, type: 'customer', demand: 230, timeWindow: { start: 25, end: 85, serviceDuration: 16 } },
    { id: 'blr_hsr', name: 'HSR Layout Sector-2 Tech Hub', x: 520, y: 610, lat: 12.9116, lng: 77.6474, type: 'customer', demand: 135, timeWindow: { start: 40, end: 115, serviceDuration: 12 } },
  ];

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const rawEdges: Array<[string, string, number, number]> = [
    ['blr_depot_kia', 'blr_yelahanka', 70, 1.4],
    ['blr_yelahanka', 'blr_hebbal', 65, 1.7],
    ['blr_hebbal', 'blr_depot_peenya', 60, 2.0],
    ['blr_hebbal', 'blr_mg_road', 55, 2.3],
    ['blr_depot_peenya', 'blr_hosp_victoria', 55, 2.1],
    ['blr_hosp_victoria', 'blr_kr_market', 30, 2.5],
    ['blr_kr_market', 'blr_mg_road', 35, 2.8],
    ['blr_mg_road', 'blr_indiranagar', 40, 2.4],
    ['blr_indiranagar', 'blr_depot_whitefield', 60, 1.9],
    ['blr_hosp_nimhans', 'blr_koramangala', 40, 2.2],
    ['blr_koramangala', 'blr_electronic_city', 55, 1.8],
    ['blr_koramangala', 'blr_hsr', 35, 2.0],
    ['blr_hsr', 'blr_electronic_city', 40, 1.7],
    ['blr_hsr', 'blr_bannerghatta', 45, 1.6],
    ['blr_bannerghatta', 'blr_hosp_nimhans', 40, 1.8],
    ['blr_mg_road', 'blr_koramangala', 45, 2.3],
    ['blr_hosp_victoria', 'blr_hosp_nimhans', 40, 1.9],
    ['blr_depot_whitefield', 'blr_koramangala', 55, 2.0],
    ['blr_electronic_city', 'blr_depot_whitefield', 60, 1.6],
  ];

  const edges: GraphEdge[] = rawEdges.map(([src, tgt, speed, cong], idx) => {
    const n1 = nodeMap.get(src)!;
    const n2 = nodeMap.get(tgt)!;
    const dist = haversineDistanceKm(n1.lat, n1.lng, n2.lat, n2.lng);
    return {
      id: `edge_blr_${idx}`,
      source: src, target: tgt,
      lengthKm: dist,
      baseSpeedKmh: speed,
      currentSpeedKmh: Math.max(8, Math.round(speed / cong)),
      congestionFactor: cong,
      capacityVehiclesPerHour: 1600,
      currentFlow: Math.round(cong * 400),
      geoPoints: [[n1.lat, n1.lng], [n2.lat, n2.lng]],
    };
  });

  return {
    id: 'bengaluru_real',
    name: 'Bengaluru Silicon Valley (Real Map)',
    country: 'India (Karnataka)',
    center: [12.9716, 77.5946],
    zoom: 12,
    description: 'Bengaluru road network: KIA Airport NH-44, Peenya industrial, MG Road CBD, Koramangala/HSR startup belt, Electronic City IT campus, Outer Ring Road, and Whitefield ITPL export zone.',
    nodes, edges,
    adjacency: buildAdjacencyMap(edges),
    bounds: { minX: 50, maxX: 950, minY: 50, maxY: 950 },
  };
}

