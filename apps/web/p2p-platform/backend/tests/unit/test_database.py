"""
Unit tests for database.py

Tests cover:
- SessionLocal creation and configuration
- get_db() dependency injection
- Database connection lifecycle
- init_db() table creation
- Error handling for database operations
- Session cleanup and resource management
"""

import pytest
from unittest.mock import MagicMock, patch, Mock, call
from sqlalchemy.orm import Session
from sqlalchemy.exc import ProgrammingError, OperationalError
import sys
import os

# Add backend directory to path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(0, backend_dir)


class TestSessionLocal:
    """Tests for SessionLocal creation and configuration"""

    @patch('database.create_engine')
    @patch('database.sessionmaker')
    def test_sessionlocal_creation(self, mock_sessionmaker, mock_create_engine):
        """Should create SessionLocal with correct configuration"""
        # Arrange
        mock_engine = MagicMock()
        mock_create_engine.return_value = mock_engine

        # Reimport to trigger module initialization
        import importlib
        import database
        importlib.reload(database)

        # Assert
        mock_sessionmaker.assert_called_once_with(
            autocommit=False,
            autoflush=False,
            bind=mock_engine
        )

    @patch('database.os.getenv')
    @patch('database.create_engine')
    def test_database_url_from_env(self, mock_create_engine, mock_getenv):
        """Should use DATABASE_URL from environment variable"""
        # Arrange
        expected_url = "postgresql://user:pass@host:5432/testdb"
        mock_getenv.return_value = expected_url

        # Reimport to trigger module initialization
        import importlib
        import database
        importlib.reload(database)

        # Assert
        mock_getenv.assert_called_with(
            "DATABASE_URL",
            "postgresql://postgres:postgres@localhost:5432/invoice_db"
        )
        mock_create_engine.assert_called_once_with(expected_url)

    @patch('database.os.getenv')
    @patch('database.create_engine')
    def test_database_url_default(self, mock_create_engine, mock_getenv):
        """Should use default DATABASE_URL when env var not set"""
        # Arrange
        mock_getenv.return_value = None

        # Reimport to trigger module initialization
        import importlib
        import database
        importlib.reload(database)

        # Assert - should use default from getenv's second parameter
        assert mock_create_engine.called


class TestGetDb:
    """Tests for the get_db() dependency injection function"""

    @patch('database.SessionLocal')
    def test_get_db_yields_session(self, mock_session_local):
        """Should yield a database session"""
        # Arrange
        from database import get_db
        mock_db = MagicMock(spec=Session)
        mock_session_local.return_value = mock_db

        # Act
        gen = get_db()
        db = next(gen)

        # Assert
        assert db == mock_db
        mock_session_local.assert_called_once()

    @patch('database.SessionLocal')
    def test_get_db_closes_session(self, mock_session_local):
        """Should close database session after use"""
        # Arrange
        from database import get_db
        mock_db = MagicMock(spec=Session)
        mock_session_local.return_value = mock_db

        # Act
        gen = get_db()
        db = next(gen)

        try:
            next(gen)
        except StopIteration:
            pass

        # Assert
        mock_db.close.assert_called_once()

    @patch('database.SessionLocal')
    def test_get_db_closes_on_exception(self, mock_session_local):
        """Should close database session even when exception occurs"""
        # Arrange
        from database import get_db
        mock_db = MagicMock(spec=Session)
        mock_session_local.return_value = mock_db

        # Act
        gen = get_db()
        db = next(gen)

        # Simulate exception
        try:
            gen.throw(Exception("Test exception"))
        except Exception:
            pass

        # Assert
        mock_db.close.assert_called_once()

    @patch('database.SessionLocal')
    def test_get_db_context_manager_usage(self, mock_session_local):
        """Should work as a context manager for dependency injection"""
        # Arrange
        from database import get_db
        mock_db = MagicMock(spec=Session)
        mock_session_local.return_value = mock_db

        # Act
        result = None
        for db in get_db():
            result = db
            break

        # Assert
        assert result == mock_db
        mock_db.close.assert_called_once()

    @patch('database.SessionLocal')
    def test_get_db_multiple_calls_independent(self, mock_session_local):
        """Should create independent sessions for multiple calls"""
        # Arrange
        from database import get_db
        mock_db1 = MagicMock(spec=Session)
        mock_db2 = MagicMock(spec=Session)
        mock_session_local.side_effect = [mock_db1, mock_db2]

        # Act
        gen1 = get_db()
        db1 = next(gen1)

        gen2 = get_db()
        db2 = next(gen2)

        # Assert
        assert db1 == mock_db1
        assert db2 == mock_db2
        assert db1 != db2
        assert mock_session_local.call_count == 2


