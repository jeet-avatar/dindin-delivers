import os

private let logger = Logger(subsystem: "com.dollorai.customer", category: "RideRequestView")

import SwiftUI
import MapKit
import CoreLocation
import Combine
import FirebaseAuth
import EatFairShared

/// Uber-style Ride Request View for Customers
struct RideRequestView: View {
    @StateObject private var viewModel = RideRequestViewModel()
    @StateObject private var locationManager = RideLocationManager()
    @EnvironmentObject var authViewModel: AuthViewModel
    @Environment(\.dismiss) var dismiss

    @State private var showPickupSearch = false
    @State private var showDropoffSearch = false
    @State private var mapPosition: MapCameraPosition = .userLocation(fallback: .automatic)

    var body: some View {
        ZStack {
            // Map Background
            RideMapBackground(
                pickupLocation: viewModel.pickupAddress,
                dropoffLocation: viewModel.dropoffAddress,
                mapPosition: $mapPosition
            )
            .ignoresSafeArea(edges: .top)
            .onAppear {
                // Request location permission on appear
                locationManager.requestLocationPermission()
            }

            // Bottom Sheet
            VStack {
                Spacer()

                RideBottomSheet(
                    viewModel: viewModel,
                    showPickupSearch: $showPickupSearch,
                    showDropoffSearch: $showDropoffSearch,
                    onRequestRide: requestRide,
                    onDismiss: { dismiss() }
                )
            }

            // Fare Estimation Overlay (opaque — prevents reading default values)
            if viewModel.isEstimatingFare {
                Color.white.opacity(0.95)
                    .ignoresSafeArea()
                ProgressView("Estimating fare...")
                    .padding()
                    .background(Color.white)
                    .cornerRadius(12)
                    .shadow(radius: 4)
            }

            // Ride Request Loading Overlay
            if viewModel.isLoading {
                Color.black.opacity(0.3)
                    .ignoresSafeArea()
                ProgressView("Requesting ride...")
                    .padding()
                    .background(Color.white)
                    .cornerRadius(12)
            }
        }
        .navigationBarHidden(true)
        .sheet(isPresented: $showPickupSearch) {
            RideLocationSearchView(
                title: "Pickup Location",
                onSelect: { address in
                    viewModel.setPickupLocation(
                        street: address.street,
                        city: address.city,
                        state: address.state,
                        zip: address.zip,
                        lat: address.lat,
                        lng: address.lng
                    )
                    showPickupSearch = false
                }
            )
        }
        .sheet(isPresented: $showDropoffSearch) {
            RideLocationSearchView(
                title: "Dropoff Location",
                onSelect: { address in
                    viewModel.setDropoffLocation(
                        street: address.street,
                        city: address.city,
                        state: address.state,
                        zip: address.zip,
                        lat: address.lat,
                        lng: address.lng
                    )
                    showDropoffSearch = false
                }
            )
        }
        .alert("Error", isPresented: $viewModel.showError) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(viewModel.errorMessage ?? "An error occurred")
        }
        .fullScreenCover(isPresented: $viewModel.isRideActive) {
            RideTrackingView(viewModel: viewModel)
        }
    }

    private func requestRide() {
        // Resolve customer name: viewModel property > UserDefaults > email prefix > last resort
        var name = authViewModel.customerName
        if name.isEmpty {
            name = UserDefaults.standard.string(forKey: "p2p_customer_name") ?? ""
        }
        if name.isEmpty, !authViewModel.customerEmail.isEmpty {
            // Use email prefix (e.g. "john.doe" from "john.doe@example.com")
            name = authViewModel.customerEmail.components(separatedBy: "@").first ?? ""
        }
        if name.isEmpty {
            // Last resort fallback - should rarely occur since login always sets name
            name = "Customer"
        }
        let email = authViewModel.customerEmail

        viewModel.requestRide(
            customerName: name,
            customerEmail: email,
            customerPhone: UserDefaults.standard.string(forKey: "p2p_customer_phone") ?? Auth.auth().currentUser?.phoneNumber ?? ""
        )
    }
}

// MARK: - Ride Map Background
struct RideMapBackground: View {
    let pickupLocation: RideAddressInput?
    let dropoffLocation: RideAddressInput?
    @Binding var mapPosition: MapCameraPosition

    var body: some View {
        Map(position: $mapPosition) {
            // Pickup Marker
            if let pickup = pickupLocation {
                Annotation("Pickup", coordinate: CLLocationCoordinate2D(
                    latitude: pickup.lat,
                    longitude: pickup.lng
                )) {
                    RidePickupMarker()
                }
            }

            // Dropoff Marker
            if let dropoff = dropoffLocation {
                Annotation("Dropoff", coordinate: CLLocationCoordinate2D(
                    latitude: dropoff.lat,
                    longitude: dropoff.lng
                )) {
                    RideDropoffMarker()
                }
            }

            // User location
            UserAnnotation()
        }
        .mapStyle(.standard(pointsOfInterest: .excludingAll))
        .mapControls {
            MapUserLocationButton()
        }
        .onAppear {
            updateMapRegion()
        }
        .onChange(of: pickupLocation?.lat) { _, _ in updateMapRegion() }
        .onChange(of: dropoffLocation?.lat) { _, _ in updateMapRegion() }
    }

    private func updateMapRegion() {
        var coordinates: [CLLocationCoordinate2D] = []

        if let pickup = pickupLocation {
            coordinates.append(CLLocationCoordinate2D(latitude: pickup.lat, longitude: pickup.lng))
        }

        if let dropoff = dropoffLocation {
            coordinates.append(CLLocationCoordinate2D(latitude: dropoff.lat, longitude: dropoff.lng))
        }

        guard !coordinates.isEmpty else {
            // Default to user's location or a default region
            mapPosition = .userLocation(fallback: .automatic)
            return
        }

        let latitudes = coordinates.map { $0.latitude }
        let longitudes = coordinates.map { $0.longitude }

        guard let minLat = latitudes.min(),
              let maxLat = latitudes.max(),
              let minLon = longitudes.min(),
              let maxLon = longitudes.max() else {
            return
        }

        let centerLat = (minLat + maxLat) / 2
        let centerLon = (minLon + maxLon) / 2
        let spanLat = (maxLat - minLat) * 1.5 + 0.02
        let spanLon = (maxLon - minLon) * 1.5 + 0.02

        let region = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: centerLat, longitude: centerLon),
            span: MKCoordinateSpan(latitudeDelta: max(spanLat, 0.02), longitudeDelta: max(spanLon, 0.02))
        )

        mapPosition = .region(region)
    }
}

// MARK: - Map Markers
struct RidePickupMarker: View {
    var body: some View {
        VStack(spacing: 0) {
            ZStack {
                Circle()
                    .fill(Color.blue)
                    .frame(width: 44, height: 44)
                    .shadow(color: .black.opacity(0.3), radius: 4, x: 0, y: 2)

                Image(systemName: "figure.wave")
                    .font(.system(size: 20))
                    .foregroundColor(.white)
            }

            Image(systemName: "triangle.fill")
                .font(.system(size: 10))
                .foregroundColor(.blue)
                .rotationEffect(.degrees(180))
                .offset(y: -4)
        }
    }
}

struct RideDropoffMarker: View {
    var body: some View {
        VStack(spacing: 0) {
            ZStack {
                Circle()
                    .fill(Color.green)
                    .frame(width: 44, height: 44)
                    .shadow(color: .black.opacity(0.3), radius: 4, x: 0, y: 2)

                Image(systemName: "flag.checkered")
                    .font(.system(size: 20))
                    .foregroundColor(.white)
            }

            Image(systemName: "triangle.fill")
                .font(.system(size: 10))
                .foregroundColor(.green)
                .rotationEffect(.degrees(180))
                .offset(y: -4)
        }
    }
}

// MARK: - Ride Bottom Sheet
struct RideBottomSheet: View {
    @ObservedObject var viewModel: RideRequestViewModel
    @Binding var showPickupSearch: Bool
    @Binding var showDropoffSearch: Bool
    let onRequestRide: () -> Void
    let onDismiss: () -> Void

    @State private var showNegotiateSheet = false
    @State private var customFareOffer: String = ""

