// EatFair Order Demo - Shows full order lifecycle and journal entry
// This is a local demonstration of the order flow

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function pad(str, len) {
  return String(str).padEnd(len);
}

function padStart(str, len) {
  return String(str).padStart(len);
}

async function simulateFullOrderFlow() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║           EATFAIR P2P ORDER SIMULATION                       ║');
  console.log('║           Full Order Lifecycle Demo                          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // ============================================
  // STEP 1: Customer Places Order
  // ============================================
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('STEP 1: CUSTOMER PLACES ORDER');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const orderData = {
    customerId: 'cust_demo_001',
    customerEmail: 'john.doe@email.com',
    customerName: 'John Doe',
    customerPhone: '+1-555-123-4567',
    restaurantId: 'rest_demo_001',
    restaurantName: 'Mamas Italian Kitchen',
    items: [
      { name: 'Margherita Pizza (Large)', quantity: 1, price: 16.99, notes: 'Extra cheese' },
      { name: 'Caesar Salad', quantity: 1, price: 8.99 },
      { name: 'Tiramisu', quantity: 2, price: 7.49 },
      { name: 'San Pellegrino', quantity: 2, price: 2.99 }
    ],
    subtotal: 46.94,
    deliveryFee: 4.99,
    tip: 8.00,
    tax: 3.76,
    total: 63.69,
    status: 'Placed'
  };

  const orderId = 'ord_' + Date.now();
  const orderShortId = orderId.slice(-6).toUpperCase();

  console.log('Order Details:');
  console.log('──────────────────────────────────────');
  console.log('Order #:      ' + orderShortId);
  console.log('Customer:     ' + orderData.customerName);
  console.log('Restaurant:   ' + orderData.restaurantName);
  console.log('──────────────────────────────────────');
  console.log('Items:');
  orderData.items.forEach(item => {
    const lineTotal = (item.price * item.quantity).toFixed(2);
    console.log('  ' + item.quantity + 'x ' + pad(item.name, 30) + ' $' + lineTotal);
  });
  console.log('──────────────────────────────────────');
  console.log(pad('  Subtotal:', 36) + '$' + orderData.subtotal.toFixed(2));
  console.log(pad('  Delivery Fee:', 36) + '$' + orderData.deliveryFee.toFixed(2));
  console.log(pad('  Tip:', 36) + '$' + orderData.tip.toFixed(2));
  console.log(pad('  Tax:', 36) + '$' + orderData.tax.toFixed(2));
  console.log('══════════════════════════════════════');
  console.log(pad('  TOTAL:', 36) + '$' + orderData.total.toFixed(2));
  console.log('══════════════════════════════════════\n');

  console.log('[' + new Date().toLocaleTimeString() + '] PLACED         | Order #' + orderShortId + ' placed by customer');
  await sleep(1500);

  // ============================================
  // STEP 2: Restaurant Accepts Order
  // ============================================
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('STEP 2: RESTAURANT ACCEPTS ORDER');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('[' + new Date().toLocaleTimeString() + '] ACCEPTED       | Restaurant accepted - Prep time: 20 mins');
  console.log('  → Push notification sent to customer: "Order Accepted!"');
  await sleep(1500);

  // ============================================
  // STEP 3: Restaurant Preparing
  // ============================================
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('STEP 3: RESTAURANT PREPARING ORDER');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('[' + new Date().toLocaleTimeString() + '] PREPARING      | Kitchen is preparing the order...');
  console.log('  → Push notification sent to customer: "Order Being Prepared"');
  await sleep(1500);

  // ============================================
  // STEP 4: Order Ready for Pickup
  // ============================================
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('STEP 4: ORDER READY FOR PICKUP');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('[' + new Date().toLocaleTimeString() + '] READY          | Order is ready and waiting for driver');
  console.log('  → AI Dispatcher searching for nearest driver...');
  await sleep(1500);

  // ============================================
  // STEP 5: Driver Assigned
  // ============================================
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('STEP 5: DRIVER ASSIGNED');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const driverData = {
    driverId: 'driver_demo_001',
    driverName: 'Mike Johnson',
    driverPhone: '+1-555-987-6543',
    driverRating: 4.9,
    vehicleType: 'Honda Civic',
    licensePlate: 'ABC-1234',
    distanceFromRestaurant: 1.2
  };

  console.log('[' + new Date().toLocaleTimeString() + '] ASSIGNED       | Driver ' + driverData.driverName + ' assigned');
  console.log('  Driver Details:');
  console.log('    Name:     ' + driverData.driverName);
  console.log('    Rating:   ' + driverData.driverRating + ' stars');
  console.log('    Vehicle:  ' + driverData.vehicleType + ' (' + driverData.licensePlate + ')');
  console.log('    Distance: ' + driverData.distanceFromRestaurant + ' km from restaurant');
  console.log('  → Push notification sent to driver: "New Delivery!"');
  console.log('  → Push notification sent to customer: "Driver Assigned!"');
  await sleep(1500);

  // ============================================
  // STEP 6: Driver Picks Up Order
  // ============================================
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('STEP 6: DRIVER PICKS UP ORDER');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('[' + new Date().toLocaleTimeString() + '] PICKED UP      | Driver picked up the order from restaurant');
  console.log('  → Real-time tracking enabled');
  console.log('  → Push notification sent to customer: "Your driver is on the way!"');
  console.log('  → ETA: 12 mins');
  await sleep(1500);

  // ============================================
  // STEP 7: Order Delivered
  // ============================================
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('STEP 7: ORDER DELIVERED');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('[' + new Date().toLocaleTimeString() + '] DELIVERED      | Order successfully delivered!');
  console.log('  → Push notification sent to customer: "Order Delivered!"');
  console.log('  → Delivery confirmation photo saved');
  await sleep(1000);

  // ============================================
  // STEP 8: Payment Processing & Journal Entry
  // ============================================
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('STEP 8: PAYMENT PROCESSING & ACCOUNTING');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Calculate payouts
  const platformFee = 1.00; // $1 flat fee per restaurant
  const restaurantPayout = orderData.subtotal - platformFee;
  const driverPayout = orderData.deliveryFee + orderData.tip;
  const totalReceived = orderData.total;

  console.log('[' + new Date().toLocaleTimeString() + '] PAID           | Payment of $' + totalReceived.toFixed(2) + ' processed');

  // Create Journal Entry
  const dateStr = new Date().toISOString().split('T')[0];
  console.log('\n┌─────────────────────────────────────────────────────────────┐');
  console.log('│                     JOURNAL ENTRY                           │');
  console.log('├─────────────────────────────────────────────────────────────┤');
  console.log('│ Order #' + orderShortId + '                     Date: ' + dateStr + '        │');
  console.log('│ Type: Payment Received                                      │');
  console.log('├─────────────────────────────────────────────────────────────┤');
  console.log('│ Account                         │    Debit    │   Credit    │');
  console.log('├─────────────────────────────────┼─────────────┼─────────────┤');
  console.log('│ Cash/Stripe Balance             │   $' + padStart(totalReceived.toFixed(2), 7) + '   │             │');
  console.log('│ Restaurant Payable (Mamas)      │             │   $' + padStart(restaurantPayout.toFixed(2), 7) + '   │');
  console.log('│ Driver Payable (Mike)           │             │   $' + padStart(driverPayout.toFixed(2), 7) + '   │');
  console.log('│ Platform Revenue                │             │   $' + padStart(platformFee.toFixed(2), 7) + '   │');
  console.log('│ Sales Tax Payable               │             │   $' + padStart(orderData.tax.toFixed(2), 7) + '   │');
  console.log('├─────────────────────────────────┼─────────────┼─────────────┤');
  const totalCredits = restaurantPayout + driverPayout + platformFee + orderData.tax;
  console.log('│ TOTALS                          │   $' + padStart(totalReceived.toFixed(2), 7) + '   │   $' + padStart(totalCredits.toFixed(2), 7) + '   │');
  console.log('└─────────────────────────────────┴─────────────┴─────────────┘');

  // Verify balanced
  if (Math.abs(totalReceived - totalCredits) < 0.01) {
    console.log('\n✓ Journal entry is BALANCED (Debits = Credits)');
  }

  // ============================================
  // STEP 9: Payout Records
  // ============================================
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('STEP 9: PAYOUT BREAKDOWN');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ RESTAURANT PAYOUT - ' + pad(orderData.restaurantName, 30) + '        │');
  console.log('├─────────────────────────────────────────────────────────────┤');
  console.log('│ Food Sales Revenue:                            $' + padStart(orderData.subtotal.toFixed(2), 7) + '   │');
  console.log('│ Platform Fee (flat):                          -$' + padStart(platformFee.toFixed(2), 7) + '   │');
  console.log('├─────────────────────────────────────────────────────────────┤');
  console.log('│ NET PAYOUT:                                    $' + padStart(restaurantPayout.toFixed(2), 7) + '   │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  console.log('\n┌─────────────────────────────────────────────────────────────┐');
  console.log('│ DRIVER PAYOUT - ' + pad(driverData.driverName, 34) + '        │');
  console.log('├─────────────────────────────────────────────────────────────┤');
  console.log('│ Delivery Fee (100% to driver):                 $' + padStart(orderData.deliveryFee.toFixed(2), 7) + '   │');
  console.log('│ Customer Tip (100% to driver):                 $' + padStart(orderData.tip.toFixed(2), 7) + '   │');
  console.log('│ Platform Fee:                                  $   0.00   │');
  console.log('├─────────────────────────────────────────────────────────────┤');
  console.log('│ NET PAYOUT:                                    $' + padStart(driverPayout.toFixed(2), 7) + '   │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  // ============================================
  // FINAL SUMMARY
  // ============================================
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║               ORDER COMPLETE - SUMMARY                       ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║ Order #' + orderShortId + '                                                ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║ Customer paid:                               $' + padStart(orderData.total.toFixed(2), 7) + '       ║');
  console.log('║                                                              ║');
  console.log('║ Distribution:                                                ║');
  console.log('║   → Restaurant (' + pad(orderData.restaurantName.substring(0,15), 15) + '):        $' + padStart(restaurantPayout.toFixed(2), 7) + '       ║');
  console.log('║   → Driver (' + pad(driverData.driverName.substring(0,18), 18) + '):        $' + padStart(driverPayout.toFixed(2), 7) + '       ║');
  console.log('║   → Platform Fee:                            $' + padStart(platformFee.toFixed(2), 7) + '       ║');
  console.log('║   → Sales Tax:                               $' + padStart(orderData.tax.toFixed(2), 7) + '       ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║ EatFair P2P Model:                                           ║');
  console.log('║   • Only $1 flat fee per restaurant (not %)                  ║');
  console.log('║   • Drivers keep 100% of delivery fees + tips                ║');
  console.log('║   • Transparent, fair pricing for all parties                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  console.log('✅ Full order simulation completed successfully!\n');
}

simulateFullOrderFlow();
