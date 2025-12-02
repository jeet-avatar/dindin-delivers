"""
Test End-to-End Order Flow
This script simulates the complete order flow:
1. Customer places order
2. Payment confirmed
3. Restaurant prepares
4. Driver assigned & delivers
5. Accounting entries created
"""

import requests
import time
import json

BASE_URL = "http://localhost:3000/api"

def print_step(step, message):
    print(f"\n{'='*60}")
    print(f"STEP {step}: {message}")
    print('='*60)

def print_response(response):
    try:
        data = response.json()
        print(json.dumps(data, indent=2, default=str))
    except:
        print(response.text)

def main():
    print("\n" + "="*60)
    print("   EATFAIR P2P - END-TO-END ORDER FLOW TEST")
    print("="*60)

    # ==================== STEP 1: Create Test Driver ====================
    print_step(1, "Creating Test Driver")

    driver_response = requests.post(f"{BASE_URL}/erp/drivers/create", json={
        "first_name": "John",
        "last_name": "Driver",
        "email": "john.driver@eatfair.com",
        "phone": "+1234567890"
    })

    if driver_response.status_code == 200:
        driver_data = driver_response.json()
        driver_id = driver_data.get("driver_id")
        print(f"Driver created: ID={driver_id}")
    else:
        print("Using existing driver or creating failed")
        driver_id = 1  # Use ID 1 if creation fails

    # ==================== STEP 2: Create Order ====================
    print_step(2, "Customer Places Order (iOS Customer App)")

    order_response = requests.post(f"{BASE_URL}/erp/orders/create", json={
        "customer_name": "Jane Customer",
        "customer_email": "jane@customer.com",
        "customer_phone": "+1987654321",
        "vendor_id": 6,  # Natraj Restaurant
        "items": [
            {
                "name": "Butter Chicken",
                "quantity": 2,
                "price": 18.99
            },
            {
                "name": "Garlic Naan",
                "quantity": 3,
                "price": 3.99
            },
            {
                "name": "Dal Makhani",
                "quantity": 1,
                "price": 14.99
            }
        ],
        "delivery_address": {
            "street": "123 Main Street",
            "city": "Rancho Santa Margarita",
            "state": "CA",
            "zip": "92688"
        },
        "delivery_instructions": "Ring doorbell twice",
        "tip": 8.00
    })

    print_response(order_response)

    if order_response.status_code != 200:
        print("Error creating order. Make sure a vendor exists with ID 1.")
        print("You may need to run: python init_vendors.py first")
        return

    order_data = order_response.json()
    order_id = order_data.get("order_id")
    order_number = order_data.get("order_number")

    print(f"\nOrder Created: {order_number}")
    print(f"  Subtotal: ${order_data.get('subtotal', 0):.2f}")
    print(f"  Tax: ${order_data.get('tax', 0):.2f}")
    print(f"  Delivery Fee: ${order_data.get('delivery_fee', 0):.2f}")
    print(f"  Tip: ${order_data.get('tip', 0):.2f}")
    print(f"  Platform Fee: ${order_data.get('platform_fee', 0):.2f}")
    print(f"  TOTAL: ${order_data.get('total', 0):.2f}")

    # ==================== STEP 3: Confirm Payment ====================
    print_step(3, "Payment Confirmed (Stripe Webhook)")
    time.sleep(1)

    payment_response = requests.post(f"{BASE_URL}/erp/orders/{order_id}/confirm-payment")
    print_response(payment_response)

    # ==================== STEP 4: Restaurant Prepares ====================
    print_step(4, "Restaurant Starts Preparing (iOS Restaurant App)")
    time.sleep(1)

    prepare_response = requests.post(f"{BASE_URL}/erp/orders/{order_id}/start-preparing")
    print_response(prepare_response)

    # ==================== STEP 5: Order Ready ====================
    print_step(5, "Order Ready for Pickup")
    time.sleep(1)

    ready_response = requests.post(f"{BASE_URL}/erp/orders/{order_id}/ready-for-pickup")
    print_response(ready_response)

    # ==================== STEP 6: Driver Assigned ====================
    print_step(6, "Driver Accepts Order (iOS Driver App)")
    time.sleep(1)

    assign_response = requests.post(f"{BASE_URL}/erp/orders/{order_id}/assign-driver", json={
        "driver_id": driver_id
    })
    print_response(assign_response)

    # ==================== STEP 7: Driver Picks Up ====================
    print_step(7, "Driver Picks Up Order")
    time.sleep(1)

    pickup_response = requests.post(f"{BASE_URL}/erp/orders/{order_id}/picked-up")
    print_response(pickup_response)

    # ==================== STEP 8: Order Delivered ====================
    print_step(8, "Order Delivered - Accounting Created")
    time.sleep(1)

    delivered_response = requests.post(f"{BASE_URL}/erp/orders/{order_id}/delivered")
    delivered_data = delivered_response.json()
    print_response(delivered_response)

    # ==================== STEP 9: View Journal Entries ====================
    print_step(9, "View Journal Entries (P2P Dashboard)")
    time.sleep(1)

    journal_response = requests.get(f"{BASE_URL}/erp/journal-entries?limit=5")
    print_response(journal_response)

    # ==================== STEP 10: View Pending Payouts ====================
    print_step(10, "View Pending Payouts")

    payouts_response = requests.get(f"{BASE_URL}/erp/payouts/pending")
    print_response(payouts_response)

    # ==================== SUMMARY ====================
    print("\n" + "="*60)
    print("   ORDER FLOW COMPLETED SUCCESSFULLY!")
    print("="*60)

    if "accounting" in delivered_data:
        acc = delivered_data["accounting"]
        print(f"""
Order: {order_number}
Status: Delivered

FINANCIAL BREAKDOWN:
  Customer Paid: ${order_data.get('total', 0):.2f}

PAYOUTS TO BE MADE:
  Restaurant Payout: ${acc.get('restaurant_payout', 0):.2f}
  Driver Payout: ${acc.get('driver_payout', 0):.2f} (Delivery + Tip)

PLATFORM REVENUE:
  Platform Fee: ${acc.get('platform_revenue', 0):.2f}
  Tax Collected: ${acc.get('tax_collected', 0):.2f}

Journal Entry: {acc.get('journal_entry', 'N/A')}
""")

    print("\nAI Employees Used:")
    print("  - OrderBot Alpha: Order creation & payment")
    print("  - KitchenBot Beta: Restaurant coordination")
    print("  - DispatchBot Gamma: Driver assignment & delivery")
    print("  - LedgerBot Delta: Accounting & payouts")


if __name__ == "__main__":
    main()
