#!/usr/bin/env node
// EatFair Driver Data Population Script
// Run: node populate-driver-data.js

console.log('🚗 EatFair Driver Profile Data\n');
console.log('Copy and paste these into Firebase Console:\n');
console.log('=' .repeat(70));

// Sample driver data with all professional fields
const sampleDrivers = [
    {
        documentId: "driver_michael_001",
        data: {
            name: "Michael Johnson",
            email: "michael.johnson@email.com",
            phone: "+1 (555) 123-4567",
            profileImageUrl: "https://randomuser.me/api/portraits/men/32.jpg",
            dateOfBirth: Date.now() - (30 * 365 * 24 * 60 * 60 * 1000),

            address: {
                street: "1234 Main Street",
                unit: "Apt 5B",
                city: "San Francisco",
                state: "CA",
                zipCode: "94102",
                country: "USA"
            },

            driversLicense: {
                licenseNumber: "D1234567",
                state: "CA",
                expirationDate: Date.now() + (2 * 365 * 24 * 60 * 60 * 1000),
                licenseClass: "C",
                frontImageUrl: null,
                backImageUrl: null,
                isVerified: true,
                verifiedAt: Date.now() - (30 * 24 * 60 * 60 * 1000)
            },

            vehicle: {
                make: "Toyota",
                model: "Camry",
                year: 2022,
                color: "Silver",
                licensePlate: "8ABC123",
                state: "CA",
                vehicleType: "Sedan",
                frontImageUrl: null,
                sideImageUrl: null,
                backImageUrl: null,
                registrationNumber: "REG123456",
                registrationExpirationDate: Date.now() + (365 * 24 * 60 * 60 * 1000),
                isVerified: true
            },

            vehicleType: "Car",
            licensePlate: "8ABC123",

            insurance: {
                provider: "State Farm",
                policyNumber: "SF-123456789",
                expirationDate: Date.now() + (180 * 24 * 60 * 60 * 1000),
                coverageType: "full_coverage",
                insuranceCardImageUrl: null,
                isVerified: true
            },

            bankAccount: {
                bankName: "Chase Bank",
                accountHolderName: "Michael Johnson",
                accountType: "checking",
                accountNumberLast4: "4567",
                isVerified: true,
                stripeConnectId: null
            },

            isOnline: true,
            isApproved: true,
            approvalStatus: "approved",
            currentLatitude: 37.7749,
            currentLongitude: -122.4194,
            lastActive: Date.now(),
            currentSessionId: null,

            stats: {
                rating: 4.92,
                totalDeliveries: 1547,
                completedDeliveries: 1532,
                cancelledDeliveries: 15,
                totalEarnings: 45892.50,
                totalDistance: 8234.5,
                totalOnlineTime: 1250.5,
                acceptanceRate: 94.5,
                completionRate: 99.0,
                onTimeRate: 97.2,
                weeklyDeliveries: 42,
                weeklyEarnings: 892.30,
                weeklyHours: 38.0,
                weeklyDistance: 156.4,
                weekStartDate: Date.now() - (3 * 24 * 60 * 60 * 1000)
            },

            preferences: {
                maxDeliveryDistance: 10.0,
                preferredAreas: ["94102", "94103", "94107"],
                acceptCashOrders: true,
                notificationsEnabled: true,
                soundEnabled: true,
                autoAcceptOrders: false,
                preferredShifts: ["morning", "afternoon", "evening"]
            },

            createdAt: Date.now() - (365 * 24 * 60 * 60 * 1000),
            updatedAt: Date.now(),
            onboardingCompletedAt: Date.now() - (360 * 24 * 60 * 60 * 1000),
            backgroundCheckStatus: "passed",
            backgroundCheckDate: Date.now() - (350 * 24 * 60 * 60 * 1000)
        }
    },
    {
        documentId: "driver_sarah_002",
        data: {
            name: "Sarah Williams",
            email: "sarah.williams@email.com",
            phone: "+1 (555) 234-5678",
            profileImageUrl: "https://randomuser.me/api/portraits/women/44.jpg",
            dateOfBirth: Date.now() - (28 * 365 * 24 * 60 * 60 * 1000),

            address: {
                street: "5678 Oak Avenue",
                unit: null,
                city: "Los Angeles",
                state: "CA",
                zipCode: "90001",
                country: "USA"
            },

            driversLicense: {
                licenseNumber: "D7654321",
                state: "CA",
                expirationDate: Date.now() + (3 * 365 * 24 * 60 * 60 * 1000),
                licenseClass: "C",
                isVerified: true
            },

            vehicle: {
                make: "Honda",
                model: "Civic",
                year: 2023,
                color: "Blue",
                licensePlate: "7XYZ789",
                state: "CA",
                vehicleType: "Sedan",
                isVerified: true
            },

            vehicleType: "Car",
            licensePlate: "7XYZ789",

            insurance: {
                provider: "Geico",
                policyNumber: "GK-987654321",
                expirationDate: Date.now() + (240 * 24 * 60 * 60 * 1000),
                coverageType: "full_coverage",
                isVerified: true
            },

            bankAccount: {
                bankName: "Bank of America",
                accountHolderName: "Sarah Williams",
                accountType: "checking",
                accountNumberLast4: "8901",
                isVerified: true
            },

            isOnline: false,
            isApproved: true,
            approvalStatus: "approved",
            currentLatitude: 34.0522,
            currentLongitude: -118.2437,
            lastActive: Date.now() - (2 * 60 * 60 * 1000),

            stats: {
                rating: 4.88,
                totalDeliveries: 892,
                completedDeliveries: 885,
                cancelledDeliveries: 7,
                totalEarnings: 28456.80,
                totalDistance: 4521.3,
                totalOnlineTime: 720.0,
                acceptanceRate: 96.2,
                completionRate: 99.2,
                onTimeRate: 98.1,
                weeklyDeliveries: 35,
                weeklyEarnings: 756.40,
                weeklyHours: 32.0,
                weeklyDistance: 128.7,
                weekStartDate: Date.now() - (3 * 24 * 60 * 60 * 1000)
            },

            preferences: {
                maxDeliveryDistance: 8.0,
                preferredAreas: ["90001", "90002", "90003"],
                acceptCashOrders: false,
                notificationsEnabled: true,
                soundEnabled: true,
                autoAcceptOrders: false,
                preferredShifts: ["afternoon", "evening"]
            },

            createdAt: Date.now() - (180 * 24 * 60 * 60 * 1000),
            updatedAt: Date.now(),
            backgroundCheckStatus: "passed"
        }
    },
    {
        documentId: "driver_james_003",
        data: {
            name: "James Rodriguez",
            email: "james.rodriguez@email.com",
            phone: "+1 (555) 345-6789",
            profileImageUrl: "https://randomuser.me/api/portraits/men/67.jpg",
            dateOfBirth: Date.now() - (35 * 365 * 24 * 60 * 60 * 1000),

            address: {
                street: "9012 Pine Road",
                city: "San Diego",
                state: "CA",
                zipCode: "92101",
                country: "USA"
            },

            driversLicense: {
                licenseNumber: "D9876543",
                state: "CA",
                expirationDate: Date.now() + (18 * 30 * 24 * 60 * 60 * 1000),
                licenseClass: "C",
                isVerified: true
            },

            vehicle: {
                make: "Ford",
                model: "F-150",
                year: 2021,
                color: "Black",
                licensePlate: "5TRK456",
                state: "CA",
                vehicleType: "Truck",
                isVerified: true
            },

            vehicleType: "Truck",
            licensePlate: "5TRK456",

            insurance: {
                provider: "Progressive",
                policyNumber: "PR-456789123",
                expirationDate: Date.now() + (90 * 24 * 60 * 60 * 1000),
                coverageType: "full_coverage",
                isVerified: true
            },

            bankAccount: {
                bankName: "Wells Fargo",
                accountHolderName: "James Rodriguez",
                accountType: "checking",
                accountNumberLast4: "2345",
                isVerified: true
            },

            isOnline: true,
            isApproved: true,
            approvalStatus: "approved",
            currentLatitude: 32.7157,
            currentLongitude: -117.1611,
            lastActive: Date.now(),

            stats: {
                rating: 4.95,
                totalDeliveries: 2341,
                completedDeliveries: 2328,
                cancelledDeliveries: 13,
                totalEarnings: 72450.25,
                totalDistance: 12456.8,
                totalOnlineTime: 1890.5,
                acceptanceRate: 97.8,
                completionRate: 99.4,
                onTimeRate: 98.5,
                weeklyDeliveries: 58,
                weeklyEarnings: 1245.60,
                weeklyHours: 45.0,
                weeklyDistance: 234.2,
                weekStartDate: Date.now() - (3 * 24 * 60 * 60 * 1000)
            },

            preferences: {
                maxDeliveryDistance: 15.0,
                preferredAreas: ["92101", "92102", "92103", "92104"],
                acceptCashOrders: true,
                notificationsEnabled: true,
                soundEnabled: true,
                autoAcceptOrders: true,
                preferredShifts: ["morning", "afternoon", "evening", "night"]
            },

            createdAt: Date.now() - (2 * 365 * 24 * 60 * 60 * 1000),
            updatedAt: Date.now(),
            backgroundCheckStatus: "passed"
        }
    }
];

