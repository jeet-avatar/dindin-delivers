import os
import requests
import urllib.parse
from datetime import datetime, timedelta
import random
import time
from jose import jwt
from dotenv import load_dotenv
from fastapi import FastAPI, Request, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

import httpx

from postgres_connector import get_user_role

load_dotenv()

app = FastAPI()

# --- Okta Settings ---
OKTA_CLIENT_ID = os.getenv("OKTA_CLIENT_ID")
OKTA_CLIENT_SECRET = os.getenv("OKTA_CLIENT_SECRET")
OKTA_DOMAIN = os.getenv("OKTA_DOMAIN")
FRONTEND_URL = os.getenv("FRONTEND_URL")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],  # Allow only the frontend origin
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

REDIRECT_URI = os.getenv("REDIRECT_URI", "https://dollor.ai/auth/callback")
AUTHORIZATION_URL = f"https://{OKTA_DOMAIN}/oauth2/default/v1/authorize"
TOKEN_URL = f"https://{OKTA_DOMAIN}/oauth2/default/v1/token"
USERINFO_URL = f"https://{OKTA_DOMAIN}/oauth2/default/v1/userinfo"
JWKS_URL = f"https://{OKTA_DOMAIN}/oauth2/default/v1/keys"

# --- Authentication ---

jwks_cache = {}
USER_ROLE_CACHE = {}
CACHE_TTL = timedelta(minutes=15)

async def get_jwks():
    global jwks_cache
    if not jwks_cache:
        async with httpx.AsyncClient() as client:
            response = await client.get(JWKS_URL)
            response.raise_for_status()
            jwks_data = response.json()
            jwks_cache = {key['kid']: key for key in jwks_data['keys']}
    return jwks_cache

async def get_current_user_from_token(request: Request):

    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    token = auth_header.split(" ")[1]
    try:
        # Get the key ID from the token header
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")

        # Fetch JWKS if not cached or kid not found
        jwks = await get_jwks()
        if kid not in jwks:
            # Refetch keys in case of rotation
            global jwks_cache
            jwks_cache = {}
            jwks = await get_jwks()

        if kid not in jwks:
            raise HTTPException(status_code=401, detail="Public key not found")

        # Get the appropriate key and decode the token
        public_key = jwks[kid]
        
        # Disable at_hash verification since we don't have the access token here
        options = {"verify_at_hash": False}

        claims = jwt.decode(
            token,
            public_key,
            algorithms=['RS256'],
            audience=OKTA_CLIENT_ID,
            issuer=f"https://{OKTA_DOMAIN}/oauth2/default",
            options=options
        )
        return claims

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTClaimsError as e:
        raise HTTPException(status_code=401, detail=f"Invalid claims: {e}")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

async def get_current_user_with_role(current_user: dict = Depends(get_current_user_from_token)):
    user_email = current_user.get("email")
    if not user_email:
        raise HTTPException(status_code=401, detail="User email not found in token")

    # Check cache first
    cached_role = USER_ROLE_CACHE.get(user_email)
    if cached_role and (datetime.now() - cached_role['timestamp']) < CACHE_TTL:
        current_user['role'] = cached_role['role']
        return current_user

    # If not in cache or expired, fetch from DB
    role = get_user_role(user_email)
    if not role:
        role = "Non-Admin" # Default role

    # Update cache
    USER_ROLE_CACHE[user_email] = {'role': role, 'timestamp': datetime.now()}
    
    current_user['role'] = role
    return current_user


@app.get("/login")
async def login():
    params = {
        "client_id": OKTA_CLIENT_ID,
        "response_type": "code",
        "scope": "openid profile email",
        "redirect_uri": REDIRECT_URI,
        "state": "random_state_string" # Should be a random, non-guessable string
    }
    url = f"{AUTHORIZATION_URL}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url=url)

@app.get("/auth/callback")
async def auth_callback(request: Request):
    code = request.query_params.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")

    token_data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI,
        "client_id": OKTA_CLIENT_ID,
        "client_secret": OKTA_CLIENT_SECRET,
    }
    headers = {"Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded"}
    
    async with httpx.AsyncClient() as client:
        res = await client.post(TOKEN_URL, data=token_data, headers=headers)
        res.raise_for_status()
        token_response = res.json()

    id_token = token_response.get("id_token")
    access_token = token_response.get("access_token")

    # Redirect to frontend with tokens
    redirect_url = f"{FRONTEND_URL}/login/callback?id_token={id_token}&access_token={access_token}"
    return RedirectResponse(url=redirect_url)


# --- Dummy Data ---

def format_date(date):
    return date.strftime("%Y-%m-%d")

def format_datetime(date):
    return date.strftime("%Y-%m-%d %H:%M")

documents = [
  {
    "id": "doc-1",
    "name": "W-9 Tax Form",
    "type": "tax",
    "uploadDate": format_date(datetime.now() - timedelta(days=120)),
    "expiryDate": format_date(datetime.now() + timedelta(days=245)),
    "status": "valid",
    "fileUrl": "#"
  },
  {
    "id": "doc-2",
    "name": "Liability Insurance",
    "type": "compliance",
    "uploadDate": format_date(datetime.now() - timedelta(days=45)),
    "expiryDate": format_date(datetime.now() + timedelta(days=15)),
    "status": "expiring",
    "fileUrl": "#"
  },
]

