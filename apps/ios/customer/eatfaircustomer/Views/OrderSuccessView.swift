import SwiftUI
import Combine
import FirebaseFirestore
import FirebaseAuth
import EatFairShared

struct OrderSuccessView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var multiCartViewModel: MultiRestaurantCartViewModel
    @StateObject private var viewModel = OrderSuccessViewModel()

    @State private var showingRating = false
    @State private var showingTip = false
    @State private var showConfetti = true

    var body: some View {
        ZStack {
            // Background
            Theme.brandGrey.edgesIgnoringSafeArea(.all)

            ScrollView {
                VStack(spacing: 24) {
                    // Success Animation
                    successHeader

                    // Order Details Card (or placeholder if no order from Firebase)
                    if let order = viewModel.latestOrder {
                        orderDetailsCard(order: order)
                    } else {
                        // Show placeholder for dummy mode
                        dummyOrderCard
                    }

                    // Estimated Delivery
                    estimatedDeliveryCard

                    // Action Buttons
                    actionButtons

                    // Continue Shopping
                    Button(action: {
                        // Reset orderPlaced and dismiss
                        multiCartViewModel.orderPlaced = false
                        dismiss()
                    }) {
                        Text("Continue Shopping")
                            .fontWeight(.semibold)
                            .foregroundColor(Theme.brandGreen)
                    }
                    .padding(.top)
                }
                .padding()
            }

            // Confetti overlay
            if showConfetti {
                ConfettiView()
                    .allowsHitTesting(false)
            }
        }
        .navigationBarHidden(true)
        .onAppear {
            // Clear cart when success view appears
            multiCartViewModel.clearCart()

            // Fetch latest order from Firebase (if logged in)
            viewModel.fetchLatestOrder()

            // Hide confetti after animation
            DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                withAnimation {
                    showConfetti = false
                }
            }
        }
        .sheet(isPresented: $showingRating) {
            if let order = viewModel.latestOrder {
                RateDriverView(order: order)
            }
        }
        .sheet(isPresented: $showingTip) {
            if let order = viewModel.latestOrder {
                TipDriverView(order: order)
            }
        }
    }

    // MARK: - Success Header
    private var successHeader: some View {
        VStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(Theme.brandGreen.opacity(0.2))
                    .frame(width: 120, height: 120)

                Circle()
                    .fill(Theme.brandGreen)
                    .frame(width: 90, height: 90)

                Image(systemName: "checkmark")
                    .font(.system(size: 40, weight: .bold))
                    .foregroundColor(.white)
            }

            Text("Order Placed!")
                .font(.title)
                .fontWeight(.bold)

            Text("Your order has been confirmed and is being prepared")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.top, 20)
    }

    // MARK: - Dummy Order Card (for test mode)
    private var dummyOrderCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "receipt")
                    .foregroundColor(Theme.brandGreen)
                Text("Order Details")
                    .font(.headline)
                Spacer()
                Text("#TEST-\(Int.random(in: 100000...999999))")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Divider()

            // Restaurant info
            HStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color.gray.opacity(0.2))
                        .frame(width: 50, height: 50)
                    Image(systemName: "fork.knife")
                        .foregroundColor(.gray)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text("Your Order")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                    Text("Order placed successfully")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Text("Test Mode")
                    .font(.caption)
                    .foregroundColor(.orange)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.orange.opacity(0.1))
                    .cornerRadius(8)
            }

            // Delivery note
            HStack(spacing: 12) {
                Image(systemName: "info.circle.fill")
                    .foregroundColor(.blue)
                    .frame(width: 20)

                Text("In test mode, orders are simulated. Enable production mode to send real orders to restaurants.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
    }

    // MARK: - Order Details Card
    private func orderDetailsCard(order: Order) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "receipt")
                    .foregroundColor(Theme.brandGreen)
                Text("Order Details")
                    .font(.headline)
                Spacer()
                Text("#\(order.orderId)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Divider()

            // Restaurant info
            HStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color.gray.opacity(0.2))
                        .frame(width: 50, height: 50)
                    Image(systemName: "fork.knife")
                        .foregroundColor(.gray)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(order.restaurant.name)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                    Text("\(order.itemsCount) item\(order.itemsCount > 1 ? "s" : "")")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Text("$\(String(format: "%.2f", order.total))")
                    .font(.headline)
                    .foregroundColor(Theme.brandGreen)
            }

            // Delivery address
            HStack(spacing: 12) {
                Image(systemName: "location.fill")
                    .foregroundColor(.orange)
                    .frame(width: 20)

                VStack(alignment: .leading, spacing: 2) {
                    Text("Delivering to")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(order.deliveryAddress.fullAddress)
                        .font(.subheadline)
                        .lineLimit(2)
                }
            }
        }
        .padding()
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
    }

    // MARK: - Estimated Delivery Card
    private var estimatedDeliveryCard: some View {
        VStack(spacing: 16) {
            HStack {
                Image(systemName: "clock.fill")
                    .foregroundColor(.blue)
                Text("Estimated Delivery")
                    .font(.headline)
                Spacer()
            }

            // Timeline
            HStack(spacing: 0) {
                TimelineStep(icon: "checkmark.circle.fill", title: "Confirmed", isComplete: true, isActive: false)
                TimelineConnector(isComplete: true)
                TimelineStep(icon: "flame.fill", title: "Preparing", isComplete: false, isActive: true)
                TimelineConnector(isComplete: false)
                TimelineStep(icon: "bicycle", title: "On the way", isComplete: false, isActive: false)
                TimelineConnector(isComplete: false)
                TimelineStep(icon: "house.fill", title: "Delivered", isComplete: false, isActive: false)
            }

            HStack {
                VStack(alignment: .leading) {
                    Text("Arriving in")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("25-35 min")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(Theme.brandGreen)
                }

                Spacer()

                NavigationLink(destination: TrackOrderMapView()) {
                    HStack {
                        Image(systemName: "map.fill")
                        Text("Track Order")
                    }
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(Theme.brandGreen)
                    .cornerRadius(20)
                }
            }
        }
        .padding()
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
    }

    // MARK: - Action Buttons
    private var actionButtons: some View {
        VStack(spacing: 12) {
            // These would typically show after delivery, but shown for demo
            HStack(spacing: 12) {
                Button(action: { showingRating = true }) {
                    HStack {
                        Image(systemName: "star.fill")
                        Text("Rate")
                    }
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(12)
                }

                Button(action: { showingTip = true }) {
                    HStack {
                        Image(systemName: "heart.fill")
                        Text("Tip Driver")
                    }
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.pink)
                    .cornerRadius(12)
                }
            }

            // Contact support
            NavigationLink(destination: HelpSupportView()) {
                HStack {
                    Image(systemName: "questionmark.circle")
                    Text("Need Help?")
                }
                .font(.subheadline)
                .foregroundColor(.secondary)
            }
        }
    }
}

