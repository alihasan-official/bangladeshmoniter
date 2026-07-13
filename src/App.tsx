import { useEffect, useState, useTransition } from 'react';
import MapCanvas from './components/map/MapCanvas';
import useStore from './store/useStore';
import { seedTacticalDatabase } from './services/dataSeeder';
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
} from 'lucide-react';

export default function App() {
  const {
    layersVisibility,
    toggleLayer,
    incidents,
    criticalAssets,
    news,
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
  } = useStore();

  const [isCommandSheetOpen, setIsCommandSheetOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'incidents' | 'assets'>('all');
  const [isByokOpen, setIsByokOpen] = useState(false);
  const [localKey, setLocalKey] = useState('');
  const [localProvider, setLocalProvider] = useState<'openai' | 'groq' | 'openrouter'>('groq');

  // AI summary states
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Time metrics
  const [dhakaTime, setDhakaTime] = useState('');
  const [, startTransition] = useTransition();

  // 1. Load Seed Data from IndexedDB into Zustand Store on startup
  useEffect(() => {
    async function loadData() {
      const data = await seedTacticalDatabase();
      setIncidents(data.incidents);
      setCriticalAssets(data.assets);
      setNews(data.news);
    }
    loadData();
  }, [setIncidents, setCriticalAssets, setNews]);

  // 2. Continuous time ticking in Dhaka Standard Time (GMT+6)
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

  // 3. Simulated Playback Loop for Tactical Timeline Scrubbing
  useEffect(() => {
    let intervalId: any = null;
    if (timelineIsPlaying) {
      intervalId = setInterval(() => {
        // Step time forward by 10 seconds multiplied by play speed
        setTimelineTime(timelineTime + 10000 * timelineSpeed);

        // Fluctuate risk scores slightly dynamically to trigger recalculations
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

  // 4. Client-side AI / Offline NLP analyst engine
  const runOfflineNlpAnalyst = (feature: any) => {
    const name = feature.name || feature.title || 'Operational Target';
    const cat = feature.category || 'Regional Operations';

    let nlpOutput = '';
    if (feature.featureType === 'Incident') {
      if (feature.type === 'hazard') {
        nlpOutput = `TACTICAL ANOMALY PROFILE — CYCLONE / DELTA WATERWAYS SENSITIVITY:
${name} logged at position Lat ${feature.lat}, Lng ${feature.lng} poses immediate hydrological stress. Under strict subcontinental logistics protocols, adjacent protective embankments must trigger physical patrols. Sluice gate flow coefficients should be re-calculated over a 12-hour window.`;
      } else {
        nlpOutput = `TACTICAL INCIDENT LOG — REGIONAL SECURITY CORRIDOR SECURITY:
Border activity tracking ${name} registered near dry ports. Physical logistical throughput is threatened by up to 35% congestion. Transboundary coordination directives have been issued to command checkpoints to prevent bottleneck expansions.`;
      }
    } else if (feature.featureType === 'Asset') {
      if (feature.status === 'damaged' || feature.status === 'alert') {
        nlpOutput = `CRITICAL DEFENCE INFRASTRUCTURE FAILURE DETECTED:
Tracked gateway node ${name} (${cat}) reports state: [${feature.status.toUpperCase()}]. Network routing is currently active through auxiliary grids. Direct maintenance taskforce assigned to secure capacity levels of ${feature.capacityValue || 'N/A'}.`;
      } else {
        nlpOutput = `CRITICAL NODE NOMINAL COMPLIANCE:
Strategic node ${name} (${cat}) is operating at 100% capacity parameters (${feature.capacityValue || 'N/A'}). Physical security layers report nominal subcontinental border integration.`;
      }
    } else {
      nlpOutput = `TACTICAL INTEL LOG: Unified feature coordinates verified within Bangladesh Monitor v2.0 South Asian bounding limits. Nominal state check complete.`;
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

  // 5. Filtering and Search index matching
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

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0d0e12] text-slate-100 font-sans">

      {/* Dynamic WebGL Canvas Background */}
      <div className="absolute inset-0 w-full h-full z-0">
        <MapCanvas />
      </div>

      {/* Cinematic Top Control HUD Header */}
      <header className="absolute top-0 left-0 right-0 z-10 glass-panel h-14 px-4 flex items-center justify-between border-b border-brand-border shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded border border-brand-emerald bg-brand-emerald/10 text-brand-emerald">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-widest text-slate-100">
              BANGLADESHMONTOR <span className="text-[#006a4e] text-xs font-mono">v2.0</span>
            </span>
          </div>
        </div>

        {/* Live Dhaka BST Clock */}
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 font-mono">
          <Compass className="w-4 h-4 text-[#006a4e] animate-spin" style={{ animationDuration: '8s' }} />
          <span>{dhakaTime}</span>
        </div>

        {/* Subcontinental Risk Status Index */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-[#12141a]/95 border border-[#1a1d24] px-3 py-1 rounded">
            <span className="text-[10px] text-slate-400 font-mono">INSTABILITY INDEX:</span>
            <div className="flex items-center gap-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  riskAnalysis.riskScore > 60 ? 'bg-[#ff3b30] animate-ping' : 'bg-[#00d084]'
                }`}
              ></span>
              <span className={`font-mono text-xs font-bold ${riskAnalysis.riskScore > 60 ? 'text-[#ff3b30]' : 'text-[#00d084]'}`}>
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1a1d24] hover:bg-brand-emerald/20 hover:text-[#00d084] border border-[#1a1d24] text-xs transition font-mono"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>BYOK AI</span>
          </button>
        </div>
      </header>

      {/* Left-Hand Collapsible Command Drawer */}
      <aside
        className={`absolute top-16 left-4 z-10 w-[23rem] max-h-[calc(100vh-16rem)] rounded-lg shadow-2xl transition-all duration-300 flex flex-col ${
          isCommandSheetOpen ? 'translate-x-0' : '-translate-x-[25rem]'
        }`}
      >
        <div className="glass-panel w-full flex flex-col rounded-lg overflow-hidden border border-brand-border">
          {/* Section Header */}
          <div className="p-3 bg-[#12141a] border-b border-brand-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#ff3b30] animate-pulse" />
              <span className="text-xs font-bold tracking-wider text-slate-300">
                TACTICAL CONTROL SHEET
              </span>
            </div>
          </div>

          {/* Instability metrics and Welford variance analytics */}
          <div className="p-3 bg-[#0d0e12]/95 border-b border-brand-border flex flex-col gap-2 font-mono text-xs">
            <div className="text-[9px] text-slate-400 font-bold tracking-wider uppercase mb-1 flex justify-between">
              <span>WELFORD COEFFICIENTS</span>
              <span className="text-[#ff3b30]">STRESS VELOCITY: {riskAnalysis.velocity}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
              <div className="bg-[#12141a] p-2 rounded border border-[#1a1d24]">
                <div>ROLLING MEAN:</div>
                <div className="text-white font-bold">{riskAnalysis.mean}</div>
              </div>
              <div className="bg-[#12141a] p-2 rounded border border-[#1a1d24]">
                <div>VARIANCE (M2):</div>
                <div className="text-white font-bold">{riskAnalysis.variance}</div>
              </div>
            </div>

            {/* Progress Bars */}
            <div className="mt-2 space-y-1.5 text-[10px] text-slate-400">
              <div className="flex justify-between items-center">
                <span>MILITARY & MARITIME DENSITY:</span>
                <span className="text-amber-500 font-bold">{riskAnalysis.breakdown.military}%</span>
              </div>
              <div className="w-full h-1 bg-[#1a1d24] rounded-full overflow-hidden">
                <div style={{ width: `${riskAnalysis.breakdown.military}%` }} className="h-full bg-amber-500"></div>
              </div>

              <div className="flex justify-between items-center">
                <span>HYDROLOGICAL FLUCTUATIONS:</span>
                <span className="text-blue-400 font-bold">{riskAnalysis.breakdown.hydrology}%</span>
              </div>
              <div className="w-full h-1 bg-[#1a1d24] rounded-full overflow-hidden">
                <div style={{ width: `${riskAnalysis.breakdown.hydrology}%` }} className="h-full bg-blue-400"></div>
              </div>
            </div>
          </div>

          {/* Dynamic Layer Toggles HUD Panel */}
          <div className="p-3 border-b border-[#1a1d24] bg-[#12141a]/95 flex flex-col gap-1.5">
            <div className="text-[9px] text-slate-400 font-bold tracking-wider uppercase mb-0.5 flex items-center gap-1">
              <Layers className="w-3 h-3 text-[#00d084]" />
              <span>DYNAMIC LAYER REGISTRY</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <button
                onClick={() => toggleLayer('incidents')}
                className={`py-1.5 px-2 rounded border text-left transition flex justify-between items-center ${
                  layersVisibility.incidents
                    ? 'bg-brand-emerald/10 text-[#006a4e] border-brand-emerald/40 font-bold'
                    : 'bg-[#0d0e12] text-slate-500 border-[#1a1d24]'
                }`}
              >
                <span>OSINT Incidents</span>
                <span className={`w-1.5 h-1.5 rounded-full ${layersVisibility.incidents ? 'bg-brand-emerald' : 'bg-slate-700'}`}></span>
              </button>

              <button
                onClick={() => toggleLayer('criticalAssets')}
                className={`py-1.5 px-2 rounded border text-left transition flex justify-between items-center ${
                  layersVisibility.criticalAssets
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/40 font-bold'
                    : 'bg-[#0d0e12] text-slate-500 border-[#1a1d24]'
                }`}
              >
                <span>Critical Assets</span>
                <span className={`w-1.5 h-1.5 rounded-full ${layersVisibility.criticalAssets ? 'bg-blue-400' : 'bg-slate-700'}`}></span>
              </button>

              <button
                onClick={() => toggleLayer('shippingCorridors')}
                className={`py-1.5 px-2 rounded border text-left transition flex justify-between items-center ${
                  layersVisibility.shippingCorridors
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/40 font-bold'
                    : 'bg-[#0d0e12] text-slate-500 border-[#1a1d24]'
                }`}
              >
                <span>Shipping Lanes</span>
                <span className={`w-1.5 h-1.5 rounded-full ${layersVisibility.shippingCorridors ? 'bg-amber-500' : 'bg-slate-700'}`}></span>
              </button>

              <button
                onClick={() => toggleLayer('waterways')}
                className={`py-1.5 px-2 rounded border text-left transition flex justify-between items-center ${
                  layersVisibility.waterways
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/40 font-bold'
                    : 'bg-[#0d0e12] text-slate-500 border-[#1a1d24]'
                }`}
              >
                <span>Waterways flow</span>
                <span className={`w-1.5 h-1.5 rounded-full ${layersVisibility.waterways ? 'bg-cyan-400' : 'bg-slate-700'}`}></span>
              </button>
            </div>
          </div>

          {/* Fuzzy search filters and List panels */}
          <div className="p-3 border-b border-brand-border bg-[#12141a]/95 flex flex-col gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search indices, title, or status..."
                value={searchQuery}
                onChange={(e) => startTransition(() => setSearchQuery(e.target.value))}
                className="w-full pl-8 pr-2 py-1.5 rounded bg-[#0d0e12] border border-[#1a1d24] text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-emerald font-mono"
              />
            </div>

            <div className="grid grid-cols-3 gap-1 text-[10px] font-bold text-center">
              <button
                onClick={() => setActiveTab('all')}
                className={`py-1 rounded border transition ${
                  activeTab === 'all' ? 'bg-[#006a4e] text-white border-[#006a4e]' : 'bg-[#0d0e12] text-slate-400 border-[#1a1d24]'
                }`}
              >
                ALL EVENTS
              </button>
              <button
                onClick={() => setActiveTab('incidents')}
                className={`py-1 rounded border transition ${
                  activeTab === 'incidents' ? 'bg-brand-crimson/20 text-brand-crimson border-brand-crimson/40' : 'bg-[#0d0e12] text-slate-400 border-[#1a1d24]'
                }`}
              >
                INCIDENTS
              </button>
              <button
                onClick={() => setActiveTab('assets')}
                className={`py-1 rounded border transition ${
                  activeTab === 'assets' ? 'bg-blue-400/20 text-blue-400 border-blue-400/40' : 'bg-[#0d0e12] text-slate-400 border-[#1a1d24]'
                }`}
              >
                ASSETS
              </button>
            </div>
          </div>

          {/* Scrolling List Panel */}
          <div className="flex-1 overflow-y-auto max-h-56 bg-[#12141a]/60 font-mono text-xs divide-y divide-[#1a1d24]">
            {(activeTab === 'all' || activeTab === 'incidents') &&
              filteredIncidents.map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => setSelectedFeature({ ...inc, featureType: 'Incident' })}
                  className={`p-2.5 hover:bg-[#1a1d24]/80 cursor-pointer transition flex items-center justify-between ${
                    selectedFeature?.id === inc.id ? 'bg-[#1a1d24] border-l-2 border-[#ff3b30]' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {inc.category === 'Weather/Cyclone/Flood' ? (
                      <Waves className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    ) : inc.category === 'Border Monitoring' ? (
                      <ShieldAlert className="w-3.5 h-3.5 text-[#ff3b30] shrink-0" />
                    ) : (
                      <Activity className="w-3.5 h-3.5 text-[#006a4e] shrink-0" />
                    )}
                    <div className="truncate">
                      <div className="font-bold text-slate-200 truncate">{inc.title}</div>
                      <div className="text-[10px] text-slate-500 truncate">{inc.category}</div>
                    </div>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                      inc.severity === 'critical'
                        ? 'bg-red-500/10 text-brand-crimson border border-red-500/30'
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
                  className={`p-2.5 hover:bg-[#1a1d24]/80 cursor-pointer transition flex items-center justify-between ${
                    selectedFeature?.id === asset.id ? 'bg-[#1a1d24] border-l-2 border-blue-400' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Database className="w-3.5 h-3.5 text-[#006a4e] shrink-0" />
                    <div className="truncate">
                      <div className="font-bold text-slate-200 truncate">{asset.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{asset.category}</div>
                    </div>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                      asset.status === 'damaged'
                        ? 'bg-red-500/10 text-[#ff3b30] border border-red-500/30'
                        : asset.status === 'alert'
                        ? 'bg-yellow-500/10 text-amber-500 border border-yellow-500/30'
                        : 'bg-emerald-500/10 text-[#00d084] border border-emerald-500/30'
                    }`}
                  >
                    {asset.status}
                  </span>
                </div>
              ))}
          </div>

          {/* Export Subsystem commands bar */}
          <div className="p-3 bg-[#12141a] border-t border-brand-border flex items-center justify-between text-xs font-mono">
            <span className="text-slate-500 text-[9px] font-bold">EXPORT SUBSYSTEM:</span>
            <div className="flex gap-2">
              <button
                onClick={() => exportToGeoJSON(incidents, criticalAssets)}
                className="p-1 px-1.5 rounded bg-[#1a1d24] hover:bg-brand-emerald hover:text-white border border-[#1a1d24] text-[10px] transition flex items-center gap-1"
                title="Download GeoJSON Map Layers"
              >
                <Download className="w-3 h-3" />
                <span>GEOJSON</span>
              </button>
              <button
                onClick={() => exportToCSV(incidents)}
                className="p-1 px-1.5 rounded bg-[#1a1d24] hover:bg-brand-emerald hover:text-white border border-[#1a1d24] text-[10px] transition flex items-center gap-1"
                title="Download CSV Incident Sheet"
              >
                <Download className="w-3 h-3" />
                <span>CSV</span>
              </button>
              <button
                onClick={() => exportToMarkdown(riskAnalysis.riskScore, riskAnalysis.trend, incidents, criticalAssets)}
                className="p-1 px-1.5 rounded bg-[#1a1d24] hover:bg-brand-emerald hover:text-white border border-[#1a1d24] text-[10px] transition flex items-center gap-1"
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
        className="absolute top-1/2 left-0 z-20 -translate-y-1/2 p-1.5 rounded-r bg-[#12141a]/95 border-y border-r border-[#1a1d24] text-slate-400 hover:text-white transition"
      >
        {isCommandSheetOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {/* Bottom Floating Glass Dashboard Panel (Timeline Playback Scrubber & Live news Ticker) */}
      <footer className="absolute bottom-4 left-4 right-4 z-10 glass-panel p-4 rounded-lg border border-brand-border shadow-2xl flex flex-col gap-3 font-mono">

        {/* News Ticker + Playback speed status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 border-r border-[#1a1d24] pr-4 shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#ff3b30] animate-ping"></span>
            <span className="text-[10px] text-brand-crimson font-bold flex items-center gap-1">
              <Newspaper className="w-3.5 h-3.5" />
              INTELLIGENCE NEWS TICKER:
            </span>
          </div>

          <div className="flex-1 overflow-hidden relative h-5">
            <div className="absolute inset-0 flex items-center gap-8 whitespace-nowrap animate-marquee">
              {news.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedFeature({ ...item, featureType: 'News' })}
                  className="inline-flex items-center gap-2 hover:bg-[#1a1d24] p-1 rounded cursor-pointer transition text-xs"
                >
                  <span className={`text-[9px] px-1 rounded font-bold uppercase ${item.impact === 'high' ? 'bg-red-500/10 text-brand-crimson border border-red-500/20' : 'bg-[#006a4e]/20 text-[#006a4e]'}`}>
                    {item.category}
                  </span>
                  <span className="text-slate-300 font-bold truncate max-w-sm">{item.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Temporal scrubbing multi-speed line controls */}
        <div className="grid grid-cols-12 gap-4 items-center border-t border-[#1a1d24] pt-3">

          {/* Controls button group */}
          <div className="col-span-3 flex items-center gap-2 border-r border-[#1a1d24] pr-4">
            <button
              onClick={() => setTimelineIsPlaying(!timelineIsPlaying)}
              className={`p-1.5 rounded transition ${timelineIsPlaying ? 'bg-[#ff3b30]/10 text-brand-crimson border border-[#ff3b30]/30' : 'bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/30'}`}
              title={timelineIsPlaying ? 'Pause Simulation' : 'Start Log Playback Simulation'}
            >
              {timelineIsPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 animate-pulse" />}
            </button>

            <div className="flex gap-1">
              {[1, 2, 5].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setTimelineSpeed(speed)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                    timelineSpeed === speed ? 'bg-[#006a4e] border-[#006a4e] text-white' : 'bg-[#0d0e12] border-[#1a1d24] text-slate-500 hover:text-white'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>

            <div className="ml-2 flex items-center gap-1.5 text-[9px] text-slate-500 uppercase">
              <FastForward className="w-3.5 h-3.5 animate-pulse text-brand-emerald" />
              <span>LOG STREAMING</span>
            </div>
          </div>

          {/* Slicing Slider range */}
          <div className="col-span-6 flex items-center gap-3">
            <span className="text-[10px] text-slate-500 font-mono">TEMPORAL WINDOW SLIDER</span>
            <input
              type="range"
              min={Date.now() - 86400000} // past 24 hours
              max={Date.now() + 86400000} // future 24 hours
              value={timelineTime}
              onChange={(e) => setTimelineTime(Number(e.target.value))}
              className="flex-1 accent-brand-emerald cursor-pointer bg-[#0d0e12] h-1 rounded-full outline-none"
            />
          </div>

          <div className="col-span-3 text-right font-mono text-[10px] text-slate-400">
            <div>LOG OFFSET INDEX:</div>
            <div className="text-white font-bold">{new Date(timelineTime).toLocaleTimeString()}</div>
          </div>

        </div>

      </footer>

      {/* Feature Details Inspector (Pops out from the right when an asset, incident or news item is clicked) */}
      {selectedFeature && (
        <aside className="absolute top-16 right-4 z-10 w-96 max-h-[calc(100vh-16rem)] rounded-lg shadow-2xl flex flex-col glass-panel border border-brand-border">
          <div className="p-3 bg-[#12141a] border-b border-brand-border flex items-center justify-between rounded-t-lg">
            <span className="text-xs font-bold tracking-wider text-slate-300 uppercase">
              {selectedFeature.featureType} INSPECTOR LOG
            </span>
            <button
              onClick={() => setSelectedFeature(null)}
              className="text-slate-500 hover:text-slate-200 font-mono text-[11px]"
            >
              [CLOSE]
            </button>
          </div>

          <div className="p-4 overflow-y-auto space-y-4">

            {/* Core telemetry details card */}
            <div className="bg-[#0d0e12]/85 p-3 rounded-md border border-[#1a1d24] space-y-2 text-xs font-mono">
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
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
                    <span className="text-brand-crimson font-bold uppercase">{selectedFeature.severity}</span>
                  </div>
                  <div className="border-t border-[#1a1d24] pt-2">
                    <span className="text-slate-500">CONTEXT DIRECTIVES:</span>
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
                    <span className="text-[#00d084] font-bold">{selectedFeature.capacityValue || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>STATUS STATE:</span>
                    <span className={`font-bold uppercase ${selectedFeature.status === 'operational' ? 'text-[#00d084]' : 'text-brand-crimson animate-pulse'}`}>
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
                    <span className={`font-bold uppercase ${selectedFeature.impact === 'high' ? 'text-brand-crimson' : 'text-[#00d084]'}`}>
                      {selectedFeature.impact}
                    </span>
                  </div>
                  <div className="border-t border-[#1a1d24] pt-2">
                    <span className="text-slate-500">HEADLINE BRIEF:</span>
                    <div className="text-slate-200 mt-1 leading-relaxed text-[11px] font-bold">
                      {selectedFeature.title}
                    </div>
                  </div>
                </>
              )}

              <div className="border-t border-[#1a1d24] pt-2 flex justify-between text-[11px] text-slate-500">
                <span>LAT: {selectedFeature.lat || 'N/A'}</span>
                <span>LNG: {selectedFeature.lng || 'N/A'}</span>
              </div>
            </div>

            {/* Local NLP AI analysis context block */}
            <div className="bg-[#12141a] p-3 rounded-md border border-brand-border space-y-2 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 tracking-wider">
                  <Cpu className="w-3.5 h-3.5 text-brand-emerald animate-pulse" />
                  <span>AI REGIONAL RECONNAISSANCE ENGINE</span>
                </div>
                <button
                  onClick={() => executeAiAnalysis(selectedFeature)}
                  className="text-slate-500 hover:text-slate-300 transition"
                  title="Re-run Spatial Inference"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>

              {isAiLoading ? (
                <div className="py-6 flex flex-col items-center justify-center gap-2 text-slate-500 font-mono text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin text-brand-emerald" />
                  <span>Loading offline spatial tensors...</span>
                </div>
              ) : (
                <div className="text-xs text-slate-300 bg-[#0d0e12]/60 p-2.5 rounded border border-[#1a1d24] leading-relaxed whitespace-pre-wrap font-mono text-[11px]">
                  {aiAnalysis}
                </div>
              )}

              <div className="text-[9px] text-slate-500 text-center flex justify-center gap-1.5">
                <span>PROCESSING CONTEXT:</span>
                <span className={byokKey ? 'text-[#00d084] font-bold' : 'text-amber-500 font-bold'}>
                  {byokKey ? `${byokProvider.toUpperCase()} Handshake` : 'Local Browser-Native NLP'}
                </span>
              </div>
            </div>

          </div>
        </aside>
      )}

      {/* Bring-Your-Own-Key Configuration Modal Panel overlay */}
      {isByokOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-panel w-[26rem] p-5 rounded-lg border border-brand-border flex flex-col gap-4 font-mono text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1a1d24] pb-2">
              <span className="text-sm font-extrabold text-slate-200 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-brand-emerald" />
                TACTICAL AI HANDSHAKE SETTINGS
              </span>
              <button onClick={() => setIsByokOpen(false)} className="text-slate-500 hover:text-white">
                [X]
              </button>
            </div>

            <p className="text-slate-400 leading-relaxed text-[11px]">
              Optionally route AI analyses through high-speed subcontinental strategic instruction templates. If credentials are left blank, all incident briefs compile internally via browser-native heuristics.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[#8b95a7] block mb-1">API SERVICE PROVIDER:</label>
                <select
                  value={localProvider}
                  onChange={(e: any) => setLocalProvider(e.target.value)}
                  className="w-full py-1.5 px-2 bg-[#0d0e12] border border-[#1a1d24] rounded text-slate-200 focus:outline-none focus:border-brand-emerald font-mono"
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
                  className="w-full py-1.5 px-2 bg-[#0d0e12] border border-[#1a1d24] rounded text-slate-200 placeholder-slate-700 focus:outline-none focus:border-brand-emerald font-mono"
                />
              </div>
            </div>

            <div className="bg-brand-emerald/10 p-2.5 border border-brand-emerald/30 rounded text-slate-300 text-[10px] leading-relaxed font-sans">
              <strong>LOCAL HANDSHAKE DECREE:</strong> Credentials are held in transient browser memory slices.handshake handshakes are conducted directly from your workspace thread to the provider.
            </div>

            <button
              onClick={saveByokCredentials}
              className="w-full text-center py-2 bg-[#006a4e] text-white rounded font-sans font-bold hover:bg-emerald-700 transition"
            >
              COMMIT KEY & SECURE Handshake
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
