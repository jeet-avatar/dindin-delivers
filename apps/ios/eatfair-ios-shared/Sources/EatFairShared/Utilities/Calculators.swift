import Foundation
import CoreLocation

// MARK: - Tax Calculator
public class TaxCalculator {
    
    // US State Tax Rates (2024-2025)
    public static let stateTaxRates: [String: TaxRate] = [
        "AL": TaxRate(state: "AL", stateName: "Alabama", rate: 4.0),
        "AK": TaxRate(state: "AK", stateName: "Alaska", rate: 0.0), // No state sales tax
        "AZ": TaxRate(state: "AZ", stateName: "Arizona", rate: 5.6),
        "AR": TaxRate(state: "AR", stateName: "Arkansas", rate: 6.5),
        "CA": TaxRate(state: "CA", stateName: "California", rate: 7.25, localRate: 2.5), // SF: 8.625%, LA: 9.5%
        "CO": TaxRate(state: "CO", stateName: "Colorado", rate: 2.9, localRate: 5.0),
        "CT": TaxRate(state: "CT", stateName: "Connecticut", rate: 6.35),
        "DE": TaxRate(state: "DE", stateName: "Delaware", rate: 0.0), // No state sales tax
        "FL": TaxRate(state: "FL", stateName: "Florida", rate: 6.0, localRate: 1.5),
        "GA": TaxRate(state: "GA", stateName: "Georgia", rate: 4.0, localRate: 4.0),
        "HI": TaxRate(state: "HI", stateName: "Hawaii", rate: 4.0, localRate: 0.5),
        "ID": TaxRate(state: "ID", stateName: "Idaho", rate: 6.0),
        "IL": TaxRate(state: "IL", stateName: "Illinois", rate: 6.25, localRate: 4.75), // Chicago: 10.25%
        "IN": TaxRate(state: "IN", stateName: "Indiana", rate: 7.0),
        "IA": TaxRate(state: "IA", stateName: "Iowa", rate: 6.0),
        "KS": TaxRate(state: "KS", stateName: "Kansas", rate: 6.5, localRate: 3.0),
        "KY": TaxRate(state: "KY", stateName: "Kentucky", rate: 6.0),
        "LA": TaxRate(state: "LA", stateName: "Louisiana", rate: 4.45, localRate: 5.0),
        "ME": TaxRate(state: "ME", stateName: "Maine", rate: 5.5),
        "MD": TaxRate(state: "MD", stateName: "Maryland", rate: 6.0),
        "MA": TaxRate(state: "MA", stateName: "Massachusetts", rate: 6.25),
        "MI": TaxRate(state: "MI", stateName: "Michigan", rate: 6.0),
        "MN": TaxRate(state: "MN", stateName: "Minnesota", rate: 6.875, localRate: 1.0),
        "MS": TaxRate(state: "MS", stateName: "Mississippi", rate: 7.0),
        "MO": TaxRate(state: "MO", stateName: "Missouri", rate: 4.225, localRate: 4.0),
        "MT": TaxRate(state: "MT", stateName: "Montana", rate: 0.0), // No state sales tax
        "NE": TaxRate(state: "NE", stateName: "Nebraska", rate: 5.5, localRate: 2.0),
        "NV": TaxRate(state: "NV", stateName: "Nevada", rate: 6.85, localRate: 1.5),
        "NH": TaxRate(state: "NH", stateName: "New Hampshire", rate: 0.0), // No state sales tax
        "NJ": TaxRate(state: "NJ", stateName: "New Jersey", rate: 6.625),
        "NM": TaxRate(state: "NM", stateName: "New Mexico", rate: 5.125, localRate: 2.5),
        "NY": TaxRate(state: "NY", stateName: "New York", rate: 4.0, localRate: 4.5), // NYC: 8.875%
        "NC": TaxRate(state: "NC", stateName: "North Carolina", rate: 4.75, localRate: 2.25),
        "ND": TaxRate(state: "ND", stateName: "North Dakota", rate: 5.0, localRate: 2.5),
        "OH": TaxRate(state: "OH", stateName: "Ohio", rate: 5.75, localRate: 2.25),
        "OK": TaxRate(state: "OK", stateName: "Oklahoma", rate: 4.5, localRate: 4.5),
        "OR": TaxRate(state: "OR", stateName: "Oregon", rate: 0.0), // No state sales tax
        "PA": TaxRate(state: "PA", stateName: "Pennsylvania", rate: 6.0, localRate: 2.0), // Philly: 8%
        "RI": TaxRate(state: "RI", stateName: "Rhode Island", rate: 7.0),
        "SC": TaxRate(state: "SC", stateName: "South Carolina", rate: 6.0, localRate: 1.0),
        "SD": TaxRate(state: "SD", stateName: "South Dakota", rate: 4.5, localRate: 2.0),
        "TN": TaxRate(state: "TN", stateName: "Tennessee", rate: 7.0, localRate: 2.75),
        "TX": TaxRate(state: "TX", stateName: "Texas", rate: 6.25, localRate: 2.0),
        "UT": TaxRate(state: "UT", stateName: "Utah", rate: 6.1, localRate: 1.0),
        "VT": TaxRate(state: "VT", stateName: "Vermont", rate: 6.0, localRate: 1.0),
        "VA": TaxRate(state: "VA", stateName: "Virginia", rate: 5.3, localRate: 1.0),
        "WA": TaxRate(state: "WA", stateName: "Washington", rate: 6.5, localRate: 3.5), // Seattle: 10.25%
        "WV": TaxRate(state: "WV", stateName: "West Virginia", rate: 6.0, localRate: 1.0),
        "WI": TaxRate(state: "WI", stateName: "Wisconsin", rate: 5.0, localRate: 0.5),
        "WY": TaxRate(state: "WY", stateName: "Wyoming", rate: 4.0, localRate: 2.0),
        "DC": TaxRate(state: "DC", stateName: "Washington DC", rate: 6.0)
    ]
    
