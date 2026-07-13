import { RSSArticle } from '../store/useStore';

// List of verified active RSS feeds from Bangladesh news portals
const PORTALS = [
  { name: 'Dhaka Tribune', url: 'https://www.dhakatribune.com/feed' },
  { name: 'Daily Sun', url: 'https://www.daily-sun.com/magazine/rss' },
  { name: 'JagoNews24', url: 'https://www.jagonews24.com/rss/rss.xml' },
  { name: 'Bangla Tribune', url: 'https://www.banglatribune.com/feed' },
  { name: 'BDNews24', url: 'https://bdnews24.com/?widgetName=rssfeed&widgetId=9&getXmlFeed=true' },
];

/**
 * Extracts a thumbnail URL from HTML description / content strings.
 * Commonly buried in nested <img> elements inside RSS fields.
 */
function extractImgSrc(html: string): string {
  if (!html) return '';
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : '';
}

/**
 * Clean HTML tags from a text snippet.
 */
function cleanDescription(html: string): string {
  if (!html) return '';
  // Strip tags
  let text = html.replace(/<\/?[^>]+(>|$)/g, '');
  // Unescape common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return text.trim().substring(0, 200) + (text.length > 200 ? '...' : '');
}

/**
 * Fetch a single RSS feed via rss2json CORS bypass API
 */
async function fetchFeed(portal: typeof PORTALS[0]): Promise<RSSArticle[]> {
  const encodedUrl = encodeURIComponent(portal.url);
  const bypassUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodedUrl}`;

  const response = await fetch(bypassUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${portal.name}: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.status !== 'ok') {
    throw new Error(`rss2json response status is not ok for ${portal.name}`);
  }

  const items = data.items || [];
  return items.map((item: any): RSSArticle => {
    // Attempt standard thumbnail, enclosure, or extract from description
    let thumbnail = '';
    if (item.thumbnail) {
      thumbnail = item.thumbnail;
    } else if (item.enclosure && item.enclosure.link) {
      thumbnail = item.enclosure.link;
    } else {
      thumbnail = extractImgSrc(item.description || '') || extractImgSrc(item.content || '');
    }

    return {
      title: item.title || 'Untitled Article',
      link: item.link || '#',
      pubDate: item.pubDate || item.pub_date || new Date().toISOString(),
      description: cleanDescription(item.description || item.content || ''),
      thumbnail,
      source: portal.name,
    };
  });
}

/**
 * Aggregates all RSS news feeds concurrently, bypassing CORS,
 * sorting them in strict reverse chronological order.
 */
export async function aggregateBangladeshNews(): Promise<RSSArticle[]> {
  const promises = PORTALS.map((portal) =>
    fetchFeed(portal).catch((err) => {
      console.warn(`[RSS AGGREGATOR] Gracefully skipped ${portal.name}:`, err);
      return [] as RSSArticle[];
    })
  );

  const results = await Promise.allSettled(promises);
  const articles: RSSArticle[] = [];

  results.forEach((res) => {
    if (res.status === 'fulfilled') {
      articles.push(...res.value);
    }
  });

  // Strict chronological sorting (newest first)
  return articles.sort((a, b) => {
    const timeA = new Date(a.pubDate).getTime();
    const timeB = new Date(b.pubDate).getTime();
    return timeB - timeA;
  });
}
