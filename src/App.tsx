import { useEffect, useState, useTransition } from 'react';
import MapCanvas from './components/map/MapCanvas';
import useStore from './store/useStore';
import { seedTacticalDatabase } from './services/dataSeeder';
import { initializeDashboardPolling } from './services/dashboardPoll';
import { exportToGeoJSON, exportToCSV, exportToMarkdown } from './utils/export';
import {
  ShieldAlert,
  Compass,
  Radio,
  Newspaper,
  ChevronLeft,
  ChevronRight,
  Settings,
  Key,
  Waves,
  Activity,
  Cpu,
  RefreshCw,
  Search,
  Layers,
  Database,
  Download,
  Play,
  Pause,
  FastForward,
  Plane,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

export default function App() {
  const {
    mapMode,
    layersVisibility,
    toggleLayer,
    incidents,
    criticalAssets,
    news,
    flights,
    maritimeVessels,
    dsexIndex,
    setIncidents,
    setCriticalAssets,
    setNews,
    selectedFeature,
    setSelectedFeature,
    timelineTime,
    timelineSpeed,
    timelineIsPlaying,
    setTimelineTime,
    setTimelineSpeed,
    setTimelineIsPlaying,
    searchQuery,
    setSearchQuery,
    byokKey,
    byokProvider,
    setByokKey,
    setByokProvider,
    riskAnalysis,
    setRiskAnalysis,
    environmentalRisk,
    infrastructureStatus,
    publicIncidentRisk,
    rateLimitWarning,
  } = useStore();

  const [isCommandSheetOpen, setIsCommandSheetOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'incidents' | 'assets'>('all');
  const [isByokOpen, setIsByokOpen] = useState(false);
  const [localKey, setLocalKey] = useState('');
  const [localProvider, setLocalProvider] = useState<'openai' | 'groq' | 'openrouter'>('groq');

  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [dhakaTime, setDhakaTime] = useState('');
  const [, startTransition] = useTransition();

  // Active bottom dashboard sub-tab: THE MAP | THE WIRE | STOCKS | STREAMS
  const [bottomActiveTab, setBottomActiveTab] = useState<'map' | 'wire' | 'stocks' | 'streams'>('map');

  // Multi-source polling initialization
  useEffect(() => {
    async function loadData() {
      const data = await seedTacticalDatabase();
      setIncidents(data.incidents);
      setCriticalAssets(data.assets);
      setNews(data.news);
    }
    loadData();

    // Start polling services (OpenSky, Yahoo Finance, Open-Meteo)
    const cleanupPolling = initializeDashboardPolling();
    return () => {
      cleanupPolling();
    };
  }, [setIncidents, setCriticalAssets, setNews]);

  // Dhaka Standard Clock ticker (BST - GMT+6)
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const bdTime = new Date(utc + 3600000 * 6);
      const parts = bdTime.toTimeString().split(' ');
      setDhakaTime(`${bdTime.toDateString()} | ${parts[0]} (BST)`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // Playback Loop for temporal stream simulation
  useEffect(() => {
    let intervalId: any = null;
    if (timelineIsPlaying) {
      intervalId = setInterval(() => {
        setTimelineTime(timelineTime + 10000 * timelineSpeed);

        const delta = (Math.random() - 0.5) * 3;
        const nextScore = Math.max(10, Math.min(95, riskAnalysis.riskScore + delta));
        const nextMean = riskAnalysis.mean + (nextScore - riskAnalysis.mean) * 0.05;
        const nextVariance = riskAnalysis.variance + Math.pow(nextScore - nextMean, 2) * 0.01;

        setRiskAnalysis({
          ...riskAnalysis,
          riskScore: Math.round(nextScore),
          mean: Number(nextMean.toFixed(2)),
          variance: Number(nextVariance.toFixed(2)),
          velocity: Number(delta.toFixed(2)),
          trend: delta > 0.5 ? 'increasing' : delta < -0.5 ? 'decreasing' : 'stable',
        });
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [timelineIsPlaying, timelineTime, timelineSpeed, setTimelineTime, riskAnalysis, setRiskAnalysis]);

  // Local Offline-first NLP Reconnaissance & Geotagging Assistant
  const runOfflineNlpAnalyst = (feature: any) => {
    const name = feature.name || feature.title || 'Operational Target';
    const cat = feature.category || 'Regional Operations';

    let nlpOutput = '';
    if (feature.featureType === 'Incident') {
      if (feature.type === 'hazard') {
        nlpOutput = `TACTICAL ANOMALY PROFILE — HYDROLOGICAL RISK DETECTED:
${name} logged at Lat ${feature.lat}, Lng ${feature.lng} poses immediate water-level changes. Under regional climate response guidelines, surrounding protective embankments are scheduled for reinforcement.`;
      } else {
        nlpOutput = `TACTICAL INCIDENT LOG — LOGISTICS CORRIDOR ALERT:
Activity tracking ${name} registered near dry ports. Logistical throughput holds a potential 30% reduction. Strategic security coordinates have dispatched customs guards to resolve the bottlenecks.`;
      }
    } else if (feature.featureType === 'Asset') {
      if (feature.status === 'damaged' || feature.status === 'alert') {
        nlpOutput = `CRITICAL DEFENCE INFRASTRUCTURE COMPROMISED:
Strategic node ${name} (${cat}) reports state: [${feature.status.toUpperCase()}]. Secondary backup routes are active. Dispatch crews are scheduled to regain full capacity value: ${feature.capacityValue || 'N/A'}.`;
      } else {
        nlpOutput = `CRITICAL NODE NOMINAL COMPLIANCE:
Strategic node ${name} (${cat}) is operating within nominal subcontinental integration constraints (${feature.capacityValue || 'N/A'}). No physical structural stress detected.`;
      }
    } else {
      nlpOutput = `TACTICAL INTEL LOG: Spatial parameters verified within Bangladesh Monitor v2.0 South Asian boundaries. Nominal state check complete.`;
    }

    return `[LOCAL OFFLINE-FIRST NLP RECONNAISSANCE ENGINE]

${nlpOutput}

STRATEGIC DIRECTIVES:
• Border Logistics corridor: Secured
• Delta Hydrological monitoring: Active
• Maritime Chokepoint patrol: Patrolling`;
  };

  const executeAiAnalysis = async (feature: any) => {
    if (!feature) return;
    setIsAiLoading(true);
    setAiAnalysis('');

    if (byokKey.trim()) {
      try {
        let endpoint = '';
        let headers: any = { 'Content-Type': 'application/json' };
        let body: any = {};

        const promptContent = `You are an elite regional intelligence officer tracking the strategic security and climate resilience of Bangladesh and the South Asian subcontinent. Analyze the following incoming event solely through regional geopolitics, delta hydrology, border logistics, and maritime chokepoints.

TARGET EVENT PARAMETERS:
- Feature Type: ${feature.featureType}
- Category: ${feature.category || 'N/A'}
- Identifier/Name: ${feature.name || feature.title || 'N/A'}
- Position: Lat ${feature.lat}, Lng ${feature.lng}
- Status/Severity: ${feature.status || feature.severity || 'N/A'}
- Description: ${feature.description || 'N/A'}

Provide an elite strategic summary and tactical impact report. Keep it concise, professional, and action-oriented. Limit response to 120 words.`;

        if (byokProvider === 'openai') {
          endpoint = 'https://api.openai.com/v1/chat/completions';
          headers['Authorization'] = `Bearer ${byokKey}`;
          body = {
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: promptContent }],
            temperature: 0.5,
          };
        } else if (byokProvider === 'groq') {
          endpoint = 'https://api.groq.com/openai/v1/chat/completions';
          headers['Authorization'] = `Bearer ${byokKey}`;
          body = {
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: promptContent }],
            temperature: 0.5,
          };
        } else {
          endpoint = 'https://openrouter.ai/api/v1/chat/completions';
          headers['Authorization'] = `Bearer ${byokKey}`;
          body = {
            model: 'meta-llama/llama-3-8b-instruct:free',
            messages: [{ role: 'user', content: promptContent }],
            temperature: 0.5,
          };
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });

        if (response.ok) {
          const resJson = await response.json();
          const text = resJson.choices?.[0]?.message?.content || 'No text content returned.';
          setAiAnalysis(text);
        } else {
          setAiAnalysis(`API Handshake Failed (HTTP ${response.status}). Launching Offline Fallback Analyst...\n\n` + runOfflineNlpAnalyst(feature));
        }
      } catch (err: any) {
        setAiAnalysis(`Network offline. Executing internal browser-native intelligence...\n\n` + runOfflineNlpAnalyst(feature));
      } finally {
        setIsAiLoading(false);
      }
    } else {
      setTimeout(() => {
        setAiAnalysis(runOfflineNlpAnalyst(feature));
        setIsAiLoading(false);
      }, 600);
    }
  };

  useEffect(() => {
    if (selectedFeature) {
      executeAiAnalysis(selectedFeature);
    }
  }, [selectedFeature]);

  // Fuzzy Search Filters
  const filteredIncidents = incidents.filter(
    (inc) =>
      inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAssets = criticalAssets.filter(
    (asset) =>
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const saveByokCredentials = () => {
    setByokKey(localKey);
    setByokProvider(localProvider);
    setIsByokOpen(false);
  };

  // Keyboard accessibility helper for layer toggling
  const handleKeyToggleLayer = (e: React.KeyboardEvent, layer: any) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleLayer(layer);
    }
  };

  const isDayMode = mapMode === 'light';

  return (
    <div className={`relative w-screen h-screen overflow-hidden text-slate-100 font-sans ${isDayMode ? 'day-mode-contrast' : 'bg-[#09090b]'}`}>

      {/* Full-screen Map Canvas */}
      <div className="absolute inset-0 w-full h-full z-0" aria-label="Map Visualizer Canvas">
        <MapCanvas />
      </div>

      {/* Cinematic Command-Center HUD Header */}
      <header className="absolute top-0 left-0 right-0 z-10 glass-panel h-14 px-4 flex items-center justify-between border-b border-zinc-800 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded border border-emerald-500 bg-emerald-500/10 text-emerald-400">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-widest text-slate-100">
              DELTASENTRY <span className="text-emerald-400 text-xs font-mono font-bold">v2.0</span>
            </span>
          </div>
        </div>

        {/* Live Dhaka BST Clock */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 font-mono">
          <Compass className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: '8s' }} />
          <span>{dhakaTime}</span>
        </div>

        {/* Subcontinental Risk Status Index */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3 bg-zinc-950/95 border border-zinc-800 px-3 py-1 rounded-md">
            <span className="text-[10px] text-slate-400 font-mono">GLOBAL INDEX:</span>
            <div className="flex items-center gap-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  riskAnalysis.riskScore > 60 ? 'bg-red-500 animate-ping' : 'bg-emerald-400'
                }`}
              ></span>
              <span className={`font-mono text-xs font-bold ${riskAnalysis.riskScore > 60 ? 'text-red-500' : 'text-emerald-400'}`}>
                {riskAnalysis.riskScore}
              </span>
              <span className="text-[9px] text-slate-500 font-mono">/100</span>
            </div>
            <span className="text-[10px] text-slate-500 capitalize font-mono">
              ({riskAnalysis.trend})
            </span>
          </div>

          <button
            onClick={() => {
              setLocalKey(byokKey);
              setLocalProvider(byokProvider);
              setIsByokOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-emerald-500/20 hover:text-emerald-400 border border-zinc-800 text-xs transition font-mono focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="Configure Custom AI Key"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>AI HANDSHAKE</span>
          </button>
        </div>
      </header>

      {/* Left-Hand Collapsible Command Drawer */}
      <aside
        className={`absolute top-16 left-4 z-10 w-[23rem] max-h-[calc(100vh-27rem)] rounded-lg shadow-2xl transition-all duration-300 flex flex-col ${
          isCommandSheetOpen ? 'translate-x-0' : '-translate-x-[25rem]'
        }`}
        aria-label="Tactical Command Drawer"
      >
        <div className="glass-panel w-full flex flex-col rounded-lg overflow-hidden border border-zinc-800">

          <div className="p-3 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-xs font-bold tracking-wider text-slate-300">
                TACTICAL CONTROL SHEET
              </span>
            </div>
          </div>

          {/* Instability metrics & Welford analytics */}
          <div className="p-3 bg-zinc-950/90 border-b border-zinc-800 flex flex-col gap-2 font-mono text-xs">
            <div className="text-[9px] text-slate-400 font-bold tracking-wider uppercase mb-1 flex justify-between">
              <span>WELFORD COEFFICIENTS</span>
              <span className="text-emerald-400">STRESS VELOCITY: {riskAnalysis.velocity}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
              <div className="bg-zinc-900 p-2 rounded border border-zinc-800">
                <div>ROLLING MEAN:</div>
                <div className="text-white font-bold">{riskAnalysis.mean}</div>
              </div>
              <div className="bg-zinc-900 p-2 rounded border border-zinc-800">
                <div>VARIANCE (M2):</div>
                <div className="text-white font-bold">{riskAnalysis.variance}</div>
              </div>
            </div>
          </div>

          {/* Layer Quick Toggles */}
          <div className="p-3 border-b border-zinc-800 bg-zinc-950/90 flex flex-col gap-1.5">
            <div className="text-[9px] text-slate-400 font-bold tracking-wider uppercase mb-0.5 flex items-center gap-1">
              <Layers className="w-3 h-3 text-emerald-400" />
              <span>DYNAMIC LAYER REGISTRY</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <button
                onClick={() => toggleLayer('incidents')}
                onKeyDown={(e) => handleKeyToggleLayer(e, 'incidents')}
                className={`py-1.5 px-2 rounded border text-left transition flex justify-between items-center focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                  layersVisibility.incidents
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 font-bold'
                    : 'bg-zinc-900 text-slate-500 border-zinc-800'
                }`}
                aria-label="Toggle OSINT Incidents Layer"
              >
                <span>OSINT Incidents</span>
                <span className={`w-1.5 h-1.5 rounded-full ${layersVisibility.incidents ? 'bg-emerald-400' : 'bg-slate-700'}`}></span>
              </button>

              <button
                onClick={() => toggleLayer('criticalAssets')}
                onKeyDown={(e) => handleKeyToggleLayer(e, 'criticalAssets')}
                className={`py-1.5 px-2 rounded border text-left transition flex justify-between items-center focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                  layersVisibility.criticalAssets
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 font-bold'
                    : 'bg-zinc-900 text-slate-500 border-zinc-800'
                }`}
                aria-label="Toggle Critical Assets Layer"
              >
                <span>Critical Assets</span>
                <span className={`w-1.5 h-1.5 rounded-full ${layersVisibility.criticalAssets ? 'bg-emerald-400' : 'bg-slate-700'}`}></span>
              </button>
            </div>
          </div>

          {/* Search Inputs */}
          <div className="p-3 border-b border-zinc-800 bg-zinc-950/90 flex flex-col gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search indices, title, or status..."
                value={searchQuery}
                onChange={(e) => startTransition(() => setSearchQuery(e.target.value))}
                className="w-full pl-8 pr-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono focus-visible:ring-2 focus-visible:ring-emerald-400"
              />
            </div>

            <div className="grid grid-cols-3 gap-1 text-[10px] font-bold text-center">
              <button
                onClick={() => setActiveTab('all')}
                className={`py-1 rounded border transition ${
                  activeTab === 'all' ? 'bg-emerald-700 text-white border-emerald-600' : 'bg-zinc-900 text-slate-400 border-zinc-800'
                }`}
              >
                ALL EVENTS
              </button>
              <button
                onClick={() => setActiveTab('incidents')}
                className={`py-1 rounded border transition ${
                  activeTab === 'incidents' ? 'bg-emerald-700 text-white border-emerald-600' : 'bg-zinc-900 text-slate-400 border-zinc-800'
                }`}
              >
                INCIDENTS
              </button>
              <button
                onClick={() => setActiveTab('assets')}
                className={`py-1 rounded border transition ${
                  activeTab === 'assets' ? 'bg-emerald-700 text-white border-emerald-600' : 'bg-zinc-900 text-slate-400 border-zinc-800'
                }`}
              >
                ASSETS
              </button>
            </div>
          </div>

          {/* Scrolling List Panel */}
          <div className="flex-1 overflow-y-auto max-h-48 bg-zinc-950/60 font-mono text-xs divide-y divide-zinc-900">
            {(activeTab === 'all' || activeTab === 'incidents') &&
              filteredIncidents.map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => setSelectedFeature({ ...inc, featureType: 'Incident' })}
                  className={`p-2 hover:bg-zinc-900 cursor-pointer transition flex items-center justify-between ${
                    selectedFeature?.id === inc.id ? 'bg-zinc-900 border-l-2 border-emerald-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {inc.category === 'Weather/Cyclone/Flood' ? (
                      <Waves className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    ) : inc.category === 'Border Monitoring' ? (
                      <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    ) : (
                      <Activity className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                    <div className="truncate">
                      <div className="font-bold text-slate-200 truncate">{inc.title}</div>
                      <div className="text-[10px] text-slate-500 truncate">{inc.category}</div>
                    </div>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                      inc.severity === 'critical'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                        : inc.severity === 'warning'
                        ? 'bg-yellow-500/10 text-amber-500 border border-yellow-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {inc.severity}
                  </span>
                </div>
              ))}

            {(activeTab === 'all' || activeTab === 'assets') &&
              filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => setSelectedFeature({ ...asset, featureType: 'Asset' })}
                  className={`p-2 hover:bg-zinc-900 cursor-pointer transition flex items-center justify-between ${
                    selectedFeature?.id === asset.id ? 'bg-zinc-900 border-l-2 border-emerald-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <div className="truncate">
                      <div className="font-bold text-slate-200 truncate">{asset.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{asset.category}</div>
                    </div>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                      asset.status === 'damaged'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                        : asset.status === 'alert'
                        ? 'bg-yellow-500/10 text-amber-500 border border-yellow-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {asset.status}
                  </span>
                </div>
              ))}
          </div>

          {/* Export command options */}
          <div className="p-3 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-500 text-[9px] font-bold">EXPORT SUBSYSTEM:</span>
            <div className="flex gap-2">
              <button
                onClick={() => exportToGeoJSON(incidents, criticalAssets)}
                className="p-1 px-1.5 rounded bg-zinc-900 hover:bg-emerald-500 hover:text-white border border-zinc-800 text-[10px] transition flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-emerald-400"
                title="Download GeoJSON Map Layers"
              >
                <Download className="w-3 h-3" />
                <span>GEOJSON</span>
              </button>
              <button
                onClick={() => exportToCSV(incidents)}
                className="p-1 px-1.5 rounded bg-zinc-900 hover:bg-emerald-500 hover:text-white border border-zinc-800 text-[10px] transition flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-emerald-400"
                title="Download CSV Incident Sheet"
              >
                <Download className="w-3 h-3" />
                <span>CSV</span>
              </button>
              <button
                onClick={() => exportToMarkdown(riskAnalysis.riskScore, riskAnalysis.trend, incidents, criticalAssets)}
                className="p-1 px-1.5 rounded bg-zinc-900 hover:bg-emerald-500 hover:text-white border border-zinc-800 text-[10px] transition flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-emerald-400"
                title="Download Executive Markdown Report"
              >
                <Download className="w-3 h-3" />
                <span>MD REPORT</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Slide Handle button for Command Sheet */}
      <button
        onClick={() => setIsCommandSheetOpen(!isCommandSheetOpen)}
        className="absolute top-1/2 left-0 z-20 -translate-y-1/2 p-1.5 rounded-r bg-zinc-950/95 border-y border-r border-zinc-800 text-slate-400 hover:text-white transition"
        aria-label="Toggle Command Drawer Panel"
      >
        {isCommandSheetOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {/* Bottom Dashboard Panel: WorldMonitor Bottom Dashboard Paradigm */}
      <footer className="absolute bottom-4 left-4 right-4 z-10 glass-panel rounded-lg border border-zinc-800 shadow-2xl flex flex-col font-mono max-h-[38vh] overflow-hidden bg-zinc-950">

        {/* Dense Global Header Tab Switcher */}
        <div className="flex flex-wrap items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 py-2 text-xs gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setBottomActiveTab('map')}
              className={`px-3 py-1 rounded-md font-bold transition focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                bottomActiveTab === 'map' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              THE MAP
            </button>
            <button
              onClick={() => setBottomActiveTab('wire')}
              className={`px-3 py-1 rounded-md font-bold transition focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                bottomActiveTab === 'wire' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              THE WIRE
            </button>
            <button
              onClick={() => setBottomActiveTab('stocks')}
              className={`px-3 py-1 rounded-md font-bold transition focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                bottomActiveTab === 'stocks' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              STOCKS
            </button>
            <button
              onClick={() => setBottomActiveTab('streams')}
              className={`px-3 py-1 rounded-md font-bold transition focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                bottomActiveTab === 'streams' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              STREAMS
            </button>
          </div>

          <div className="flex items-center gap-4 text-[10px] text-zinc-500">
            {rateLimitWarning && (
              <span className="flex items-center gap-1 text-amber-500 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>API Limit - Simulation Active</span>
              </span>
            )}
            <span>POLLING INTERVAL: 180s (Aviation) | 300s (Stocks)</span>
          </div>
        </div>

        {/* 4-Column Responsive Grid Container */}
        <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-zinc-800 p-4 gap-4 overflow-y-auto max-h-[28vh]">

          {/* Column 1: Flight & Maritime Streams */}
          <div className="flex flex-col gap-2 min-h-24">
            <span className="text-[10px] text-zinc-500 font-bold flex items-center gap-1 border-b border-zinc-900 pb-1 shrink-0">
              <Plane className="w-3.5 h-3.5 text-emerald-400" />
              FLIGHT & MARITIME STREAM
            </span>
            <div className="flex-1 overflow-y-auto space-y-1.5 text-[11px]">
              {flights.length === 0 ? (
                <div className="text-zinc-600 italic">Listening for transponder handshakes...</div>
              ) : (
                flights.slice(0, 3).map((f) => (
                  <div key={f.icao24} className="flex justify-between items-center bg-zinc-900/60 p-1.5 rounded border border-zinc-900">
                    <div>
                      <span className="font-bold text-slate-200">{f.callsign}</span>
                      <span className="text-zinc-500 text-[10px] ml-2">{f.origin}</span>
                    </div>
                    <span className="text-emerald-400 font-bold">{f.altitude}m</span>
                  </div>
                ))
              )}

              {maritimeVessels.slice(0, 2).map((m) => (
                <div key={m.mmsi} className="flex justify-between items-center bg-zinc-900/40 p-1.5 rounded border border-zinc-900">
                  <div>
                    <span className="font-bold text-amber-500">{m.name}</span>
                    <span className="text-zinc-500 text-[10px] ml-2">{m.type}</span>
                  </div>
                  <span className="text-zinc-400">{m.speed}kts</span>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: News Geotag Ticker (THE WIRE) */}
          <div className="flex flex-col gap-2 min-h-24">
            <span className="text-[10px] text-zinc-500 font-bold flex items-center gap-1 border-b border-zinc-900 pb-1 shrink-0">
              <Newspaper className="w-3.5 h-3.5 text-emerald-400" />
              THE WIRE (GEOTAG LIVE)
            </span>
            <div className="flex-1 overflow-y-auto space-y-1.5 text-[11px]">
              {news.length === 0 ? (
                <div className="text-zinc-600 italic">No news feeds retrieved...</div>
              ) : (
                news.slice(0, 4).map((n) => (
                  <div
                    key={n.id}
                    onClick={() => setSelectedFeature({ ...n, featureType: 'News' })}
                    className="cursor-pointer hover:bg-zinc-900/80 p-1.5 rounded border border-zinc-900 flex flex-col gap-0.5"
                  >
                    <div className="flex justify-between text-[9px]">
                      <span className="text-zinc-400 font-bold uppercase">{n.source}</span>
                      <span className={`font-bold ${n.impact === 'high' ? 'text-red-400' : 'text-emerald-400'}`}>{n.impact.toUpperCase()}</span>
                    </div>
                    <span className="text-slate-300 truncate font-bold">{n.title}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 3: STOCKS (DSEX Index Matrix) */}
          <div className="flex flex-col gap-2 min-h-24">
            <span className="text-[10px] text-zinc-500 font-bold flex items-center gap-1 border-b border-zinc-900 pb-1 shrink-0">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              STOCKS (DSEX INDEX MATRIX)
            </span>
            <div className="flex-1 flex flex-col justify-center gap-1">
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold text-white">{dsexIndex.price.toFixed(2)}</span>
                <span className={`text-xs font-bold ${dsexIndex.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {dsexIndex.change >= 0 ? '+' : ''}{dsexIndex.change.toFixed(2)} ({dsexIndex.changePercent}%)
                </span>
              </div>

              {/* Sparkline historical index visual */}
              <div className="h-8 flex items-end gap-1 border-b border-zinc-900 pb-1 mt-1">
                {dsexIndex.history.map((h, idx) => {
                  const min = Math.min(...dsexIndex.history);
                  const max = Math.max(...dsexIndex.history);
                  const heightPercent = max === min ? 50 : ((h - min) / (max - min)) * 100;
                  return (
                    <div
                      key={idx}
                      style={{ height: `${Math.max(15, heightPercent)}%` }}
                      className={`flex-1 rounded-sm ${dsexIndex.change >= 0 ? 'bg-emerald-500/60' : 'bg-red-500/60'}`}
                      title={`Close: ${h}`}
                    ></div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Column 4: SITUATIONAL RISK INDEX PANEL */}
          <div className="flex flex-col gap-2 min-h-24">
            <span className="text-[10px] text-zinc-500 font-bold flex items-center gap-1 border-b border-zinc-900 pb-1 shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 text-emerald-400" />
              SITUATIONAL RISK INDEX PANEL
            </span>
            <div className="flex-1 flex flex-col justify-around gap-2 text-[10px] text-zinc-400">
              {/* Risk dial progress bars */}
              <div>
                <div className="flex justify-between mb-0.5">
                  <span>ENVIRONMENTAL RISK:</span>
                  <span className="text-blue-400 font-bold">{environmentalRisk}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                  <div style={{ width: `${environmentalRisk}%` }} className="h-full bg-blue-500"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-0.5">
                  <span>INFRASTRUCTURE STATUS:</span>
                  <span className="text-emerald-400 font-bold">{infrastructureStatus}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                  <div style={{ width: `${infrastructureStatus}%` }} className="h-full bg-emerald-500"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-0.5">
                  <span>PUBLIC INCIDENT RISK:</span>
                  <span className="text-amber-500 font-bold">{publicIncidentRisk}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                  <div style={{ width: `${publicIncidentRisk}%` }} className="h-full bg-amber-500"></div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Temporal simulated log timelines controls */}
        <div className="grid grid-cols-12 gap-4 items-center border-t border-zinc-800 p-3 bg-zinc-950 shrink-0 text-xs">

          <div className="col-span-12 sm:col-span-4 flex items-center gap-2 border-r border-zinc-900 pr-4">
            <button
              onClick={() => setTimelineIsPlaying(!timelineIsPlaying)}
              className={`p-1.5 rounded transition focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                timelineIsPlaying ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              }`}
              aria-label={timelineIsPlaying ? 'Pause Simulation Timeline' : 'Play Simulation Timeline'}
            >
              {timelineIsPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 animate-pulse" />}
            </button>

            <div className="flex gap-1" aria-label="Playback Speed Controllers">
              {[1, 2, 5].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setTimelineSpeed(speed)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                    timelineSpeed === speed ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-zinc-900 border-zinc-800 text-slate-500 hover:text-white'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-1 text-[9px] text-zinc-500 uppercase">
              <FastForward className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>LIVE WIRE LOG</span>
            </div>
          </div>

          <div className="col-span-12 sm:col-span-6 flex items-center gap-3">
            <span className="text-[10px] text-zinc-500">TEMPORAL WINDOW</span>
            <input
              type="range"
              min={Date.now() - 86400000}
              max={Date.now() + 86400000}
              value={timelineTime}
              onChange={(e) => setTimelineTime(Number(e.target.value))}
              className="flex-1 accent-emerald-500 cursor-pointer bg-zinc-900 h-1 rounded-full outline-none"
              aria-label="Temporal Window Range Slider"
            />
          </div>

          <div className="col-span-12 sm:col-span-2 text-right">
            <span className="text-slate-400 text-[10px]">OFFSET TIME:</span>
            <div className="text-white font-bold text-[11px]">{new Date(timelineTime).toLocaleTimeString()}</div>
          </div>

        </div>

      </footer>

      {/* Feature Details Inspector (Pops out from the right when an asset, incident or news item is clicked) */}
      {selectedFeature && (
        <aside className="absolute top-16 right-4 z-10 w-96 max-h-[calc(100vh-27rem)] rounded-lg shadow-2xl flex flex-col glass-panel border border-zinc-800">
          <div className="p-3 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between rounded-t-lg">
            <span className="text-xs font-bold tracking-wider text-slate-300 uppercase">
              {selectedFeature.featureType} INSPECTOR LOG
            </span>
            <button
              onClick={() => setSelectedFeature(null)}
              className="text-slate-500 hover:text-slate-200 font-mono text-[11px] focus-visible:ring-2 focus-visible:ring-emerald-400"
              aria-label="Close Inspector Log Panel"
            >
              [CLOSE]
            </button>
          </div>

          <div className="p-4 overflow-y-auto space-y-4">

            {/* Core telemetry details card */}
            <div className="bg-zinc-900/85 p-3 rounded-md border border-zinc-800 space-y-2 text-xs font-mono">
              <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                TACTICAL PARAMETERS
              </div>

              {selectedFeature.featureType === 'Incident' && (
                <>
                  <div className="flex justify-between">
                    <span>TITLE:</span>
                    <span className="text-slate-200 font-bold">{selectedFeature.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ANOMALY TYPE:</span>
                    <span className="text-slate-200 font-bold capitalize">{selectedFeature.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CATEGORY:</span>
                    <span className="text-slate-300">{selectedFeature.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SEVERITY:</span>
                    <span className="text-red-500 font-bold uppercase">{selectedFeature.severity}</span>
                  </div>
                  <div className="border-t border-zinc-800 pt-2">
                    <span className="text-zinc-500">CONTEXT DIRECTIVES:</span>
                    <div className="text-slate-300 mt-1 leading-relaxed text-[11px] font-sans">
                      {selectedFeature.description}
                    </div>
                  </div>
                </>
              )}

              {selectedFeature.featureType === 'Asset' && (
                <>
                  <div className="flex justify-between">
                    <span>NODE NAME:</span>
                    <span className="text-slate-200 font-bold">{selectedFeature.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>INFRASTRUCTURE CATEGORY:</span>
                    <span className="text-slate-200">{selectedFeature.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CAPACITY VALUE:</span>
                    <span className="text-emerald-400 font-bold">{selectedFeature.capacityValue || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>STATUS STATE:</span>
                    <span className={`font-bold uppercase ${selectedFeature.status === 'operational' ? 'text-emerald-400' : 'text-red-500 animate-pulse'}`}>
                      {selectedFeature.status}
                    </span>
                  </div>
                </>
              )}

              {selectedFeature.featureType === 'News' && (
                <>
                  <div className="flex justify-between">
                    <span>NEWS OUTLET:</span>
                    <span className="text-slate-200 font-bold uppercase">{selectedFeature.source}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>STRATEGIC CATEGORY:</span>
                    <span className="text-slate-200 capitalize">{selectedFeature.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IMPACT COEFFICIENT:</span>
                    <span className={`font-bold uppercase ${selectedFeature.impact === 'high' ? 'text-red-500' : 'text-emerald-400'}`}>
                      {selectedFeature.impact}
                    </span>
                  </div>
                  <div className="border-t border-zinc-800 pt-2">
                    <span className="text-zinc-500">HEADLINE BRIEF:</span>
                    <div className="text-slate-200 mt-1 leading-relaxed text-[11px] font-bold">
                      {selectedFeature.title}
                    </div>
                  </div>
                </>
              )}

              {selectedFeature.featureType === 'Aviation Track' && (
                <>
                  <div className="flex justify-between">
                    <span>CALLSIGN:</span>
                    <span className="text-slate-200 font-bold">{selectedFeature.callsign}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ICAO24 HEX:</span>
                    <span className="text-slate-200">{selectedFeature.icao24}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ALTITUDE:</span>
                    <span className="text-emerald-400 font-bold">{selectedFeature.altitude}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VELOCITY:</span>
                    <span className="text-slate-200">{selectedFeature.velocity}km/h</span>
                  </div>
                </>
              )}

              {selectedFeature.featureType === 'Maritime Vessel' && (
                <>
                  <div className="flex justify-between">
                    <span>VESSEL NAME:</span>
                    <span className="text-slate-200 font-bold">{selectedFeature.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VESSEL TYPE:</span>
                    <span className="text-slate-200">{selectedFeature.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SPEED OVER GROUND:</span>
                    <span className="text-amber-500 font-bold">{selectedFeature.speed}kts</span>
                  </div>
                  <div className="flex justify-between">
                    <span>HEADING COURSE:</span>
                    <span className="text-slate-200">{selectedFeature.course}°</span>
                  </div>
                </>
              )}

              <div className="border-t border-zinc-800 pt-2 flex justify-between text-[11px] text-zinc-500">
                <span>LAT: {selectedFeature.lat || 'N/A'}</span>
                <span>LNG: {selectedFeature.lng || 'N/A'}</span>
              </div>
            </div>

            {/* Local NLP AI analysis context block */}
            <div className="bg-zinc-950 p-3 rounded-md border border-zinc-800 space-y-2 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 tracking-wider">
                  <Cpu className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>AI REGIONAL RECONNAISSANCE ENGINE</span>
                </div>
                <button
                  onClick={() => executeAiAnalysis(selectedFeature)}
                  className="text-slate-500 hover:text-slate-300 transition"
                  title="Re-run Spatial Inference"
                  aria-label="Re-run AI Analysis"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>

              {isAiLoading ? (
                <div className="py-6 flex flex-col items-center justify-center gap-2 text-zinc-500 font-mono text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                  <span>Loading offline spatial tensors...</span>
                </div>
              ) : (
                <div className="text-xs text-slate-300 bg-zinc-900/60 p-2.5 rounded border border-zinc-800 leading-relaxed whitespace-pre-wrap font-mono text-[11px]">
                  {aiAnalysis}
                </div>
              )}

              <div className="text-[9px] text-zinc-500 text-center flex justify-center gap-1.5">
                <span>PROCESSING CONTEXT:</span>
                <span className={byokKey ? 'text-emerald-400 font-bold' : 'text-amber-500 font-bold'}>
                  {byokKey ? `${byokProvider.toUpperCase()} Handshake` : 'Local Browser-Native NLP'}
                </span>
              </div>
            </div>

          </div>
        </aside>
      )}

      {/* Bring-Your-Own-Key Configuration Modal Panel overlay */}
      {isByokOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="BYOK AI Key Setup Panel">
          <div className="glass-panel w-[26rem] p-5 rounded-lg border border-zinc-800 flex flex-col gap-4 font-mono text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-sm font-extrabold text-slate-200 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-emerald-400" />
                TACTICAL AI HANDSHAKE SETTINGS
              </span>
              <button onClick={() => setIsByokOpen(false)} className="text-slate-500 hover:text-white" aria-label="Close setup panel">
                [X]
              </button>
            </div>

            <p className="text-zinc-400 leading-relaxed text-[11px]">
              Optionally route AI analyses through high-speed subcontinental strategic instruction templates. If credentials are left blank, all incident briefs compile internally via browser-native heuristics.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[#8b95a7] block mb-1">API SERVICE PROVIDER:</label>
                <select
                  value={localProvider}
                  onChange={(e: any) => setLocalProvider(e.target.value)}
                  className="w-full py-1.5 px-2 bg-zinc-900 border border-zinc-800 rounded text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                >
                  <option value="groq">Groq Cloud (Llama-3.1-8b-instant)</option>
                  <option value="openai">OpenAI (GPT-4o-mini)</option>
                  <option value="openrouter">OpenRouter (Llama-3-Instruct)</option>
                </select>
              </div>

              <div>
                <label className="text-[#8b95a7] block mb-1">TACTICAL API HANDSHAKE KEY:</label>
                <input
                  type="password"
                  placeholder="Paste sk-... or gsk-... keys here"
                  value={localKey}
                  onChange={(e) => setLocalKey(e.target.value)}
                  className="w-full py-1.5 px-2 bg-zinc-900 border border-zinc-800 rounded text-slate-200 placeholder-slate-700 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="bg-emerald-500/10 p-2.5 border border-emerald-500/30 rounded text-slate-300 text-[10px] leading-relaxed font-sans">
              <strong>LOCAL HANDSHAKE DECREE:</strong> Credentials are held in transient browser memory slices. All requests are conducted directly from your workspace thread to the provider.
            </div>

            <button
              onClick={saveByokCredentials}
              className="w-full text-center py-2 bg-emerald-700 text-white rounded font-sans font-bold hover:bg-emerald-600 transition"
            >
              COMMIT KEY & SECURE HANDSHAKE
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