    var body: some View {
        VStack(spacing: 0) {
            // Handle
            RoundedRectangle(cornerRadius: 3)
                .fill(Color.gray.opacity(0.3))
                .frame(width: 40, height: 5)
                .padding(.top, 10)

            // Header
            HStack {
                Button(action: onDismiss) {
                    Image(systemName: "xmark")
                        .font(.title3)
                        .foregroundColor(.gray)
                }
                .accessibilityLabel("Close ride request")
                .accessibilityHint("Returns to the home screen")

                Spacer()

                Text("Find a Driver")
                    .font(.headline)

                Spacer()

                // Placeholder for balance
                Image(systemName: "xmark")
                    .font(.title3)
                    .foregroundColor(.clear)
            }
            .padding()

            Divider()

            // Location Inputs
            VStack(spacing: 0) {
                // Pickup
                Button(action: { showPickupSearch = true }) {
                    HStack(spacing: 12) {
                        ZStack {
                            Circle()
                                .fill(Color.blue.opacity(0.15))
                                .frame(width: 36, height: 36)
                            Circle()
                                .fill(Color.blue)
                                .frame(width: 12, height: 12)
                        }

                        VStack(alignment: .leading, spacing: 2) {
                            Text("PICKUP")
                                .font(.caption2)
                                .fontWeight(.semibold)
                                .foregroundColor(.blue)

                            Text(viewModel.pickupAddress?.fullAddress ?? "Select pickup location")
                                .font(.subheadline)
                                .foregroundColor(viewModel.pickupAddress != nil ? .primary : .gray)
                                .lineLimit(1)
                        }

                        Spacer()

                        Image(systemName: "chevron.right")
                            .foregroundColor(.gray)
                            .font(.caption)
                    }
                    .padding()
                }
                .accessibilityLabel("Select pickup location")
                .accessibilityHint("Opens location search to set where to be picked up")

                // Connector
                HStack {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .frame(width: 2, height: 24)
                        .padding(.leading, 29)
                    Spacer()
                }

                // Dropoff
                Button(action: { showDropoffSearch = true }) {
                    HStack(spacing: 12) {
                        ZStack {
                            Circle()
                                .fill(Color.green.opacity(0.15))
                                .frame(width: 36, height: 36)
                            Image(systemName: "mappin")
                                .foregroundColor(.green)
                                .font(.system(size: 14, weight: .bold))
                        }

                        VStack(alignment: .leading, spacing: 2) {
                            Text("DROPOFF")
                                .font(.caption2)
                                .fontWeight(.semibold)
                                .foregroundColor(.green)

                            Text(viewModel.dropoffAddress?.fullAddress ?? "Select dropoff location")
                                .font(.subheadline)
                                .foregroundColor(viewModel.dropoffAddress != nil ? .primary : .gray)
                                .lineLimit(1)
                        }

                        Spacer()

                        Image(systemName: "chevron.right")
                            .foregroundColor(.gray)
                            .font(.caption)
                    }
                    .padding()
                }
                .accessibilityLabel("Select dropoff location")
                .accessibilityHint("Opens location search to set your destination")
            }

            Divider()

            // TNC-12: Accessibility Request
            if viewModel.canRequestRide {
                VStack(alignment: .leading, spacing: 12) {
                    Toggle(isOn: $viewModel.accessibilityRequested) {
                        HStack(spacing: 8) {
                            Image(systemName: "figure.roll")
                                .foregroundColor(.blue)
                            Text("I need an accessible vehicle")
                                .font(.subheadline.weight(.medium))
                        }
                    }
                    .tint(.blue)

                    if viewModel.accessibilityRequested {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Select your needs:")
                                .font(.caption)
                                .foregroundColor(.secondary)

                            ForEach(AccessibilityOption.allCases, id: \.self) { option in
                                HStack {
                                    Image(systemName: viewModel.selectedAccessibilityOptions.contains(option) ? "checkmark.square.fill" : "square")
                                        .foregroundColor(viewModel.selectedAccessibilityOptions.contains(option) ? .blue : .gray)
                                    Text(option.label)
                                        .font(.subheadline)
                                    Spacer()
                                }
                                .contentShape(Rectangle())
                                .onTapGesture {
                                    viewModel.toggleAccessibilityOption(option)
                                }
                            }

                            TextField("Additional accessibility notes (optional)", text: $viewModel.accessibilityNotes, axis: .vertical)
                                .textFieldStyle(.roundedBorder)
                                .lineLimit(2...4)
                                .font(.subheadline)
                        }
                        .padding(.leading, 4)
                        .transition(.opacity.combined(with: .move(edge: .top)))
                    }
                }
                .padding(.horizontal)
                .animation(.easeInOut(duration: 0.2), value: viewModel.accessibilityRequested)

                Divider()
            }

            // Notes (optional)
            if viewModel.canRequestRide {
                HStack(spacing: 12) {
                    Image(systemName: "note.text")
                        .foregroundColor(.gray)

                    TextField("Add notes for driver (optional)", text: $viewModel.notes)
                        .font(.subheadline)
                }
                .padding()

                Divider()
            }

            // Price Summary - World Class Fare Breakdown (Scrollable to ensure buttons visible)
            // Gated on fareEstimateReceived to prevent showing default values before API responds
            if viewModel.canRequestRide && viewModel.fareEstimateReceived {
                ScrollView {
                    VStack(spacing: 12) {
                    // Trip Estimate Header
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("SUGGESTED OFFER")
                                .font(.caption2)
                                .fontWeight(.semibold)
                                .foregroundColor(.secondary)
                            HStack(spacing: 12) {
                                Label(viewModel.estimatedDistanceText, systemImage: "road.lanes")
                                Label(viewModel.estimatedTimeText, systemImage: "clock")
                            }
                            .font(.subheadline)
                            .foregroundColor(.primary)
                        }
                        Spacer()
                        if viewModel.surgeMultiplier > 1.0 {
                            VStack(spacing: 2) {
                                Text("\(String(format: "%.1f", viewModel.surgeMultiplier))x")
                                    .font(.caption)
                                    .fontWeight(.bold)
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color.orange)
                                    .cornerRadius(6)
                                Text(viewModel.surgeLabel)
                                    .font(.caption2)
                                    .foregroundColor(.orange)
                            }
                        }
                    }
                    .padding(.vertical, 4)

                    Divider()

                    // Surge info banner
                    if viewModel.surgeMultiplier > 1.0 {
                        HStack(spacing: 6) {
                            Image(systemName: "flame.fill")
                                .foregroundColor(.orange)
                            Text("Prices are \(Int((viewModel.surgeMultiplier - 1) * 100))% higher due to \(viewModel.surgeLabel.lowercased())")
                                .font(.caption)
                                .foregroundColor(.orange)
                            Spacer()
                        }
                        .padding(8)
                        .background(Color.orange.opacity(0.1))
                        .cornerRadius(8)
                    }

                    // Suggested Payment Breakdown (Driver sets final price)
                    VStack(spacing: 6) {
                        // Base fare breakdown components
                        FareLineItem(label: "Base Fare", amount: viewModel.baseFare)
                        FareLineItem(label: "Distance (\(viewModel.estimatedDistanceText))", amount: viewModel.distanceFee)
                        FareLineItem(label: "Time (\(viewModel.estimatedTimeText))", amount: viewModel.timeFee)

                        Divider()

                        // Tiered Connection Fee with tier description
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Connection Fee")
                                    .font(.subheadline)
                                Text(viewModel.platformFeeTierDescription)
                                    .font(.caption2)
                                    .foregroundColor(.orange)
                            }
                            Spacer()
                            Text("$\(String(format: "%.2f", viewModel.platformFee))")
                                .font(.subheadline)
                                .fontWeight(.medium)
                        }

                        if viewModel.taxAmount > 0 {
                            FareLineItem(
                                label: "Tax (\(String(format: "%.2f", viewModel.taxRate * 100))%)",
                                amount: viewModel.taxAmount
                            )
                        }

                        Divider()

                        // 96% to driver messaging in green
                        HStack(spacing: 6) {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.green)
                                .font(.subheadline)
                            Text("\(AppConfig.shared.driverEarningsPercentage)% goes to your driver")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(.green)
                            Spacer()
                        }
                    }

                    Divider()

                    // Additional Amount for Driver
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Add Extra for Driver (Optional)")
                            .font(.subheadline)
                            .foregroundColor(.secondary)

                        HStack(spacing: 8) {
                            ForEach(AppConfig.shared.rideTipOptions, id: \.self) { amount in
                                Button(action: { viewModel.tip = amount }) {
                                    Text(amount == 0 ? "None" : "$\(Int(amount))")
                                        .font(.subheadline)
                                        .fontWeight(.medium)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 10)
                                        .background(viewModel.tip == amount ? Color.blue : Color.gray.opacity(0.1))
                                        .foregroundColor(viewModel.tip == amount ? .white : .primary)
                                        .cornerRadius(10)
                                }
                            }
                        }
                    }

                    Divider()

                    // Your Offer Summary
                    VStack(spacing: 8) {
                        HStack {
                            Text("Your Offer")
                                .font(.headline)
                            Spacer()
                            Text("$\(String(format: "%.2f", viewModel.totalAmount))")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.blue)
                        }

                        // Driver receives info
                        HStack {
                            Image(systemName: "person.fill.checkmark")
                                .foregroundColor(.green)
                            Text("Driver receives: $\(String(format: "%.2f", viewModel.driverEarnings))")
                                .font(.caption)
                                .foregroundColor(.green)
                            Text("(You pay driver directly)")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }

                    Divider()

                    // Legal Disclosures (P2P Rideshare Matchmaking)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("PEER-TO-PEER RIDESHARE")
                            .font(.caption2)
                            .fontWeight(.semibold)
                            .foregroundColor(.secondary)

                        Text("Dollor.ai connects riders with independent drivers. Drivers set their own rates and may accept, decline, or counter your offer. The connection fee is for using our matchmaking service. Transportation is provided directly by the driver, not Dollor.ai. By using this service, you agree to our Terms of Service.")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                            .fixedSize(horizontal: false, vertical: true)

                        HStack(spacing: 4) {
                            Image(systemName: "info.circle")
                                .font(.caption2)
                            Text("Connection fee: $\(String(format: "%.2f", viewModel.platformFee)) (tiered $1-$3) • Driver sets final price")
                                .font(.caption2)
                        }
                        .foregroundColor(.secondary)
                        .padding(.top, 2)
                    }
                    .padding(.vertical, 4)
                    }
                    .padding()
                }
                .frame(maxHeight: 320) // Limit height to ensure action buttons remain visible
            }

            // Action Buttons
            VStack(spacing: 12) {
                // Find Driver with Suggested Offer
                SwipeToConfirmButton(
                    label: "Slide to Find Driver • $\(String(format: "%.2f", viewModel.estimatedFare))",
                    accentColor: Theme.brandGreen,
                    isDisabled: !viewModel.canRequestRide,
                    onConfirm: onRequestRide
                )
                .padding(.horizontal, 24)
                .padding(.vertical, 8)

                // Make Custom Offer Button
                Button(action: { showNegotiateSheet = true }) {
                    HStack {
                        Image(systemName: "dollarsign.arrow.circlepath")
                        Text("Make a Different Offer")
                    }
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(Theme.brandOrange)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Theme.brandOrange.opacity(0.1))
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Theme.brandOrange.opacity(0.3), lineWidth: 1)
                    )
                }
                .disabled(!viewModel.canRequestRide)
                .accessibilityLabel("Make a different offer")
                .accessibilityHint("Opens negotiation to offer a custom fare amount")

                // Info text - P2P matchmaking disclaimer with tiered pricing
                HStack(spacing: 4) {
                    Image(systemName: "info.circle.fill")
                        .font(.caption2)
                        .foregroundColor(Theme.brandGreen)
                    Text("$1-$3 tiered connection fee • Drivers are independent")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            .padding()
        }
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.white)
                .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: -5)
        )
        .sheet(isPresented: $showNegotiateSheet) {
            PreRequestNegotiationSheet(
                viewModel: viewModel,
                isPresented: $showNegotiateSheet,
                onRequestWithOffer: { offer in
                    viewModel.initialFareOffer = offer
                    showNegotiateSheet = false
                    onRequestRide()
                }
            )
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
        }
    }
}

// MARK: - Pre-Request Negotiation Sheet
struct PreRequestNegotiationSheet: View {
    @ObservedObject var viewModel: RideRequestViewModel
    @Binding var isPresented: Bool
    let onRequestWithOffer: (Double) -> Void

    @State private var customOffer: String = ""
    @State private var selectedQuickOffer: Double? = nil

    private var estimatedFare: Double { viewModel.estimatedFare }
    private var platformFee: Double { AppConfig.shared.calculateRidesharePlatformFee(fareAmount: estimatedFare) }

    private var minFare: Double { AppConfig.shared.rideMinFare }

