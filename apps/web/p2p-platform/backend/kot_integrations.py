"""
KOT (Kitchen Order Ticket) Integrations for Dollor.ai
Supports: Square, Clover, Toast POS systems

When a restaurant accepts an order, this module sends the order
to their POS system which automatically prints to their kitchen printer.

Integration Priority:
1. Square - Open API, no certification needed
2. Clover - REST API, developer account needed
3. Toast - Partner API, certification required (future)
"""

import httpx
import json
import logging
import hashlib
import hmac
from datetime import datetime
from typing import Optional, Dict, Any, List
from enum import Enum
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# ==================== ENUMS & MODELS ====================

class POSIntegrationType(str, Enum):
    NONE = "none"
    SQUARE = "square"
    CLOVER = "clover"
    TOAST = "toast"
    STAR_CLOUD = "star_cloud"  # Direct printer
    EPSON_EPOS = "epson_epos"  # Direct printer


class KOTItem(BaseModel):
    """Item on a Kitchen Order Ticket"""
    name: str
    quantity: int
    modifiers: Optional[List[str]] = None
    special_instructions: Optional[str] = None
    unit_price: float


class KOTOrder(BaseModel):
    """Kitchen Order Ticket data structure"""
    order_id: int
    order_number: str
    customer_name: str
    items: List[KOTItem]
    subtotal: float
    tax: float
    total: float
    order_type: str = "delivery"  # delivery, pickup
    special_instructions: Optional[str] = None
    created_at: datetime


# ==================== SQUARE INTEGRATION ====================
# Docs: https://developer.squareup.com/docs/orders-api/overview

SQUARE_API_BASE = "https://connect.squareup.com/v2"
SQUARE_SANDBOX_BASE = "https://connect.squareupsandbox.com/v2"


class SquareIntegration:
    """
    Square POS Integration

    When we create an order in Square, it automatically:
    1. Appears on their Square POS terminal
    2. Prints to their kitchen printer (if configured)
    3. Shows on Square KDS (Kitchen Display System)

    Required vendor settings:
    - kot_api_key: Square Access Token
    - kot_location_id: Square Location ID
    """

    def __init__(self, access_token: str, location_id: str, sandbox: bool = False):
        self.access_token = access_token
        self.location_id = location_id
        self.base_url = SQUARE_SANDBOX_BASE if sandbox else SQUARE_API_BASE

    async def create_order(self, kot: KOTOrder) -> Dict[str, Any]:
        """
        Create an order in Square POS
        This will show up on their Square terminal and can trigger kitchen print
        """
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
            "Square-Version": "2024-01-18"
        }

        # Build line items for Square
        line_items = []
        for item in kot.items:
            line_item = {
                "name": item.name,
                "quantity": str(item.quantity),
                "base_price_money": {
                    "amount": int(item.unit_price * 100),  # Square uses cents
                    "currency": "USD"
                },
                "note": item.special_instructions or ""
            }

            # Add modifiers as note if present
            if item.modifiers:
                modifier_text = ", ".join(item.modifiers)
                line_item["note"] = f"{modifier_text}. {line_item['note']}".strip()

            line_items.append(line_item)

        # Create order payload
        order_payload = {
            "idempotency_key": f"dollor_{kot.order_number}_{int(datetime.now().timestamp())}",
            "order": {
                "location_id": self.location_id,
                "reference_id": kot.order_number,  # Our order number
                "source": {
                    "name": "Dollor.ai"
                },
                "line_items": line_items,
                "fulfillments": [
                    {
                        "type": "DELIVERY" if kot.order_type == "delivery" else "PICKUP",
                        "state": "PROPOSED",
                        "delivery_details": {
                            "recipient": {
                                "display_name": kot.customer_name
                            },
                            "note": kot.special_instructions or ""
                        } if kot.order_type == "delivery" else None,
                        "pickup_details": {
                            "recipient": {
                                "display_name": kot.customer_name
                            },
                            "note": kot.special_instructions or ""
                        } if kot.order_type == "pickup" else None
                    }
                ],
                "metadata": {
                    "dollor_order_id": str(kot.order_id),
                    "source": "dollor_ai"
                }
            }
        }

        # Remove None values from fulfillment
        fulfillment = order_payload["order"]["fulfillments"][0]
        if fulfillment.get("delivery_details") is None:
            del fulfillment["delivery_details"]
        if fulfillment.get("pickup_details") is None:
            del fulfillment["pickup_details"]

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/orders",
                    headers=headers,
                    json=order_payload,
                    timeout=30.0
                )

                if response.status_code == 200:
                    result = response.json()
                    logger.info(f"Square order created: {result.get('order', {}).get('id')}")
                    return {
                        "success": True,
                        "pos_type": "square",
                        "pos_order_id": result.get("order", {}).get("id"),
                        "message": "Order sent to Square POS"
                    }
                else:
                    error = response.json()
                    logger.error(f"Square API error: {error}")
                    return {
                        "success": False,
                        "pos_type": "square",
                        "error": error.get("errors", [{}])[0].get("detail", "Unknown error")
                    }

        except Exception as e:
            logger.error(f"Square integration error: {e}")
            return {
                "success": False,
                "pos_type": "square",
                "error": str(e)
            }

    async def update_order_status(self, square_order_id: str, status: str) -> Dict[str, Any]:
        """Update order fulfillment status in Square"""
        # Status mapping: PROPOSED -> RESERVED -> PREPARED -> COMPLETED
        pass  # Implement if needed


