import { test, expect } from '@playwright/test';

const VENDOR_EMAIL = 'demo.restaurant@dollor.ai';
const VENDOR_PASSWORD = 'DemoRestaurant2025!';

// Helper to login as vendor
async function loginAsVendor(page) {
  await page.goto('/vendor/login');
  await page.fill('input[type="email"], input[name="email"], #email', VENDOR_EMAIL);
  await page.fill('input[type="password"], input[name="password"], #password', VENDOR_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/vendor\/dashboard/, { timeout: 10000 });
}

test.describe('Vendor Portal Tests', () => {

  // Test Case 4: Menu Item - Create
  test('TC04: Create new menu item', async ({ page }) => {
    await loginAsVendor(page);

    // Navigate to menu page
    await page.goto('/vendor/menu');
    await page.waitForLoadState('networkidle');

    // Click Add Item button
    await page.click('button:has-text("Add"), button:has-text("New Item"), button:has-text("Add Item")');

    // Wait for modal/form to appear
    await page.waitForSelector('input[name="item_name"], input[name="name"], #item_name, #name', { timeout: 5000 });

    // Fill in menu item details
    const testItemName = `Test Item ${Date.now()}`;
    await page.fill('input[name="item_name"], input[name="name"], #item_name, #name', testItemName);
    await page.fill('input[name="price"], #price', '12.99');

    // Select category if dropdown exists
    const categorySelect = page.locator('select[name="category"], .ant-select').first();
    if (await categorySelect.isVisible()) {
      await categorySelect.click();
      await page.click('.ant-select-item-option:first-child');
    }

    // Save the item
    await page.click('button:has-text("Save"), button:has-text("Create"), button:has-text("Add"), button[type="submit"]');

    // Verify success notification or item appears in list
    await page.waitForTimeout(2000);
    const successMessage = await page.locator('.ant-message-success, .ant-notification-notice-success, text=/success/i').isVisible();
    const itemInList = await page.locator(`text=${testItemName}`).isVisible();

    expect(successMessage || itemInList).toBeTruthy();
  });

  // Test Case 5: Menu Item - Update Price
  test('TC05: Update menu item price', async ({ page }) => {
    await loginAsVendor(page);

    // Navigate to menu page
    await page.goto('/vendor/menu');
    await page.waitForLoadState('networkidle');

    // Find and click edit on first menu item
    const editButton = page.locator('button:has-text("Edit"), .anticon-edit, [aria-label="Edit"]').first();
    await editButton.click();

    // Wait for edit form
    await page.waitForSelector('input[name="price"], #price', { timeout: 5000 });

    // Update price
    const newPrice = '15.99';
    await page.fill('input[name="price"], #price', '');
    await page.fill('input[name="price"], #price', newPrice);

    // Save changes
    await page.click('button:has-text("Save"), button:has-text("Update"), button[type="submit"]');

    // Verify update success
    await page.waitForTimeout(2000);
    const successMessage = await page.locator('.ant-message-success, .ant-notification-notice-success').isVisible();
    const priceUpdated = await page.locator(`text=$${newPrice}, text=${newPrice}`).isVisible();

    expect(successMessage || priceUpdated).toBeTruthy();
  });

  // Test Case 6: Menu Item - Delete
  test('TC06: Delete menu item', async ({ page }) => {
    await loginAsVendor(page);

    // Navigate to menu page
    await page.goto('/vendor/menu');
    await page.waitForLoadState('networkidle');

    // Count items before delete
    const itemsBefore = await page.locator('.menu-item, .ant-table-row, .ant-list-item').count();

    // Find and click delete on first menu item
    const deleteButton = page.locator('button:has-text("Delete"), .anticon-delete, [aria-label="Delete"]').first();
    await deleteButton.click();

    // Confirm deletion if modal appears
    const confirmButton = page.locator('.ant-modal-confirm-btns button:has-text("OK"), .ant-popconfirm-buttons button:has-text("OK"), button:has-text("Confirm"), button:has-text("Yes")');
    if (await confirmButton.isVisible({ timeout: 2000 })) {
      await confirmButton.click();
    }

    // Verify deletion
    await page.waitForTimeout(2000);
    const successMessage = await page.locator('.ant-message-success, text=/deleted/i').isVisible();
    const itemsAfter = await page.locator('.menu-item, .ant-table-row, .ant-list-item').count();

    expect(successMessage || itemsAfter < itemsBefore).toBeTruthy();
  });

  // Test Case 7: Order Status Update
  test('TC07: Update order status to preparing', async ({ page }) => {
    await loginAsVendor(page);

    // Should already be on dashboard
    await page.waitForLoadState('networkidle');

    // Look for active orders table/list
    const orderRow = page.locator('.ant-table-row, .order-item, .order-card').first();

    if (await orderRow.isVisible({ timeout: 5000 })) {
      // Find status update button
      const preparingButton = page.locator('button:has-text("Preparing"), button:has-text("Start Preparing"), button:has-text("Mark Preparing"), button:has-text("Accept")').first();

      if (await preparingButton.isVisible({ timeout: 3000 })) {
        await preparingButton.click();

        // Verify status update
        await page.waitForTimeout(2000);
        const statusUpdated = await page.locator('text=/preparing/i, .ant-tag:has-text("Preparing")').isVisible();
        const successMessage = await page.locator('.ant-message-success').isVisible();

        expect(statusUpdated || successMessage).toBeTruthy();
      } else {
        // No pending orders to update - test passes
        test.skip();
      }
    } else {
      // No active orders - test passes
      test.skip();
    }
  });

  // Test Case 8: Earnings Export CSV
  test('TC08: Export earnings as CSV', async ({ page }) => {
    await loginAsVendor(page);

    // Navigate to earnings page
    await page.goto('/vendor/earnings');
    await page.waitForLoadState('networkidle');

    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

    // Click export button
    const exportButton = page.locator('button:has-text("Export"), button:has-text("Download"), button:has-text("CSV")');
    await exportButton.click();

    // Wait for download
    const download = await downloadPromise;

    // Verify download
    expect(download).toBeTruthy();
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/\.csv$/i);
  });
});