transactions = [
  {
    "id": "trx-1",
    "type": "invoice",
    "number": "INV-2023-0042",
    "date": format_date(datetime.now() - timedelta(days=5)),
    "dueDate": format_date(datetime.now() + timedelta(days=25)),
    "amount": 12450.75,
    "status": "pending_approval",
    "description": "Monthly food supply - April"
  },
  {
    "id": "trx-2",
    "type": "purchase_order",
    "number": "PO-2023-0089",
    "date": format_date(datetime.now() - timedelta(days=12)),
    "amount": 8750.00,
    "status": "approved",
    "description": "Packaging materials - Q2"
  },
]

activity_items = [
  {
    "id": "act-1",
    "type": "transaction",
    "action": "created",
    "date": format_datetime(datetime.now() - timedelta(days=1)),
    "user": "Jithesh M",
    "description": "Created invoice INV-2023-0042",
    "status": "pending_approval",
    "entityId": "trx-1"
  },
  {
    "id": "act-2",
    "type": "document",
    "action": "uploaded",
    "date": format_datetime(datetime.now() - timedelta(days=2)),
    "user": "Sarah Miller",
    "description": "Uploaded new Security Policy",
    "entityId": "doc-3"
  },
  {
    "id": "act-3",
    "type": "transaction",
    "action": "approved",
    "date": format_datetime(datetime.now() - timedelta(days=3)),
    "user": "Admin",
    "description": "Approved PO-2023-0089",
    "status": "approved",
    "entityId": "trx-2"
  },
  {
    "id": "act-4",
    "type": "vendor",
    "action": "onboarded",
    "date": format_datetime(datetime.now() - timedelta(days=4)),
    "user": "Admin",
    "description": "Onboarded new vendor Tech Solutions Inc.",
    "entityId": "vendor-001"
  },
  {
    "id": "act-5",
    "type": "document",
    "action": "expiring",
    "date": format_datetime(datetime.now() - timedelta(days=5)),
    "user": "System",
    "description": "Liability Insurance is expiring soon",
    "entityId": "doc-2"
  },
]

kpis = [
  {
    "id": "kpi-1",
    "title": "Invoices Pending",
    "value": 3,
    "change": 1,
    "trend": "up",
    "period": "vs last month"
  },
  {
    "id": "kpi-2",
    "title": "POs Received",
    "value": 12,
    "change": 4,
    "trend": "up",
    "period": "vs last month"
  },
]

vendors = [
    {
      "id": 'vendor-001',
      "companyName": 'Tech Solutions Inc.',
      "taxId": '12-3456789',
      "businessType": 'Corporation',
      "industry": 'Technology',
      "website": 'https://techsolutions.com',
      "primaryContact": {
        "name": 'John Smith',
        "email": 'john.smith@techsolutions.com',
        "phone": '(555) 123-4567',
        "title": 'VP of Sales'
      },
      "address": {
        "street": '123 Tech Street',
        "city": 'San Francisco',
        "state": 'CA',
        "zip": '94105',
        "country": 'US'
      },
      "onboardingStatus": 'approved',
      "onboardingPhase": 'completed',
      "riskRating": 'low',
      "performanceScore": 95,
      "contractStatus": 'active',
      "lastActivity": '2024-03-15',
      "createdDate": '2024-01-15',
      "approvedDate": '2024-02-01',
      "zipStatus": 'approved',
      "requiredDocuments": {
        "w9Form": True,
        "insurance": True,
        "financialStatements": True,
        "complianceCerts": True,
        "securityPolicy": True
      }
    },
]