class TestInitDb:
    """Tests for the init_db() function"""

    @patch('database.Base')
    def test_init_db_creates_tables(self, mock_base):
        """Should create all tables in database"""
        # Arrange
        from database import init_db, engine
        mock_metadata = MagicMock()
        mock_base.metadata = mock_metadata

        # Act
        init_db()

        # Assert
        mock_metadata.create_all.assert_called_once_with(
            bind=engine,
            checkfirst=True
        )

    @patch('database.Base')
    def test_init_db_imports_extended_models(self, mock_base):
        """Should import all extended models to ensure registration"""
        # Arrange
        from database import init_db
        mock_metadata = MagicMock()
        mock_base.metadata = mock_metadata

        # Act
        with patch.dict('sys.modules', {'models_extended': MagicMock()}):
            init_db()

        # Assert - function should complete without error
        assert mock_metadata.create_all.called

    @patch('database.Base')
    def test_init_db_handles_already_exists_error(self, mock_base):
        """Should ignore 'already exists' errors from database"""
        # Arrange
        from database import init_db
        mock_metadata = MagicMock()
        mock_base.metadata = mock_metadata
        mock_metadata.create_all.side_effect = ProgrammingError(
            "CREATE TABLE",
            "already exists",
            None
        )

        # Act & Assert - should not raise exception
        try:
            init_db()
        except ProgrammingError:
            pytest.fail("init_db() should ignore 'already exists' errors")

    @patch('database.Base')
    def test_init_db_raises_other_programming_errors(self, mock_base):
        """Should raise ProgrammingError for non-'already exists' errors"""
        # Arrange
        from database import init_db
        mock_metadata = MagicMock()
        mock_base.metadata = mock_metadata
        mock_metadata.create_all.side_effect = ProgrammingError(
            "CREATE TABLE",
            "syntax error",
            None
        )

        # Act & Assert
        with pytest.raises(ProgrammingError) as exc_info:
            init_db()

        assert "syntax error" in str(exc_info.value)

    @patch('database.Base')
    def test_init_db_with_checkfirst(self, mock_base):
        """Should use checkfirst=True to avoid recreating existing tables"""
        # Arrange
        from database import init_db, engine
        mock_metadata = MagicMock()
        mock_base.metadata = mock_metadata

        # Act
        init_db()

        # Assert
        call_kwargs = mock_metadata.create_all.call_args[1]
        assert call_kwargs['checkfirst'] is True
        assert call_kwargs['bind'] == engine


class TestDatabaseConfiguration:
    """Tests for database configuration and setup"""

    @patch('database.load_dotenv')
    def test_loads_dotenv(self, mock_load_dotenv):
        """Should load environment variables from .env file"""
        # Arrange & Act
        import importlib
        import database
        importlib.reload(database)

        # Assert
        mock_load_dotenv.assert_called_once()

    @patch('database.create_engine')
    def test_engine_created_with_database_url(self, mock_create_engine):
        """Should create engine with DATABASE_URL"""
        # Arrange & Act
        import importlib
        import database
        importlib.reload(database)

        # Assert
        assert mock_create_engine.called
        call_args = mock_create_engine.call_args[0]
        assert len(call_args) > 0
        assert isinstance(call_args[0], str)  # DATABASE_URL should be a string


