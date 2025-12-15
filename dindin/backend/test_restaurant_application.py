"""
Test script to verify restaurant application submission
Run this with: python test_restaurant_application.py
"""

import requests
import json

API_URL = "http://localhost:3000/api/vendors/public"

def test_application_submission():
    print("Testing restaurant application submission...")
    print(f"Endpoint: {API_URL}")
    print("-" * 50)
    
    # Test data
    application_data = {
        "company_name": "Test Restaurant",
        "restaurant_name": "Test Restaurant",
        "cuisine_type": "American",
        "contact_name": "John Doe",
        "contact_email": "test@restaurant.com",
        "contact_phone": "(555) 123-4567",
        "street": "123 Main St",
        "city": "San Francisco",
        "state": "CA",
        "zip_code": "94102",
        "operating_hours": json.dumps({
            "monday": "9:00 AM - 10:00 PM",
            "tuesday": "9:00 AM - 10:00 PM",
            "wednesday": "9:00 AM - 10:00 PM",
            "thursday": "9:00 AM - 10:00 PM",
            "friday": "9:00 AM - 11:00 PM",
            "saturday": "9:00 AM - 11:00 PM",
            "sunday": "10:00 AM - 9:00 PM"
        }),
        "seating_capacity": 50,
        "delivery_available": True,
        "pickup_available": True,
        "average_prep_time": 30,
        "notes": "Family-owned restaurant specializing in comfort food"
    }
    
    try:
        print("Sending POST request...")
        response = requests.post(
            API_URL,
            json=application_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            print("\n✅ SUCCESS! Application submitted successfully")
            print(f"Vendor ID: {response.json().get('vendor_id')}")
        else:
            print("\n❌ FAILED! Error submitting application")
            
    except requests.exceptions.ConnectionError:
        print("\n❌ CONNECTION ERROR!")
        print("Backend server is not running at http://localhost:3000")
        print("\nTo start the backend:")
        print("  cd backend")
        print("  uvicorn main_new:app --reload --port 3000")
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        print(f"Error type: {type(e).__name__}")

if __name__ == "__main__":
    test_application_submission()
