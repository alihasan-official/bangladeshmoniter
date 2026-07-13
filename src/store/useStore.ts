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
  };
  toggleLayer: (layerKey: 'incidents' | 'criticalAssets' | 'shippingCorridors' | 'waterways') => void;

  // Active Telemetry/Operational Data
  incidents: DBIncident[];
  criticalAssets: DBCriticalAsset[];
  news: DBOperationalNews[];
  setIncidents: (incidents: DBIncident[]) => void;
  setCriticalAssets: (assets: DBCriticalAsset[]) => void;
  setNews: (news: DBOperationalNews[]) => void;

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

  // Risk Score
  riskAnalysis: RiskAnalysis;
  setRiskAnalysis: (analysis: RiskAnalysis) => void;
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

  // Layer toggles
  layersVisibility: {
    incidents: true,
    criticalAssets: true,
    shippingCorridors: true,
    waterways: true,
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
}));

export default useStore;