// Output each driver
sampleDrivers.forEach((driver, index) => {
    console.log(`\n📝 Collection: drivers`);
    console.log(`Document ID: ${driver.documentId}`);
    console.log(`\nDriver ${index + 1}: ${driver.data.name}`);
    console.log(`  🚗 Vehicle: ${driver.data.vehicle.year} ${driver.data.vehicle.make} ${driver.data.vehicle.model}`);
    console.log(`  ⭐ Rating: ${driver.data.stats.rating}`);
    console.log(`  📊 Deliveries: ${driver.data.stats.totalDeliveries}`);
    console.log(`  💰 Total Earnings: $${driver.data.stats.totalEarnings.toLocaleString()}`);
    console.log(`\nJSON Data:`);
    console.log(JSON.stringify(driver.data, null, 2));
    console.log('\n' + '='.repeat(70));
});

console.log('\n\n📋 FIREBASE SCHEMA REFERENCE');
console.log('=' .repeat(70));
console.log(`
Collection: drivers/{driverId}

Fields:
├── Personal Information
│   ├── name (string)
│   ├── email (string)
│   ├── phone (string)
│   ├── profileImageUrl (string, optional)
│   └── dateOfBirth (number, timestamp)
│
├── address (map)
│   ├── street (string)
│   ├── unit (string, optional)
│   ├── city (string)
│   ├── state (string)
│   ├── zipCode (string)
│   └── country (string)
│
├── driversLicense (map)
│   ├── licenseNumber (string)
│   ├── state (string)
│   ├── expirationDate (number, timestamp)
│   ├── licenseClass (string: A, B, C, D, M)
│   ├── frontImageUrl (string, optional)
│   ├── backImageUrl (string, optional)
│   ├── isVerified (boolean)
│   └── verifiedAt (number, timestamp)
│
├── vehicle (map)
│   ├── make (string)
│   ├── model (string)
│   ├── year (number)
│   ├── color (string)
│   ├── licensePlate (string)
│   ├── state (string)
│   ├── vehicleType (string: Sedan, SUV, Truck, etc.)
│   ├── frontImageUrl (string, optional)
│   ├── sideImageUrl (string, optional)
│   ├── backImageUrl (string, optional)
│   └── isVerified (boolean)
│
├── insurance (map)
│   ├── provider (string)
│   ├── policyNumber (string)
│   ├── expirationDate (number, timestamp)
│   ├── coverageType (string)
│   ├── insuranceCardImageUrl (string, optional)
│   └── isVerified (boolean)
│
├── bankAccount (map)
│   ├── bankName (string)
│   ├── accountHolderName (string)
│   ├── accountType (string: checking, savings)
│   ├── accountNumberLast4 (string)
│   ├── isVerified (boolean)
│   └── stripeConnectId (string, optional)
│
├── Status
│   ├── isOnline (boolean)
│   ├── isApproved (boolean)
│   ├── approvalStatus (string: pending, approved, rejected, suspended)
│   ├── currentLatitude (number)
│   ├── currentLongitude (number)
│   └── lastActive (number, timestamp)
│
├── stats (map)
│   ├── rating (number: 1.0-5.0)
│   ├── totalDeliveries (number)
│   ├── completedDeliveries (number)
│   ├── cancelledDeliveries (number)
│   ├── totalEarnings (number)
│   ├── totalDistance (number, miles)
│   ├── totalOnlineTime (number, hours)
│   ├── acceptanceRate (number: 0-100)
│   ├── completionRate (number: 0-100)
│   ├── onTimeRate (number: 0-100)
│   ├── weeklyDeliveries (number)
│   ├── weeklyEarnings (number)
│   ├── weeklyHours (number)
│   └── weeklyDistance (number)
│
├── preferences (map)
│   ├── maxDeliveryDistance (number, miles)
│   ├── preferredAreas (array of strings)
│   ├── acceptCashOrders (boolean)
│   ├── notificationsEnabled (boolean)
│   ├── soundEnabled (boolean)
│   ├── autoAcceptOrders (boolean)
│   └── preferredShifts (array of strings)
│
└── Metadata
    ├── createdAt (number, timestamp)
    ├── updatedAt (number, timestamp)
    ├── backgroundCheckStatus (string: pending, passed, failed)
    └── backgroundCheckDate (number, timestamp)
`);

console.log('\n✅ To add this data to Firebase:');
console.log('   1. Go to: https://console.firebase.google.com');
console.log('   2. Select your project → Firestore Database');
console.log('   3. Click "Start collection" or select "drivers"');
console.log('   4. Add each document with the Document ID shown above');
console.log('   5. Copy/paste the JSON data for each driver\n');

console.log('📱 Or use Firebase CLI with a service account:');
console.log('   1. Download service account key from Firebase Console');
console.log('   2. Set: export GOOGLE_APPLICATION_CREDENTIALS="path/to/key.json"');
console.log('   3. Run this script again\n');
