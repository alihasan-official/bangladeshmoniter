import { DBIncident, DBCriticalAsset } from '../services/db';

// Exporter Module for BangladeshMonitor v2.0
// Facilitates GeoJSON, CSV, and Markdown tactical intelligence downloads

// 1. Download Utility Helper
function triggerFileDownload(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// 2. Export Incidents and Assets as GeoJSON Feature Collection
export function exportToGeoJSON(incidents: DBIncident[], assets: DBCriticalAsset[]) {
  const features = [
    ...incidents.map((inc) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [inc.lng, inc.lat],
      },
      properties: {
        id: inc.id,
        entityType: 'Incident',
        type: inc.type,
        title: inc.title,
        category: inc.category,
        severity: inc.severity,
        description: inc.description,
        timestamp: inc.timestamp,
      },
    })),
    ...assets.map((asset) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [asset.lng, asset.lat],
      },
      properties: {
        id: asset.id,
        entityType: 'CriticalAsset',
        name: asset.name,
        category: asset.category,
        status: asset.status,
        capacityValue: asset.capacityValue || 'N/A',
      },
    })),
  ];

  const featureCollection = {
    type: 'FeatureCollection',
    features,
  };

  triggerFileDownload(
    JSON.stringify(featureCollection, null, 2),
    `bangladesh_monitor_export_${Date.now()}.geojson`,
    'application/geo+json'
  );
}

// 3. Export Incidents list as Structured CSV Log File
export function exportToCSV(incidents: DBIncident[]) {
  const headers = ['ID', 'Type', 'Title', 'Category', 'Severity', 'Latitude', 'Longitude', 'Timestamp', 'Description'];
  const rows = incidents.map((inc) => [
    inc.id,
    inc.type,
    `"${inc.title.replace(/"/g, '""')}"`,
    inc.category,
    inc.severity,
    inc.lat,
    inc.lng,
    inc.timestamp,
    `"${inc.description.replace(/"/g, '""')}"`,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((r) => r.join(',')),
  ].join('\n');

  triggerFileDownload(
    csvContent,
    `bangladesh_monitor_incidents_${Date.now()}.csv`,
    'text/csv'
  );
}

// 4. Export Executive Markdown Operational Summary
export function exportToMarkdown(
  riskScore: number,
  trend: string,
  incidents: DBIncident[],
  assets: DBCriticalAsset[]
) {
  const criticalAssetsDamaged = assets.filter((a) => a.status !== 'operational');

  const doc = `# BANGLADESHMONTOR v2.0 — EXECUTIVE OPERATIONAL REPORT
**CONFIDENTIALITY LEVEL: HIGH TACTICAL**
**GENERATED ON (UTC):** ${new Date().toISOString()}

---

## 1. SUBCONTINENTAL RISK ASSESSMENT
- **Instability Score Index:** ${riskScore} / 100
- **Operational Trend Profile:** ${trend.toUpperCase()}
- **Delta Hydro-logical Stress Status:** ${incidents.filter(i => i.category === 'Weather/Cyclone/Flood').length > 0 ? 'HIGH ACTIVE ALERT' : 'NOMINAL'}

*Operational Directives:*
- Patrol units along maritime and river boundaries are instructed to retain maximum telemetry vigilance.
- Core dry port logistics nodes require security double-checking.

---

## 2. ACTIVE TACTICAL INCIDENTS LOG (Total: ${incidents.length})
${incidents.length === 0 ? '_No active incidents recorded in local database._' : ''}
${incidents.map((inc) => {
  return `### • [${inc.severity.toUpperCase()}] ${inc.title}
- **Category:** ${inc.category}
- **Coordinates:** Lat ${inc.lat}, Lng ${inc.lng}
- **Log Time:** ${inc.timestamp}
- **Context Details:** ${inc.description}
`;
}).join('\n')}

---

## 3. CRITICAL INFRASTRUCTURE DEFENCE & TELEMETRY
- **Total Tracked Assets:** ${assets.length}
- **Compromised/Alert Node Count:** ${criticalAssetsDamaged.length}

${criticalAssetsDamaged.length === 0 ? '_All tracked bridges, telecom, power grid, and port nodes are reporting nominal operational statuses._' : ''}
${criticalAssetsDamaged.map((asset) => {
  return `- **[${asset.status.toUpperCase()}]** ${asset.name} (${asset.category}) at Lat ${asset.lat}, Lng ${asset.lng}`;
}).join('\n')}

---
**END OF TRANSMISSION**
`;

  triggerFileDownload(
    doc,
    `bangladesh_monitor_executive_summary_${Date.now()}.md`,
    'text/markdown'
  );
}

// 5. Client-Side HTML5 Canvas Snapshot (Triggering file export of map canvas as PNG)
export function downloadCanvasAsPNG(canvasElement: HTMLCanvasElement) {
  try {
    const dataURL = canvasElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `bangladesh_monitor_canvas_snapshot_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) {
    console.error('Error capturing canvas snapshot: ', e);
  }
}
