// RSS News Aggregator and Geotagger Service for BangladeshMonitor v2.0
// Fetches free news feeds via a CORS-bypass public proxy (Allorigins) and parses/geotags automatically.

export interface GeotaggedNews {
  id: string;
  source: string;
  title: string;
  category: string;
  timestamp: string;
  impact: 'high' | 'medium' | 'low';
  summary?: string;
  url: string;
  lat: number;
  lng: number;
}

// Highly accurate district coordinates lookup table
export const BANGLADESH_DISTRICTS: Record<string, { lat: number; lng: number }> = {
  'Dhaka': { lat: 23.8103, lng: 90.4125 },
  'Chittagong': { lat: 22.3569, lng: 91.7832 },
  'Chisang': { lat: 22.3569, lng: 91.7832 }, // alias
  'Cox\'s Bazar': { lat: 21.4272, lng: 92.0058 },
  'Coxs Bazar': { lat: 21.4272, lng: 92.0058 },
  'Sylhet': { lat: 24.8949, lng: 91.8687 },
  'Khulna': { lat: 22.8456, lng: 89.5403 },
  'Rajshahi': { lat: 24.3745, lng: 88.6011 },
  'Barisal': { lat: 22.7010, lng: 90.3535 },
  'Rangpur': { lat: 25.7439, lng: 89.2752 },
  'Mymensingh': { lat: 24.7471, lng: 90.4203 },
  'Comilla': { lat: 23.4682, lng: 91.1788 },
  'Narayanganj': { lat: 23.6238, lng: 90.5000 },
  'Gazipur': { lat: 23.9999, lng: 90.4203 },
  'Jessore': { lat: 23.1667, lng: 89.2167 },
  'Bogra': { lat: 24.8481, lng: 89.3730 },
  'Tangail': { lat: 24.2500, lng: 89.9167 },
  'Dinajpur': { lat: 25.6217, lng: 88.6354 },
  'Feni': { lat: 23.0159, lng: 91.3976 },
  'Noakhali': { lat: 22.8724, lng: 91.0973 },
  'Chandpur': { lat: 23.2333, lng: 90.6500 },
  'Sunamganj': { lat: 25.0667, lng: 91.4000 },
  'Maulvibazar': { lat: 24.4833, lng: 91.7667 },
  'Habiganj': { lat: 24.3750, lng: 91.4167 },
  'Patuakhali': { lat: 22.3500, lng: 90.3333 },
  'Bhola': { lat: 22.6833, lng: 90.6500 },
  'Barguna': { lat: 22.1500, lng: 90.1167 },
  'Pirojpur': { lat: 22.5833, lng: 89.9667 },
  'Jhalokati': { lat: 22.6430, lng: 90.1970 },
  'Bagerhat': { lat: 22.6516, lng: 89.7859 },
  'Satkhira': { lat: 22.7185, lng: 89.0711 },
  'Kushtia': { lat: 24.0901, lng: 89.1199 },
  'Meherpur': { lat: 23.7667, lng: 88.6333 },
  'Chuadanga': { lat: 23.6401, lng: 88.8500 },
  'Jhenaidah': { lat: 23.5450, lng: 89.1720 },
  'Magura': { lat: 23.4833, lng: 89.4167 },
  'Narail': { lat: 23.1667, lng: 89.5000 },
  'Faridpur': { lat: 23.6071, lng: 89.8429 },
  'Gopalganj': { lat: 23.0050, lng: 89.8267 },
  'Madaripur': { lat: 23.1667, lng: 90.2000 },
  'Shariatpur': { lat: 23.2160, lng: 90.3500 },
  'Rajbari': { lat: 23.7574, lng: 89.6500 },
  'Manikganj': { lat: 23.8644, lng: 90.0047 },
  'Munshiganj': { lat: 23.5422, lng: 90.5305 },
  'Narsingdi': { lat: 23.9229, lng: 90.7177 },
  'Kishoreganj': { lat: 24.4400, lng: 90.7800 },
  'Netrokona': { lat: 24.8700, lng: 90.7300 },
  'Sherpur': { lat: 25.0200, lng: 90.0200 },
  'Jamalpur': { lat: 24.9375, lng: 89.9375 },
  'Sirajganj': { lat: 24.4577, lng: 89.7080 },
  'Pabna': { lat: 24.0150, lng: 89.2444 },
  'Natore': { lat: 24.4102, lng: 89.0076 },
  'Naogaon': { lat: 24.8053, lng: 88.9472 },
  'Nawabganj': { lat: 24.5964, lng: 88.2753 },
  'Chapai Nawabganj': { lat: 24.5964, lng: 88.2753 },
  'Gaibandha': { lat: 25.3333, lng: 89.5500 },
  'Kurigram': { lat: 25.8054, lng: 89.6361 },
  'Lalmonirhat': { lat: 25.9161, lng: 89.4481 },
  'Nilphamari': { lat: 25.9317, lng: 88.8560 },
  'Panchagarh': { lat: 26.3411, lng: 88.5541 },
  'Thakurgaon': { lat: 26.0418, lng: 88.4608 },
  'Bandarban': { lat: 22.1953, lng: 92.2184 },
  'Rangamati': { lat: 22.5010, lng: 92.2210 },
  'Khagrachhari': { lat: 23.1192, lng: 91.9841 },
};

