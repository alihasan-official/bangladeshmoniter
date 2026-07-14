// Centralized Polling Engine for Bangladesh Monitor v2.0
// Synchronizes Yahoo Finance (DSEX Index), OpenSky Air Telemetry, meteorological readings, and updates Zustand.
// Integrates mirror endpoints for the public api.worldmonitor.app services.

import useStore, { Flight } from '../store/useStore';
import { DBIncident } from './db';
import { fetchLiveIntelligenceNews } from './rssAggregator';

// Safe Response Validator
class ResponseValidator {
  static validateFlightData(data: any): boolean {
    return data && Array.isArray(data.states);
  }

  static validateStockData(data: any): boolean {
    return (
      data &&
      data.chart &&
      data.chart.result &&
      data.chart.result[0] &&
      data.chart.result[0].meta
    );
  }
}

// Bounding box for regional geofencing (South Asia)
const SOUTH_ASIA_BOUNDS = {
  minLat: 5.0,
  maxLat: 36.0,
  minLng: 68.0,
  maxLng: 100.0,
};

function isWithinSouthAsia(lat: number, lng: number): boolean {
  return (
    lat >= SOUTH_ASIA_BOUNDS.minLat &&
    lat <= SOUTH_ASIA_BOUNDS.maxLat &&
    lng >= SOUTH_ASIA_BOUNDS.minLng &&
    lng <= SOUTH_ASIA_BOUNDS.maxLng
  );
}

/**
 * Airspace coordinates boundary for Bangladesh
 * Min Lat: 20.5, Max Lat: 26.6, Min Lng: 88.0, Max Lng: 92.8
 */
export async function pollOpenSkyFlights(): Promise<Flight[]> {
  const endpoint = 'https://opensky-network.org/api/states/all?lamin=20.5&lamax=26.6&lomin=88.0&lomax=92.8';

  // Mirror endpoint pointing to public REST endpoints of the open-source engine
  const mirrorEndpoint = 'https://api.worldmonitor.app/v1/aviation/states?lamin=20.5&lamax=26.6&lomin=88.0&lomax=92.8';

  try {
    // Attempt handshake with public REST endpoints first, with graceful timeout fallbacks
    let res: Response;
    try {
      res = await fetch(mirrorEndpoint, { signal: AbortSignal.timeout(5000) });
    } catch {
      res = await fetch(endpoint);
    }

    if (res.status === 429) {
      useStore.getState().setRateLimitWarning(true);
      throw new Error('OpenSky rate limited. Swapping to offline simulation...');
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (!ResponseValidator.validateFlightData(data)) {
      return getSimulatedFallbackFlights();
    }

    useStore.getState().setRateLimitWarning(false);
    const flights: Flight[] = data.states.map((state: any, index: number) => ({
      icao24: state[0],
      callsign: (state[1] || `FLIGHT${index}`).trim(),
      origin: state[2] || 'International Airspace',
      altitude: Math.round(state[7] || 10000),
      velocity: Math.round((state[9] || 250) * 3.6), // Convert m/s to km/h
      lng: state[5],
      lat: state[6],
      onGround: !!state[8],
    }));

    // Cache the flight telemetry in localStorage for offline-first resilience
    localStorage.setItem('bd_flights_cache', JSON.stringify(flights));
    return flights;
  } catch (err) {
    const cached = localStorage.getItem('bd_flights_cache');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return getSimulatedFallbackFlights();
      }
    }
    return getSimulatedFallbackFlights();
  }
}

// Simulated nominal aviation trackers if OpenSky is restricted/rate-limited
export function getSimulatedFallbackFlights(): Flight[] {
  return [
    { icao24: 'e401d8', callsign: 'BBC230', origin: 'Dhaka DAC', altitude: 4200, velocity: 512, lat: 23.95, lng: 90.41, onGround: false },
    { icao24: '400f12', callsign: 'QA339', origin: 'Doha DOH', altitude: 11000, velocity: 850, lat: 21.8, lng: 89.2, onGround: false },
    { icao24: '7102e3', callsign: 'BG148', origin: 'Sylhet ZYL', altitude: 8500, velocity: 620, lat: 24.6, lng: 91.3, onGround: false },
  ];
}

/**
 * Poll Stock exchange metrics directly from Yahoo Finance for DSEX
 */
