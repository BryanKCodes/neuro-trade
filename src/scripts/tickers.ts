import fs from "fs";
import path from "path";

const NASDAQ_URL = "https://www.nasdaqtrader.com/dynamic/symdir/nasdaqlisted.txt";
const OTHER_URL = "https://www.nasdaqtrader.com/dynamic/symdir/otherlisted.txt";

const FALLBACK_PATH = path.join(process.cwd(), "src", "data", "tickers.json");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

interface Ticker {
  symbol: string;
  name: string;
}

async function fetchTickersFromURL(url: string): Promise<Ticker[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
    
    const text = await res.text();
    return text
      .split("\n")
      .slice(1)
      .filter(line => line.trim())
      .map(line => {
        const [symbol, name] = line.split("|");
        return { symbol, name };
      })
      .filter(item => item.symbol && !item.symbol.includes("Test"));
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return [];
  }
}

export async function getTickers(): Promise<Ticker[]> {
  try {
    // Try to read from cache first
    if (fs.existsSync(FALLBACK_PATH)) {
      const cacheData = JSON.parse(fs.readFileSync(FALLBACK_PATH, "utf8"));
      const isFresh = Date.now() - cacheData.updated < CACHE_TTL_MS;
      
      if (isFresh && Array.isArray(cacheData.tickers)) {
        return cacheData.tickers;
      }
    }
  } catch (error) {
    console.error("Error reading cache:", error);
  }

  try {
    // Fetch new data if cache is stale or missing
    const [nasdaq, other] = await Promise.all([
      fetchTickersFromURL(NASDAQ_URL),
      fetchTickersFromURL(OTHER_URL)
    ]);
    
    const tickers = Array.from(
      new Map([...nasdaq, ...other].map(t => [t.symbol, t])).values()
    );

    
    // Save to cache
    fs.mkdirSync(path.dirname(FALLBACK_PATH), { recursive: true });
    fs.writeFileSync(FALLBACK_PATH, JSON.stringify({
      tickers,
      updated: Date.now()
    }, null, 2));
    
    return tickers;
  } catch (error) {
    console.error("Failed to fetch tickers:", error);
    
    // Try to use cache even if stale
    try {
      if (fs.existsSync(FALLBACK_PATH)) {
        const cacheData = JSON.parse(fs.readFileSync(FALLBACK_PATH, "utf8"));
        if (Array.isArray(cacheData.tickers)) {
          return cacheData.tickers;
        }
      }
    } catch (fallbackError) {
      console.error("Failed to use fallback:", fallbackError);
    }
    
    return [
      { "symbol": "AAPL", "name": "Apple Inc" },
      { "symbol": "MSFT", "name": "Microsoft Corp" },
      { "symbol": "GOOGL", "name": "Alphabet Inc" },
      { "symbol": "AMZN", "name": "Amazon.com Inc" },
      { "symbol": "TSLA", "name": "Tesla Inc" },
      { "symbol": "META", "name": "Meta Platforms Inc" },
      { "symbol": "NFLX", "name": "Netflix Inc" },
      { "symbol": "NVDA", "name": "NVIDIA Corp" },
      { "symbol": "BRK.B", "name": "Berkshire Hathaway Inc" },
      { "symbol": "SPY", "name": "SPDR S&P 500 ETF Trust" },
      { "symbol": "QQQ", "name": "Invesco QQQ Trust" },
    ]; // Default fallback
  }
}