// MARK: - Timeline Components
struct TimelineStep: View {
    let icon: String
    let title: String
    let isComplete: Bool
    let isActive: Bool

    var body: some View {
        VStack(spacing: 4) {
            ZStack {
                Circle()
                    .fill(isComplete ? Theme.brandGreen : (isActive ? Theme.brandGreen.opacity(0.3) : Color.gray.opacity(0.2)))
                    .frame(width: 30, height: 30)

                Image(systemName: icon)
                    .font(.caption)
                    .foregroundColor(isComplete ? .white : (isActive ? Theme.brandGreen : .gray))
            }

            Text(title)
                .font(.caption2)
                .foregroundColor(isComplete || isActive ? .primary : .secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct TimelineConnector: View {
    let isComplete: Bool

    var body: some View {
        Rectangle()
            .fill(isComplete ? Theme.brandGreen : Color.gray.opacity(0.3))
            .frame(height: 2)
            .frame(maxWidth: 30)
            .offset(y: -10)
    }
}

// MARK: - Confetti View
struct ConfettiView: View {
    @State private var animate = false

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                ForEach(0..<50, id: \.self) { index in
                    ConfettiPiece(
                        color: [Color.red, Color.blue, Color.green, Color.yellow, Color.purple, Color.orange].randomElement() ?? .blue,
                        size: CGFloat.random(in: 5...12)
                    )
                    .position(
                        x: CGFloat.random(in: 0...geometry.size.width),
                        y: animate ? geometry.size.height + 50 : -50
                    )
                    .animation(
                        Animation.linear(duration: Double.random(in: 2...4))
                            .delay(Double.random(in: 0...1))
                            .repeatCount(1),
                        value: animate
                    )
                }
            }
        }
        .onAppear {
            animate = true
        }
    }
}

struct ConfettiPiece: View {
    let color: Color
    let size: CGFloat

    var body: some View {
        Rectangle()
            .fill(color)
            .frame(width: size, height: size * 1.5)
            .rotationEffect(.degrees(Double.random(in: 0...360)))
    }
}

// MARK: - Order Success ViewModel
class OrderSuccessViewModel: ObservableObject {
    @Published var latestOrder: Order?
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let db = Firestore.firestore()

    func fetchLatestOrder() {
        guard let userId = Auth.auth().currentUser?.uid else {
            // No user logged in - this is expected in test mode
            print("OrderSuccessViewModel: No user logged in, skipping order fetch")
            return
        }

        isLoading = true

        // Simple query without ordering to avoid index requirement
        db.collection("orders")
            .whereField("customerId", isEqualTo: userId)
            .limit(to: 1)
            .getDocuments { [weak self] snapshot, error in
                DispatchQueue.main.async {
                    self?.isLoading = false

                    if let error = error {
                        // Don't crash - just log and continue with dummy order card
                        print("OrderSuccessViewModel: Failed to fetch order - \(error.localizedDescription)")
                        self?.errorMessage = error.localizedDescription
                        return
                    }

                    if let document = snapshot?.documents.first,
                       let order = try? document.data(as: Order.self) {
                        self?.latestOrder = order
                    }
                }
            }
    }
}
