/**
 * EatFair P2P Platform - Frontend JavaScript
 *
 * Fetches data from the server API and renders the dashboard.
 */

// =============================================================================
// STATE
// =============================================================================

let currentPage = 'dashboard';
let dashboardData = null;
let ordersData = [];
let journalData = [];
let payoutsData = { restaurants: { payouts: [] }, drivers: { payouts: [] } };
let restaurantsData = [];
let driversData = [];

// =============================================================================
// API CALLS
// =============================================================================

async function fetchApi(endpoint) {
  try {
    const response = await fetch(`/api${endpoint}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API error (${endpoint}):`, error);
    return { success: false, error: error.message };
  }
}

async function loadDashboardData() {
  const [dashboard, orders] = await Promise.all([
    fetchApi('/dashboard'),
    fetchApi('/orders?limit=10'),
  ]);

  if (dashboard.success) {
    dashboardData = dashboard.data;
    updateDashboardStats();
  }

  if (orders.success) {
    ordersData = orders.data;
    renderRecentOrders();
  }

  // Show mock indicator if using mock data
  if (dashboard.mock || orders.mock) {
    showMockIndicator();
  }
}

async function loadJournalEntries() {
  const result = await fetchApi('/journal-entries?limit=50');
  if (result.success) {
    journalData = result.data;
    renderJournalEntries();
  }
}

async function loadPayouts() {
  const result = await fetchApi('/payouts');
  if (result.success) {
    payoutsData = result.data;
    renderPayouts();
  }
}

async function loadRestaurants() {
  const result = await fetchApi('/restaurants');
  if (result.success) {
    restaurantsData = result.data;
    renderRestaurants();
  }
}

async function loadDrivers() {
  const result = await fetchApi('/drivers');
  if (result.success) {
    driversData = result.data;
    renderDrivers();
  }
}

// =============================================================================
// RENDERING
// =============================================================================

function updateDashboardStats() {
  if (!dashboardData) return;

  document.getElementById('stat-revenue').textContent = formatCurrency(dashboardData.totalRevenue);
  document.getElementById('stat-platform').textContent = formatCurrency(dashboardData.platformFees);
  document.getElementById('stat-pending').textContent = formatCurrency(dashboardData.pendingPayouts);
  document.getElementById('stat-orders').textContent = dashboardData.ordersToday;
}

function renderRecentOrders() {
  const tbody = document.getElementById('recent-orders');
  if (!tbody) return;

  tbody.innerHTML = ordersData.slice(0, 10).map(order => `
    <tr>
      <td><strong>#${order.shortId || order.id.slice(-6).toUpperCase()}</strong></td>
      <td>${order.customerName || 'Customer'}</td>
      <td>${order.restaurantName || 'Restaurant'}</td>
      <td>${order.driverName || 'Unassigned'}</td>
      <td><strong>${formatCurrency(order.total)}</strong></td>
      <td><span class="badge ${getStatusBadge(order.status)}">${order.status}</span></td>
    </tr>
  `).join('');
}

function renderJournalEntries() {
  const tbody = document.getElementById('journal-entries');
  if (!tbody) return;

  tbody.innerHTML = journalData.map(entry => `
    <tr>
      <td><strong>${entry.id.slice(0, 8)}</strong></td>
      <td>${formatDate(entry.createdAt)}</td>
      <td>#${entry.orderId?.slice(-6).toUpperCase() || 'N/A'}</td>
      <td><span class="badge badge-primary">${entry.type}</span></td>
      <td class="debit">${formatCurrency(entry.totalDebit || calculateTotalDebit(entry))}</td>
      <td class="credit">${formatCurrency(entry.totalCredit || calculateTotalCredit(entry))}</td>
      <td><span class="badge badge-success">Posted</span></td>
      <td><button class="btn btn-outline" onclick="showJournalDetail('${entry.id}')">View</button></td>
    </tr>
  `).join('');
}

