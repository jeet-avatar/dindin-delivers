# 📱 EatFair Delivery Driver App - Design Mockups

## Your Original Design Screens (Restored)

---

## 🏠 **Screen 1: Home Screen with Map**

```
┌─────────────────────────────────┐
│  ☰  EatFair Delivery    🔔  👤  │ ← Top Bar (White)
│                                 │
│  💰 Balance: $125.50           │ ← Earnings Display (Green)
├─────────────────────────────────┤
│                                 │
│         🗺️ GOOGLE MAPS         │
│                                 │
│    📍 Pickup Location           │
│         ↓ Route                 │
│    📍 Delivery Location         │
│                                 │
│                                 │
│                                 │
│                                 │
├─────────────────────────────────┤
│ ╭───────────────────────────╮   │ ← Bottom Sheet (Slides Up)
│ │ 🍕 Monica's Trattoria     │   │
│ │ Order #30VN15VD57         │   │
│ │                           │   │
│ │ 👤 Sabrina Lorenshtein    │   │
│ │ 📍 155 W 51st St, NY      │   │
│ │                           │   │
│ │ ┌───────────────────────┐ │   │
│ │ │  🚗 Start Delivery    │ │   │ ← Green Button
│ │ └───────────────────────┘ │   │
│ ╰───────────────────────────╯   │
└─────────────────────────────────┘
```

**Features**:
- Full-screen Google Maps with delivery route
- Real-time location tracking
- Pickup and delivery markers
- Sliding bottom sheet with order details
- Green "Start Delivery" action button
- Top bar with balance, notifications, profile

---

## 📋 **Screen 2: Order History**

