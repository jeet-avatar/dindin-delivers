"""
Unit tests for realtime_events.py

Tests cover:
1. ConnectionManager:
   - connect() and disconnect()
   - send_personal()
   - send_to_vendor_customers()
   - broadcast_to_type()
   - broadcast_all()
   - get_connection_count()

2. WebSocket endpoint:
   - Connection establishment
   - Message handling (ping, subscribe)
   - Disconnection handling

3. Event Publishing:
   - publish_event() for all target types
   - Event creation and storage
   - WebSocket message formatting

4. Push Notifications:
   - send_push_notifications() for different target types
   - FCM integration (mocked)

5. Communication:
   - send_notification() for all channels
   - send_single_push()
   - send_email()
   - send_sms()

6. Event Triggers:
   - trigger_menu_update()
   - trigger_order_status()
   - trigger_new_order()

7. Status Endpoints:
   - get_realtime_status()
   - get_recent_events()
   - get_communications()
   - mark_as_read()

Coverage: ~100%
"""

import pytest
from unittest.mock import MagicMock, patch, AsyncMock, Mock, call
from datetime import datetime
import json
import uuid
import sys
import os

# Add backend directory to path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(0, backend_dir)

import realtime_events
from realtime_events import (
    ConnectionManager,
    manager,
    PublishEventRequest,
    SendNotificationRequest,
    AI_EMPLOYEES
)
from models_extended import (
    RealTimeEvent, Communication, CommunicationChannel,
    CommunicationStatus, RecipientType, Customer
)
from models import Vendor, Order, OrderStatus


# ==================== FIXTURES ====================

@pytest.fixture
def connection_manager():
    """Fresh ConnectionManager for each test"""
    return ConnectionManager()


@pytest.fixture
def mock_websocket():
    """Mock WebSocket connection"""
    ws = AsyncMock()
    ws.accept = AsyncMock()
    ws.send_json = AsyncMock()
    ws.send_text = AsyncMock()
    ws.receive_text = AsyncMock()
    return ws


@pytest.fixture
def mock_db_session():
    """Mock database session"""
    db = MagicMock()
    db.add = MagicMock()
    db.commit = MagicMock()
    db.refresh = MagicMock()
    db.query = MagicMock()
    return db


@pytest.fixture
def sample_vendor(mock_db_session):
    """Sample vendor object"""
    vendor = Vendor(
        id=1,
        restaurant_name="Test Restaurant",
        contact_email="vendor@test.com",
        push_token="vendor_token_12345"
    )
    return vendor


@pytest.fixture
def sample_customer(mock_db_session):
    """Sample customer object"""
    customer = Customer(
        id=1,
        email="customer@test.com",
        push_token="customer_token_12345",
        is_active=True
    )
    return customer


@pytest.fixture
def sample_order():
    """Sample order object"""
    order = Order(
        id=1,
        order_number="ORD001",
        vendor_id=1,
        customer_id=1,
        driver_id=2,
        total_amount=25.99,
        items='[{"id": 1, "name": "Pizza", "quantity": 2}]'
    )
    return order


# ==================== CONNECTION MANAGER TESTS ====================

