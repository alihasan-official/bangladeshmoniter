import * as turf from '@turf/turf';
import Supercluster from 'supercluster';
import { DBIncident, DBCriticalAsset } from '../services/db';

export const BBOX_LIMITS = {
  minLng: 68.0,
  minLat: 5.0,
  maxLng: 100.0,
  maxLat: 36.0,
};

// Check if latitude/longitude falls within the regional command window
export function isCoordinateWithinBBox(lat: number, lng: number): boolean {
  return (
    lng >= BBOX_LIMITS.minLng &&
    lng <= BBOX_LIMITS.maxLng &&
    lat >= BBOX_LIMITS.minLat &&
    lat <= BBOX_LIMITS.maxLat
  );
}

// Custom client-side Supercluster manager for high-performance grouping of incidents
export class HighPerformanceClusterer {
  private index: Supercluster;

  constructor() {
    this.index = new Supercluster({
      radius: 60,
      maxZoom: 15,
      minPoints: 2,
    });
  }

  // Load raw list of active incidents as GeoJSON Features and load into Supercluster
  public loadIncidents(incidents: DBIncident[]) {
    const geojsonFeatures = incidents.map((inc) => {
      return turf.point([inc.lng, inc.lat], {
        id: inc.id,
        type: inc.type,
        title: inc.title,
        category: inc.category,
        severity: inc.severity,
        timestamp: inc.timestamp,
      });
    });

    this.index.load(geojsonFeatures);
  }

  // Retrieve current active clusters for the current screen bounding box and zoom level
  public getIncidentsInView(
    west: number,
    south: number,
    east: number,
    north: number,
    zoom: number
  ): any[] {
    try {
      return this.index.getClusters([west, south, east, north], Math.round(zoom));
    } catch (e) {
      // Safely fallback if indices aren't loaded or bounding window is inverted
      return [];
    }
  }

  // Get children features inside a specific cluster ID
  public getClusterLeaves(clusterId: number, limit = 100, offset = 0): any[] {
    try {
      return this.index.getLeaves(clusterId, limit, offset);
    } catch (e) {
      return [];
    }
  }
}

// Client-Side Spatial Proximity Engine (Evaluating distances between incidents and critical assets)
export interface SpatialAssetRelation {
  asset: DBCriticalAsset;
  distanceKm: number;
}

export function findCriticalAssetsNearIncident(
  incidentLat: number,
  incidentLng: number,
  assets: DBCriticalAsset[],
  radiusKm = 50
): SpatialAssetRelation[] {
  const incidentPoint = turf.point([incidentLng, incidentLat]);
  const results: SpatialAssetRelation[] = [];

  assets.forEach((asset) => {
    const assetPoint = turf.point([asset.lng, asset.lat]);
    const distance = turf.distance(incidentPoint, assetPoint, { units: 'kilometers' });

    if (distance <= radiusKm) {
      results.push({
        asset,
        distanceKm: Number(distance.toFixed(2)),
      });
    }
  });

  // Sort by closest proximity
  return results.sort((a, b) => a.distanceKm - b.distanceKm);
}

// Tactical Severity Matrices and Categorical Indices Resolver
export function evaluateSeverityMatrix(
  frequencyCount: number,
  averageImpact: number
): 'critical' | 'warning' | 'nominal' {
  const compositeMetric = frequencyCount * averageImpact;
  if (compositeMetric >= 30) return 'critical';
  if (compositeMetric >= 12) return 'warning';
  return 'nominal';
}