# ==================== CLOVER INTEGRATION ====================
# Docs: https://docs.clover.com/docs/making-api-calls

CLOVER_API_BASE = "https://api.clover.com/v3"
CLOVER_SANDBOX_BASE = "https://sandbox.dev.clover.com/v3"


class CloverIntegration:
    """
    Clover POS Integration

    Creates orders in Clover which can:
    1. Appear on Clover POS devices
    2. Print to connected printers
    3. Show on Clover KDS

    Required vendor settings:
    - kot_api_key: Clover API Token
    - kot_merchant_id: Clover Merchant ID
    """

    def __init__(self, api_token: str, merchant_id: str, sandbox: bool = False):
        self.api_token = api_token
        self.merchant_id = merchant_id
        self.base_url = CLOVER_SANDBOX_BASE if sandbox else CLOVER_API_BASE

    async def create_order(self, kot: KOTOrder) -> Dict[str, Any]:
        """
        Create an order in Clover POS
        """
        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }

        # First, create the order
        order_payload = {
            "state": "open",
            "title": f"Dollor #{kot.order_number}",
            "note": f"Customer: {kot.customer_name}\n{kot.special_instructions or ''}",
            "orderType": {
                "taxable": True,
                "isDefault": False,
                "label": "Delivery" if kot.order_type == "delivery" else "Pickup"
            }
        }

        try:
            async with httpx.AsyncClient() as client:
                # Create order
                response = await client.post(
                    f"{self.base_url}/merchants/{self.merchant_id}/orders",
                    headers=headers,
                    json=order_payload,
                    timeout=30.0
                )

                if response.status_code not in [200, 201]:
                    error = response.text
                    logger.error(f"Clover create order error: {error}")
                    return {
                        "success": False,
                        "pos_type": "clover",
                        "error": error
                    }

                order_result = response.json()
                clover_order_id = order_result.get("id")

                # Add line items to order
                for item in kot.items:
                    line_item_payload = {
                        "name": item.name,
                        "price": int(item.unit_price * 100),  # Clover uses cents
                        "printed": False,  # Will be printed when order is fired
                        "note": item.special_instructions or ""
                    }

                    if item.modifiers:
                        line_item_payload["note"] = f"{', '.join(item.modifiers)}. {line_item_payload['note']}".strip()

                    # Add each item quantity times
                    for _ in range(item.quantity):
                        await client.post(
                            f"{self.base_url}/merchants/{self.merchant_id}/orders/{clover_order_id}/line_items",
                            headers=headers,
                            json=line_item_payload,
                            timeout=10.0
                        )

                # Fire the order to kitchen (triggers print)
                await client.post(
                    f"{self.base_url}/merchants/{self.merchant_id}/orders/{clover_order_id}",
                    headers=headers,
                    json={"state": "locked"},  # Locking fires to kitchen
                    timeout=10.0
                )

                logger.info(f"Clover order created and fired: {clover_order_id}")
                return {
                    "success": True,
                    "pos_type": "clover",
                    "pos_order_id": clover_order_id,
                    "message": "Order sent to Clover POS"
                }

        except Exception as e:
            logger.error(f"Clover integration error: {e}")
            return {
                "success": False,
                "pos_type": "clover",
                "error": str(e)
            }


