// EatFair P2P Platform - Mock Data
// This simulates data that would come from Firestore

const restaurants = [
  { id: 'rest_001', name: "Mama's Italian Kitchen", email: 'mamas@email.com', stripeAccountId: 'acct_mama001', balance: 892.45 },
  { id: 'rest_002', name: 'Sushi Express', email: 'sushi@email.com', stripeAccountId: 'acct_sushi002', balance: 1245.80 },
  { id: 'rest_003', name: 'Burger Palace', email: 'burger@email.com', stripeAccountId: 'acct_burger003', balance: 567.20 },
  { id: 'rest_004', name: 'Taco Fiesta', email: 'taco@email.com', stripeAccountId: 'acct_taco004', balance: 423.15 },
];

const drivers = [
  { id: 'drv_001', name: 'Mike Johnson', email: 'mike@email.com', stripeAccountId: 'acct_mike001', balance: 245.80, rating: 4.9 },
  { id: 'drv_002', name: 'Sarah Williams', email: 'sarah@email.com', stripeAccountId: 'acct_sarah002', balance: 189.50, rating: 4.8 },
  { id: 'drv_003', name: 'David Chen', email: 'david@email.com', stripeAccountId: 'acct_david003', balance: 312.25, rating: 4.95 },
];

const orders = [
  {
    id: 'ord_001',
    shortId: 'A1B2C3',
    customerId: 'cust_001',
    customerName: 'John Doe',
    restaurantId: 'rest_001',
    restaurantName: "Mama's Italian Kitchen",
    driverId: 'drv_001',
    driverName: 'Mike Johnson',
    items: [
      { name: 'Margherita Pizza', quantity: 1, price: 16.99 },
      { name: 'Caesar Salad', quantity: 1, price: 8.99 },
    ],
    subtotal: 25.98,
    deliveryFee: 4.99,
    tip: 5.00,
    tax: 2.08,
    total: 38.05,
    platformFee: 1.00,
    status: 'Delivered',
    paymentStatus: 'Captured',
    createdAt: '2025-11-29T10:30:00Z',
    deliveredAt: '2025-11-29T11:15:00Z',
  },
  {
    id: 'ord_002',
    shortId: 'D4E5F6',
    customerId: 'cust_002',
    customerName: 'Jane Smith',
    restaurantId: 'rest_002',
    restaurantName: 'Sushi Express',
    driverId: 'drv_002',
    driverName: 'Sarah Williams',
    items: [
      { name: 'Dragon Roll', quantity: 2, price: 14.99 },
      { name: 'Miso Soup', quantity: 2, price: 3.99 },
    ],
    subtotal: 37.96,
    deliveryFee: 4.99,
    tip: 8.00,
    tax: 3.04,
    total: 53.99,
    platformFee: 1.00,
    status: 'Delivered',
    paymentStatus: 'Captured',
    createdAt: '2025-11-29T12:00:00Z',
    deliveredAt: '2025-11-29T12:45:00Z',
  },
  {
    id: 'ord_003',
    shortId: 'G7H8I9',
    customerId: 'cust_003',
    customerName: 'Bob Wilson',
    restaurantId: 'rest_003',
    restaurantName: 'Burger Palace',
    driverId: 'drv_003',
    driverName: 'David Chen',
    items: [
      { name: 'Double Cheeseburger', quantity: 2, price: 12.99 },
      { name: 'Fries', quantity: 2, price: 4.99 },
      { name: 'Milkshake', quantity: 2, price: 5.99 },
    ],
    subtotal: 47.94,
    deliveryFee: 4.99,
    tip: 10.00,
    tax: 3.84,
    total: 66.77,
    platformFee: 1.00,
    status: 'Delivered',
    paymentStatus: 'Captured',
    createdAt: '2025-11-29T14:30:00Z',
    deliveredAt: '2025-11-29T15:10:00Z',
  },
  {
    id: 'ord_004',
    shortId: 'J1K2L3',
    customerId: 'cust_004',
    customerName: 'Alice Brown',
    restaurantId: 'rest_001',
    restaurantName: "Mama's Italian Kitchen",
    driverId: 'drv_001',
    driverName: 'Mike Johnson',
    items: [
      { name: 'Spaghetti Carbonara', quantity: 1, price: 18.99 },
      { name: 'Tiramisu', quantity: 1, price: 7.49 },
    ],
    subtotal: 26.48,
    deliveryFee: 4.99,
    tip: 6.00,
    tax: 2.12,
    total: 39.59,
    platformFee: 1.00,
    status: 'Delivered',
    paymentStatus: 'Captured',
    createdAt: '2025-11-29T18:00:00Z',
    deliveredAt: '2025-11-29T18:40:00Z',
  },
  {
    id: 'ord_005',
    shortId: 'M4N5O6',
    customerId: 'cust_005',
    customerName: 'Charlie Davis',
    restaurantId: 'rest_004',
    restaurantName: 'Taco Fiesta',
    driverId: 'drv_002',
    driverName: 'Sarah Williams',
    items: [
      { name: 'Taco Platter', quantity: 1, price: 15.99 },
      { name: 'Nachos Grande', quantity: 1, price: 11.99 },
      { name: 'Horchata', quantity: 2, price: 3.49 },
    ],
    subtotal: 34.96,
    deliveryFee: 4.99,
    tip: 7.00,
    tax: 2.80,
    total: 49.75,
    platformFee: 1.00,
    status: 'Delivered',
    paymentStatus: 'Captured',
    createdAt: '2025-11-29T19:30:00Z',
    deliveredAt: '2025-11-29T20:05:00Z',
  },
];

