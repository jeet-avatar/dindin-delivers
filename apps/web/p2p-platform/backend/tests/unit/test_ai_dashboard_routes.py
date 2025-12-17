"""
Unit tests for ai_dashboard_routes.py

Tests cover:
- GET /api/ai-employees/ - Get all AI employees
- GET /api/ai-employees/{employee_id} - Get specific AI employee
- POST /api/ai-employees/{employee_id}/status - Update AI employee status
- GET /api/ai-employees/reports/hourly - Get hourly reports
- GET /api/ai-employees/reports/hourly/latest - Get latest hourly reports
- POST /api/ai-employees/reports/generate - Generate hourly reports
- GET /api/ai-employees/activity - Get activity log
- GET /api/ai-employees/dashboard/metrics - Get dashboard metrics
- GET /api/ai-employees/dashboard/summary - Get dashboard summary

Achieves 100% coverage through extensive mocking.
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, MagicMock, patch
import json
import sys
import os

# Add backend directory to path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

# Import the router and dependencies
from ai_dashboard_routes import router
from models import (
    AIEmployee, AIEmployeeActivity, AIEmployeeHourlyReport,
    AIEmployeeDailyReport, DashboardMetric, AIEmployeeStatus
)
from main_new import app


class TestGetAllAIEmployees:
    """Tests for GET /api/ai-employees/"""

    @patch('ai_dashboard_routes.get_db')
    def test_get_all_employees_success(self, mock_get_db):
        """Should return all AI employees with their status"""
        # Arrange
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        mock_employee1 = Mock()
        mock_employee1.id = 1
        mock_employee1.employee_id = "AI_EMP_001"
        mock_employee1.name = "OrderBot Alpha"
        mock_employee1.role = "order_orchestrator"
        mock_employee1.department = "logistics"
        mock_employee1.avatar = "🤖"
        mock_employee1.status = AIEmployeeStatus.ACTIVE
        mock_employee1.is_online = True
        mock_employee1.last_active = datetime(2024, 12, 1, 14, 0, 0)
        mock_employee1.total_tasks_completed = 100
        mock_employee1.success_rate = 98.5
        mock_employee1.tasks_this_session = 10
        mock_employee1.errors_this_session = 1

        mock_employee2 = Mock()
        mock_employee2.id = 2
        mock_employee2.employee_id = "AI_EMP_002"
        mock_employee2.name = "KitchenBot Beta"
        mock_employee2.role = "fulfillment_coordinator"
        mock_employee2.department = "operations"
        mock_employee2.avatar = "👨‍🍳"
        mock_employee2.status = AIEmployeeStatus.IDLE
        mock_employee2.is_online = False
        mock_employee2.last_active = None
        mock_employee2.total_tasks_completed = 50
        mock_employee2.success_rate = 95.0
        mock_employee2.tasks_this_session = 0
        mock_employee2.errors_this_session = 0

        mock_db.query.return_value.all.return_value = [mock_employee1, mock_employee2]

        client = TestClient(app)

        # Act
        response = client.get("/api/ai-employees/")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert data["online"] == 1
        assert len(data["employees"]) == 2
        assert data["employees"][0]["employee_id"] == "AI_EMP_001"
        assert data["employees"][0]["name"] == "OrderBot Alpha"
        assert data["employees"][0]["status"] == "active"
        assert data["employees"][0]["is_online"] is True
        assert data["employees"][1]["employee_id"] == "AI_EMP_002"
        assert data["employees"][1]["is_online"] is False

    @patch('ai_dashboard_routes.get_db')
    def test_get_all_employees_empty(self, mock_get_db):
        """Should return empty list when no employees exist"""
        # Arrange
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        mock_db.query.return_value.all.return_value = []

        client = TestClient(app)

        # Act
        response = client.get("/api/ai-employees/")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["online"] == 0
        assert data["employees"] == []


class TestGetAIEmployee:
    """Tests for GET /api/ai-employees/{employee_id}"""

    @patch('ai_dashboard_routes.get_db')
    def test_get_employee_success(self, mock_get_db):
        """Should return specific AI employee details"""
        # Arrange
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        mock_employee = Mock()
        mock_employee.id = 1
        mock_employee.employee_id = "AI_EMP_001"
        mock_employee.name = "OrderBot Alpha"
        mock_employee.role = "order_orchestrator"
        mock_employee.department = "logistics"
        mock_employee.avatar = "🤖"
        mock_employee.status = AIEmployeeStatus.ACTIVE
        mock_employee.is_online = True
        mock_employee.last_active = datetime(2024, 12, 1, 14, 0, 0)
        mock_employee.session_start = datetime(2024, 12, 1, 8, 0, 0)
        mock_employee.total_tasks_completed = 100
        mock_employee.total_errors = 2
        mock_employee.success_rate = 98.0
        mock_employee.total_hours_active = 120.5
        mock_employee.average_task_time_seconds = 45.3
        mock_employee.tasks_this_session = 10
        mock_employee.errors_this_session = 1
        mock_employee.config_json = json.dumps({"max_concurrent_tasks": 5})
        mock_employee.created_at = datetime(2024, 11, 1, 0, 0, 0)

        mock_db.query.return_value.filter.return_value.first.return_value = mock_employee

        client = TestClient(app)

        # Act
        response = client.get("/api/ai-employees/AI_EMP_001")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["employee_id"] == "AI_EMP_001"
        assert data["name"] == "OrderBot Alpha"
        assert data["status"] == "active"
        assert data["metrics"]["total_tasks_completed"] == 100
        assert data["metrics"]["success_rate"] == 98.0
        assert data["config"]["max_concurrent_tasks"] == 5

    @patch('ai_dashboard_routes.get_db')
    def test_get_employee_not_found(self, mock_get_db):
        """Should return 404 when employee doesn't exist"""
        # Arrange
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        mock_db.query.return_value.filter.return_value.first.return_value = None

        client = TestClient(app)

        # Act
        response = client.get("/api/ai-employees/NONEXISTENT")

        # Assert
        assert response.status_code == 404
        assert "AI Employee not found" in response.json()["detail"]

    @patch('ai_dashboard_routes.get_db')
    def test_get_employee_no_config(self, mock_get_db):
        """Should handle employee with no config JSON"""
        # Arrange
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        mock_employee = Mock()
        mock_employee.id = 1
        mock_employee.employee_id = "AI_EMP_001"
        mock_employee.name = "OrderBot Alpha"
        mock_employee.role = "order_orchestrator"
        mock_employee.department = "logistics"
        mock_employee.avatar = "🤖"
        mock_employee.status = None
        mock_employee.is_online = True
        mock_employee.last_active = None
        mock_employee.session_start = None
        mock_employee.total_tasks_completed = 0
        mock_employee.total_errors = 0
        mock_employee.success_rate = 0.0
        mock_employee.total_hours_active = 0.0
        mock_employee.average_task_time_seconds = 0.0
        mock_employee.tasks_this_session = 0
        mock_employee.errors_this_session = 0
        mock_employee.config_json = None
        mock_employee.created_at = None

        mock_db.query.return_value.filter.return_value.first.return_value = mock_employee

        client = TestClient(app)

        # Act
        response = client.get("/api/ai-employees/AI_EMP_001")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["config"] == {}
        assert data["status"] == "idle"


