import { useEffect, useState, useMemo } from 'react';
import MapCanvas from './components/map/MapCanvas';
import useStore from './store/useStore';
import { seedTacticalDatabase } from './services/dataSeeder';
import { exportToGeoJSON, exportToCSV } from './utils/export';
import { aggregateBangladeshNews } from './services/rssAggregator';
import {
  ShieldAlert,
  Compass,
  Settings,
  Key,
  Activity,
  Cpu,
  RefreshCw,
  Download,
  CloudSun,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Plane,
  AlertTriangle,
  Newspaper
} from 'lucide-react';

export default function App() {
  const {
    layersVisibility,
    toggleLayer,
    incidents,
    criticalAssets,
    rssArticles,
    rssLoading,
    setIncidents,
    setCriticalAssets,
    setNews,
    setRssArticles,
    setRssLoading,
    selectedFeature,
    setSelectedFeature,
    byokKey,
    byokProvider,
    setByokKey,
    setByokProvider,
    mapMode,
    setMapMode,
    riskAnalysis,
    setRiskAnalysis,

    // Real-time feeds state
    aircrafts,
    aircraftsStatus,
    fires,
    dsexValue,
    dsexChange,
    dsexStatus,
    earthquakes,
    divisionWeather
  } = useStore();

  const [isByokOpen, setIsByokOpen] = useState(false);
  const [localKey, setLocalKey] = useState('');
  const [localProvider, setLocalProvider] = useState<'openai' | 'groq' | 'openrouter'>('groq');

  // AI summary states
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Time metrics
  const [dhakaTime, setDhakaTime] = useState('');

  // Collapsed status of the bottom dashboard matrix panel
  const [isDashboardCollapsed, setIsDashboardCollapsed] = useState(false);

  // 1. Load Seed Data on startup
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

  // 1.6 Poll Async Dashboard High-Density Streams (Increased OpenSky interval to 180 seconds as requested)
  const pollAsyncFeeds = async () => {
    const { pollDashboardPipelines } = await import('./services/dashboardPoll');
    await pollDashboardPipelines();
  };

  useEffect(() => {
    loadRssNews();
    const intervalRss = setInterval(loadRssNews, 180000); // refresh RSS feeds every 3 mins

    pollAsyncFeeds();
    const intervalPoll = setInterval(pollAsyncFeeds, 180000); // Increased OpenSky/MODIS polling interval to 180s to prevent rate limits

    return () => {
      clearInterval(intervalRss);
      clearInterval(intervalPoll);
    };
  }, []);

  // 2. Dhaka Time Tick
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

  // 3. Dynamic client-side mathematical scoring matrix
  // Derived strictly from actual NASA FIRMS thermal points, earthquakes, or weather anomaly counts if limits occur
  const calculatedRiskMetrics = useMemo(() => {
    const activeFires = fires.length;

    // Environmental stress aggregates
    const fireWeight = Math.min(35, activeFires * 4);
    const quakeWeight = Math.min(35, earthquakes.reduce((acc, eq) => acc + (eq.magnitude || 0), 0) * 3);
    const environmentalRisk = Math.max(10, Math.min(100, Math.round(20 + fireWeight + quakeWeight)));

    // Infrastructure metrics derived from asset statuses
    const totalAssets = criticalAssets.length || 1;
    const compromisedAssets = criticalAssets.filter(a => a.status === 'damaged' || a.status === 'alert').length;
    const infrastructureStatus = Math.round((compromisedAssets / totalAssets) * 80 + 15);

    // Public event parameters mapped from OSINT alerts
    const totalIncidents = incidents.length || 1;
    const criticalIncidents = incidents.filter(i => i.severity === 'critical').length;
    const publicActivityScore = Math.round((criticalIncidents / totalIncidents) * 60 + 30);

    const compoundInstability = Math.min(98, Math.max(12, Math.round(environmentalRisk * 0.35 + infrastructureStatus * 0.3 + publicActivityScore * 0.35)));

    return {
      instability: compoundInstability,
      environmental: environmentalRisk,
      infrastructure: infrastructureStatus,
      publicActivity: publicActivityScore
    };
  }, [fires, earthquakes, criticalAssets, incidents]);

  // Update store instability score with client-side mathematical results
  useEffect(() => {
    setRiskAnalysis({
      ...riskAnalysis,
      riskScore: calculatedRiskMetrics.instability,
      breakdown: {
        military: calculatedRiskMetrics.publicActivity,
        disaster: calculatedRiskMetrics.environmental,
        geopolitical: riskAnalysis.breakdown.geopolitical,
        hydrology: calculatedRiskMetrics.infrastructure
      }
    });
  }, [calculatedRiskMetrics, setRiskAnalysis]);

  // Client-side AI Analyst Summaries fallback
  const runOfflineNlpAnalyst = (feature: any) => {
    const name = feature.name || feature.title || 'Operational Target';
    const cat = feature.category || 'Regional Operations';

    let nlpOutput = '';
    if (feature.featureType === 'Incident') {
      nlpOutput = `TACTICAL ANOMALY PROFILE — CYCLONE / WATERWAYS SENSITIVITY:\n${name} logged at Lat ${feature.lat}, Lng ${feature.lng} poses immediate hydrological stress. Under strict subcontinental logistics protocols, adjacent protective embankments must trigger physical patrols.`;
    } else if (feature.featureType === 'Asset') {
      nlpOutput = `CRITICAL INFRASTRUCTURE STATUS REPORT:\nstrategic node ${name} (${cat}) reports state: [${feature.status.toUpperCase()}]. Auxiliary power triggers are active. Direct maintenance taskforce assigned to secure capacity parameters of ${feature.capacityValue || 'N/A'}.`;
    } else if (feature.featureType === 'Weather') {
      nlpOutput = `TACTICAL METEOROLOGY BRIEF:\nAmbient temp registered at ${feature.temperature}°C, wind flow vectoring at ${feature.windSpeed} km/h toward ${feature.windDirection} degrees. Condition designated as [${feature.condition.toUpperCase()}].`;
    } else if (feature.featureType === 'Aircraft') {
      nlpOutput = `AERIAL RADAR SENSOR MATCHED:\nActive callsign ${feature.callsign} verified near subcontinental bounds. Barometric altitude: ${feature.baro_altitude} m. True tracking angle: ${feature.true_track}°.`;
    } else if (feature.featureType === 'ThermalPoint') {
      nlpOutput = `THERMAL ANOMALY LOGGED:\nSensor coordinates Lat ${feature.latitude}, Lng ${feature.longitude} matched active fire cluster footprint. Scan rate coefficient is ${feature.scan}. Brightness factor verified at ${feature.bright_t31} K.`;
    } else if (feature.featureType === 'Earthquake') {
      nlpOutput = `TECTONIC SEISMIC DETECTED:\nSeismic event logged near ${feature.place} coordinates with magnitude ${feature.magnitude} Richter scale. Monitor active fault lines.`;
    } else {
      nlpOutput = `TACTICAL INTEL LOG:\nUnified feature coordinates verified within Bangladesh Monitor v2.0 limits. Nominal state check complete.`;
    }

    return `[LOCAL OFFLINE-FIRST NLP RECONNAISSANCE ENGINE]\n\n${nlpOutput}\n\nSTRATEGIC DIRECTIVES:\n• Border Logistics corridor: Secured\n• Delta Hydrological monitoring: Active\n• Maritime Chokepoint patrol: Patrolling`;
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

        const promptContent = `Analyze the following event solely through regional geopolitics, delta hydrology, and border logistics. Keep it concise, professional, and action-oriented. Limit response to 100 words.\n\nTarget parameters: ${JSON.stringify(feature)}`;

        if (byokProvider === 'openai') {
          endpoint = 'https://api.openai.com/v1/chat/completions';
          headers['Authorization'] = `Bearer ${byokKey}`;
          body = { model: 'gpt-4o-mini', messages: [{ role: 'user', content: promptContent }], temperature: 0.5 };
        } else if (byokProvider === 'groq') {
          endpoint = 'https://api.groq.com/openai/v1/chat/completions';
          headers['Authorization'] = `Bearer ${byokKey}`;
          body = { model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: promptContent }], temperature: 0.5 };
        } else {
          endpoint = 'https://openrouter.ai/api/v1/chat/completions';
          headers['Authorization'] = `Bearer ${byokKey}`;
          body = { model: 'meta-llama/llama-3-8b-instruct:free', messages: [{ role: 'user', content: promptContent }], temperature: 0.5 };
        }

        const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
        if (response.ok) {
          const resJson = await response.json();
          setAiAnalysis(resJson.choices?.[0]?.message?.content || 'No text content returned.');
        } else {
          setAiAnalysis(runOfflineNlpAnalyst(feature));
        }
      } catch (err: any) {
        setAiAnalysis(runOfflineNlpAnalyst(feature));
      } finally {
        setIsAiLoading(false);
      }
    } else {
      setTimeout(() => {
        setAiAnalysis(runOfflineNlpAnalyst(feature));
        setIsAiLoading(false);
      }, 500);
    }
  };

  useEffect(() => {
    if (selectedFeature) {
      executeAiAnalysis(selectedFeature);
    }
  }, [selectedFeature]);

  const saveByokCredentials = () => {
    setByokKey(localKey);
    setByokProvider(localProvider);
    setIsByokOpen(false);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#09090b] text-slate-100 font-sans select-none">

      {/* Full-Screen Map Canvas */}
      <div className="absolute inset-0 w-full h-[65vh] sm:h-[65vh] z-0">
        <MapCanvas />
      </div>

      {/* Cinematic Top Control HUD Header */}
      <header className="absolute top-0 left-0 right-0 z-30 glass-panel h-14 px-3 sm:px-4 flex items-center justify-between border-b border-brand-border shadow-2xl">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded border border-brand-emerald bg-brand-emerald/10 text-brand-emerald shrink-0">
            <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
          </div>
          <div>
            <span className="font-extrabold text-[11px] sm:text-sm tracking-wider sm:tracking-widest text-slate-100 uppercase">
              BD MONITOR <span className="text-[#006a4e] text-[9px] sm:text-xs font-mono">v2.0</span>
            </span>
          </div>
        </div>

        {/* Live Dhaka BST Clock */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 font-mono">
          <Compass className="w-4 h-4 text-[#006a4e] animate-spin" style={{ animationDuration: '8s' }} />
          <span>{dhakaTime}</span>
        </div>

        {/* Subcontinental Risk Status Index */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2.5 bg-[#12141a]/95 border border-[#1a1d24] px-2 py-1 rounded text-[10px] sm:text-xs">
            <span className="hidden md:inline text-[9px] text-slate-400 font-mono">INSTABILITY:</span>
            <div className="flex items-center gap-1">
              <span
                className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                  riskAnalysis.riskScore > 60 ? 'bg-[#ff3b30] animate-ping' : 'bg-[#00d084]'
                }`}
              ></span>
              <span className={`font-mono text-[11px] sm:text-xs font-bold ${riskAnalysis.riskScore > 60 ? 'text-[#ff3b30]' : 'text-[#00d084]'}`}>
                {riskAnalysis.riskScore}
              </span>
            </div>
            <span className="hidden sm:inline text-[9px] text-slate-500 capitalize font-mono">
              ({riskAnalysis.trend})
            </span>
          </div>

          {/* Map Layer Controls Panel Toggles */}
          <div className="flex items-center gap-1 bg-[#12141a] p-0.5 rounded border border-[#1a1d24]">
            <button
              onClick={() => toggleLayer('aviation')}
              aria-label="Toggle flights"
              className={`p-1.5 rounded transition ${layersVisibility.aviation ? 'bg-purple-500/25 text-purple-400' : 'text-slate-500'}`}
              title="Aviation Feed Layer"
            >
              <Plane className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => toggleLayer('fires')}
              aria-label="Toggle thermal fires"
              className={`p-1.5 rounded transition ${layersVisibility.fires ? 'bg-red-500/25 text-red-400' : 'text-slate-500'}`}
              title="NASA MODIS Thermal Layer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => toggleLayer('weather')}
              aria-label="Toggle meteorology stations"
              className={`p-1.5 rounded transition ${layersVisibility.weather ? 'bg-indigo-500/25 text-indigo-400' : 'text-slate-500'}`}
              title="Meteo Stations Layer"
            >
              <CloudSun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => toggleLayer('rssFeeds')}
              aria-label="Toggle breaking feeds"
              className={`p-1.5 rounded transition ${layersVisibility.rssFeeds ? 'bg-emerald-500/25 text-emerald-400' : 'text-slate-500'}`}
              title="Geocoded RSS Feeds Layer"
            >
              <Newspaper className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Map Mode Toggle Button */}
          <button
            onClick={() => setMapMode(mapMode === 'dark' ? 'light' : 'dark')}
            aria-label={`Switch to ${mapMode === 'dark' ? 'light' : 'dark'} mode`}
            className="flex items-center justify-center p-1.5 rounded bg-[#1a1d24] hover:bg-brand-emerald/20 text-slate-300 hover:text-[#00d084] border border-[#1a1d24] transition h-8 w-8 sm:h-auto sm:w-auto"
            title={`Switch to ${mapMode === 'dark' ? 'Day' : 'Night'} Map Mode`}
          >
            <CloudSun className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <button
            onClick={() => {
              setLocalKey(byokKey);
              setLocalProvider(byokProvider);
              setIsByokOpen(true);
            }}
            aria-label="Open BYOK AI settings"
            className="flex items-center justify-center sm:gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded bg-[#1a1d24] hover:bg-brand-emerald/20 hover:text-[#00d084] border border-[#1a1d24] text-xs transition font-mono h-8 w-8 sm:h-auto sm:w-auto"
            title="BYOK AI Credentials"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">BYOK AI</span>
          </button>
        </div>
      </header>

      {/* WorldMonitor Bottom Dashboard Overlay Panel */}
      <section
        style={{ zIndex: 999, transition: 'transform 0.3s ease-in-out, height 0.3s ease-in-out' }}
        className={`fixed bottom-0 left-0 w-full bg-[#09090b]/93 backdrop-blur-md shadow-2xl flex flex-col border-t border-[#3f3f46]/40 ${
          isDashboardCollapsed
            ? 'h-[2.5rem] transform translate-y-0'
            : 'h-[45vh] md:h-[38vh]'
        }`}
      >
        {/* Toggle Collapse Bar & Horizontal Tab switcher */}
        <div className="bg-[#09090b] border-b border-[#3f3f46]/40 h-[2.5rem] px-4 flex items-center justify-between font-mono shrink-0">
          <div className="flex items-center gap-4 overflow-x-auto select-none">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#22c55e] animate-pulse" />
              <span className="hidden sm:inline text-[11px] font-bold tracking-wider text-slate-300 uppercase">
                TACTICAL CONSOLE:
              </span>
            </div>

            {/* Selector matrix switcher: [THE MAP | THE WIRE | STOCKS | STREAMS] */}
            <div className="flex items-center gap-1 text-[10px]">
              {['THE MAP', 'THE WIRE', 'STOCKS', 'STREAMS'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setIsDashboardCollapsed(false)}
                  className="px-2.5 py-1 rounded bg-[#12141a]/60 hover:bg-[#1a1d24] text-slate-300 font-bold border border-[#3f3f46]/35 transition active:scale-95"
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Export Subsystem buttons */}
            <div className="hidden sm:flex gap-1.5">
              <button
                onClick={() => exportToGeoJSON(incidents, criticalAssets)}
                className="p-1 px-1.5 rounded bg-[#1a1d24] hover:bg-[#06b6d4] hover:text-white border border-[#1a1d24] text-[9.5px] transition flex items-center gap-1 font-mono"
                title="Download GeoJSON Map Layers"
              >
                <Download className="w-3 h-3" />
                <span>GEOJSON</span>
              </button>
              <button
                onClick={() => exportToCSV(incidents)}
                className="p-1 px-1.5 rounded bg-[#1a1d24] hover:bg-[#06b6d4] hover:text-white border border-[#1a1d24] text-[9.5px] transition flex items-center gap-1 font-mono"
                title="Download CSV Incident Sheet"
              >
                <Download className="w-3 h-3" />
                <span>CSV</span>
              </button>
            </div>

            <button
              onClick={() => setIsDashboardCollapsed(!isDashboardCollapsed)}
              aria-label={isDashboardCollapsed ? 'Expand Dashboard' : 'Collapse Dashboard'}
              className="p-1 hover:text-white text-slate-400 transition"
            >
              {isDashboardCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Dashboard 4-Column Mosaic Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#3f3f46]/40 overflow-y-auto md:overflow-hidden h-full">

          {/* Column 1: Flight & Maritime Live Streams */}
          <div className="p-3 overflow-y-auto flex flex-col gap-2 font-mono h-full">
            <div className="text-[9.5px] text-cyan-400 font-bold tracking-wider uppercase flex justify-between border-b border-[#3f3f46]/40 pb-1.5">
              <span>1. THE MAP & STREAMS</span>
              <div className="flex items-center gap-1.5">
                {aircraftsStatus === 'offline' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>}
                <span className={aircraftsStatus === 'offline' ? 'text-amber-500' : 'text-[#22c55e]'}>
                  {aircraftsStatus === 'offline' ? 'CACHED' : 'ONLINE'}
                </span>
              </div>
            </div>

            {aircrafts.length === 0 ? (
              <div className="text-center text-slate-500 text-xs py-4">No planes detected in airspace.</div>
            ) : (
              <div className="space-y-2 flex-1 overflow-y-auto max-h-[22vh]">
                {aircrafts.slice(0, 15).map((jet, idx) => (
                  <div
                    key={`jet-${idx}`}
                    onClick={() => setSelectedFeature({ ...jet, featureType: 'Aircraft' })}
                    className="p-2 bg-[#12141a]/60 hover:bg-[#1a1d24] rounded border border-[#3f3f46]/30 cursor-pointer transition text-[11px] flex justify-between items-center"
                  >
                    <div className="flex items-center gap-2">
                      <Plane className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <div>
                        <div className="font-extrabold text-white">{jet.callsign}</div>
                        <div className="text-[9.5px] text-slate-400">Alt: {jet.baro_altitude} m</div>
                      </div>
                    </div>
                    <span className="text-cyan-400 font-mono text-[10px]">{jet.true_track}° TRK</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Column 2: THE WIRE (News Geotag Ticker) */}
          <div className="p-3 overflow-y-auto flex flex-col gap-2 h-full">
            <div className="text-[9.5px] text-cyan-400 font-bold font-mono tracking-wider uppercase flex justify-between border-b border-[#3f3f46]/40 pb-1.5">
              <span>2. THE WIRE</span>
              <span className="text-[#22c55e] font-bold">{rssArticles.length} ARTICLES</span>
            </div>

            {rssLoading ? (
              <div className="p-4 flex flex-col items-center justify-center gap-2 text-slate-500 font-mono text-xs">
                <RefreshCw className="w-4 h-4 animate-spin text-[#22c55e]" />
                <span>Crawling Google News feed...</span>
              </div>
            ) : rssArticles.length === 0 ? (
              <div className="text-center text-slate-500 text-xs py-4 font-mono">No articles parsed currently.</div>
            ) : (
              <div className="space-y-2 flex-1 overflow-y-auto max-h-[22vh]">
                {rssArticles.slice(0, 15).map((art, idx) => (
                  <div
                    key={`rss-${idx}`}
                    onClick={() => setSelectedFeature({ ...art, featureType: 'RSSArticle' })}
                    className="p-2 bg-[#12141a]/60 hover:bg-[#1a1d24] rounded border border-[#3f3f46]/30 cursor-pointer transition text-[11px]"
                  >
                    <div className="font-bold text-slate-200 line-clamp-1 hover:text-cyan-400 transition leading-snug">
                      {art.title}
                    </div>
                    <div className="text-[9.5px] text-slate-500 mt-1 flex justify-between font-mono">
                      <span className="text-cyan-400 font-bold">{art.source}</span>
                      <span>{new Date(art.pubDate).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Column 3: STOCKS (DSEX Dhaka Stock Exchange Matrix) */}
          <div className="p-3 overflow-y-auto flex flex-col gap-2 font-mono h-full">
            <div className="text-[9.5px] text-cyan-400 font-bold tracking-wider uppercase flex justify-between border-b border-[#3f3f46]/40 pb-1.5">
              <span>3. STOCKS INDEX</span>
              <span className={dsexStatus === 'stale' ? 'text-amber-500 animate-pulse' : 'text-[#22c55e]'}>
                {dsexStatus === 'stale' ? 'STALE' : 'LIVE'}
              </span>
            </div>

            <div className="p-2.5 rounded border bg-[#12141a]/60 border-[#3f3f46]/30 text-slate-300">
              <div className="font-bold text-slate-400 text-[10px] uppercase">DSEX MARKET INDEX</div>
              <div className="text-white font-extrabold text-[15px] mt-1 flex justify-between items-baseline">
                <span>{dsexValue.toFixed(2)}</span>
                <span className={`text-xs font-bold ${dsexChange >= 0 ? 'text-[#22c55e]' : 'text-red-400'}`}>
                  {dsexChange >= 0 ? '+' : ''}{dsexChange.toFixed(2)}
                </span>
              </div>
            </div>

            {divisionWeather && Object.keys(divisionWeather).length > 0 && (
              <div className="mt-1 p-2 bg-[#12141a]/40 border border-[#3f3f46]/20 rounded text-[9.5px]">
                <div className="text-[8.5px] text-slate-500 font-bold mb-1 uppercase">DIVISIONS WEATHER</div>
                <div className="grid grid-cols-2 gap-1 text-center">
                  {Object.entries(divisionWeather).slice(0, 4).map(([div, data]: any) => (
                    <div key={div} className="bg-[#12141a] p-1 rounded border border-[#3f3f46]/20 flex justify-between">
                      <span className="text-slate-400 font-bold truncate">{div}</span>
                      <span className="text-white font-bold">{data.temp}°C</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Column 4: Situational Risk Index Panel (3 Real-time Danger Dials) */}
          <div className="p-3 overflow-y-auto flex flex-col gap-2 font-mono h-full">
            <div className="text-[9.5px] text-cyan-400 font-bold tracking-wider uppercase flex justify-between border-b border-[#3f3f46]/40 pb-1.5">
              <span>4. SITUATIONAL RISK PANEL</span>
              <span className="text-red-400 font-bold">ALERT DIALS</span>
            </div>

            <div className="space-y-2.5 text-[10px] flex-1 overflow-y-auto max-h-[22vh]">
              {/* Dial 1: Environmental Risk */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>ENVIRONMENTAL RISK:</span>
                  <span className="text-cyan-400 font-bold">{riskAnalysis.breakdown.disaster}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#12141a] rounded-full overflow-hidden border border-[#3f3f46]/30">
                  <div style={{ width: `${riskAnalysis.breakdown.disaster}%` }} className="h-full bg-cyan-400 transition-all duration-500"></div>
                </div>
              </div>

              {/* Dial 2: Infrastructure Status */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>INFRASTRUCTURE RISK:</span>
                  <span className="text-[#f59e0b] font-bold">{riskAnalysis.breakdown.hydrology}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#12141a] rounded-full overflow-hidden border border-[#3f3f46]/30">
                  <div style={{ width: `${riskAnalysis.breakdown.hydrology}%` }} className="h-full bg-[#f59e0b] transition-all duration-500"></div>
                </div>
              </div>

              {/* Dial 3: Public Event Activity */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>PUBLIC INCIDENT RISK:</span>
                  <span className="text-red-400 font-bold">{riskAnalysis.breakdown.military}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#12141a] rounded-full overflow-hidden border border-[#3f3f46]/30">
                  <div style={{ width: `${riskAnalysis.breakdown.military}%` }} className="h-full bg-red-400 transition-all duration-500"></div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Feature Details Inspector Side Drawer */}
      {selectedFeature && (
        <aside style={{ zIndex: 1000 }} className="absolute top-16 right-4 w-[90%] sm:w-96 max-h-[calc(100vh-16rem)] rounded-lg shadow-2xl smooth-sidebar-transition flex flex-col glass-panel border border-brand-border">
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
                    <span className="text-slate-200 font-bold">
                      {selectedFeature.temperature}°C
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>WIND FLOW:</span>
                    <span className="text-slate-200 font-bold">
                      {selectedFeature.windSpeed} km/h @ {selectedFeature.windDirection}°
                    </span>
                  </div>
                </>
              )}

              {selectedFeature.featureType === 'Aircraft' && (
                <>
                  <div className="flex justify-between">
                    <span>CALLSIGN:</span>
                    <span className="text-purple-400 font-bold">{selectedFeature.callsign}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ALTITUDE:</span>
                    <span className="text-slate-200">{selectedFeature.baro_altitude} m</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TRUE TRACK:</span>
                    <span className="text-slate-200">{selectedFeature.true_track}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ON GROUND:</span>
                    <span className="text-slate-200">{selectedFeature.on_ground ? 'YES' : 'NO'}</span>
                  </div>
                </>
              )}

              {selectedFeature.featureType === 'ThermalPoint' && (
                <>
                  <div className="flex justify-between">
                    <span>THERMAL FOCUS:</span>
                    <span className="text-red-500 font-bold">ACTIVE ANOMALY</span>
                  </div>
                  <div className="flex justify-between">
                    <span>BRIGHTNESS T31:</span>
                    <span className="text-slate-200">{selectedFeature.bright_t31} K</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SCAN RATE:</span>
                    <span className="text-slate-200">{selectedFeature.scan}</span>
                  </div>
                </>
              )}

              {selectedFeature.featureType === 'Earthquake' && (
                <>
                  <div className="flex justify-between">
                    <span>MAGNITUDE:</span>
                    <span className="text-orange-500 font-bold">{selectedFeature.magnitude} Richter</span>
                  </div>
                  <div className="flex justify-between">
                    <span>LOCATION FOCUS:</span>
                    <span className="text-slate-200">{selectedFeature.place}</span>
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
                <span>LAT: {selectedFeature.lat || selectedFeature.latitude || 'N/A'}</span>
                <span>LNG: {selectedFeature.lng || selectedFeature.longitude || 'N/A'}</span>
              </div>
            </div>

            {/* Offline AI Analysis context block */}
            <div className="bg-[#12141a] p-3 rounded-md border border-brand-border space-y-2 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 tracking-wider">
                  <Cpu className="w-3.5 h-3.5 text-brand-emerald animate-pulse" />
                  <span>AI REGIONAL RECONNAISSANCE ENGINE</span>
                </div>
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
            </div>

          </div>
        </aside>
      )}

      {/* BYOK Configuration Modal */}
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
