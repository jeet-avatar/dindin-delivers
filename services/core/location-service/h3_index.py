"""
Dollor.ai - H3 Hexagonal Grid Indexing
======================================

Implementation of Uber's H3 hexagonal grid system for efficient
spatial indexing and driver matching.

H3 Benefits:
- Consistent cell sizes (no distortion at poles like lat/lon grids)
- Efficient neighbor lookups (k-ring algorithm)
- Resolution 9 = ~0.1 km² cells (perfect for delivery/rideshare)
- Used by Uber, DoorDash, Lyft for real-time operations

Resolution Reference:
- Res 0: ~4,357,449.42 km² (global)
- Res 4: ~1,770.35 km² (country)
- Res 7: ~5.16 km² (city district)
- Res 9: ~0.1 km² (neighborhood - RECOMMENDED for delivery)
- Res 11: ~0.003 km² (building level)
- Res 15: ~0.0000009 km² (sub-meter)
"""

import logging
from typing import List, Dict, Optional, Tuple, Set
from dataclasses import dataclass
from datetime import datetime
import json

try:
    import h3
    H3_AVAILABLE = True
except ImportError:
    H3_AVAILABLE = False
    logging.warning("h3 package not installed. Install with: pip install h3")

logger = logging.getLogger(__name__)


# =============================================================================
# CONFIGURATION
# =============================================================================

# H3 Resolution for different use cases
class H3Resolution:
    """H3 resolution levels for different use cases."""
    CITY = 7        # ~5.16 km² - City-wide operations
    DISTRICT = 8    # ~0.74 km² - District level
    NEIGHBORHOOD = 9  # ~0.1 km² - Neighborhood (RECOMMENDED)
    BLOCK = 10      # ~0.015 km² - Block level
    BUILDING = 11   # ~0.003 km² - Building level

# Default resolution for driver indexing
DEFAULT_RESOLUTION = H3Resolution.NEIGHBORHOOD


# =============================================================================
# H3 HELPER FUNCTIONS
# =============================================================================

def lat_lng_to_h3(lat: float, lng: float, resolution: int = DEFAULT_RESOLUTION) -> str:
    """
    Convert latitude/longitude to H3 hexagon index.

    Args:
        lat: Latitude (-90 to 90)
        lng: Longitude (-180 to 180)
        resolution: H3 resolution (0-15, default 9)

    Returns:
        H3 index as hex string (e.g., '89283082803ffff')
    """
    if not H3_AVAILABLE:
        # Fallback: Create a simple grid index
        return f"fallback_{int(lat*1000)}_{int(lng*1000)}_{resolution}"

    return h3.latlng_to_cell(lat, lng, resolution)


def h3_to_lat_lng(h3_index: str) -> Tuple[float, float]:
    """
    Convert H3 index to center lat/lng coordinates.

    Args:
        h3_index: H3 hexagon index

    Returns:
        Tuple of (latitude, longitude)
    """
    if not H3_AVAILABLE or h3_index.startswith("fallback_"):
        # Fallback: Parse simple grid index
        parts = h3_index.split("_")
        if len(parts) >= 3:
            return float(parts[1]) / 1000, float(parts[2]) / 1000
        return 0.0, 0.0

    return h3.cell_to_latlng(h3_index)


def get_h3_neighbors(h3_index: str, k_ring: int = 1) -> List[str]:
    """
    Get neighboring hexagons (k-ring).

    k=1: 7 hexagons (center + 6 neighbors)
    k=2: 19 hexagons
    k=3: 37 hexagons

    Args:
        h3_index: Center hexagon index
        k_ring: Number of rings (default 1)

    Returns:
        List of H3 indices including center and neighbors
    """
    if not H3_AVAILABLE or h3_index.startswith("fallback_"):
        return [h3_index]

    return list(h3.grid_disk(h3_index, k_ring))


