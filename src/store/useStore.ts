import { create } from 'zustand';
import { DBIncident, DBCriticalAsset, DBOperationalNews } from '../services/db';

export interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface RiskBreakdown {
  military: number;
  disaster: number;
  geopolitical: number;
  hydrology: number;
}

export interface RiskAnalysis {
  riskScore: number;
  mean: number;
  variance: number;
  velocity: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  breakdown: RiskBreakdown;
}

export interface WeatherStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  temperature: number; // in Celsius
  humidity: number; // %
  windSpeed: number; // km/h
  windDirection: number; // in degrees
  condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'cyclonic' | 'foggy';
  pressure: number; // hPa
  lastUpdated: string;
}

export interface RSSArticle {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  thumbnail: string;
  source: string;
  lat?: number;
  lng?: number;
  translated?: boolean;
  originalLanguage?: string;
}

interface MonitorState {
  // Map View
  viewState: ViewState;
  setViewState: (viewState: ViewState) => void;

  // Layer Visibility
  layersVisibility: {
    incidents: boolean;
    criticalAssets: boolean;
    shippingCorridors: boolean;
    waterways: boolean;
    weather: boolean;
    rssFeeds: boolean;
    aviation: boolean;
    fires: boolean;
    earthquakes: boolean;
  };
  toggleLayer: (layerKey: 'incidents' | 'criticalAssets' | 'shippingCorridors' | 'waterways' | 'weather' | 'rssFeeds' | 'aviation' | 'fires' | 'earthquakes') => void;

  // Active Telemetry/Operational Data
  incidents: DBIncident[];
  criticalAssets: DBCriticalAsset[];
  news: DBOperationalNews[];
  setIncidents: (incidents: DBIncident[]) => void;
  setCriticalAssets: (assets: DBCriticalAsset[]) => void;
  setNews: (news: DBOperationalNews[]) => void;

  // Weather Telemetry
  weatherStations: WeatherStation[];
  setWeatherStations: (stations: WeatherStation[]) => void;
  updateWeatherStations: () => void; // call to simulate continuous sensor updates

  // Live RSS Feed News
  rssArticles: RSSArticle[];
  rssLoading: boolean;
  setRssArticles: (articles: RSSArticle[]) => void;
  setRssLoading: (loading: boolean) => void;

  // Selected News Topic for the News Intelligence view
  selectedNewsTopic: string | null;
  setSelectedNewsTopic: (topic: string | null) => void;

  // Selection
  selectedFeature: any | null;
  setSelectedFeature: (feature: any | null) => void;

  // Timeline Controls
  timelineTime: number; // Active unix timestamp offset
  timelineSpeed: number; // 1 | 2 | 5
  timelineIsPlaying: boolean;
  setTimelineTime: (t: number) => void;
  setTimelineSpeed: (s: number) => void;
  setTimelineIsPlaying: (p: boolean) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // AI Configuration BYOK
  byokKey: string;
  byokProvider: 'groq' | 'openai' | 'openrouter';
  setByokKey: (key: string) => void;
  setByokProvider: (provider: 'groq' | 'openai' | 'openrouter') => void;

  // Map Mode (Day/Night)
  mapMode: 'dark' | 'light';
  setMapMode: (mode: 'dark' | 'light') => void;

  // Aviation Feed state
  aircrafts: any[];
  aircraftsStatus: 'nominal' | 'offline';
  setAircrafts: (aircrafts: any[]) => void;
  setAircraftsStatus: (status: 'nominal' | 'offline') => void;

  // Thermal/Industrial Fires state
  fires: any[];
  firesStatus: 'nominal' | 'offline';
  setFires: (fires: any[]) => void;
  setFiresStatus: (status: 'nominal' | 'offline') => void;

  // Stock Index state
  dsexValue: number;
  dsexChange: number;
  dsexStatus: 'nominal' | 'stale';
  setDsexData: (value: number, change: number, status: 'nominal' | 'stale') => void;