export async function pollDhakaStockExchange(): Promise<{ price: number; change: number; changePercent: number; history: number[] }> {
  // CORS-bypass proxy url
  const targetUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/^DSEX';
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;

  try {
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (!ResponseValidator.validateStockData(data)) {
      throw new Error('Stock metric format invalid');
    }

    const meta = data.chart.result[0].meta;
    const price = meta.regularMarketPrice || 5750.45;
    const previousClose = meta.chartPreviousClose || 5735.25;
    const change = Number((price - previousClose).toFixed(2));
    const changePercent = Number(((change / previousClose) * 100).toFixed(2));

    // Gather quote list for mockup chart history
    const quotes = data.chart.result[0].indicators?.quote?.[0]?.close || [5720, 5732, 5715, 5740, 5735, price];
    const history = quotes.filter((q: any) => typeof q === 'number').slice(-8);

    return { price, change, changePercent, history };
  } catch (error) {
    // Return last cached or stable mock metrics
    return {
      price: 5745.85,
      change: 12.10,
      changePercent: 0.21,
      history: [5720, 5732, 5715, 5740, 5735, 5745],
    };
  }
}

/**
 * Fetches current meteorology conditions from Open-Meteo at Dhaka
 * Evaluates composite situational and risk indexes.
 */
export async function pollMeteorologyAndRisk(): Promise<{ environmental: number; riskScore: number }> {
  const weatherEndpoint = 'https://api.open-meteo.com/v1/forecast?latitude=23.685&longitude=90.3563&current_weather=true';

  try {
    const res = await fetch(weatherEndpoint);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const cur = data.current_weather;
    const temp = cur?.temperature || 28;
    const windSpeed = cur?.windspeed || 15;

    // Environmental Risk score is dynamically computed from wind and temperature stress
    const environmental = Math.min(100, Math.round(windSpeed * 1.5 + (temp > 35 ? (temp - 35) * 5 : 0) + 15));
    return { environmental, riskScore: Math.min(100, Math.round((environmental + 35 + 20) / 2)) };
  } catch {
    return { environmental: 38, riskScore: 35 };
  }
}

/**
 * Fetches recent earthquakes from the open-source World Monitor REST API
 */
export async function fetchWorldMonitorEarthquakes(): Promise<DBIncident[]> {
  const endpoint = 'https://api.worldmonitor.app/api/seismology/v1/list-earthquakes';
  try {
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (!data || !Array.isArray(data.earthquakes)) return [];

    const parsed: DBIncident[] = [];
    for (const eq of data.earthquakes) {
      const lat = eq.location?.latitude;
      const lng = eq.location?.longitude;

      if (typeof lat === 'number' && typeof lng === 'number' && isWithinSouthAsia(lat, lng)) {
        parsed.push({
          id: `wm-eq-${eq.id}`,
          type: 'hazard',
          title: `Seismic: M${eq.magnitude || 'N/A'} Earthquake`,
          category: 'Weather/Cyclone/Flood',
          severity: (eq.magnitude && eq.magnitude >= 6.0) ? 'critical' : (eq.magnitude && eq.magnitude >= 4.5) ? 'warning' : 'nominal',
          description: `USGS logged seismology event. Magnitude: ${eq.magnitude || 'N/A'}. Depth: ${eq.depthKm || 'N/A'} km. Concern score: ${eq.concernScore || 'N/A'}. Concern level: ${eq.concernLevel || 'N/A'}.`,
          lat,
          lng,
          timestamp: new Date().toISOString(),
        });
      }
    }
    return parsed;
  } catch (err) {
    console.warn('Silent fallback for World Monitor Earthquakes API:', err);
    return [];
  }
}

/**
 * Fetches recent social unrest and civil demonstrations from World Monitor REST API
 */
export async function fetchWorldMonitorUnrest(): Promise<DBIncident[]> {
  const endpoint = 'https://api.worldmonitor.app/api/unrest/v1/list-unrest-events';
  try {
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (!data || !Array.isArray(data.events)) return [];

    const parsed: DBIncident[] = [];
    for (const ev of data.events) {
      const lat = ev.location?.latitude;
      const lng = ev.location?.longitude;

      if (typeof lat === 'number' && typeof lng === 'number' && isWithinSouthAsia(lat, lng)) {
        parsed.push({
          id: `wm-unrest-${ev.id}`,
          type: 'incident',
          title: `Unrest: ${ev.title || ev.eventType || 'Protest'}`,
          category: 'Civil Defence/Police/Medical',
          severity: ev.severity === 'SEVERITY_LEVEL_HIGH' ? 'critical' : ev.severity === 'SEVERITY_LEVEL_MEDIUM' ? 'warning' : 'nominal',
          description: `${ev.summary || 'Social unrest or civil demonstration.'} Locality: ${ev.city || 'N/A'}, ${ev.region || 'N/A'}. Type: ${ev.eventType || 'N/A'}.`,
          lat,
          lng,
          timestamp: ev.occurredAt ? new Date(ev.occurredAt).toISOString() : new Date().toISOString(),
        });
      }
    }
    return parsed;
  } catch (err) {
    console.warn('Silent fallback for World Monitor Unrest API:', err);
    return [];
  }
}