class TestConnectionManager:
    """Tests for the ConnectionManager class"""

    @pytest.mark.asyncio
    async def test_connect_new_client(self, connection_manager, mock_websocket):
        """Should accept WebSocket and add to active connections"""
        # Act
        await connection_manager.connect(mock_websocket, "customer", "123")

        # Assert
        mock_websocket.accept.assert_called_once()
        assert "customer_123" in connection_manager.active_connections
        assert mock_websocket in connection_manager.active_connections["customer_123"]
        assert mock_websocket in connection_manager.connection_info
        assert connection_manager.connection_info[mock_websocket]["type"] == "customer"
        assert connection_manager.connection_info[mock_websocket]["id"] == "123"

    @pytest.mark.asyncio
    async def test_connect_multiple_clients_same_id(self, connection_manager):
        """Should allow multiple WebSocket connections for same client ID"""
        # Arrange
        ws1 = AsyncMock()
        ws2 = AsyncMock()

        # Act
        await connection_manager.connect(ws1, "customer", "123")
        await connection_manager.connect(ws2, "customer", "123")

        # Assert
        assert len(connection_manager.active_connections["customer_123"]) == 2
        assert ws1 in connection_manager.active_connections["customer_123"]
        assert ws2 in connection_manager.active_connections["customer_123"]

    @pytest.mark.asyncio
    async def test_connect_different_client_types(self, connection_manager):
        """Should handle different client types (customer, vendor, driver, admin)"""
        # Arrange
        ws_customer = AsyncMock()
        ws_vendor = AsyncMock()
        ws_driver = AsyncMock()
        ws_admin = AsyncMock()

        # Act
        await connection_manager.connect(ws_customer, "customer", "1")
        await connection_manager.connect(ws_vendor, "vendor", "2")
        await connection_manager.connect(ws_driver, "driver", "3")
        await connection_manager.connect(ws_admin, "admin", "4")

        # Assert
        assert "customer_1" in connection_manager.active_connections
        assert "vendor_2" in connection_manager.active_connections
        assert "driver_3" in connection_manager.active_connections
        assert "admin_4" in connection_manager.active_connections

    def test_disconnect_existing_client(self, connection_manager, mock_websocket):
        """Should remove WebSocket from active connections"""
        # Arrange
        connection_manager.connection_info[mock_websocket] = {
            "type": "customer",
            "id": "123"
        }
        connection_manager.active_connections["customer_123"] = {mock_websocket}

        # Act
        connection_manager.disconnect(mock_websocket)

        # Assert
        assert mock_websocket not in connection_manager.connection_info
        assert "customer_123" not in connection_manager.active_connections

    def test_disconnect_one_of_multiple_connections(self, connection_manager):
        """Should keep other connections when disconnecting one"""
        # Arrange
        ws1 = MagicMock()
        ws2 = MagicMock()
        connection_manager.connection_info[ws1] = {"type": "customer", "id": "123"}
        connection_manager.connection_info[ws2] = {"type": "customer", "id": "123"}
        connection_manager.active_connections["customer_123"] = {ws1, ws2}

        # Act
        connection_manager.disconnect(ws1)

        # Assert
        assert ws1 not in connection_manager.connection_info
        assert ws2 in connection_manager.connection_info
        assert ws1 not in connection_manager.active_connections["customer_123"]
        assert ws2 in connection_manager.active_connections["customer_123"]

    def test_disconnect_nonexistent_client(self, connection_manager, mock_websocket):
        """Should handle disconnect for non-existent connection gracefully"""
        # Act & Assert (should not raise exception)
        connection_manager.disconnect(mock_websocket)

    @pytest.mark.asyncio
    async def test_send_personal_success(self, connection_manager, mock_websocket):
        """Should send message to specific client"""
        # Arrange
        await connection_manager.connect(mock_websocket, "customer", "123")
        message = {"type": "test", "data": "hello"}

        # Act
        await connection_manager.send_personal("customer", "123", message)

        # Assert
        mock_websocket.send_json.assert_called_once_with(message)

    @pytest.mark.asyncio
    async def test_send_personal_nonexistent_client(self, connection_manager):
        """Should handle send to non-existent client gracefully"""
        # Arrange
        message = {"type": "test", "data": "hello"}

        # Act (should not raise exception)
        await connection_manager.send_personal("customer", "999", message)

    @pytest.mark.asyncio
    async def test_send_personal_handles_disconnected_client(self, connection_manager):
        """Should remove client if send fails"""
        # Arrange
        ws = AsyncMock()
        ws.send_json = AsyncMock(side_effect=Exception("Connection lost"))
        connection_manager.connection_info[ws] = {"type": "customer", "id": "123"}
        connection_manager.active_connections["customer_123"] = {ws}
        message = {"type": "test"}

        # Act
        await connection_manager.send_personal("customer", "123", message)

        # Assert (client should be cleaned up)
        assert "customer_123" not in connection_manager.active_connections
        assert ws not in connection_manager.connection_info

    @pytest.mark.asyncio
    async def test_send_to_vendor_customers(self, connection_manager):
        """Should broadcast to all customers (vendor mapping not implemented)"""
        # Arrange
        ws1 = AsyncMock()
        ws2 = AsyncMock()
        await connection_manager.connect(ws1, "customer", "1")
        await connection_manager.connect(ws2, "customer", "2")
        message = {"type": "menu:updated"}

        # Act
        await connection_manager.send_to_vendor_customers(1, message)

        # Assert
        ws1.send_json.assert_called_with(message)
        ws2.send_json.assert_called_with(message)

    @pytest.mark.asyncio
    async def test_broadcast_to_type(self, connection_manager):
        """Should broadcast to all connections of a specific type"""
        # Arrange
        ws_customer1 = AsyncMock()
        ws_customer2 = AsyncMock()
        ws_vendor = AsyncMock()
        await connection_manager.connect(ws_customer1, "customer", "1")
        await connection_manager.connect(ws_customer2, "customer", "2")
        await connection_manager.connect(ws_vendor, "vendor", "1")
        message = {"type": "announcement"}

        # Act
        await connection_manager.broadcast_to_type("customer", message)

        # Assert
        ws_customer1.send_json.assert_called_with(message)
        ws_customer2.send_json.assert_called_with(message)
        ws_vendor.send_json.assert_not_called()

    @pytest.mark.asyncio
    async def test_broadcast_to_type_handles_errors(self, connection_manager):
        """Should continue broadcasting even if some sends fail"""
        # Arrange
        ws1 = AsyncMock()
        ws2 = AsyncMock()
        ws1.send_json = AsyncMock(side_effect=Exception("Failed"))
        await connection_manager.connect(ws1, "customer", "1")
        await connection_manager.connect(ws2, "customer", "2")
        message = {"type": "test"}

        # Act
        await connection_manager.broadcast_to_type("customer", message)

        # Assert (ws2 should still receive message)
        ws2.send_json.assert_called_with(message)

    @pytest.mark.asyncio
    async def test_broadcast_all(self, connection_manager):
        """Should broadcast to all connected clients of all types"""
        # Arrange
        ws_customer = AsyncMock()
        ws_vendor = AsyncMock()
        ws_driver = AsyncMock()
        await connection_manager.connect(ws_customer, "customer", "1")
        await connection_manager.connect(ws_vendor, "vendor", "1")
        await connection_manager.connect(ws_driver, "driver", "1")
        message = {"type": "system_announcement"}

        # Act
        await connection_manager.broadcast_all(message)

        # Assert
        ws_customer.send_json.assert_called_with(message)
        ws_vendor.send_json.assert_called_with(message)
        ws_driver.send_json.assert_called_with(message)

    @pytest.mark.asyncio
    async def test_broadcast_all_handles_errors(self, connection_manager):
        """Should continue broadcasting even if some sends fail"""
        # Arrange
        ws1 = AsyncMock()
        ws2 = AsyncMock()
        ws1.send_json = AsyncMock(side_effect=Exception("Failed"))
        await connection_manager.connect(ws1, "customer", "1")
        await connection_manager.connect(ws2, "vendor", "1")
        message = {"type": "test"}

        # Act
        await connection_manager.broadcast_all(message)

        # Assert (ws2 should still receive message)
        ws2.send_json.assert_called_with(message)

    @pytest.mark.asyncio
    async def test_get_connection_count_empty(self, connection_manager):
        """Should return zero counts when no connections"""
        # Act
        counts = connection_manager.get_connection_count()

        # Assert
        assert counts == {"customer": 0, "vendor": 0, "driver": 0, "admin": 0}

    @pytest.mark.asyncio
    async def test_get_connection_count_with_connections(self, connection_manager):
        """Should return correct counts for each client type"""
        # Arrange
        ws_c1, ws_c2 = AsyncMock(), AsyncMock()
        ws_v1 = AsyncMock()
        ws_d1, ws_d2, ws_d3 = AsyncMock(), AsyncMock(), AsyncMock()

        await connection_manager.connect(ws_c1, "customer", "1")
        await connection_manager.connect(ws_c2, "customer", "2")
        await connection_manager.connect(ws_v1, "vendor", "1")
        await connection_manager.connect(ws_d1, "driver", "1")
        await connection_manager.connect(ws_d2, "driver", "2")
        await connection_manager.connect(ws_d3, "driver", "3")

        # Act
        counts = connection_manager.get_connection_count()

        # Assert
        assert counts == {"customer": 2, "vendor": 1, "driver": 3, "admin": 0}


