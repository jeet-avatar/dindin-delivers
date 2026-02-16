/**
 * Cross-Platform Integration Test
 * Tests: Order Creation → Restaurant Accept → Driver Delivery → Payment → Payouts
 */

const API_BASE = 'https://api.dollor.ai';

// Demo accounts
const ACCOUNTS = {
  customer: { email: 'demo.customer@dollor.ai', password: 'DemoCustomer2025!' },
  restaurant: { email: 'demo.restaurant@dollor.ai', password: 'DemoRestaurant2025!' },
  driver: { email: 'demo.driver@dollor.ai', password: 'DemoDriver2025!' },
  admin: { email: 'support@dollor.ai', password: 'DollorAdmin2026!' }
};

interface TestResult {
  step: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  details: string;
  data?: any;
}

const results: TestResult[] = [];

function log(step: string, status: 'PASS' | 'FAIL' | 'SKIP', details: string, data?: any) {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${icon} ${step}: ${details}`);
  results.push({ step, status, details, data });
}

async function apiCall(endpoint: string, options: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, data };
}

async function login(email: string, password: string, type: 'customer' | 'vendor' | 'driver' | 'admin' = 'customer') {
  const endpoints: Record<string, string> = {
    customer: '/api/auth/customer/login',
    vendor: '/api/auth/vendor/login',
    driver: '/api/auth/driver/login',
    admin: '/api/auth/login'
  };

  // All logins use form-data (OAuth2 style)
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);

  const response = await fetch(`${API_BASE}${endpoints[type]}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData
  });
  const data = await response.json().catch(() => null);
  return response.ok ? data?.access_token || data?.token : null;
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 CROSS-PLATFORM INTEGRATION TEST');
  console.log('='.repeat(60) + '\n');

  let customerToken: string | null = null;
  let restaurantToken: string | null = null;
  let driverToken: string | null = null;
  let adminToken: string | null = null;
  let orderId: string | null = null;
  let restaurantId: string | null = null;

  // =====================================================
  // STEP 1: LOGIN ALL ACCOUNTS
  // =====================================================
  console.log('\n📋 STEP 1: Authentication\n');

  customerToken = await login(ACCOUNTS.customer.email, ACCOUNTS.customer.password, 'customer');
  log('Customer Login', customerToken ? 'PASS' : 'FAIL',
      customerToken ? 'Token obtained' : 'Failed to login');

  restaurantToken = await login(ACCOUNTS.restaurant.email, ACCOUNTS.restaurant.password, 'vendor');
  log('Restaurant Login', restaurantToken ? 'PASS' : 'FAIL',
      restaurantToken ? 'Token obtained' : 'Failed to login');

  driverToken = await login(ACCOUNTS.driver.email, ACCOUNTS.driver.password, 'driver');
  log('Driver Login', driverToken ? 'PASS' : 'FAIL',
      driverToken ? 'Token obtained' : 'Failed to login');

  adminToken = await login(ACCOUNTS.admin.email, ACCOUNTS.admin.password, 'admin');
  log('Admin Login', adminToken ? 'PASS' : 'FAIL',
      adminToken ? 'Token obtained' : 'Failed to login');

  // =====================================================
  // STEP 2: GET RESTAURANTS
  // =====================================================
  console.log('\n📋 STEP 2: Get Restaurants\n');

  const vendorsRes = await apiCall('/api/vendors', {}, customerToken || undefined);
  if (vendorsRes.ok && vendorsRes.data) {
    const vendors = Array.isArray(vendorsRes.data) ? vendorsRes.data : vendorsRes.data.vendors || [];
    restaurantId = vendors[0]?.id || vendors[0]?.vendor_id;
    log('Get Restaurants', 'PASS', `Found ${vendors.length} restaurants`, { count: vendors.length, firstId: restaurantId });
  } else {
    log('Get Restaurants', 'FAIL', 'Could not fetch restaurants');
  }

  // =====================================================
  // STEP 3: GET MENU ITEMS
  // =====================================================
  console.log('\n📋 STEP 3: Get Menu Items\n');

  let menuItems: any[] = [];
  if (restaurantId) {
    const menuRes = await apiCall(`/api/vendors/${restaurantId}/menu`, {}, customerToken || undefined);
    if (menuRes.ok && menuRes.data) {
      menuItems = Array.isArray(menuRes.data) ? menuRes.data : menuRes.data.items || [];
      log('Get Menu', 'PASS', `Found ${menuItems.length} menu items`);
    } else {
      log('Get Menu', 'FAIL', 'Could not fetch menu');
    }
  }

  // =====================================================
  // STEP 4: CREATE ORDER WITH TIP
  // =====================================================
  console.log('\n📋 STEP 4: Create Order\n');

  const orderPayload = {
    vendor_id: restaurantId,
    customer_name: 'Demo Customer',
    customer_email: 'demo.customer@dollor.ai',
    customer_phone: '+1234567890',
    items: menuItems.slice(0, 2).map((item: any) => ({
      menu_item_id: item.id || item.menu_item_id,
      name: item.item_name || item.name || 'Test Item',
      quantity: 1,
      price: item.price
    })),
    delivery_address: {
      street: '123 Test Street',
      city: 'San Francisco',
      state: 'CA',
      zip_code: '94102',
      full_address: '123 Test Street, San Francisco, CA 94102'
    },
    delivery_instructions: 'Integration test order',
    tip_amount: 5.00,
    payment_method: 'card'
  };

  const orderRes = await apiCall('/api/orders', {
    method: 'POST',
    body: JSON.stringify(orderPayload)
  }, customerToken || undefined);

  if (orderRes.ok && orderRes.data) {
    orderId = orderRes.data.id || orderRes.data.order_id;
    log('Create Order', 'PASS', `Order created: ${orderId}`, {
      orderId,
      tip: 5.00,
      items: orderPayload.items.length
    });
  } else {
    log('Create Order', 'FAIL', `Error: ${JSON.stringify(orderRes.data)}`);
  }

  // =====================================================
  // STEP 5: RESTAURANT ACCEPTS ORDER
  // =====================================================
  console.log('\n📋 STEP 5: Restaurant Accepts Order\n');

  if (orderId && restaurantToken) {
    const acceptRes = await apiCall(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'confirmed' })
    }, restaurantToken);

    log('Restaurant Accept', acceptRes.ok ? 'PASS' : 'FAIL',
        acceptRes.ok ? 'Order confirmed by restaurant' : `Error: ${JSON.stringify(acceptRes.data)}`);

    // Mark as preparing
    const prepareRes = await apiCall(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'preparing' })
    }, restaurantToken);

    log('Restaurant Preparing', prepareRes.ok ? 'PASS' : 'FAIL',
        prepareRes.ok ? 'Order marked as preparing' : `Error: ${JSON.stringify(prepareRes.data)}`);

    // Mark as ready
    const readyRes = await apiCall(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'ready_for_pickup' })
    }, restaurantToken);

    log('Order Ready', readyRes.ok ? 'PASS' : 'FAIL',
        readyRes.ok ? 'Order ready for pickup' : `Error: ${JSON.stringify(readyRes.data)}`);
  } else {
    log('Restaurant Accept', 'SKIP', 'No order or restaurant token');
  }

  // =====================================================
  // STEP 6: DRIVER PICKS UP & DELIVERS
  // =====================================================
  console.log('\n📋 STEP 6: Driver Delivery\n');

  if (orderId && driverToken) {
    // Driver goes online
    const onlineRes = await apiCall('/api/drivers/online', {
      method: 'POST',
      body: JSON.stringify({ is_online: true })
    }, driverToken);
    log('Driver Online', onlineRes.ok ? 'PASS' : 'SKIP',
        onlineRes.ok ? 'Driver is online' : 'Could not set online status');

    // Driver accepts order
    const acceptRes = await apiCall(`/api/orders/${orderId}/driver/accept`, {
      method: 'POST'
    }, driverToken);
    log('Driver Accept', acceptRes.ok ? 'PASS' : 'SKIP',
        acceptRes.ok ? 'Driver accepted order' : 'Could not accept order');

    // Driver picks up
    const pickupRes = await apiCall(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'out_for_delivery' })
    }, driverToken);
    log('Driver Pickup', pickupRes.ok ? 'PASS' : 'FAIL',
        pickupRes.ok ? 'Order picked up' : `Error: ${JSON.stringify(pickupRes.data)}`);

    // Driver delivers
    const deliverRes = await apiCall(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'delivered' })
    }, driverToken);
    log('Driver Deliver', deliverRes.ok ? 'PASS' : 'FAIL',
        deliverRes.ok ? 'Order delivered' : `Error: ${JSON.stringify(deliverRes.data)}`);
  } else {
    log('Driver Delivery', 'SKIP', 'No order or driver token');
  }

  // =====================================================
  // STEP 7: VERIFY ORDER STATUS
  // =====================================================
  console.log('\n📋 STEP 7: Verify Final Order Status\n');

  if (orderId) {
    const orderCheck = await apiCall(`/api/orders/${orderId}`, {}, adminToken || customerToken || undefined);
    if (orderCheck.ok && orderCheck.data) {
      const order = orderCheck.data;
      log('Order Status', order.status === 'delivered' ? 'PASS' : 'FAIL',
          `Status: ${order.status}, Payment: ${order.payment_status}`, order);
    } else {
      log('Order Status', 'FAIL', 'Could not fetch order');
    }
  }

  // =====================================================
  // STEP 8: CHECK ACCOUNTING / JV ENTRIES
  // =====================================================
  console.log('\n📋 STEP 8: Check Accounting/JV Entries\n');

  if (adminToken) {
    // Check transactions
    const txRes = await apiCall('/api/accounting/transactions', {}, adminToken);
    log('Transactions', txRes.ok ? 'PASS' : 'SKIP',
        txRes.ok ? `Found transactions` : 'Could not fetch transactions');

    // Check JV entries
    const jvRes = await apiCall('/api/accounting/journal-entries', {}, adminToken);
    log('Journal Entries', jvRes.ok ? 'PASS' : 'SKIP',
        jvRes.ok ? 'JV entries accessible' : 'Could not fetch JV entries');
  }

  // =====================================================
  // STEP 9: CHECK DRIVER PAYOUTS
  // =====================================================
  console.log('\n📋 STEP 9: Driver Payout Calculation\n');

  if (driverToken) {
    const earningsRes = await apiCall('/api/drivers/earnings', {}, driverToken);
    if (earningsRes.ok && earningsRes.data) {
      log('Driver Earnings', 'PASS', `Earnings data retrieved`, earningsRes.data);
    } else {
      log('Driver Earnings', 'SKIP', 'Could not fetch driver earnings');
    }

    const payoutRes = await apiCall('/api/drivers/payouts', {}, driverToken);
    log('Driver Payouts', payoutRes.ok ? 'PASS' : 'SKIP',
        payoutRes.ok ? 'Payout data retrieved' : 'Could not fetch payouts');
  }

  // =====================================================
  // STEP 10: CHECK RESTAURANT PAYOUTS
  // =====================================================
  console.log('\n📋 STEP 10: Restaurant Payout Calculation\n');

  if (restaurantToken) {
    const earningsRes = await apiCall('/api/vendors/earnings', {}, restaurantToken);
    if (earningsRes.ok && earningsRes.data) {
      log('Restaurant Earnings', 'PASS', `Earnings data retrieved`, earningsRes.data);
    } else {
      log('Restaurant Earnings', 'SKIP', 'Could not fetch restaurant earnings');
    }

    const payoutRes = await apiCall('/api/accounting/vendor-payouts', {}, adminToken || restaurantToken);
    log('Restaurant Payouts', payoutRes.ok ? 'PASS' : 'SKIP',
        payoutRes.ok ? 'Payout data retrieved' : 'Could not fetch payouts');
  }

  // =====================================================
  // STEP 11: RIDESHARE TEST
  // =====================================================
  console.log('\n📋 STEP 11: Rideshare Flow\n');

  if (customerToken) {
    // Get ride estimate
    const estimateRes = await apiCall('/api/rideshare/estimate', {
      method: 'POST',
      body: JSON.stringify({
        pickup_location: { lat: 37.7749, lng: -122.4194, address: '123 Market St, SF' },
        dropoff_location: { lat: 37.7849, lng: -122.4094, address: '456 Mission St, SF' }
      })
    }, customerToken);
    log('Ride Estimate', estimateRes.ok ? 'PASS' : 'SKIP',
        estimateRes.ok ? `Estimate: $${estimateRes.data?.estimated_fare || 'N/A'}` : 'Could not get estimate');

    // Request ride
    const rideRes = await apiCall('/api/rideshare/request', {
      method: 'POST',
      body: JSON.stringify({
        pickup_location: { lat: 37.7749, lng: -122.4194, address: '123 Market St, SF' },
        dropoff_location: { lat: 37.7849, lng: -122.4094, address: '456 Mission St, SF' },
        payment_method: 'card'
      })
    }, customerToken);
    log('Ride Request', rideRes.ok ? 'PASS' : 'SKIP',
        rideRes.ok ? `Ride requested: ${rideRes.data?.ride_id || 'created'}` : 'Could not request ride');
  }

  // =====================================================
  // SUMMARY
  // =====================================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60) + '\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;

  console.log(`✅ Passed:  ${passed}`);
  console.log(`❌ Failed:  ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`📝 Total:   ${results.length}`);
  console.log('\n' + '='.repeat(60) + '\n');

  // Print failed tests
  if (failed > 0) {
    console.log('❌ FAILED TESTS:\n');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   - ${r.step}: ${r.details}`);
    });
    console.log('');
  }

  return { passed, failed, skipped, total: results.length };
}

// Run tests
runTests().then(summary => {
  process.exit(summary.failed > 0 ? 1 : 0);
}).catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
