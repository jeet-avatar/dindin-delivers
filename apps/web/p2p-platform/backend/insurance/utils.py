"""GPS and distance utility functions for insurance tracking."""
import math
from typing import Optional


def haversine_miles(
    lat1: Optional[float], lon1: Optional[float],
    lat2: Optional[float], lon2: Optional[float]
) -> Optional[float]:
    """
    Calculate the great-circle distance between two points on Earth in miles.

    Uses the Haversine formula to compute the shortest distance between two
    GPS coordinates.

    Args:
        lat1: Latitude of first point (degrees)
        lon1: Longitude of first point (degrees)
        lat2: Latitude of second point (degrees)
        lon2: Longitude of second point (degrees)

    Returns:
        Distance in miles, or None if any coordinate is None

    Example:
        >>> haversine_miles(40.7128, -74.0060, 40.7128, -74.0060)
        0.0
    """
    if any(c is None for c in (lat1, lon1, lat2, lon2)):
        return None

    # Earth radius in miles
    R = 3958.8

    # Convert latitude and longitude differences to radians
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    # Haversine formula
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)

    # Convert to miles
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