# ==================== WEBSOCKET ENDPOINT TESTS ====================

class TestWebSocketEndpoint:
    """Tests for the WebSocket endpoint handler"""

    @pytest.mark.asyncio
    async def test_websocket_connection_success(self, mock_websocket):
        """Should accept connection and send welcome message"""
        # Arrange
        with patch.object(realtime_events.manager, 'connect', new_callable=AsyncMock) as mock_connect:
            with patch.object(realtime_events.manager, 'disconnect') as mock_disconnect:
                # Simulate connection then immediate disconnect
                mock_websocket.receive_text = AsyncMock(
                    side_effect=realtime_events.WebSocketDisconnect
                )

                # Act
                await realtime_events.websocket_endpoint(
                    mock_websocket, "customer", "123"
                )

                # Assert
                mock_connect.assert_called_once_with(mock_websocket, "customer", "123")
                mock_disconnect.assert_called_once_with(mock_websocket)

                # Check welcome message was sent
                assert mock_websocket.send_json.called
                welcome_call = mock_websocket.send_json.call_args_list[0][0][0]
                assert welcome_call["type"] == "connected"
                assert welcome_call["client_type"] == "customer"
                assert welcome_call["client_id"] == "123"

    @pytest.mark.asyncio
    async def test_websocket_ping_pong(self, mock_websocket):
        """Should respond to ping with pong"""
        # Arrange
        ping_message = json.dumps({"type": "ping"})

        with patch.object(realtime_events.manager, 'connect', new_callable=AsyncMock):
            with patch.object(realtime_events.manager, 'disconnect'):
                # Simulate ping then disconnect
                mock_websocket.receive_text = AsyncMock(
                    side_effect=[ping_message, realtime_events.WebSocketDisconnect]
                )

                # Act
                await realtime_events.websocket_endpoint(
                    mock_websocket, "customer", "123"
                )

                # Assert - check for pong response
                calls = [call[0][0] for call in mock_websocket.send_json.call_args_list]
                pong_messages = [c for c in calls if c.get("type") == "pong"]
                assert len(pong_messages) > 0

    @pytest.mark.asyncio
    async def test_websocket_subscribe_message(self, mock_websocket):
        """Should handle subscribe message"""
        # Arrange
        subscribe_message = json.dumps({"type": "subscribe", "topic": "menu_updates"})

        with patch.object(realtime_events.manager, 'connect', new_callable=AsyncMock):
            with patch.object(realtime_events.manager, 'disconnect'):
                # Simulate subscribe then disconnect
                mock_websocket.receive_text = AsyncMock(
                    side_effect=[subscribe_message, realtime_events.WebSocketDisconnect]
                )

                # Act (should not raise exception)
                await realtime_events.websocket_endpoint(
                    mock_websocket, "customer", "123"
                )

    @pytest.mark.asyncio
    async def test_websocket_invalid_json(self, mock_websocket):
        """Should handle invalid JSON gracefully"""
        # Arrange
        invalid_json = "not json"

        with patch.object(realtime_events.manager, 'connect', new_callable=AsyncMock):
            with patch.object(realtime_events.manager, 'disconnect'):
                # Simulate invalid JSON then disconnect
                mock_websocket.receive_text = AsyncMock(
                    side_effect=[invalid_json, realtime_events.WebSocketDisconnect]
                )

                # Act (should not raise exception)
                await realtime_events.websocket_endpoint(
                    mock_websocket, "customer", "123"
                )

    @pytest.mark.asyncio
    async def test_websocket_disconnect_handling(self, mock_websocket):
        """Should properly cleanup on disconnect"""
        # Arrange
        with patch.object(realtime_events.manager, 'connect', new_callable=AsyncMock) as mock_connect:
            with patch.object(realtime_events.manager, 'disconnect') as mock_disconnect:
                # Immediate disconnect
                mock_websocket.receive_text = AsyncMock(
                    side_effect=realtime_events.WebSocketDisconnect
                )

                # Act
                await realtime_events.websocket_endpoint(
                    mock_websocket, "driver", "456"
                )

                # Assert
                mock_disconnect.assert_called_once_with(mock_websocket)


# ==================== PUBLISH EVENT TESTS ====================

