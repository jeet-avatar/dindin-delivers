"""
Dollor.ai - Driver Matching Algorithm
=====================================

Intelligent driver matching for food delivery and rideshare.

Matching Factors:
1. Distance (primary) - Closest driver gets priority
2. ETA - Estimated time to pickup
3. Rating - Higher rated drivers preferred
4. Acceptance Rate - More reliable drivers preferred
5. Load Balancing - Distribute orders evenly
6. Vehicle Type - Match to order requirements (food delivery vs rideshare)
7. Zone Familiarity - Drivers who know the area

Algorithm:
1. Find all available drivers within radius using H3 index
2. Calculate composite score for each driver
3. Sort by score (highest first)
4. Return top N candidates for assignment

DoorDash/Uber Approach:
- Use H3 hexagonal grid for spatial indexing
- K-ring neighbor search for expanding radius
- Real-time score calculation
- Batched matching for efficiency
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import math

from geopy.distance import geodesic

from h3_index import (
    H3SpatialIndex,
    IndexedDriver,
    lat_lng_to_h3,
    get_h3_neighbors,
    DEFAULT_RESOLUTION,
)

logger = logging.getLogger(__name__)


# =============================================================================
# CONFIGURATION
# =============================================================================

class MatchingConfig:
    """Configuration for driver matching algorithm."""

    # Distance settings
    MAX_DISTANCE_KM = 10.0  # Maximum distance for matching
    INITIAL_SEARCH_RADIUS = 2  # H3 k-ring (expands if no drivers found)
    MAX_SEARCH_RADIUS = 5  # Maximum k-ring expansion

    # Speed assumptions
    AVERAGE_SPEED_KMH = 40.0  # Average driving speed
    PICKUP_TIME_MINUTES = 3  # Time to accept and start pickup

    # Scoring weights (must sum to 1.0)
    WEIGHT_DISTANCE = 0.40  # 40% - Distance is most important
    WEIGHT_ETA = 0.25       # 25% - ETA matters for customer experience
    WEIGHT_RATING = 0.15    # 15% - Quality matters
    WEIGHT_ACCEPTANCE = 0.10  # 10% - Reliability
    WEIGHT_LOAD_BALANCE = 0.10  # 10% - Fair distribution

    # Minimum thresholds
    MIN_RATING = 3.0  # Minimum acceptable driver rating
    MIN_ACCEPTANCE_RATE = 0.5  # Minimum 50% acceptance rate

    # Time constraints
    MAX_ETA_MINUTES = 30  # Maximum acceptable ETA


class OrderType(str, Enum):
    """Type of order/ride for matching."""
    FOOD_DELIVERY = "food_delivery"
    RIDESHARE = "rideshare"
    PACKAGE_DELIVERY = "package"


class VehicleType(str, Enum):
    """Vehicle types for matching."""
    CAR = "car"
    MOTORCYCLE = "motorcycle"
    BICYCLE = "bicycle"
    SCOOTER = "scooter"
    WALKING = "walking"


# =============================================================================
# DATA MODELS
# =============================================================================

@dataclass
class MatchRequest:
    """Request for driver matching."""
    order_id: int
    order_type: OrderType
    pickup_latitude: float
    pickup_longitude: float
    dropoff_latitude: float
    dropoff_longitude: float
    required_vehicle_types: Optional[List[VehicleType]] = None
    max_eta_minutes: int = MatchingConfig.MAX_ETA_MINUTES
    priority: int = 1  # Higher = more urgent
    created_at: datetime = field(default_factory=datetime.utcnow)

    @property
    def pickup_location(self) -> Tuple[float, float]:
        return (self.pickup_latitude, self.pickup_longitude)

    @property
    def dropoff_location(self) -> Tuple[float, float]:
        return (self.dropoff_latitude, self.dropoff_longitude)


@dataclass
class MatchCandidate:
    """A driver candidate for an order."""
    driver: IndexedDriver
    distance_km: float
    eta_minutes: int
    score: float
    score_breakdown: Dict[str, float] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "driver_id": self.driver.driver_id,
            "latitude": self.driver.latitude,
            "longitude": self.driver.longitude,
            "distance_km": round(self.distance_km, 2),
            "eta_minutes": self.eta_minutes,
            "rating": self.driver.rating,
            "acceptance_rate": self.driver.acceptance_rate,
            "score": round(self.score, 3),
            "score_breakdown": {
                k: round(v, 3) for k, v in self.score_breakdown.items()
            },
        }


@dataclass
class MatchResult:
    """Result of driver matching."""
    request: MatchRequest
    candidates: List[MatchCandidate]
    best_match: Optional[MatchCandidate]
    search_radius_used: int
    total_drivers_considered: int
    matching_time_ms: float
    matched_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "order_id": self.request.order_id,
            "best_match": self.best_match.to_dict() if self.best_match else None,
            "candidates": [c.to_dict() for c in self.candidates[:5]],  # Top 5
            "total_candidates": len(self.candidates),
            "search_radius": self.search_radius_used,
            "drivers_considered": self.total_drivers_considered,
            "matching_time_ms": round(self.matching_time_ms, 2),
            "matched_at": self.matched_at.isoformat(),
        }


# =============================================================================
# SCORING FUNCTIONS
# =============================================================================

def calculate_distance_score(distance_km: float) -> float:
    """
    Calculate distance score (0-1, higher is better).

    Uses exponential decay - closer drivers score much higher.
    """
    if distance_km <= 0:
        return 1.0
    if distance_km >= MatchingConfig.MAX_DISTANCE_KM:
        return 0.0

    # Exponential decay: e^(-x/2) for x in km
    return math.exp(-distance_km / 2)


def calculate_eta_score(eta_minutes: int) -> float:
    """
    Calculate ETA score (0-1, higher is better).

    Linear decay from max ETA.
    """
    if eta_minutes <= 0:
        return 1.0
    if eta_minutes >= MatchingConfig.MAX_ETA_MINUTES:
        return 0.0

    return 1.0 - (eta_minutes / MatchingConfig.MAX_ETA_MINUTES)


def calculate_rating_score(rating: float) -> float:
    """
    Calculate rating score (0-1, higher is better).

    Rating is 1-5, normalized to 0-1.
    """
    if rating < 1:
        return 0.0
    if rating > 5:
        rating = 5.0

    # Normalize: (rating - 1) / 4
    return (rating - 1) / 4


def calculate_acceptance_score(acceptance_rate: float) -> float:
    """
    Calculate acceptance rate score (0-1).

    Higher acceptance rate = more reliable.
    """
    return max(0.0, min(1.0, acceptance_rate))


def calculate_load_balance_score(
    driver_orders_today: int,
    average_orders_per_driver: float,
) -> float:
    """
    Calculate load balancing score (0-1, higher is better).

    Drivers with fewer orders today get higher scores to balance load.
    """
    if average_orders_per_driver <= 0:
        return 1.0

    if driver_orders_today == 0:
        return 1.0

    # Score decreases as driver has more orders than average
    ratio = driver_orders_today / average_orders_per_driver
    return max(0.0, 1.0 - (ratio - 1) * 0.5)


def calculate_composite_score(
    distance_km: float,
    eta_minutes: int,
    rating: float,
    acceptance_rate: float,
    driver_orders_today: int = 0,
    average_orders: float = 10.0,
) -> Tuple[float, Dict[str, float]]:
    """
    Calculate composite matching score.

    Returns:
        Tuple of (total_score, breakdown_dict)
    """
    distance_score = calculate_distance_score(distance_km)
    eta_score = calculate_eta_score(eta_minutes)
    rating_score = calculate_rating_score(rating)
    acceptance_score = calculate_acceptance_score(acceptance_rate)
    load_score = calculate_load_balance_score(driver_orders_today, average_orders)

    breakdown = {
        "distance": distance_score,
        "eta": eta_score,
        "rating": rating_score,
        "acceptance": acceptance_score,
        "load_balance": load_score,
    }

    total_score = (
        MatchingConfig.WEIGHT_DISTANCE * distance_score +
        MatchingConfig.WEIGHT_ETA * eta_score +
        MatchingConfig.WEIGHT_RATING * rating_score +
        MatchingConfig.WEIGHT_ACCEPTANCE * acceptance_score +
        MatchingConfig.WEIGHT_LOAD_BALANCE * load_score
    )

    return total_score, breakdown


# =============================================================================
# DRIVER MATCHER
# =============================================================================

class DriverMatcher:
    """
    Intelligent driver matching service.

    Uses H3 spatial index for efficient nearby driver lookups,
    then scores and ranks candidates.
    """

    def __init__(
        self,
        h3_index: H3SpatialIndex,
        driver_stats_provider=None,
    ):
        """
        Initialize driver matcher.

        Args:
            h3_index: H3SpatialIndex for driver lookups
            driver_stats_provider: Optional callable to get driver statistics
        """
        self.h3_index = h3_index
        self.driver_stats_provider = driver_stats_provider
        self._matches_made = 0
        self._total_matching_time_ms = 0.0

    async def find_best_match(self, request: MatchRequest) -> MatchResult:
        """
        Find the best driver match for an order.

        Uses expanding radius search:
        1. Start with small k-ring
        2. Score all drivers found
        3. If no suitable match, expand radius
        4. Return best match or None

        Args:
            request: MatchRequest with order details

        Returns:
            MatchResult with best match and candidates
        """
        start_time = datetime.utcnow()

        all_drivers = []
        search_radius = MatchingConfig.INITIAL_SEARCH_RADIUS

        # Expanding radius search
        while search_radius <= MatchingConfig.MAX_SEARCH_RADIUS:
            drivers = await self.h3_index.find_nearby_drivers(
                latitude=request.pickup_latitude,
                longitude=request.pickup_longitude,
                k_ring=search_radius,
                available_only=True,
                limit=100,
            )

            # Filter by minimum requirements
            qualified_drivers = [
                d for d in drivers
                if d.rating >= MatchingConfig.MIN_RATING
                and d.acceptance_rate >= MatchingConfig.MIN_ACCEPTANCE_RATE
            ]

            all_drivers.extend(qualified_drivers)

            # If we have enough candidates, stop expanding
            if len(all_drivers) >= 5:
                break

            search_radius += 1

        # Score and rank candidates
        candidates = await self._score_candidates(request, all_drivers)

        # Sort by score (highest first)
        candidates.sort(key=lambda c: c.score, reverse=True)

        # Filter by max ETA
        valid_candidates = [
            c for c in candidates
            if c.eta_minutes <= request.max_eta_minutes
        ]

        # Calculate matching time
        matching_time_ms = (datetime.utcnow() - start_time).total_seconds() * 1000

        self._matches_made += 1
        self._total_matching_time_ms += matching_time_ms

        result = MatchResult(
            request=request,
            candidates=valid_candidates,
            best_match=valid_candidates[0] if valid_candidates else None,
            search_radius_used=search_radius,
            total_drivers_considered=len(all_drivers),
            matching_time_ms=matching_time_ms,
        )

        logger.info(
            f"Match for order {request.order_id}: "
            f"found {len(valid_candidates)} candidates in {matching_time_ms:.1f}ms"
        )

        return result

    async def _score_candidates(
        self,
        request: MatchRequest,
        drivers: List[IndexedDriver],
    ) -> List[MatchCandidate]:
        """
        Score all driver candidates.

        Args:
            request: Match request
            drivers: List of available drivers

        Returns:
            List of scored MatchCandidates
        """
        candidates = []

        for driver in drivers:
            # Calculate distance
            distance_km = geodesic(
                (request.pickup_latitude, request.pickup_longitude),
                (driver.latitude, driver.longitude)
            ).kilometers

            # Skip if too far
            if distance_km > MatchingConfig.MAX_DISTANCE_KM:
                continue

            # Calculate ETA
            eta_minutes = self._calculate_eta(distance_km)

            # Get driver stats for load balancing
            driver_orders_today = 0
            if self.driver_stats_provider:
                try:
                    stats = await self.driver_stats_provider(driver.driver_id)
                    driver_orders_today = stats.get("orders_today", 0)
                except Exception:
                    pass

            # Calculate composite score
            score, breakdown = calculate_composite_score(
                distance_km=distance_km,
                eta_minutes=eta_minutes,
                rating=driver.rating,
                acceptance_rate=driver.acceptance_rate,
                driver_orders_today=driver_orders_today,
            )

            candidate = MatchCandidate(
                driver=driver,
                distance_km=distance_km,
                eta_minutes=eta_minutes,
                score=score,
                score_breakdown=breakdown,
            )

            candidates.append(candidate)

        return candidates

    def _calculate_eta(self, distance_km: float) -> int:
        """
        Calculate ETA in minutes.

        ETA = pickup_time + travel_time
        """
        if distance_km <= 0:
            return MatchingConfig.PICKUP_TIME_MINUTES

        travel_minutes = (distance_km / MatchingConfig.AVERAGE_SPEED_KMH) * 60
        total_minutes = MatchingConfig.PICKUP_TIME_MINUTES + travel_minutes

        return int(math.ceil(total_minutes))

    async def batch_match(
        self,
        requests: List[MatchRequest],
    ) -> List[MatchResult]:
        """
        Batch match multiple orders.

        Useful for periodic batch optimization.

        Args:
            requests: List of match requests

        Returns:
            List of match results
        """
        results = []
        assigned_drivers: set = set()

        # Sort by priority (higher first)
        sorted_requests = sorted(requests, key=lambda r: r.priority, reverse=True)

        for request in sorted_requests:
            result = await self.find_best_match(request)

            # Filter out already assigned drivers
            available_candidates = [
                c for c in result.candidates
                if c.driver.driver_id not in assigned_drivers
            ]

            if available_candidates:
                result.candidates = available_candidates
                result.best_match = available_candidates[0]
                assigned_drivers.add(available_candidates[0].driver.driver_id)

            results.append(result)

        return results

    def get_statistics(self) -> dict:
        """Get matcher statistics."""
        avg_time = (
            self._total_matching_time_ms / self._matches_made
            if self._matches_made > 0 else 0
        )

        return {
            "total_matches": self._matches_made,
            "average_matching_time_ms": round(avg_time, 2),
            "total_matching_time_ms": round(self._total_matching_time_ms, 2),
        }


# =============================================================================
# SURGE PRICING CALCULATOR
# =============================================================================

class SurgePricingCalculator:
    """
    Calculate surge pricing based on supply/demand.

    Surge Factors:
    - Demand: Number of pending orders in area
    - Supply: Number of available drivers in area
    - Time: Peak hours vs off-peak
    - Events: Special events or weather

    Surge Formula:
    surge = base_multiplier * (demand / supply) ^ elasticity
    """

    def __init__(
        self,
        base_multiplier: float = 1.0,
        max_surge: float = 3.0,
        elasticity: float = 0.5,
    ):
        self.base_multiplier = base_multiplier
        self.max_surge = max_surge
        self.elasticity = elasticity

    async def calculate_surge(
        self,
        h3_index: str,
        h3_spatial_index: H3SpatialIndex,
        pending_orders_count: int = 0,
    ) -> float:
        """
        Calculate surge multiplier for a location.

        Args:
            h3_index: H3 cell index
            h3_spatial_index: Spatial index for driver counts
            pending_orders_count: Number of pending orders

        Returns:
            Surge multiplier (1.0 = no surge)
        """
        # Get supply (available drivers)
        cell_stats = await h3_spatial_index.get_cell_statistics(h3_index)
        available_drivers = cell_stats.get("available_drivers", 0)

        # Demand is pending orders
        demand = pending_orders_count

        # Avoid division by zero
        if available_drivers == 0:
            return self.max_surge

        if demand == 0:
            return self.base_multiplier

        # Calculate surge
        demand_supply_ratio = demand / max(available_drivers, 1)
        surge = self.base_multiplier * (demand_supply_ratio ** self.elasticity)

        # Clamp to max surge
        surge = min(surge, self.max_surge)
        surge = max(surge, self.base_multiplier)

        return round(surge, 2)

    def get_surge_zone_data(
        self,
        h3_cells: List[str],
        surge_values: Dict[str, float],
    ) -> List[dict]:
        """
        Get surge data for visualization.

        Args:
            h3_cells: List of H3 cell indices
            surge_values: Dict of h3_index -> surge_multiplier

        Returns:
            List of cell data with surge info
        """
        from h3_index import h3_to_lat_lng, get_h3_boundary

        result = []
        for cell in h3_cells:
            surge = surge_values.get(cell, 1.0)
            center = h3_to_lat_lng(cell)
            boundary = get_h3_boundary(cell)

            result.append({
                "h3_index": cell,
                "center_lat": center[0],
                "center_lng": center[1],
                "surge_multiplier": surge,
                "surge_level": self._get_surge_level(surge),
                "boundary": boundary,
            })

        return result

    def _get_surge_level(self, surge: float) -> str:
        """Get human-readable surge level."""
        if surge <= 1.0:
            return "normal"
        elif surge <= 1.5:
            return "moderate"
        elif surge <= 2.0:
            return "high"
        else:
            return "very_high"
