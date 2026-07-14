import { db, DBIncident, DBCriticalAsset, DBOperationalNews } from './db';

// High-fidelity Initial Operational Telemetry Seed
// Encompasses Bangladesh fault hinges, delta waterways, and critical maritime lanes

const seedIncidents: DBIncident[] = [
  {
    id: 'inc-1',
    type: 'hazard',
    title: 'Surma River Embankment Spillover',
    category: 'Weather/Cyclone/Flood',
    severity: 'critical',
    description: 'Flash flooding reported in Sylhet basin. Water level exceeded the red mark by 45cm near Kanairghat spillway. Heavy transboundary rainfall is fueling active embankment erosion.',
    lat: 25.0,
    lng: 92.25,
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'inc-2',
    type: 'incident',
    title: 'Benapole Port Logistics Jam',
    category: 'Border Monitoring',
    severity: 'warning',
    description: 'Customs database delay at Benapole dry port border interface. Intermittent transboundary truck queues reported along the main cargo corridor.',
    lat: 23.04,
    lng: 88.89,
    timestamp: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'inc-3',
    type: 'patrol',
    title: 'BNS Shadhinota Patrol Corridor',
    category: 'Maritime/Port',
    severity: 'nominal',
    description: 'Exclusive Economic Zone surveillance mission. Transponder sweeps confirmed sea lanes are nominal along southern shipping corridors.',
    lat: 21.0,
    lng: 90.5,
    timestamp: new Date().toISOString(),
  },
  {
    id: 'inc-4',
    type: 'hazard',
    title: 'Rangpur Seismic Tremor Detection',
    category: 'Weather/Cyclone/Flood',
    severity: 'warning',
    description: 'Magnitude 4.8 tremor logged along the Dauki tectonic hinge. No immediate reports of severe infrastructure damage. Ground stability metrics returned to baseline.',
    lat: 25.75,
    lng: 89.25,
    timestamp: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'inc-5',
    type: 'incident',
    title: 'Mongla Port Terminal Congestion',
    category: 'Maritime/Port',
    severity: 'nominal',
    description: 'High-density cargo vessel offloading. Port capacity remains nominal at 85% efficiency. Vessel traffic routing active.',
    lat: 22.48,
    lng: 89.6,
    timestamp: new Date(Date.now() - 4500000).toISOString(),
  }
];

const seedAssets: DBCriticalAsset[] = [
  {
    id: 'asset-1',
    name: 'Padma Multipurpose Bridge Node',
    category: 'Bridge',
    lat: 23.4795,
    lng: 90.2592,
    status: 'operational',
    capacityValue: 'Full structural load active',
  },
  {
    id: 'asset-2',
    name: 'Kaptai Hydroelectric Power Plant',
    category: 'Power Grid',
    lat: 22.4939,
    lng: 92.2267,
    status: 'alert',
    capacityValue: 'Water discharge at 92%',
  },
  {
    id: 'asset-3',
    name: 'Chittagong International Seaport',
    category: 'Port',
    lat: 22.3167,
    lng: 91.8014,
    status: 'operational',
    capacityValue: '3,200 TEUs container rate',
  },
  {
    id: 'asset-4',
    name: 'Dhaka Command Central Hospital',
    category: 'Hospital',
    lat: 23.7915,
    lng: 90.4125,
    status: 'operational',
    capacityValue: 'Emergency capacity 45% free',
  },
  {
    id: 'asset-5',
    name: 'Sylhet Gateway Telecom Base Station',
    category: 'Telecom Node',
    lat: 24.8949,
    lng: 91.8687,
    status: 'damaged',
    capacityValue: 'Backup power generator running',
  }
];

const seedNews: DBOperationalNews[] = [
  {
    id: 'news-1',
    source: 'GDELT Project',
    title: 'Transboundary river flow negotiations finalized between regional water boards',
    category: 'hydrology',
    timestamp: new Date(Date.now() - 1200000).toISOString(),
    impact: 'medium',
    summary: 'Water level discharge thresholds re-calibrated near northern Teesta barrage infrastructure.',
    url: 'https://gdeltproject.org',
  },
  {
    id: 'news-2',
    source: 'Dhaka Tribune',
    title: 'Chittagong port initiates high-readiness storm response directives',
    category: 'maritime',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    impact: 'high',
    summary: 'Coast guard deploy secondary assets to safeguard deep-water anchorage channels.',
    url: 'https://dhakatribune.com',
  },
  {
    id: 'news-3',
    source: 'South Asia Defence Monitor',
    title: 'Borders surveillance suites upgraded with multi-sensor tactical radar logs',
    category: 'geopolitics',
    timestamp: new Date(Date.now() - 2400000).toISOString(),
    impact: 'high',
    summary: 'Reconnaissance units coordinate perimeter updates along northwestern sector markers.',
    url: '#',
  }
];

export async function seedTacticalDatabase(): Promise<{
  incidents: DBIncident[];
  assets: DBCriticalAsset[];
  news: DBOperationalNews[];
}> {
  // Check if databases are populated
  const incidentCount = await db.incidents.count();
  const assetCount = await db.criticalAssets.count();
  const newsCount = await db.operationalNews.count();

  // Use safe IndexedDB bulkPut() calls to prevent BulkError during startup
  if (incidentCount === 0) {
    await db.incidents.bulkPut(seedIncidents);
  }
  if (assetCount === 0) {
    await db.criticalAssets.bulkPut(seedAssets);
  }
  if (newsCount === 0) {
    await db.operationalNews.bulkPut(seedNews);
  }

  // Retrieve full datasets from IndexedDB
  const incidents = await db.incidents.toArray();
  const assets = await db.criticalAssets.toArray();
  const news = await db.operationalNews.toArray();

  return { incidents, assets, news };
}
