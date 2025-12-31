# Rating Service

Microservice for managing ratings and reviews across the Dollor.ai platform.

## Overview

The Rating Service handles all aspects of ratings and reviews for:
- Food orders
- Drivers (delivery and rideshare)
- Restaurants
- Rides (rideshare)

## Features

- **Multi-Type Ratings**: Support for orders, drivers, restaurants, and rides
- **Star Ratings**: 1-5 star ratings with optional category breakdowns
- **Text Reviews**: Optional review titles and detailed comments
- **Photo Reviews**: Support for photo attachments to reviews
- **Rating Aggregation**: Real-time calculation of average ratings
- **Review Responses**: Allow restaurants/drivers to respond to reviews
- **Helpful Voting**: Users can mark reviews as helpful/not helpful
- **Report System**: Report inappropriate reviews
- **Analytics**: Rating trends and statistics

## Configuration

### Port
- **Service Port**: 8013

### Environment Variables

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dollor
ENVIRONMENT=development
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

## API Endpoints

### Rating Management

#### Create Rating
```http
POST /api/ratings
Content-Type: application/json

{
  "rating_type": "restaurant",
  "rating": 5,
  "reference_id": "REST-123456",
  "customer_id": 1,
  "customer_name": "John Doe",
  "review_title": "Amazing food!",
  "review_text": "Best pizza I've ever had. Fresh ingredients and fast delivery.",
  "photo_urls": ["https://example.com/photo1.jpg"],
  "food_quality": 5,
  "service_quality": 5,
  "is_verified_purchase": true
}
```

#### Get Rating
```http
GET /api/ratings/{rating_id}
```

#### Update Rating
```http
PUT /api/ratings/{rating_id}
Content-Type: application/json

{
  "rating": 4,
  "review_text": "Updated review text"
}
```

#### Delete Rating
```http
DELETE /api/ratings/{rating_id}
```

### Query Ratings

#### Get Ratings with Filters
```http
GET /api/ratings?rating_type=restaurant&reference_id=REST-123456&min_rating=4&limit=20
```

Query Parameters:
- `rating_type`: Filter by type (order, driver, restaurant, ride)
- `reference_id`: Filter by entity ID
- `customer_id`: Filter by customer
- `min_rating`: Minimum star rating (1-5)
- `max_rating`: Maximum star rating (1-5)
- `status`: Filter by status (active, hidden, reported, deleted)
- `limit`: Results per page (max 100)
- `offset`: Pagination offset

#### Get Ratings by Reference
```http
GET /api/ratings/reference/{reference_id}?rating_type=restaurant&limit=50
```

### Review Responses

#### Add Response
```http
POST /api/ratings/{rating_id}/response
Content-Type: application/json

{
  "response_text": "Thank you for your kind review! We're glad you enjoyed your meal.",
  "response_by": "REST-123456"
}
```

#### Update Response
```http
PUT /api/ratings/{rating_id}/response
Content-Type: application/json

{
  "response_text": "Updated response text",
  "response_by": "REST-123456"
}
```

### Helpful Voting

#### Mark as Helpful
```http
POST /api/ratings/{rating_id}/helpful?helpful=true
```

Query Parameters:
- `helpful`: true for helpful, false for not helpful

### Report Reviews

#### Report Review
```http
POST /api/ratings/{rating_id}/report?reported_by=123
Content-Type: application/json

{
  "reason": "spam",
  "description": "This review appears to be spam"
}
```

Reasons:
- `spam`: Spam content
- `offensive`: Offensive language
- `fake`: Fake review
- `inappropriate`: Inappropriate content
- `other`: Other reason

#### Get Reports
```http
GET /api/ratings/{rating_id}/reports
```

### Aggregation

#### Get Aggregate Rating
```http
GET /api/aggregates/{entity_type}/{entity_id}
```

Example:
```http
GET /api/aggregates/restaurant/REST-123456
```

