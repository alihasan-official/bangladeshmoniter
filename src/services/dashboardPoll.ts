import useStore from '../store/useStore';

/**
 * Validates payload structures safely before state updates
 */
export const ResponseValidator = {
  validateAviation(data: any): any[] {
    if (!data || !Array.isArray(data.states)) return [];
    return data.states.map((s: any) => ({
      callsign: (s[1] || 'UNK').trim(),
      longitude: s[5],
      latitude: s[6],
      baro_altitude: s[7] || 0,
      true_track: s[10] || 0,
      on_ground: s[8]
    })).filter((a: any) => typeof a.longitude === 'number' && typeof a.latitude === 'number');
  },

  validateFires(csvText: string): any[] {
    if (!csvText || typeof csvText !== 'string') return [];
    const lines = csvText.trim().split('\n');
    if (lines.length <= 1) return [];

    const headers = lines[0].split(',');
    const latIdx = headers.indexOf('latitude');
    const lngIdx = headers.indexOf('longitude');
    const brightIdx = headers.indexOf('bright_t31');
    const scanIdx = headers.indexOf('scan');

    if (latIdx === -1 || lngIdx === -1) return [];

    const points: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length < headers.length) continue;

      const lat = parseFloat(parts[latIdx]);
      const lng = parseFloat(parts[lngIdx]);
      if (isNaN(lat) || isNaN(lng)) continue;

      points.push({
        id: `fire-${i}`,
        latitude: lat,
        longitude: lng,
        bright_t31: brightIdx !== -1 ? parseFloat(parts[brightIdx]) : 300,
        scan: scanIdx !== -1 ? parseFloat(parts[scanIdx]) : 1.0
      });
    }
    return points;
  },

  validateEarthquakes(data: any): any[] {
    if (!data || !Array.isArray(data.features)) return [];
    return data.features.map((f: any) => ({
      id: f.id,
      coordinates: f.geometry?.coordinates?.slice(0, 2),
      magnitude: f.properties?.mag,
      place: f.properties?.place || 'Tectonic Delta Hinge',
      time: f.properties?.time
    })).filter((eq: any) => eq.coordinates && eq.coordinates.length === 2 && eq.magnitude > 3.0);
  }
};

/**
 * Executes high-density real-time dashboard API fetches safely with localized catch triggers
 */
export async function pollDashboardPipelines() {
  const store = useStore.getState();

  // 1. Aviation tracking (OpenSky Network)
  try {
    const res = await fetch('https://opensky-network.org/api/states/all?lamin=20.3&lomin=88.0&lamax=26.6&lomax=92.7', { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      const valid = ResponseValidator.validateAviation(data);
      store.setAircrafts(valid);
      store.setAircraftsStatus('nominal');
    } else {
      store.setAircraftsStatus('offline');
    }
  } catch (e) {
    console.warn('[OPENSKY] Rate limit / connection error, fallback offline state engaged');
    store.setAircraftsStatus('offline');
  }

  // 2. Thermal Hazard / FIRMS (Using active MODIS / VIIRS area fallback feed or test sandbox tokens)
  try {
    // Free public MODIS point tracker via standardized NASA Earthdata feeds (or fallback area parsing)
    const res = await fetch('https://firms.modaps.eosdis.nasa.gov/api/area/csv/6f4142db6ca8df8750800b6f937d12db/MODIS_SPH/88.0,20.3,92.7,26.6/1', { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const csv = await res.text();
      const points = ResponseValidator.validateFires(csv);
      store.setFires(points);
      store.setFiresStatus('nominal');
    } else {
      store.setFiresStatus('offline');
    }
  } catch (e) {
    console.warn('[FIRMS] Thermal sats unreachable. Falling back to offline marker indicators');
    store.setFiresStatus('offline');
  }

  // 3. Dhaka Stock Exchange Index Delta
  try {
    const res = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/^DSEX', { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      const result = data?.chart?.result?.[0];
      const meta = result?.meta;
      const quote = result?.indicators?.quote?.[0];
      if (meta && quote) {
        const close = meta.regularMarketPrice || 5642.15;
        const prevClose = meta.previousClose || 5654.60;
        store.setDsexData(close, close - prevClose, 'nominal');
      } else {
        store.setDsexData(store.dsexValue, store.dsexChange, 'stale');
      }
    } else {
      store.setDsexData(store.dsexValue, store.dsexChange, 'stale');
    }
  } catch (e) {
    console.warn('[YAHOO] Market chart index fetch timeout, marking as cached index');
    store.setDsexData(store.dsexValue, store.dsexChange, 'stale');
  }

  // 4. Seismic Tectonic Activity (USGS GeoJSON format)
  try {
    const res = await fetch('https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=19.0&maxlatitude=28.0&minlongitude=87.0&maxlongitude=94.0', { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      const eq = ResponseValidator.validateEarthquakes(data);
      store.setEarthquakes(eq);
      store.setEarthquakesStatus('nominal');
    } else {
      store.setEarthquakesStatus('offline');
    }
  } catch (e) {
    console.warn('[USGS] Seismic activities unreachable.');
    store.setEarthquakesStatus('offline');
  }

  // 5. Open-Meteo multi-coordinate weather panels
  try {
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=23.81,22.35,24.90,24.37,22.70,22.82,25.75,24.00&longitude=90.41,91.78,91.86,88.60,90.36,89.54,89.25,89.25&current_weather=true', { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const divisions = ['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Barisal', 'Khulna', 'Rangpur', 'Mymensingh'];
        const mapped: any = {};
        data.forEach((item: any, i: number) => {
          const div = divisions[i];
          if (div && item.current_weather) {
            mapped[div] = {
              temp: item.current_weather.temperature,
              wind: item.current_weather.windspeed,
              code: item.current_weather.weathercode
            };
          }
        });
        store.setDivisionWeather(mapped, 'nominal');
      } else {
        store.setDivisionWeather(store.divisionWeather, 'offline');
      }
    } else {
      store.setDivisionWeather(store.divisionWeather, 'offline');
    }
  } catch (e) {
    console.warn('[OPEN-METEO] Forecaster dropped out');
    store.setDivisionWeather(store.divisionWeather, 'offline');
  }
}