system_dashboard_data = {
    "process-unity": {
        "openAssessments": 28,
        "pendingReviews": 15,
        "completedAssessments": 45,
        "riskScore": 85,
        "monthlyTrends": {
          "labels": ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          "datasets": [{'label': 'Assessment Volume', "data": [35, 42, 38, 45, 52, 48]}]
        },
        "riskDistribution": {
          "labels": ['High Risk', 'Medium Risk', 'Low Risk', 'Negligible'],
          "datasets": [{"data": [15, 30, 40, 15]}]
        }
    },
    "coupa": {
        "openRequisitions": 12,
        "pendingApprovals": 5,
        "approvedInvoices": 30,
        "spendLast30Days": 120000,
        "topCategories": {
            "labels": ["Software", "Hardware", "Marketing", "Office Supplies"],
            "datasets": [{"data": [45000, 35000, 25000, 15000]}]
        },
        "invoiceApprovalCycleTime": {
            "labels": ["<1 Day", "1-3 Days", "3-7 Days", ">7 Days"],
            "datasets": [{"data": [60, 25, 10, 5]}]
        }
    },
    "netsuite": {
        "openSOs": 15,
        "pendingFulfillment": 8,
        "invoicesDue": 20,
        "revenueYTD": 2500000,
        "revenueBySubsidiary": {
            "labels": ["Subsidiary A", "Subsidiary B", "Subsidiary C"],
            "datasets": [{"data": [1200000, 800000, 500000]}]
        },
        "daysSalesOutstanding": {
            "labels": ["Q1", "Q2", "Q3", "Q4"],
            "datasets": [{"data": [45, 42, 48, 46]}]
        }
    },
    "zip": {
        "pendingRequests": 18,
        "approvedRequests": 50,
        "newVendors": 5,
        "spendUnderManagement": 500000,
        "requestApprovalTime": {
            "labels": ["<1 Day", "1-3 Days", "3-7 Days", ">7 Days"],
            "datasets": [{"data": [70, 20, 8, 2]}]
        },
        "spendByCategory": {
            "labels": ["IT", "Marketing", "Facilities", "Professional Services"],
            "datasets": [{"data": [150000, 120000, 80000, 150000]}]
        }
    },
    "jira": {
        "openTickets": 45,
        "highPriorityTickets": 10,
        "resolvedToday": 15,
        "averageResolutionTime": 4.5,
        "ticketVolume": {
            "labels": ["Mon", "Tue", "Wed", "Thu", "Fri"],
            "datasets": [{"label": "New Tickets", "data": [20, 25, 18, 22, 30]}]
        },
        "ticketsByStatus": {
            "labels": ["To Do", "In Progress", "In Review", "Done"],
            "datasets": [{"data": [45, 25, 15, 150]}]
        }
    },
    "netsuite-wolt": {
        "openOrders": 10,
        "pendingSync": 2,
        "syncedOrders": 150,
        "syncErrors": 1,
        "orderSyncTime": {
            "labels": ["<5 min", "5-15 min", ">15 min"],
            "datasets": [{"data": [80, 15, 5]}]
        },
        "errorTypes": {
            "labels": ["Invalid SKU", "Address Mismatch", "Inventory Error"],
            "datasets": [{"data": [40, 30, 30]}]
        }
    }
}


# --- API Endpoints ---

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.get("/api/me")
def get_current_user(current_user: dict = Depends(get_current_user_with_role)):
    return current_user

@app.get("/api/kpis")
def get_kpis(current_user: dict = Depends(get_current_user_with_role)):
    return kpis

@app.get("/api/documents")
def get_documents(current_user: dict = Depends(get_current_user_with_role)):
    return documents

@app.get("/api/transactions")
def get_transactions(current_user: dict = Depends(get_current_user_with_role)):
    return transactions

@app.get("/api/activity")
def get_activity(current_user: dict = Depends(get_current_user_with_role)):
    return activity_items

from snowflake_connector import fetch_coupa_transactions, fetch_coupa_metrics, fetch_netsuite_transactions, fetch_netsuite_metrics, execute_queries_concurrently, execute_query
from queries import CONSOLIDATED_COUPA_FINANCIAL_METRICS, CONSOLIDATED_COUPA_METRICS, CONSOLIDATED_COUPA_TRENDS, COUPA_DASHBOARD_COSTCENTRE_DISTRIBUTION, COUPA_DASHBOARD_DEPARTMENT, COUPA_DASHBOARD_DISTRIBUTION_STATUS, COUPA_DASHBOARD_METRICS, COUPA_DASHBOARD_MONTHLY_TRENDS, COUPA_TRANSACTIONS_FILTER_OPTIONS, \
                    CONSOLIDATED_NETSUITE_FINANCIAL_METRICS, CONSOLIDATED_NETSUITE_TRENDS, CONSOLIDATED_NETSUITE_METRICS, NETSUITE_DASHBOARD_METRICS, NETSUITE_DASHBOARD_MONTHLY_TRENDS, NETSUITE_DASHBOARD_BY_STATUS, NETSUITE_DASHBOARD_BY_TYPE, NETSUITE_DASHBOARD_DEPARTMENT, NETSUITE_TRANSACTIONS_FILTER_OPTIONS 

def format_amount(amount):
    amount = float(amount)
    if amount >= 1000000:
        formatted_amount = f"${amount / 1000000:.1f}M"
    elif amount >= 1000:
        formatted_amount = f"${amount / 1000:.1f}K"
    else:
        formatted_amount = f"${amount:.0f}"
    return formatted_amount

