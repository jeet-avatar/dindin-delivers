import pytest
import uuid
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, Driver
from insurance.models import InsuranceEvent
from insurance.events import log_insurance_event


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


@pytest.fixture
def driver(db_session):
    d = Driver(
        id=1, email="driver@test.com", password_hash="x",
        first_name="Test", last_name="Driver",
        driver_id="DRV-TEST-001",
        current_latitude=40.7128, current_longitude=-74.0060,
    )
    db_session.add(d)
    db_session.commit()
    return d


class TestFullRideshareInsuranceFlow:
    def test_complete_ride_produces_6_events(self, db_session, driver):
        session_id = str(uuid.uuid4())

        # Period 1 START — driver goes online
        log_insurance_event(db=db_session, driver_id=driver.id, trip_type="available",
            trip_id=None, session_id=session_id, period=1, event_type="period_start")
        db_session.commit()

        # Period 1 END + Period 2 START — ride accepted
        log_insurance_event(db=db_session, driver_id=driver.id, trip_type="rideshare",
            trip_id=100, session_id=session_id, period=1, event_type="period_end")
        driver.current_latitude = 40.7150
        db_session.commit()
        log_insurance_event(db=db_session, driver_id=driver.id, trip_type="rideshare",
            trip_id=100, session_id=session_id, period=2, event_type="period_start")
        db_session.commit()

        # Period 2 END + Period 3 START — driver arrived
        driver.current_latitude = 40.7200
        db_session.commit()
        log_insurance_event(db=db_session, driver_id=driver.id, trip_type="rideshare",
            trip_id=100, session_id=session_id, period=2, event_type="period_end")
        log_insurance_event(db=db_session, driver_id=driver.id, trip_type="rideshare",
            trip_id=100, session_id=session_id, period=3, event_type="period_start")
        db_session.commit()

        # Period 3 END — ride complete
        driver.current_latitude = 40.7500
        db_session.commit()
        log_insurance_event(db=db_session, driver_id=driver.id, trip_type="rideshare",
            trip_id=100, session_id=session_id, period=3, event_type="period_end")
        db_session.commit()

        events = db_session.query(InsuranceEvent).filter(
            InsuranceEvent.session_id == session_id,
        ).order_by(InsuranceEvent.timestamp).all()

        assert len(events) == 6
        expected = [(1, "period_start"), (1, "period_end"), (2, "period_start"),
                    (2, "period_end"), (3, "period_start"), (3, "period_end")]
        actual = [(e.period, e.event_type) for e in events]
        assert actual == expected

        # Verify segment_miles on period_end events
        p2_end = [e for e in events if e.period == 2 and e.event_type == "period_end"][0]
        assert p2_end.segment_miles is not None
        assert p2_end.segment_miles > 0

        p3_end = [e for e in events if e.period == 3 and e.event_type == "period_end"][0]
        assert p3_end.odometer_miles is not None
        assert p3_end.odometer_miles >= p2_end.segment_miles


class TestFullDeliveryInsuranceFlow:
    def test_complete_delivery_produces_6_events(self, db_session, driver):
        session_id = str(uuid.uuid4())

        # Period 1 START
        log_insurance_event(db=db_session, driver_id=driver.id, trip_type="available",
            trip_id=None, session_id=session_id, period=1, event_type="period_start")
        db_session.commit()

        # Period 1 END + Period 2 START — driver accepts order
        log_insurance_event(db=db_session, driver_id=driver.id, trip_type="delivery",
            trip_id=200, session_id=session_id, period=1, event_type="period_end")
        log_insurance_event(db=db_session, driver_id=driver.id, trip_type="delivery",
            trip_id=200, session_id=session_id, period=2, event_type="period_start")
        db_session.commit()

        # Period 2 END + Period 3 START — food picked up
        driver.current_latitude = 40.7200
        db_session.commit()
        log_insurance_event(db=db_session, driver_id=driver.id, trip_type="delivery",
            trip_id=200, session_id=session_id, period=2, event_type="period_end")
        log_insurance_event(db=db_session, driver_id=driver.id, trip_type="delivery",
            trip_id=200, session_id=session_id, period=3, event_type="period_start")
        db_session.commit()

        # Period 3 END — delivered
        driver.current_latitude = 40.7400
        db_session.commit()
        log_insurance_event(db=db_session, driver_id=driver.id, trip_type="delivery",
            trip_id=200, session_id=session_id, period=3, event_type="period_end")
        db_session.commit()

        events = db_session.query(InsuranceEvent).filter(
            InsuranceEvent.session_id == session_id,
        ).order_by(InsuranceEvent.timestamp).all()

        assert len(events) == 6
        assert all(e.trip_type in ("available", "delivery") for e in events)
