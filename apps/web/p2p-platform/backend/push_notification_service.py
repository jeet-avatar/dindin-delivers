"""
Push Notification Service for Dollor.ai
Supports both Firebase Cloud Messaging (FCM) and Apple Push Notification service (APNs)

This is a matchmaking platform notification service.
"""

import os
import json
import httpx
import asyncio
from typing import Optional, Dict, List, Any
from datetime import datetime
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class NotificationType(str, Enum):
    # Order-related notifications
    ORDER_PLACED = "order_placed"
    ORDER_CONFIRMED = "order_confirmed"
    ORDER_PREPARING = "order_preparing"
    ORDER_READY = "order_ready"
    ORDER_PICKED_UP = "order_picked_up"
    ORDER_DELIVERED = "order_delivered"
    ORDER_CANCELLED = "order_cancelled"

    # Ride-related notifications
    RIDE_REQUESTED = "ride_requested"
    RIDE_ACCEPTED = "ride_accepted"
    DRIVER_ARRIVING = "driver_arriving"
    RIDE_STARTED = "ride_started"
    RIDE_COMPLETED = "ride_completed"
    RIDE_CANCELLED = "ride_cancelled"

    # Driver-related notifications
    NEW_DELIVERY_AVAILABLE = "new_delivery_available"
    NEW_RIDE_REQUEST = "new_ride_request"
    EARNINGS_UPDATED = "earnings_updated"
    DOCUMENT_APPROVED = "document_approved"
    DOCUMENT_REJECTED = "document_rejected"

    # Restaurant-related notifications
    NEW_ORDER = "new_order"
    ORDER_ACCEPTED_BY_DRIVER = "order_accepted_by_driver"

    # General notifications
    PROMOTION = "promotion"
    ACCOUNT_UPDATE = "account_update"
    SUPPORT_MESSAGE = "support_message"