function renderPayouts() {
  // Render restaurant payouts
  const restaurantContainer = document.getElementById('payout-restaurants');
  if (restaurantContainer) {
    restaurantContainer.innerHTML = payoutsData.restaurants.payouts.map(payout => `
      <div class="payout-card">
        <div class="payout-info">
          <h4>${payout.recipientName}</h4>
          <p>${payout.orderCount || 1} order(s) • Stripe: ${payout.stripeAccountId || 'Not connected'}</p>
        </div>
        <div class="payout-amount">
          <div class="amount">${formatCurrency(payout.amount)}</div>
          <button class="btn btn-success" onclick="processPayout('${payout.id}')">Pay Now</button>
        </div>
      </div>
    `).join('') || '<p style="padding:20px;color:var(--gray-500);">No pending restaurant payouts</p>';
  }

  // Render driver payouts
  const driverContainer = document.getElementById('payout-drivers');
  if (driverContainer) {
    driverContainer.innerHTML = payoutsData.drivers.payouts.map(payout => `
      <div class="payout-card">
        <div class="payout-info">
          <h4>${payout.recipientName}</h4>
          <p>Delivery: ${formatCurrency(payout.deliveryFee || 0)} + Tip: ${formatCurrency(payout.tip || 0)}</p>
        </div>
        <div class="payout-amount">
          <div class="amount">${formatCurrency(payout.amount)}</div>
          <button class="btn btn-success" onclick="processPayout('${payout.id}')">Pay Now</button>
        </div>
      </div>
    `).join('') || '<p style="padding:20px;color:var(--gray-500);">No pending driver payouts</p>';
  }
}

function renderRestaurants() {
  const tbody = document.getElementById('restaurant-list');
  if (!tbody) return;

  tbody.innerHTML = restaurantsData.map(restaurant => `
    <tr>
      <td><strong>${restaurant.name}</strong></td>
      <td>${restaurant.email}</td>
      <td>${restaurant.stripeAccountId || 'Not connected'}</td>
      <td>${formatCurrency(restaurant.balance || 0)}</td>
      <td><button class="btn btn-outline">View</button></td>
    </tr>
  `).join('');
}

function renderDrivers() {
  const tbody = document.getElementById('driver-list');
  if (!tbody) return;

  tbody.innerHTML = driversData.map(driver => `
    <tr>
      <td><strong>${driver.displayName || driver.name}</strong></td>
      <td>${driver.email}</td>
      <td>${driver.rating?.toFixed(1) || '0.0'}★</td>
      <td>${driver.stripeAccountId || 'Not connected'}</td>
      <td>${formatCurrency(driver.balance || 0)}</td>
      <td><button class="btn btn-outline">View</button></td>
    </tr>
  `).join('');
}

function renderCashRecords() {
  const tbody = document.getElementById('cash-records');
  if (!tbody) return;

  tbody.innerHTML = ordersData.filter(o => o.paymentStatus === 'paid' || o.paymentStatus === 'Captured').map(order => `
    <tr>
      <td>pi_${order.shortId?.toLowerCase() || order.id.slice(-6)}</td>
      <td><strong>${formatCurrency(order.total)}</strong></td>
      <td>${order.customerName}</td>
      <td>${formatDate(order.createdAt)}</td>
      <td>
        <div class="match-indicator">
          <span class="match-line"></span>
          <span class="checkmark">✓</span>
        </div>
      </td>
      <td>#${order.shortId || order.id.slice(-6).toUpperCase()}</td>
      <td><span class="badge badge-success">Applied</span></td>
    </tr>
  `).join('');
}

// =============================================================================
// NAVIGATION
// =============================================================================

function showPage(pageId) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });

  // Show selected page
  const page = document.getElementById(pageId);
  if (page) {
    page.classList.add('active');
  }

  // Update nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  event?.target?.classList?.add('active');

  // Load data for the page
  currentPage = pageId;
  switch (pageId) {
    case 'dashboard':
      loadDashboardData();
      break;
    case 'journal':
      loadJournalEntries();
      break;
    case 'cash':
      renderCashRecords();
      break;
    case 'payouts':
      loadPayouts();
      break;
    case 'restaurants':
      loadRestaurants();
      break;
    case 'drivers':
      loadDrivers();
      break;
  }
}

