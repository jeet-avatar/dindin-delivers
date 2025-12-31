import SwiftUI
import EatFairShared
import CoreLocation

// MARK: - Rideshare Components
// Note: QuickStatPill is defined in AvailableOrdersView.swift
// Note: isValid extension is defined in LocationManager.swift
// Note: cornerRadius(_:corners:) extension is defined in MyDeliveriesView.swift

// This file serves as an import hub for Rideshare views
// All shared components are defined in their respective files to avoid duplication

// MARK: - Preview

#if DEBUG
struct RideshareComponents_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 20) {
            QuickStatPill(
                icon: "car.fill",
                value: "5",
                label: "Available",
                color: .blue
            )

            QuickStatPill(
                icon: "dollarsign.circle.fill",
                value: "$25",
                label: "Avg Price",
                color: .green
            )
        }
        .padding()
        .previewLayout(.sizeThatFits)
    }
}
#endif
