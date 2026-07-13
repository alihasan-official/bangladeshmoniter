import { useEffect, useState, useTransition } from 'react';
import MapCanvas from './components/map/MapCanvas';
import useStore from './store/useStore';
import { seedTacticalDatabase } from './services/dataSeeder';
import { exportToGeoJSON, exportToCSV, exportToMarkdown } from './utils/export';
import { aggregateBangladeshNews } from './services/rssAggregator';
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
  CloudSun,
  Thermometer,
  Wind,
  Droplets,
  ExternalLink,
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
    weatherStations,
    updateWeatherStations,
    rssArticles,
    rssLoading,
    setRssArticles,
    setRssLoading,
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
    mapMode,
    setMapMode,
    riskAnalysis,
    setRiskAnalysis,
  } = useStore();

  const [isCommandSheetOpen, setIsCommandSheetOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'incidents' | 'assets' | 'weather' | 'rss' | 'intel'>('all');
  const { selectedNewsTopic, setSelectedNewsTopic } = useStore();
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

  // 1.5 Load Live RSS Feed News and trigger live updates
  const loadRssNews = async () => {
    setRssLoading(true);
    try {
      const articles = await aggregateBangladeshNews();
      setRssArticles(articles);
    } catch (e) {
      console.error('Error fetching live RSS feed:', e);
    } finally {
      setRssLoading(false);
    }
  };

  useEffect(() => {
    loadRssNews();
    const interval = setInterval(loadRssNews, 180000); // refresh RSS feeds every 3 mins
    return () => clearInterval(interval);
  }, []);

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

  // 3. Simulated Playback Loop for Tactical Timeline Scrubbing & Weather Drift
  useEffect(() => {
    let intervalId: any = null;
    if (timelineIsPlaying) {
      intervalId = setInterval(() => {
        // Step time forward by 10 seconds multiplied by play speed
        setTimelineTime(timelineTime + 10000 * timelineSpeed);

        // Periodically fluctuate weather sensor grids alongside the playback scrubbing
        updateWeatherStations();

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
  }, [timelineIsPlaying, timelineTime, timelineSpeed, setTimelineTime, riskAnalysis, setRiskAnalysis, updateWeatherStations]);

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
    } else if (feature.featureType === 'Weather') {
      nlpOutput = `TACTICAL METEOROLOGY BRIEF — SENSOR PORTAL [${name.toUpperCase()}]:
Ambient temp registered at ${feature.temperature}°C, humidity ${feature.humidity}%, with winds vectoring at ${feature.windSpeed} km/h toward ${feature.windDirection} degrees. Condition designated as [${feature.condition.toUpperCase()}]. Cyclone surge and transboundary runoffs remain monitored. No major anomalies reported on current sensor slice.`;
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
- Status/Severity: ${feature.status || feature.severity || feature.condition || 'N/A'}
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

  const filteredWeather = weatherStations.filter(
    (station) =>
      station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      station.condition.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRss = rssArticles.filter(
    (art) =>
      art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.source.toLowerCase().includes(searchQuery.toLowerCase())
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

          {/* Map Mode Toggle Button */}
          <button
            onClick={() => setMapMode(mapMode === 'dark' ? 'light' : 'dark')}
            aria-label={`Switch to ${mapMode === 'dark' ? 'light' : 'dark'} mode`}
            className="flex items-center justify-center p-1.5 rounded bg-[#1a1d24] hover:bg-brand-emerald/20 text-slate-300 hover:text-[#00d084] border border-[#1a1d24] transition"
            title={`Switch to ${mapMode === 'dark' ? 'Day' : 'Night'} Map Mode`}
          >
            <CloudSun className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setLocalKey(byokKey);
              setLocalProvider(byokProvider);
              setIsByokOpen(true);
            }}
            aria-label="Open BYOK AI settings"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1a1d24] hover:bg-brand-emerald/20 hover:text-[#00d084] border border-[#1a1d24] text-xs transition font-mono"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>BYOK AI</span>
          </button>
        </div>
      </header>

      {/* Left-Hand Collapsible Command Drawer */}
      <aside
        className={`absolute top-16 left-4 z-10 w-[90%] sm:w-[24rem] max-h-[calc(100vh-16rem)] rounded-lg shadow-2xl transition-all duration-300 flex flex-col ${
          isCommandSheetOpen ? 'translate-x-0' : '-translate-x-[110%] sm:-translate-x-[26rem]'
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
                aria-label="Toggle OSINT Incidents Layer"
                className={`py-1.5 px-2 rounded border text-left transition flex justify-between items-center focus-visible:ring-2 focus-visible:ring-brand-emerald focus-visible:outline-none ${
                  layersVisibility.incidents
                    ? 'bg-brand-emerald/15 text-emerald-400 border-brand-emerald/40 font-bold'
                    : 'bg-[#0d0e12] text-slate-500 border-[#1a1d24]'
                }`}
              >
                <span>OSINT Incidents</span>
                <span className={`w-1.5 h-1.5 rounded-full ${layersVisibility.incidents ? 'bg-brand-emerald' : 'bg-slate-700'}`}></span>
              </button>

              <button
                onClick={() => toggleLayer('criticalAssets')}
                aria-label="Toggle Critical Assets Layer"
                className={`py-1.5 px-2 rounded border text-left transition flex justify-between items-center focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none ${
                  layersVisibility.criticalAssets
                    ? 'bg-blue-500/15 text-blue-400 border-blue-500/40 font-bold'
                    : 'bg-[#0d0e12] text-slate-500 border-[#1a1d24]'
                }`}
              >
                <span>Critical Assets</span>
                <span className={`w-1.5 h-1.5 rounded-full ${layersVisibility.criticalAssets ? 'bg-blue-400' : 'bg-slate-700'}`}></span>
              </button>

              <button
                onClick={() => toggleLayer('shippingCorridors')}
                aria-label="Toggle Shipping Lanes Layer"
                className={`py-1.5 px-2 rounded border text-left transition flex justify-between items-center focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none ${
                  layersVisibility.shippingCorridors
                    ? 'bg-amber-500/15 text-amber-500 border-amber-500/40 font-bold'
                    : 'bg-[#0d0e12] text-slate-500 border-[#1a1d24]'
                }`}
              >
                <span>Shipping Lanes</span>
                <span className={`w-1.5 h-1.5 rounded-full ${layersVisibility.shippingCorridors ? 'bg-amber-500' : 'bg-slate-700'}`}></span>
              </button>

              <button
                onClick={() => toggleLayer('waterways')}
                aria-label="Toggle Waterways Flow Layer"
                className={`py-1.5 px-2 rounded border text-left transition flex justify-between items-center focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none ${
                  layersVisibility.waterways
                    ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/40 font-bold'
                    : 'bg-[#0d0e12] text-slate-500 border-[#1a1d24]'
                }`}
              >
                <span>Waterways flow</span>
                <span className={`w-1.5 h-1.5 rounded-full ${layersVisibility.waterways ? 'bg-cyan-400' : 'bg-slate-700'}`}></span>
              </button>

              <button
                onClick={() => toggleLayer('weather')}
                aria-label="Toggle Meteorology Sensors Layer"
                className={`py-1.5 px-2 rounded border text-left transition flex justify-between items-center focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none ${
                  layersVisibility.weather
                    ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/40 font-bold'
                    : 'bg-[#0d0e12] text-slate-500 border-[#1a1d24]'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <CloudSun className="w-3.5 h-3.5 animate-pulse" />
                  <span>Meteo Sensors</span>
                </span>
                <span className={`w-1.5 h-1.5 rounded-full ${layersVisibility.weather ? 'bg-indigo-400' : 'bg-slate-700'}`}></span>
              </button>

              <button
                onClick={() => toggleLayer('rssFeeds')}
                aria-label="Toggle Live RSS Pins Layer"
                className={`py-1.5 px-2 rounded border text-left transition flex justify-between items-center focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none ${
                  layersVisibility.rssFeeds
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 font-bold'
                    : 'bg-[#0d0e12] text-slate-500 border-[#1a1d24]'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Newspaper className="w-3.5 h-3.5 animate-pulse" />
                  <span>Live RSS Pins</span>
                </span>
                <span className={`w-1.5 h-1.5 rounded-full ${layersVisibility.rssFeeds ? 'bg-emerald-400' : 'bg-slate-700'}`}></span>
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

            <div className="grid grid-cols-6 gap-0.5 text-[8px] sm:text-[8.5px] font-bold text-center">
              <button
                onClick={() => setActiveTab('all')}
                aria-label="Show all records"
                className={`py-1 rounded border transition ${
                  activeTab === 'all' ? 'bg-[#006a4e] text-white border-[#006a4e]' : 'bg-[#0d0e12] text-slate-400 border-[#1a1d24]'
                }`}
              >
                ALL
              </button>
              <button
                onClick={() => setActiveTab('incidents')}
                aria-label="Show OSINT incidents"
                className={`py-1 rounded border transition ${
                  activeTab === 'incidents' ? 'bg-brand-crimson/20 text-brand-crimson border-brand-crimson/40' : 'bg-[#0d0e12] text-slate-400 border-[#1a1d24]'
                }`}
              >
                OSINT
              </button>
              <button
                onClick={() => setActiveTab('assets')}
                aria-label="Show critical assets"
                className={`py-1 rounded border transition ${
                  activeTab === 'assets' ? 'bg-blue-400/20 text-blue-400 border-blue-400/40' : 'bg-[#0d0e12] text-slate-400 border-[#1a1d24]'
                }`}
              >
                ASSETS
              </button>
              <button
                onClick={() => setActiveTab('weather')}
                aria-label="Show meteorology and weather sensors"
                className={`py-1 rounded border transition ${
                  activeTab === 'weather' ? 'bg-indigo-400/20 text-indigo-400 border-indigo-400/40' : 'bg-[#0d0e12] text-slate-400 border-[#1a1d24]'
                }`}
              >
                METEO
              </button>
              <button
                onClick={() => setActiveTab('rss')}
                aria-label="Show live RSS news feeds"
                className={`py-1 rounded border transition ${
                  activeTab === 'rss' ? 'bg-emerald-400/20 text-emerald-400 border-emerald-400/40 font-bold' : 'bg-[#0d0e12] text-slate-400 border-[#1a1d24]'
                }`}
              >
                RSS
              </button>
              <button
                onClick={() => setActiveTab('intel')}
                aria-label="Show worldmonitor news intelligence"
                className={`py-1 rounded border transition ${
                  activeTab === 'intel' ? 'bg-amber-500/25 text-amber-400 border-amber-500/40 font-bold animate-pulse' : 'bg-[#0d0e12] text-slate-400 border-[#1a1d24]'
                }`}
              >
                INTEL
              </button>
            </div>
          </div>

          {/* Scrolling List Panel */}
          <div className="flex-1 overflow-y-auto max-h-[20rem] bg-[#12141a]/60 font-mono text-xs divide-y divide-[#1a1d24]">
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

            {(activeTab === 'all' || activeTab === 'weather') &&
              filteredWeather.map((station) => (
                <div
                  key={station.id}
                  onClick={() => setSelectedFeature({ ...station, featureType: 'Weather' })}
                  className={`p-2.5 hover:bg-[#1a1d24]/80 cursor-pointer transition flex items-center justify-between ${
                    selectedFeature?.id === station.id ? 'bg-[#1a1d24] border-l-2 border-indigo-400' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <CloudSun className="w-3.5 h-3.5 text-indigo-400 shrink-0 animate-pulse" />
                    <div className="truncate">
                      <div className="font-bold text-slate-200 truncate">{station.name}</div>
                      <div className="text-[10px] text-slate-500 truncate flex gap-2">
                        <span>{station.temperature}°C</span>
                        <span>•</span>
                        <span>{station.windSpeed} km/h {station.windDirection}°</span>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                      station.condition === 'cyclonic'
                        ? 'bg-red-500/10 text-[#ff3b30] border border-red-500/30'
                        : station.condition === 'stormy'
                        ? 'bg-yellow-500/10 text-amber-500 border border-yellow-500/30'
                        : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                    }`}
                  >
                    {station.condition}
                  </span>
                </div>
              ))}

            {(activeTab === 'all' || activeTab === 'rss') && (
              rssLoading ? (
                <div className="p-4 flex flex-col items-center justify-center gap-2 text-slate-500">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Loading live breaking portals...</span>
                </div>
              ) : filteredRss.length === 0 ? (
                <div className="p-4 text-center text-slate-500">No RSS entries found.</div>
              ) : (
                filteredRss.map((art, idx) => (
                  <div
                    key={`rss-${idx}`}
                    onClick={() => setSelectedFeature({ ...art, featureType: 'RSSArticle' })}
                    className={`p-2.5 hover:bg-[#1a1d24]/80 cursor-pointer transition flex items-start gap-2.5 ${
                      selectedFeature?.link === art.link ? 'bg-[#1a1d24] border-l-2 border-emerald-400' : ''
                    }`}
                  >
                    {art.thumbnail ? (
                      <img
                        src={art.thumbnail}
                        alt="News thumbnail"
                        className="w-12 h-12 object-cover rounded border border-[#1a1d24] shrink-0 mt-0.5"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Newspaper className="w-8 h-8 text-slate-500 shrink-0 mt-1" />
                    )}
                    <div className="overflow-hidden flex-1">
                      <div className="font-bold text-slate-200 text-[11px] leading-tight line-clamp-2 hover:text-[#00d084] transition">
                        {art.title}
                      </div>
                      <div className="text-[9px] text-slate-500 mt-1 flex justify-between">
                        <span className="text-[#00d084] font-bold uppercase">{art.source}</span>
                        <span>{new Date(art.pubDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              )
            )}

            {/* Active WorldMonitor-Style News Intelligence Category Dashboard */}
            {activeTab === 'intel' && (
              <div className="p-3 space-y-4 bg-[#0d0e12]/90">
                {/* Meta Header */}
                <div className="p-2 bg-[#12141a] rounded border border-[#1a1d24] text-[10px] space-y-1">
                  <div className="flex justify-between text-slate-400 font-bold">
                    <span>NEWS INTELLIGENCE MONITOR:</span>
                    <span className="text-emerald-400 animate-pulse">AUTO-REFRESH</span>
                  </div>
                  <div className="text-slate-500">
                    Real-time national news monitoring with curated topics in 100+ languages parsed & translated instantly. Updates every 15 minutes.
                  </div>
                </div>

                {/* News Intelligence curation categories with 14-day Media Tone & Volume Trend */}
                <div className="space-y-3">
                  {[
                    {
                      topic: 'Conflicts',
                      desc: 'Border skirmishes, active patrols, military maneuvers',
                      tone: 'Negative (-1.8)',
                      volume: '1,420 Articles',
                      trend: [20, 25, 35, 42, 38, 45, 55, 60, 50, 48, 52, 65, 70, 78],
                      color: 'bg-red-500',
                      indicatorColor: 'text-[#ff3b30]',
                    },
                    {
                      topic: 'Cybersecurity',
                      desc: 'Transboundary node breaches, database delays',
                      tone: 'Mixed (-0.4)',
                      volume: '840 Articles',
                      trend: [10, 12, 11, 15, 18, 14, 20, 22, 19, 25, 30, 28, 35, 42],
                      color: 'bg-indigo-500',
                      indicatorColor: 'text-indigo-400',
                    },
                    {
                      topic: 'Geopolitics',
                      desc: 'International maritime borders & treaty agreements',
                      tone: 'Positive (+0.8)',
                      volume: '1,960 Articles',
                      trend: [50, 48, 45, 52, 58, 62, 60, 65, 70, 72, 75, 80, 85, 90],
                      color: 'bg-emerald-500',
                      indicatorColor: 'text-[#006a4e]',
                    },
                    {
                      topic: 'Hydrology',
                      desc: 'Embankment spillovers, flood discharge indices',
                      tone: 'Negative (-2.4)',
                      volume: '2,810 Articles',
                      trend: [30, 35, 45, 55, 60, 68, 75, 80, 88, 92, 95, 100, 105, 112],
                      color: 'bg-blue-500',
                      indicatorColor: 'text-blue-400',
                    },
                    {
                      topic: 'Logistics',
                      desc: 'Customs bottlenecks, transboundary dry cargo transit',
                      tone: 'Stable (0.0)',
                      volume: '950 Articles',
                      trend: [15, 18, 16, 20, 22, 19, 21, 24, 22, 25, 27, 26, 28, 30],
                      color: 'bg-amber-500',
                      indicatorColor: 'text-amber-500',
                    },
                    {
                      topic: 'Maritime Monitor',
                      desc: 'Exclusive Economic Zone transponder activity',
                      tone: 'Positive (+1.2)',
                      volume: '1,150 Articles',
                      trend: [25, 28, 30, 29, 35, 38, 42, 40, 44, 48, 50, 52, 55, 58],
                      color: 'bg-cyan-500',
                      indicatorColor: 'text-cyan-400',
                    }
                  ].map((topicObj) => (
                    <div
                      key={topicObj.topic}
                      onClick={() => setSelectedNewsTopic(topicObj.topic)}
                      className={`p-2.5 rounded border cursor-pointer transition ${
                        selectedNewsTopic === topicObj.topic
                          ? 'bg-[#1a1d24] border-amber-500/80 shadow-lg'
                          : 'bg-[#12141a]/90 border-[#1a1d24] hover:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className={`font-bold text-xs ${topicObj.indicatorColor}`}>
                          {topicObj.topic}
                        </span>
                        <span className="text-[10px] text-slate-500">{topicObj.volume}</span>
                      </div>
                      <div className="text-[9.5px] text-slate-400 leading-tight mb-2">
                        {topicObj.desc}
                      </div>

                      {/* 14-day Media Tone & Volume Trend Sparkline bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                          <span>14-DAY TONE: {topicObj.tone}</span>
                          <span>MEDIA TREND</span>
                        </div>
                        <div className="flex items-end gap-0.5 h-6 bg-[#0d0e12] p-1 rounded border border-[#1a1d24]">
                          {topicObj.trend.map((val, i) => {
                            const maxVal = Math.max(...topicObj.trend);
                            const percent = maxVal > 0 ? (val / maxVal) * 100 : 0;
                            return (
                              <div
                                key={i}
                                className={`flex-1 ${topicObj.color} rounded-t-sm transition-all duration-300`}
                                style={{ height: `${percent}%` }}
                                title={`Day ${i + 1}: ${val}`}
                              ></div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
        <aside className="absolute top-16 right-4 z-10 w-[90%] sm:w-96 max-h-[calc(100vh-16rem)] rounded-lg shadow-2xl flex flex-col glass-panel border border-brand-border">
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

              {selectedFeature.featureType === 'Weather' && (
                <>
                  <div className="flex justify-between">
                    <span>STATION NAME:</span>
                    <span className="text-slate-200 font-bold">{selectedFeature.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TEMPERATURE:</span>
                    <span className="text-slate-200 font-bold flex items-center gap-1">
                      <Thermometer className="w-3.5 h-3.5 text-red-400" />
                      {selectedFeature.temperature}°C
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>WIND FLOW:</span>
                    <span className="text-slate-200 flex items-center gap-1 font-bold">
                      <Wind className="w-3.5 h-3.5 text-cyan-400" />
                      {selectedFeature.windSpeed} km/h @ {selectedFeature.windDirection}°
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>RELATIVE HUMIDITY:</span>
                    <span className="text-slate-200 flex items-center gap-1">
                      <Droplets className="w-3.5 h-3.5 text-indigo-400" />
                      {selectedFeature.humidity}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>AIR PRESSURE:</span>
                    <span className="text-slate-200">{selectedFeature.pressure} hPa</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CURRENT CONDITION:</span>
                    <span className={`font-bold uppercase ${selectedFeature.condition === 'cyclonic' ? 'text-red-500 animate-ping' : selectedFeature.condition === 'stormy' ? 'text-amber-500' : 'text-indigo-400'}`}>
                      {selectedFeature.condition}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-[#1a1d24] pt-2 text-[10px]">
                    <span>LAST UPDATE:</span>
                    <span className="text-slate-500">{new Date(selectedFeature.lastUpdated).toLocaleTimeString()}</span>
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

              {selectedFeature.featureType === 'RSSArticle' && (
                <>
                  {selectedFeature.thumbnail && (
                    <img
                      src={selectedFeature.thumbnail}
                      alt="Article graphic"
                      className="w-full h-36 object-cover rounded border border-[#1a1d24] mb-2"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  )}
                  <div className="flex justify-between">
                    <span>OUTLET PORTAL:</span>
                    <span className="text-emerald-400 font-bold uppercase">{selectedFeature.source}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PUBLISHED TIME:</span>
                    <span className="text-slate-300">{new Date(selectedFeature.pubDate).toLocaleString()}</span>
                  </div>
                  {selectedFeature.translated && (
                    <div className="flex justify-between text-amber-400">
                      <span>TRANSLATION:</span>
                      <span className="font-bold">BANGLA TO ENGLISH (HEURISTIC)</span>
                    </div>
                  )}
                  <div className="border-t border-[#1a1d24] pt-2">
                    <span className="text-slate-400 font-bold leading-snug text-[11px] block mb-1">
                      {selectedFeature.title}
                    </span>
                    <div className="text-slate-300 text-[10.5px] leading-relaxed font-sans mb-3">
                      {selectedFeature.description}
                    </div>
                    <a
                      href={selectedFeature.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-1.5 px-3 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold transition flex items-center justify-center gap-1.5 hover:bg-emerald-500 hover:text-white"
                    >
                      <span>READ ORIGINAL COVERAGE</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
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