def h3_distance(h3_index1: str, h3_index2: str) -> int:
    """
    Calculate grid distance between two H3 cells.

    This is the number of hexagon "hops" between cells,
    not the actual geographic distance.

    Args:
        h3_index1: First H3 index
        h3_index2: Second H3 index

    Returns:
        Grid distance (number of hexagon hops)
    """
    if not H3_AVAILABLE:
        return 0

    try:
        return h3.grid_distance(h3_index1, h3_index2)
    except Exception:
        return -1  # Cells might be too far apart or different resolutions


def get_h3_ring(h3_index: str, k: int) -> List[str]:
    """
    Get hexagons at exactly k distance (ring, not disk).

    Args:
        h3_index: Center hexagon
        k: Ring distance

    Returns:
        List of H3 indices at exactly k distance
    """
    if not H3_AVAILABLE or k == 0:
        return [h3_index] if k == 0 else []

    return list(h3.grid_ring(h3_index, k))


def get_h3_boundary(h3_index: str) -> List[Tuple[float, float]]:
    """
    Get the boundary coordinates of an H3 hexagon.

    Useful for visualization and geofencing.

    Args:
        h3_index: H3 hexagon index

    Returns:
        List of (lat, lng) tuples forming the hexagon boundary
    """
    if not H3_AVAILABLE or h3_index.startswith("fallback_"):
        return []

    return list(h3.cell_to_boundary(h3_index))


def h3_cell_area(h3_index: str) -> float:
    """
    Get the area of an H3 cell in km².

    Args:
        h3_index: H3 hexagon index

    Returns:
        Cell area in square kilometers
    """
    if not H3_AVAILABLE or h3_index.startswith("fallback_"):
        return 0.1  # Approximate for resolution 9

    return h3.cell_area(h3_index, unit='km^2')


# =============================================================================
# H3 SPATIAL INDEX
# =============================================================================

@dataclass
class IndexedDriver:
    """Driver data stored in H3 index."""
    driver_id: int
    h3_index: str
    latitude: float
    longitude: float
    is_available: bool
    is_on_delivery: bool
    rating: float
    acceptance_rate: float
    current_order_id: Optional[int]
    updated_at: datetime

    def to_dict(self) -> dict:
        return {
            "driver_id": self.driver_id,
            "h3_index": self.h3_index,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "is_available": self.is_available,
            "is_on_delivery": self.is_on_delivery,
            "rating": self.rating,
            "acceptance_rate": self.acceptance_rate,
            "current_order_id": self.current_order_id,
            "updated_at": self.updated_at.isoformat(),
        }