function showPayoutTab(tab) {
  document.querySelectorAll('.payout-tab').forEach(t => t.style.display = 'none');
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

  document.getElementById(`payout-${tab}`).style.display = 'block';
  event.target.classList.add('active');
}

// =============================================================================
// ACTIONS
// =============================================================================

async function processPayout(payoutId) {
  if (!confirm('Process this payout?')) return;

  const result = await fetchApi(`/payouts/${payoutId}/process`);
  if (result.success) {
    alert('Payout processed successfully!');
    loadPayouts();
  } else {
    alert('Failed to process payout: ' + (result.error || 'Unknown error'));
  }
}

async function processAllPayouts() {
  if (!confirm('Process all pending payouts?')) return;

  // Process each payout
  const allPayouts = [
    ...payoutsData.restaurants.payouts,
    ...payoutsData.drivers.payouts,
  ];

  for (const payout of allPayouts) {
    await fetchApi(`/payouts/${payout.id}/process`);
  }

  alert(`Processed ${allPayouts.length} payouts!`);
  loadPayouts();
}

function showJournalDetail(entryId) {
  const entry = journalData.find(e => e.id === entryId);
  if (!entry) return;

  const modal = document.getElementById('je-modal');
  const body = document.getElementById('je-modal-body');

  body.innerHTML = `
    <div class="je-detail">
      <p><strong>Entry ID:</strong> ${entry.id}</p>
      <p><strong>Order:</strong> #${entry.orderId?.slice(-6).toUpperCase() || 'N/A'}</p>
      <p><strong>Type:</strong> ${entry.type}</p>
      <p><strong>Date:</strong> ${formatDate(entry.createdAt)}</p>

      <table class="je-lines-table">
        <thead>
          <tr>
            <th>Account</th>
            <th>Debit</th>
            <th>Credit</th>
          </tr>
        </thead>
        <tbody>
          ${(entry.entries || []).map(line => `
            <tr>
              <td>${line.account}</td>
              <td class="debit">${line.debit ? formatCurrency(line.debit) : ''}</td>
              <td class="credit">${line.credit ? formatCurrency(line.credit) : ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="je-totals">
        <span>Total Debit: <strong class="debit">${formatCurrency(entry.totalDebit || calculateTotalDebit(entry))}</strong></span>
        <span>Total Credit: <strong class="credit">${formatCurrency(entry.totalCredit || calculateTotalCredit(entry))}</strong></span>
      </div>
    </div>
  `;

  modal.classList.add('show');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('show');
}

// =============================================================================
// UTILITIES
// =============================================================================

function formatCurrency(amount) {
  return '$' + (amount || 0).toFixed(2);
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getStatusBadge(status) {
  const badges = {
    'Delivered': 'badge-success',
    'Ready': 'badge-warning',
    'Preparing': 'badge-primary',
    'Placed': 'badge-primary',
    'Cancelled': 'badge-danger',
  };
  return badges[status] || 'badge-primary';
}

function calculateTotalDebit(entry) {
  return (entry.entries || []).reduce((sum, line) => sum + (line.debit || 0), 0);
}

function calculateTotalCredit(entry) {
  return (entry.entries || []).reduce((sum, line) => sum + (line.credit || 0), 0);
}

function showMockIndicator() {
  const banner = document.querySelector('.info-banner');
  if (banner && !banner.querySelector('.mock-badge')) {
    const badge = document.createElement('span');
    badge.className = 'mock-badge';
    badge.style.cssText = 'background:#F59E0B;color:white;padding:4px 8px;border-radius:4px;font-size:12px;margin-left:12px;';
    badge.textContent = 'MOCK DATA';
    banner.querySelector('h3').appendChild(badge);
  }
}

// =============================================================================
// INITIALIZATION
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('EatFair P2P Platform loaded');
  loadDashboardData();
});

// Close modals on outside click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('show');
  }
});