/**
 * Initiates the multi-threading polling schedules.
 */
export function initializeDashboardPolling() {
  const store = useStore.getState();

  // 1. Initial Synchronous Seed Loading
  const syncFeeds = async () => {
    // Poll Flights
    const flightLogs = await pollOpenSkyFlights();
    store.setFlights(flightLogs);

    // Poll Stocks
    const stockLogs = await pollDhakaStockExchange();
    store.setDsexIndex(stockLogs);

    // Poll Meteorology & Risk Status
    const weatherAndRisk = await pollMeteorologyAndRisk();
    store.setEnvironmentalRisk(weatherAndRisk.environmental);

    // Poll Live News Wire
    const newsWire = await fetchLiveIntelligenceNews();
    if (newsWire.length > 0) {
      // Convert GeotaggedNews to DBOperationalNews format safely
      const mappedNews = newsWire.map((item) => ({
        id: item.id,
        source: item.source,
        title: item.title,
        category: (item.category === 'hydrology' ? 'hydrology' : item.category === 'maritime' ? 'maritime' : item.category === 'geopolitics' ? 'geopolitics' : 'logistics') as any,
        timestamp: item.timestamp,
        impact: item.impact,
        summary: item.summary,
        url: item.url,
        lat: item.lat,
        lng: item.lng,
      }));
      store.setNews(mappedNews);
    }

    // Fetch live intelligence events from World Monitor
    const earthquakes = await fetchWorldMonitorEarthquakes();
    const unrest = await fetchWorldMonitorUnrest();
    if (earthquakes.length > 0 || unrest.length > 0) {
      const mergedIncidents = [...store.incidents];
      const existingIds = new Set(mergedIncidents.map(i => i.id));

      for (const item of [...earthquakes, ...unrest]) {
        if (!existingIds.has(item.id)) {
          mergedIncidents.push(item);
          existingIds.add(item.id);
        }
      }
      store.setIncidents(mergedIncidents);
    }
  };

  syncFeeds();

  // Set recurring intervals for high-density dashboards
  const flightInterval = setInterval(async () => {
    const flights = await pollOpenSkyFlights();
    store.setFlights(flights);
  }, 180000); // 180 seconds polling for flight data

  const stockInterval = setInterval(async () => {
    const stocks = await pollDhakaStockExchange();
    store.setDsexIndex(stocks);
  }, 300000); // 300 seconds polling for Stocks

  const weatherInterval = setInterval(async () => {
    const wr = await pollMeteorologyAndRisk();
    store.setEnvironmentalRisk(wr.environmental);
  }, 300000);

  const newsInterval = setInterval(async () => {
    const newsWire = await fetchLiveIntelligenceNews();
    if (newsWire.length > 0) {
      const mappedNews = newsWire.map((item) => ({
        id: item.id,
        source: item.source,
        title: item.title,
        category: (item.category === 'hydrology' ? 'hydrology' : item.category === 'maritime' ? 'maritime' : item.category === 'geopolitics' ? 'geopolitics' : 'logistics') as any,
        timestamp: item.timestamp,
        impact: item.impact,
        summary: item.summary,
        url: item.url,
        lat: item.lat,
        lng: item.lng,
      }));
      store.setNews(mappedNews);
    }

    // Periodically update World Monitor events
    const earthquakes = await fetchWorldMonitorEarthquakes();
    const unrest = await fetchWorldMonitorUnrest();
    if (earthquakes.length > 0 || unrest.length > 0) {
      const mergedIncidents = [...store.incidents];
      const existingIds = new Set(mergedIncidents.map(i => i.id));

      for (const item of [...earthquakes, ...unrest]) {
        if (!existingIds.has(item.id)) {
          mergedIncidents.push(item);
          existingIds.add(item.id);
        }
      }
      store.setIncidents(mergedIncidents);
    }
  }, 300000);

  // Return cleanups
  return () => {
    clearInterval(flightInterval);
    clearInterval(stockInterval);
    clearInterval(weatherInterval);
    clearInterval(newsInterval);
  };
}
