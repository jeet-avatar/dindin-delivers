"""
Dollor.ai Order Service - Query Handlers
========================================

CQRS Query side: All read operations.
Queries can read from:
1. PostgreSQL (primary source of truth)
2. Elasticsearch (optimized for search/filtering)
3. Redis (cached hot data)

The query handler automatically selects the best data source based on the query type.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional
from abc import ABC, abstractmethod

from sqlalchemy.orm import Session
from sqlalchemy import desc


# =============================================================================
# QUERY BASE CLASS
# =============================================================================

@dataclass
class Query(ABC):
    """Base class for all queries."""

    @property
    @abstractmethod
    def query_type(self) -> str:
        """Return the query type identifier."""
        pass


# =============================================================================
# ORDER QUERIES
# =============================================================================

@dataclass
class GetOrderQuery(Query):
    """Query to get a single order by ID or order number."""
    order_id: str

    @property
    def query_type(self) -> str:
        return "GetOrder"


@dataclass
class GetCustomerOrdersQuery(Query):
    """Query to get orders for a specific customer."""
    customer_id: int
    status: Optional[str] = None
    limit: int = 50
    offset: int = 0

    @property
    def query_type(self) -> str:
        return "GetCustomerOrders"


@dataclass
class GetRestaurantOrdersQuery(Query):
    """Query to get orders for a specific restaurant/vendor."""
    vendor_id: int
    status: Optional[str] = None
    limit: int = 50
    offset: int = 0

    @property
    def query_type(self) -> str:
        return "GetRestaurantOrders"


@dataclass
class GetDriverOrdersQuery(Query):
    """Query to get orders for a specific driver."""
    driver_id: int
    status: Optional[str] = None
    limit: int = 50
    offset: int = 0

    @property
    def query_type(self) -> str:
        return "GetDriverOrders"


@dataclass
class SearchOrdersQuery(Query):
    """Query to search orders with various filters."""
    search: Optional[str] = None
    status: Optional[str] = None
    customer_id: Optional[int] = None
    vendor_id: Optional[int] = None
    driver_id: Optional[int] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    limit: int = 50
    offset: int = 0

    @property
    def query_type(self) -> str:
        return "SearchOrders"


@dataclass
class TrackOrderQuery(Query):
    """Query to get real-time tracking information for an order."""
    order_id: str

    @property
    def query_type(self) -> str:
        return "TrackOrder"


@dataclass
class GetOrderStatsQuery(Query):
    """Query to get order statistics."""
    vendor_id: Optional[int] = None
    customer_id: Optional[int] = None
    driver_id: Optional[int] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None

    @property
    def query_type(self) -> str:
        return "GetOrderStats"


# =============================================================================
# QUERY RESULT
# =============================================================================

@dataclass
class QueryResult:
    """Result of a query execution."""
    success: bool
    data: Optional[Any] = None
    total_count: Optional[int] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    source: str = "postgresql"  # postgresql, elasticsearch, redis


# =============================================================================
# QUERY HANDLER
# =============================================================================

class OrderQueryHandler:
    """
    Handles all order queries.

    The query handler reads from the appropriate data source:
    - Simple lookups: PostgreSQL
    - Search/filtering: Elasticsearch (when available)
    - Real-time data: Redis (when available)
    """

    def __init__(
        self,
        db: Session,
        elasticsearch_client=None,
        redis_client=None,
    ):
        self.db = db
        self.es = elasticsearch_client
        self.redis = redis_client

    def handle(self, query: Query) -> QueryResult:
        """Route query to appropriate handler."""
        handlers = {
            "GetOrder": self._handle_get_order,
            "GetCustomerOrders": self._handle_get_customer_orders,
            "GetRestaurantOrders": self._handle_get_restaurant_orders,
            "GetDriverOrders": self._handle_get_driver_orders,
            "SearchOrders": self._handle_search_orders,
            "TrackOrder": self._handle_track_order,
            "GetOrderStats": self._handle_get_order_stats,
        }

        handler = handlers.get(query.query_type)
        if not handler:
            return QueryResult(
                success=False,
                error_code="ORD-100",
                error_message=f"Unknown query type: {query.query_type}"
            )

        return handler(query)

    def _handle_get_order(self, query: GetOrderQuery) -> QueryResult:
        """Handle GetOrderQuery."""
        from models import Order

        order = self._get_order_by_id(query.order_id)
        if not order:
            return QueryResult(
                success=False,
                error_code="ORD-301",
                error_message="Order not found"
            )

        return QueryResult(
            success=True,
            data=self._order_to_dict(order),
            source="postgresql"
        )

    def _handle_get_customer_orders(self, query: GetCustomerOrdersQuery) -> QueryResult:
        """Handle GetCustomerOrdersQuery."""
        from models import Order, OrderStatus

        db_query = self.db.query(Order).filter(Order.customer_id == query.customer_id)

        if query.status:
            try:
                status_enum = OrderStatus[query.status.upper().replace(" ", "_")]
                db_query = db_query.filter(Order.status == status_enum)
            except KeyError:
                pass

        total = db_query.count()
        orders = db_query.order_by(desc(Order.created_at)).offset(query.offset).limit(query.limit).all()

        return QueryResult(
            success=True,
            data=[self._order_to_dict(order) for order in orders],
            total_count=total,
            source="postgresql"
        )

    def _handle_get_restaurant_orders(self, query: GetRestaurantOrdersQuery) -> QueryResult:
        """Handle GetRestaurantOrdersQuery."""
        from models import Order, OrderStatus

        db_query = self.db.query(Order).filter(Order.vendor_id == query.vendor_id)

        if query.status:
            try:
                status_enum = OrderStatus[query.status.upper().replace(" ", "_")]
                db_query = db_query.filter(Order.status == status_enum)
            except KeyError:
                pass

        total = db_query.count()
        orders = db_query.order_by(desc(Order.created_at)).offset(query.offset).limit(query.limit).all()

        return QueryResult(
            success=True,
            data=[self._order_to_dict(order) for order in orders],
            total_count=total,
            source="postgresql"
        )

    def _handle_get_driver_orders(self, query: GetDriverOrdersQuery) -> QueryResult:
        """Handle GetDriverOrdersQuery."""
        from models import Order, OrderStatus

        db_query = self.db.query(Order).filter(Order.driver_id == query.driver_id)

        if query.status:
            try:
                status_enum = OrderStatus[query.status.upper().replace(" ", "_")]
                db_query = db_query.filter(Order.status == status_enum)
            except KeyError:
                pass

        total = db_query.count()
        orders = db_query.order_by(desc(Order.created_at)).offset(query.offset).limit(query.limit).all()

        return QueryResult(
            success=True,
            data=[self._order_to_dict(order) for order in orders],
            total_count=total,
            source="postgresql"
        )

    def _handle_search_orders(self, query: SearchOrdersQuery) -> QueryResult:
        """
        Handle SearchOrdersQuery.

        Uses Elasticsearch if available for better search performance,
        falls back to PostgreSQL otherwise.
        """
        # Try Elasticsearch first
        if self.es and query.search:
            try:
                return self._search_orders_elasticsearch(query)
            except Exception:
                pass  # Fall back to PostgreSQL

        return self._search_orders_postgresql(query)

    def _search_orders_elasticsearch(self, query: SearchOrdersQuery) -> QueryResult:
        """Search orders using Elasticsearch."""
        must_clauses = []
        filter_clauses = []

        if query.search:
            must_clauses.append({
                "multi_match": {
                    "query": query.search,
                    "fields": [
                        "order_number^3",
                        "customer_name^2",
                        "customer_email",
                        "vendor_name^2",
                        "items.name",
                    ],
                    "type": "best_fields",
                    "fuzziness": "AUTO",
                }
            })

        if query.status:
            filter_clauses.append({"term": {"status": query.status.lower()}})

        if query.customer_id:
            filter_clauses.append({"term": {"customer_id": query.customer_id}})

        if query.vendor_id:
            filter_clauses.append({"term": {"vendor_id": query.vendor_id}})

        if query.driver_id:
            filter_clauses.append({"term": {"driver_id": query.driver_id}})

        if query.date_from:
            filter_clauses.append({"range": {"created_at": {"gte": query.date_from.isoformat()}}})

        if query.date_to:
            filter_clauses.append({"range": {"created_at": {"lte": query.date_to.isoformat()}}})

        if query.min_amount:
            filter_clauses.append({"range": {"total_amount": {"gte": query.min_amount}}})

        if query.max_amount:
            filter_clauses.append({"range": {"total_amount": {"lte": query.max_amount}}})

        es_query = {
            "bool": {
                "must": must_clauses if must_clauses else [{"match_all": {}}],
                "filter": filter_clauses,
            }
        }

        result = self.es.search(
            index="orders",
            query=es_query,
            from_=query.offset,
            size=query.limit,
            sort=[{"created_at": "desc"}],
        )

        orders = [hit["_source"] for hit in result["hits"]["hits"]]
        total = result["hits"]["total"]["value"]

        return QueryResult(
            success=True,
            data=orders,
            total_count=total,
            source="elasticsearch"
        )

    def _search_orders_postgresql(self, query: SearchOrdersQuery) -> QueryResult:
        """Search orders using PostgreSQL."""
        from models import Order, OrderStatus

        db_query = self.db.query(Order)

        if query.search:
            search_term = f"%{query.search}%"
            db_query = db_query.filter(
                (Order.order_number.ilike(search_term)) |
                (Order.customer_name.ilike(search_term)) |
                (Order.customer_email.ilike(search_term)) |
                (Order.vendor_name.ilike(search_term))
            )

        if query.status:
            try:
                status_enum = OrderStatus[query.status.upper().replace(" ", "_")]
                db_query = db_query.filter(Order.status == status_enum)
            except KeyError:
                pass

        if query.customer_id:
            db_query = db_query.filter(Order.customer_id == query.customer_id)

        if query.vendor_id:
            db_query = db_query.filter(Order.vendor_id == query.vendor_id)

        if query.driver_id:
            db_query = db_query.filter(Order.driver_id == query.driver_id)

        if query.date_from:
            db_query = db_query.filter(Order.created_at >= query.date_from)

        if query.date_to:
            db_query = db_query.filter(Order.created_at <= query.date_to)

        if query.min_amount:
            db_query = db_query.filter(Order.total_amount >= query.min_amount)

        if query.max_amount:
            db_query = db_query.filter(Order.total_amount <= query.max_amount)

        total = db_query.count()
        orders = db_query.order_by(desc(Order.created_at)).offset(query.offset).limit(query.limit).all()

        return QueryResult(
            success=True,
            data=[self._order_to_dict(order) for order in orders],
            total_count=total,
            source="postgresql"
        )

    def _handle_track_order(self, query: TrackOrderQuery) -> QueryResult:
        """Handle TrackOrderQuery."""
        from models import Order, OrderStatus

        order = self._get_order_by_id(query.order_id)
        if not order:
            return QueryResult(
                success=False,
                error_code="ORD-301",
                error_message="Order not found"
            )

        # Calculate estimated delivery time
        estimated_delivery = None
        if order.status == OrderStatus.PREPARING:
            estimated_delivery = "30-40 minutes"
        elif order.status == OrderStatus.READY_FOR_PICKUP:
            estimated_delivery = "20-30 minutes"
        elif order.status == OrderStatus.OUT_FOR_DELIVERY:
            estimated_delivery = "10-15 minutes"

        # Parse driver location
        driver_location = None
        if order.driver_location:
            driver_location = json.loads(order.driver_location)

        # Build timeline
        timeline = self._create_order_timeline(order)

        tracking_data = {
            "order_number": order.order_number,
            "status": order.status.value,
            "estimated_delivery_time": estimated_delivery,
            "driver_name": order.driver_name,
            "driver_location": driver_location,
            "delivery_address": json.loads(order.delivery_address) if order.delivery_address else {},
            "timeline": timeline,
        }

        return QueryResult(
            success=True,
            data=tracking_data,
            source="postgresql"
        )

    def _handle_get_order_stats(self, query: GetOrderStatsQuery) -> QueryResult:
        """Handle GetOrderStatsQuery."""
        from models import Order, OrderStatus
        from sqlalchemy import func

        base_query = self.db.query(Order)

        if query.vendor_id:
            base_query = base_query.filter(Order.vendor_id == query.vendor_id)
        if query.customer_id:
            base_query = base_query.filter(Order.customer_id == query.customer_id)
        if query.driver_id:
            base_query = base_query.filter(Order.driver_id == query.driver_id)
        if query.date_from:
            base_query = base_query.filter(Order.created_at >= query.date_from)
        if query.date_to:
            base_query = base_query.filter(Order.created_at <= query.date_to)

        # Get counts by status
        status_counts = {}
        for status in OrderStatus:
            count = base_query.filter(Order.status == status).count()
            status_counts[status.value] = count

        # Get totals
        total_orders = base_query.count()
        total_revenue = self.db.query(func.sum(Order.total_amount)).filter(
            Order.status == OrderStatus.DELIVERED
        ).scalar() or 0

        avg_order_value = self.db.query(func.avg(Order.total_amount)).filter(
            Order.status == OrderStatus.DELIVERED
        ).scalar() or 0

        stats = {
            "total_orders": total_orders,
            "total_revenue": float(total_revenue),
            "average_order_value": float(avg_order_value),
            "orders_by_status": status_counts,
        }

        return QueryResult(
            success=True,
            data=stats,
            source="postgresql"
        )

    # =============================================================================
    # HELPER METHODS
    # =============================================================================

    def _get_order_by_id(self, order_id: str):
        """Get order by ID or order number."""
        from models import Order

        query = self.db.query(Order)
        if order_id.startswith("ORD-"):
            return query.filter(Order.order_number == order_id).first()
        elif order_id.isdigit():
            return query.filter(Order.id == int(order_id)).first()
        else:
            return query.filter(
                (Order.order_number == order_id) |
                (Order.id == int(order_id) if order_id.isdigit() else False)
            ).first()

    def _order_to_dict(self, order) -> Dict[str, Any]:
        """Convert order model to dictionary."""
        return {
            "id": order.id,
            "order_number": order.order_number,
            "customer_id": order.customer_id,
            "customer_name": order.customer_name,
            "customer_email": order.customer_email,
            "customer_phone": order.customer_phone,
            "vendor_id": order.vendor_id,
            "vendor_name": order.vendor_name,
            "driver_id": order.driver_id,
            "driver_name": order.driver_name,
            "items": json.loads(order.items) if order.items else [],
            "subtotal": order.subtotal,
            "tax_rate": order.tax_rate,
            "tax_amount": order.tax_amount,
            "delivery_fee": order.delivery_fee,
            "tip": order.tip,
            "platform_fee": order.platform_fee,
            "total_amount": order.total_amount,
            "delivery_address": json.loads(order.delivery_address) if order.delivery_address else {},
            "delivery_instructions": order.delivery_instructions,
            "status": order.status.value,
            "payment_status": order.payment_status.value,
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "confirmed_at": order.confirmed_at.isoformat() if order.confirmed_at else None,
            "preparing_at": order.preparing_at.isoformat() if order.preparing_at else None,
            "ready_at": order.ready_at.isoformat() if order.ready_at else None,
            "delivered_at": order.delivered_at.isoformat() if order.delivered_at else None,
            "dispatched_at": order.dispatched_at.isoformat() if order.dispatched_at else None,
            "cancelled_at": order.cancelled_at.isoformat() if order.cancelled_at else None,
            "cancellation_reason": order.cancellation_reason,
        }

    def _create_order_timeline(self, order) -> List[Dict[str, Any]]:
        """Create timeline of order events."""
        timeline = [
            {
                "status": "created",
                "timestamp": order.created_at.isoformat() if order.created_at else None,
                "description": "Order placed"
            }
        ]

        if order.confirmed_at:
            timeline.append({
                "status": "confirmed",
                "timestamp": order.confirmed_at.isoformat(),
                "description": "Order confirmed by restaurant"
            })

        if order.preparing_at:
            timeline.append({
                "status": "preparing",
                "timestamp": order.preparing_at.isoformat(),
                "description": "Restaurant is preparing your order"
            })

        if order.ready_at:
            timeline.append({
                "status": "ready",
                "timestamp": order.ready_at.isoformat(),
                "description": "Order ready for pickup"
            })

        if order.dispatched_at:
            timeline.append({
                "status": "dispatched",
                "timestamp": order.dispatched_at.isoformat(),
                "description": f"Driver {order.driver_name} assigned"
            })

        if order.delivered_at:
            timeline.append({
                "status": "delivered",
                "timestamp": order.delivered_at.isoformat(),
                "description": "Order delivered"
            })

        if order.cancelled_at:
            timeline.append({
                "status": "cancelled",
                "timestamp": order.cancelled_at.isoformat(),
                "description": f"Order cancelled: {order.cancellation_reason}"
            })

        return timeline
