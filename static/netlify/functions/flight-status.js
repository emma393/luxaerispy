exports.handler = async function(event) {
  const flight = (event.queryStringParameters?.flight || '').trim().toUpperCase();
  const key = process.env.AVIATIONSTACK_API_KEY;
  if (!flight) return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Missing flight number' }) };
  if (!key) return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'fallback', flight, message: 'AVIATIONSTACK_API_KEY not configured' }) };
  const url = `http://api.aviationstack.com/v1/flights?access_key=${key}&flight_iata=${encodeURIComponent(flight)}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    const item = Array.isArray(data?.data) && data.data.length ? data.data[0] : null;
    if (!item) return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'live', flight, message: 'No live result found for that flight number' }) };
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'live', flight, status: item.flight_status || 'Unknown', departure: item.departure?.iata || item.departure?.airport || '', arrival: item.arrival?.iata || item.arrival?.airport || '', aircraft: item.aircraft?.registration || item.aircraft?.iata || '', airline: item.airline?.name || '' }) };
  } catch (err) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Live API request failed', detail: String(err) }) };
  }
};
