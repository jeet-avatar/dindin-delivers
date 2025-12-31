# Dollor.ai Order Service - CQRS Module
# ======================================
# Command Query Responsibility Segregation implementation

from .commands import (
    CreateOrderCommand,
    UpdateOrderCommand,
    UpdateOrderStatusCommand,
    AssignDriverCommand,
    CancelOrderCommand,
    UpdatePaymentStatusCommand,
    OrderCommandHandler,
)

from .queries import (
    GetOrderQuery,
    GetCustomerOrdersQuery,
    GetRestaurantOrdersQuery,
    GetDriverOrdersQuery,
    SearchOrdersQuery,
    TrackOrderQuery,
    OrderQueryHandler,
)

from .projections import (
    OrderProjection,
    OrderElasticsearchProjection,
)

__all__ = [
    # Commands
    "CreateOrderCommand",
    "UpdateOrderCommand",
    "UpdateOrderStatusCommand",
    "AssignDriverCommand",
    "CancelOrderCommand",
    "UpdatePaymentStatusCommand",
    "OrderCommandHandler",
    # Queries
    "GetOrderQuery",
    "GetCustomerOrdersQuery",
    "GetRestaurantOrdersQuery",
    "GetDriverOrdersQuery",
    "SearchOrdersQuery",
    "TrackOrderQuery",
    "OrderQueryHandler",
    # Projections
    "OrderProjection",
    "OrderElasticsearchProjection",
]
