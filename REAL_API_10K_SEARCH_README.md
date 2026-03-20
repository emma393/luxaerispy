
REAL API + 10K AIRPORT DATASET + DYNAMIC SEARCH SYSTEM

Included:
- scripts/fetch_real_airports_10k.py
- netlify/functions/airport-search.mjs
- netlify/functions/live-flight-search.mjs
- static/assets/airports-search-10k.json
- static/tools/live-route-search.html

How it works:
1. Run python scripts/fetch_real_airports_10k.py to build a 10k+ airport search index from the OurAirports open dataset.
2. Deploy on Netlify.
3. Add AVIATIONSTACK_API_KEY in Netlify environment variables.
4. Airport autocomplete starts after 2 typed characters and searches by city or code.
5. Live route search calls the Netlify function, which proxies the Aviationstack flights endpoint.

Current fallback:
- static/assets/airports-search-10k.json is prefilled from the repo's existing airports.json so the UI works immediately.
- The real 10k+ file is generated when you run the fetch script.

Provider notes:
- OurAirports publishes open airport CSV downloads and states the data is public domain.
- Aviationstack documents an airports endpoint and flights endpoint, with filters like dep_iata and arr_iata.
