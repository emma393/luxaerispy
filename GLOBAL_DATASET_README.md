LuxAeris full global dataset pack

What this is:
- a global-scale structured SEO dataset for destinations, city-pair route guides, keyword variants, and destination cluster pages
- suitable for 500k+ page architecture when combined with your existing airport, airline, and route builder

What this is not:
- not a licensed live fares database
- not a real-time schedule feed
- not a full verified airport-code database for every city

Files included:
- data/global_destinations_seed.json
- data/global_city_pair_guides.json
- data/global_keyword_variants.json
- data/destination_cluster_matrix.json
- data/global_page_count_model.json
- scripts/merge_global_dataset.py

How to use:
1. Upload these files into your repo
2. Run: python scripts/merge_global_dataset.py
3. Keep route/city-pair seed files for the next generator expansion phase
4. Use them to extend builder logic into full city-pair and keyword-variant page generation
