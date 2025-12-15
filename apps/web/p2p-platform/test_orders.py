#!/usr/bin/env python3
"""
End-to-End Order Flow Test Script
Creates test orders for Natraj Cuisine and Tutto Fresco
Simulates the complete order lifecycle from Customer -> Restaurant -> Driver -> Delivery
"""

import requests
import json
import time

BASE_URL = 'http://localhost:3000/api'

def api_call(method, endpoint, data=None):
    """Make API call and return response"""
    url = f"{BASE_URL}{endpoint}"
    try:
        if method == 'GET':
            r = requests.get(url, timeout=30)
        elif method == 'POST':
            r = requests.post(url, json=data, timeout=30)
        elif method == 'PATCH':
            r = requests.patch(url, json=data, timeout=30)
        return r.json() if r.text else {}
    except Exception as e:
        return {'error': str(e)}

def main():
    print('='*60)
    print('STEP 1: Creating/Checking Vendors (Restaurants)')
    print('='*60)

    # Create Natraj Cuisine vendor
    natraj_data = {
        'company_name': 'Natraj Cuisine',
        'restaurant_name': 'Natraj Cuisine',
        'contact_email': 'info@natrajcuisine.com',
        'contact_phone': '949-555-1234',
        'street': '25380 Marguerite Pkwy',
        'city': 'Mission Viejo',
        'state': 'CA',
        'zip_code': '92692',
        'latitude': 33.5958,
        'longitude': -117.6590,
        'cuisine_type': 'Indian',
        'operating_hours': '11:00 AM - 10:00 PM',
        'delivery_available': True,
        'pickup_available': True,
        'average_prep_time': 25,
        'description': 'Authentic Indian cuisine with a modern twist'
    }

    result = api_call('POST', '/vendors/public', natraj_data)
    natraj_id = result.get('vendor_id') or result.get('id')
    print(f"Natraj Cuisine: {result.get('message', 'Created')} - Vendor ID: {natraj_id}")

    # Create Tutto Fresco vendor
    tutto_data = {
        'company_name': 'Tutto Fresco Kitchen & Bar',
        'restaurant_name': 'Tutto Fresco Kitchen & Bar',
        'contact_email': 'info@tuttofresco.com',
        'contact_phone': '949-858-3360',
        'street': '22332 El Paseo',
        'city': 'Rancho Santa Margarita',
        'state': 'CA',
        'zip_code': '92688',
        'latitude': 33.6405,
        'longitude': -117.5931,
        'cuisine_type': 'Italian',
        'operating_hours': '11:00 AM - 10:00 PM',
        'delivery_available': True,
        'pickup_available': True,
        'average_prep_time': 30,
        'description': 'Fresh Italian cuisine with California flair'
    }

    result = api_call('POST', '/vendors/public', tutto_data)
    tutto_id = result.get('vendor_id') or result.get('id')
    print(f"Tutto Fresco: {result.get('message', 'Created')} - Vendor ID: {tutto_id}")

    # Get actual vendor IDs from database
    vendors = api_call('GET', '/vendors')
    for v in vendors if isinstance(vendors, list) else []:
        if 'Natraj' in (v.get('company_name') or ''):
            natraj_id = v['id']
            print(f"Found Natraj with ID: {natraj_id}")
        if 'Tutto' in (v.get('company_name') or ''):
            tutto_id = v['id']
            print(f"Found Tutto Fresco with ID: {tutto_id}")

    print('\n' + '='*60)
    print('STEP 2: Approving Vendors')
    print('='*60)

    # Approve vendors
    for vid in [natraj_id, tutto_id]:
        if vid:
            result = api_call('PATCH', f'/vendors/{vid}', {'onboarding_status': 'approved'})
            print(f"Approved vendor {vid}: {result}")

    print('\n' + '='*60)
    print('STEP 3: Adding Menu Items')
    print('='*60)

    # Add menu items for Natraj
    natraj_menu = [
        {'item_name': 'Chicken Tikka Masala', 'description': 'Tender chicken in rich tomato cream sauce', 'price': 18.99, 'category': 'Main Course', 'in_stock': True},
        {'item_name': 'Butter Chicken', 'description': 'Creamy tomato-based curry with tender chicken', 'price': 17.99, 'category': 'Main Course', 'in_stock': True},
        {'item_name': 'Lamb Biryani', 'description': 'Fragrant basmati rice with spiced lamb', 'price': 21.99, 'category': 'Rice Dishes', 'in_stock': True},
        {'item_name': 'Vegetable Samosas (2pc)', 'description': 'Crispy pastries filled with spiced potatoes', 'price': 7.99, 'category': 'Appetizers', 'in_stock': True},
        {'item_name': 'Garlic Naan', 'description': 'Fresh baked bread with garlic butter', 'price': 4.99, 'category': 'Bread', 'in_stock': True},
        {'item_name': 'Mango Lassi', 'description': 'Sweet yogurt drink with mango', 'price': 5.99, 'category': 'Beverages', 'in_stock': True}
    ]

    natraj_item_ids = []
    if natraj_id:
        for item in natraj_menu:
            item['vendor_id'] = natraj_id
            result = api_call('POST', f'/vendors/{natraj_id}/menu', item)
            item_id = result.get('id')
            if item_id:
                natraj_item_ids.append(item_id)
            print(f"Added {item['item_name']}: ID {item_id}")

    # Add menu items for Tutto Fresco
    tutto_menu = [
        {'item_name': 'Margherita Pizza', 'description': 'Fresh mozzarella, tomatoes, basil', 'price': 16.99, 'category': 'Pizza', 'in_stock': True},
        {'item_name': 'Fettuccine Alfredo', 'description': 'Creamy parmesan sauce with fettuccine', 'price': 17.99, 'category': 'Pasta', 'in_stock': True},
        {'item_name': 'Chicken Parmigiana', 'description': 'Breaded chicken with marinara and cheese', 'price': 22.99, 'category': 'Main Course', 'in_stock': True},
        {'item_name': 'Bruschetta', 'description': 'Toasted bread with tomatoes and basil', 'price': 9.99, 'category': 'Appetizers', 'in_stock': True},
        {'item_name': 'Tiramisu', 'description': 'Classic Italian coffee dessert', 'price': 10.99, 'category': 'Desserts', 'in_stock': True},
        {'item_name': 'Italian Soda', 'description': 'Sparkling water with flavor syrup', 'price': 4.99, 'category': 'Beverages', 'in_stock': True}
    ]

    tutto_item_ids = []
    if tutto_id:
        for item in tutto_menu:
            item['vendor_id'] = tutto_id
            result = api_call('POST', f'/vendors/{tutto_id}/menu', item)
            item_id = result.get('id')
            if item_id:
                tutto_item_ids.append(item_id)
            print(f"Added {item['item_name']}: ID {item_id}")

    print('\n' + '='*60)
    print('STEP 4: Creating Test Driver')
    print('='*60)

    driver_data = {
        'email': 'driver@dollorai.com',
        'password': 'driver123',
        'first_name': 'Alex',
        'last_name': 'Driver',
        'phone': '949-555-7890'
    }

    result = api_call('POST', '/auth/driver/register', driver_data)
    driver_id = result.get('driver_id')
    driver_code = result.get('driver_code')
    print(f"Driver created: {driver_code} - ID: {driver_id}")

    # Get driver ID if exists
    if not driver_id:
        # Try form-encoded login
        try:
            r = requests.post(f"{BASE_URL}/auth/driver/login",
                            data={'username': 'driver@dollorai.com', 'password': 'driver123'},
                            headers={'Content-Type': 'application/x-www-form-urlencoded'})
            login_result = r.json()
            driver_id = login_result.get('driver_id')
            print(f"Driver logged in: ID {driver_id}")
        except:
            pass

    print('\n' + '='*60)
    print('STEP 5: Creating Test Orders')
    print('='*60)

    order1_id = None
    order2_id = None

    # Order 1: Natraj Cuisine
    if natraj_id:
        order1_data = {
            'vendor_id': natraj_id,
            'customer_name': 'John Smith',
            'customer_email': 'john@example.com',
            'customer_phone': '949-555-1111',
            'delivery_address': {
                'street': '123 Main Street',
                'city': 'Irvine',
                'state': 'CA',
                'zip': '92618'
            },
            'delivery_instructions': 'Ring doorbell, leave at door',
            'items': [
                {'menu_item_id': natraj_item_ids[0] if natraj_item_ids else 1, 'quantity': 1, 'name': 'Chicken Tikka Masala', 'price': 18.99},
                {'menu_item_id': natraj_item_ids[4] if len(natraj_item_ids) > 4 else 5, 'quantity': 2, 'name': 'Garlic Naan', 'price': 4.99}
            ],
            'tip': 5.00
        }
        result1 = api_call('POST', '/erp/orders/create', order1_data)
        print(f"\nOrder 1 (Natraj):")
        print(json.dumps(result1, indent=2))
        order1_id = result1.get('order_id')

    # Order 2: Tutto Fresco
    if tutto_id:
        order2_data = {
            'vendor_id': tutto_id,
            'customer_name': 'Sarah Johnson',
            'customer_email': 'sarah@example.com',
            'customer_phone': '949-555-2222',
            'delivery_address': {
                'street': '456 Oak Avenue',
                'city': 'Lake Forest',
                'state': 'CA',
                'zip': '92630'
            },
            'delivery_instructions': 'Apartment 205, buzz #205',
            'items': [
                {'menu_item_id': tutto_item_ids[0] if tutto_item_ids else 1, 'quantity': 1, 'name': 'Margherita Pizza', 'price': 16.99},
                {'menu_item_id': tutto_item_ids[4] if len(tutto_item_ids) > 4 else 5, 'quantity': 1, 'name': 'Tiramisu', 'price': 10.99}
            ],
            'tip': 4.00
        }
        result2 = api_call('POST', '/erp/orders/create', order2_data)
        print(f"\nOrder 2 (Tutto Fresco):")
        print(json.dumps(result2, indent=2))
        order2_id = result2.get('order_id')

    order_ids = [oid for oid in [order1_id, order2_id] if oid]

    print('\n' + '='*60)
    print('STEP 6: Simulating Payment Confirmation')
    print('='*60)

    for oid in order_ids:
        result = api_call('POST', f'/erp/orders/{oid}/confirm-payment', {})
        print(f"Payment confirmed for order {oid}: {result.get('status', result)}")

    print('\n' + '='*60)
    print('STEP 7: Restaurant Accepts Orders')
    print('='*60)

    for oid in order_ids:
        result = api_call('POST', f'/erp/orders/{oid}/start-preparing', {})
        print(f"Order {oid} being prepared: {result.get('status', result)}")
        time.sleep(0.5)
        result = api_call('POST', f'/erp/orders/{oid}/ready-for-pickup', {})
        print(f"Order {oid} ready for pickup: {result.get('status', result)}")

    print('\n' + '='*60)
    print('STEP 8: Driver Accepts Deliveries')
    print('='*60)

    if driver_id:
        for oid in order_ids:
            result = api_call('POST', f'/erp/orders/{oid}/assign-driver', {'driver_id': driver_id})
            print(f"Driver assigned to order {oid}: {result.get('status', result)}")
    else:
        print("No driver available - skipping driver assignment")

    print('\n' + '='*60)
    print('STEP 9: Driver Picks Up Orders')
    print('='*60)

    for oid in order_ids:
        result = api_call('POST', f'/erp/orders/{oid}/picked-up', {})
        print(f"Order {oid} picked up: {result.get('status', result)}")

    print('\n' + '='*60)
    print('STEP 10: Driver Delivers Orders')
    print('='*60)

    for oid in order_ids:
        result = api_call('POST', f'/erp/orders/{oid}/delivered', {})
        print(f"Order {oid} delivered: {result.get('status', result)}")

    print('\n' + '='*60)
    print('STEP 11: Final Order Status')
    print('='*60)

    orders = api_call('GET', '/orders?limit=10')
    if isinstance(orders, list):
        for o in orders[-5:]:
            print(f"Order {o.get('order_number')}: {o.get('status')} - Total: ${o.get('total_amount', 0):.2f}")
    else:
        print(f"Orders response: {orders}")

    print('\n' + '='*60)
    print('STEP 12: Payment/Payout Records')
    print('='*60)

    payouts = api_call('GET', '/vendor-payouts')
    if isinstance(payouts, list) and payouts:
        for p in payouts:
            print(f"Payout {p.get('id')}: Vendor {p.get('vendor_id')} - Amount ${p.get('net_payout', 0):.2f} - Status: {p.get('status')}")
    else:
        print("No payouts recorded yet (will be generated after order completion)")

    print('\n' + '='*60)
    print('COMPLETE: End-to-End Order Flow Executed')
    print('='*60)

    return {
        'natraj_id': natraj_id,
        'tutto_id': tutto_id,
        'driver_id': driver_id,
        'order1_id': order1_id,
        'order2_id': order2_id
    }

if __name__ == '__main__':
    main()
