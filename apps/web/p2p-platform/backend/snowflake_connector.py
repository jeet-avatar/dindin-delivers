import os
import snowflake.connector
from dotenv import load_dotenv
import time
import redis
import json
from decimal import Decimal
from datetime import datetime, date

load_dotenv()

# Custom JSON Encoder for Decimal and datetime objects
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, date):
            return obj.isoformat()
        return json.JSONEncoder.default(self, obj)

# Initialize Redis client - NO localhost defaults for staging/production
REDIS_HOST = os.getenv("REDIS_HOST", "")  # Must be configured via env var
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))
REDIS_CACHE_EXPIRY = int(os.getenv("REDIS_CACHE_EXPIRY", 300)) # 5 minutes

try:
    redis_client = redis.StrictRedis(host=REDIS_HOST, port=REDIS_PORT, db=REDIS_DB, decode_responses=True)
    redis_client.ping()
    print("Successfully connected to Redis!")
except redis.exceptions.ConnectionError as e:
    print(f"Could not connect to Redis: {e}")
    redis_client = None

from queries import NETSUITE_TRANSACTIONS_QUERY, COUPA_TRANSACTIONS_QUERY, COUPA_TRANSACTIONS_METRICS, NETSUITE_TRANSACTIONS_METRICS

_snowflake_connection = None

def get_snowflake_connection():
    """
    Establishes a connection to Snowflake using credentials from environment variables,
    or returns an existing active connection. Prioritizes PAT key, then falls back to username/password.
    """
    global _snowflake_connection
    if _snowflake_connection:
        try:
            # Test if the connection is still active
            _snowflake_connection.cursor().execute("SELECT 1").close()
            return _snowflake_connection
        except Exception as e:
            print(f"Existing Snowflake connection is stale or invalid: {e}. Reconnecting...")
            _snowflake_connection = None # Invalidate stale connection

    try:
        # Check for PAT Key Authentication first
        pat_key = os.getenv("SNOWFLAKE_PAT_KEY")

        if pat_key:
            conn = snowflake.connector.connect(
                user=os.getenv("SNOWFLAKE_USER"), # User is still needed
                password=pat_key, # Pass the PAT key as password
                account=os.getenv("SNOWFLAKE_ACCOUNT"),
                warehouse=os.getenv("SNOWFLAKE_WAREHOUSE"),
                database=os.getenv("SNOWFLAKE_DATABASE"),
                schema=os.getenv("SNOWFLAKE_SCHEMA"),
            )
        else:
            # Fallback to username/password if PAT key is not provided
            conn = snowflake.connector.connect(
                user=os.getenv("SNOWFLAKE_USER"),
                password=os.getenv("SNOWFLAKE_PASSWORD"),
                account=os.getenv("SNOWFLAKE_ACCOUNT"),
                warehouse=os.getenv("SNOWFLAKE_WAREHOUSE"),
                database=os.getenv("SNOWFLAKE_DATABASE"),
                schema=os.getenv("SNOWFLAKE_SCHEMA"),
            )
        _snowflake_connection = conn
        return conn
    except Exception as e:
        print(f"Error connecting to Snowflake: {e}")
        return None

def execute_query(query: str, params: tuple = None):
    """
    Executes a given query on Snowflake and returns the results.
    """
    conn = get_snowflake_connection()
    if not conn:
        return []

    try:
        with conn.cursor() as cur:
            print(f"With Parameters: {params}")
            start_time = time.time()
            cur.execute(query, params)
            query_execution_time = time.time() - start_time
            print(f"Snowflake Query Execution Time: {query_execution_time:.4f} seconds")
            
            # Fetch data and column names
            results = cur.fetchall()
            columns = [desc[0] for desc in cur.description]
            
            # Convert to a list of dictionaries
            data = [dict(zip(columns, row)) for row in results]
            return data
    finally:
        # Connection is now managed globally, so we don't close it here.
        # The global connection will be reused.
        pass

def execute_count_query(query: str, params: tuple = None) -> int:
    """
    Executes a given query wrapped in a COUNT(*) and returns the total count.
    """
    conn = get_snowflake_connection()
    if not conn:
        return 0

    try:
        with conn.cursor() as cur:
            # Remove LIMIT and OFFSET from the query for counting
            # Find the last occurrence of "LIMIT" to correctly remove pagination clauses
            limit_keyword_index = query.upper().rfind('LIMIT')
            if limit_keyword_index != -1:
                base_query = query[:limit_keyword_index].strip()
            else:
                base_query = query.strip().rstrip(';') # In case LIMIT/OFFSET are not present

            count_query = f"SELECT COUNT(*) FROM ({base_query}) AS subquery"
            
            # The params for the count query should exclude the last two (limit, offset)
            # Ensure params is not None and has at least 2 elements for slicing
            count_params = params[:-2] if params and len(params) >= 2 else params

            cur.execute(count_query, count_params)
            result = cur.fetchone()
            return result[0] if result else 0
    finally:
        # Connection is now managed globally, so we don't close it here.
        # The global connection will be reused.
        pass