Response:
```json
{
  "entity_type": "restaurant",
  "entity_id": "REST-123456",
  "average_rating": 4.5,
  "total_ratings": 150,
  "star_5_count": 80,
  "star_4_count": 50,
  "star_3_count": 15,
  "star_2_count": 3,
  "star_1_count": 2,
  "avg_food_quality": 4.6,
  "avg_service_quality": 4.4,
  "last_rating_at": "2025-01-15T10:30:00Z"
}
```

#### Refresh Aggregate
```http
POST /api/aggregates/{entity_type}/{entity_id}/refresh
```

### Analytics

#### Get Rating Statistics
```http
GET /api/analytics/ratings/stats?rating_type=restaurant&days=30
```

Query Parameters:
- `rating_type`: Filter by type
- `reference_id`: Filter by reference
- `days`: Number of days to analyze (default: 30, max: 365)

Response:
```json
{
  "period_days": 30,
  "average_rating": 4.3,
  "total_ratings": 245,
  "rating_distribution": {
    "5": 120,
    "4": 80,
    "3": 30,
    "2": 10,
    "1": 5
  },
  "with_reviews": 180,
  "with_photos": 45,
  "average_review_length": 156
}
```

#### Get Trending Reviews
```http
GET /api/analytics/ratings/trending?min_helpful=10&limit=10
```

Query Parameters:
- `rating_type`: Filter by type
- `min_helpful`: Minimum helpful votes
- `limit`: Number of results (max 50)

## Error Codes

All error responses follow the format: `RATE-{CATEGORY}{NUMBER}`

### Validation Errors (1xx)
- `RATE-101`: Invalid rating value
- `RATE-102`: Duplicate rating for same reference

### Not Found Errors (3xx)
- `RATE-301`: Rating not found
- `RATE-302`: Aggregate not found

### Business Logic Errors (4xx)
- `RATE-401`: Cannot update rating after 24 hours
- `RATE-402`: Review already has a response
- `RATE-403`: No response exists to update
- `RATE-404`: Already reported by this user

## Database Schema