  // Seismic Activity state
  earthquakes: any[];
  earthquakesStatus: 'nominal' | 'offline';
  setEarthquakes: (earthquakes: any[]) => void;
  setEarthquakesStatus: (status: 'nominal' | 'offline') => void;

  // Divisional Meteorology Matrices from Open-Meteo
  divisionWeather: { [key: string]: { temp: number; wind: number; code: number } };
  divisionWeatherStatus: 'nominal' | 'offline';
  setDivisionWeather: (weather: { [key: string]: { temp: number; wind: number; code: number } }, status: 'nominal' | 'offline') => void;

  // Risk Score
  riskAnalysis: RiskAnalysis;
  setRiskAnalysis: (analysis: RiskAnalysis) => void;
}

const initialWeatherStations: WeatherStation[] = [
  {
    id: 'weather-dhaka',
    name: 'Dhaka Meteorology HQ',
    lat: 23.6850,
    lng: 90.3563,
    temperature: 31.5,
    humidity: 78,
    windSpeed: 14,
    windDirection: 180, // South wind
    condition: 'cloudy',
    pressure: 1008,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'weather-cox',
    name: 'Cox\'s Bazar Marine Center',
    lat: 21.4272,
    lng: 91.9702,
    temperature: 28.2,
    humidity: 94,
    windSpeed: 45, // Strong wind
    windDirection: 210, // South-Southwest
    condition: 'cyclonic',
    pressure: 994,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'weather-sylhet',
    name: 'Sylhet Hydrology Station',
    lat: 24.8949,
    lng: 91.8687,
    temperature: 26.8,
    humidity: 98,
    windSpeed: 18,
    windDirection: 135, // Southeast
    condition: 'stormy',
    pressure: 1002,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'weather-mongla',
    name: 'Mongla Port Radar Dome',
    lat: 22.4800,
    lng: 89.6000,
    temperature: 29.0,
    humidity: 88,
    windSpeed: 32,
    windDirection: 190,
    condition: 'rainy',
    pressure: 1004,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'weather-rajshahi',
    name: 'Rajshahi Agro-Met Observatory',
    lat: 24.3745,
    lng: 88.6011,
    temperature: 34.2,
    humidity: 58,
    windSpeed: 8,
    windDirection: 90, // East
    condition: 'sunny',
    pressure: 1011,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'weather-rangpur',
    name: 'Rangpur Northern Boundary Station',
    lat: 25.7439,
    lng: 89.2752,
    temperature: 30.1,
    humidity: 72,
    windSpeed: 12,
    windDirection: 120,
    condition: 'cloudy',
    pressure: 1009,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'weather-barisal',
    name: 'Barisal Coastal Tide Center',
    lat: 22.7010,
    lng: 90.3535,
    temperature: 29.5,
    humidity: 85,
    windSpeed: 24,
    windDirection: 200,
    condition: 'rainy',
    pressure: 1006,
    lastUpdated: new Date().toISOString(),
  }
];