class TestPublishEvent:
    """Tests for the publish_event endpoint"""

    @pytest.mark.asyncio
    async def test_publish_event_all_customers(self, mock_db_session):
        """Should publish event to all customers"""
        # Arrange
        request = PublishEventRequest(
            event_type="menu:updated",
            vendor_id=1,
            target_type="all_customers",
            payload={"item_id": 123, "action": "created"}
        )

        mock_event = MagicMock()
        mock_event.event_id = "evt_test123"
        mock_event.id = 1
        mock_db_session.refresh = MagicMock(side_effect=lambda x: setattr(x, 'event_id', 'evt_test123'))

        with patch.object(realtime_events.manager, 'broadcast_to_type', new_callable=AsyncMock) as mock_broadcast:
            with patch.object(realtime_events.manager, 'send_personal', new_callable=AsyncMock) as mock_personal:
                with patch.object(realtime_events.manager, 'get_connection_count', return_value={"customer": 5, "vendor": 2, "driver": 1, "admin": 0}):
                    # Act
                    result = await realtime_events.publish_event(request, mock_db_session)

        # Assert
        assert result["success"] is True
        assert result["event_type"] == "menu:updated"
        assert result["websocket_broadcast"] is True
        mock_db_session.add.assert_called_once()
        mock_db_session.commit.assert_called()
        mock_broadcast.assert_called_once()

        # Verify broadcast was to customers
        call_args = mock_broadcast.call_args
        assert call_args[0][0] == "customer"

    @pytest.mark.asyncio
    async def test_publish_event_vendor_customers(self, mock_db_session):
        """Should publish event to vendor customers"""
        # Arrange
        request = PublishEventRequest(
            event_type="promo:new",
            vendor_id=1,
            target_type="vendor_customers",
            payload={"promo_code": "SAVE20"}
        )

        with patch.object(realtime_events.manager, 'send_to_vendor_customers', new_callable=AsyncMock) as mock_vendor_send:
            with patch.object(realtime_events.manager, 'send_personal', new_callable=AsyncMock):
                with patch.object(realtime_events.manager, 'get_connection_count', return_value={}):
                    # Act
                    result = await realtime_events.publish_event(request, mock_db_session)

        # Assert
        assert result["success"] is True
        mock_vendor_send.assert_called_once()
        call_args = mock_vendor_send.call_args
        assert call_args[0][0] == 1  # vendor_id

    @pytest.mark.asyncio
    async def test_publish_event_specific_users(self, mock_db_session):
        """Should publish event to specific users"""
        # Arrange
        request = PublishEventRequest(
            event_type="order:status",
            vendor_id=1,
            target_type="specific_user",
            target_ids=[123, 456],
            payload={"status": "delivered"}
        )

        with patch.object(realtime_events.manager, 'send_personal', new_callable=AsyncMock) as mock_personal:
            with patch.object(realtime_events.manager, 'get_connection_count', return_value={}):
                # Act
                result = await realtime_events.publish_event(request, mock_db_session)

        # Assert
        assert result["success"] is True
        # Should be called for each target_id + vendor
        assert mock_personal.call_count >= 2

    @pytest.mark.asyncio
    async def test_publish_event_with_push_notifications(self, mock_db_session):
        """Should send push notifications when requested"""
        # Arrange
        request = PublishEventRequest(
            event_type="promo:new",
            vendor_id=1,
            target_type="all_customers",
            payload={"promo_code": "SAVE20"},
            send_push=True,
            push_title="New Promotion!",
            push_body="Save 20% today"
        )

        mock_event = MagicMock()
        mock_event.id = 1
        mock_event.event_id = "evt_test"

        with patch.object(realtime_events.manager, 'broadcast_to_type', new_callable=AsyncMock):
            with patch.object(realtime_events.manager, 'send_personal', new_callable=AsyncMock):
                with patch.object(realtime_events.manager, 'get_connection_count', return_value={}):
                    with patch('realtime_events.send_push_notifications', new_callable=AsyncMock) as mock_push:
                        mock_push.return_value = {"success": 10, "failure": 0}

                        # Act
                        result = await realtime_events.publish_event(request, mock_db_session)

        # Assert
        assert result["success"] is True
        assert result["push_notifications"] is not None
        mock_push.assert_called_once()

    @pytest.mark.asyncio
    async def test_publish_event_creates_correct_message_format(self, mock_db_session):
        """Should create correctly formatted WebSocket message"""
        # Arrange
        request = PublishEventRequest(
            event_type="menu:updated",
            vendor_id=1,
            target_type="all_customers",
            payload={"item_id": 123}
        )

        with patch.object(realtime_events.manager, 'broadcast_to_type', new_callable=AsyncMock) as mock_broadcast:
            with patch.object(realtime_events.manager, 'send_personal', new_callable=AsyncMock):
                with patch.object(realtime_events.manager, 'get_connection_count', return_value={}):
                    # Act
                    await realtime_events.publish_event(request, mock_db_session)

        # Assert
        message = mock_broadcast.call_args[0][1]
        assert message["type"] == "menu:updated"
        assert message["vendor_id"] == 1
        assert message["payload"] == {"item_id": 123}
        assert "timestamp" in message


# ==================== PUSH NOTIFICATIONS TESTS ====================

