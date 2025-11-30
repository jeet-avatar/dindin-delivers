# EatFair Delivery - Beta Tester Guide

Welcome to the EatFair Delivery beta testing program! 🎉

---

## 📱 **Apps to Install**

You'll be testing **three interconnected apps**:

1. **Customer App** - Order food from restaurants
2. **Partner App** - Manage restaurant orders
3. **Delivery App** - Handle deliveries

### **Installation**

Download and install all three APKs:

```bash
# If using ADB (Android Debug Bridge)
adb install app-debug.apk
adb install partner-debug.apk
adb install orderapp-debug.apk
```

Or transfer the APKs to your device and install manually.

---

## 🧪 **Test Scenarios**

### **Scenario 1: Complete Order Flow** (20 minutes)

#### **As Customer**:
1. Open **Customer App**
2. Register/Login with email
3. Browse restaurants
4. Select "Natraj Restaurant"
5. Add items to cart:
   - Garlic Naan (x2)
   - Chicken Tikka Masala (x1)
6. View cart
7. Add delivery address
8. Place order
9. Track order in real-time

#### **As Partner**:
1. Open **Partner App**
2. See new order notification
3. Go to "Orders" tab
4. Update order status:
   - ORDER_PLACED → PREPARING
   - PREPARING → READY
5. View dashboard stats update

#### **As Delivery Driver**:
1. Open **Delivery App**
2. See order appear in list
3. View order details

**Expected**: Order flows through all three apps in real-time

---

### **Scenario 2: Restaurant Browsing** (10 minutes)

1. Open Customer App
2. Search for restaurants
3. Filter by cuisine type
4. View restaurant details
5. Browse menu by category
6. Check item descriptions

**Expected**: Smooth navigation, clear information

---

### **Scenario 3: Address Management** (10 minutes)

1. Go to Profile → Saved Addresses
2. Add new address using map
3. Enter address details
4. Save address
5. Edit existing address
6. Use address in checkout

**Expected**: Google Maps integration works, addresses save correctly

---

### **Scenario 4: Partner Menu Management** (10 minutes)

1. Open Partner App
2. Go to "Menu" tab
3. View existing menu items
4. Toggle item availability
5. Try adding new item (if implemented)

**Expected**: Menu updates reflect in Customer App

---

## 🐛 **What to Test**

### **Functionality**
- [ ] User registration/login
- [ ] Restaurant browsing
- [ ] Search functionality
- [ ] Cart management
- [ ] Order placement
- [ ] Real-time order tracking
- [ ] Address management
- [ ] Profile editing
- [ ] Order history
- [ ] Partner dashboard
- [ ] Order status updates
- [ ] Menu management

### **User Experience**
- [ ] App loading speed
- [ ] Navigation clarity
- [ ] Button responsiveness
- [ ] Text readability
- [ ] Image loading
- [ ] Error messages
- [ ] Offline behavior

### **Edge Cases**
- [ ] Empty cart checkout
- [ ] Invalid email/password
- [ ] Network disconnection
- [ ] App backgrounding
- [ ] Multiple orders
- [ ] Rapid button clicking

---

## ⚠️ **Known Limitations**

This is a **BETA** version with some limitations:

### **Security**
- ⚠️ Test mode - data is not fully secured
- ⚠️ Anyone can view/edit data (for testing purposes)

### **Payments**
- ⚠️ Dummy payment system (no real charges)
- ⚠️ All orders will show as "paid"

### **Notifications**
- ⚠️ Limited push notifications
- ⚠️ May need to manually refresh to see updates

### **Delivery App**
- ⚠️ Basic features only
- ⚠️ No navigation/maps yet
- ⚠️ No delivery confirmation

### **Data**
- ⚠️ Limited restaurant selection (2 restaurants)
- ⚠️ Sample menu items
- ⚠️ Test data may be reset periodically

---

## 📝 **How to Report Issues**

### **Bug Report Template**

```
**App**: Customer / Partner / Delivery
**Device**: [Your device model]
**Android Version**: [e.g., Android 13]
**Issue**: [Brief description]

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happened]

**Screenshots**: [If applicable]
```

### **Feedback Categories**

1. **Crashes** 🔴 - App closes unexpectedly
2. **Bugs** 🟡 - Feature doesn't work as expected
3. **UI/UX** 🔵 - Design or usability issues
4. **Performance** 🟣 - Slow loading, lag
5. **Suggestions** 🟢 - Feature requests, improvements

---

## 🎯 **Focus Areas**

Please pay special attention to:

1. **Real-time Sync**: Do order updates appear instantly across apps?
2. **Navigation**: Can you easily find what you're looking for?
3. **Cart Management**: Does adding/removing items work smoothly?
4. **Order Flow**: Is the checkout process clear and intuitive?
5. **Error Handling**: Do you get helpful messages when something goes wrong?

---

## 📊 **Test Data**

### **Sample Restaurants**
- **Natraj Restaurant** (Indian cuisine)
- **Desi Laddu House** (Sweets)

### **Sample Menu Items**
- Garlic Naan ($5)
- Chicken Tikka Masala ($24)
- Saffron Rice ($5)
- Kaju Barfi ($42)

### **Test Credentials**
You can create your own account or use:
- Email: `tester@eatfair.com`
- Password: `Test123!`

---

## ⏱️ **Testing Timeline**

**Beta Period**: 2-4 weeks  
**Expected Time Commitment**: 2-3 hours total

### **Week 1**: Core Functionality
- Test basic order flow
- Report critical bugs

### **Week 2**: Edge Cases
- Test unusual scenarios
- Provide UX feedback

### **Week 3**: Refinement
- Retest fixed issues
- Final feedback

---

## 🏆 **Beta Tester Benefits**

- 🎁 Early access to the platform
- 💰 Exclusive launch discounts
- 🌟 Recognition as founding tester
- 📣 Direct input on features

---

## 📞 **Support**

**Questions or Issues?**
- Email: support@eatfair.com
- Feedback Form: [Link to Google Form]
- Slack Channel: #beta-testers

---

## ✅ **Quick Start Checklist**

- [ ] Install all three apps
- [ ] Create account in Customer App
- [ ] Complete Scenario 1 (full order flow)
- [ ] Test at least 3 other scenarios
- [ ] Report any bugs found
- [ ] Submit feedback form

---

## 🙏 **Thank You!**

Your feedback is invaluable in making EatFair Delivery the best food delivery platform. We appreciate your time and effort in helping us improve!

**Happy Testing!** 🚀