class H3SpatialIndex:
    """
    H3-based spatial index for efficient driver lookups.

    Uses Redis for persistence and real-time updates.

    Data Structure in Redis:
    - h3:drivers:{h3_index} -> SET of driver_ids
    - h3:driver:{driver_id} -> HASH with driver data
    - h3:driver:{driver_id}:h3 -> STRING with current h3_index
    """

    H3_DRIVERS_PREFIX = "h3:drivers:"
    H3_DRIVER_PREFIX = "h3:driver:"
    TTL_SECONDS = 300  # 5 minutes - driver must update within this time

    def __init__(self, redis_client, resolution: int = DEFAULT_RESOLUTION):
        """
        Initialize H3 spatial index.

        Args:
            redis_client: Redis client instance
            resolution: H3 resolution (default 9)
        """
        self.redis = redis_client
        self.resolution = resolution
        logger.info(f"H3 Spatial Index initialized with resolution {resolution}")

    async def update_driver_location(
        self,
        driver_id: int,
        latitude: float,
        longitude: float,
        is_available: bool = True,
        is_on_delivery: bool = False,
        rating: float = 5.0,
        acceptance_rate: float = 1.0,
        current_order_id: Optional[int] = None,
    ) -> str:
        """
        Update driver location in H3 index.

        Args:
            driver_id: Unique driver identifier
            latitude: Current latitude
            longitude: Current longitude
            is_available: Whether driver is available
            is_on_delivery: Whether driver is on active delivery
            rating: Driver rating (1-5)
            acceptance_rate: Order acceptance rate (0-1)
            current_order_id: Current order ID if on delivery

        Returns:
            H3 index where driver is now located
        """
        # Calculate new H3 index
        new_h3_index = lat_lng_to_h3(latitude, longitude, self.resolution)

        # Get previous H3 index
        h3_key = f"{self.H3_DRIVER_PREFIX}{driver_id}:h3"
        old_h3_index = self.redis.get(h3_key)

        # Remove from old cell if moved to new cell
        if old_h3_index and old_h3_index != new_h3_index:
            old_set_key = f"{self.H3_DRIVERS_PREFIX}{old_h3_index}"
            self.redis.srem(old_set_key, driver_id)
            logger.debug(f"Driver {driver_id} moved from {old_h3_index} to {new_h3_index}")

        # Add to new cell
        new_set_key = f"{self.H3_DRIVERS_PREFIX}{new_h3_index}"
        self.redis.sadd(new_set_key, driver_id)
        self.redis.expire(new_set_key, self.TTL_SECONDS * 2)  # Cell TTL longer than driver

        # Update H3 index reference
        self.redis.setex(h3_key, self.TTL_SECONDS, new_h3_index)

        # Store driver data
        driver_data = IndexedDriver(
            driver_id=driver_id,
            h3_index=new_h3_index,
            latitude=latitude,
            longitude=longitude,
            is_available=is_available,
            is_on_delivery=is_on_delivery,
            rating=rating,
            acceptance_rate=acceptance_rate,
            current_order_id=current_order_id,
            updated_at=datetime.utcnow(),
        )

        driver_key = f"{self.H3_DRIVER_PREFIX}{driver_id}"
        self.redis.hset(driver_key, mapping={
            "h3_index": new_h3_index,
            "latitude": str(latitude),
            "longitude": str(longitude),
            "is_available": str(is_available),
            "is_on_delivery": str(is_on_delivery),
            "rating": str(rating),
            "acceptance_rate": str(acceptance_rate),
            "current_order_id": str(current_order_id) if current_order_id else "",
            "updated_at": datetime.utcnow().isoformat(),
        })
        self.redis.expire(driver_key, self.TTL_SECONDS)

        return new_h3_index

    async def remove_driver(self, driver_id: int):
        """
        Remove driver from H3 index.

        Called when driver goes offline or is deactivated.
        """
        h3_key = f"{self.H3_DRIVER_PREFIX}{driver_id}:h3"
        h3_index = self.redis.get(h3_key)

        if h3_index:
            set_key = f"{self.H3_DRIVERS_PREFIX}{h3_index}"
            self.redis.srem(set_key, driver_id)

        self.redis.delete(h3_key)
        self.redis.delete(f"{self.H3_DRIVER_PREFIX}{driver_id}")

        logger.debug(f"Driver {driver_id} removed from H3 index")

    async def get_drivers_in_cell(
        self,
        h3_index: str,
        available_only: bool = True,
    ) -> List[IndexedDriver]:
        """
        Get all drivers in a specific H3 cell.

        Args:
            h3_index: H3 hexagon index
            available_only: Only return available drivers

        Returns:
            List of IndexedDriver objects
        """
        set_key = f"{self.H3_DRIVERS_PREFIX}{h3_index}"
        driver_ids = self.redis.smembers(set_key)

        drivers = []
        for driver_id in driver_ids:
            driver_data = await self.get_driver(int(driver_id))
            if driver_data:
                if available_only and (not driver_data.is_available or driver_data.is_on_delivery):
                    continue
                drivers.append(driver_data)

        return drivers

    async def get_driver(self, driver_id: int) -> Optional[IndexedDriver]:
        """
        Get driver data from index.

        Args:
            driver_id: Driver ID

        Returns:
            IndexedDriver or None if not found
        """
        driver_key = f"{self.H3_DRIVER_PREFIX}{driver_id}"
        data = self.redis.hgetall(driver_key)

        if not data:
            return None

        return IndexedDriver(
            driver_id=driver_id,
            h3_index=data.get("h3_index", ""),
            latitude=float(data.get("latitude", 0)),
            longitude=float(data.get("longitude", 0)),
            is_available=data.get("is_available", "True") == "True",
            is_on_delivery=data.get("is_on_delivery", "False") == "True",
            rating=float(data.get("rating", 5.0)),
            acceptance_rate=float(data.get("acceptance_rate", 1.0)),
            current_order_id=int(data["current_order_id"]) if data.get("current_order_id") else None,
            updated_at=datetime.fromisoformat(data.get("updated_at", datetime.utcnow().isoformat())),
        )

    async def find_nearby_drivers(
        self,
        latitude: float,
        longitude: float,
        k_ring: int = 2,
        available_only: bool = True,
        limit: int = 20,
    ) -> List[IndexedDriver]:
        """
        Find drivers in nearby H3 cells using k-ring expansion.

        Args:
            latitude: Center latitude
            longitude: Center longitude
            k_ring: Number of rings to search (default 2 = ~19 cells)
            available_only: Only return available drivers
            limit: Maximum number of drivers to return

        Returns:
            List of nearby IndexedDriver objects sorted by distance
        """
        from geopy.distance import geodesic

        center_h3 = lat_lng_to_h3(latitude, longitude, self.resolution)
        nearby_cells = get_h3_neighbors(center_h3, k_ring)

        all_drivers = []
        for cell in nearby_cells:
            drivers = await self.get_drivers_in_cell(cell, available_only)
            all_drivers.extend(drivers)

        # Calculate distances and sort
        for driver in all_drivers:
            distance = geodesic(
                (latitude, longitude),
                (driver.latitude, driver.longitude)
            ).kilometers
            driver._distance = distance

        # Sort by distance
        all_drivers.sort(key=lambda d: d._distance)

        return all_drivers[:limit]

    async def get_cell_statistics(self, h3_index: str) -> Dict:
        """
        Get statistics for an H3 cell.

        Args:
            h3_index: H3 hexagon index

        Returns:
            Dictionary with cell statistics
        """
        drivers = await self.get_drivers_in_cell(h3_index, available_only=False)

        available = sum(1 for d in drivers if d.is_available and not d.is_on_delivery)
        on_delivery = sum(1 for d in drivers if d.is_on_delivery)
        offline = len(drivers) - available - on_delivery

        avg_rating = sum(d.rating for d in drivers) / len(drivers) if drivers else 0

        center_lat, center_lng = h3_to_lat_lng(h3_index)
        area_km2 = h3_cell_area(h3_index)

        return {
            "h3_index": h3_index,
            "center": {"latitude": center_lat, "longitude": center_lng},
            "area_km2": round(area_km2, 4),
            "total_drivers": len(drivers),
            "available_drivers": available,
            "on_delivery": on_delivery,
            "offline": offline,
            "average_rating": round(avg_rating, 2),
        }


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def visualize_h3_coverage(center_lat: float, center_lng: float, k_ring: int = 3) -> Dict:
    """
    Generate H3 coverage data for visualization.

    Useful for debugging and admin dashboards.

    Args:
        center_lat: Center latitude
        center_lng: Center longitude
        k_ring: Number of rings

    Returns:
        GeoJSON-compatible data for visualization
    """
    center_h3 = lat_lng_to_h3(center_lat, center_lng, DEFAULT_RESOLUTION)
    cells = get_h3_neighbors(center_h3, k_ring)

    features = []
    for cell in cells:
        boundary = get_h3_boundary(cell)
        if boundary:
            # Convert to GeoJSON polygon
            coordinates = [[lng, lat] for lat, lng in boundary]
            coordinates.append(coordinates[0])  # Close polygon

            center = h3_to_lat_lng(cell)

            features.append({
                "type": "Feature",
                "properties": {
                    "h3_index": cell,
                    "center_lat": center[0],
                    "center_lng": center[1],
                    "is_center": cell == center_h3,
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [coordinates],
                }
            })

    return {
        "type": "FeatureCollection",
        "features": features,
        "metadata": {
            "center_h3": center_h3,
            "resolution": DEFAULT_RESOLUTION,
            "k_ring": k_ring,
            "total_cells": len(cells),
        }
    }