```
┌─────────────────────────────────┐
│  ← Order History                │ ← Top Bar
├─────────────────────────────────┤
│  Balance          Total Earned  │
│  $125.50          $1,250.75     │ ← Earnings Summary
│  (Green)          (Black)       │
├─────────────────────────────────┤
│  🔍 Search here...              │ ← Search Bar
├─────────────────────────────────┤
│  All Orders              Date   │ ← Header
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ 🍕 Monica's Trattoria       │ │ ← Order Card
│ │ Order No: 30VN15VD57        │ │   (Green Border)
│ │                    $33.75   │ │
│ │                 20 Oct 2024 │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 🍔 Burger King              │ │ ← Order Card
│ │ Order No: 29AB12CD34        │ │   (Blue Border)
│ │                    $28.50   │ │   In Progress
│ │                 19 Oct 2024 │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 🍜 Asian Bistro             │ │ ← Order Card
│ │ Order No: 28XY56ZW78        │ │   (Red Border)
│ │                    $45.00   │ │   Cancelled
│ │                 18 Oct 2024 │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

**Features**:
- Earnings summary at top (Balance + Total Earned)
- Search functionality
- Order cards with:
  - Restaurant name
  - Order number
  - Amount (bold)
  - Date
  - Status-based colored borders
- Scrollable list

---

## 👤 **Screen 3: Profile Menu**

```
┌─────────────────────────────────┐
│  ← Profile                      │ ← Top Bar
├─────────────────────────────────┤
│         ┌─────────┐             │
│         │  👤    │             │ ← Profile Avatar
│         └─────────┘             │
│                                 │
│      John Driver                │ ← Name
│   john@example.com              │ ← Email
│                                 │
│   ┌─────────────────┐           │
│   │  Edit Profile   │           │ ← Button
│   └─────────────────┘           │
├─────────────────────────────────┤
│  👤 Personal Info            → │ ← Menu Items
│  🪪 Drive License             → │
│  🚗 Vehicle Registration      → │
│  ⚙️  Settings                 → │
│  ❓ Support & FAQ             → │
│  🛡️  Privacy Policy           → │
│  🔒 Change Password           → │
│  ⭐ Rating                    → │
│                                 │
│  🚪 Logout                      │ ← Red Text
└─────────────────────────────────┘
```

**Features**:
- Profile header with avatar, name, email
- Edit Profile button
- Menu items with icons and arrows
- Logout option at bottom (red)
- Clean, organized layout

---

## 📝 **Screen 4: Personal Info**

```
┌─────────────────────────────────┐
│  ← Personal Information         │
├─────────────────────────────────┤
│                                 │
│  Full Name                      │
│  ┌─────────────────────────┐   │
│  │ John Driver             │   │ ← Text Field
│  └─────────────────────────┘   │
│                                 │
│  Email Address                  │
│  ┌─────────────────────────┐   │
│  │ john@example.com        │   │
│  └─────────────────────────┘   │
│                                 │
│  Phone Number                   │
│  ┌─────────────────────────┐   │
│  │ +1 (555) 123-4567       │   │
│  └─────────────────────────┘   │
│                                 │
│  Date of Birth                  │
│  ┌─────────────────────────┐   │
│  │ 01/15/1990              │   │
│  └─────────────────────────┘   │
│                                 │
│  Address                        │
│  ┌─────────────────────────┐   │
│  │ 123 Main St, NY         │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌───────────────────────────┐ │
│  │     Save Changes          │ │ ← Save Button
│  └───────────────────────────┘ │
└─────────────────────────────────┘
```

---

## 🪪 **Screen 5: Drive License**

```
┌─────────────────────────────────┐
│  ← Drive License                │
├─────────────────────────────────┤
│                                 │
│  License Number                 │
│  ┌─────────────────────────┐   │
│  │ DL123456789             │   │
│  └─────────────────────────┘   │
│                                 │
│  Expiry Date                    │
│  ┌─────────────────────────┐   │
│  │ 12/31/2025              │   │
│  └─────────────────────────┘   │
│                                 │
│  Upload License Photo           │
│  ┌─────────────────────────┐   │
│  │                         │   │
│  │     📷 Upload Photo     │   │ ← Upload Area
│  │                         │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌───────────────────────────┐ │
│  │     Save                  │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
```

---

## 🚗 **Screen 6: Vehicle Registration**

```
┌─────────────────────────────────┐
│  ← Vehicle Registration         │
├─────────────────────────────────┤
│                                 │
│  Vehicle Type                   │
│  ┌─────────────────────────┐   │
│  │ Car ▼                   │   │ ← Dropdown
│  └─────────────────────────┘   │
│                                 │
│  Vehicle Make                   │
│  ┌─────────────────────────┐   │
│  │ Toyota                  │   │
│  └─────────────────────────┘   │
│                                 │
│  Vehicle Model                  │
│  ┌─────────────────────────┐   │
│  │ Camry                   │   │
│  └─────────────────────────┘   │
│                                 │
│  License Plate                  │
│  ┌─────────────────────────┐   │
│  │ ABC-1234                │   │
│  └─────────────────────────┘   │
│                                 │
│  Year                           │
│  ┌─────────────────────────┐   │
│  │ 2020                    │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌───────────────────────────┐ │
│  │     Save                  │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
```

---

## 🔐 **Screen 7: Login Screen**

```
┌─────────────────────────────────┐
│                                 │
│         🍕 EatFair              │ ← Logo
│      Delivery Driver            │
│                                 │
│                                 │
│  Email                          │
│  ┌─────────────────────────┐   │
│  │ 📧 Enter your email     │   │
│  └─────────────────────────┘   │
│                                 │
│  Password                       │
│  ┌─────────────────────────┐   │
│  │ 🔒 Enter password       │   │
│  └─────────────────────────┘   │
│                                 │
│         Forgot Password?        │ ← Link
│                                 │
│  ┌───────────────────────────┐ │
│  │       Login               │ │ ← Primary Button
│  └───────────────────────────┘ │
│                                 │
│  Don't have an account?         │
│         Sign Up                 │ ← Link
│                                 │
└─────────────────────────────────┘
```

---

## 📊 **Screen 8: Earnings Chart** (Implied from Vico library)

```
┌─────────────────────────────────┐
│  ← Earnings                     │
├─────────────────────────────────┤
│                                 │
│  This Week                      │
│  $450.25                        │ ← Total
│                                 │
│  ┌─────────────────────────┐   │
│  │     📊 Bar Chart        │   │ ← Chart
│  │  │                      │   │
│  │  │  ▄                   │   │
│  │  │  █   ▄               │   │
│  │  │  █   █   ▄   ▄       │   │
│  │  │  █   █   █   █   ▄   │   │
│  │  └──────────────────────│   │
│  │  M   T   W   T   F   S  │   │
│  └─────────────────────────┘   │
│                                 │
│  Daily Breakdown:               │
│  Monday    $75.50               │
│  Tuesday   $95.00               │
│  Wednesday $80.25               │
│  Thursday  $85.00               │
│  Friday    $65.50               │
│  Saturday  $49.00               │
└─────────────────────────────────┘
```

---

## 🎨 **Design System**

### **Colors** (Source: iOS Theme.swift):
- **Brand Green**: #06C167 - Primary brand color, earnings, success states
- **Brand Orange**: #F2994A - Accent color, buttons, highlights
- **Background**: #F5F5F5 (BrandGrey)
- **Text Primary**: #101010 (BrandBlack)
- **Text Secondary**: #757575 (TextGrey)
- **Error**: #F44336
- **In Progress**: Blue (Primary Container)
- **Completed**: Green (Tertiary Container)

### **Typography**:
- **Headers**: Bold, 24sp
- **Body**: Regular, 16sp
- **Small Text**: 13sp
- **Amounts**: Bold, 24sp (for earnings)

### **Components**:
- **Cards**: White with subtle shadow, 12dp rounded corners
- **Buttons**: Rounded, 12dp corners, bold text
- **Text Fields**: Outlined, 12dp rounded, light gray background
- **Icons**: Material Icons Extended

---

## ✅ **All Screens Included**

1. ✅ Home Screen (Map + Order Sheet)
2. ✅ Order History
3. ✅ Profile Menu
4. ✅ Personal Info
5. ✅ Drive License
6. ✅ Vehicle Registration
7. ✅ Settings
8. ✅ Support & FAQ
9. ✅ Privacy Policy
10. ✅ Change Password
11. ✅ Rating
12. ✅ Welcome Screen
13. ✅ Login Screen
14. ✅ Register Screen

---

## 🚀 **To See the Actual Design**

Install the app on your device:
```bash
adb install orderapp/build/outputs/apk/debug/orderapp-debug.apk
```

Your original design is fully restored and ready to use!