class TestUpdateAIEmployeeStatus:
    """Tests for POST /api/ai-employees/{employee_id}/status"""

    @patch('ai_dashboard_routes.get_db')
    @patch('ai_dashboard_routes.datetime')
    def test_update_status_to_active(self, mock_datetime, mock_get_db):
        """Should update employee status to active"""
        # Arrange
        mock_now = datetime(2024, 12, 1, 14, 30, 0)
        mock_datetime.utcnow.return_value = mock_now

        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        mock_employee = Mock()
        mock_employee.employee_id = "AI_EMP_001"
        mock_employee.status = AIEmployeeStatus.IDLE
        mock_employee.is_online = False
        mock_employee.session_start = None

        mock_db.query.return_value.filter.return_value.first.return_value = mock_employee

        client = TestClient(app)

        # Act
        response = client.post("/api/ai-employees/AI_EMP_001/status?status=active")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["employee_id"] == "AI_EMP_001"
        assert data["status"] == "active"
        assert data["is_online"] is True
        assert mock_employee.status == AIEmployeeStatus.ACTIVE
        assert mock_employee.is_online is True
        assert mock_employee.last_active == mock_now
        assert mock_employee.session_start == mock_now
        mock_db.commit.assert_called_once()

    @patch('ai_dashboard_routes.get_db')
    @patch('ai_dashboard_routes.datetime')
    def test_update_status_to_offline(self, mock_datetime, mock_get_db):
        """Should update employee status to offline"""
        # Arrange
        mock_now = datetime(2024, 12, 1, 14, 30, 0)
        mock_datetime.utcnow.return_value = mock_now

        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        mock_employee = Mock()
        mock_employee.employee_id = "AI_EMP_001"
        mock_employee.status = AIEmployeeStatus.ACTIVE
        mock_employee.is_online = True

        mock_db.query.return_value.filter.return_value.first.return_value = mock_employee

        client = TestClient(app)

        # Act
        response = client.post("/api/ai-employees/AI_EMP_001/status?status=offline")

        # Assert
        assert response.status_code == 200
        assert mock_employee.status == AIEmployeeStatus.OFFLINE
        assert mock_employee.is_online is False

    @patch('ai_dashboard_routes.get_db')
    def test_update_status_invalid(self, mock_get_db):
        """Should reject invalid status"""
        # Arrange
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        mock_employee = Mock()
        mock_employee.employee_id = "AI_EMP_001"

        mock_db.query.return_value.filter.return_value.first.return_value = mock_employee

        client = TestClient(app)

        # Act
        response = client.post("/api/ai-employees/AI_EMP_001/status?status=invalid_status")

        # Assert
        assert response.status_code == 400
        assert "Invalid status" in response.json()["detail"]

    @patch('ai_dashboard_routes.get_db')
    def test_update_status_employee_not_found(self, mock_get_db):
        """Should return 404 when employee doesn't exist"""
        # Arrange
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        mock_db.query.return_value.filter.return_value.first.return_value = None

        client = TestClient(app)

        # Act
        response = client.post("/api/ai-employees/NONEXISTENT/status?status=active")

        # Assert
        assert response.status_code == 404
        assert "AI Employee not found" in response.json()["detail"]

    @patch('ai_dashboard_routes.get_db')
    @patch('ai_dashboard_routes.datetime')
    def test_update_status_processing_with_existing_session(self, mock_datetime, mock_get_db):
        """Should not reset session_start if already set"""
        # Arrange
        mock_now = datetime(2024, 12, 1, 14, 30, 0)
        existing_session = datetime(2024, 12, 1, 8, 0, 0)
        mock_datetime.utcnow.return_value = mock_now

        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        mock_employee = Mock()
        mock_employee.employee_id = "AI_EMP_001"
        mock_employee.status = AIEmployeeStatus.ACTIVE
        mock_employee.is_online = True
        mock_employee.session_start = existing_session

        mock_db.query.return_value.filter.return_value.first.return_value = mock_employee

        client = TestClient(app)

        # Act
        response = client.post("/api/ai-employees/AI_EMP_001/status?status=processing")

        # Assert
        assert response.status_code == 200
        assert mock_employee.session_start == existing_session  # Should not change


