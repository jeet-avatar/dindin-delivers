# Menu Service

Dollor.ai microservice for menu item management.

## Overview

The Menu Service handles all menu item operations for restaurants/vendors including CRUD operations, availability management, pricing, customizations, and inventory tracking.

## Port

- **Development**: 8008
- **Production**: 8008

## Error Codes

| Code | Description |
|------|-------------|
| MENU-301 | Menu item not found |
| MENU-302 | No menu items found for update |
| MENU-401 | Daily limit exceeded |

## API Endpoints

### Menu Items

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/menu-items` | Create menu item |
| GET | `/api/menu-items/{id}` | Get menu item by ID |
| PUT | `/api/menu-items/{id}` | Update menu item |
| DELETE | `/api/menu-items/{id}` | Delete menu item |
| GET | `/api/menu-items/search` | Search menu items |
| GET | `/api/menu-items/categories` | Get all categories |

### Vendor Menu

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vendors/{id}/menu` | Get vendor menu with filters |
| GET | `/api/vendors/{id}/menu/stats` | Get menu statistics |
| DELETE | `/api/vendors/{id}/menu` | Delete vendor menu |

### Availability & Inventory

| Method | Endpoint | Description |
|--------|----------|-------------|
| PATCH | `/api/menu-items/{id}/availability` | Toggle availability |
| PATCH | `/api/menu-items/{id}/stock` | Toggle stock status |
| POST | `/api/menu-items/{id}/sold` | Record item sold |

### Pricing

| Method | Endpoint | Description |
|--------|----------|-------------|
| PATCH | `/api/menu-items/{id}/price` | Update item price |
| POST | `/api/vendors/{id}/menu/bulk-price-update` | Bulk update prices |

### Bulk Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/menu-items/bulk-import` | Bulk import menu items |

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/menu-items/reset-daily-counts` | Reset daily sold counts |

## Features

### Menu Item Management
- Complete CRUD operations for menu items
- Rich item details (name, description, category, price)
- Image upload support
- Preparation time and calorie information

### Dietary Filters
- Vegetarian flag
- Vegan flag
- Gluten-free flag
- Spicy indicator with 0-5 scale

### Availability Management
- Toggle item availability on/off
- Stock status tracking
- Automatic unavailability when daily limit reached

### Inventory Tracking
- Daily item limits
- Items sold today counter
- Automatic reset via cron endpoint

### Customizations
- Flexible JSON-based customization system
- Single or multiple choice options
- Required/optional customizations
- Per-option pricing

Example customization:
```json
{
  "name": "Size",
  "type": "single",
  "required": true,
  "options": [
    {"name": "Small", "price": 0.0},
    {"name": "Medium", "price": 2.0},
    {"name": "Large", "price": 4.0}
  ]
}
```

### Category Management
- Group items by category
- Get category statistics
- Filter menu by category

### Price Management
- Individual item price updates
- Bulk price updates by percentage
- Category-specific bulk updates

### Search
- Full-text search in name and description
- Filter by vendor, category, dietary restrictions
- Price range filtering
- Pagination support

### Bulk Operations
- Import multiple items at once
- Delete entire menu or category
- Bulk price adjustments

## Running Locally

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dollor

# Run service
uvicorn main:app --reload --port 8008
```

## Docker

```bash
docker build -t dollor/menu-service .
docker run -p 8008:8008 -e DATABASE_URL=... dollor/menu-service
```

## Database Schema

The service uses the `vendor_menu_items` table with the following structure:

- **Basic Info**: id, vendor_id, item_name, description, category, price
- **Dietary**: is_vegetarian, is_vegan, is_gluten_free, is_spicy, spice_level
- **Availability**: is_available, in_stock
- **Details**: prep_time, calories, image_url
- **Inventory**: daily_limit, items_sold_today
- **Customizations**: JSON field for flexible options
- **Timestamps**: created_at, updated_at

## Example Usage

### Create a Menu Item

```bash
curl -X POST http://localhost:8008/api/menu-items \
  -H "Content-Type: application/json" \
  -d '{
    "vendor_id": 1,
    "item_name": "Margherita Pizza",
    "description": "Classic pizza with tomato and mozzarella",
    "category": "Main Course",
    "price": 12.99,
    "is_vegetarian": true,
    "prep_time": 15,
    "calories": 800,
    "customizations": [
      {
        "name": "Size",
        "type": "single",
        "required": true,
        "options": [
          {"name": "Small", "price": 0.0},
          {"name": "Large", "price": 5.0}
        ]
      }
    ]
  }'
```

### Get Vendor Menu

```bash
curl http://localhost:8008/api/vendors/1/menu?available_only=true&vegetarian=true
```

### Update Price

```bash
curl -X PATCH "http://localhost:8008/api/menu-items/1/price?new_price=14.99"
```

### Search Menu

```bash
curl "http://localhost:8008/api/menu-items/search?search=pizza&available_only=true&max_price=20"
```

### Bulk Import

```bash
curl -X POST http://localhost:8008/api/menu-items/bulk-import \
  -H "Content-Type: application/json" \
  -d '{
    "vendor_id": 1,
    "items": [
      {"item_name": "Pasta", "category": "Main Course", "price": 10.99, ...},
      {"item_name": "Salad", "category": "Appetizers", "price": 6.99, ...}
    ]
  }'
```

## Integration with Other Services

### Restaurant Service
- Menu items are linked to vendors/restaurants via `vendor_id`
- Restaurant service manages vendor profiles

### Order Service
- Order service reads menu items to validate orders
- Menu service records items sold via `/sold` endpoint
- Daily limits prevent over-ordering

### Notification Service
- Menu service can trigger notifications when items go out of stock
- Price change notifications to customers

## Scheduled Tasks

The service requires a daily cron job to reset item counters:

```bash
# Run daily at midnight
0 0 * * * curl -X POST http://menu-service:8008/api/menu-items/reset-daily-counts
```

## Performance Considerations

- Menu queries are indexed by vendor_id, category, and availability flags
- Use `available_only=true` for customer-facing queries
- Bulk operations are optimized for importing large menus
- Consider caching frequently accessed menus

## Security

- All endpoints should be authenticated via API Gateway
- Vendor users can only modify their own menu items
- Admin endpoints require elevated permissions
- Input validation via Pydantic models