    private var quickOfferOptions: [Double] {
        let base = estimatedFare
        return [
            max(minFare, base * 0.6),  // 40% off
            max(minFare, base * 0.7),  // 30% off
            max(minFare, base * 0.8),  // 20% off
            max(minFare, base * 0.9)   // 10% off
        ].map { round($0 * 100) / 100 }
    }

    private var currentOffer: Double? {
        if let selected = selectedQuickOffer {
            return selected
        }
        if let custom = Double(customOffer), custom >= minFare {
            return custom
        }
        return nil
    }

    private var driverEarnings: Double {
        guard let offer = currentOffer else { return 0 }
        let taxRate = StateTaxRates.rate(for: viewModel.pickupAddress?.state ?? "TX")
        return offer - platformFee - (offer * taxRate)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    VStack(spacing: 8) {
                        ZStack {
                            Circle()
                                .fill(Theme.brandOrange.opacity(0.15))
                                .frame(width: 80, height: 80)
                            Image(systemName: "dollarsign.arrow.circlepath")
                                .font(.system(size: 36))
                                .foregroundColor(Theme.brandOrange)
                        }

                        Text("Make Your Offer")
                            .font(.title2)
                            .fontWeight(.bold)

                        Text("Independent drivers can accept, decline, or counter")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .padding(.top)

                    // Suggested vs Your Offer
                    HStack(spacing: 20) {
                        VStack(spacing: 4) {
                            Text("Suggested")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text("$\(String(format: "%.2f", estimatedFare))")
                                .font(.title3)
                                .fontWeight(.semibold)
                                .foregroundColor(.secondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.gray.opacity(0.1))
                        .cornerRadius(12)

                        VStack(spacing: 4) {
                            Text("Your Offer")
                                .font(.caption)
                                .foregroundColor(Theme.brandOrange)
                            Text(currentOffer != nil ? "$\(String(format: "%.2f", currentOffer!))" : "--")
                                .font(.title3)
                                .fontWeight(.bold)
                                .foregroundColor(Theme.brandOrange)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Theme.brandOrange.opacity(0.1))
                        .cornerRadius(12)
                    }
                    .padding(.horizontal)

                    // Quick Offer Buttons
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Quick Offers")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .padding(.horizontal)

                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: 12) {
                            ForEach(quickOfferOptions, id: \.self) { amount in
                                Button(action: {
                                    selectedQuickOffer = amount
                                    customOffer = ""
                                }) {
                                    VStack(spacing: 4) {
                                        Text("$\(String(format: "%.0f", amount))")
                                            .font(.headline)
                                        let savings = estimatedFare - amount
                                        if savings > 0 {
                                            Text("Save $\(String(format: "%.0f", savings))")
                                                .font(.caption2)
                                                .foregroundColor(.green)
                                        }
                                    }
                                    .frame(maxWidth: .infinity)
                                    .padding()
                                    .background(selectedQuickOffer == amount ? Theme.brandOrange : Color.gray.opacity(0.1))
                                    .foregroundColor(selectedQuickOffer == amount ? .white : .primary)
                                    .cornerRadius(12)
                                }
                            }
                        }
                        .padding(.horizontal)
                    }

                    // Custom Amount
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Or enter custom amount")
                            .font(.subheadline)
                            .fontWeight(.medium)

                        HStack {
                            Text("$")
                                .font(.title2)
                                .foregroundColor(.secondary)
                            TextField("0.00", text: $customOffer)
                                .font(.title2)
                                .keyboardType(.decimalPad)
                                .onChange(of: customOffer) { _, _ in
                                    selectedQuickOffer = nil
                                }
                        }
                        .padding()
                        .background(Color.gray.opacity(0.1))
                        .cornerRadius(12)

                        Text("Minimum fare: $\(String(format: "%.2f", AppConfig.shared.rideMinFare))")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding(.horizontal)

                    // Driver Payment Preview
                    if currentOffer != nil {
                        VStack(spacing: 8) {
                            Divider()

                            HStack {
                                Image(systemName: "person.fill.checkmark")
                                    .foregroundColor(Theme.brandGreen)
                                Text("Driver would receive:")
                                    .font(.subheadline)
                                Spacer()
                                Text("$\(String(format: "%.2f", driverEarnings))")
                                    .font(.headline)
                                    .foregroundColor(Theme.brandGreen)
                            }
                            .padding()
                            .background(Theme.brandGreen.opacity(0.1))
                            .cornerRadius(12)

                            HStack(spacing: 4) {
                                Image(systemName: "info.circle")
                                Text("Connection fee: $\(String(format: "%.0f", platformFee)) • Driver is independent")
                            }
                            .font(.caption)
                            .foregroundColor(.secondary)
                        }
                        .padding(.horizontal)
                    }

                    Spacer(minLength: 20)
                }
            }
            .navigationTitle("Make an Offer")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        isPresented = false
                    }
                    .accessibilityLabel("Cancel custom offer")
                }
            }
            .safeAreaInset(edge: .bottom) {
                VStack(spacing: 12) {
                    SwipeToConfirmButton(
                        label: currentOffer != nil ? "Slide to Request with $\(String(format: "%.0f", currentOffer!)) Offer" : "Enter an Amount",
                        accentColor: Theme.brandOrange,
                        isDisabled: currentOffer == nil,
                        onConfirm: {
                            if let offer = currentOffer {
                                onRequestWithOffer(offer)
                            }
                        }
                    )
                    .padding(.horizontal, 24)
                    .padding(.vertical, 8)
                }
                .padding()
                .background(Color(.systemBackground))
            }
        }
    }
}

// MARK: - Location Search View
struct RideLocationSearchView: View {
    let title: String
    let onSelect: (RideAddressInput) -> Void
    @Environment(\.dismiss) var dismiss

    @State private var searchText = ""
    @State private var searchResults: [SearchResult] = []
    @State private var isSearching = false
    @State private var isGettingLocation = false
    @StateObject private var locationManager = RideLocationManager()

    struct SearchResult: Identifiable {
        let id = UUID()
        let name: String
        let address: String
        let lat: Double
        let lng: Double
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search Bar
                HStack(spacing: 12) {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.gray)

                    TextField("Search address...", text: $searchText)
                        .textFieldStyle(.plain)
                        .autocorrectionDisabled()

                    if !searchText.isEmpty {
                        Button(action: { searchText = "" }) {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(.gray)
                        }
                        .accessibilityLabel("Clear search")
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
                .padding()
                .onChange(of: searchText) { _, newValue in
                    searchAddress(newValue)
                }

                // Current Location Option
                Button(action: useCurrentLocation) {
                    HStack(spacing: 12) {
                        ZStack {
                            Circle()
                                .fill(Color.blue.opacity(0.1))
                                .frame(width: 44, height: 44)
                            if isGettingLocation {
                                ProgressView()
                                    .scaleEffect(0.8)
                            } else {
                                Image(systemName: "location.fill")
                                    .foregroundColor(.blue)
                            }
                        }

                        VStack(alignment: .leading) {
                            Text("Use Current Location")
                                .font(.subheadline)
                                .fontWeight(.medium)
                            Text(isGettingLocation ? "Getting your location..." : "Based on your GPS")
                                .font(.caption)
                                .foregroundColor(.gray)
                        }

                        Spacer()

                        Image(systemName: "chevron.right")
                            .foregroundColor(.gray)
                            .font(.caption)
                    }
                    .padding()
                }
                .disabled(isGettingLocation)
                .accessibilityLabel("Use current location")
                .accessibilityHint("Sets your current GPS location as the address")

                Divider()
                    .padding(.horizontal)

                // Search Results
                if isSearching {
                    ProgressView()
                        .padding()
                } else {
                    ScrollView {
                        LazyVStack(spacing: 0) {
                            ForEach(searchResults) { result in
                                Button(action: {
                                    selectResult(result)
                                }) {
                                    HStack(spacing: 12) {
                                        Image(systemName: "mappin.circle.fill")
                                            .font(.title2)
                                            .foregroundColor(.gray)

                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(result.name)
                                                .font(.subheadline)
                                                .fontWeight(.medium)
                                                .foregroundColor(.primary)
                                            Text(result.address)
                                                .font(.caption)
                                                .foregroundColor(.gray)
                                                .lineLimit(1)
                                        }

                                        Spacer()
                                    }
                                    .padding()
                                }

                                Divider()
                                    .padding(.leading, 56)
                            }
                        }
                    }
                }

                Spacer()
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                        .accessibilityLabel("Cancel location search")
                }
            }
        }
    }

    private func searchAddress(_ query: String) {
        guard query.count > 2 else {
            searchResults = []
            return
        }

        isSearching = true

        // Use MKLocalSearch for address lookup
        let request = MKLocalSearch.Request()
        request.naturalLanguageQuery = query
        request.resultTypes = .address

        let search = MKLocalSearch(request: request)
        search.start { response, error in
            DispatchQueue.main.async {
                isSearching = false

                guard let response = response else { return }

                searchResults = response.mapItems.prefix(10).map { item in
                    SearchResult(
                        name: item.name ?? "Unknown",
                        address: item.placemark.formattedAddress,
                        lat: item.placemark.coordinate.latitude,
                        lng: item.placemark.coordinate.longitude
                    )
                }
            }
        }
    }

    private func selectResult(_ result: SearchResult) {
        // Use reverse geocoding to get proper address components
        let location = CLLocation(latitude: result.lat, longitude: result.lng)
        let geocoder = CLGeocoder()

        geocoder.reverseGeocodeLocation(location) { placemarks, error in
            let address: RideAddressInput

            if let placemark = placemarks?.first {
                // Properly extract address components from placemark
                let streetNumber = placemark.subThoroughfare ?? ""
                let streetName = placemark.thoroughfare ?? ""
                let street = [streetNumber, streetName].filter { !$0.isEmpty }.joined(separator: " ")

                address = RideAddressInput(
                    street: street.isEmpty ? result.name : street,
                    city: placemark.locality ?? "",
                    state: placemark.administrativeArea ?? "",
                    zip: placemark.postalCode ?? "",
                    lat: result.lat,
                    lng: result.lng
                )
            } else {
                // Fallback: Parse from formatted string if geocoding fails
                let components = result.address.components(separatedBy: ", ")
                let street = components.first ?? result.address
                let city = components.count > 1 ? components[1] : ""
                let stateZip = components.count > 2 ? components[2] : ""
                let stateParts = stateZip.components(separatedBy: " ")
                let state = stateParts.first ?? ""
                let zip = stateParts.count > 1 ? stateParts[1] : ""

                address = RideAddressInput(
                    street: street,
                    city: city,
                    state: state,
                    zip: zip,
                    lat: result.lat,
                    lng: result.lng
                )
            }

            onSelect(address)
        }
    }

    private func useCurrentLocation() {
        isGettingLocation = true

        // Request location permission if needed
        locationManager.requestLocationPermission()

        // Get current location
        locationManager.getCurrentLocation { location in
            guard let location = location else {
                isGettingLocation = false
                return
            }

            // Reverse geocode to get address
            let geocoder = CLGeocoder()
            geocoder.reverseGeocodeLocation(location) { placemarks, error in
                isGettingLocation = false

                guard let placemark = placemarks?.first else {
                    // Use coordinates even without address
                    let address = RideAddressInput(
                        street: "Current Location",
                        city: "Unknown",
                        state: "CA",
                        zip: "",
                        lat: location.coordinate.latitude,
                        lng: location.coordinate.longitude
                    )
                    onSelect(address)
                    return
                }

                // Show full address with house number (subThoroughfare + thoroughfare)
                // Example: "123 Main St" not just "Main St"
                let streetNumber = placemark.subThoroughfare ?? ""
                let streetName = placemark.thoroughfare ?? ""
                let fullStreet = [streetNumber, streetName].filter { !$0.isEmpty }.joined(separator: " ")

                let address = RideAddressInput(
                    street: fullStreet.isEmpty ? (placemark.name ?? "Current Location") : fullStreet,
                    city: placemark.locality ?? "",
                    state: placemark.administrativeArea ?? "",
                    zip: placemark.postalCode ?? "",
                    lat: location.coordinate.latitude,
                    lng: location.coordinate.longitude
                )
                onSelect(address)
            }
        }
    }
}