class PushNotificationService:
    """
    Push notification service supporting FCM and APNs.

    Environment variables required:
    - FCM_SERVER_KEY: Firebase Cloud Messaging server key
    - APNS_KEY_ID: Apple Push Notification Key ID
    - APNS_TEAM_ID: Apple Developer Team ID
    - APNS_AUTH_KEY_PATH: Path to APNs authentication key (.p8 file)
    - APNS_BUNDLE_ID: iOS app bundle identifier
    """

    def __init__(self):
        self.fcm_server_key = os.getenv("FCM_SERVER_KEY")
        self.apns_key_id = os.getenv("APNS_KEY_ID")
        self.apns_team_id = os.getenv("APNS_TEAM_ID")
        self.apns_auth_key_path = os.getenv("APNS_AUTH_KEY_PATH")
        self.apns_bundle_id = os.getenv("APNS_BUNDLE_ID", "com.eatfair.customer")

        # FCM endpoint
        self.fcm_url = "https://fcm.googleapis.com/fcm/send"

        # APNs endpoints (production)
        self.apns_url = "https://api.push.apple.com"
        # For development: "https://api.development.push.apple.com"

    def _get_notification_content(self, notification_type: NotificationType,
                                   data: Dict[str, Any]) -> Dict[str, str]:
        """Get notification title and body based on type."""

        templates = {
            # Order notifications
            NotificationType.ORDER_PLACED: {
                "title": "Order Placed!",
                "body": f"Your order #{data.get('order_id', '')} has been sent to {data.get('restaurant_name', 'the restaurant')}."
            },
            NotificationType.ORDER_CONFIRMED: {
                "title": "Order Confirmed!",
                "body": f"{data.get('restaurant_name', 'Restaurant')} is preparing your order. Estimated time: {data.get('prep_time', '20-30')} min."
            },
            NotificationType.ORDER_PREPARING: {
                "title": "Order Being Prepared",
                "body": f"Your order from {data.get('restaurant_name', 'restaurant')} is being prepared."
            },
            NotificationType.ORDER_READY: {
                "title": "Order Ready for Pickup!",
                "body": f"Your order is ready. A driver will pick it up soon."
            },
            NotificationType.ORDER_PICKED_UP: {
                "title": "Order On The Way!",
                "body": f"{data.get('driver_name', 'Your driver')} has picked up your order. ETA: {data.get('eta', '15')} min."
            },
            NotificationType.ORDER_DELIVERED: {
                "title": "Order Delivered!",
                "body": "Your order has been delivered. Enjoy your meal!"
            },
            NotificationType.ORDER_CANCELLED: {
                "title": "Order Cancelled",
                "body": f"Your order #{data.get('order_id', '')} has been cancelled. {data.get('reason', '')}"
            },

            # Ride notifications
            NotificationType.RIDE_REQUESTED: {
                "title": "Finding Your Driver",
                "body": "Looking for the best driver match near you..."
            },
            NotificationType.RIDE_ACCEPTED: {
                "title": "Driver Matched!",
                "body": f"{data.get('driver_name', 'Your driver')} is on the way. ETA: {data.get('eta', '5')} min."
            },
            NotificationType.DRIVER_ARRIVING: {
                "title": "Driver Arriving!",
                "body": f"{data.get('driver_name', 'Your driver')} is almost there. {data.get('vehicle_info', '')}"
            },
            NotificationType.RIDE_STARTED: {
                "title": "Ride Started",
                "body": f"You're on your way to {data.get('destination', 'your destination')}."
            },
            NotificationType.RIDE_COMPLETED: {
                "title": "Ride Completed!",
                "body": f"Total fare: ${data.get('fare', '0.00')}. Thanks for riding with Dollor.ai!"
            },
            NotificationType.RIDE_CANCELLED: {
                "title": "Ride Cancelled",
                "body": f"Your ride has been cancelled. {data.get('reason', '')}"
            },

            # Driver notifications
            NotificationType.NEW_DELIVERY_AVAILABLE: {
                "title": "New Delivery Available!",
                "body": f"Pickup at {data.get('restaurant_name', 'restaurant')} - ${data.get('payout', '0.00')} + tips"
            },
            NotificationType.NEW_RIDE_REQUEST: {
                "title": "New Ride Request!",
                "body": f"Pickup: {data.get('pickup_address', 'Nearby')} - ${data.get('fare_estimate', '0.00')}"
            },
            NotificationType.EARNINGS_UPDATED: {
                "title": "Earnings Updated",
                "body": f"You earned ${data.get('amount', '0.00')} from your last {data.get('type', 'delivery')}!"
            },
            NotificationType.DOCUMENT_APPROVED: {
                "title": "Document Approved!",
                "body": f"Your {data.get('document_type', 'document')} has been verified. You're ready to start!"
            },
            NotificationType.DOCUMENT_REJECTED: {
                "title": "Document Needs Attention",
                "body": f"Your {data.get('document_type', 'document')} couldn't be verified. Please resubmit."
            },

            # Restaurant notifications
            NotificationType.NEW_ORDER: {
                "title": "New Order!",
                "body": f"Order #{data.get('order_id', '')} - {data.get('item_count', 0)} items - ${data.get('total', '0.00')}"
            },
            NotificationType.ORDER_ACCEPTED_BY_DRIVER: {
                "title": "Driver Assigned",
                "body": f"{data.get('driver_name', 'A driver')} will pick up order #{data.get('order_id', '')} in {data.get('eta', '10')} min."
            },

            # General notifications
            NotificationType.PROMOTION: {
                "title": data.get('promo_title', 'Special Offer!'),
                "body": data.get('promo_body', 'Check out our latest deals!')
            },
            NotificationType.ACCOUNT_UPDATE: {
                "title": "Account Update",
                "body": data.get('message', 'Your account has been updated.')
            },
            NotificationType.SUPPORT_MESSAGE: {
                "title": "Support Response",
                "body": data.get('message', 'You have a new message from support.')
            },
        }

        return templates.get(notification_type, {
            "title": "Dollor.ai",
            "body": "You have a new notification."
        })

    async def send_fcm_notification(
        self,
        device_token: str,
        notification_type: NotificationType,
        data: Dict[str, Any] = None,
        badge: int = None
    ) -> bool:
        """Send notification via Firebase Cloud Messaging (Android)."""

        if not self.fcm_server_key:
            logger.warning("FCM server key not configured")
            return False

        data = data or {}
        content = self._get_notification_content(notification_type, data)

        payload = {
            "to": device_token,
            "notification": {
                "title": content["title"],
                "body": content["body"],
                "sound": "default",
                "click_action": "OPEN_APP"
            },
            "data": {
                "type": notification_type.value,
                **data
            },
            "priority": "high"
        }

        if badge is not None:
            payload["notification"]["badge"] = badge

        headers = {
            "Authorization": f"key={self.fcm_server_key}",
            "Content-Type": "application/json"
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.fcm_url,
                    json=payload,
                    headers=headers,
                    timeout=10.0
                )

                if response.status_code == 200:
                    result = response.json()
                    if result.get("success", 0) > 0:
                        logger.info(f"FCM notification sent: {notification_type.value}")
                        return True
                    else:
                        logger.warning(f"FCM notification failed: {result}")
                        return False
                else:
                    logger.error(f"FCM request failed: {response.status_code}")
                    return False

        except Exception as e:
            logger.error(f"FCM notification error: {e}")
            return False

    async def send_apns_notification(
        self,
        device_token: str,
        notification_type: NotificationType,
        data: Dict[str, Any] = None,
        badge: int = None
    ) -> bool:
        """Send notification via Apple Push Notification service (iOS)."""

        # For APNs, we need a JWT token signed with the authentication key
        # This is a simplified implementation - production should use a proper APNs library

        if not all([self.apns_key_id, self.apns_team_id]):
            logger.warning("APNs credentials not configured")
            return False

        data = data or {}
        content = self._get_notification_content(notification_type, data)

        payload = {
            "aps": {
                "alert": {
                    "title": content["title"],
                    "body": content["body"]
                },
                "sound": "default",
                "content-available": 1
            },
            "type": notification_type.value,
            **data
        }

        if badge is not None:
            payload["aps"]["badge"] = badge

        # In production, you would:
        # 1. Generate JWT token using the APNs auth key
        # 2. Send HTTP/2 request to APNs
        # For now, log the attempt

        logger.info(f"APNs notification prepared: {notification_type.value} to {device_token[:20]}...")
        return True

    async def send_notification(
        self,
        device_token: str,
        platform: str,  # "ios" or "android"
        notification_type: NotificationType,
        data: Dict[str, Any] = None,
        badge: int = None
    ) -> bool:
        """Send notification to appropriate platform."""

        if platform.lower() == "ios":
            return await self.send_apns_notification(device_token, notification_type, data, badge)
        elif platform.lower() == "android":
            return await self.send_fcm_notification(device_token, notification_type, data, badge)
        else:
            logger.warning(f"Unknown platform: {platform}")
            return False

    async def send_to_multiple(
        self,
        recipients: List[Dict[str, str]],  # List of {"token": str, "platform": str}
        notification_type: NotificationType,
        data: Dict[str, Any] = None,
        badge: int = None
    ) -> Dict[str, int]:
        """Send notification to multiple recipients."""

        results = {"success": 0, "failed": 0}

        tasks = [
            self.send_notification(
                r["token"],
                r["platform"],
                notification_type,
                data,
                badge
            )
            for r in recipients
        ]

        outcomes = await asyncio.gather(*tasks, return_exceptions=True)

        for outcome in outcomes:
            if outcome is True:
                results["success"] += 1
            else:
                results["failed"] += 1

        return results


