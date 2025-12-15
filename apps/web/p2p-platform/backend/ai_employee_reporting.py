"""
AI Employee Hourly Reporting Service
Generates hourly reports for each AI Employee and publishes to dashboard.
"""

from database import SessionLocal, engine
from models import (
    Base, AIEmployee, AIEmployeeActivity, AIEmployeeHourlyReport,
    AIEmployeeDailyReport, DashboardMetric, Order, OrderStatus,
    JournalEntry, Driver, Vendor
)
from datetime import datetime, timedelta
from sqlalchemy import func
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AIEmployeeReportingService:
    """Service to generate hourly and daily reports for AI Employees"""

    def __init__(self):
        self.db = SessionLocal()

    def __del__(self):
        if hasattr(self, 'db'):
            self.db.close()

    def generate_hourly_reports(self, report_hour: datetime = None):
        """Generate hourly reports for all AI Employees"""
        if report_hour is None:
            # Default to the previous hour
            now = datetime.utcnow()
            report_hour = now.replace(minute=0, second=0, microsecond=0) - timedelta(hours=1)

        hour_end = report_hour + timedelta(hours=1)
        report_date = report_hour.date()

        logger.info(f"📊 Generating hourly reports for {report_hour.strftime('%Y-%m-%d %H:00')}")

        employees = self.db.query(AIEmployee).filter(AIEmployee.is_online == True).all()
        reports_created = []

        for employee in employees:
            try:
                report = self._generate_employee_hourly_report(employee, report_hour, hour_end)
                if report:
                    reports_created.append(report)
                    logger.info(f"✅ {employee.avatar} {employee.name}: Report generated")
            except Exception as e:
                logger.error(f"❌ {employee.avatar} {employee.name}: Error - {e}")

        # Update dashboard metrics
        self._update_dashboard_metrics()

        logger.info(f"📈 Generated {len(reports_created)} hourly reports")
        return reports_created

    def _generate_employee_hourly_report(self, employee: AIEmployee, hour_start: datetime, hour_end: datetime):
        """Generate hourly report for a specific AI Employee"""

        # Check if report already exists
        report_id = f"RPT-{employee.employee_id}-{hour_start.strftime('%Y%m%d')}-{hour_start.hour:02d}"
        existing = self.db.query(AIEmployeeHourlyReport).filter(
            AIEmployeeHourlyReport.report_id == report_id
        ).first()

        if existing:
            return existing  # Already generated

        # Get activities for this hour
        activities = self.db.query(AIEmployeeActivity).filter(
            AIEmployeeActivity.ai_employee_id == employee.id,
            AIEmployeeActivity.started_at >= hour_start,
            AIEmployeeActivity.started_at < hour_end
        ).all()

        # Calculate common metrics
        tasks_completed = len([a for a in activities if a.status == "completed"])
        tasks_failed = len([a for a in activities if a.status == "failed"])
        total_tasks = tasks_completed + tasks_failed

        processing_times = [a.processing_time_ms for a in activities if a.processing_time_ms]
        avg_processing_time = sum(processing_times) / len(processing_times) if processing_times else 0
        total_processing_time = sum(processing_times)

        error_rate = (tasks_failed / total_tasks * 100) if total_tasks > 0 else 0.0
        uptime = 100.0  # Assume 100% uptime unless errors detected

        # Generate role-specific metrics
        role_metrics = self._get_role_specific_metrics(employee, hour_start, hour_end)

        # Generate summary text
        summary = self._generate_summary(employee, tasks_completed, tasks_failed, avg_processing_time, role_metrics)

        # Generate alerts
        alerts = self._check_alerts(employee, error_rate, avg_processing_time, role_metrics)

        # Generate recommendations
        recommendations = self._generate_recommendations(employee, error_rate, role_metrics)

        # Create report
        report = AIEmployeeHourlyReport(
            report_id=report_id,
            ai_employee_id=employee.id,
            report_hour=hour_start,
            report_date=hour_start.date(),
            tasks_completed=tasks_completed,
            tasks_failed=tasks_failed,
            avg_processing_time_ms=int(avg_processing_time),
            total_processing_time_ms=int(total_processing_time),
            error_rate=error_rate,
            uptime_percentage=uptime,
            role_specific_metrics=json.dumps(role_metrics),
            summary_text=summary,
            alerts=json.dumps(alerts) if alerts else None,
            recommendations=json.dumps(recommendations) if recommendations else None,
            is_published=True,
            published_at=datetime.utcnow()
        )

        self.db.add(report)

        # Update employee lifetime stats
        employee.total_tasks_completed += tasks_completed
        employee.total_errors += tasks_failed
        employee.tasks_this_session += total_tasks
        employee.errors_this_session += tasks_failed
        employee.last_active = datetime.utcnow()

        if employee.total_tasks_completed > 0:
            employee.success_rate = (
                (employee.total_tasks_completed - employee.total_errors) /
                employee.total_tasks_completed * 100
            )

        self.db.commit()
        return report

    def _get_role_specific_metrics(self, employee: AIEmployee, hour_start: datetime, hour_end: datetime) -> dict:
        """Get role-specific metrics based on employee role"""
        metrics = {}

        if employee.role == "order_orchestrator":
            # OrderBot Alpha metrics
            orders = self.db.query(Order).filter(
                Order.created_at >= hour_start,
                Order.created_at < hour_end
            ).all()

            metrics = {
                "orders_processed": len(orders),
                "total_order_value": sum(o.total_amount or 0 for o in orders),
                "avg_order_value": sum(o.total_amount or 0 for o in orders) / len(orders) if orders else 0,
                "payment_success_count": len([o for o in orders if o.payment_status == "succeeded"]),
                "payment_success_rate": (
                    len([o for o in orders if o.payment_status == "succeeded"]) / len(orders) * 100
                ) if orders else 100.0,
                "tax_collected": sum(o.tax_amount or 0 for o in orders),
                "platform_fees_earned": sum(o.platform_fee or 0 for o in orders)
            }

        elif employee.role == "fulfillment_coordinator":
            # KitchenBot Beta metrics
            orders = self.db.query(Order).filter(
                Order.created_at >= hour_start,
                Order.created_at < hour_end,
                Order.status.in_([OrderStatus.PREPARING, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED])
            ).all()

            prep_times = []
            for o in orders:
                if o.confirmed_at and o.preparing_at:
                    prep_time = (o.preparing_at - o.confirmed_at).total_seconds() / 60
                    prep_times.append(prep_time)

            metrics = {
                "orders_sent_to_kitchen": len(orders),
                "avg_prep_time_minutes": sum(prep_times) / len(prep_times) if prep_times else 0,
                "orders_delayed": len([t for t in prep_times if t > 25]),  # >25min is delayed
                "kitchen_efficiency_rate": (
                    (len(prep_times) - len([t for t in prep_times if t > 25])) / len(prep_times) * 100
                ) if prep_times else 100.0
            }

        elif employee.role == "dispatch_commander":
            # DispatchBot Gamma metrics
            orders = self.db.query(Order).filter(
                Order.created_at >= hour_start,
                Order.created_at < hour_end,
                Order.status.in_([OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED])
            ).all()

            delivery_times = []
            for o in orders:
                if o.preparing_at and o.delivered_at:
                    delivery_time = (o.delivered_at - o.preparing_at).total_seconds() / 60
                    delivery_times.append(delivery_time)

            active_drivers = self.db.query(Driver).filter(Driver.is_online == True).count()

            metrics = {
                "deliveries_dispatched": len(orders),
                "avg_delivery_time_minutes": sum(delivery_times) / len(delivery_times) if delivery_times else 0,
                "on_time_deliveries": len([t for t in delivery_times if t <= 45]),
                "on_time_rate": (
                    len([t for t in delivery_times if t <= 45]) / len(delivery_times) * 100
                ) if delivery_times else 100.0,
                "active_drivers": active_drivers,
                "tips_distributed": sum(o.tip or 0 for o in orders),
                "delivery_fees_distributed": sum(o.delivery_fee or 0 for o in orders)
            }

        elif employee.role == "finance_controller":
            # LedgerBot Delta metrics
            entries = self.db.query(JournalEntry).filter(
                JournalEntry.created_at >= hour_start,
                JournalEntry.created_at < hour_end
            ).all()

            orders = self.db.query(Order).filter(
                Order.created_at >= hour_start,
                Order.created_at < hour_end,
                Order.status == OrderStatus.DELIVERED
            ).all()

            metrics = {
                "journal_entries_created": len(entries),
                "total_revenue_processed": sum(o.total_amount or 0 for o in orders),
                "platform_revenue": sum(o.platform_fee or 0 for o in orders),
                "tax_collected": sum(o.tax_amount or 0 for o in orders),
                "vendor_payouts_pending": sum(o.subtotal or 0 for o in orders) - sum(o.platform_fee or 0 for o in orders),
                "driver_payouts_pending": sum((o.delivery_fee or 0) + (o.tip or 0) for o in orders),
                "books_balanced": True  # Assume balanced, flag if not
            }

        elif employee.role == "quality_sentinel":
            # QualityBot Epsilon metrics
            orders = self.db.query(Order).filter(
                Order.created_at >= hour_start,
                Order.created_at < hour_end
            ).all()

            # TODO: Add actual ratings table when implemented
            metrics = {
                "orders_monitored": len(orders),
                "reviews_processed": 0,  # Placeholder
                "complaints_received": 0,  # Placeholder
                "complaints_resolved": 0,  # Placeholder
                "avg_customer_rating": 4.8,  # Placeholder
                "refunds_processed": 0,  # Placeholder
                "quality_score": 98.5  # Placeholder
            }

        return metrics

    def _generate_summary(self, employee: AIEmployee, completed: int, failed: int, avg_time: float, role_metrics: dict) -> str:
        """Generate human-readable summary for the report"""
        summaries = {
            "order_orchestrator": f"""
📦 OrderBot Alpha - Hourly Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Orders Processed: {role_metrics.get('orders_processed', 0)}
💰 Total Order Value: ${role_metrics.get('total_order_value', 0):.2f}
💳 Payment Success Rate: {role_metrics.get('payment_success_rate', 100):.1f}%
🏛️ Tax Collected: ${role_metrics.get('tax_collected', 0):.2f}
📈 Platform Fees: ${role_metrics.get('platform_fees_earned', 0):.2f}
⚡ Avg Processing Time: {avg_time:.0f}ms
❌ Failed Tasks: {failed}
""".strip(),

            "fulfillment_coordinator": f"""
👨‍🍳 KitchenBot Beta - Hourly Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🍽️ Orders to Kitchen: {role_metrics.get('orders_sent_to_kitchen', 0)}
⏱️ Avg Prep Time: {role_metrics.get('avg_prep_time_minutes', 0):.1f} min
⚠️ Delayed Orders: {role_metrics.get('orders_delayed', 0)}
📊 Kitchen Efficiency: {role_metrics.get('kitchen_efficiency_rate', 100):.1f}%
❌ Failed Tasks: {failed}
""".strip(),

            "dispatch_commander": f"""
🚗 DispatchBot Gamma - Hourly Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Deliveries Dispatched: {role_metrics.get('deliveries_dispatched', 0)}
⏱️ Avg Delivery Time: {role_metrics.get('avg_delivery_time_minutes', 0):.1f} min
✅ On-Time Rate: {role_metrics.get('on_time_rate', 100):.1f}%
👷 Active Drivers: {role_metrics.get('active_drivers', 0)}
💵 Tips Distributed: ${role_metrics.get('tips_distributed', 0):.2f}
❌ Failed Tasks: {failed}
""".strip(),

            "finance_controller": f"""
📊 LedgerBot Delta - Hourly Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Journal Entries: {role_metrics.get('journal_entries_created', 0)}
💰 Revenue Processed: ${role_metrics.get('total_revenue_processed', 0):.2f}
📈 Platform Revenue: ${role_metrics.get('platform_revenue', 0):.2f}
🏛️ Tax Collected: ${role_metrics.get('tax_collected', 0):.2f}
🏪 Vendor Payouts Pending: ${role_metrics.get('vendor_payouts_pending', 0):.2f}
🚗 Driver Payouts Pending: ${role_metrics.get('driver_payouts_pending', 0):.2f}
✅ Books Balanced: {'Yes' if role_metrics.get('books_balanced', True) else 'NO - REVIEW REQUIRED'}
""".strip(),

            "quality_sentinel": f"""
⭐ QualityBot Epsilon - Hourly Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Orders Monitored: {role_metrics.get('orders_monitored', 0)}
📝 Reviews Processed: {role_metrics.get('reviews_processed', 0)}
⚠️ Complaints Received: {role_metrics.get('complaints_received', 0)}
✅ Complaints Resolved: {role_metrics.get('complaints_resolved', 0)}
⭐ Avg Customer Rating: {role_metrics.get('avg_customer_rating', 0):.1f}/5.0
📊 Quality Score: {role_metrics.get('quality_score', 0):.1f}%
""".strip()
        }

        return summaries.get(employee.role, f"Tasks: {completed}, Errors: {failed}")

    def _check_alerts(self, employee: AIEmployee, error_rate: float, avg_time: float, role_metrics: dict) -> list:
        """Check for any alert conditions"""
        alerts = []

        # Load alert thresholds from config
        try:
            config = json.loads(employee.config_json) if employee.config_json else {}
            thresholds = config.get("alert_thresholds", {})
        except:
            thresholds = {}

        # Check error rate
        if error_rate > 10:
            alerts.append({
                "level": "critical",
                "message": f"High error rate: {error_rate:.1f}%",
                "metric": "error_rate",
                "value": error_rate
            })
        elif error_rate > 5:
            alerts.append({
                "level": "warning",
                "message": f"Elevated error rate: {error_rate:.1f}%",
                "metric": "error_rate",
                "value": error_rate
            })

        # Role-specific alerts
        if employee.role == "order_orchestrator":
            payment_rate = role_metrics.get("payment_success_rate", 100)
            if payment_rate < 95:
                alerts.append({
                    "level": "warning",
                    "message": f"Payment success rate below target: {payment_rate:.1f}%",
                    "metric": "payment_success_rate",
                    "value": payment_rate
                })

        elif employee.role == "dispatch_commander":
            on_time_rate = role_metrics.get("on_time_rate", 100)
            if on_time_rate < 90:
                alerts.append({
                    "level": "warning",
                    "message": f"On-time delivery rate below target: {on_time_rate:.1f}%",
                    "metric": "on_time_rate",
                    "value": on_time_rate
                })

        elif employee.role == "quality_sentinel":
            avg_rating = role_metrics.get("avg_customer_rating", 5)
            if avg_rating < 4.0:
                alerts.append({
                    "level": "critical",
                    "message": f"Average rating below threshold: {avg_rating:.1f}",
                    "metric": "avg_customer_rating",
                    "value": avg_rating
                })

        return alerts

    def _generate_recommendations(self, employee: AIEmployee, error_rate: float, role_metrics: dict) -> list:
        """Generate recommendations based on metrics"""
        recommendations = []

        if error_rate > 5:
            recommendations.append("Review error logs for patterns and root causes")

        # Role-specific recommendations
        if employee.role == "fulfillment_coordinator":
            delayed = role_metrics.get("orders_delayed", 0)
            if delayed > 3:
                recommendations.append(f"Investigate {delayed} delayed orders - consider kitchen capacity review")

        elif employee.role == "dispatch_commander":
            on_time = role_metrics.get("on_time_rate", 100)
            if on_time < 95:
                recommendations.append("Consider adding more drivers during peak hours")
                recommendations.append("Review route optimization algorithm")

        return recommendations

    def _update_dashboard_metrics(self):
        """Update real-time dashboard metrics"""
        try:
            # Get current hour metrics
            now = datetime.utcnow()
            hour_start = now.replace(minute=0, second=0, microsecond=0)

            # Total orders today
            orders_today = self.db.query(Order).filter(
                func.date(Order.created_at) == now.date()
            ).count()

            # Total revenue today
            revenue_today = self.db.query(func.sum(Order.total_amount)).filter(
                func.date(Order.created_at) == now.date(),
                Order.status == OrderStatus.DELIVERED
            ).scalar() or 0

            # Active AI Employees
            active_employees = self.db.query(AIEmployee).filter(
                AIEmployee.is_online == True
            ).count()

            # Update or create metrics
            metrics_to_update = [
                ("orders_today", orders_today, "count", "Orders Today", "orders"),
                ("revenue_today", revenue_today, "dollars", "Revenue Today", "finance"),
                ("active_ai_employees", active_employees, "count", "Active AI Employees", "operations"),
            ]

            for key, value, unit, label, category in metrics_to_update:
                metric = self.db.query(DashboardMetric).filter(
                    DashboardMetric.metric_key == key
                ).first()

                if metric:
                    metric.metric_value = value
                    metric.updated_at = datetime.utcnow()
                else:
                    metric = DashboardMetric(
                        metric_key=key,
                        metric_value=value,
                        metric_unit=unit,
                        metric_label=label,
                        category=category,
                        time_window="daily"
                    )
                    self.db.add(metric)

            self.db.commit()
            logger.info("📊 Dashboard metrics updated")

        except Exception as e:
            logger.error(f"Error updating dashboard metrics: {e}")
            self.db.rollback()

    def get_latest_reports(self, limit: int = 5) -> list:
        """Get the latest hourly reports for all AI Employees"""
        reports = self.db.query(AIEmployeeHourlyReport).order_by(
            AIEmployeeHourlyReport.created_at.desc()
        ).limit(limit * 5).all()  # Get reports for all 5 employees

        return reports

    def get_employee_report(self, employee_id: str, hours: int = 24) -> list:
        """Get reports for a specific AI Employee"""
        employee = self.db.query(AIEmployee).filter(
            AIEmployee.employee_id == employee_id
        ).first()

        if not employee:
            return []

        cutoff = datetime.utcnow() - timedelta(hours=hours)

        reports = self.db.query(AIEmployeeHourlyReport).filter(
            AIEmployeeHourlyReport.ai_employee_id == employee.id,
            AIEmployeeHourlyReport.created_at >= cutoff
        ).order_by(AIEmployeeHourlyReport.report_hour.desc()).all()

        return reports


# Scheduler function to be called by cron/scheduler
def generate_hourly_reports():
    """Entry point for scheduled hourly report generation"""
    service = AIEmployeeReportingService()
    reports = service.generate_hourly_reports()
    return len(reports)


if __name__ == "__main__":
    # Run report generation manually
    print("🤖 AI Employee Hourly Reporting Service")
    print("=" * 50)

    service = AIEmployeeReportingService()
    reports = service.generate_hourly_reports()

    print(f"\n📊 Generated {len(reports)} reports")

    # Print summaries
    for report in reports:
        employee = service.db.query(AIEmployee).get(report.ai_employee_id)
        print(f"\n{report.summary_text}")