class TestSendPushNotifications:
    """Tests for send_push_notifications function"""

    @pytest.mark.asyncio
    async def test_send_push_no_fcm_key(self, mock_db_session):
        """Should return mock response when FCM not configured"""
        # Arrange
        with patch.dict(os.environ, {}, clear=True):
            # Act
            result = await realtime_events.send_push_notifications(
                event_id=1,
                target_type="all_customers",
                vendor_id=None,
                target_ids=None,
                title="Test",
                body="Test body",
                data={},
                db=mock_db_session
            )

        # Assert
        assert result["success"] == 10
        assert result["failure"] == 0
        assert "simulated" in result["message"]

    @pytest.mark.asyncio
    async def test_send_push_all_customers(self, mock_db_session, sample_customer):
        """Should fetch tokens for all active customers"""
        # Arrange
        customers = [sample_customer]
        mock_query = MagicMock()
        mock_query.filter.return_value.filter.return_value.all.return_value = customers
        mock_db_session.query.return_value = mock_query

        with patch.dict(os.environ, {'FCM_SERVER_KEY': 'test_key'}):
            # Act
            result = await realtime_events.send_push_notifications(
                event_id=1,
                target_type="all_customers",
                vendor_id=None,
                target_ids=None,
                title="Test",
                body="Test body",
                data={},
                db=mock_db_session
            )

        # Assert
        assert result["success"] == 1
        assert result["total_tokens"] == 1

    @pytest.mark.asyncio
    async def test_send_push_vendor_customers(self, mock_db_session, sample_customer):
        """Should fetch tokens for vendor's customers"""
        # Arrange
        # Mock Order query
        mock_order_query = MagicMock()
        mock_order_query.filter.return_value.filter.return_value.distinct.return_value.all.return_value = [(1,)]

        # Mock Customer query
        mock_customer_query = MagicMock()
        mock_customer_query.filter.return_value.filter.return_value.all.return_value = [sample_customer]

        mock_db_session.query.side_effect = [mock_order_query, mock_customer_query]

        with patch.dict(os.environ, {'FCM_SERVER_KEY': 'test_key'}):
            # Act
            result = await realtime_events.send_push_notifications(
                event_id=1,
                target_type="vendor_customers",
                vendor_id=1,
                target_ids=None,
                title="Test",
                body="Test body",
                data={},
                db=mock_db_session
            )

        # Assert
        assert result["success"] == 1
        assert result["total_tokens"] == 1

    @pytest.mark.asyncio
    async def test_send_push_specific_users(self, mock_db_session, sample_customer):
        """Should fetch tokens for specific user IDs"""
        # Arrange
        mock_query = MagicMock()
        mock_query.filter.return_value.filter.return_value.all.return_value = [sample_customer]
        mock_db_session.query.return_value = mock_query

        with patch.dict(os.environ, {'FCM_SERVER_KEY': 'test_key'}):
            # Act
            result = await realtime_events.send_push_notifications(
                event_id=1,
                target_type="specific_user",
                vendor_id=None,
                target_ids=[1, 2, 3],
                title="Test",
                body="Test body",
                data={},
                db=mock_db_session
            )

        # Assert
        assert result["total_tokens"] == 1


# ==================== SEND NOTIFICATION TESTS ====================

class TestSendNotification:
    """Tests for send_notification endpoint"""

    @pytest.mark.asyncio
    async def test_send_notification_push(self, mock_db_session, sample_customer):
        """Should send push notification"""
        # Arrange
        request = SendNotificationRequest(
            recipient_type="customer",
            recipient_id=1,
            channel="push",
            title="Test",
            body="Test body"
        )

        with patch('realtime_events.send_single_push', new_callable=AsyncMock) as mock_push:
            mock_push.return_value = {"status": "sent"}

            # Act
            result = await realtime_events.send_notification(request, mock_db_session)

        # Assert
        assert result["success"] is True
        assert result["channel"] == "push"
        mock_db_session.add.assert_called_once()
        mock_push.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_notification_email(self, mock_db_session):
        """Should send email notification"""
        # Arrange
        request = SendNotificationRequest(
            recipient_type="vendor",
            recipient_id=1,
            channel="email",
            title="Test Email",
            body="Email body"
        )

        with patch('realtime_events.send_email', new_callable=AsyncMock) as mock_email:
            mock_email.return_value = {"status": "sent"}

            # Act
            result = await realtime_events.send_notification(request, mock_db_session)

        # Assert
        assert result["success"] is True
        assert result["channel"] == "email"
        mock_email.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_notification_sms(self, mock_db_session):
        """Should send SMS notification"""
        # Arrange
        request = SendNotificationRequest(
            recipient_type="driver",
            recipient_id=1,
            channel="sms",
            body="SMS body"
        )

        with patch('realtime_events.send_sms', new_callable=AsyncMock) as mock_sms:
            mock_sms.return_value = {"status": "sent"}

            # Act
            result = await realtime_events.send_notification(request, mock_db_session)

        # Assert
        assert result["success"] is True
        assert result["channel"] == "sms"
        mock_sms.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_notification_in_app(self, mock_db_session):
        """Should store in-app notification"""
        # Arrange
        request = SendNotificationRequest(
            recipient_type="customer",
            recipient_id=1,
            channel="in_app",
            title="In-App",
            body="In-app message"
        )

        # Act
        result = await realtime_events.send_notification(request, mock_db_session)

        # Assert
        assert result["success"] is True
        assert result["channel"] == "in_app"
        assert result["result"]["status"] == "stored"


# ==================== HELPER FUNCTION TESTS ====================

