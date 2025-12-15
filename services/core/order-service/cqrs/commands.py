"""
Dollor.ai Order Service - Command Handlers
==========================================

CQRS Command side: All write operations that modify order state.
Commands are processed, state is persisted to PostgreSQL, and events
are published via the Outbox pattern for eventual consistency.
"""

from __future__ import annotations

import json
import random
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional
from abc import ABC, abstractmethod

from sqlalchemy.orm import Session

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'shared'))

from events import (
    CloudEvent,
    EventType,
    EventMetadata,
    OrderCreatedEvent,
    OrderStatusChangedEvent,
    KafkaTopics,
)
from events.outbox import OutboxRepository


# =============================================================================
# COMMAND BASE CLASS
# =============================================================================

@dataclass(kw_only=True)
class Command(ABC):
    """Base class for all commands."""
    metadata: EventMetadata = field(default_factory=EventMetadata)

    @property
    @abstractmethod
    def command_type(self) -> str:
        """Return the command type identifier."""
        pass


# =============================================================================
# ORDER COMMANDS
# =============================================================================

@dataclass(kw_only=True)
class CreateOrderCommand(Command):
    """Command to create a new order."""
    customer_id: int
    customer_name: str
    customer_email: str
    customer_phone: str
    vendor_id: int
    vendor_name: str
    items: List[Dict[str, Any]]
    delivery_address: Dict[str, Any]
    subtotal: float
    total_amount: float
    delivery_instructions: Optional[str] = None
    tax_rate: float = 0.0
    tax_amount: float = 0.0
    delivery_fee: float = 0.0
    tip: float = 0.0
    platform_fee: float = 0.0
    payment_method: Optional[str] = None
    stripe_customer_id: Optional[str] = None

    @property
    def command_type(self) -> str:
        return "CreateOrder"


@dataclass(kw_only=True)
class UpdateOrderCommand(Command):
    """Command to update order details (before confirmation)."""
    order_id: str
    delivery_instructions: Optional[str] = None
    tip: Optional[float] = None

    @property
    def command_type(self) -> str:
        return "UpdateOrder"


@dataclass(kw_only=True)
class UpdateOrderStatusCommand(Command):
    """Command to update order status."""
    order_id: str
    new_status: str
    notes: Optional[str] = None
    changed_by: Optional[str] = None

    @property
    def command_type(self) -> str:
        return "UpdateOrderStatus"


@dataclass(kw_only=True)
class AssignDriverCommand(Command):
    """Command to assign a driver to an order."""
    order_id: str
    driver_id: int
    driver_name: str

    @property
    def command_type(self) -> str:
        return "AssignDriver"


@dataclass(kw_only=True)
class CancelOrderCommand(Command):
    """Command to cancel an order."""
    order_id: str
    reason: str
    cancelled_by: str  # customer, restaurant, driver, system

    @property
    def command_type(self) -> str:
        return "CancelOrder"


@dataclass(kw_only=True)
class UpdatePaymentStatusCommand(Command):
    """Command to update payment status."""
    order_id: str
    payment_status: str
    stripe_payment_intent_id: Optional[str] = None
    stripe_charge_id: Optional[str] = None

    @property
    def command_type(self) -> str:
        return "UpdatePaymentStatus"


@dataclass(kw_only=True)
class UpdateDriverLocationCommand(Command):
    """Command to update driver location for an order."""
    order_id: str
    latitude: float
    longitude: float

    @property
    def command_type(self) -> str:
        return "UpdateDriverLocation"


# =============================================================================
# COMMAND RESULT
# =============================================================================

@dataclass
class CommandResult:
    """Result of a command execution."""
    success: bool
    order_id: Optional[str] = None
    order_number: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    events: List[CloudEvent] = field(default_factory=list)


# =============================================================================
# COMMAND HANDLER
# =============================================================================

