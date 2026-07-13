import Dexie, { type Table } from 'dexie';

// Structured DB Schema Interfaces for BangladeshMonitor v2.0
export interface DBIncident {
  id: string;
  type: 'incident' | 'hazard' | 'patrol';
  title: string;
  category: 'Weather/Cyclone/Flood' | 'Civil Defence/Police/Medical' | 'Critical Infrastructure' | 'Maritime/Port' | 'Border Monitoring';
  severity: 'critical' | 'warning' | 'nominal';
  description: string;
  lat: number;
  lng: number;
  timestamp: string;
}

export interface DBCriticalAsset {
  id: string;
  name: string;
  category: 'Power Grid' | 'Hospital' | 'Telecom Node' | 'Bridge' | 'Port';
  lat: number;
  lng: number;
  status: 'operational' | 'alert' | 'damaged';
  capacityValue?: string;
}

export interface DBOperationalNews {
  id: string;
  source: string;
  title: string;
  category: 'geopolitics' | 'hydrology' | 'logistics' | 'maritime';
  timestamp: string;
  impact: 'high' | 'medium' | 'low';
  summary?: string;
  url: string;
}

class BangladeshMonitorDB extends Dexie {
  incidents!: Table<DBIncident, string>;
  criticalAssets!: Table<DBCriticalAsset, string>;
  operationalNews!: Table<DBOperationalNews, string>;

  constructor() {
    super('BangladeshMonitorDB');
    // Define Index Schema (id is primary key, others indexed for query optimization)
    this.version(1).stores({
      incidents: 'id, type, category, severity, timestamp',
      criticalAssets: 'id, name, category, status',
      operationalNews: 'id, category, impact, timestamp',
    });
  }
}

export const db = new BangladeshMonitorDB();
export default db;