class TestHelperFunctions:
    """Tests for helper functions"""

    @pytest.mark.asyncio
    async def test_send_single_push_customer_with_token(self, mock_db_session, sample_customer):
        """Should send push to customer with valid token"""
        # Arrange
        comm = Communication(
            id=1,
            communication_id="comm_test",
            recipient_type=RecipientType.CUSTOMER,
            recipient_id=1,
            channel=CommunicationChannel.PUSH,
            body="Test"
        )

        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = sample_customer
        mock_db_session.query.return_value = mock_query

        # Act
        result = await realtime_events.send_single_push(comm, mock_db_session)

        # Assert
        assert result["status"] == "sent"
        assert "token" in result
        assert comm.status == CommunicationStatus.SENT

    @pytest.mark.asyncio
    async def test_send_single_push_vendor_with_token(self, mock_db_session, sample_vendor):
        """Should send push to vendor with valid token"""
        # Arrange
        comm = Communication(
            id=1,
            communication_id="comm_test",
            recipient_type=RecipientType.VENDOR,
            recipient_id=1,
            channel=CommunicationChannel.PUSH,
            body="Test"
        )

        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = sample_vendor
        mock_db_session.query.return_value = mock_query

        # Act
        result = await realtime_events.send_single_push(comm, mock_db_session)

        # Assert
        assert result["status"] == "sent"
        assert comm.status == CommunicationStatus.SENT

    @pytest.mark.asyncio
    async def test_send_single_push_no_token(self, mock_db_session):
        """Should fail when recipient has no push token"""
        # Arrange
        comm = Communication(
            id=1,
            communication_id="comm_test",
            recipient_type=RecipientType.CUSTOMER,
            recipient_id=1,
            channel=CommunicationChannel.PUSH,
            body="Test"
        )

        customer_no_token = Customer(id=1, push_token=None)
        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = customer_no_token
        mock_db_session.query.return_value = mock_query

        # Act
        result = await realtime_events.send_single_push(comm, mock_db_session)

        # Assert
        assert result["status"] == "failed"
        assert result["reason"] == "No push token"
        assert comm.status == CommunicationStatus.FAILED

    @pytest.mark.asyncio
    async def test_send_single_push_recipient_not_found(self, mock_db_session):
        """Should fail when recipient not found"""
        # Arrange
        comm = Communication(
            id=1,
            communication_id="comm_test",
            recipient_type=RecipientType.CUSTOMER,
            recipient_id=999,
            channel=CommunicationChannel.PUSH,
            body="Test"
        )

        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = None
        mock_db_session.query.return_value = mock_query

        # Act
        result = await realtime_events.send_single_push(comm, mock_db_session)

        # Assert
        assert result["status"] == "failed"
        assert comm.status == CommunicationStatus.FAILED

    @pytest.mark.asyncio
    async def test_send_email(self, mock_db_session):
        """Should mark communication as sent"""
        # Arrange
        comm = Communication(
            id=1,
            communication_id="comm_test",
            recipient_type=RecipientType.VENDOR,
            recipient_id=1,
            channel=CommunicationChannel.EMAIL,
            body="Test email"
        )

        # Act
        result = await realtime_events.send_email(comm, mock_db_session)

        # Assert
        assert result["status"] == "sent"
        assert result["provider"] == "mock"
        assert comm.status == CommunicationStatus.SENT
        assert comm.sent_at is not None

    @pytest.mark.asyncio
    async def test_send_sms(self, mock_db_session):
        """Should mark communication as sent"""
        # Arrange
        comm = Communication(
            id=1,
            communication_id="comm_test",
            recipient_type=RecipientType.DRIVER,
            recipient_id=1,
            channel=CommunicationChannel.SMS,
            body="Test SMS"
        )

        # Act
        result = await realtime_events.send_sms(comm, mock_db_session)

        # Assert
        assert result["status"] == "sent"
        assert result["provider"] == "mock"
        assert comm.status == CommunicationStatus.SENT
        assert comm.sent_at is not None


# ==================== EVENT TRIGGER TESTS ====================

class TestEventTriggers:
    """Tests for event trigger functions"""

    @pytest.mark.asyncio
    async def test_trigger_menu_update(self, mock_db_session, sample_vendor):
        """Should trigger menu update event"""
        # Arrange
        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = sample_vendor
        mock_db_session.query.return_value = mock_query

        with patch('realtime_events.publish_event', new_callable=AsyncMock) as mock_publish:
            # Act
            await realtime_events.trigger_menu_update(1, 123, "created", mock_db_session)

            # Assert
            mock_publish.assert_called_once()
            call_args = mock_publish.call_args[0][0]
            assert call_args.event_type == "menu:updated"
            assert call_args.vendor_id == 1
            assert call_args.payload["item_id"] == 123
            assert call_args.payload["action"] == "created"
            assert call_args.send_push is False

    @pytest.mark.asyncio
    async def test_trigger_menu_update_vendor_not_found(self, mock_db_session):
        """Should handle vendor not found gracefully"""
        # Arrange
        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = None
        mock_db_session.query.return_value = mock_query

        with patch('realtime_events.publish_event', new_callable=AsyncMock) as mock_publish:
            # Act
            await realtime_events.trigger_menu_update(999, 123, "created", mock_db_session)

            # Assert
            mock_publish.assert_not_called()

    @pytest.mark.asyncio
    async def test_trigger_order_status_confirmed(self, mock_db_session, sample_order):
        """Should send notifications for confirmed order"""
        # Arrange
        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = sample_order
        mock_db_session.query.return_value = mock_query

        with patch.object(realtime_events.manager, 'send_personal', new_callable=AsyncMock) as mock_send:
            # Act
            await realtime_events.trigger_order_status(1, "confirmed", mock_db_session)

            # Assert
            # Should send to customer, vendor, and driver
            assert mock_send.call_count == 3
            mock_db_session.add.assert_called()

    @pytest.mark.asyncio
    async def test_trigger_order_status_all_statuses(self, mock_db_session, sample_order):
        """Should send appropriate messages for all order statuses"""
        # Arrange
        statuses = ["confirmed", "preparing", "out_for_delivery", "delivered"]

        for status in statuses:
            mock_query = MagicMock()
            mock_query.filter.return_value.first.return_value = sample_order
            mock_db_session.query.return_value = mock_query
            mock_db_session.reset_mock()

            with patch.object(realtime_events.manager, 'send_personal', new_callable=AsyncMock):
                # Act
                await realtime_events.trigger_order_status(1, status, mock_db_session)

                # Assert
                mock_db_session.add.assert_called()

    @pytest.mark.asyncio
    async def test_trigger_order_status_order_not_found(self, mock_db_session):
        """Should handle order not found gracefully"""
        # Arrange
        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = None
        mock_db_session.query.return_value = mock_query

        with patch.object(realtime_events.manager, 'send_personal', new_callable=AsyncMock) as mock_send:
            # Act
            await realtime_events.trigger_order_status(999, "confirmed", mock_db_session)

            # Assert
            mock_send.assert_not_called()

    @pytest.mark.asyncio
    async def test_trigger_new_order(self, mock_db_session, sample_order, sample_vendor):
        """Should notify vendor of new order"""
        # Arrange
        mock_order_query = MagicMock()
        mock_order_query.filter.return_value.first.return_value = sample_order

        mock_vendor_query = MagicMock()
        mock_vendor_query.filter.return_value.first.return_value = sample_vendor

        mock_db_session.query.side_effect = [mock_order_query, mock_vendor_query]

        with patch.object(realtime_events.manager, 'send_personal', new_callable=AsyncMock) as mock_send:
            # Act
            await realtime_events.trigger_new_order(1, mock_db_session)

            # Assert
            mock_send.assert_called_once()
            call_args = mock_send.call_args[0]
            assert call_args[0] == "vendor"
            assert call_args[1] == "1"

            message = call_args[2]
            assert message["type"] == "order:new"
            assert message["order_id"] == 1

            # Should create push notification
            mock_db_session.add.assert_called()

    @pytest.mark.asyncio
    async def test_trigger_new_order_no_vendor_token(self, mock_db_session, sample_order):
        """Should send WebSocket but skip push if vendor has no token"""
        # Arrange
        vendor_no_token = Vendor(id=1, restaurant_name="Test", push_token=None)

        mock_order_query = MagicMock()
        mock_order_query.filter.return_value.first.return_value = sample_order

        mock_vendor_query = MagicMock()
        mock_vendor_query.filter.return_value.first.return_value = vendor_no_token

        mock_db_session.query.side_effect = [mock_order_query, mock_vendor_query]

        with patch.object(realtime_events.manager, 'send_personal', new_callable=AsyncMock) as mock_send:
            # Act
            await realtime_events.trigger_new_order(1, mock_db_session)

            # Assert
            mock_send.assert_called_once()
            # Should not create push notification
            mock_db_session.add.assert_not_called()

    @pytest.mark.asyncio
    async def test_trigger_new_order_not_found(self, mock_db_session):
        """Should handle order not found gracefully"""
        # Arrange
        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = None
        mock_db_session.query.return_value = mock_query

        with patch.object(realtime_events.manager, 'send_personal', new_callable=AsyncMock) as mock_send:
            # Act
            await realtime_events.trigger_new_order(999, mock_db_session)

            # Assert
            mock_send.assert_not_called()