class OrderCommandHandler:
    """
    Handles all order commands.

    The command handler:
    1. Validates the command
    2. Executes business logic
    3. Persists state to PostgreSQL
    4. Creates domain events
    5. Stores events in the outbox (same transaction)
    """

    def __init__(self, db: Session, service_name: str = "order-service"):
        self.db = db
        self.service_name = service_name

    def handle(self, command: Command) -> CommandResult:
        """Route command to appropriate handler."""
        handlers = {
            "CreateOrder": self._handle_create_order,
            "UpdateOrder": self._handle_update_order,
            "UpdateOrderStatus": self._handle_update_status,
            "AssignDriver": self._handle_assign_driver,
            "CancelOrder": self._handle_cancel_order,
            "UpdatePaymentStatus": self._handle_update_payment_status,
            "UpdateDriverLocation": self._handle_update_driver_location,
        }

        handler = handlers.get(command.command_type)
        if not handler:
            return CommandResult(
                success=False,
                error_code="ORD-100",
                error_message=f"Unknown command type: {command.command_type}"
            )

        return handler(command)

    def _handle_create_order(self, command: CreateOrderCommand) -> CommandResult:
        """Handle CreateOrderCommand."""
        from models import Order, OrderStatus, PaymentStatus

        # Validate
        if not command.items:
            return CommandResult(
                success=False,
                error_code="ORD-101",
                error_message="Order must have at least one item"
            )

        if command.total_amount <= 0:
            return CommandResult(
                success=False,
                error_code="ORD-101",
                error_message="Total amount must be greater than 0"
            )

        # Generate order number
        order_number = self._generate_order_number()

        # Create order
        order = Order(
            order_number=order_number,
            customer_id=command.customer_id,
            customer_name=command.customer_name,
            customer_email=command.customer_email,
            customer_phone=command.customer_phone,
            vendor_id=command.vendor_id,
            vendor_name=command.vendor_name,
            items=json.dumps(command.items),
            subtotal=command.subtotal,
            tax_rate=command.tax_rate,
            tax_amount=command.tax_amount,
            delivery_fee=command.delivery_fee,
            tip=command.tip,
            platform_fee=command.platform_fee,
            total_amount=command.total_amount,
            delivery_address=json.dumps(command.delivery_address),
            delivery_instructions=command.delivery_instructions,
            delivery_latitude=command.delivery_address.get("latitude"),
            delivery_longitude=command.delivery_address.get("longitude"),
            status=OrderStatus.PENDING_PAYMENT if command.payment_method else OrderStatus.PENDING,
            payment_method=command.payment_method,
            stripe_customer_id=command.stripe_customer_id,
        )

        self.db.add(order)
        self.db.flush()  # Get the ID without committing

        # Create domain event
        event_data = OrderCreatedEvent(
            order_id=order_number,
            customer_id=str(command.customer_id),
            restaurant_id=str(command.vendor_id),
            items=command.items,
            subtotal=command.subtotal,
            delivery_fee=command.delivery_fee,
            service_fee=command.platform_fee,
            total=command.total_amount,
            delivery_address=command.delivery_address,
            special_instructions=command.delivery_instructions,
        )

        event = CloudEvent(
            type=EventType.ORDER_CREATED,
            source=f"/services/{self.service_name}",
            data=event_data,
            subject=order_number,
            metadata=command.metadata,
        )

        # Store event in outbox (same transaction)
        OutboxRepository.add(
            session=self.db,
            event=event,
            topic=KafkaTopics.ORDERS_EVENTS,
            partition_key=order_number,
        )

        # Also store in event store for replay
        seq_num = OutboxRepository.get_next_sequence_number(
            self.db, "Order", order_number
        )
        OutboxRepository.add_to_event_store(self.db, event, seq_num)

        return CommandResult(
            success=True,
            order_id=str(order.id),
            order_number=order_number,
            data={
                "id": order.id,
                "order_number": order_number,
                "status": order.status.value,
                "created_at": order.created_at.isoformat() if order.created_at else None,
            },
            events=[event],
        )

    def _handle_update_order(self, command: UpdateOrderCommand) -> CommandResult:
        """Handle UpdateOrderCommand."""
        from models import Order, OrderStatus

        order = self._get_order(command.order_id)
        if not order:
            return CommandResult(
                success=False,
                error_code="ORD-301",
                error_message="Order not found"
            )

        # Check if order can be modified
        if order.status not in [OrderStatus.PENDING, OrderStatus.PENDING_PAYMENT]:
            return CommandResult(
                success=False,
                error_code="ORD-402",
                error_message="Cannot modify - order already confirmed"
            )

        # Update fields
        if command.delivery_instructions is not None:
            order.delivery_instructions = command.delivery_instructions
        if command.tip is not None:
            order.tip = command.tip
            # Recalculate total
            order.total_amount = (
                order.subtotal + order.tax_amount + order.delivery_fee +
                order.tip + order.platform_fee
            )

        order.updated_at = datetime.utcnow()

        # Create event
        event = CloudEvent(
            type=EventType.ORDER_UPDATED,
            source=f"/services/{self.service_name}",
            data=OrderStatusChangedEvent(
                order_id=order.order_number,
                previous_status=order.status.value,
                new_status=order.status.value,
                reason="Order details updated",
            ),
            subject=order.order_number,
            metadata=command.metadata,
        )

        OutboxRepository.add(self.db, event, KafkaTopics.ORDERS_EVENTS, order.order_number)

        return CommandResult(
            success=True,
            order_id=str(order.id),
            order_number=order.order_number,
            data={"updated_at": order.updated_at.isoformat()},
            events=[event],
        )

    def _handle_update_status(self, command: UpdateOrderStatusCommand) -> CommandResult:
        """Handle UpdateOrderStatusCommand."""
        from models import Order, OrderStatus

        order = self._get_order(command.order_id)
        if not order:
            return CommandResult(
                success=False,
                error_code="ORD-301",
                error_message="Order not found"
            )

        # Validate status transition
        try:
            new_status = OrderStatus[command.new_status.upper().replace(" ", "_")]
        except KeyError:
            return CommandResult(
                success=False,
                error_code="ORD-101",
                error_message=f"Invalid status: {command.new_status}"
            )

        if not self._validate_status_transition(order.status, new_status):
            return CommandResult(
                success=False,
                error_code="ORD-405",
                error_message=f"Invalid transition from {order.status.value} to {new_status.value}"
            )

        previous_status = order.status.value
        order.status = new_status
        order.updated_at = datetime.utcnow()

        # Update timestamp fields
        if new_status == OrderStatus.CONFIRMED:
            order.confirmed_at = datetime.utcnow()
        elif new_status == OrderStatus.PREPARING:
            order.preparing_at = datetime.utcnow()
        elif new_status == OrderStatus.READY_FOR_PICKUP:
            order.ready_at = datetime.utcnow()
        elif new_status == OrderStatus.OUT_FOR_DELIVERY:
            pass  # dispatched_at is set when driver is assigned
        elif new_status == OrderStatus.DELIVERED:
            order.delivered_at = datetime.utcnow()

        # Map to event type
        event_type_map = {
            OrderStatus.CONFIRMED: EventType.ORDER_CONFIRMED,
            OrderStatus.PREPARING: EventType.ORDER_PREPARING,
            OrderStatus.READY_FOR_PICKUP: EventType.ORDER_READY,
            OrderStatus.OUT_FOR_DELIVERY: EventType.ORDER_PICKED_UP,
            OrderStatus.DELIVERED: EventType.ORDER_DELIVERED,
            OrderStatus.CANCELLED: EventType.ORDER_CANCELLED,
        }

        event = CloudEvent(
            type=event_type_map.get(new_status, EventType.ORDER_UPDATED),
            source=f"/services/{self.service_name}",
            data=OrderStatusChangedEvent(
                order_id=order.order_number,
                previous_status=previous_status,
                new_status=new_status.value,
                changed_by=command.changed_by,
                reason=command.notes,
            ),
            subject=order.order_number,
            metadata=command.metadata,
        )

        OutboxRepository.add(self.db, event, KafkaTopics.ORDERS_EVENTS, order.order_number)

        seq_num = OutboxRepository.get_next_sequence_number(self.db, "Order", order.order_number)
        OutboxRepository.add_to_event_store(self.db, event, seq_num)

        return CommandResult(
            success=True,
            order_id=str(order.id),
            order_number=order.order_number,
            data={
                "status": new_status.value,
                "updated_at": order.updated_at.isoformat(),
            },
            events=[event],
        )

    def _handle_assign_driver(self, command: AssignDriverCommand) -> CommandResult:
        """Handle AssignDriverCommand."""
        from models import Order, OrderStatus

        order = self._get_order(command.order_id)
        if not order:
            return CommandResult(
                success=False,
                error_code="ORD-301",
                error_message="Order not found"
            )

        # Check if order can be assigned
        if order.status not in [OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP]:
            return CommandResult(
                success=False,
                error_code="ORD-405",
                error_message="Order not ready for driver assignment"
            )

        # Check if already assigned
        if order.driver_id:
            return CommandResult(
                success=False,
                error_code="ORD-404",
                error_message="Order already assigned to a driver"
            )

        order.driver_id = command.driver_id
        order.driver_name = command.driver_name
        order.dispatched_at = datetime.utcnow()
        order.updated_at = datetime.utcnow()

        # Create event
        event = CloudEvent(
            type=EventType.DRIVER_ASSIGNED,
            source=f"/services/{self.service_name}",
            data={
                "order_id": order.order_number,
                "driver_id": command.driver_id,
                "driver_name": command.driver_name,
                "dispatched_at": order.dispatched_at.isoformat(),
            },
            subject=order.order_number,
            metadata=command.metadata,
        )

        OutboxRepository.add(self.db, event, KafkaTopics.ORDERS_EVENTS, order.order_number)

        return CommandResult(
            success=True,
            order_id=str(order.id),
            order_number=order.order_number,
            data={
                "driver_id": order.driver_id,
                "driver_name": order.driver_name,
                "dispatched_at": order.dispatched_at.isoformat(),
            },
            events=[event],
        )

    def _handle_cancel_order(self, command: CancelOrderCommand) -> CommandResult:
        """Handle CancelOrderCommand."""
        from models import Order, OrderStatus

        order = self._get_order(command.order_id)
        if not order:
            return CommandResult(
                success=False,
                error_code="ORD-301",
                error_message="Order not found"
            )

        # Check if order can be cancelled
        if order.status == OrderStatus.DELIVERED:
            return CommandResult(
                success=False,
                error_code="ORD-401",
                error_message="Cannot cancel - order already delivered"
            )

        if order.status == OrderStatus.CANCELLED:
            return CommandResult(
                success=False,
                error_code="ORD-401",
                error_message="Order already cancelled"
            )

        if order.status == OrderStatus.OUT_FOR_DELIVERY:
            return CommandResult(
                success=False,
                error_code="ORD-401",
                error_message="Cannot cancel - order already picked up"
            )

        previous_status = order.status.value
        order.status = OrderStatus.CANCELLED
        order.cancelled_at = datetime.utcnow()
        order.cancellation_reason = command.reason
        order.cancelled_by = command.cancelled_by
        order.updated_at = datetime.utcnow()

        event = CloudEvent(
            type=EventType.ORDER_CANCELLED,
            source=f"/services/{self.service_name}",
            data=OrderStatusChangedEvent(
                order_id=order.order_number,
                previous_status=previous_status,
                new_status="cancelled",
                changed_by=command.cancelled_by,
                reason=command.reason,
            ),
            subject=order.order_number,
            metadata=command.metadata,
        )

        OutboxRepository.add(self.db, event, KafkaTopics.ORDERS_EVENTS, order.order_number)

        seq_num = OutboxRepository.get_next_sequence_number(self.db, "Order", order.order_number)
        OutboxRepository.add_to_event_store(self.db, event, seq_num)

        return CommandResult(
            success=True,
            order_id=str(order.id),
            order_number=order.order_number,
            data={
                "status": "cancelled",
                "cancelled_at": order.cancelled_at.isoformat(),
                "cancelled_by": command.cancelled_by,
                "reason": command.reason,
            },
            events=[event],
        )

    def _handle_update_payment_status(self, command: UpdatePaymentStatusCommand) -> CommandResult:
        """Handle UpdatePaymentStatusCommand."""
        from models import Order, OrderStatus, PaymentStatus

        order = self._get_order(command.order_id)
        if not order:
            return CommandResult(
                success=False,
                error_code="ORD-301",
                error_message="Order not found"
            )

        try:
            new_payment_status = PaymentStatus[command.payment_status.upper()]
        except KeyError:
            return CommandResult(
                success=False,
                error_code="ORD-101",
                error_message=f"Invalid payment status: {command.payment_status}"
            )

        order.payment_status = new_payment_status

        if command.stripe_payment_intent_id:
            order.stripe_payment_intent_id = command.stripe_payment_intent_id
        if command.stripe_charge_id:
            order.stripe_charge_id = command.stripe_charge_id

        # If payment succeeded and order is pending_payment, move to confirmed
        if new_payment_status == PaymentStatus.SUCCEEDED and order.status == OrderStatus.PENDING_PAYMENT:
            order.status = OrderStatus.CONFIRMED
            order.confirmed_at = datetime.utcnow()

        order.updated_at = datetime.utcnow()

        event = CloudEvent(
            type=EventType.PAYMENT_PROCESSED,
            source=f"/services/{self.service_name}",
            data={
                "order_id": order.order_number,
                "payment_status": new_payment_status.value,
                "order_status": order.status.value,
                "amount": order.total_amount,
            },
            subject=order.order_number,
            metadata=command.metadata,
        )

        OutboxRepository.add(self.db, event, KafkaTopics.PAYMENTS_EVENTS, order.order_number)

        return CommandResult(
            success=True,
            order_id=str(order.id),
            order_number=order.order_number,
            data={
                "payment_status": new_payment_status.value,
                "order_status": order.status.value,
                "updated_at": order.updated_at.isoformat(),
            },
            events=[event],
        )

    def _handle_update_driver_location(self, command: UpdateDriverLocationCommand) -> CommandResult:
        """Handle UpdateDriverLocationCommand."""
        from models import Order

        order = self._get_order(command.order_id)
        if not order:
            return CommandResult(
                success=False,
                error_code="ORD-301",
                error_message="Order not found"
            )

        location_data = {
            "latitude": command.latitude,
            "longitude": command.longitude,
            "updated_at": datetime.utcnow().isoformat(),
        }

        order.driver_location = json.dumps(location_data)
        order.updated_at = datetime.utcnow()

        # Note: Driver location updates are high-frequency, so we don't store them in event store
        # They go directly to Kafka for real-time tracking

        return CommandResult(
            success=True,
            order_id=str(order.id),
            order_number=order.order_number,
            data={"driver_location": location_data},
            events=[],
        )

    # =============================================================================
    # HELPER METHODS
    # =============================================================================

    def _get_order(self, order_id: str):
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

    def _generate_order_number(self) -> str:
        """Generate unique order number."""
        from models import Order

        while True:
            order_number = f"ORD-{random.randint(100000, 999999)}"
            existing = self.db.query(Order).filter(Order.order_number == order_number).first()
            if not existing:
                return order_number

    def _validate_status_transition(self, current_status, new_status) -> bool:
        """Validate if status transition is allowed."""
        from models import OrderStatus

        allowed_transitions = {
            OrderStatus.PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
            OrderStatus.PENDING_PAYMENT: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
            OrderStatus.CONFIRMED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
            OrderStatus.PREPARING: [OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED],
            OrderStatus.READY_FOR_PICKUP: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
            OrderStatus.OUT_FOR_DELIVERY: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
            OrderStatus.DELIVERED: [],
            OrderStatus.CANCELLED: [],
        }

        return new_status in allowed_transitions.get(current_status, [])