class TestGetHourlyReports:
    """Tests for GET /api/ai-employees/reports/hourly"""

    @patch('ai_dashboard_routes.get_db')
    @patch('ai_dashboard_routes.datetime')
    def test_get_hourly_reports_all(self, mock_datetime, mock_get_db):
        """Should return hourly reports for all employees"""
        # Arrange
        mock_now = datetime(2024, 12, 1, 14, 0, 0)
        mock_datetime.utcnow.return_value = mock_now

        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        mock_report = Mock()
        mock_report.report_id = "RPT-AI001-20241201-13"
        mock_report.ai_employee_id = 1
        mock_report.report_hour = datetime(2024, 12, 1, 13, 0, 0)
        mock_report.tasks_completed = 50
        mock_report.tasks_failed = 2
        mock_report.error_rate = 4.0
        mock_report.avg_processing_time_ms = 1500
        mock_report.uptime_percentage = 98.5
        mock_report.role_specific_metrics = json.dumps({"orders_processed": 50})
        mock_report.summary_text = "Test summary"
        mock_report.alerts = json.dumps([{"level": "warning", "message": "Test alert"}])
        mock_report.recommendations = json.dumps(["Test recommendation"])
        mock_report.is_published = True
        mock_report.created_at = datetime(2024, 12, 1, 14, 0, 0)

        mock_query = MagicMock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.all.return_value = [mock_report]

        client = TestClient(app)

        # Act
        response = client.get("/api/ai-employees/reports/hourly?hours=24")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["reports"]) == 1
        assert data["reports"][0]["report_id"] == "RPT-AI001-20241201-13"
        assert data["reports"][0]["tasks_completed"] == 50
        assert data["reports"][0]["role_specific_metrics"]["orders_processed"] == 50

    @patch('ai_dashboard_routes.get_db')
    @patch('ai_dashboard_routes.datetime')
    def test_get_hourly_reports_for_employee(self, mock_datetime, mock_get_db):
        """Should return hourly reports for specific employee"""
        # Arrange
        mock_now = datetime(2024, 12, 1, 14, 0, 0)
        mock_datetime.utcnow.return_value = mock_now

        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        mock_employee = Mock()
        mock_employee.id = 1
        mock_employee.employee_id = "AI_EMP_001"

        # Setup query chain for AIEmployee
        mock_employee_query = MagicMock()
        mock_employee_query.filter.return_value.first.return_value = mock_employee

        # Setup query chain for AIEmployeeHourlyReport
        mock_report_query = MagicMock()
        mock_report_query.filter.return_value = mock_report_query
        mock_report_query.order_by.return_value = mock_report_query
        mock_report_query.all.return_value = []

        def query_side_effect(model):
            if model == AIEmployee:
                return mock_employee_query
            return mock_report_query

        mock_db.query.side_effect = query_side_effect

        client = TestClient(app)

        # Act
        response = client.get("/api/ai-employees/reports/hourly?employee_id=AI_EMP_001&hours=12")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0


