
const BASE_URL = "https://api.aviationstack.com/v1/flights";

export async function handler(event) {
  const params = event.queryStringParameters || {};
  const dep = (params.origin || "").trim().toUpperCase();
  const arr = (params.destination || "").trim().toUpperCase();
  const date = (params.date || "").trim();
  const key = process.env.AVIATIONSTACK_API_KEY;

  if (!dep || !arr) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "origin and destination are required" })
    };
  }

  if (!key) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "fallback",
        results: [],
        note: "AVIATIONSTACK_API_KEY is missing. Add it in Netlify environment variables."
      })
    };
  }

  const url = new URL(BASE_URL);
  url.searchParams.set("access_key", key);
  url.searchParams.set("dep_iata", dep);
  url.searchParams.set("arr_iata", arr);
  url.searchParams.set("limit", "20");
  if (date) url.searchParams.set("flight_date", date);

  try {
    const res = await fetch(url.toString());
    const data = await res.json();
    const results = (data.data || []).slice(0, 20).map(item => ({
      airline: item.airline?.name || "",
      flight_iata: item.flight?.iata || "",
      departure_airport: item.departure?.airport || "",
      departure_iata: item.departure?.iata || dep,
      departure_scheduled: item.departure?.scheduled || "",
      arrival_airport: item.arrival?.airport || "",
      arrival_iata: item.arrival?.iata || arr,
      arrival_scheduled: item.arrival?.scheduled || "",
      flight_status: item.flight_status || ""
    }));
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ provider: "aviationstack", results })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "live flight search failed" })
    };
  }
}