// Generate journal entries from orders
function generateJournalEntries(orders) {
  const entries = [];

  orders.forEach((order, index) => {
    const restaurantPayout = order.subtotal - order.platformFee;
    const driverPayout = order.deliveryFee + order.tip;

    entries.push({
      id: `je_${String(index + 1).padStart(3, '0')}`,
      orderId: order.id,
      orderShortId: order.shortId,
      date: order.deliveredAt,
      type: 'Payment Received',
      description: `Order #${order.shortId} - ${order.customerName}`,
      lines: [
        { account: 'Cash/Stripe Balance', debit: order.total, credit: 0 },
        { account: `Restaurant Payable - ${order.restaurantName}`, debit: 0, credit: restaurantPayout },
        { account: `Driver Payable - ${order.driverName}`, debit: 0, credit: driverPayout },
        { account: 'Platform Revenue', debit: 0, credit: order.platformFee },
        { account: 'Sales Tax Payable', debit: 0, credit: order.tax },
      ],
      totalDebit: order.total,
      totalCredit: order.total,
      status: 'Posted',
    });
  });

  return entries;
}

// Generate pending payouts
function generatePendingPayouts(restaurants, drivers, orders) {
  const payouts = [];

  // Restaurant payouts
  restaurants.forEach(restaurant => {
    const restaurantOrders = orders.filter(o => o.restaurantId === restaurant.id && o.status === 'Delivered');
    const totalEarnings = restaurantOrders.reduce((sum, o) => sum + (o.subtotal - o.platformFee), 0);

    if (totalEarnings > 0) {
      payouts.push({
        id: `payout_${restaurant.id}`,
        type: 'Restaurant',
        recipientId: restaurant.id,
        recipientName: restaurant.name,
        stripeAccountId: restaurant.stripeAccountId,
        amount: totalEarnings,
        orderCount: restaurantOrders.length,
        status: 'Pending',
        createdAt: new Date().toISOString(),
      });
    }
  });

  // Driver payouts
  drivers.forEach(driver => {
    const driverOrders = orders.filter(o => o.driverId === driver.id && o.status === 'Delivered');
    const totalEarnings = driverOrders.reduce((sum, o) => sum + o.deliveryFee + o.tip, 0);

    if (totalEarnings > 0) {
      payouts.push({
        id: `payout_${driver.id}`,
        type: 'Driver',
        recipientId: driver.id,
        recipientName: driver.name,
        stripeAccountId: driver.stripeAccountId,
        amount: totalEarnings,
        orderCount: driverOrders.length,
        status: 'Pending',
        createdAt: new Date().toISOString(),
      });
    }
  });

  return payouts;
}

// Generate cash application records (incoming payments to match with orders)
function generateCashApplicationRecords(orders) {
  return orders.map((order, index) => ({
    id: `cash_${String(index + 1).padStart(3, '0')}`,
    paymentId: `pi_${order.shortId.toLowerCase()}`,
    amount: order.total,
    customerName: order.customerName,
    paymentMethod: 'card',
    cardLast4: String(1000 + index).slice(-4),
    receivedAt: order.deliveredAt,
    matchedOrderId: order.id,
    matchedOrderShortId: order.shortId,
    status: 'Applied',
    appliedAt: order.deliveredAt,
  }));
}

const journalEntries = generateJournalEntries(orders);
const pendingPayouts = generatePendingPayouts(restaurants, drivers, orders);
const cashApplicationRecords = generateCashApplicationRecords(orders);

module.exports = {
  restaurants,
  drivers,
  orders,
  journalEntries,
  pendingPayouts,
  cashApplicationRecords,
};
