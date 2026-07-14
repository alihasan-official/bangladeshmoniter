import { useEffect, useMemo, useCallback, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, LineLayer } from '@deck.gl/layers';
import { Map } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import useStore from '../../store/useStore';
import { DBCriticalAsset } from '../../services/db';
import { HighPerformanceClusterer } from '../../utils/spatial';
import { Layers, Maximize2, Minimize2, Navigation, Compass } from 'lucide-react';

// Boundaries for Bangladesh regional clamping
const BBOX_LIMITS = {
  minLng: 68.0,
  minLat: 5.0,
  maxLng: 100.0,
  maxLat: 36.0,
};

export default function MapCanvas() {
  const {
    viewState,
    setViewState,
    layersVisibility,
    toggleLayer,
    incidents,
    criticalAssets,
    flights,
    maritimeVessels,
    selectedFeature,
    setSelectedFeature,
    mapMode,
    setMapMode,
  } = useStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  // High-performance Supercluster instance
  const clusterer = useMemo(() => new HighPerformanceClusterer(), []);

  // Sync active incidents with Supercluster
  useEffect(() => {
    if (layersVisibility.incidents) {
      clusterer.loadIncidents(incidents);
    }
  }, [incidents, layersVisibility.incidents, clusterer]);

  // Handle camera panning/zooming locks and clamps
  const handleViewStateChange = useCallback(({ viewState: nextViewState }: any) => {
    let { longitude, latitude, zoom } = nextViewState;

    // Enforce strict zoom range
    zoom = Math.max(5.0, Math.min(16.0, zoom));

    // Clamp coordinates to South Asia window
    longitude = Math.max(BBOX_LIMITS.minLng, Math.min(BBOX_LIMITS.maxLng, longitude));
    latitude = Math.max(BBOX_LIMITS.minLat, Math.min(BBOX_LIMITS.maxLat, latitude));

    setViewState({
      longitude,
      latitude,
      zoom,
      pitch: nextViewState.pitch,
      bearing: nextViewState.bearing,
    });
  }, [setViewState]);

  // Swappable CartoDB map style depending on mapMode setting
  const mapStyle = useMemo(() => {
    return mapMode === 'dark'
      ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
      : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
  }, [mapMode]);

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Compute active cluster nodes and raw points to feed Deck.gl
  const visibleIncidentData = useMemo(() => {
    if (!layersVisibility.incidents) return [];

    const range = 180 / Math.pow(2, viewState.zoom - 1);
    const west = Math.max(BBOX_LIMITS.minLng, viewState.longitude - range);
    const east = Math.min(BBOX_LIMITS.maxLng, viewState.longitude + range);
    const south = Math.max(BBOX_LIMITS.minLat, viewState.latitude - range);
    const north = Math.min(BBOX_LIMITS.maxLat, viewState.latitude + range);

    return clusterer.getIncidentsInView(west, south, east, north, viewState.zoom);
  }, [viewState, incidents, layersVisibility.incidents, clusterer]);

  // Shipping corridors across the Bay of Bengal sea lanes
  const shippingCorridorsData = useMemo(() => {
    return [
      { id: 'c1', name: 'BoB Sea Route Alpha', from: [88.5, 10.0], to: [91.2, 21.0] },
      { id: 'c2', name: 'BoB Sea Route Beta', from: [76.0, 6.0], to: [89.5, 21.5] },
      { id: 'c3', name: 'Port Chittagong Entrance', from: [91.7, 18.5], to: [91.8, 22.1] },
      { id: 'c4', name: 'Mongla Corridor', from: [89.0, 19.0], to: [89.6, 21.8] },
    ];
  }, []);

  // Transboundary delta river lines for flood tracking layers
  const waterwayLinesData = useMemo(() => {
    return [
      { id: 'w1', name: 'Brahmaputra Channel', from: [89.7, 25.8], to: [89.8, 23.8] },
      { id: 'w2', name: 'Padma Delta Outlet', from: [89.1, 24.1], to: [90.6, 23.2] },
      { id: 'w3', name: 'Meghna Estuary Flow', from: [90.8, 24.3], to: [90.9, 22.3] },
      { id: 'w4', name: 'Jamuna Convergence', from: [89.6, 25.0], to: [89.7, 23.8] },
    ];
  }, []);

  // Construct Deck.gl Layers array
  const layers = useMemo(() => {
    const deckLayers = [];

    // 1. Waterways flow vectors layer (Blue/Cyan lines)
    if (layersVisibility.waterways) {
      deckLayers.push(
        new LineLayer({
          id: 'waterways-layer',
          data: waterwayLinesData,
          pickable: true,
          getWidth: 4,
          getSourcePosition: (d: any) => d.from,
          getTargetPosition: (d: any) => d.to,
          getColor: mapMode === 'dark' ? [34, 211, 238, 180] : [2, 132, 199, 180],
        })
      );
    }

    // 2. Shipping channels layer (Amber corridors)
    if (layersVisibility.shippingCorridors) {
      deckLayers.push(
        new LineLayer({
          id: 'shipping-corridors-layer',
          data: shippingCorridorsData,
          pickable: true,
          getWidth: 3,
          getSourcePosition: (d: any) => d.from,
          getTargetPosition: (d: any) => d.to,
          getColor: [245, 158, 11, 150],
        })
      );
    }

    // 3. Live Maritime Vessels Layer (Orange)
    if (layersVisibility.shippingCorridors) {
      deckLayers.push(
        new ScatterplotLayer({
          id: 'vessels-layer',
          data: maritimeVessels,
          pickable: true,
          opacity: 0.9,
          stroked: true,
          filled: true,
          radiusScale: 1,
          radiusMinPixels: 5,
          radiusMaxPixels: 12,
          lineWidthMinPixels: 1,
          getPosition: (d: any) => [d.lng, d.lat],
          getRadius: 800,
          getFillColor: [245, 158, 11],
          getLineColor: [15, 23, 42],
          onClick: (info: any) => {
            if (info.object) {
              setSelectedFeature({ ...info.object, featureType: 'Maritime Vessel' });
            }
          },
        })
      );
    }

    // 4. Live Flight Telemetry Layer (Purple/Cyan dots with pulsing look)
    if (layersVisibility.windVectors) {
      deckLayers.push(
        new ScatterplotLayer({
          id: 'flights-layer',
          data: flights,
          pickable: true,
          opacity: 0.95,
          stroked: true,
          filled: true,
          radiusScale: 1,
          radiusMinPixels: 6,
          radiusMaxPixels: 14,
          lineWidthMinPixels: 1.5,
          getPosition: (d: any) => [d.lng, d.lat],
          getRadius: 1000,
          getFillColor: [168, 85, 247],
          getLineColor: [255, 255, 255],
          onClick: (info: any) => {
            if (info.object) {
              setSelectedFeature({ ...info.object, featureType: 'Aviation Track' });
            }
          },
        })
      );
    }

    // 5. Simulated Animated Meteorological Rain Radar Rings (Emerald/Cyan concentric rings)
    if (layersVisibility.weatherRadar) {
      const radarCenters = [
        { id: 'rad-1', name: 'Dhaka Command Radar', lat: 23.8103, lng: 90.4125, r: 40000 },
        { id: 'rad-2', name: 'Cox\'s Bazar Meteorological Station', lat: 21.4272, lng: 92.0058, r: 60000 },
      ];
      deckLayers.push(
        new ScatterplotLayer({
          id: 'weather-radar-layer',
          data: radarCenters,
          pickable: false,
          opacity: 0.15,
          stroked: true,
          filled: false,
          lineWidthMinPixels: 2,
          getPosition: (d: any) => [d.lng, d.lat],
          getRadius: (d: any) => d.r,
          getLineColor: [16, 185, 129],
        })
      );
    }

    // 6. Critical Assets layer (Green/Yellow/Red status rings)
    if (layersVisibility.criticalAssets) {
      deckLayers.push(
        new ScatterplotLayer({
          id: 'critical-assets-layer',
          data: criticalAssets,
          pickable: true,
          opacity: 0.85,
          stroked: true,
          filled: true,
          radiusScale: 1,
          radiusMinPixels: 6,
          radiusMaxPixels: 15,
          lineWidthMinPixels: 1.5,
          getPosition: (d: DBCriticalAsset) => [d.lng, d.lat],
          getRadius: 1000,
          getFillColor: (d: DBCriticalAsset) => {
            if (d.status === 'damaged') return [239, 68, 68]; // Red
            if (d.status === 'alert') return [245, 158, 11]; // Yellow
            return [16, 185, 129]; // Green
          },
          getLineColor: (d: DBCriticalAsset) => {
            if (selectedFeature?.id === d.id) return [255, 255, 255];
            return [15, 23, 42];
          },
          onClick: (info: any) => {
            if (info.object) {
              setSelectedFeature({ ...info.object, featureType: 'Asset' });
            }
          },
          updateTriggers: {
            getLineColor: [selectedFeature],
          },
        })
      );
    }

    // 7. Incidents & Clusters Layer
    if (layersVisibility.incidents) {
      deckLayers.push(
        new ScatterplotLayer({
          id: 'incidents-layer',
          data: visibleIncidentData,
          pickable: true,
          opacity: 0.9,
          stroked: true,
          filled: true,
          radiusScale: 1,
          radiusMinPixels: 7,
          radiusMaxPixels: 30,
          lineWidthMinPixels: 1.5,
          getPosition: (d: any) => {
            if (d.geometry) return d.geometry.coordinates;
            return [d.lng, d.lat];
          },
          getRadius: (d: any) => {
            if (d.properties?.cluster) return 2000;
            return 1200;
          },
          getFillColor: (d: any) => {
            if (d.properties?.cluster) {
              const pointCount = d.properties.point_count;
              if (pointCount > 5) return [239, 68, 68, 210];
              return [245, 158, 11, 210];
            }
            if (d.severity === 'critical') return [239, 68, 68];
            if (d.severity === 'warning') return [245, 158, 11];
            return [16, 185, 129];
          },
          getLineColor: (d: any) => {
            const id = d.properties?.cluster ? `cluster-${d.id}` : d.id;
            if (selectedFeature?.id === id) return [255, 255, 255];
            return [15, 23, 42];
          },
          onClick: (info: any) => {
            if (info.object) {
              const obj = info.object;
              if (obj.properties?.cluster) {
                const [lng, lat] = obj.geometry.coordinates;
                setViewState({
                  ...viewState,
                  longitude: lng,
                  latitude: lat,
                  zoom: Math.min(viewState.zoom + 1.5, 15.0),
                });
              } else {
                setSelectedFeature({ ...obj, featureType: 'Incident' });
              }
            }
          },
          updateTriggers: {
            getLineColor: [selectedFeature],
          },
        })
      );
    }

    return deckLayers;
  }, [
    layersVisibility,
    visibleIncidentData,
    criticalAssets,
    flights,
    maritimeVessels,
    selectedFeature,
    setSelectedFeature,
    waterwayLinesData,
    shippingCorridorsData,
    setViewState,
    viewState,
    mapMode,
  ]);

  return (
    <div className="relative w-full h-full">
      <DeckGL
        viewState={viewState as any}
        onViewStateChange={handleViewStateChange}
        controller={{
          dragRotate: true,
          doubleClickZoom: true,
          keyboard: true,
          scrollZoom: true,
          dragPan: true,
        }}
        layers={layers}
        getCursor={({ isHovering }: { isHovering: boolean }) => (isHovering ? 'pointer' : 'default')}
      >
        <Map
          reuseMaps
          mapLib={maplibregl}
          mapStyle={mapStyle}
          attributionControl={false}
          onError={(e) => {
            console.warn('MapLibre GL Map Canvas loading warning/error:', e);
          }}
        />
      </DeckGL>

      {/* Floating Tactical Layer Swapper and Map Controls HUD Panel */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">

        {/* Layer Swapper Button */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => setMapMode(mapMode === 'dark' ? 'light' : 'dark')}
            className="p-2.5 rounded-lg border text-xs font-mono font-bold transition shadow-md bg-zinc-900 border-zinc-800 text-zinc-100 hover:bg-zinc-800 hover:text-white"
            title="Toggle Map Light/Dark Mode"
          >
            {mapMode === 'dark' ? 'DAY MODE' : 'NIGHT MODE'}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-lg border transition shadow-md bg-zinc-900 border-zinc-800 text-zinc-100 hover:bg-zinc-800 hover:text-white"
            title="Fullscreen Toggle"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className={`p-2.5 rounded-lg border transition shadow-md flex items-center gap-1.5 text-xs font-mono font-bold ${
              showLayerMenu ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-zinc-900 border-zinc-800 text-zinc-100 hover:bg-zinc-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>LAYERS</span>
          </button>
        </div>

        {/* Floating Layer Menu Overlay */}
        {showLayerMenu && (
          <div className="p-3 bg-zinc-950/95 border border-zinc-800 rounded-lg shadow-2xl flex flex-col gap-2 w-52 text-xs font-mono text-zinc-200">
            <span className="text-[10px] text-zinc-500 font-bold border-b border-zinc-800 pb-1.5 mb-1 flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5 text-emerald-400" />
              INTELLIGENCE REGISTRY
            </span>

            <label className="flex items-center gap-2 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={layersVisibility.incidents}
                onChange={() => toggleLayer('incidents')}
                className="accent-emerald-500"
              />
              <span>OSINT Incidents</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={layersVisibility.criticalAssets}
                onChange={() => toggleLayer('criticalAssets')}
                className="accent-emerald-500"
              />
              <span>Critical Infrastructure</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={layersVisibility.shippingCorridors}
                onChange={() => toggleLayer('shippingCorridors')}
                className="accent-emerald-500"
              />
              <span>Shipping Sea Lanes</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={layersVisibility.waterways}
                onChange={() => toggleLayer('waterways')}
                className="accent-emerald-500"
              />
              <span>Transboundary Rivers</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={layersVisibility.weatherRadar}
                onChange={() => toggleLayer('weatherRadar')}
                className="accent-emerald-500"
              />
              <span>Pulsing Weather Radar</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={layersVisibility.windVectors}
                onChange={() => toggleLayer('windVectors')}
                className="accent-emerald-500"
              />
              <span>Live Aviation Tracking</span>
            </label>
          </div>
        )}

        {/* Real-time coordinates clamp HUD panel */}
        <div className="glass-panel px-3 py-2.5 text-xs flex flex-col gap-1 rounded-lg shadow-2xl text-slate-400 font-mono border border-brand-border">
          <div className="text-slate-300 font-bold border-b border-[#1a1d24] pb-1.5 mb-1.5 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: '10s' }} />
            WORKSTATION HUD v2.0
          </div>
          <div className="flex justify-between gap-4">
            <span>MAP CENTER:</span>
            <span className="text-slate-200">{viewState.latitude.toFixed(4)}°N, {viewState.longitude.toFixed(4)}°E</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>ZOOM LEVEL:</span>
            <span className="text-slate-200">{viewState.zoom.toFixed(1)}x</span>
          </div>
          <button
            onClick={() =>
              setViewState({
                longitude: 90.3563,
                latitude: 23.6850,
                zoom: 6.5,
                pitch: 25,
                bearing: 0,
              })
            }
            className="mt-2 w-full text-center py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-sans font-bold transition text-xs"
          >
            CLAMP TO DELTA CENTER
          </button>
        </div>
      </div>
    </div>
  );
}