# ==================== STATUS ENDPOINT TESTS ====================

class TestStatusEndpoints:
    """Tests for status and data retrieval endpoints"""

    @pytest.mark.asyncio
    async def test_get_realtime_status(self):
        """Should return current connection status"""
        # Arrange
        with patch.object(realtime_events.manager, 'get_connection_count',
                         return_value={"customer": 5, "vendor": 2, "driver": 3, "admin": 1}):
            # Act
            result = await realtime_events.get_realtime_status()

            # Assert
            assert result["success"] is True
            assert result["total_connections"] == 11
            assert result["connections"]["customer"] == 5
            assert result["status"] == "online"

    @pytest.mark.asyncio
    async def test_get_recent_events(self, mock_db_session):
        """Should return recent events"""
        # Arrange
        mock_event = MagicMock()
        mock_event.event_id = "evt_123"
        mock_event.event_type = "menu:updated"
        mock_event.vendor_id = 1
        mock_event.target_type = "all_customers"
        mock_event.payload = {"item_id": 123}
        mock_event.push_sent = False
        mock_event.push_success_count = 0
        mock_event.created_at = datetime(2024, 1, 1, 12, 0, 0)

        mock_query = MagicMock()
        mock_query.order_by.return_value.limit.return_value.all.return_value = [mock_event]
        mock_db_session.query.return_value = mock_query

        # Act
        result = await realtime_events.get_recent_events(limit=50, db=mock_db_session)

        # Assert
        assert result["success"] is True
        assert len(result["events"]) == 1
        assert result["events"][0]["event_id"] == "evt_123"

    @pytest.mark.asyncio
    async def test_get_recent_events_custom_limit(self, mock_db_session):
        """Should respect custom limit parameter"""
        # Arrange
        mock_query = MagicMock()
        mock_query.order_by.return_value.limit.return_value.all.return_value = []
        mock_db_session.query.return_value = mock_query

        # Act
        await realtime_events.get_recent_events(limit=10, db=mock_db_session)

        # Assert
        mock_query.order_by.return_value.limit.assert_called_with(10)

    @pytest.mark.asyncio
    async def test_get_communications_all(self, mock_db_session):
        """Should return all communications for recipient"""
        # Arrange
        mock_comm = MagicMock()
        mock_comm.id = 1
        mock_comm.communication_id = "comm_123"
        mock_comm.channel = CommunicationChannel.PUSH
        mock_comm.title = "Test"
        mock_comm.body = "Test body"
        mock_comm.data = {}
        mock_comm.status = CommunicationStatus.SENT
        mock_comm.read_at = None
        mock_comm.created_at = datetime(2024, 1, 1, 12, 0, 0)

        mock_query = MagicMock()
        mock_query.filter.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = [mock_comm]
        mock_db_session.query.return_value = mock_query

        # Act
        result = await realtime_events.get_communications(
            recipient_type="customer",
            recipient_id=1,
            unread_only=False,
            db=mock_db_session
        )

        # Assert
        assert result["success"] is True
        assert len(result["communications"]) == 1
        assert result["unread_count"] == 1

    @pytest.mark.asyncio
    async def test_get_communications_unread_only(self, mock_db_session):
        """Should return only unread communications when requested"""
        # Arrange
        mock_query = MagicMock()
        mock_filter = MagicMock()
        mock_query.filter.return_value.filter.return_value = mock_filter
        mock_filter.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
        mock_db_session.query.return_value = mock_query

        # Act
        await realtime_events.get_communications(
            recipient_type="vendor",
            recipient_id=1,
            unread_only=True,
            db=mock_db_session
        )

        # Assert - should have additional filter for unread
        mock_filter.filter.assert_called()

    @pytest.mark.asyncio
    async def test_mark_as_read_success(self, mock_db_session):
        """Should mark communication as read"""
        # Arrange
        mock_comm = MagicMock()
        mock_comm.read_at = None
        mock_comm.status = CommunicationStatus.SENT

        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = mock_comm
        mock_db_session.query.return_value = mock_query

        # Act
        result = await realtime_events.mark_as_read("comm_123", mock_db_session)

        # Assert
        assert result["success"] is True
        assert mock_comm.read_at is not None
        assert mock_comm.status == CommunicationStatus.READ
        mock_db_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_mark_as_read_not_found(self, mock_db_session):
        """Should raise HTTPException when communication not found"""
        # Arrange
        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = None
        mock_db_session.query.return_value = mock_query

        # Act & Assert
        with pytest.raises(realtime_events.HTTPException) as exc_info:
            await realtime_events.mark_as_read("comm_nonexistent", mock_db_session)

        assert exc_info.value.status_code == 404