# ==================== TOAST INTEGRATION ====================
# Note: Toast requires partner certification - this is a placeholder
# Docs: https://doc.toasttab.com/openapi/

TOAST_API_BASE = "https://api.toasttab.com"


class ToastIntegration:
    """
    Toast POS Integration (Requires Partner Certification)

    Toast requires approval through their partner program.
    This is a placeholder for future implementation.

    Required vendor settings:
    - kot_api_key: Toast API Key
    - kot_api_secret: Toast API Secret
    - kot_restaurant_guid: Toast Restaurant GUID
    """

    def __init__(self, api_key: str, api_secret: str, restaurant_guid: str):
        self.api_key = api_key
        self.api_secret = api_secret
        self.restaurant_guid = restaurant_guid

    async def create_order(self, kot: KOTOrder) -> Dict[str, Any]:
        """
        Create an order in Toast POS

        Note: This requires Toast Partner API certification.
        Apply at: https://pos.toasttab.com/integrations
        """
        # Toast uses OAuth2 authentication
        # Step 1: Get access token
        # Step 2: Create order via Orders API

        logger.warning("Toast integration requires partner certification. Please apply at https://pos.toasttab.com/integrations")

        return {
            "success": False,
            "pos_type": "toast",
            "error": "Toast integration requires partner certification. Please contact support@dollor.ai to set up."
        }


# ==================== MAIN KOT SERVICE ====================

