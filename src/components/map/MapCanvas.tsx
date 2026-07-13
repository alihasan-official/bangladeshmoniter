import { useEffect, useMemo, useCallback, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, LineLayer } from '@deck.gl/layers';
import { Map } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import useStore, { WeatherStation } from '../../store/useStore';
import { DBCriticalAsset } from '../../services/db';
import { HighPerformanceClusterer } from '../../utils/spatial';

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
    incidents,
    criticalAssets,
    weatherStations,
    selectedFeature,
    setSelectedFeature,
  } = useStore();

  // Pulse animation state for meteorology radar / rain rings
  const [pulsePhase, setPulsePhase] = useState(0);

  // Animation ticks for beautiful wind indicators and radar scans on the map
  useEffect(() => {
    let animationId: number;
    const animate = () => {
      setPulsePhase((prev) => (prev + 0.05) % (Math.PI * 2));
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Create high-performance Supercluster instance
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

  // Free CartoDB Dark Matter style JSON for matte charcoal visual aesthetics
  const mapStyle = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

  // Compute active cluster nodes and raw points to feed Deck.gl
  const visibleIncidentData = useMemo(() => {
    if (!layersVisibility.incidents) return [];

    // Construct a bounding box from current viewState (or approximation for supercluster)
    const range = 180 / Math.pow(2, viewState.zoom - 1);
    const west = Math.max(BBOX_LIMITS.minLng, viewState.longitude - range);
    const east = Math.min(BBOX_LIMITS.maxLng, viewState.longitude + range);
    const south = Math.max(BBOX_LIMITS.minLat, viewState.latitude - range);
    const north = Math.min(BBOX_LIMITS.maxLat, viewState.latitude + range);

    return clusterer.getIncidentsInView(west, south, east, north, viewState.zoom);
  }, [viewState, incidents, layersVisibility.incidents, clusterer]);

  // Define shipping corridors across the Bay of Bengal sea lanes
  const shippingCorridorsData = useMemo(() => {
    return [
      { id: 'c1', name: 'BoB Sea Route Alpha', from: [88.5, 10.0], to: [91.2, 21.0] },
      { id: 'c2', name: 'BoB Sea Route Beta', from: [76.0, 6.0], to: [89.5, 21.5] },
      { id: 'c3', name: 'Port Chittagong Entrance', from: [91.7, 18.5], to: [91.8, 22.1] },
      { id: 'c4', name: 'Mongla Corridor', from: [89.0, 19.0], to: [89.6, 21.8] },
    ];
  }, []);

  // Define transboundary delta river lines for flood tracking layers
  const waterwayLinesData = useMemo(() => {
    return [
      { id: 'w1', name: 'Brahmaputra Channel', from: [89.7, 25.8], to: [89.8, 23.8] },
      { id: 'w2', name: 'Padma Delta Outlet', from: [89.1, 24.1], to: [90.6, 23.2] },
      { id: 'w3', name: 'Meghna Estuary Flow', from: [90.8, 24.3], to: [90.9, 22.3] },
      { id: 'w4', name: 'Jamuna Convergence', from: [89.6, 25.0], to: [89.7, 23.8] },
    ];
  }, []);

  // Compute Animated Wind Vectors for weather stations
  const windVectorsData = useMemo(() => {
    return weatherStations.map((station) => {
      // Wind speed determines length of vector
      const len = 0.08 + (station.windSpeed / 100) * 0.25;
      // direction in degrees (0 = North, 90 = East, 180 = South, 270 = West)
      const rad = (station.windDirection * Math.PI) / 180;
      // Calculate target longitude/latitude offset based on wind angle
      const toLng = station.lng + Math.sin(rad) * len;
      const toLat = station.lat + Math.cos(rad) * len;

      return {
        id: `wind-${station.id}`,
        name: `${station.name} Wind Vector`,
        from: [station.lng, station.lat],
        to: [toLng, toLat],
        speed: station.windSpeed,
        condition: station.condition,
      };
    });
  }, [weatherStations]);

  // Construct Deck.gl Layers array
  const layers = useMemo(() => {
    const deckLayers = [];

    // 1. Waterways flow vectors layer (Bright Blue)
    if (layersVisibility.waterways) {
      deckLayers.push(
        new LineLayer({
          id: 'waterways-layer',
          data: waterwayLinesData,
          pickable: true,
          getWidth: 4,
          getSourcePosition: (d: any) => d.from,
          getTargetPosition: (d: any) => d.to,
          getColor: [30, 144, 255, 180],
        })
      );
    }

    // 2. Shipping channels layer (Amber/orange corridors in BoB)
    if (layersVisibility.shippingCorridors) {
      deckLayers.push(
        new LineLayer({
          id: 'shipping-corridors-layer',
          data: shippingCorridorsData,
          pickable: true,
          getWidth: 3,
          getSourcePosition: (d: any) => d.from,
          getTargetPosition: (d: any) => d.to,
          getColor: [220, 140, 30, 150],
        })
      );
    }

    // 2.5 Animated Weather Monitoring Layers (Dynamic Rings & Wind Vectors)
    if (layersVisibility.weather) {
      // Animated Wind Vectors Layer (Animated flowing vectors representing direction and intensity)
      // Moving cycle shifts endpoints dynamically with the sine pulse
      const phaseFactor = (Math.sin(pulsePhase) + 1) / 2; // 0 to 1

      const animatedWindVectors = windVectorsData.map((vector) => {
        const dLng = vector.to[0] - vector.from[0];
        const dLat = vector.to[1] - vector.from[1];

        // Animate flow direction
        const currentTo = [
          vector.from[0] + dLng * (0.4 + phaseFactor * 0.6),
          vector.from[1] + dLat * (0.4 + phaseFactor * 0.6),
        ];

        return {
          ...vector,
          currentTo,
        };
      });

      deckLayers.push(
        new LineLayer({
          id: 'weather-wind-layer',
          data: animatedWindVectors,
          pickable: false,
          getWidth: (d: any) => Math.max(2, d.speed / 10),
          getSourcePosition: (d: any) => d.from,
          getTargetPosition: (d: any) => d.currentTo,
          getColor: (d: any) => {
            if (d.condition === 'cyclonic') return [255, 59, 48, 220]; // Danger Red
            if (d.condition === 'stormy') return [245, 180, 0, 200]; // Stormy Orange-Yellow
            if (d.condition === 'rainy') return [30, 144, 255, 180]; // Rain Blue
            return [0, 208, 132, 160]; // Nominal Emerald Wind
          },
          updateTriggers: {
            getTargetPosition: [pulsePhase],
          },
        })
      );

      // Pulse rings representing storm/rain warning radii at weather stations
      const animatedWeatherRings = weatherStations.map((station) => {
        // Base radius fluctuates using the sine wave phase
        const pulseRatio = ((pulsePhase * 2) % 3) / 3; // Repeats 0 -> 1 nicely
        const maxRadius = station.condition === 'cyclonic' ? 35000 : station.condition === 'stormy' ? 22000 : 12000;
        const currentRadius = maxRadius * (0.3 + pulseRatio * 0.7);

        return {
          ...station,
          currentRadius,
          opacity: 1.0 - pulseRatio, // Fade out as it expands
        };
      });

      // Scatterplot layer for weather stations (Solid cores with outer animated radar scanners)
      deckLayers.push(
        new ScatterplotLayer({
          id: 'weather-radar-rings',
          data: animatedWeatherRings,
          pickable: false,
          opacity: 0.45,
          stroked: true,
          filled: false,
          radiusScale: 1,
          lineWidthMinPixels: 1.5,
          getPosition: (d: WeatherStation) => [d.lng, d.lat],
          getRadius: (d: any) => d.currentRadius,
          getLineColor: (d: any) => {
            const opacityByte = Math.floor(d.opacity * 255);
            if (d.condition === 'cyclonic') return [255, 59, 48, opacityByte];
            if (d.condition === 'stormy') return [245, 180, 0, opacityByte];
            if (d.condition === 'rainy') return [30, 144, 255, opacityByte];
            return [0, 208, 132, opacityByte];
          },
          updateTriggers: {
            getRadius: [pulsePhase],
            getLineColor: [pulsePhase],
          },
        })
      );

      deckLayers.push(
        new ScatterplotLayer({
          id: 'weather-station-cores',
          data: weatherStations,
          pickable: true,
          opacity: 0.9,
          stroked: true,
          filled: true,
          radiusScale: 1,
          radiusMinPixels: 7,
          radiusMaxPixels: 15,
          lineWidthMinPixels: 1.5,
          getPosition: (d: WeatherStation) => [d.lng, d.lat],
          getRadius: 1000,
          getFillColor: (d: WeatherStation) => {
            if (d.condition === 'cyclonic') return [255, 59, 48];
            if (d.condition === 'stormy') return [245, 180, 0];
            if (d.condition === 'rainy') return [30, 144, 255];
            return [0, 208, 132];
          },
          getLineColor: (d: WeatherStation) => {
            if (selectedFeature?.id === d.id) return [255, 255, 255];
            return [15, 20, 25];
          },
          onClick: (info: any) => {
            if (info.object) {
              setSelectedFeature({ ...info.object, featureType: 'Weather' });
            }
          },
          updateTriggers: {
            getLineColor: [selectedFeature],
          },
        })
      );
    }

    // 3. Critical Assets layer
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
            if (d.status === 'damaged') return [255, 59, 48]; // Crimson Alert
            if (d.status === 'alert') return [245, 180, 0]; // Warning Yellow
            return [0, 208, 132]; // Emerald Nominal
          },
          getLineColor: (d: DBCriticalAsset) => {
            if (selectedFeature?.id === d.id) return [255, 255, 255];
            return [15, 20, 25];
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

    // 4. Incidents & Clusters Layer
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
            if (d.geometry) return d.geometry.coordinates; // cluster
            return [d.lng, d.lat]; // normal incident
          },
          getRadius: (d: any) => {
            if (d.properties?.cluster) return 2000;
            return 1200;
          },
          getFillColor: (d: any) => {
            if (d.properties?.cluster) {
              const pointCount = d.properties.point_count;
              if (pointCount > 5) return [255, 59, 48, 210]; // Large red cluster
              return [245, 180, 0, 210]; // Medium amber cluster
            }
            // Individual node
            if (d.severity === 'critical') return [255, 59, 48];
            if (d.severity === 'warning') return [245, 180, 0];
            return [0, 106, 78]; // nominal emerald
          },
          getLineColor: (d: any) => {
            const id = d.properties?.cluster ? `cluster-${d.id}` : d.id;
            if (selectedFeature?.id === id) return [255, 255, 255];
            return [10, 12, 16];
          },
          onClick: (info: any) => {
            if (info.object) {
              const obj = info.object;
              if (obj.properties?.cluster) {
                // Zoom in on cluster click
                clusterer.getClusterLeaves(obj.id);
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
    weatherStations,
    windVectorsData,
    pulsePhase,
    selectedFeature,
    setSelectedFeature,
    waterwayLinesData,
    shippingCorridorsData,
    clusterer,
    setViewState,
    viewState,
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

      {/* Real-time coordinates clamp HUD panel */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <div className="glass-panel px-3 py-2.5 text-xs flex flex-col gap-1 rounded-md shadow-2xl text-slate-400 font-mono border border-brand-border">
          <div className="text-slate-300 font-bold border-b border-[#1a1d24] pb-1.5 mb-1.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#006a4e] animate-pulse"></span>
            WORKSTATION HUD v2.0
          </div>
          <div className="flex justify-between gap-4">
            <span>BOUNDS LOCK:</span>
            <span className="text-[#006a4e] font-bold">ENGAGED</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>MAP LATITUDE:</span>
            <span className="text-slate-200">{viewState.latitude.toFixed(5)}°N</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>MAP LONGITUDE:</span>
            <span className="text-slate-200">{viewState.longitude.toFixed(5)}°E</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>SCALE LEVEL:</span>
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
            className="mt-2.5 w-full text-center py-1.5 bg-[#006a4e] text-white rounded font-sans font-bold hover:bg-emerald-700 transition"
          >
            CLAMP TO DELTA CENTER
          </button>
        </div>
      </div>
    </div>
  );
}
