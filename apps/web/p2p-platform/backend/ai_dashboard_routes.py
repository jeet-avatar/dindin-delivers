"""
AI Employee Dashboard API Routes
Provides endpoints for viewing AI Employee status and hourly reports.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, List
import json

from database import get_db
from models import (
    AIEmployee, AIEmployeeActivity, AIEmployeeHourlyReport,
    AIEmployeeDailyReport, DashboardMetric, AIEmployeeStatus
)
from ai_employee_reporting import AIEmployeeReportingService

router = APIRouter(prefix="/api/ai-employees", tags=["ai-employees"])


# ==================== AI EMPLOYEE STATUS ====================

@router.get("/")
async def get_all_ai_employees(db: Session = Depends(get_db)):
    """Get all AI Employees with their current status"""
    employees = db.query(AIEmployee).all()

    return {
        "employees": [
            {
                "id": emp.id,
                "employee_id": emp.employee_id,
                "name": emp.name,
                "role": emp.role,
                "department": emp.department,
                "avatar": emp.avatar,
                "status": emp.status.value if emp.status else "idle",
                "is_online": emp.is_online,
                "last_active": emp.last_active.isoformat() if emp.last_active else None,
                "total_tasks_completed": emp.total_tasks_completed,
                "success_rate": emp.success_rate,
                "tasks_this_session": emp.tasks_this_session,
                "errors_this_session": emp.errors_this_session
            }
            for emp in employees
        ],
        "total": len(employees),
        "online": len([e for e in employees if e.is_online])
    }


@router.get("/{employee_id}")
async def get_ai_employee(employee_id: str, db: Session = Depends(get_db)):
    """Get a specific AI Employee by their ID"""
    employee = db.query(AIEmployee).filter(
        AIEmployee.employee_id == employee_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="AI Employee not found")

    config = json.loads(employee.config_json) if employee.config_json else {}

    return {
        "id": employee.id,
        "employee_id": employee.employee_id,
        "name": employee.name,
        "role": employee.role,
        "department": employee.department,
        "avatar": employee.avatar,
        "status": employee.status.value if employee.status else "idle",
        "is_online": employee.is_online,
        "last_active": employee.last_active.isoformat() if employee.last_active else None,
        "session_start": employee.session_start.isoformat() if employee.session_start else None,
        "metrics": {
            "total_tasks_completed": employee.total_tasks_completed,
            "total_errors": employee.total_errors,
            "success_rate": employee.success_rate,
            "total_hours_active": employee.total_hours_active,
            "average_task_time_seconds": employee.average_task_time_seconds,
            "tasks_this_session": employee.tasks_this_session,
            "errors_this_session": employee.errors_this_session
        },
        "config": config,
        "created_at": employee.created_at.isoformat() if employee.created_at else None
    }


@router.post("/{employee_id}/status")
async def update_ai_employee_status(
    employee_id: str,
    status: str,
    db: Session = Depends(get_db)
):
    """Update an AI Employee's status"""
    employee = db.query(AIEmployee).filter(
        AIEmployee.employee_id == employee_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="AI Employee not found")

    # Validate status
    valid_statuses = ["active", "idle", "processing", "error", "offline"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    employee.status = AIEmployeeStatus(status)
    employee.last_active = datetime.utcnow()

    if status == "offline":
        employee.is_online = False
    elif status in ["active", "processing"]:
        employee.is_online = True
        if not employee.session_start:
            employee.session_start = datetime.utcnow()

    db.commit()

    return {
        "success": True,
        "employee_id": employee_id,
        "status": status,
        "is_online": employee.is_online
    }


# ==================== HOURLY REPORTS ====================

@router.get("/reports/hourly")
async def get_hourly_reports(
    employee_id: Optional[str] = None,
    hours: int = Query(24, description="Number of hours to look back"),
    db: Session = Depends(get_db)
):
    """Get hourly reports for all or a specific AI Employee"""
    cutoff = datetime.utcnow() - timedelta(hours=hours)

    query = db.query(AIEmployeeHourlyReport).filter(
        AIEmployeeHourlyReport.created_at >= cutoff
    )

    if employee_id:
        employee = db.query(AIEmployee).filter(
            AIEmployee.employee_id == employee_id
        ).first()
        if employee:
            query = query.filter(AIEmployeeHourlyReport.ai_employee_id == employee.id)

    reports = query.order_by(AIEmployeeHourlyReport.report_hour.desc()).all()

    return {
        "reports": [
            {
                "report_id": r.report_id,
                "ai_employee_id": r.ai_employee_id,
                "report_hour": r.report_hour.isoformat() if r.report_hour else None,
                "tasks_completed": r.tasks_completed,
                "tasks_failed": r.tasks_failed,
                "error_rate": r.error_rate,
                "avg_processing_time_ms": r.avg_processing_time_ms,
                "uptime_percentage": r.uptime_percentage,
                "role_specific_metrics": json.loads(r.role_specific_metrics) if r.role_specific_metrics else {},
                "summary_text": r.summary_text,
                "alerts": json.loads(r.alerts) if r.alerts else [],
                "recommendations": json.loads(r.recommendations) if r.recommendations else [],
                "is_published": r.is_published,
                "created_at": r.created_at.isoformat() if r.created_at else None
            }
            for r in reports
        ],
        "total": len(reports)
    }


@router.get("/reports/hourly/latest")
async def get_latest_hourly_reports(db: Session = Depends(get_db)):
    """Get the most recent hourly report for each AI Employee"""
    employees = db.query(AIEmployee).all()
    latest_reports = []

    for emp in employees:
        report = db.query(AIEmployeeHourlyReport).filter(
            AIEmployeeHourlyReport.ai_employee_id == emp.id
        ).order_by(AIEmployeeHourlyReport.report_hour.desc()).first()

        if report:
            latest_reports.append({
                "employee": {
                    "id": emp.employee_id,
                    "name": emp.name,
                    "avatar": emp.avatar,
                    "role": emp.role,
                    "is_online": emp.is_online
                },
                "report": {
                    "report_id": report.report_id,
                    "report_hour": report.report_hour.isoformat() if report.report_hour else None,
                    "tasks_completed": report.tasks_completed,
                    "tasks_failed": report.tasks_failed,
                    "error_rate": report.error_rate,
                    "summary_text": report.summary_text,
                    "alerts": json.loads(report.alerts) if report.alerts else []
                }
            })

    return {
        "latest_reports": latest_reports,
        "total_employees": len(employees)
    }


@router.post("/reports/generate")
async def generate_hourly_reports(db: Session = Depends(get_db)):
    """Manually trigger hourly report generation"""
    service = AIEmployeeReportingService()
    reports = service.generate_hourly_reports()

    return {
        "success": True,
        "reports_generated": len(reports),
        "timestamp": datetime.utcnow().isoformat()
    }


# ==================== ACTIVITY LOG ====================

@router.get("/activity")
async def get_activity_log(
    employee_id: Optional[str] = None,
    activity_type: Optional[str] = None,
    hours: int = Query(24, description="Number of hours to look back"),
    limit: int = Query(100, description="Maximum number of activities to return"),
    db: Session = Depends(get_db)
):
    """Get activity log for AI Employees"""
    cutoff = datetime.utcnow() - timedelta(hours=hours)

    query = db.query(AIEmployeeActivity).filter(
        AIEmployeeActivity.started_at >= cutoff
    )

    if employee_id:
        employee = db.query(AIEmployee).filter(
            AIEmployee.employee_id == employee_id
        ).first()
        if employee:
            query = query.filter(AIEmployeeActivity.ai_employee_id == employee.id)

    if activity_type:
        query = query.filter(AIEmployeeActivity.activity_type == activity_type)

    activities = query.order_by(
        AIEmployeeActivity.started_at.desc()
    ).limit(limit).all()

    return {
        "activities": [
            {
                "id": a.id,
                "ai_employee_id": a.ai_employee_id,
                "activity_type": a.activity_type,
                "description": a.description,
                "status": a.status,
                "processing_time_ms": a.processing_time_ms,
                "order_id": a.order_id,
                "vendor_id": a.vendor_id,
                "driver_id": a.driver_id,
                "error_message": a.error_message,
                "started_at": a.started_at.isoformat() if a.started_at else None,
                "completed_at": a.completed_at.isoformat() if a.completed_at else None
            }
            for a in activities
        ],
        "total": len(activities)
    }


# ==================== DASHBOARD METRICS ====================

@router.get("/dashboard/metrics")
async def get_dashboard_metrics(db: Session = Depends(get_db)):
    """Get real-time dashboard metrics"""
    metrics = db.query(DashboardMetric).all()

    return {
        "metrics": {
            m.metric_key: {
                "value": m.metric_value,
                "unit": m.metric_unit,
                "label": m.metric_label,
                "category": m.category,
                "time_window": m.time_window,
                "updated_at": m.updated_at.isoformat() if m.updated_at else None
            }
            for m in metrics
        }
    }


@router.get("/dashboard/summary")
async def get_dashboard_summary(db: Session = Depends(get_db)):
    """Get a complete dashboard summary with AI Employee status and recent reports"""
    # Get all employees
    employees = db.query(AIEmployee).all()

    # Get today's reports
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    # Aggregate metrics
    total_tasks_today = 0
    total_errors_today = 0

    employee_summaries = []
    for emp in employees:
        # Get today's reports for this employee
        reports_today = db.query(AIEmployeeHourlyReport).filter(
            AIEmployeeHourlyReport.ai_employee_id == emp.id,
            AIEmployeeHourlyReport.report_hour >= today_start
        ).all()

        tasks_today = sum(r.tasks_completed for r in reports_today)
        errors_today = sum(r.tasks_failed for r in reports_today)

        total_tasks_today += tasks_today
        total_errors_today += errors_today

        # Get latest report
        latest_report = db.query(AIEmployeeHourlyReport).filter(
            AIEmployeeHourlyReport.ai_employee_id == emp.id
        ).order_by(AIEmployeeHourlyReport.report_hour.desc()).first()

        employee_summaries.append({
            "employee_id": emp.employee_id,
            "name": emp.name,
            "avatar": emp.avatar,
            "role": emp.role,
            "department": emp.department,
            "is_online": emp.is_online,
            "status": emp.status.value if emp.status else "idle",
            "tasks_today": tasks_today,
            "errors_today": errors_today,
            "success_rate": emp.success_rate,
            "latest_summary": latest_report.summary_text if latest_report else None,
            "has_alerts": bool(latest_report and latest_report.alerts and json.loads(latest_report.alerts))
        })

    return {
        "summary": {
            "total_employees": len(employees),
            "online_employees": len([e for e in employees if e.is_online]),
            "total_tasks_today": total_tasks_today,
            "total_errors_today": total_errors_today,
            "overall_success_rate": (
                (total_tasks_today - total_errors_today) / total_tasks_today * 100
                if total_tasks_today > 0 else 100.0
            )
        },
        "employees": employee_summaries,
        "timestamp": datetime.utcnow().isoformat()
    }