@app.get("/api/dashboard/consolidated")
def get_dashboard_consolidated(current_user: dict = Depends(get_current_user_with_role), days_back: int = Query(365, description="Number of days to look back for metrics.")):
    user_email = current_user.get("email")
    if not user_email:
        raise HTTPException(status_code=401, detail="User email not found in token")

    # Set a flag based on the user's role from our database
    user_role = 0 if current_user.get('role') == 'Admin' else 1

    queries_to_run = [
        (CONSOLIDATED_COUPA_FINANCIAL_METRICS, (days_back, user_email, user_role)),
        (CONSOLIDATED_NETSUITE_FINANCIAL_METRICS, (days_back, user_email, user_role))
    ]
    results = execute_queries_concurrently(queries_to_run)
    if len(results) == 2:
        coupa_metrics_data, netsuite_metrics_data = results
    else:
        coupa_metrics_data, netsuite_metrics_data = [], []

    coupa_metrics = coupa_metrics_data[0] if coupa_metrics_data else {}
    netsuite_metrics = netsuite_metrics_data[0] if netsuite_metrics_data else {}

    # Calculate summed counts
    open_ipo_count = float(coupa_metrics.get("OPEN_PO_COUNT") or 0) + float(netsuite_metrics.get("OPEN_PO_COUNT") or 0)
    pending_approvals_count = float(coupa_metrics.get("PENDING_APPROVALS_COUNT") or 0) + float(netsuite_metrics.get("PENDING_APPROVALS_COUNT") or 0)
    open_bills_count = float(netsuite_metrics.get("OPEN_BILLS_COUNT") or 0)
    total_amount_sum = float(coupa_metrics.get("TOTAL_AMOUNT") or 0) + float(netsuite_metrics.get("TOTAL_AMOUNT") or 0)

    return {
        "counts": {
            "openIpo": int(open_ipo_count),
            "requisition": 0,  # No metric available
            "pendingApprovals": int(pending_approvals_count),
            "noAction": 0,  # No metric available
            "openBills": int(open_bills_count),
            "totalAmount": format_amount(total_amount_sum),
            "activeSystems": 5
        },
        "financialMetrics": [
            {
                "name": "Coupa",
                "metrics": {
                    "Open POs": coupa_metrics.get("OPEN_PO_COUNT") or 0,
                    "Pending Approvals": coupa_metrics.get("PENDING_APPROVALS_COUNT") or 0,
                    "Critical POs": coupa_metrics.get("CRITICAL_PO_COUNT") or 0,
                    "Total Amount": format_amount(coupa_metrics.get("TOTAL_AMOUNT") or 0)
                }
            },
            {
                "name": "NetSuite",
                "metrics": {
                    "Open POs": netsuite_metrics.get("OPEN_PO_COUNT") or 0,
                    "Open Bills": netsuite_metrics.get("OPEN_BILLS_COUNT") or 0,
                    "Pending Approval POs": netsuite_metrics.get("PENDING_APPROVALS_COUNT") or 0,
                    "Total Amount": format_amount(netsuite_metrics.get("TOTAL_AMOUNT") or 0)
                }
            },
            {
            "name": "ZIP",
            "metrics": {
                "Registered Vendors": "342",
                "Pending Approval Vendors": "28",
                "Payment Success Rate": "99.8%",
                "Processing Time": "1.2d"
            }
            },
            {
            "name": "JIRA",
            "metrics": {
                "Active Tickets": "89",
                "PO Related Issues": "15",
                "Resolution Rate": "92%",
                "SLA Compliance": "97%"
            }
            },
            {
            "name": "Process Unity",
            "metrics": {
                "Vendor Assessments": "28",
                "Pending Reviews": "15",
                "Completed Reviews": "156",
                "Risk Score": "85%"
            }
            },
            {
            "name": "NetSuite Wolt",
            "metrics": {
                "Open POs": "32",
                "Open Bills": "18",
                "Pending Approval POs": "8",
                "Total Amount": "$1.8M"
            }
            }
        ],
        "recentActivity": activity_items
    }
@app.get("/api/transactions/coupa")
def get_coupa_transactions(current_user: dict = Depends(get_current_user_with_role), days_back: int = Query(800, description="Number of days to look back for metrics."), limit: int = 100, offset: int = 0):
    user_email = current_user.get("email")
    if not user_email:
        raise HTTPException(status_code=401, detail="User email not found in token")

    # Set a flag based on the user's role from our database
    user_role = 0 if current_user.get('role') == 'Admin' else 1
    
    transactions_data = fetch_coupa_transactions(days_back, user_email, user_role, limit, offset)

    return {"data": transactions_data}

@app.get("/api/transactions/netsuite")
def get_netsuite_transactions(current_user: dict = Depends(get_current_user_with_role), days_back: int = Query(800, description="Number of days to look back for metrics."), limit: int = 100, offset: int = 0):
    user_email = current_user.get("email")
    if not user_email:
        raise HTTPException(status_code=401, detail="User email not found in token")

    # Set a flag based on the user's role from our database
    user_role = 0 if current_user.get('role') == 'Admin' else 1

    transactions_data = fetch_netsuite_transactions(days_back, user_email, user_role, limit, offset)

    return {"data": transactions_data}

@app.get("/api/transactions/counts")
def get_transactions_counts(current_user: dict = Depends(get_current_user_with_role), days_back: int = Query(800, description="Number of days to look back for metrics.")):
    user_email = current_user.get("email")
    if not user_email:
        raise HTTPException(status_code=401, detail="User email not found in token")

    user_role = 0 if current_user.get('role') == 'Admin' else 1

    coupa_metrics = fetch_coupa_metrics(days_back, user_email, user_role)
    netsuite_metrics = fetch_netsuite_metrics(days_back, user_email, user_role)
    
    print(f"Raw results from COUPA_TRANSACTIONS_METRICS: {coupa_metrics}") # Keep for debugging
    print(f"Raw results from NETSUITE_TRANSACTIONS_METRICS: {netsuite_metrics}") # Keep for debugging

    return {
        "coupa": {
            "purchase_order": coupa_metrics.get("PURCHASE_ORDERS_COUNT") or 0,
            "invoice": coupa_metrics.get("INVOICES_COUNT") or 0,
            "requisition": coupa_metrics.get("REQUISITIONS_COUNT") or 0,
            "payments": 0, # Not in query result
            "pending_approval": coupa_metrics.get("PENDING_APPROVAL_COUNT") or 0,
        },
        "netsuite": {
            "purchase_order": netsuite_metrics.get("PURCHASE_ORDERS_COUNT") or 0,
            "bill": netsuite_metrics.get("BILLS_COUNT") or 0,
            "bill_payment": netsuite_metrics.get("BILL_PAYMENTS_COUNT") or 0,
            "pending_approval": netsuite_metrics.get("PENDING_APPROVAL_COUNT") or 0,
        }
    }

