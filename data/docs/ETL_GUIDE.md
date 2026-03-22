# How to build the best production dataset

## Best outcome workflow

1. Collect airports from real airport datasets
2. Normalize airports into the airport schema
3. Collect airline and route relationships from reliable route datasets
4. Add lounge data only after airport references are stable
5. Add aircraft references only after airline references are stable
6. Generate destination pages from city and route clusters
7. Generate flight-number pages only when airline + route mapping is valid

## Why this works

This prevents:
- broken internal links
- thin or fake route pages
- disconnected lounge pages
- duplicate entities
- weak SEO page clusters

## Recommended ETL order

### Phase 1
- airports
- cities
- destinations

### Phase 2
- airlines
- aircraft
- alliances

### Phase 3
- routes
- lounges

### Phase 4
- flight numbers

## Page clusters that grow fastest in Google

- airport pages
- route pages
- lounge pages
- airline cabin pages
- aircraft pages

## Critical rule

Never publish internal_notes or source_notes directly on customer-facing pages.
