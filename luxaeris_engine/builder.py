
# --- ONLY RELEVANT PATCH APPLIED ---

def resolve_route_destination_slug(self, route: dict) -> str:
    slug = (route.get("destination_city_slug") or "").strip()
    if slug:
        return slug

    dest_airport = self.airport_map.get(route.get("destination_airport_slug", ""), {})
    slug = (dest_airport.get("destination_slug") or dest_airport.get("city_slug") or "").strip()
    if slug:
        return slug

    route_slug = (route.get("route_slug") or "").strip().lower()
    if "-to-" in route_slug:
        try:
            after_to = route_slug.split("-to-", 1)[1]
            code = after_to.split("-", 1)[0].upper()
            for airport in self.airports:
                if (airport.get("code_iata") or "").upper() == code:
                    slug = (
                        airport.get("destination_slug")
                        or airport.get("city_slug")
                        or airport.get("city_name", "").lower().replace(" ", "-")
                    )
                    if slug:
                        return slug
        except Exception:
            pass

    city_name = (dest_airport.get("city_name") or "").strip()
    if city_name:
        return city_name.lower().replace(" ", "-")

    return ""


def safe_route_image(self, route: dict) -> str:
    candidate = (route.get("featured_image") or "").strip()
    destination_slug = self.resolve_route_destination_slug(route)

    if (
        not candidate
        or candidate in BAD_HERO_IMAGES
        or "business-class" in candidate.lower()
        or "first-class" in candidate.lower()
        or "premium-economy" in candidate.lower()
    ):
        return self.safe_destination_image(destination_slug, self.config["default_image"])

    if candidate.startswith("/assets/") and not self.asset_exists(candidate):
        return self.safe_destination_image(destination_slug, self.config["default_image"])

    return candidate