### Ratings Table
```sql
CREATE TABLE ratings (
    id SERIAL PRIMARY KEY,
    rating_id VARCHAR(50) UNIQUE,
    rating_type VARCHAR(20) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    reference_id VARCHAR(100) NOT NULL,
    customer_id INTEGER NOT NULL,
    customer_name VARCHAR(200),
    review_text TEXT,
    review_title VARCHAR(200),
    photo_urls TEXT,
    food_quality INTEGER,
    delivery_speed INTEGER,
    service_quality INTEGER,
    cleanliness INTEGER,
    communication INTEGER,
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    response_text TEXT,
    response_by VARCHAR(100),
    response_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Rating Aggregates Table
```sql
CREATE TABLE rating_aggregates (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    average_rating FLOAT DEFAULT 0,
    total_ratings INTEGER DEFAULT 0,
    star_5_count INTEGER DEFAULT 0,
    star_4_count INTEGER DEFAULT 0,
    star_3_count INTEGER DEFAULT 0,
    star_2_count INTEGER DEFAULT 0,
    star_1_count INTEGER DEFAULT 0,
    avg_food_quality FLOAT,
    avg_delivery_speed FLOAT,
    avg_service_quality FLOAT,
    avg_cleanliness FLOAT,
    avg_communication FLOAT,
    last_rating_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(entity_type, entity_id)
);
```

### Review Reports Table
```sql
CREATE TABLE review_reports (
    id SERIAL PRIMARY KEY,
    rating_id INTEGER NOT NULL,
    reported_by INTEGER NOT NULL,
    reason VARCHAR(50) NOT NULL,
    description TEXT,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by VARCHAR(100),
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## Running the Service

### Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run the service
python main.py

# Or with uvicorn
uvicorn main:app --host 0.0.0.0 --port 8013 --reload
```

### Docker

```bash
# Build image
docker build -t dollor/rating-service:latest .

# Run container
docker run -d \
  --name rating-service \
  -p 8013:8013 \
  -e DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/dollor \
  dollor/rating-service:latest
```

### Docker Compose

```yaml
rating-service:
  build: ./services/core/rating-service
  ports:
    - "8013:8013"
  environment:
    DATABASE_URL: postgresql://postgres:postgres@postgres:5432/dollor
    ENVIRONMENT: development
  depends_on:
    - postgres
```

## Health Checks

### Health Endpoint
```http
GET /health
```

Response:
```json
{
  "status": "healthy",
  "service": "rating-service",
  "version": "1.0.0",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### Readiness Endpoint
```http
GET /ready
```

### Liveness Endpoint
```http
GET /alive
```

### Metrics Endpoint
```http
GET /metrics
```

## Testing

```bash
# Run tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test
pytest tests/test_ratings.py::test_create_rating
```

## Integration Examples

### After Order Completion
```python
# In order-service, after order is delivered
import httpx

async def complete_order(order_id: str):
    # ... order completion logic ...

    # Prompt customer to rate
    # Customer submits rating through mobile app or web
    pass
```

### Display Restaurant Rating
```python
# In restaurant-service or frontend
import httpx

async def get_restaurant_with_rating(restaurant_id: str):
    # Get restaurant details
    restaurant = await get_restaurant(restaurant_id)

    # Get aggregated rating
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"http://rating-service:8013/api/aggregates/restaurant/{restaurant_id}"
        )
        rating_data = response.json()

    restaurant["rating"] = rating_data["average_rating"]
    restaurant["total_ratings"] = rating_data["total_ratings"]

    return restaurant
```

### Display Driver Rating
```python
# In driver-service
async def get_driver_with_rating(driver_id: str):
    driver = await get_driver(driver_id)

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"http://rating-service:8013/api/aggregates/driver/{driver_id}"
        )
        rating_data = response.json()

    driver["rating"] = rating_data["average_rating"]
    driver["total_ratings"] = rating_data["total_ratings"]

    return driver
```

## Best Practices

### Rating Guidelines
- Ratings are immutable after 24 hours
- Only verified purchases can leave ratings
- Photos are encouraged for credibility
- Inappropriate reviews can be reported
- Restaurant/driver responses are public

### Moderation
- Reported reviews are automatically hidden
- Admins review flagged content
- Fake reviews are removed
- Offensive content is filtered

### Performance
- Aggregates are updated in real-time
- Use caching for frequently accessed aggregates
- Paginate large result sets
- Index on frequently queried fields

## Architecture

```
┌─────────────────┐
│   Mobile App    │
│   (iOS/Android) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   API Gateway   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│   Rating Service        │
│   Port: 8013            │
├─────────────────────────┤
│ - Create ratings        │
│ - Query reviews         │
│ - Calculate aggregates  │
│ - Handle reports        │
│ - Analytics             │
└────────┬────────────────┘
         │
         ▼
┌─────────────────┐
│   PostgreSQL    │
│   - ratings     │
│   - aggregates  │
│   - reports     │
└─────────────────┘
```

## Monitoring

### Key Metrics
- `ratings_created_total`: Total ratings created
- `ratings_by_type`: Ratings by type (order, driver, restaurant, ride)
- `average_rating_by_entity`: Average rating per entity
- `reports_created_total`: Total reports filed
- `api_request_duration`: API response times

### Logs
All logs are structured JSON with trace context:

```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "level": "INFO",
  "service": "rating-service",
  "message": "Created rating: RATE-123456",
  "rating_type": "restaurant",
  "reference_id": "REST-123456",
  "trace_id": "abc123"
}
```

## Support

For issues or questions:
- GitHub Issues: [Link to repo]
- Internal Slack: #dollor-engineering
- Documentation: [Link to docs]

## License

Proprietary - Dollor.ai Inc.