@app.get("/api/transactions/filters")
def get_transactions_filters(current_user: dict = Depends(get_current_user_with_role), days_back: int = Query(800, description="Number of days to look back for metrics.")):
    user_email = current_user.get("email")
    if not user_email:
        raise HTTPException(status_code=401, detail="User email not found in token")

    user_role = 0 if current_user.get('role') == 'Admin' else 1

    results = execute_queries_concurrently([
        (COUPA_TRANSACTIONS_FILTER_OPTIONS, (days_back, user_email, user_role)),
        (NETSUITE_TRANSACTIONS_FILTER_OPTIONS, (days_back, user_email, user_role))
    ])

    coupa_results = results[0]
    netsuite_results = results[1]

    coupa_filters = {}
    for item in coupa_results:
        filter_type = item['FILTER_TYPE']
        value = item['VALUE']
        if filter_type not in coupa_filters:
            coupa_filters[filter_type] = []
        coupa_filters[filter_type].append(value)

    coupa_filters_mapped = {
        "departments": coupa_filters.get("Departments", []),
        "suppliers": coupa_filters.get("Suppliers", []),
        "users": coupa_filters.get("Users", []),
        "statuses": coupa_filters.get("Statuses", []),
        "costCenters": coupa_filters.get("Cost Centers", []),
    }

    netsuite_filters = {}
    for item in netsuite_results:
        filter_type = item['filter_type']
        value = item['value']
        if filter_type not in netsuite_filters:
            netsuite_filters[filter_type] = []
        netsuite_filters[filter_type].append(value)

    netsuite_filters_mapped = {
        "subsidiaries": netsuite_filters.get("Subsidiaries", []),
        "vendors": netsuite_filters.get("Vendors", []),
        "locations": netsuite_filters.get("Locations", []),
        "statuses": netsuite_filters.get("Statuses", []),
        "users": netsuite_filters.get("Users", []),
        "types": netsuite_filters.get("Types", []),
    }

    return {
        "coupa": coupa_filters_mapped,
        "netsuite": netsuite_filters_mapped
    }

@app.get("/api/vendors")
def get_vendors(current_user: dict = Depends(get_current_user_with_role)):
    return vendors

@app.get("/api/vendors/{vendor_id}")
def get_vendor(vendor_id: str, current_user: dict = Depends(get_current_user_with_role)):
    for vendor in vendors:
        if vendor["id"] == vendor_id:
            return vendor
    return {}

@app.get("/api/vendors/analytics")
def get_vendor_analytics(current_user: dict = Depends(get_current_user_with_role)):
    return {
        "insights": [
            {
                "vendorId": "vendor-002",
                "insights": [
                    "Vendor has a high number of pending documents.",
                    "Vendor has a low performance score.",
                ]
            }
        ]
    }

@app.get("/api/system-dashboard/process-unity")
def get_system_dashboard_process_unity(current_user: dict = Depends(get_current_user_with_role)):
    return system_dashboard_data["process-unity"]

@app.get("/api/system-dashboard/coupa")
def get_system_dashboard_coupa(current_user: dict = Depends(get_current_user_with_role)):
    return system_dashboard_data["coupa"]

@app.get("/api/system-dashboard/netsuite")
def get_system_dashboard_netsuite(current_user: dict = Depends(get_current_user_with_role)):
    return system_dashboard_data["netsuite"]

@app.get("/api/system-dashboard/zip")
def get_system_dashboard_zip(current_user: dict = Depends(get_current_user_with_role)):
    return system_dashboard_data["zip"]

@app.get("/api/system-dashboard/jira")
def get_system_dashboard_jira(current_user: dict = Depends(get_current_user_with_role)):
    return system_dashboard_data["jira"]

@app.get("/api/system-dashboard/netsuite-wolt")
def get_system_dashboard_netsuite_wolt(current_user: dict = Depends(get_current_user_with_role)):
    return system_dashboard_data["netsuite-wolt"]

@app.get("/api/dashboard/coupa")
def get_dashboard_coupa(current_user: dict = Depends(get_current_user_with_role), days_back: int = Query(800, description="Number of days to look back for metrics.")):
    user_email = current_user.get("email")
    if not user_email:
        raise HTTPException(status_code=401, detail="User email not found in token")

    user_role = 0 if current_user.get('role') == 'Admin' else 1

    # The query takes more parameters, but we are passing empty values for them for now.
    results = execute_query(COUPA_DASHBOARD_METRICS, (days_back, user_email, user_role))
    
    metrics = results[0] if results else {}

    return {
        "counts": {
            "totalSpend": metrics.get("INVOICE_AMOUNT_SUM") or 0,
            "requisitionValue": metrics.get("REQUISITION_AMOUNT_SUM") or 0,
            "reqCount": metrics.get("TOTAL_REQUISITIONS") or 0,
            "poCount": metrics.get("TOTAL_POS") or 0
        }
    }