// MARK: - Location Manager for Ride Request
class RideLocationManager: NSObject, ObservableObject, CLLocationManagerDelegate {
    private let locationManager = CLLocationManager()
    private var locationCompletion: ((CLLocation?) -> Void)?

    @Published var authorizationStatus: CLAuthorizationStatus = .notDetermined
    @Published var currentLocation: CLLocation?

    override init() {
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        authorizationStatus = locationManager.authorizationStatus
    }

    func requestLocationPermission() {
        if authorizationStatus == .notDetermined {
            locationManager.requestWhenInUseAuthorization()
        }
    }

    func getCurrentLocation(completion: @escaping (CLLocation?) -> Void) {
        locationCompletion = completion

        switch authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            locationManager.requestLocation()
        case .notDetermined:
            locationManager.requestWhenInUseAuthorization()
        default:
            completion(nil)
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        if let location = locations.last {
            currentLocation = location
            locationCompletion?(location)
            locationCompletion = nil
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        logger.debug("Location error: \(error.localizedDescription)")
        locationCompletion?(nil)
        locationCompletion = nil
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        authorizationStatus = manager.authorizationStatus

        // If just authorized, try to get location
        if authorizationStatus == .authorizedWhenInUse || authorizationStatus == .authorizedAlways {
            if locationCompletion != nil {
                locationManager.requestLocation()
            }
        }
    }
}

// MARK: - Fare Line Item
struct FareLineItem: View {
    let label: String
    let amount: Double

    var body: some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundColor(.secondary)
            Spacer()
            Text("$\(String(format: "%.2f", amount))")
                .font(.subheadline)
                .foregroundColor(.primary)
        }
    }
}

// MARK: - MKPlacemark Extension
extension MKPlacemark {
    var formattedAddress: String {
        let components = [
            thoroughfare,
            locality,
            administrativeArea,
            postalCode
        ].compactMap { $0 }
        return components.joined(separator: ", ")
    }
}

// MARK: - Ride Tracking View
struct RideTrackingView: View {
    @ObservedObject var viewModel: RideRequestViewModel
    @State private var mapPosition: MapCameraPosition = .automatic
    @State private var route: MKRoute?
    @State private var showSOSAlert = false
    @State private var showShareSheet = false

    var body: some View {
        ZStack {
            // Map
            Map(position: $mapPosition) {
                // Pickup
                if let pickup = viewModel.pickupAddress {
                    Annotation("Pickup", coordinate: CLLocationCoordinate2D(
                        latitude: pickup.lat,
                        longitude: pickup.lng
                    )) {
                        RidePickupMarker()
                    }
                }

                // Dropoff
                if let dropoff = viewModel.dropoffAddress {
                    Annotation("Dropoff", coordinate: CLLocationCoordinate2D(
                        latitude: dropoff.lat,
                        longitude: dropoff.lng
                    )) {
                        RideDropoffMarker()
                    }
                }

                // Driver location
                if let tracking = viewModel.rideTracking,
                   let lat = tracking.driverLatitude,
                   let lng = tracking.driverLongitude {
                    Annotation("Driver", coordinate: CLLocationCoordinate2D(
                        latitude: lat,
                        longitude: lng
                    )) {
                        ZStack {
                            Circle()
                                .fill(Color.black)
                                .frame(width: 40, height: 40)
                            Image(systemName: "car.fill")
                                .foregroundColor(.white)
                        }
                    }
                }

                // Route polyline
                if let route = route {
                    MapPolyline(route.polyline)
                        .stroke(.blue, lineWidth: 5)
                }

                UserAnnotation()
            }
            .ignoresSafeArea(edges: .top)
            .onChange(of: viewModel.rideTracking?.driverLatitude) { _, _ in
                calculateRoute()
            }
            .onAppear { calculateRoute() }

            // ETA Overlay (top-left)
            VStack {
                HStack {
                    if let tracking = viewModel.rideTracking,
                       let eta = tracking.currentETAMinutes {
                        VStack(spacing: 2) {
                            Text("\(eta)")
                                .font(.system(size: 36, weight: .bold, design: .rounded))
                                .foregroundColor(.white)
                            Text(tracking.status == "in_progress" ? "min to arrive" : "min away")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.9))
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(Color.black.opacity(0.75))
                        .cornerRadius(16)
                        .padding(.leading, 16)
                        .padding(.top, 8)
                    }
                    Spacer()
                }
                Spacer()
            }

            // Safety Buttons (top-right)
            VStack {
                HStack {
                    Spacer()
                    VStack(spacing: 10) {
                        Button(action: { showSOSAlert = true }) {
                            Text("SOS")
                                .font(.caption)
                                .fontWeight(.heavy)
                                .foregroundColor(.white)
                                .frame(width: 50, height: 50)
                                .background(Color.red)
                                .clipShape(Circle())
                                .shadow(color: .red.opacity(0.4), radius: 4)
                        }
                        .accessibilityLabel("Emergency SOS")
                        .accessibilityHint("Calls 911 emergency services")

                        Button(action: { showShareSheet = true }) {
                            Image(systemName: "square.and.arrow.up")
                                .font(.callout)
                                .fontWeight(.semibold)
                                .foregroundColor(.white)
                                .frame(width: 44, height: 44)
                                .background(Color.blue)
                                .clipShape(Circle())
                                .shadow(color: .blue.opacity(0.3), radius: 4)
                        }
                        .accessibilityLabel("Share trip")
                        .accessibilityHint("Share your trip details with someone")
                    }
                    .padding(.trailing, 16)
                    .padding(.top, 60)
                }
                Spacer()
            }

            // Bottom Info Card
            VStack {
                Spacer()

                RideStatusCard(viewModel: viewModel)
            }
        }
        .alert("Emergency SOS", isPresented: $showSOSAlert) {
            Button("Call 911", role: .destructive) {
                if let url = URL(string: "tel://911") {
                    UIApplication.shared.open(url)
                }
            }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("This will call emergency services (911). Only use in a real emergency.")
        }
        .sheet(isPresented: $showShareSheet) {
            ShareTripActivityView(shareText: tripShareText)
        }
    }

    private var tripShareText: String {
        var text = "I'm on a Dollor ride!"
        if let ride = viewModel.activeRide {
            text += " Ride #\(ride.rideNumber ?? "N/A")"
        }
        if let pickup = viewModel.pickupAddress {
            text += "\nFrom: \(pickup.street)"
        }
        if let dropoff = viewModel.dropoffAddress {
            text += "\nTo: \(dropoff.street)"
        }
        if let driver = viewModel.acceptedDriver {
            text += "\nDriver: \(driver.name ?? "Unknown")"
            if let plate = driver.license_plate {
                text += " (\(plate))"
            }
        }
        text += "\n\nShared via Dollor - dollor.ai"
        return text
    }

    private func calculateRoute() {
        guard let tracking = viewModel.rideTracking,
              let driverLat = tracking.driverLatitude,
              let driverLng = tracking.driverLongitude else { return }

        let driverCoord = CLLocationCoordinate2D(latitude: driverLat, longitude: driverLng)

        // Destination: dropoff if in progress, pickup if en route
        let destCoord: CLLocationCoordinate2D
        if viewModel.currentStep == .rideInProgress, let dropoff = viewModel.dropoffAddress {
            destCoord = CLLocationCoordinate2D(latitude: dropoff.lat, longitude: dropoff.lng)
        } else if let pickup = viewModel.pickupAddress {
            destCoord = CLLocationCoordinate2D(latitude: pickup.lat, longitude: pickup.lng)
        } else {
            return
        }

        let request = MKDirections.Request()
        request.source = MKMapItem(placemark: MKPlacemark(coordinate: driverCoord))
        request.destination = MKMapItem(placemark: MKPlacemark(coordinate: destCoord))
        request.transportType = .automobile

        MKDirections(request: request).calculate { response, _ in
            if let route = response?.routes.first {
                DispatchQueue.main.async {
                    self.route = route
                }
            }
        }
    }
}

// MARK: - Ride Status Card
struct RideStatusCard: View {
    @ObservedObject var viewModel: RideRequestViewModel
    @State private var showCancelConfirm = false
    @State private var showNegotiateSheet = false
    @State private var customerOfferAmount: String = ""

    // Completion flow states
    @State private var selectedRating: Int = 0
    @State private var ratingFeedback: String = ""
    @State private var selectedTipAmount: Double = 0
    @State private var customTipAmount: String = ""
    @State private var showCustomTip = false
    @State private var isSubmittingRating = false
    @State private var isSubmittingTip = false
    @State private var ratingSubmitted = false
    @State private var tipSubmitted = false
    @State private var showChatSheet = false