def fetch_coupa_transactions(days_back: int, user_email: str, user_role: int, limit: int = 100, offset: int = 0):
    """Fetches Coupa transactions from Snowflake with Redis caching."""
    cache_key = f"coupa_transactions:{user_email}:{user_role}:{limit}:{offset}"

    if redis_client:
        cached_data = redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)

    transactions_with_total_count = execute_query(COUPA_TRANSACTIONS_QUERY, (days_back, user_email, user_role, limit, offset))
    
    transactions_data = []
    total_count = 0

    if transactions_with_total_count:
        total_count = transactions_with_total_count[0].get("TOTAL_COUNT", 0)
        for row in transactions_with_total_count:
            # Create a new dictionary for each row, excluding the 'TOTAL_COUNT' key
            transaction_row = {k: v for k, v in row.items() if k != "TOTAL_COUNT"}
            transactions_data.append(transaction_row)
    
    response_data = {"data": transactions_data, "total_count": total_count}
    
    if redis_client:
        redis_client.setex(cache_key, REDIS_CACHE_EXPIRY, json.dumps(response_data, cls=DecimalEncoder))

    return response_data

def fetch_netsuite_transactions(days_back: int, user_email: str, user_role: int, limit: int = 100, offset: int = 0):
    """Fetches NetSuite transactions from Snowflake with Redis caching."""
    cache_key = f"netsuite_transactions:{user_email}:{user_role}:{limit}:{offset}"

    if redis_client:
        cached_data = redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)

    transactions_with_total_count = execute_query(NETSUITE_TRANSACTIONS_QUERY, (days_back, user_email, user_role, limit, offset))
    
    transactions_data = []
    total_count = 0

    if transactions_with_total_count:
        total_count = transactions_with_total_count[0].get("TOTAL_COUNT", 0)
        for row in transactions_with_total_count:
            # Create a new dictionary for each row, excluding the 'TOTAL_COUNT' key
            transaction_row = {k: v for k, v in row.items() if k != "TOTAL_COUNT"}
            transactions_data.append(transaction_row)

    response_data = {"data": transactions_data, "total_count": total_count}

    if redis_client:
        redis_client.setex(cache_key, REDIS_CACHE_EXPIRY, json.dumps(response_data, cls=DecimalEncoder))

    return response_data

def fetch_coupa_metrics(days_back: int, user_email: str, user_role: int):
    """Fetches Coupa transaction metrics from Snowflake with Redis caching."""
    cache_key = f"coupa_metrics:{days_back}:{user_email}:{user_role}"

    if redis_client:
        cached_data = redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)

    # Assuming COUPA_TRANSACTIONS_METRICS is a single query that returns one row of metrics
    metrics_data = execute_query(COUPA_TRANSACTIONS_METRICS, (days_back, user_email, user_role))
    
    response_data = metrics_data[0] if metrics_data else {}

    if redis_client:
        redis_client.setex(cache_key, REDIS_CACHE_EXPIRY, json.dumps(response_data, cls=DecimalEncoder))

    return response_data

def fetch_netsuite_metrics(days_back: int, user_email: str, user_role: int):
    """Fetches NetSuite transaction metrics from Snowflake with Redis caching."""
    cache_key = f"netsuite_metrics:{days_back}:{user_email}:{user_role}"

    if redis_client:
        cached_data = redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)

    # Assuming NETSUITE_TRANSACTIONS_METRICS is a single query that returns one row of metrics
    metrics_data = execute_query(NETSUITE_TRANSACTIONS_METRICS, (days_back, user_email, user_role))
    
    response_data = metrics_data[0] if metrics_data else {}

    if redis_client:
        redis_client.setex(cache_key, REDIS_CACHE_EXPIRY, json.dumps(response_data, cls=DecimalEncoder))

    return response_data

def execute_queries_concurrently(queries: list[tuple[str, tuple]]):
    """
    Executes a list of queries concurrently on Snowflake and returns the results.
    """
    conn = get_snowflake_connection()
    if not conn:
        return []

    try:
        with conn.cursor() as cur:
            start_time = time.time()
            query_ids = [cur.execute_async(q, p) for q, p in queries]
            
            # Wait for all queries to finish
            while True:
                all_finished = True
                for qid in query_ids:
                    if conn.is_still_running(conn.get_query_status(qid['queryId'])):
                        all_finished = False
                        break
                if all_finished:
                    break
                time.sleep(0.1)

            query_execution_time = time.time() - start_time
            print(f"Snowflake Concurrent Queries Execution Time: {query_execution_time:.4f} seconds")

            results = []
            for qid in query_ids:
                cur.get_results_from_sfqid(qid['queryId'])
                res = cur.fetchall()
                columns = [desc[0] for desc in cur.description]
                data = [dict(zip(columns, row)) for row in res]
                results.append(data)
            return results
    except Exception as e:
        print(f"Error executing queries on Snowflake: {e}")
        return []
    finally:
        # Connection is now managed globally, so we don't close it here.
        # The global connection will be reused.
        pass
