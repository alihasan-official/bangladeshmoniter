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

export interface Flight {
  icao24: string;
  callsign: string;
  origin: string;
  altitude: number;
  velocity: number;
  lat: number;
  lng: number;
  onGround: boolean;
}

export interface MaritimeVessel {
  mmsi: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  speed: number;
  course: number;
  status: string;
}

export interface DSEXData {
  price: number;
  change: number;
  changePercent: number;
  history: number[];
}

interface MonitorState {
  // Map View & Theme
  viewState: ViewState;
  setViewState: (viewState: ViewState) => void;
  mapMode: 'dark' | 'light';
  setMapMode: (mode: 'dark' | 'light') => void;

  // Layer Visibility
  layersVisibility: {
    incidents: boolean;
    criticalAssets: boolean;
    shippingCorridors: boolean;
    waterways: boolean;
    weatherRadar: boolean;
    windVectors: boolean;
  };
  toggleLayer: (layerKey: 'incidents' | 'criticalAssets' | 'shippingCorridors' | 'waterways' | 'weatherRadar' | 'windVectors') => void;

  // Active Telemetry/Operational Data
  incidents: DBIncident[];
  criticalAssets: DBCriticalAsset[];
  news: DBOperationalNews[];
  setIncidents: (incidents: DBIncident[]) => void;
  setCriticalAssets: (assets: DBCriticalAsset[]) => void;
  setNews: (news: DBOperationalNews[]) => void;

  // Live Feeds
  flights: Flight[];
  setFlights: (flights: Flight[]) => void;
  maritimeVessels: MaritimeVessel[];
  setMaritimeVessels: (vessels: MaritimeVessel[]) => void;
  dsexIndex: DSEXData;
  setDsexIndex: (dsex: DSEXData) => void;

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

  // Risk Scores & Dials
  riskAnalysis: RiskAnalysis;
  setRiskAnalysis: (analysis: RiskAnalysis) => void;
  environmentalRisk: number;
  setEnvironmentalRisk: (val: number) => void;
  infrastructureStatus: number;
  setInfrastructureStatus: (val: number) => void;
  publicIncidentRisk: number;
  setPublicIncidentRisk: (val: number) => void;

  // Rate Limiting Indicators
  rateLimitWarning: boolean;
  setRateLimitWarning: (val: boolean) => void;
}

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
  mapMode: 'dark',
  setMapMode: (mapMode) => set({ mapMode }),

  // Layer toggles
  layersVisibility: {
    incidents: true,
    criticalAssets: true,
    shippingCorridors: true,
    waterways: true,
    weatherRadar: true,
    windVectors: true,
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

  // Live Feeds
  flights: [],
  setFlights: (flights) => set({ flights }),
  maritimeVessels: [
    { mmsi: '405000123', name: 'MV MADHUMATI', type: 'Cargo', lat: 21.4, lng: 89.9, speed: 12.4, course: 180, status: 'Under Way' },
    { mmsi: '405000456', name: 'BNS SHAPLA', type: 'Military', lat: 21.0, lng: 91.2, speed: 18.2, course: 95, status: 'Patrolling' },
    { mmsi: '405000789', name: 'BULLDOG TUG', type: 'Tug', lat: 22.2, lng: 91.75, speed: 4.1, course: 220, status: 'Moored' },
  ],
  setMaritimeVessels: (maritimeVessels) => set({ maritimeVessels }),
  dsexIndex: {
    price: 5750.45,
    change: 15.20,
    changePercent: 0.26,
    history: [5720, 5732, 5715, 5740, 5735, 5750],
  },
  setDsexIndex: (dsexIndex) => set({ dsexIndex }),

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

  environmentalRisk: 42,
  setEnvironmentalRisk: (environmentalRisk) => set({ environmentalRisk }),
  infrastructureStatus: 85,
  setInfrastructureStatus: (infrastructureStatus) => set({ infrastructureStatus }),
  publicIncidentRisk: 30,
  setPublicIncidentRisk: (publicIncidentRisk) => set({ publicIncidentRisk }),

  rateLimitWarning: false,
  setRateLimitWarning: (rateLimitWarning) => set({ rateLimitWarning }),
}));

export default useStore;