class TestGetLatestHourlyReports:
    """Tests for GET /api/ai-employees/reports/hourly/latest"""

    @patch('ai_dashboard_routes.get_db')
    def test_get_latest_reports_success(self, mock_get_db):
        """Should return latest report for each employee"""
        # Arrange
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        mock_employee = Mock()
        mock_employee.id = 1
        mock_employee.employee_id = "AI_EMP_001"
        mock_employee.name = "OrderBot Alpha"
        mock_employee.avatar = "🤖"
        mock_employee.role = "order_orchestrator"
        mock_employee.is_online = True

        mock_report = Mock()
        mock_report.report_id = "RPT-AI001-20241201-13"
        mock_report.report_hour = datetime(2024, 12, 1, 13, 0, 0)
        mock_report.tasks_completed = 50
        mock_report.tasks_failed = 2
        mock_report.error_rate = 4.0
        mock_report.summary_text = "Test summary"
        mock_report.alerts = json.dumps([])

        # Setup queries
        def query_side_effect(model):
            if model == AIEmployee:
                mock_query = MagicMock()
                mock_query.all.return_value = [mock_employee]
                return mock_query
            else:  # AIEmployeeHourlyReport
                mock_query = MagicMock()
                mock_query.filter.return_value.order_by.return_value.first.return_value = mock_report
                return mock_query

        mock_db.query.side_effect = query_side_effect

        client = TestClient(app)

        # Act
        response = client.get("/api/ai-employees/reports/hourly/latest")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["total_employees"] == 1
        assert len(data["latest_reports"]) == 1
        assert data["latest_reports"][0]["employee"]["id"] == "AI_EMP_001"
        assert data["latest_reports"][0]["report"]["tasks_completed"] == 50

    @patch('ai_dashboard_routes.get_db')
    def test_get_latest_reports_no_reports(self, mock_get_db):
        """Should handle employees with no reports"""
        # Arrange
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        mock_employee = Mock()
        mock_employee.id = 1
        mock_employee.employee_id = "AI_EMP_001"
        mock_employee.name = "OrderBot Alpha"

        def query_side_effect(model):
            if model == AIEmployee:
                mock_query = MagicMock()
                mock_query.all.return_value = [mock_employee]
                return mock_query
            else:
                mock_query = MagicMock()
                mock_query.filter.return_value.order_by.return_value.first.return_value = None
                return mock_query

        mock_db.query.side_effect = query_side_effect

        client = TestClient(app)

        # Act
        response = client.get("/api/ai-employees/reports/hourly/latest")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["total_employees"] == 1
        assert len(data["latest_reports"]) == 0


