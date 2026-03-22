# Data fields that matter most for LuxAeris SEO

## airports
Core page type. High-value traffic and linking hub.

Required:
- code_iata
- code_icao
- slug
- name
- city_slug
- country_code
- country_name
- latitude
- longitude
- timezone
- airport_type
- premium_summary
- terminal_count
- featured_image
- related_lounge_slugs[]
- related_route_slugs[]
- related_airline_slugs[]

## terminals
Useful for terminal / lounge / airline matching.

Required:
- terminal_slug
- airport_slug
- terminal_name
- terminal_number
- summary
- featured_image

## lounges
Very strong search intent.

Required:
- lounge_slug
- lounge_name
- airport_slug
- terminal_slug
- operator_name
- access_rules
- opening_hours
- features[]
- customer_summary
- featured_image

## airlines
Needed for airline cabin pages and route comparisons.

Required:
- airline_slug
- airline_name
- iata_code
- icao_code
- alliance_slug
- primary_hubs[]
- premium_summary
- featured_image
- related_aircraft_slugs[]

## aircraft
Needed for seat / cabin / route context.

Required:
- aircraft_slug
- family
- manufacturer
- model_name
- premium_summary
- featured_image
- related_airline_slugs[]

## routes
One of the biggest SEO drivers.

Required:
- route_slug
- origin_airport_slug
- destination_airport_slug
- origin_city_slug
- destination_city_slug
- primary_cabin
- route_type
- estimated_duration_minutes
- route_summary
- featured_image
- airline_slugs[]
- aircraft_slugs[]

## destinations
Destination-led luxury travel pages.

Required:
- destination_slug
- display_name
- country_code
- city_slug
- luxury_summary
- featured_image
- airport_slugs[]
- route_slugs[]

## flight_numbers
Optional SEO layer tied to live-status capability.

Required:
- flight_slug
- flight_number
- airline_slug
- route_slug
- origin_airport_slug
- destination_airport_slug
- flight_summary

## cities
Useful for city-level hubs and route clustering.

Required:
- city_slug
- city_name
- country_code
- country_name
- airport_slugs[]
- destination_slug
- premium_summary

## alliances
Useful for oneworld / Star Alliance / SkyTeam cluster pages.

Required:
- alliance_slug
- alliance_name
- member_airline_slugs[]
- summary
