// Centralized Polling Engine for Bangladesh Monitor v2.0
// Synchronizes Yahoo Finance (DSEX Index), OpenSky Air Telemetry, meteorological readings, and updates Zustand.

import useStore, { Flight } from '../store/useStore';
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

/**
 * Airspace coordinates boundary for Bangladesh
 * Min Lat: 20.5, Max Lat: 26.6, Min Lng: 88.0, Max Lng: 92.8
 */
export async function pollOpenSkyFlights(): Promise<Flight[]> {
  const endpoint = 'https://opensky-network.org/api/states/all?lamin=20.5&lamax=26.6&lomin=88.0&lomax=92.8';

  try {
    const res = await fetch(endpoint);
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
  }, 300000);

  // Return cleanups
  return () => {
    clearInterval(flightInterval);
    clearInterval(stockInterval);
    clearInterval(weatherInterval);
    clearInterval(newsInterval);
  };
}