    var statusText: String {
        switch viewModel.currentStep {
        case .waitingForDriver:
            return "Finding available drivers..."
        case .driverEnRoute:
            return "Driver accepted and is on the way!"
        case .rideInProgress:
            if let eta = viewModel.rideTracking?.etaDestinationMinutes {
                return "In transit — arriving in ~\(eta) min"
            }
            return "In transit with driver"
        case .completed:
            return "Trip completed!"
        default:
            return "Processing..."
        }
    }

    var statusIcon: String {
        switch viewModel.currentStep {
        case .waitingForDriver:
            return "magnifyingglass"
        case .driverEnRoute:
            return "car.fill"
        case .rideInProgress:
            return "arrow.right"
        case .completed:
            return "checkmark.circle.fill"
        default:
            return "clock"
        }
    }

    var body: some View {
        VStack(spacing: 16) {
            // Handle
            RoundedRectangle(cornerRadius: 3)
                .fill(Color.gray.opacity(0.3))
                .frame(width: 40, height: 5)
                .padding(.top, 10)

            // Status
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(Color.blue.opacity(0.1))
                        .frame(width: 50, height: 50)

                    if viewModel.currentStep == .waitingForDriver {
                        ProgressView()
                    } else {
                        Image(systemName: statusIcon)
                            .font(.title2)
                            .foregroundColor(.blue)
                    }
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(statusText)
                        .font(.headline)

                    if let ride = viewModel.activeRide {
                        Text("Ride #\(ride.rideNumber)")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                }

                Spacer()

                // Cancel button (when cancellation is allowed)
                if viewModel.currentStep != .completed && viewModel.currentStep != .rideInProgress {
                    Button(action: { showCancelConfirm = true }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title2)
                            .foregroundColor(.red.opacity(0.7))
                    }
                    .accessibilityLabel("Cancel ride")
                    .accessibilityHint("Opens confirmation to cancel your ride request")
                }
            }
            .padding(.horizontal)