@app.get("/api/dashboard/coupa/budget-overview")
def get_dashboard_coupa_budget_overview(current_user: dict = Depends(get_current_user_with_role), days_back: int = Query(800, description="Number of days to look back for metrics.")):
    user_email = current_user.get("email")
    if not user_email:
        raise HTTPException(status_code=401, detail="User email not found in token")

    user_role = 0 if current_user.get('role') == 'Admin' else 1

    results = execute_query(COUPA_DASHBOARD_MONTHLY_TRENDS, (days_back, user_email, user_role))

    labels = [item['MONTH'] for item in results]
    data = [item['TXN_COUNT'] for item in results]

    return {
        "chartData": {
            "labels": labels,
            "datasets": [
                {
                    "label": "Transaction Count",
                    "data": data,
                    "borderColor": "#2563eb",
                    "backgroundColor": "#2563eb",
                    "tension": 0.4
                }
            ]
        }
    }

@app.get("/api/dashboard/coupa/cost-center-distribution")
def get_dashboard_coupa_cost_center_distribution(current_user: dict = Depends(get_current_user_with_role), days_back: int = Query(800, description="Number of days to look back for metrics.")):
    user_email = current_user.get("email")
    if not user_email:
        raise HTTPException(status_code=401, detail="User email not found in token")

    user_role = 0 if current_user.get('role') == 'Admin' else 1
    
    # This query is admin-only, so we can return empty if the user is not an admin.
    if user_role != 0:
        return {}

    # Note: The query COUPA_DASHBOARD_COSTCENTRE_DISTRIBUTION takes many filter parameters.
    # For now, we are passing empty values for them.
    # These can be exposed as API query parameters in the future.
    results = execute_query(COUPA_DASHBOARD_COSTCENTRE_DISTRIBUTION, (days_back, user_email, user_role))

    labels = [item['COST_CENTER'] for item in results]
    data = [item['TXN_COUNT'] for item in results]
    
    background_colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899', '#f97316', '#84cc16', '#06b6d4']

    return {
        "chartData": {
            "labels": labels,
            "datasets": [{
                "data": data,
                "backgroundColor": background_colors[:len(data)],
                "borderWidth": 0
            }]
        }
    }

@app.get("/api/dashboard/coupa/spend-by-department")
def get_dashboard_coupa_spend_by_department(current_user: dict = Depends(get_current_user_with_role), days_back: int = Query(800, description="Number of days to look back for metrics.")):
    user_email = current_user.get("email")
    if not user_email:
        raise HTTPException(status_code=401, detail="User email not found in token")

    user_role = 0 if current_user.get('role') == 'Admin' else 1

    # This query is admin-only, so we can return empty if the user is not an admin.
    if user_role != 0:
        return {}

    results = execute_query(COUPA_DASHBOARD_DEPARTMENT, (days_back, user_email, user_role))

    labels = [item['DEPARTMENT'] for item in results]
    data = [item['TOTAL_SPEND'] for item in results]

    if not data:
        return {} 

    return {
        "chartData": {
            "labels": labels,
            "datasets": [{
                "label": "Spend Amount",
                "data": data,
                "backgroundColor": "#2563eb",
            }]
        }
    }

@app.get("/api/dashboard/coupa/status-distribution")
def get_dashboard_coupa_status_distribution(current_user: dict = Depends(get_current_user_with_role), days_back: int = Query(800, description="Number of days to look back for metrics.")):
    user_email = current_user.get("email")
    if not user_email:
        raise HTTPException(status_code=401, detail="User email not found in token")

    user_role = 0 if current_user.get('role') == 'Admin' else 1

    results = execute_query(COUPA_DASHBOARD_DISTRIBUTION_STATUS, (days_back, user_email, user_role))

    labels = [item['STATUS'] for item in results]
    data = [item['TXN_COUNT'] for item in results]
    
    if not data:
        return {} 

    background_colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899', '#f97316', '#84cc16', '#06b6d4']

    return {
        "chartData": {
            "labels": labels,
            "datasets": [{
                "data": data,
                "backgroundColor": background_colors[:len(data)],
                "borderWidth": 0
            }]
        }
    }

@app.get("/api/dashboard/coupa/commodity-distribution")
def get_dashboard_coupa_commodity_distribution(current_user: dict = Depends(get_current_user_with_role)):
    return {
        "chartData": {
            "labels": ['IT Equipment', 'Office Supplies', 'Professional Services', 'Raw Materials', 'Software Licenses'],
            "datasets": [{
                "data": [35, 25, 20, 15, 5],
                "backgroundColor": ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
                "borderWidth": 0
            }]
        }
    }

