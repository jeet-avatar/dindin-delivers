#!/usr/bin/env python3
"""Test login endpoint"""
import requests
from urllib.parse import urlencode

API_URL = "http://localhost:3000"

def test_login(email: str, password: str):
    """Test login with credentials"""
    print(f"\n🔐 Testing login for: {email}")
    
    # Prepare form data
    form_data = {
        'username': email,
        'password': password
    }
    
    try:
        # Send login request
        response = requests.post(
            f"{API_URL}/api/auth/login",
            data=form_data,
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Login successful!")
            print(f"   Token: {data['access_token'][:30]}...")
            print(f"   User: {data['user']['full_name']} ({data['user']['email']})")
            return True
        else:
            print(f"❌ Login failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing Invoice Management System Login")
    test_login("admin@invoice.com", "admin123")
