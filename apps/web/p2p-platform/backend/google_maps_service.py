"""
Google Maps Service - Traffic-Aware ETA Calculations

Provides real-time ETA calculations using Google Maps Directions API
with caching to minimize API calls.
"""

import os
import time
import math
import httpx
from typing import Optional, Tuple
from dataclasses import dataclass
from functools import lru_cache

# Cache settings
CACHE_TTL_SECONDS = 60  # Cache ETA for 60 seconds
LOCATION_PRECISION = 3  # Decimal places (~100m precision)

# In-memory cache: key -> (timestamp, result)
_eta_cache: dict[str, Tuple[float, dict]] = {}


@dataclass
class ETAResult:
    """Result from ETA calculation"""
    eta_minutes: int
    distance_miles: float
    distance_meters: int
    duration_seconds: int
    is_traffic_aware: bool
    route_polyline: Optional[str] = None
    error: Optional[str] = None


def _round_location(lat: float, lng: float, precision: int = LOCATION_PRECISION) -> Tuple[float, float]:
    """Round location to reduce cache misses for nearby positions"""
    return (round(lat, precision), round(lng, precision))


def _get_cache_key(origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float) -> str:
    """Generate cache key from rounded coordinates"""
    o_lat, o_lng = _round_location(origin_lat, origin_lng)
    d_lat, d_lng = _round_location(dest_lat, dest_lng)
    return f"{o_lat},{o_lng}:{d_lat},{d_lng}"


def _is_cache_valid(cache_key: str) -> bool:
    """Check if cached value is still valid"""
    if cache_key not in _eta_cache:
        return False
    timestamp, _ = _eta_cache[cache_key]
    return (time.time() - timestamp) < CACHE_TTL_SECONDS


def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate straight-line distance between two points using Haversine formula.
    Returns distance in meters.
    """
    R = 6371000  # Earth's radius in meters

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

    return R * c


def _haversine_eta(origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float) -> ETAResult:
    """
    Fallback ETA calculation using Haversine distance and fixed speed.
    Used when Google Maps API is unavailable.
    """
    distance_meters = _haversine_distance(origin_lat, origin_lng, dest_lat, dest_lng)
    distance_miles = distance_meters / 1609.34

    # Assume 25 mph average urban delivery speed
    avg_speed_mph = 25
    duration_hours = distance_miles / avg_speed_mph
    duration_minutes = max(1, int(math.ceil(duration_hours * 60)))
    duration_seconds = int(duration_hours * 3600)

    # Add 2 minutes buffer for parking, walking to door, etc.
    eta_minutes = duration_minutes + 2

    return ETAResult(
        eta_minutes=eta_minutes,
        distance_miles=round(distance_miles, 2),
        distance_meters=int(distance_meters),
        duration_seconds=duration_seconds,
        is_traffic_aware=False,
        route_polyline=None,
        error=None
    )


async def get_traffic_eta(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
    use_cache: bool = True
) -> ETAResult:
    """
    Get traffic-aware ETA from Google Maps Directions API.

    Args:
        origin_lat: Driver's current latitude
        origin_lng: Driver's current longitude
        dest_lat: Destination (customer) latitude
        dest_lng: Destination (customer) longitude
        use_cache: Whether to use cached results (default True)

    Returns:
        ETAResult with ETA minutes, distance, and traffic awareness flag
    """
    # Check cache first
    cache_key = _get_cache_key(origin_lat, origin_lng, dest_lat, dest_lng)
    if use_cache and _is_cache_valid(cache_key):
        _, cached_result = _eta_cache[cache_key]
        return ETAResult(**cached_result)

    # Get API key
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key:
        # Fallback to Haversine if no API key
        return _haversine_eta(origin_lat, origin_lng, dest_lat, dest_lng)

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                "https://maps.googleapis.com/maps/api/directions/json",
                params={
                    "origin": f"{origin_lat},{origin_lng}",
                    "destination": f"{dest_lat},{dest_lng}",
                    "departure_time": "now",
                    "traffic_model": "best_guess",
                    "key": api_key
                }
            )

            if response.status_code != 200:
                # API error, fallback to Haversine
                return _haversine_eta(origin_lat, origin_lng, dest_lat, dest_lng)

            data = response.json()

            if data.get("status") != "OK" or not data.get("routes"):
                # No route found, fallback to Haversine
                return _haversine_eta(origin_lat, origin_lng, dest_lat, dest_lng)

            route = data["routes"][0]
            leg = route["legs"][0]

            # Extract distance
            distance_meters = leg["distance"]["value"]
            distance_miles = round(distance_meters / 1609.34, 2)

            # Extract duration - prefer duration_in_traffic for accuracy
            if "duration_in_traffic" in leg:
                duration_seconds = leg["duration_in_traffic"]["value"]
            else:
                duration_seconds = leg["duration"]["value"]

            # Convert to minutes, add 2 minute buffer for parking/walking
            eta_minutes = max(1, int(math.ceil(duration_seconds / 60)) + 2)

            # Get route polyline for potential map display
            polyline = route.get("overview_polyline", {}).get("points")

            result = ETAResult(
                eta_minutes=eta_minutes,
                distance_miles=distance_miles,
                distance_meters=distance_meters,
                duration_seconds=duration_seconds,
                is_traffic_aware=True,
                route_polyline=polyline,
                error=None
            )

            # Cache the result
            _eta_cache[cache_key] = (time.time(), {
                "eta_minutes": result.eta_minutes,
                "distance_miles": result.distance_miles,
                "distance_meters": result.distance_meters,
                "duration_seconds": result.duration_seconds,
                "is_traffic_aware": result.is_traffic_aware,
                "route_polyline": result.route_polyline,
                "error": result.error
            })

            return result

    except httpx.TimeoutException:
        # Timeout, fallback to Haversine
        return _haversine_eta(origin_lat, origin_lng, dest_lat, dest_lng)
    except Exception as e:
        # Any other error, fallback to Haversine
        result = _haversine_eta(origin_lat, origin_lng, dest_lat, dest_lng)
        result.error = str(e)
        return result


def get_traffic_eta_sync(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
    use_cache: bool = True
) -> ETAResult:
    """
    Synchronous version of get_traffic_eta for non-async contexts.
    Uses Haversine calculation only (no API call) to avoid blocking.
    """
    # Check cache first
    cache_key = _get_cache_key(origin_lat, origin_lng, dest_lat, dest_lng)
    if use_cache and _is_cache_valid(cache_key):
        _, cached_result = _eta_cache[cache_key]
        return ETAResult(**cached_result)

    # For sync contexts, just use Haversine to avoid blocking
    return _haversine_eta(origin_lat, origin_lng, dest_lat, dest_lng)


def clear_cache():
    """Clear the ETA cache (useful for testing)"""
    global _eta_cache
    _eta_cache = {}


def get_cache_stats() -> dict:
    """Get cache statistics for monitoring"""
    now = time.time()
    valid_entries = sum(1 for ts, _ in _eta_cache.values() if (now - ts) < CACHE_TTL_SECONDS)
    return {
        "total_entries": len(_eta_cache),
        "valid_entries": valid_entries,
        "expired_entries": len(_eta_cache) - valid_entries,
        "cache_ttl_seconds": CACHE_TTL_SECONDS
    }
