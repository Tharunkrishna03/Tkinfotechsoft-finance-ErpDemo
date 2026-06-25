const MARKET_DATA_ENDPOINT = "/api/market-data/";

export async function getDashboardMarketData(refresh = false) {
  const url = refresh ? `${MARKET_DATA_ENDPOINT}?refresh=true` : MARKET_DATA_ENDPOINT;
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Market data request failed with status ${response.status}`);
  }

  return response.json();
}