    public static func calculateTax(subtotal: Double, state: String) -> (tax: Double, rate: Double) {
        guard let taxRate = stateTaxRates[state.uppercased()] else {
            // Default to 7% if state not found
            let defaultRate = 7.0
            return (subtotal * (defaultRate / 100.0), defaultRate)
        }
        
        let totalRate = taxRate.totalRate
        let taxAmount = subtotal * (totalRate / 100.0)
        return (taxAmount, totalRate)
    }
    
    public static func calculateOrderTax(subtotal: Double, deliveryFee: Double, serviceFee: Double, state: String, includeDeliveryInTax: Bool = false) -> (tax: Double, rate: Double) {
        guard let taxRate = stateTaxRates[state.uppercased()] else {
            let defaultRate = 7.0
            let taxableAmount = includeDeliveryInTax ? subtotal + deliveryFee : subtotal
            return (taxableAmount * (defaultRate / 100.0), defaultRate)
        }
        
        let totalRate = taxRate.totalRate
        // Most states tax food + delivery fee
        let taxableAmount = includeDeliveryInTax ? subtotal + deliveryFee : subtotal
        let taxAmount = taxableAmount * (totalRate / 100.0)
        return (taxAmount, totalRate)
    }
}

// MARK: - Distance Calculator
public class DistanceCalculator {
    
    /// Calculate distance between two coordinates in miles
    public static func calculateDistance(from: CLLocationCoordinate2D, to: CLLocationCoordinate2D) -> Double {
        let location1 = CLLocation(latitude: from.latitude, longitude: from.longitude)
        let location2 = CLLocation(latitude: to.latitude, longitude: to.longitude)
        let distanceInMeters = location1.distance(from: location2)
        return distanceInMeters / 1609.34 // Convert meters to miles
    }
    
    /// Calculate distance for an order (restaurant to delivery address)
    public static func calculateOrderDistance(restaurant: RestaurantInfo, deliveryAddress: DeliveryAddress) -> Double {
        let restaurantCoord = CLLocationCoordinate2D(latitude: restaurant.latitude, longitude: restaurant.longitude)
        let deliveryCoord = CLLocationCoordinate2D(latitude: deliveryAddress.latitude, longitude: deliveryAddress.longitude)
        return calculateDistance(from: restaurantCoord, to: deliveryCoord)
    }
    
    /// Calculate delivery time estimate (20 mph average speed + 5 min prep)
    public static func estimateDeliveryTime(distanceInMiles: Double) -> Int {
        let drivingTimeMinutes = Int((distanceInMiles / 20.0) * 60) // 20 mph average
        let prepTimeMinutes = 5
        return drivingTimeMinutes + prepTimeMinutes
    }
    
    /// Format distance for display
    public static func formatDistance(_ miles: Double) -> String {
        if miles < 0.1 {
            return "< 0.1 mi"
        } else if miles < 1.0 {
            return String(format: "%.1f mi", miles)
        } else {
            return String(format: "%.1f mi", miles)
        }
    }
}

// MARK: - Promotion Calculator
public class PromotionCalculator {
    
    public static func applyPromotion(promotion: Promotion, subtotal: Double, deliveryFee: Double, total: Double) -> Double {
        // Check minimum order
        if subtotal < promotion.minimumOrder {
            return 0.0
        }
        
        var discount: Double = 0.0
        
        switch promotion.discountType {
        case "percentage":
            // Calculate based on applicable field
            let applicableAmount: Double
            switch promotion.applicableOn {
            case "subtotal":
                applicableAmount = subtotal
            case "delivery":
                applicableAmount = deliveryFee
            case "total":
                applicableAmount = total
            default:
                applicableAmount = subtotal
            }
            
            discount = applicableAmount * (promotion.discountValue / 100.0)
            
            // Apply max discount cap
            if let maxDiscount = promotion.maxDiscount {
                discount = min(discount, maxDiscount)
            }
            
        case "fixed":
            discount = promotion.discountValue
            
        default:
            discount = 0.0
        }
        
        return discount
    }
    
    public static func isPromotionValid(promotion: Promotion, currentTime: Int64 = Int64(Date().timeIntervalSince1970 * 1000)) -> Bool {
        // Check if active
        guard promotion.isActive else { return false }
        
        // Check date range
        guard currentTime >= promotion.startDate && currentTime <= promotion.endDate else { return false }
        
        // Check total usage limit
        if let totalLimit = promotion.totalUsageLimit, promotion.usageCount >= totalLimit {
            return false
        }
        
        return true
    }
}

// MARK: - Tip Calculator
public class TipCalculator {
    
    public static let presetPercentages: [Double] = [10.0, 15.0, 20.0, 25.0]
    
    public static func calculateTip(orderTotal: Double, percentage: Double) -> Double {
        return orderTotal * (percentage / 100.0)
    }
    
    public static func suggestedTips(orderTotal: Double) -> [(percentage: Double, amount: Double)] {
        return presetPercentages.map { percentage in
            let amount = calculateTip(orderTotal: orderTotal, percentage: percentage)
            return (percentage, amount)
        }
    }
}