            // MARK: - Incoming Driver Bids Section (P2P Bidding)
            if viewModel.currentStep == .waitingForDriver && !viewModel.incomingBids.isEmpty {
                Divider()

                VStack(spacing: 12) {
                    HStack {
                        ZStack {
                            Circle()
                                .fill(Color.green.opacity(0.15))
                                .frame(width: 40, height: 40)
                            Image(systemName: "person.3.fill")
                                .foregroundColor(.green)
                        }

                        VStack(alignment: .leading, spacing: 2) {
                            Text("\(viewModel.incomingBids.count) Driver\(viewModel.incomingBids.count == 1 ? "" : "s") Available")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                            Text("Tap to view and select a driver")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }

                        Spacer()

                        Button(action: { viewModel.showBidsSheet = true }) {
                            Text("View Bids")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(.white)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 10)
                                .background(Color.green)
                                .cornerRadius(8)
                        }
                        .accessibilityLabel("View driver bids")
                        .accessibilityHint("Shows available drivers and their fare offers")
                    }
                }
                .padding(.horizontal)
            }

            // MARK: - Accepted Driver Details Section
            if let driver = viewModel.acceptedDriver {
                Divider()

                VStack(spacing: 12) {
                    // Driver Row with Photo, Name, Rating
                    HStack(spacing: 12) {
                        // Driver Photo
                        if let photoUrl = driver.photo_url,
                           let url = URL(string: photoUrl.hasPrefix("http") ? photoUrl : "\(AppConfig.shared.cdnBaseURL)\(photoUrl)") {
                            AsyncImage(url: url) { image in
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                                    .frame(width: 60, height: 60)
                                    .clipShape(Circle())
                            } placeholder: {
                                driverPhotoPlaceholder
                            }
                        } else {
                            driverPhotoPlaceholder
                        }

                        VStack(alignment: .leading, spacing: 4) {
                            HStack(spacing: 6) {
                                Text(driver.name ?? "Driver")
                                    .font(.headline)
                                if let rating = driver.rating {
                                    HStack(spacing: 2) {
                                        Image(systemName: "star.fill")
                                            .font(.caption2)
                                            .foregroundColor(.yellow)
                                        Text(String(format: "%.1f", rating))
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                }
                            }

                            if viewModel.driverHasArrived {
                                HStack(spacing: 4) {
                                    Image(systemName: "mappin.circle.fill")
                                        .font(.caption)
                                        .foregroundColor(.green)
                                    Text("Driver has arrived!")
                                        .font(.subheadline)
                                        .fontWeight(.semibold)
                                        .foregroundColor(.green)
                                }
                            } else if let eta = viewModel.driverETA {
                                HStack(spacing: 4) {
                                    Image(systemName: "clock.fill")
                                        .font(.caption)
                                        .foregroundColor(.blue)
                                    Text("Arriving in ~\(eta) min")
                                        .font(.subheadline)
                                        .foregroundColor(.blue)
                                }
                            }
                        }

                        Spacer()

                        // Chat button
                        if viewModel.activeRide?.rideId != nil {
                            Button(action: { showChatSheet = true }) {
                                Image(systemName: "message.fill")
                                    .font(.title3)
                                    .foregroundColor(.white)
                                    .frame(width: 44, height: 44)
                                    .background(Color.blue)
                                    .clipShape(Circle())
                            }
                            .accessibilityLabel("Chat with driver")
                            .accessibilityHint("Opens chat with your driver")
                        }

                        if let phone = driver.phone {
                            Button(action: { callDriver(phone) }) {
                                Image(systemName: "phone.fill")
                                    .font(.title3)
                                    .foregroundColor(.white)
                                    .frame(width: 44, height: 44)
                                    .background(Color.green)
                                    .clipShape(Circle())
                            }
                            .accessibilityLabel("Call driver")
                            .accessibilityHint("Places a phone call to your driver")
                        }
                    }

                    // Vehicle Info Card
                    if driver.vehicle_make != nil || driver.license_plate != nil {
                        HStack(spacing: 12) {
                            // Vehicle Photo
                            if let vehiclePhotoUrl = driver.vehicle_photo_url,
                               let url = URL(string: vehiclePhotoUrl.hasPrefix("http") ? vehiclePhotoUrl : "\(AppConfig.shared.cdnBaseURL)\(vehiclePhotoUrl)") {
                                AsyncImage(url: url) { image in
                                    image
                                        .resizable()
                                        .aspectRatio(contentMode: .fill)
                                        .frame(width: 80, height: 60)
                                        .clipShape(RoundedRectangle(cornerRadius: 8))
                                } placeholder: {
                                    vehiclePhotoPlaceholder
                                }
                            } else {
                                vehiclePhotoPlaceholder
                            }

                            VStack(alignment: .leading, spacing: 4) {
                                // Vehicle Make/Model with Color
                                HStack(spacing: 4) {
                                    if let color = driver.vehicle_color {
                                        Text(color)
                                            .font(.subheadline)
                                            .foregroundColor(.secondary)
                                    }
                                    if let make = driver.vehicle_make {
                                        Text(make)
                                            .font(.subheadline)
                                            .fontWeight(.medium)
                                    }
                                    if let model = driver.vehicle_model {
                                        Text(model)
                                            .font(.subheadline)
                                            .fontWeight(.medium)
                                    }
                                }

                                // License Plate (prominent)
                                if let plate = driver.license_plate {
                                    Text(plate)
                                        .font(.title3)
                                        .fontWeight(.bold)
                                        .foregroundColor(.primary)
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 4)
                                        .background(Color.yellow.opacity(0.3))
                                        .cornerRadius(4)
                                }
                            }

                            Spacer()
                        }
                        .padding(12)
                        .background(Color.gray.opacity(0.1))
                        .cornerRadius(12)
                    }
                }
                .padding(.horizontal)
            }

            // Negotiation Status Section ($1+$1 Platform Fee Model)
            if viewModel.isNegotiating {
                Divider()

                VStack(spacing: 12) {
                    // Show driver counter-offer if available
                    if let driverOffer = viewModel.driverOfferAmount {
                        // Driver Counter-Offer Card
                        VStack(spacing: 12) {
                            HStack {
                                ZStack {
                                    Circle()
                                        .fill(Color.orange.opacity(0.15))
                                        .frame(width: 40, height: 40)
                                    Image(systemName: "arrow.triangle.2.circlepath")
                                        .foregroundColor(.orange)
                                }

                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Driver Counter-Offer")
                                        .font(.subheadline)
                                        .fontWeight(.semibold)
                                    Text("Platform fee: only $\(String(format: "%.0f", AppConfig.shared.calculateRidesharePlatformFee(fareAmount: driverOffer)))")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                }

                                Spacer()

                                Text("$\(String(format: "%.2f", driverOffer))")
                                    .font(.title2)
                                    .fontWeight(.bold)
                                    .foregroundColor(.orange)
                            }

                            // Driver earnings transparency
                            HStack {
                                Image(systemName: "person.fill.checkmark")
                                    .font(.caption)
                                    .foregroundColor(.green)
                                Text("Driver earns: $\(String(format: "%.2f", driverOffer - AppConfig.shared.calculateRidesharePlatformFee(fareAmount: driverOffer)))")
                                    .font(.caption)
                                    .foregroundColor(.green)
                                Spacer()
                            }

                            VStack(spacing: 12) {
                                SwipeToConfirmButton(
                                    label: "Slide to Accept Offer",
                                    accentColor: .green,
                                    onConfirm: { viewModel.acceptDriverOffer() }
                                )
                                .padding(.horizontal, 24)
                                .padding(.vertical, 8)

                                Button(action: { showNegotiateSheet = true }) {
                                    HStack {
                                        Image(systemName: "arrow.left.arrow.right")
                                        Text("Counter")
                                    }
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.orange)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 12)
                                    .background(Color.orange.opacity(0.15))
                                    .cornerRadius(10)
                                }
                                .accessibilityLabel("Counter offer")
                                .accessibilityHint("Opens negotiation to make a counter offer")
                            }
                        }
                        .padding()
                        .background(Color.orange.opacity(0.05))
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.orange.opacity(0.3), lineWidth: 1)
                        )
                        .padding(.horizontal)

                    } else {
                        // Waiting for driver response
                        HStack(spacing: 12) {
                            ProgressView()
                                .scaleEffect(0.8)

                            VStack(alignment: .leading, spacing: 2) {
                                Text("Negotiating...")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                Text("Waiting for driver's response")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }

                            Spacer()

                            Button(action: { showNegotiateSheet = true }) {
                                Text("Change Offer")
                                    .font(.caption)
                                    .fontWeight(.medium)
                                    .foregroundColor(.blue)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(Color.blue.opacity(0.1))
                                    .cornerRadius(8)
                            }
                        }
                        .padding(.horizontal)
                    }
                }
            }

            // Driver Info (when assigned)
            if let tracking = viewModel.rideTracking,
               let driverName = tracking.driverName {
                Divider()

                VStack(spacing: 12) {
                    // Driver Row
                    HStack(spacing: 12) {
                        // Driver Photo
                        if let photoUrl = tracking.driverPhotoUrl,
                           let url = URL(string: photoUrl) {
                            AsyncImage(url: url) { image in
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                                    .frame(width: 50, height: 50)
                                    .clipShape(Circle())
                            } placeholder: {
                                ZStack {
                                    Circle()
                                        .fill(Color.gray.opacity(0.2))
                                        .frame(width: 50, height: 50)
                                    Image(systemName: "person.fill")
                                        .foregroundColor(.gray)
                                }
                            }
                        } else {
                            ZStack {
                                Circle()
                                    .fill(Color.gray.opacity(0.2))
                                    .frame(width: 50, height: 50)
                                Image(systemName: "person.fill")
                                    .foregroundColor(.gray)
                            }
                        }

                        VStack(alignment: .leading) {
                            HStack(spacing: 4) {
                                Text(driverName)
                                    .font(.headline)
                                if let rating = tracking.driverRating {
                                    HStack(spacing: 2) {
                                        Image(systemName: "star.fill")
                                            .font(.caption2)
                                            .foregroundColor(.yellow)
                                        Text(String(format: "%.1f", rating))
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                }
                            }
                            Text("Your driver")
                                .font(.caption)
                                .foregroundColor(.gray)
                        }

                        Spacer()

                        if let phone = tracking.driverPhone {
                            Button(action: { callDriver(phone) }) {
                                Image(systemName: "phone.fill")
                                    .font(.title3)
                                    .foregroundColor(.white)
                                    .frame(width: 44, height: 44)
                                    .background(Color.green)
                                    .clipShape(Circle())
                            }
                        }
                    }

                    // Vehicle Info Row
                    if tracking.driverVehicle != nil || tracking.driverLicensePlate != nil {
                        HStack(spacing: 12) {
                            // Vehicle Photo
                            if let vehiclePhotoUrl = tracking.driverVehiclePhotoUrl,
                               let url = URL(string: vehiclePhotoUrl) {
                                AsyncImage(url: url) { image in
                                    image
                                        .resizable()
                                        .aspectRatio(contentMode: .fill)
                                        .frame(width: 80, height: 60)
                                        .clipShape(RoundedRectangle(cornerRadius: 8))
                                } placeholder: {
                                    RoundedRectangle(cornerRadius: 8)
                                        .fill(Color.gray.opacity(0.2))
                                        .frame(width: 80, height: 60)
                                        .overlay(
                                            Image(systemName: "car.fill")
                                                .foregroundColor(.gray)
                                        )
                                }
                            } else {
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(Color.gray.opacity(0.2))
                                    .frame(width: 80, height: 60)
                                    .overlay(
                                        Image(systemName: "car.fill")
                                            .foregroundColor(.gray)
                                    )
                            }

                            VStack(alignment: .leading, spacing: 4) {
                                if let vehicle = tracking.driverVehicle {
                                    HStack(spacing: 4) {
                                        if let color = tracking.driverVehicleColor {
                                            Text(color)
                                                .font(.subheadline)
                                                .foregroundColor(.secondary)
                                        }
                                        Text(vehicle)
                                            .font(.subheadline)
                                            .fontWeight(.medium)
                                    }
                                }
                                if let plate = tracking.driverLicensePlate {
                                    Text(plate)
                                        .font(.headline)
                                        .fontWeight(.bold)
                                        .foregroundColor(.primary)
                                }
                            }

                            Spacer()
                        }
                        .padding(12)
                        .background(Color.gray.opacity(0.1))
                        .cornerRadius(12)
                    }
                }
                .padding(.horizontal)
            }

            // Negotiation Message
            if let message = viewModel.negotiationMessage {
                Text(message)
                    .font(.caption)
                    .foregroundColor(.green)
                    .padding(.horizontal)
            }

            // MARK: - Ride Completed Thank You Section
            if viewModel.currentStep == .completed {
                rideCompletedSection
            }

            Spacer().frame(height: 20)
        }
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.white)
                .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: -5)
        )
        // Cancel Confirmation
        .confirmationDialog("Cancel Ride?", isPresented: $showCancelConfirm, titleVisibility: .visible) {
            Button("Cancel Ride\(viewModel.estimatedCancellationFee > 0 ? " ($\(String(format: "%.0f", viewModel.estimatedCancellationFee)) fee)" : " (Free)")", role: .destructive) {
                viewModel.cancelRide(reason: "Customer cancelled")
            }
            Button("Keep Ride", role: .cancel) { }
        } message: {
            Text(viewModel.estimatedCancellationFee > 0 ?
                 "A $\(String(format: "%.0f", viewModel.estimatedCancellationFee)) cancellation fee will apply." :
                 "You can cancel for free right now.")
        }
        // Negotiate Sheet
        .sheet(isPresented: $showNegotiateSheet) {
            CustomerNegotiationSheet(
                viewModel: viewModel,
                customerOfferAmount: $customerOfferAmount,
                isPresented: $showNegotiateSheet
            )
        }
        // Incoming Bids Sheet
        .sheet(isPresented: $viewModel.showBidsSheet) {
            DriverBidsSheet(viewModel: viewModel)
        }
        // Chat Sheet
        .sheet(isPresented: $showChatSheet) {
            if let rideId = viewModel.activeRide?.rideId,
               let driver = viewModel.acceptedDriver {
                DriverChatView(
                    rideRequestId: rideId,
                    driverName: driver.name ?? "Driver",
                    driverPhone: driver.phone
                )
            }
        }
    }

    // MARK: - Placeholder Views

    private var driverPhotoPlaceholder: some View {
        ZStack {
            Circle()
                .fill(Color.gray.opacity(0.2))
                .frame(width: 60, height: 60)
            Image(systemName: "person.fill")
                .font(.title2)
                .foregroundColor(.gray)
        }
    }

    private var vehiclePhotoPlaceholder: some View {
        RoundedRectangle(cornerRadius: 8)
            .fill(Color.gray.opacity(0.2))
            .frame(width: 80, height: 60)
            .overlay(
                Image(systemName: "car.fill")
                    .font(.title3)
                    .foregroundColor(.gray)
            )
    }

    // MARK: - Ride Completed Section (Thank You Screen)
    private var rideCompletedSection: some View {
        VStack(spacing: 20) {
            Divider()

            // Celebration Header
            VStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(Color.green.opacity(0.15))
                        .frame(width: 80, height: 80)
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 50))
                        .foregroundColor(.green)
                }

                Text("Ride Complete!")
                    .font(.title2)
                    .fontWeight(.bold)

                Text("Thank you for riding with Dollor")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .padding(.vertical, 8)

            // Trip Summary Card
            VStack(spacing: 12) {
                HStack {
                    Text("TRIP SUMMARY")
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .foregroundColor(.secondary)
                    Spacer()
                    if let ride = viewModel.activeRide {
                        Text("Ride #\(ride.rideNumber)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                // Pickup → Dropoff
                HStack(spacing: 12) {
                    VStack(spacing: 4) {
                        Circle()
                            .fill(Color.blue)
                            .frame(width: 12, height: 12)
                        Rectangle()
                            .fill(Color.gray.opacity(0.3))
                            .frame(width: 2, height: 30)
                        Image(systemName: "mappin.circle.fill")
                            .font(.system(size: 14))
                            .foregroundColor(.green)
                    }

                    VStack(alignment: .leading, spacing: 16) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Pickup")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                            Text(viewModel.pickupAddress?.fullAddress ?? "Unknown")
                                .font(.subheadline)
                                .lineLimit(1)
                        }

                        VStack(alignment: .leading, spacing: 2) {
                            Text("Dropoff")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                            Text(viewModel.dropoffAddress?.fullAddress ?? "Unknown")
                                .font(.subheadline)
                                .lineLimit(1)
                        }
                    }

                    Spacer()
                }
            }
            .padding()
            .background(Color.gray.opacity(0.05))
            .cornerRadius(12)
            .padding(.horizontal)

            // Fare Breakdown
            VStack(spacing: 10) {
                HStack {
                    Text("FARE BREAKDOWN")
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .foregroundColor(.secondary)
                    Spacer()
                }

                FareLineItem(label: "Ride Fare", amount: viewModel.estimatedFare)
                FareLineItem(label: "Connection Fee", amount: viewModel.platformFee)

                Divider()

                HStack {
                    Text("Total Paid")
                        .font(.headline)
                    Spacer()
                    Text("$\(String(format: "%.2f", viewModel.totalAmount))")
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.green)
                }

                HStack(spacing: 4) {
                    Image(systemName: "info.circle")
                        .font(.caption2)
                    Text("Driver earned $\(String(format: "%.2f", viewModel.estimatedFare - AppConfig.shared.calculateRidesharePlatformFee(fareAmount: viewModel.estimatedFare))) (96% of fare)")
                        .font(.caption2)
                }
                .foregroundColor(.secondary)
            }
            .padding()
            .background(Color.gray.opacity(0.05))
            .cornerRadius(12)
            .padding(.horizontal)

            // Rate Driver Section
            if !ratingSubmitted {
                VStack(spacing: 12) {
                    HStack {
                        Text("RATE YOUR DRIVER")
                            .font(.caption2)
                            .fontWeight(.semibold)
                            .foregroundColor(.secondary)
                        Spacer()
                    }

                    // Driver info row
                    if let driver = viewModel.acceptedDriver {
                        HStack(spacing: 12) {
                            if let photoUrl = driver.photo_url,
                               let url = URL(string: photoUrl.hasPrefix("http") ? photoUrl : "\(AppConfig.shared.cdnBaseURL)\(photoUrl)") {
                                AsyncImage(url: url) { image in
                                    image
                                        .resizable()
                                        .aspectRatio(contentMode: .fill)
                                        .frame(width: 50, height: 50)
                                        .clipShape(Circle())
                                } placeholder: {
                                    driverPhotoPlaceholder
                                }
                            } else {
                                driverPhotoPlaceholder
                            }

                            VStack(alignment: .leading, spacing: 2) {
                                Text(driver.name ?? "Your Driver")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                if let vehicle = driver.vehicle_make {
                                    Text("\(driver.vehicle_color ?? "") \(vehicle) \(driver.vehicle_model ?? "")")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }
                            Spacer()
                        }
                    }

                    // Star Rating
                    HStack(spacing: 8) {
                        ForEach(1...5, id: \.self) { star in
                            Button(action: {
                                withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                                    selectedRating = star
                                }
                            }) {
                                Image(systemName: star <= selectedRating ? "star.fill" : "star")
                                    .font(.system(size: 36))
                                    .foregroundColor(star <= selectedRating ? .yellow : .gray.opacity(0.4))
                                    .scaleEffect(star <= selectedRating ? 1.1 : 1.0)
                            }
                            .accessibilityLabel("\(star) star\(star == 1 ? "" : "s")")
                        }
                    }
                    .padding(.vertical, 8)

                    // Optional feedback
                    if selectedRating > 0 {
                        TextField("Add a comment (optional)", text: $ratingFeedback)
                            .textFieldStyle(.plain)
                            .padding()
                            .background(Color.gray.opacity(0.1))
                            .cornerRadius(10)

                        // Submit Rating Button
                        SwipeToConfirmButton(
                            label: "Slide to Submit \(selectedRating)-Star Rating",
                            accentColor: .yellow,
                            isDisabled: isSubmittingRating,
                            onConfirm: submitRating
                        )
                        .padding(.horizontal, 24)
                        .padding(.vertical, 8)
                    }
                }
                .padding()
                .background(Color.gray.opacity(0.05))
                .cornerRadius(12)
                .padding(.horizontal)
            } else {
                // Rating submitted confirmation
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                    Text("Thanks for rating \(selectedRating) stars!")
                        .font(.subheadline)
                        .foregroundColor(.green)
                }
                .padding()
                .frame(maxWidth: .infinity)
                .background(Color.green.opacity(0.1))
                .cornerRadius(12)
                .padding(.horizontal)
            }

            // Add Tip Section
            if !tipSubmitted {
                VStack(spacing: 12) {
                    HStack {
                        Text("ADD A TIP")
                            .font(.caption2)
                            .fontWeight(.semibold)
                            .foregroundColor(.secondary)
                        Spacer()
                        Text("100% goes to driver")
                            .font(.caption2)
                            .foregroundColor(.green)
                    }

                    // Quick Tip Buttons
                    HStack(spacing: 12) {
                        ForEach([2.0, 5.0, 10.0], id: \.self) { amount in
                            Button(action: {
                                withAnimation {
                                    selectedTipAmount = amount
                                    showCustomTip = false
                                }
                            }) {
                                Text("$\(Int(amount))")
                                    .font(.headline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(selectedTipAmount == amount ? .white : .primary)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 16)
                                    .background(selectedTipAmount == amount ? Color.orange : Color.gray.opacity(0.1))
                                    .cornerRadius(12)
                            }
                            .accessibilityLabel("$\(Int(amount)) tip")
                        }

                        // Custom Amount Button
                        Button(action: {
                            withAnimation {
                                showCustomTip = true
                                selectedTipAmount = 0
                            }
                        }) {
                            Text("Other")
                                .font(.headline)
                                .fontWeight(.semibold)
                                .foregroundColor(showCustomTip ? .white : .primary)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .background(showCustomTip ? Color.orange : Color.gray.opacity(0.1))
                                .cornerRadius(12)
                        }
                        .accessibilityLabel("Custom tip amount")
                    }

                    // Custom Tip Input
                    if showCustomTip {
                        HStack {
                            Text("$")
                                .font(.title2)
                                .fontWeight(.bold)
                            TextField("Amount", text: $customTipAmount)
                                .keyboardType(.decimalPad)
                                .font(.title2)
                                .fontWeight(.bold)
                        }
                        .padding()
                        .background(Color.gray.opacity(0.1))
                        .cornerRadius(10)
                    }

                    // Submit Tip Button
                    let tipAmount = showCustomTip ? (Double(customTipAmount) ?? 0) : selectedTipAmount
                    if tipAmount > 0 {
                        SwipeToConfirmButton(
                            label: "Slide to Add $\(String(format: "%.2f", tipAmount)) Tip",
                            accentColor: .green,
                            isDisabled: isSubmittingTip,
                            onConfirm: submitTip
                        )
                        .padding(.horizontal, 24)
                        .padding(.vertical, 8)
                    }

                    // Skip Tip Button
                    Button(action: {
                        tipSubmitted = true
                    }) {
                        Text("Skip Tip")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .accessibilityLabel("Skip tip")
                }
                .padding()
                .background(Color.gray.opacity(0.05))
                .cornerRadius(12)
                .padding(.horizontal)
            } else if selectedTipAmount > 0 || (Double(customTipAmount) ?? 0) > 0 {
                // Tip submitted confirmation
                let tipAmount = showCustomTip ? (Double(customTipAmount) ?? 0) : selectedTipAmount
                HStack(spacing: 8) {
                    Image(systemName: "heart.fill")
                        .foregroundColor(.orange)
                    Text("$\(String(format: "%.2f", tipAmount)) tip sent to your driver!")
                        .font(.subheadline)
                        .foregroundColor(.orange)
                }
                .padding()
                .frame(maxWidth: .infinity)
                .background(Color.orange.opacity(0.1))
                .cornerRadius(12)
                .padding(.horizontal)
            }

            // Done Button
            SwipeToConfirmButton(
                label: "Slide to Done",
                accentColor: .gray,
                onConfirm: { viewModel.resetRide() }
            )
            .padding(.horizontal, 24)
            .padding(.vertical, 8)
        }
    }

    // MARK: - Rating & Tip Actions

    private func submitRating() {
        guard selectedRating > 0 else { return }
        guard let rideId = viewModel.activeRide?.rideId else {
            // No ride ID - skip rating silently
            return
        }

        isSubmittingRating = true

        // Call the backend API to submit rating
        P2PAPIService.shared.submitRideRating(
            rideId: rideId,
            rating: selectedRating,
            comment: ratingFeedback.isEmpty ? nil : ratingFeedback
        ) { result in
            DispatchQueue.main.async {
                isSubmittingRating = false
                switch result {
                case .success:
                    ratingSubmitted = true
                case .failure(let error):
                    // Log error but still allow dismissing
                    #if DEBUG
                    print("Rating submission failed: \(error.localizedDescription)")
                    #endif
                    ratingSubmitted = true // Allow user to proceed
                }
            }
        }
    }

    private func submitTip() {
        let tipAmount = showCustomTip ? (Double(customTipAmount) ?? 0) : selectedTipAmount
        guard tipAmount > 0 else { return }
        guard let rideId = viewModel.activeRide?.rideId else {
            // No ride ID - skip tip silently
            return
        }

        isSubmittingTip = true

        // Call the backend API to submit tip
        P2PAPIService.shared.submitRideTip(
            rideId: rideId,
            amount: tipAmount
        ) { result in
            DispatchQueue.main.async {
                isSubmittingTip = false
                switch result {
                case .success:
                    tipSubmitted = true
                case .failure(let error):
                    // Log error but still allow dismissing
                    #if DEBUG
                    print("Tip submission failed: \(error.localizedDescription)")
                    #endif
                    tipSubmitted = true // Allow user to proceed
                }
            }
        }
    }

    private func callDriver(_ phone: String) {
        let cleanPhone = phone.replacingOccurrences(of: " ", with: "")
            .replacingOccurrences(of: "-", with: "")
        if let url = URL(string: "tel://\(cleanPhone)") {
            UIApplication.shared.open(url)
        }
    }
}