class TestGenerateHourlyReports:
    """Tests for POST /api/ai-employees/reports/generate"""

    @patch('ai_dashboard_routes.AIEmployeeReportingService')
    @patch('ai_dashboard_routes.datetime')
    def test_generate_reports_success(self, mock_datetime, mock_service_class):
        """Should trigger report generation"""
        # Arrange
        mock_now = datetime(2024, 12, 1, 14, 0, 0)
        mock_datetime.utcnow.return_value = mock_now

        mock_service = MagicMock()
        mock_service.generate_hourly_reports.return_value = [Mock(), Mock()]
        mock_service_class.return_value = mock_service

        client = TestClient(app)

        # Act
        response = client.post("/api/ai-employees/reports/generate")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["reports_generated"] == 2
        mock_service.generate_hourly_reports.assert_called_once()


class TestGetActivityLog:
    """Tests for GET /api/ai-employees/activity"""

    @patch('ai_dashboard_routes.get_db')
    @patch('ai_dashboard_routes.datetime')
    def test_get_activity_all(self, mock_datetime, mock_get_db):
        """Should return activity log for all employees"""
        # Arrange
        mock_now = datetime(2024, 12, 1, 14, 0, 0)
        mock_datetime.utcnow.return_value = mock_now

        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        mock_activity = Mock()
        mock_activity.id = 1
        mock_activity.ai_employee_id = 1
        mock_activity.activity_type = "ORDER_PROCESSED"
        mock_activity.description = "Processed order #123"
        mock_activity.status = "completed"
        mock_activity.processing_time_ms = 1500
        mock_activity.order_id = 123
        mock_activity.vendor_id = None
        mock_activity.driver_id = None
        mock_activity.error_message = None
        mock_activity.started_at = datetime(2024, 12, 1, 13, 30, 0)
        mock_activity.completed_at = datetime(2024, 12, 1, 13, 30, 1)

        mock_query = MagicMock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.all.return_value = [mock_activity]

        client = TestClient(app)

        # Act
        response = client.get("/api/ai-employees/activity?hours=24&limit=100")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["activities"]) == 1
        assert data["activities"][0]["activity_type"] == "ORDER_PROCESSED"

    @patch('ai_dashboard_routes.get_db')
    @patch('ai_dashboard_routes.datetime')
    def test_get_activity_filtered(self, mock_datetime, mock_get_db):
        """Should filter activity by employee and type"""
        # Arrange
        mock_now = datetime(2024, 12, 1, 14, 0, 0)
        mock_datetime.utcnow.return_value = mock_now

        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        mock_employee = Mock()
        mock_employee.id = 1

        # Setup query chains
        def query_side_effect(model):
            if model == AIEmployee:
                mock_query = MagicMock()
                mock_query.filter.return_value.first.return_value = mock_employee
                return mock_query
            else:  # AIEmployeeActivity
                mock_query = MagicMock()
                mock_query.filter.return_value = mock_query
                mock_query.order_by.return_value = mock_query
                mock_query.limit.return_value = mock_query
                mock_query.all.return_value = []
                return mock_query

        mock_db.query.side_effect = query_side_effect

        client = TestClient(app)

        # Act
        response = client.get(
            "/api/ai-employees/activity?employee_id=AI_EMP_001&activity_type=ORDER_PROCESSED&hours=12"
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0


class TestGetDashboardMetrics:
    """Tests for GET /api/ai-employees/dashboard/metrics"""

    @patch('ai_dashboard_routes.get_db')
    def test_get_metrics_success(self, mock_get_db):
        """Should return all dashboard metrics"""
        # Arrange
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        mock_metric1 = Mock()
        mock_metric1.metric_key = "orders_today"
        mock_metric1.metric_value = 150
        mock_metric1.metric_unit = "count"
        mock_metric1.metric_label = "Orders Today"
        mock_metric1.category = "orders"
        mock_metric1.time_window = "daily"
        mock_metric1.updated_at = datetime(2024, 12, 1, 14, 0, 0)

        mock_metric2 = Mock()
        mock_metric2.metric_key = "revenue_today"
        mock_metric2.metric_value = 2500.50
        mock_metric2.metric_unit = "dollars"
        mock_metric2.metric_label = "Revenue Today"
        mock_metric2.category = "finance"
        mock_metric2.time_window = "daily"
        mock_metric2.updated_at = datetime(2024, 12, 1, 14, 0, 0)

        mock_db.query.return_value.all.return_value = [mock_metric1, mock_metric2]

        client = TestClient(app)

        # Act
        response = client.get("/api/ai-employees/dashboard/metrics")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "orders_today" in data["metrics"]
        assert data["metrics"]["orders_today"]["value"] == 150
        assert data["metrics"]["revenue_today"]["value"] == 2500.50


class TestGetDashboardSummary:
    """Tests for GET /api/ai-employees/dashboard/summary"""

    @patch('ai_dashboard_routes.get_db')
    @patch('ai_dashboard_routes.datetime')
    def test_get_dashboard_summary_success(self, mock_datetime, mock_get_db):
        """Should return complete dashboard summary"""
        # Arrange
        mock_now = datetime(2024, 12, 1, 14, 0, 0)
        mock_today_start = datetime(2024, 12, 1, 0, 0, 0)
        mock_datetime.utcnow.return_value = mock_now

        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        mock_employee = Mock()
        mock_employee.id = 1
        mock_employee.employee_id = "AI_EMP_001"
        mock_employee.name = "OrderBot Alpha"
        mock_employee.avatar = "🤖"
        mock_employee.role = "order_orchestrator"
        mock_employee.department = "logistics"
        mock_employee.is_online = True
        mock_employee.status = AIEmployeeStatus.ACTIVE
        mock_employee.success_rate = 98.5

        mock_report1 = Mock()
        mock_report1.tasks_completed = 50
        mock_report1.tasks_failed = 2
        mock_report1.summary_text = "Test summary"
        mock_report1.alerts = json.dumps([{"level": "warning"}])

        mock_report2 = Mock()
        mock_report2.tasks_completed = 30
        mock_report2.tasks_failed = 1
        mock_report2.summary_text = "Latest summary"
        mock_report2.alerts = None

        # Setup complex query chains
        def query_side_effect(model):
            if model == AIEmployee:
                mock_query = MagicMock()
                mock_query.all.return_value = [mock_employee]
                return mock_query
            else:  # AIEmployeeHourlyReport
                mock_query = MagicMock()
                mock_filter = MagicMock()

                # For today's reports
                def filter_side_effect(*args, **kwargs):
                    return mock_filter

                mock_query.filter.side_effect = filter_side_effect
                mock_filter.filter.return_value = mock_filter

                # Separate responses for all() and first()
                mock_filter.all.return_value = [mock_report1, mock_report2]
                mock_filter.order_by.return_value.first.return_value = mock_report2

                return mock_query

        mock_db.query.side_effect = query_side_effect

        client = TestClient(app)

        # Act
        response = client.get("/api/ai-employees/dashboard/summary")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["summary"]["total_employees"] == 1
        assert data["summary"]["online_employees"] == 1
        assert data["summary"]["total_tasks_today"] == 80
        assert data["summary"]["total_errors_today"] == 3
        assert len(data["employees"]) == 1
        assert data["employees"][0]["tasks_today"] == 80
        assert data["employees"][0]["errors_today"] == 3

    @patch('ai_dashboard_routes.get_db')
    @patch('ai_dashboard_routes.datetime')
    def test_get_dashboard_summary_zero_division(self, mock_datetime, mock_get_db):
        """Should handle zero tasks gracefully"""
        # Arrange
        mock_now = datetime(2024, 12, 1, 14, 0, 0)
        mock_datetime.utcnow.return_value = mock_now

        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        mock_employee = Mock()
        mock_employee.id = 1
        mock_employee.employee_id = "AI_EMP_001"
        mock_employee.name = "OrderBot Alpha"
        mock_employee.avatar = "🤖"
        mock_employee.role = "order_orchestrator"
        mock_employee.department = "logistics"
        mock_employee.is_online = False
        mock_employee.status = AIEmployeeStatus.IDLE
        mock_employee.success_rate = 0.0

        def query_side_effect(model):
            if model == AIEmployee:
                mock_query = MagicMock()
                mock_query.all.return_value = [mock_employee]
                return mock_query
            else:
                mock_query = MagicMock()
                mock_filter = MagicMock()
                mock_query.filter.return_value = mock_filter
                mock_filter.filter.return_value = mock_filter
                mock_filter.all.return_value = []
                mock_filter.order_by.return_value.first.return_value = None
                return mock_query

        mock_db.query.side_effect = query_side_effect

        client = TestClient(app)

        # Act
        response = client.get("/api/ai-employees/dashboard/summary")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["summary"]["total_tasks_today"] == 0
        assert data["summary"]["overall_success_rate"] == 100.0  # Default when no tasks
        assert data["employees"][0]["has_alerts"] is False
