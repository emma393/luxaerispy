
# UPDATED safe_route_image WITH GENERATED DEFAULT

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

    def generated_city_image(slug):
        if not slug:
            return None
        for ext in ["webp", "jpg", "jpeg", "png"]:
            path = f"/assets/images/cities/{slug}.{ext}"
            if self.asset_exists(path):
                return path
        return None

    if (
        not candidate
        or candidate in BAD_HERO_IMAGES
        or "business-class" in candidate.lower()
        or "first-class" in candidate.lower()
        or "premium-economy" in candidate.lower()
    ):
        city_img = generated_city_image(destination_slug)
        if city_img:
            return city_img

        dest_img = self.safe_destination_image(destination_slug, None)
        if dest_img:
            return dest_img

        return "/assets/images/generated/default.webp"

    if candidate.startswith("/assets/") and not self.asset_exists(candidate):
        city_img = generated_city_image(destination_slug)
        if city_img:
            return city_img

        return "/assets/images/generated/default.webp"

    return candidate