// Sort keys in descending order of length so compound words (e.g., Chapai Nawabganj) are matched before simple words (e.g., Chapai/Nawabganj)
const SORTED_DISTRICTS = Object.keys(BANGLADESH_DISTRICTS).sort((a, b) => b.length - a.length);

/**
 * Parses headlines and body texts to find Bangladesh locations.
 * Matches the longest names first to prevent partial coordinate overlaps.
 */
export function extractCoordinatesFromText(text: string): { lat: number; lng: number; district: string } | null {
  if (!text) return null;

  for (const name of SORTED_DISTRICTS) {
    const regex = new RegExp(`\\b${name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    if (regex.test(text)) {
      return {
        lat: BANGLADESH_DISTRICTS[name].lat,
        lng: BANGLADESH_DISTRICTS[name].lng,
        district: name,
      };
    }
  }
  return null;
}

/**
 * Translates/cleanses standard titles if they contain known Bangla substrings
 */
export function cleanOrTranslateBangla(title: string): string {
  // Simple replacement map for keywords or standard headers often found in South Asian RSS
  let output = title;
  const translationPairs: [RegExp, string][] = [
    [/ঘূর্ণিঝড়/g, 'Cyclone'],
    [/বন্যা/g, 'Flood'],
    [/ভূমিকম্প/g, 'Earthquake'],
    [/আবহাওয়া/g, 'Weather Alert'],
    [/আগুন/g, 'Fire outbreak'],
  ];

  for (const [banglaRegex, englishText] of translationPairs) {
    output = output.replace(banglaRegex, englishText);
  }
  return output;
}

/**
 * Fetches RSS feeds from Google News under Bangladesh tags, bypassing CORS limits
 */
export async function fetchLiveIntelligenceNews(): Promise<GeotaggedNews[]> {
  // Google News Search Query focusing on emergencies and intelligence in Bangladesh
  const rssUrl = encodeURIComponent('https://news.google.com/rss/search?q=Bangladesh+disaster+OR+accident+OR+crime+OR+military+OR+cyclone+OR+flood+OR+infrastructure&hl=en-US&gl=US&ceid=US:en');
  const proxyUrl = `https://api.allorigins.win/raw?url=${rssUrl}`;

  try {
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`HTTP fetch error ${res.status}`);
    const xmlText = await res.text();

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    const items = xmlDoc.getElementsByTagName('item');
    const outputList: GeotaggedNews[] = [];

    for (let i = 0; i < Math.min(items.length, 12); i++) {
      const item = items[i];
      const rawTitle = item.getElementsByTagName('title')[0]?.textContent || 'Operational update';
      const cleanTitle = cleanOrTranslateBangla(rawTitle);

      const link = item.getElementsByTagName('link')[0]?.textContent || '#';
      const pubDate = item.getElementsByTagName('pubDate')[0]?.textContent || new Date().toISOString();
      const description = item.getElementsByTagName('description')[0]?.textContent || '';

      const contentToGeotag = `${cleanTitle} ${description}`;
      const locationMatch = extractCoordinatesFromText(contentToGeotag);

      // Default fallback coordinates if no location matches: Dhaka (the strategic center)
      const lat = locationMatch ? locationMatch.lat : 23.8103;
      const lng = locationMatch ? locationMatch.lng : 90.4125;

      // Categorize article
      let category = 'politics';
      const lowerTitle = cleanTitle.toLowerCase();
      if (lowerTitle.includes('flood') || lowerTitle.includes('river') || lowerTitle.includes('water') || lowerTitle.includes('rain')) {
        category = 'hydrology';
      } else if (lowerTitle.includes('cyclone') || lowerTitle.includes('storm') || lowerTitle.includes('weather') || lowerTitle.includes('temp')) {
        category = 'weather';
      } else if (lowerTitle.includes('border') || lowerTitle.includes('military') || lowerTitle.includes('army') || lowerTitle.includes('air force') || lowerTitle.includes('security')) {
        category = 'geopolitics';
      } else if (lowerTitle.includes('port') || lowerTitle.includes('vessel') || lowerTitle.includes('shipping') || lowerTitle.includes('sea')) {
        category = 'maritime';
      } else if (lowerTitle.includes('bridge') || lowerTitle.includes('power') || lowerTitle.includes('telecom') || lowerTitle.includes('outage') || lowerTitle.includes('road') || lowerTitle.includes('highway')) {
        category = 'logistics';
      }

      // Determine impact level
      let impact: 'high' | 'medium' | 'low' = 'low';
      if (lowerTitle.includes('dead') || lowerTitle.includes('critical') || lowerTitle.includes('kill') || lowerTitle.includes('severe') || lowerTitle.includes('alert') || lowerTitle.includes('emergency')) {
        impact = 'high';
      } else if (lowerTitle.includes('clash') || lowerTitle.includes('strike') || lowerTitle.includes('delay') || lowerTitle.includes('negotiat') || lowerTitle.includes('warn')) {
        impact = 'medium';
      }

      outputList.push({
        id: `rss-${i}`,
        source: item.getElementsByTagName('source')[0]?.textContent || 'Global OSINT Feed',
        title: cleanTitle,
        category,
        timestamp: new Date(pubDate).toISOString(),
        impact,
        summary: description.replace(/<[^>]*>/g, ''), // Strip HTML tags
        url: link,
        lat,
        lng,
      });
    }

    return outputList;
  } catch (error) {
    console.warn('Failed to parse Google News RSS Feed. Launching offline fallbacks.', error);
    return [];
  }
}