# Singleton instance
notification_service = PushNotificationService()


# ===================== CONVENIENCE FUNCTIONS =====================

async def notify_order_placed(customer_token: str, platform: str, order_id: int, restaurant_name: str):
    """Notify customer that order was placed."""
    await notification_service.send_notification(
        customer_token, platform,
        NotificationType.ORDER_PLACED,
        {"order_id": str(order_id), "restaurant_name": restaurant_name}
    )


async def notify_new_order_to_restaurant(restaurant_token: str, platform: str,
                                          order_id: int, item_count: int, total: float):
    """Notify restaurant of new order."""
    await notification_service.send_notification(
        restaurant_token, platform,
        NotificationType.NEW_ORDER,
        {"order_id": str(order_id), "item_count": item_count, "total": f"{total:.2f}"}
    )


async def notify_order_picked_up(customer_token: str, platform: str,
                                  driver_name: str, eta: int):
    """Notify customer that order was picked up."""
    await notification_service.send_notification(
        customer_token, platform,
        NotificationType.ORDER_PICKED_UP,
        {"driver_name": driver_name, "eta": str(eta)}
    )


async def notify_order_delivered(customer_token: str, platform: str):
    """Notify customer that order was delivered."""
    await notification_service.send_notification(
        customer_token, platform,
        NotificationType.ORDER_DELIVERED
    )


async def notify_new_delivery_available(driver_token: str, platform: str,
                                         restaurant_name: str, payout: float):
    """Notify driver of new delivery opportunity."""
    await notification_service.send_notification(
        driver_token, platform,
        NotificationType.NEW_DELIVERY_AVAILABLE,
        {"restaurant_name": restaurant_name, "payout": f"{payout:.2f}"}
    )


async def notify_ride_accepted(customer_token: str, platform: str,
                                driver_name: str, eta: int, vehicle_info: str):
    """Notify customer that ride was accepted."""
    await notification_service.send_notification(
        customer_token, platform,
        NotificationType.RIDE_ACCEPTED,
        {"driver_name": driver_name, "eta": str(eta), "vehicle_info": vehicle_info}
    )


async def notify_ride_completed(customer_token: str, platform: str, fare: float):
    """Notify customer that ride was completed."""
    await notification_service.send_notification(
        customer_token, platform,
        NotificationType.RIDE_COMPLETED,
        {"fare": f"{fare:.2f}"}
    )


async def notify_driver_earnings(driver_token: str, platform: str,
                                  amount: float, earning_type: str = "delivery"):
    """Notify driver of earnings."""
    await notification_service.send_notification(
        driver_token, platform,
        NotificationType.EARNINGS_UPDATED,
        {"amount": f"{amount:.2f}", "type": earning_type}
    )


async def notify_document_status(driver_token: str, platform: str,
                                  approved: bool, document_type: str):
    """Notify driver of document verification status."""
    notification_type = NotificationType.DOCUMENT_APPROVED if approved else NotificationType.DOCUMENT_REJECTED
    await notification_service.send_notification(
        driver_token, platform,
        notification_type,
        {"document_type": document_type}
    )