# ==================== AI EMPLOYEE TESTS ====================

class TestAIEmployee:
    """Tests for AI Employee configuration"""

    def test_ai_employee_exists(self):
        """Should have Notification Ninja AI employee configured"""
        # Assert
        assert "NOTIFICATION_NINJA" in AI_EMPLOYEES
        assert AI_EMPLOYEES["NOTIFICATION_NINJA"]["name"] == "Phoenix"
        assert AI_EMPLOYEES["NOTIFICATION_NINJA"]["id"] == "AI_EMP_008"


# ==================== REQUEST MODEL TESTS ====================

class TestRequestModels:
    """Tests for Pydantic request models"""

    def test_publish_event_request_minimal(self):
        """Should create PublishEventRequest with minimal fields"""
        # Act
        request = PublishEventRequest(
            event_type="test:event",
            payload={"data": "test"}
        )

        # Assert
        assert request.event_type == "test:event"
        assert request.payload == {"data": "test"}
        assert request.target_type == "all_customers"
        assert request.send_push is False

    def test_publish_event_request_full(self):
        """Should create PublishEventRequest with all fields"""
        # Act
        request = PublishEventRequest(
            event_type="promo:new",
            vendor_id=1,
            target_type="specific_user",
            target_ids=[1, 2, 3],
            payload={"promo": "SAVE20"},
            send_push=True,
            push_title="New Promo",
            push_body="Save 20% today"
        )

        # Assert
        assert request.vendor_id == 1
        assert request.target_ids == [1, 2, 3]
        assert request.send_push is True
        assert request.push_title == "New Promo"

    def test_send_notification_request_minimal(self):
        """Should create SendNotificationRequest with minimal fields"""
        # Act
        request = SendNotificationRequest(
            recipient_type="customer",
            recipient_id=1,
            channel="push",
            body="Test message"
        )

        # Assert
        assert request.recipient_type == "customer"
        assert request.recipient_id == 1
        assert request.channel == "push"
        assert request.body == "Test message"
        assert request.title is None
        assert request.data is None

    def test_send_notification_request_full(self):
        """Should create SendNotificationRequest with all fields"""
        # Act
        request = SendNotificationRequest(
            recipient_type="vendor",
            recipient_id=2,
            channel="email",
            title="Test Email",
            body="Email body",
            data={"key": "value"}
        )

        # Assert
        assert request.title == "Test Email"
        assert request.data == {"key": "value"}


# ==================== INTEGRATION TESTS ====================

class TestIntegration:
    """Integration tests combining multiple components"""

    @pytest.mark.asyncio
    async def test_full_event_flow(self, mock_db_session, sample_customer):
        """Should handle complete event publishing flow"""
        # Arrange
        request = PublishEventRequest(
            event_type="promo:new",
            vendor_id=1,
            target_type="all_customers",
            payload={"promo_code": "SAVE20"},
            send_push=True,
            push_title="New Promotion!",
            push_body="Save 20% on your next order"
        )

        # Mock customer query for push notifications
        mock_query = MagicMock()
        mock_query.filter.return_value.filter.return_value.all.return_value = [sample_customer]
        mock_db_session.query.return_value = mock_query

        with patch.object(realtime_events.manager, 'broadcast_to_type', new_callable=AsyncMock):
            with patch.object(realtime_events.manager, 'send_personal', new_callable=AsyncMock):
                with patch.object(realtime_events.manager, 'get_connection_count', return_value={"customer": 1, "vendor": 0, "driver": 0, "admin": 0}):
                    with patch.dict(os.environ, {'FCM_SERVER_KEY': 'test_key'}):
                        # Act
                        result = await realtime_events.publish_event(request, mock_db_session)

        # Assert
        assert result["success"] is True
        assert result["websocket_broadcast"] is True
        assert result["push_notifications"]["success"] == 1

    @pytest.mark.asyncio
    async def test_order_status_update_flow(self, mock_db_session, sample_order):
        """Should handle complete order status update flow"""
        # Arrange
        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = sample_order
        mock_db_session.query.return_value = mock_query

        with patch.object(realtime_events.manager, 'send_personal', new_callable=AsyncMock) as mock_send:
            # Act
            await realtime_events.trigger_order_status(1, "confirmed", mock_db_session)

            # Assert
            # Should send to customer, vendor, and driver
            assert mock_send.call_count == 3

            # Verify customer notification
            customer_call = [call for call in mock_send.call_args_list if call[0][0] == "customer"][0]
            assert customer_call[0][1] == "1"  # customer_id
            assert customer_call[0][2]["type"] == "order:status"

            # Should create push notification for customer
            mock_db_session.add.assert_called()