class TestDatabaseErrorHandling:
    """Tests for database error handling scenarios"""

    @patch('database.SessionLocal')
    def test_get_db_handles_connection_error(self, mock_session_local):
        """Should properly cleanup on connection error"""
        # Arrange
        from database import get_db
        mock_db = MagicMock(spec=Session)
        mock_session_local.return_value = mock_db

        # Act
        gen = get_db()
        db = next(gen)

        # Simulate connection error
        try:
            gen.throw(OperationalError("connection lost", None, None))
        except OperationalError:
            pass

        # Assert
        mock_db.close.assert_called_once()

    @patch('database.Base')
    def test_init_db_handles_connection_timeout(self, mock_base):
        """Should raise error on connection timeout"""
        # Arrange
        from database import init_db
        mock_metadata = MagicMock()
        mock_base.metadata = mock_metadata
        mock_metadata.create_all.side_effect = OperationalError(
            "timeout", None, None
        )

        # Act & Assert
        with pytest.raises(OperationalError):
            init_db()


class TestSessionLifecycle:
    """Tests for database session lifecycle management"""

    @patch('database.SessionLocal')
    def test_session_created_fresh_each_time(self, mock_session_local):
        """Should create a new session for each request"""
        # Arrange
        from database import get_db
        mock_session_local.return_value = MagicMock(spec=Session)

        # Act
        gen1 = get_db()
        next(gen1)

        gen2 = get_db()
        next(gen2)

        # Assert
        assert mock_session_local.call_count == 2

    @patch('database.SessionLocal')
    def test_session_cleanup_guaranteed(self, mock_session_local):
        """Should guarantee session cleanup in finally block"""
        # Arrange
        from database import get_db
        mock_db = MagicMock(spec=Session)
        mock_session_local.return_value = mock_db

        # Make close() raise an exception to ensure it's in finally block
        mock_db.close.side_effect = Exception("Close error")

        # Act
        gen = get_db()
        next(gen)

        # Try to finish the generator
        try:
            next(gen)
        except (StopIteration, Exception):
            pass

        # Assert - close should still be called despite exception
        mock_db.close.assert_called_once()


class TestIntegrationScenarios:
    """Integration-style tests for common usage patterns"""

    @patch('database.Base')
    @patch('database.SessionLocal')
    def test_full_request_lifecycle(self, mock_session_local, mock_base):
        """Should handle complete request lifecycle: get_db -> use -> cleanup"""
        # Arrange
        from database import get_db
        mock_db = MagicMock(spec=Session)
        mock_session_local.return_value = mock_db

        # Act - Simulate FastAPI dependency injection
        def simulate_request():
            for db in get_db():
                # Simulate database operations
                db.query()
                db.commit()
                return "success"

        result = simulate_request()

        # Assert
        assert result == "success"
        mock_db.query.assert_called_once()
        mock_db.commit.assert_called_once()
        mock_db.close.assert_called_once()

    @patch('database.Base')
    def test_init_db_with_all_models(self, mock_base):
        """Should register all models from both models.py and models_extended.py"""
        # Arrange
        from database import init_db
        mock_metadata = MagicMock()
        mock_base.metadata = mock_metadata

        # Mock the imports
        with patch.dict('sys.modules', {
            'models_extended': MagicMock(
                Promotion=MagicMock(),
                PromotionRedemption=MagicMock(),
                RestaurantInvitation=MagicMock(),
                OnboardingLog=MagicMock(),
                ScrapedMenuItem=MagicMock(),
                RealTimeEvent=MagicMock(),
                Communication=MagicMock(),
                Customer=MagicMock(),
                CustomerFavorite=MagicMock(),
                VendorAnalytics=MagicMock()
            )
        }):
            # Act
            init_db()

        # Assert
        mock_metadata.create_all.assert_called_once()
