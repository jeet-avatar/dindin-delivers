import SwiftUI

struct Theme {
    static let brandOrange = Color(red: 1.0, green: 0.427, blue: 0.0) // #FF6D00
    static let brandBlack = Color.black
    static let brandWhite = Color.white
    static let brandGrey = Color(red: 0.96, green: 0.96, blue: 0.96) // #F5F5F5
    static let textGrey = Color(red: 0.46, green: 0.46, blue: 0.46) // #757575
    static let brandGreen = Color(red: 0.298, green: 0.686, blue: 0.314) // #4CAF50 (Android Green)
    
    // Gradients
    static let brandGradient = LinearGradient(
        gradient: Gradient(colors: [brandOrange, Color(red: 1.0, green: 0.82, blue: 0.5)]), // #FFD180
        startPoint: .top,
        endPoint: .bottom
    )
}