// MARK: - Customer Negotiation Sheet
struct CustomerNegotiationSheet: View {
    @ObservedObject var viewModel: RideRequestViewModel
    @Binding var customerOfferAmount: String
    @Binding var isPresented: Bool

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 8) {
                    Image(systemName: "dollarsign.arrow.circlepath")
                        .font(.system(size: 50))
                        .foregroundColor(.orange)

                    Text("Negotiate Fare")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("Only $\(String(format: "%.2f", AppConfig.shared.calculateRidesharePlatformFee(fareAmount: viewModel.estimatedFare))) platform fee to you + $\(String(format: "%.2f", AppConfig.shared.calculateRidesharePlatformFee(fareAmount: viewModel.estimatedFare))) to driver")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 20)

                // Current offers
                if let driverOffer = viewModel.driverOfferAmount {
                    HStack(spacing: 20) {
                        VStack {
                            Text("Driver's Offer")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text("$\(String(format: "%.2f", driverOffer))")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.orange)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.orange.opacity(0.1))
                        .cornerRadius(12)

                        VStack {
                            Text("Your Budget")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text("$\(String(format: "%.2f", viewModel.totalAmount))")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.blue)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue.opacity(0.1))
                        .cornerRadius(12)
                    }
                    .padding(.horizontal)
                }

                // Your offer input
                VStack(alignment: .leading, spacing: 8) {
                    Text("Your Counter-Offer")
                        .font(.subheadline)
                        .fontWeight(.semibold)

                    HStack {
                        Text("$")
                            .font(.title)
                            .foregroundColor(.secondary)

                        TextField("0.00", text: $customerOfferAmount)
                            .font(.title)
                            .keyboardType(.decimalPad)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)

                    Text("Driver receives your offer minus $\(String(format: "%.2f", AppConfig.shared.calculateRidesharePlatformFee(fareAmount: viewModel.estimatedFare))) platform fee")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                .padding(.horizontal)

                // Quick offer buttons
                HStack(spacing: 12) {
                    ForEach([5, 10, 15, 20], id: \.self) { amount in
                        Button(action: { customerOfferAmount = "\(amount)" }) {
                            Text("$\(amount)")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(.blue)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(Color.blue.opacity(0.1))
                                .cornerRadius(10)
                        }
                    }
                }
                .padding(.horizontal)

                Spacer()

                // Submit button
                SwipeToConfirmButton(
                    label: customerOfferAmount.isEmpty ? "Enter an Amount" : "Slide to Submit $\(customerOfferAmount) Offer",
                    accentColor: .orange,
                    isDisabled: customerOfferAmount.isEmpty || viewModel.isLoading,
                    onConfirm: submitOffer
                )
                .padding(.horizontal, 24)
                .padding(.vertical, 8)
                .padding(.bottom)
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Cancel") { isPresented = false }
                }
            }
        }
        .presentationDetents([.medium])
    }

    private func submitOffer() {
        guard let amount = Double(customerOfferAmount) else { return }
        viewModel.submitFareOffer(proposedFare: amount)
    }
}