class KOTService:
    """
    Main Kitchen Order Ticket service
    Routes orders to the appropriate POS integration based on vendor settings
    """

    @staticmethod
    def format_kot_from_order(order: Any, vendor: Any) -> KOTOrder:
        """
        Convert a Dollor order to KOT format

        Args:
            order: Order model from database
            vendor: Vendor model from database
        """
        import json as json_lib

        # Parse items from order
        items_data = []
        if order.items:
            try:
                items_data = json_lib.loads(order.items)
            except:
                items_data = []

        kot_items = []
        for item in items_data:
            kot_items.append(KOTItem(
                name=item.get("name", "Unknown Item"),
                quantity=item.get("quantity", 1),
                unit_price=item.get("unit_price", 0) or item.get("price", 0),
                modifiers=item.get("modifiers", []),
                special_instructions=item.get("notes", "")
            ))

        return KOTOrder(
            order_id=order.id,
            order_number=order.order_number,
            customer_name=order.customer_name,
            items=kot_items,
            subtotal=order.subtotal or 0,
            tax=order.tax_amount or 0,
            total=order.total_amount or 0,
            order_type="delivery",  # Could be determined from order
            special_instructions=order.delivery_instructions,
            created_at=order.created_at or datetime.now()
        )

    @staticmethod
    async def send_to_pos(order: Any, vendor: Any) -> Dict[str, Any]:
        """
        Send order to vendor's POS system for KOT printing

        Args:
            order: Order model from database
            vendor: Vendor model from database

        Returns:
            Dict with success status and POS order ID
        """
        # Check if vendor has KOT integration enabled
        kot_type = getattr(vendor, 'kot_integration_type', None)

        if not kot_type or kot_type == POSIntegrationType.NONE.value:
            logger.info(f"Vendor {vendor.id} has no KOT integration configured")
            return {
                "success": True,
                "pos_type": "none",
                "message": "No KOT integration configured for this vendor"
            }

        # Check if KOT is enabled
        kot_enabled = getattr(vendor, 'kot_enabled', False)
        if not kot_enabled:
            logger.info(f"Vendor {vendor.id} has KOT disabled")
            return {
                "success": True,
                "pos_type": kot_type,
                "message": "KOT integration is disabled for this vendor"
            }

        # Format the order for KOT
        kot = KOTService.format_kot_from_order(order, vendor)

        # Route to appropriate integration
        try:
            if kot_type == POSIntegrationType.SQUARE.value:
                api_key = getattr(vendor, 'kot_api_key', '')
                location_id = getattr(vendor, 'kot_location_id', '')

                if not api_key or not location_id:
                    return {
                        "success": False,
                        "pos_type": "square",
                        "error": "Square API key or Location ID not configured"
                    }

                integration = SquareIntegration(api_key, location_id)
                return await integration.create_order(kot)

            elif kot_type == POSIntegrationType.CLOVER.value:
                api_key = getattr(vendor, 'kot_api_key', '')
                merchant_id = getattr(vendor, 'kot_merchant_id', '')

                if not api_key or not merchant_id:
                    return {
                        "success": False,
                        "pos_type": "clover",
                        "error": "Clover API key or Merchant ID not configured"
                    }

                integration = CloverIntegration(api_key, merchant_id)
                return await integration.create_order(kot)

            elif kot_type == POSIntegrationType.TOAST.value:
                api_key = getattr(vendor, 'kot_api_key', '')
                api_secret = getattr(vendor, 'kot_api_secret', '')
                restaurant_guid = getattr(vendor, 'kot_restaurant_guid', '')

                integration = ToastIntegration(api_key, api_secret, restaurant_guid)
                return await integration.create_order(kot)

            else:
                logger.warning(f"Unknown KOT integration type: {kot_type}")
                return {
                    "success": False,
                    "pos_type": kot_type,
                    "error": f"Unknown integration type: {kot_type}"
                }

        except Exception as e:
            logger.error(f"KOT integration error: {e}")
            return {
                "success": False,
                "pos_type": kot_type,
                "error": str(e)
            }


# ==================== WEBHOOK HANDLERS ====================
# For receiving status updates from POS systems

async def handle_square_webhook(payload: Dict, signature: str, webhook_secret: str) -> bool:
    """Handle webhooks from Square for order status updates"""
    # Verify signature
    expected_signature = hmac.new(
        webhook_secret.encode(),
        json.dumps(payload).encode(),
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(signature, expected_signature):
        logger.warning("Invalid Square webhook signature")
        return False

    event_type = payload.get("type")

    if event_type == "order.fulfillment.updated":
        # Order status changed in Square
        order_data = payload.get("data", {}).get("object", {}).get("order", {})
        reference_id = order_data.get("reference_id")  # Our order number
        fulfillments = order_data.get("fulfillments", [])

        if fulfillments:
            state = fulfillments[0].get("state")
            logger.info(f"Square order {reference_id} fulfillment updated: {state}")
            # TODO: Update our order status based on Square status

    return True


async def handle_clover_webhook(payload: Dict) -> bool:
    """Handle webhooks from Clover for order status updates"""
    event_type = payload.get("type")

    if event_type == "ORDER_UPDATED":
        order_id = payload.get("object_id")
        logger.info(f"Clover order updated: {order_id}")
        # TODO: Fetch order details and update our status

    return True