export const useStore = create<MonitorState>((set) => ({
  // Initialize view precisely at Bangladesh center: Lat 23.6850, Lng 90.3563, Zoom 6.5
  viewState: {
    longitude: 90.3563,
    latitude: 23.6850,
    zoom: 6.5,
    pitch: 25,
    bearing: 0,
  },
  setViewState: (viewState) => set({ viewState }),

  // Layer toggles
  layersVisibility: {
    incidents: true,
    criticalAssets: true,
    shippingCorridors: true,
    waterways: true,
    weather: true,
    rssFeeds: true,
    aviation: true,
    fires: true,
    earthquakes: true,
  },
  toggleLayer: (layerKey) =>
    set((state) => ({
      layersVisibility: {
        ...state.layersVisibility,
        [layerKey]: !state.layersVisibility[layerKey],
      },
    })),

  // Operational Lists
  incidents: [],
  criticalAssets: [],
  news: [],
  setIncidents: (incidents) => set({ incidents }),
  setCriticalAssets: (criticalAssets) => set({ criticalAssets }),
  setNews: (news) => set({ news }),

  // Weather States
  weatherStations: initialWeatherStations,
  setWeatherStations: (weatherStations) => set({ weatherStations }),
  updateWeatherStations: () =>
    set((state) => {
      const updated = state.weatherStations.map((station) => {
        // Slightly fluctuate parameters dynamically to represent real-time updates
        const tempDelta = (Math.random() - 0.5) * 0.4;
        const windSpeedDelta = (Math.random() - 0.5) * 2;
        const windDirDelta = Math.floor((Math.random() - 0.5) * 10);
        const humidityDelta = Math.floor((Math.random() - 0.5) * 3);
        const pressureDelta = (Math.random() - 0.5) * 1;

        const nextTemp = Number((station.temperature + tempDelta).toFixed(1));
        const nextWindSpeed = Math.max(2, Number((station.windSpeed + windSpeedDelta).toFixed(1)));
        const nextWindDir = (station.windDirection + windDirDelta + 360) % 360;
        const nextHumidity = Math.max(30, Math.min(100, station.humidity + humidityDelta));
        const nextPressure = Math.round(station.pressure + pressureDelta);

        return {
          ...station,
          temperature: nextTemp,
          windSpeed: nextWindSpeed,
          windDirection: nextWindDir,
          humidity: nextHumidity,
          pressure: nextPressure,
          lastUpdated: new Date().toISOString(),
        };
      });
      return { weatherStations: updated };
    }),

  // RSS Feed states
  rssArticles: [],
  rssLoading: false,
  setRssArticles: (rssArticles) => set({ rssArticles }),
  setRssLoading: (rssLoading) => set({ rssLoading }),

  // News Intelligence topic selection
  selectedNewsTopic: null,
  setSelectedNewsTopic: (selectedNewsTopic) => set({ selectedNewsTopic }),

  // Selection Hover/Click Target
  selectedFeature: null,
  setSelectedFeature: (selectedFeature) => set({ selectedFeature }),

  // Timeline Control Slices
  timelineTime: Date.now(),
  timelineSpeed: 1,
  timelineIsPlaying: false,
  setTimelineTime: (timelineTime) => set({ timelineTime }),
  setTimelineSpeed: (timelineSpeed) => set({ timelineSpeed }),
  setTimelineIsPlaying: (timelineIsPlaying) => set({ timelineIsPlaying }),

  // Fuzzy Search Index states
  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  // BYOK States
  byokKey: '',
  byokProvider: 'groq',
  setByokKey: (byokKey) => set({ byokKey }),
  setByokProvider: (byokProvider) => set({ byokProvider }),

  // Map Mode
  mapMode: 'dark',
  setMapMode: (mapMode) => set({ mapMode }),

  // Live Async Dashboard Feeds
  aircrafts: [],
  aircraftsStatus: 'nominal',
  setAircrafts: (aircrafts) => set({ aircrafts }),
  setAircraftsStatus: (aircraftsStatus) => set({ aircraftsStatus }),

  fires: [],
  firesStatus: 'nominal',
  setFires: (fires) => set({ fires }),
  setFiresStatus: (firesStatus) => set({ firesStatus }),

  dsexValue: 5642.15,
  dsexChange: -12.45,
  dsexStatus: 'nominal',
  setDsexData: (dsexValue, dsexChange, dsexStatus) => set({ dsexValue, dsexChange, dsexStatus }),

  earthquakes: [],
  earthquakesStatus: 'nominal',
  setEarthquakes: (earthquakes) => set({ earthquakes }),
  setEarthquakesStatus: (earthquakesStatus) => set({ earthquakesStatus }),

  divisionWeather: {},
  divisionWeatherStatus: 'nominal',
  setDivisionWeather: (divisionWeather, divisionWeatherStatus) => set({ divisionWeather, divisionWeatherStatus }),

  // Subcontinental Risk Matrix
  riskAnalysis: {
    riskScore: 35,
    mean: 35,
    variance: 0,
    velocity: 0,
    trend: 'stable',
    breakdown: {
      military: 20,
      disaster: 15,
      geopolitical: 30,
      hydrology: 20,
    },
  },
  setRiskAnalysis: (riskAnalysis) => set({ riskAnalysis }),
}));

export default useStore;