@app.get("/api/dashboard/cupa-tab")
def get_dashboard_cupa_tab(current_user: dict = Depends(get_current_user_with_role), days_back: int = Query(800, description="Number of days to look back for metrics.")):
    user_email = current_user.get("email")
    if not user_email:
        raise HTTPException(status_code=401, detail="User email not found in token")

    user_role = 0 if current_user.get('role') == 'Admin' else 1

    queries_to_run = [
        (CONSOLIDATED_COUPA_METRICS, (days_back, user_email, user_role)),
        (CONSOLIDATED_COUPA_TRENDS, (days_back, user_email, user_role))
    ]
    results = execute_queries_concurrently(queries_to_run)

    if len(results) == 2:
        metrics_data, trends_data = results
    else:
        metrics_data, trends_data = [], []

    metrics = metrics_data[0] if metrics_data else {}
    
    # Format chart data
    labels = [item['MONTH_LABEL'] for item in trends_data]
    data = [item['PO_TOTAL_AMOUNT'] for item in trends_data]

    return {
        "counts": {
            "openIpo": metrics.get("OPEN_PO_COUNT") or 0,
            "requisition": metrics.get("REQUISITION_COUNT") or 0,
            "pendingApprovals": metrics.get("PENDING_APPROVALS_COUNT") or 0,
            "noAction": metrics.get("CRITICAL_PO_COUNT") or 0,  
            "requisitionTotal": format_amount(metrics.get("REQUISITIONS_TOTAL_AMOUNT") or 0)
        },
        "chartData": {
            "labels": labels,
            "datasets": [{
                "label": 'Total Spend',
                "data": data,
                "borderColor": '#2563eb',
                "backgroundColor": '#2563eb',
                "tension": 0.4
            }]
        }
    }



@app.get("/api/dashboard/netsuite-tab")
def get_dashboard_netsuite_tab(current_user: dict = Depends(get_current_user_with_role), days_back: int = Query(800, description="Number of days to look back for metrics.")):
    user_email = current_user.get("email")
    if not user_email:
        raise HTTPException(status_code=401, detail="User email not found in token")

    user_role = 0 if current_user.get('role') == 'Admin' else 1

    queries_to_run = [
        (CONSOLIDATED_NETSUITE_METRICS, (days_back, user_email, user_role)),
        (CONSOLIDATED_NETSUITE_TRENDS, (days_back, user_email, user_role))
    ]
    results = execute_queries_concurrently(queries_to_run)

    if len(results) == 2:
        metrics_data, trends_data = results
    else:
        metrics_data, trends_data = [], []

    metrics = metrics_data[0] if metrics_data else {}
    
    # Format chart data
    labels = [item['MONTH_LABEL'] for item in trends_data]
    data = [item['PO_TOTAL_AMOUNT'] for item in trends_data]

    return {
        "counts": {
            "requisition": 0, # Not in query result
            "openIpo": metrics.get("OPEN_PO_COUNT") or 0,
            "openBills": metrics.get("OPEN_BILLS_COUNT") or 0,
            "pendingApprovals": metrics.get("PENDING_APPROVAL_PO_COUNT") or 0,
            "totalAmount": format_amount(metrics.get("TOTAL_AMOUNT") or 0)
        },
        "chartData": {
            "labels": labels,
            "datasets": [{
                "label": 'Total Spend',
                "data": data,
                "borderColor": '#2563eb',
                "backgroundColor": '#2563eb',
                "tension": 0.4
            }]
        }
    }

@app.get("/api/dashboard/netsuite/metrics")
def get_dashboard_netsuite_metrics(current_user: dict = Depends(get_current_user_with_role), days_back: int = Query(800, description="Number of days to look back for metrics.")):
    user_email = current_user.get("email")
    if not user_email:
        raise HTTPException(status_code=401, detail="User email not found in token")

    user_role = 0 if current_user.get('role') == 'Admin' else 1

    results = execute_query(NETSUITE_DASHBOARD_METRICS, (days_back, user_email, user_role))
    
    metrics = results[0] if results else {}

    print(f"DEBUG: Value passed to format_amount for totalAmount: {metrics.get("TOTAL_AMOUNT") or 0}")
    return {
        "openPOs": metrics.get("OPEN_PO_COUNT") or 0,
        "openBills": metrics.get("OPEN_BILLS_COUNT") or 0,
        "pendingApprovalPOs": metrics.get("PENDING_APPROVAL_PO_COUNT") or 0,
        "totalAmount": format_amount(metrics.get("TOTAL_AMOUNT") or 0)
    }

@app.get("/api/dashboard/netsuite/monthly-trends")
def get_dashboard_netsuite_monthly_trends(current_user: dict = Depends(get_current_user_with_role), days_back: int = Query(800, description="Number of days to look back for metrics.")):
    user_email = current_user.get("email")
    if not user_email:
        raise HTTPException(status_code=401, detail="User email not found in token")

    user_role = 0 if current_user.get('role') == 'Admin' else 1

    results = execute_query(NETSUITE_DASHBOARD_MONTHLY_TRENDS, (days_back, user_email, user_role))

    labels = [item['MONTH'] for item in results]
    data = [item['TXN_COUNT'] for item in results]

    if not data:
        return {} 

    return {
        "chartData": {
            "labels": labels,
            "datasets": [{
                "label": 'PO Total Amount',
                "data": data,
                "borderColor": '#2563eb',
                "backgroundColor": '#2563eb',
                "tension": 0.4
            }]
        }
    }