// MARK: - Driver Bids Sheet (P2P Bidding)
struct DriverBidsSheet: View {
    @ObservedObject var viewModel: RideRequestViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Header
                VStack(spacing: 8) {
                    Image(systemName: "person.3.fill")
                        .font(.system(size: 40))
                        .foregroundColor(.green)

                    Text("Available Drivers")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("Select a driver to accept their offer")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 20)
                .padding(.bottom, 16)

                Divider()

                // Bids List
                if viewModel.incomingBids.isEmpty {
                    VStack(spacing: 16) {
                        Spacer()
                        ProgressView()
                            .scaleEffect(1.2)
                        Text("Waiting for drivers...")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        Spacer()
                    }
                } else {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(viewModel.incomingBids, id: \.id) { bid in
                                TinderSwipeCard(
                                    onAccept: {
                                        viewModel.acceptBid(bid)
                                        // Don't dismiss here - let acceptBid handle it
                                    },
                                    onDecline: {
                                        viewModel.rejectBid(bid)
                                    }
                                ) {
                                    DriverBidCard(
                                        bid: bid,
                                        isLoading: viewModel.isLoading,
                                        onAccept: {
                                            viewModel.acceptBid(bid)
                                        },
                                        onCounter: {
                                            viewModel.showCounterOffer(for: bid)
                                        },
                                        onReject: {
                                            viewModel.rejectBid(bid)
                                        }
                                    )
                                }
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") { dismiss() }
                }
            }
        }
        .presentationDetents([.large])
        .sheet(isPresented: $viewModel.showCounterSheet) {
            if let bid = viewModel.selectedBidForCounter {
                BidCounterSheet(viewModel: viewModel, bid: bid)
            }
        }
    }
}

// MARK: - Bid Counter Sheet
struct BidCounterSheet: View {
    @ObservedObject var viewModel: RideRequestViewModel
    let bid: RideBid
    @Environment(\.dismiss) private var dismiss
    @State private var counterPrice: String = ""
    @State private var counterMessage: String = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                // Header info
                VStack(spacing: 8) {
                    Text("Counter Offer")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("Make a counter-offer to \(bid.driver_name ?? "the driver")")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 20)

                // Current price display
                VStack(spacing: 4) {
                    Text("Driver's offer")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("$\(String(format: "%.2f", bid.proposed_price))")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(.green)
                }
                .padding()
                .frame(maxWidth: .infinity)
                .background(Color.green.opacity(0.1))
                .cornerRadius(12)

                // Counter price input
                VStack(alignment: .leading, spacing: 8) {
                    Text("Your counter price")
                        .font(.subheadline)
                        .fontWeight(.medium)

                    HStack {
                        Text("$")
                            .font(.title2)
                            .foregroundColor(.secondary)
                        TextField("0.00", text: $counterPrice)
                            .font(.title2)
                            .keyboardType(.decimalPad)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)

                    // Show remaining counters
                    Text("\(viewModel.customerCountersRemaining) counter offers remaining")
                        .font(.caption)
                        .foregroundColor(.orange)
                }

                // Optional message
                VStack(alignment: .leading, spacing: 8) {
                    Text("Message (optional)")
                        .font(.subheadline)
                        .fontWeight(.medium)

                    TextField("Add a message for the driver...", text: $counterMessage)
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                }

                // Warning display
                if let warning = viewModel.counterOfferWarning {
                    HStack {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(.orange)
                        Text(warning)
                            .font(.caption)
                            .foregroundColor(.orange)
                    }
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color.orange.opacity(0.1))
                    .cornerRadius(8)
                }

                Spacer()

                // Submit button
                SwipeToConfirmButton(
                    label: "Slide to Submit Counter",
                    accentColor: .purple,
                    isDisabled: !isValidPrice || viewModel.isLoading,
                    onConfirm: submitCounter
                )
                .padding(.horizontal, 24)
                .padding(.vertical, 8)
            }
            .padding()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        viewModel.showCounterSheet = false
                        dismiss()
                    }
                }
            }
        }
        .presentationDetents([.medium])
        .onAppear {
            // Pre-fill with a reasonable counter (e.g., 90% of driver's price)
            let suggestedCounter = bid.proposed_price * 0.9
            counterPrice = String(format: "%.2f", suggestedCounter)
        }
    }

    private var isValidPrice: Bool {
        guard let price = Double(counterPrice), price > 0 else { return false }
        return price < bid.proposed_price
    }

    private func submitCounter() {
        guard let price = Double(counterPrice) else { return }
        viewModel.counterBid(bid, counterPrice: price, message: counterMessage.isEmpty ? nil : counterMessage)
        dismiss()
    }
}

// MARK: - Driver Bid Card
struct DriverBidCard: View {
    let bid: RideBid
    let isLoading: Bool
    let onAccept: () -> Void
    let onCounter: () -> Void
    let onReject: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            // Driver Info Row
            HStack(spacing: 12) {
                // Driver Photo
                if let photoUrl = bid.driver_photo_url,
                   let url = URL(string: photoUrl.hasPrefix("http") ? photoUrl : "\(AppConfig.shared.cdnBaseURL)\(photoUrl)") {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 56, height: 56)
                            .clipShape(Circle())
                    } placeholder: {
                        driverPhotoPlaceholder
                    }
                } else {
                    driverPhotoPlaceholder
                }

                VStack(alignment: .leading, spacing: 4) {
                    // Name and Rating
                    HStack(spacing: 6) {
                        Text(bid.driver_name ?? "Driver")
                            .font(.headline)

                        if let rating = bid.driver_rating {
                            HStack(spacing: 2) {
                                Image(systemName: "star.fill")
                                    .font(.caption2)
                                    .foregroundColor(.yellow)
                                Text(String(format: "%.1f", rating))
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }

                    // Vehicle details
                    if let make = bid.driver_vehicle_make, let model = bid.driver_vehicle_model {
                        HStack(spacing: 4) {
                            if let color = bid.driver_vehicle_color {
                                Circle()
                                    .fill(Color.secondary.opacity(0.3))
                                    .frame(width: 10, height: 10)
                                    .overlay(
                                        Circle().stroke(Color.secondary, lineWidth: 0.5)
                                    )
                            }
                            Text([bid.driver_vehicle_year.map { String($0) }, make, model]
                                .compactMap { $0 }.joined(separator: " "))
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        if let plate = bid.driver_license_plate {
                            Text(plate)
                                .font(.caption)
                                .fontWeight(.medium)
                                .foregroundColor(.secondary)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.gray.opacity(0.15))
                                .cornerRadius(4)
                        }
                    } else if let vehicle = bid.driver_vehicle {
                        Text(vehicle)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }

                    // ETA
                    if let eta = bid.estimated_arrival_minutes {
                        HStack(spacing: 4) {
                            Image(systemName: "clock.fill")
                                .font(.caption2)
                                .foregroundColor(.blue)
                            Text("~\(eta) min away")
                                .font(.caption)
                                .foregroundColor(.blue)
                        }
                    }
                }

                Spacer()

                // Price and Status
                VStack(alignment: .trailing, spacing: 2) {
                    Text("$\(String(format: "%.2f", bid.proposed_price))")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.green)

                    // Show negotiation status
                    if bid.status == "countered" {
                        Text("Countered")
                            .font(.caption2)
                            .foregroundColor(.orange)
                    } else if let round = bid.negotiation_round, round > 1 {
                        Text("Round \(round)/2")
                            .font(.caption2)
                            .foregroundColor(.blue)
                    } else {
                        Text("Offered")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }

                    // Show if this is driver's final offer
                    if bid.is_final_round == true {
                        Text("Final Offer")
                            .font(.caption2)
                            .fontWeight(.semibold)
                            .foregroundColor(.orange)
                    }
                }
            }

            // Driver Message (if any)
            if let message = bid.message, !message.isEmpty {
                HStack {
                    Image(systemName: "quote.bubble.fill")
                        .font(.caption)
                        .foregroundColor(.gray)
                    Text(message)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .italic()
                    Spacer()
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 8)
                .background(Color.gray.opacity(0.1))
                .cornerRadius(8)
            }

            // Customer's counter price (if shown)
            if let counterPrice = bid.customer_counter_price {
                HStack {
                    Text("Your counter:")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("$\(String(format: "%.2f", counterPrice))")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.blue)
                    Spacer()
                    if bid.status == "countered" {
                        Text("Waiting for driver...")
                            .font(.caption)
                            .foregroundColor(.orange)
                    }
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 6)
                .background(Color.blue.opacity(0.1))
                .cornerRadius(8)
            }

            // Action Buttons - show different buttons based on bid status
            if bid.status == "countered" && bid.last_offer_by == "customer" {
                // Waiting for driver response - no actions available
                HStack {
                    Image(systemName: "clock.arrow.circlepath")
                        .foregroundColor(.orange)
                    Text("Waiting for driver's response...")
                        .font(.subheadline)
                        .foregroundColor(.orange)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(Color.orange.opacity(0.1))
                .cornerRadius(10)
            } else {
                // Normal action buttons
                HStack(spacing: 8) {
                    Button(action: onReject) {
                        HStack {
                            Image(systemName: "xmark")
                            Text("Decline")
                        }
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.red)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(10)
                    }
                    .disabled(isLoading)
                    .opacity(isLoading ? 0.5 : 1.0)

                    Button(action: onCounter) {
                        HStack {
                            Image(systemName: "arrow.left.arrow.right")
                            Text("Counter")
                        }
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.orange)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Color.orange.opacity(0.1))
                        .cornerRadius(10)
                    }
                    .disabled(isLoading)
                    .opacity(isLoading ? 0.5 : 1.0)

                    Button(action: onAccept) {
                        HStack {
                            if isLoading {
                                ProgressView()
                                    .scaleEffect(0.8)
                                    .tint(.white)
                            } else {
                                Image(systemName: "checkmark")
                            }
                            Text("Accept")
                        }
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(isLoading ? Color.gray : Color.green)
                        .cornerRadius(10)
                    }
                    .disabled(isLoading)
                }
            }
        }
        .padding()
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.08), radius: 8, x: 0, y: 2)
    }

    private var driverPhotoPlaceholder: some View {
        ZStack {
            Circle()
                .fill(Color.gray.opacity(0.2))
                .frame(width: 56, height: 56)
            Image(systemName: "person.fill")
                .font(.title3)
                .foregroundColor(.gray)
        }
    }
}

// MARK: - Share Trip Activity View

struct ShareTripActivityView: UIViewControllerRepresentable {
    let shareText: String

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: [shareText], applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

// MARK: - Preview
#Preview {
    RideRequestView()
        .environmentObject(AuthViewModel())
}