@app.get("/api/dashboard/netsuite/status-distribution")
def get_dashboard_netsuite_status_distribution(current_user: dict = Depends(get_current_user_with_role), days_back: int = Query(800, description="Number of days to look back for metrics."), subsidiaries: str = Query("[]"), vendors: str = Query("[]"), locations: str = Query("[]"), statuses: str = Query("[]"), users: str = Query("[]"), types: str = Query("[]")):
    user_email = current_user.get("email")
    if not user_email:
        raise HTTPException(status_code=401, detail="User email not found in token")

    user_role = 0 if current_user.get('role') == 'Admin' else 1

    results = execute_query(NETSUITE_DASHBOARD_BY_STATUS, (days_back, user_email, user_role))

    labels = [item['STATUS_BUCKET'] for item in results]
    data = [item['TXN_COUNT'] for item in results]

    if not data:
        return {} 

    background_colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899', '#f97316', '#84cc16', '#06b6d4']

    return {
        "chartData": {
            "labels": labels,
            "datasets": [{
                "data": data,
                "backgroundColor": background_colors[:len(data)],
                "borderWidth": 0
            }]
        }
    }

@app.get("/api/dashboard/netsuite/spend-by-department")
def get_dashboard_netsuite_spend_by_department(current_user: dict = Depends(get_current_user_with_role), days_back: int = Query(800, description="Number of days to look back for metrics."), subsidiaries: str = Query("[]"), vendors: str = Query("[]"), locations: str = Query("[]"), statuses: str = Query("[]"), users: str = Query("[]"), types: str = Query("[]")):
    user_email = current_user.get("email")
    if not user_email:
        raise HTTPException(status_code=401, detail="User email not found in token")

    user_role = 0 if current_user.get('role') == 'Admin' else 1

    # This query is admin-only, so we can return empty if the user is not an admin.
    if user_role != 0:
        return {}

    results = execute_query(NETSUITE_DASHBOARD_DEPARTMENT, (days_back, user_email, user_role))

    labels = [item['DEPARTMENT_NAME'] for item in results]
    data = [item['TOTAL_AMOUNT'] for item in results]

    if not data:
        return {} 

    return {
        "chartData": {
            "labels": labels,
            "datasets": [{
                "label": "Spend Amount",
                "data": data,
                "backgroundColor": "#2563eb",
            }]
        }
    }

@app.get("/api/transactions/netsuite/filters")
def get_netsuite_transactions_filters(current_user: dict = Depends(get_current_user_with_role), days_back: int = Query(800, description="Number of days to look back for metrics."), types: str = Query("[]")):
    user_email = current_user.get("email")
    if not user_email:
        raise HTTPException(status_code=401, detail="User email not found in token")

    user_role = 0 if current_user.get('role') == 'Admin' else 1

    results = execute_query(NETSUITE_TRANSACTIONS_FILTER_OPTIONS, (days_back, user_email, user_role, types))

    netsuite_filters = {}
    for item in results:
        filter_type = item['filter_type']
        value = item['value']
        if filter_type not in netsuite_filters:
            netsuite_filters[filter_type] = []
        netsuite_filters[filter_type].append(value)

    netsuite_filters_mapped = {
        "subsidiaries": netsuite_filters.get("Subsidiaries", []),
        "vendors": netsuite_filters.get("Vendors", []),
        "locations": netsuite_filters.get("Locations", []),
        "statuses": netsuite_filters.get("Statuses", []),
        "users": netsuite_filters.get("Users", []),
        "types": netsuite_filters.get("Types", []),
    }

    return netsuite_filters_mapped

@app.get("/api/dashboard/netsuite/type-distribution")
def get_dashboard_netsuite_type_distribution(current_user: dict = Depends(get_current_user_with_role), days_back: int = Query(800, description="Number of days to look back for metrics."), subsidiaries: str = Query("[]"), vendors: str = Query("[]"), locations: str = Query("[]"), statuses: str = Query("[]"), users: str = Query("[]"), types: str = Query("[]")):
    user_email = current_user.get("email")
    if not user_email:
        raise HTTPException(status_code=401, detail="User email not found in token")

    user_role = 0 if current_user.get('role') == 'Admin' else 1

    results = execute_query(NETSUITE_DASHBOARD_BY_TYPE, (days_back, user_email, user_role))

    labels = [item['DOC_TYPE'] for item in results]
    data = [item['TXN_COUNT'] for item in results]

    if not data:
        return {} 

    background_colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899', '#f97316', '#84cc16', '#06b6d4']

    return {
        "chartData": {
            "labels": labels,
            "datasets": [{
                "data": data,
                "backgroundColor": background_colors[:len(data)],
                "borderWidth": 0
            }]
        }
    }

@app.get("/api/dashboard/netsuite-wolt-tab")
def get_dashboard_netsuite_wolt_tab(current_user: dict = Depends(get_current_user_with_role)):
    return {
        "counts": {
            "openPOs": "32",
            "openBills": "18",
            "pendingApprovalPOs": "8",
            "totalAmount": "$1.8M"
        },
        "chartData": {
            "labels": ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            "datasets": [{
                "label": 'Total Spend',
                "data": [25000000, 28000000, 26000000, 29858986, 31000000, 33000000],
                "borderColor": '#2563eb',
                "backgroundColor": '#2563eb',
                "tension": 0.4
            }]
        }
    }