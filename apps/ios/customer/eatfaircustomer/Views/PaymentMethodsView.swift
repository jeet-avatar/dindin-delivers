import SwiftUI

struct PaymentMethodsView: View {
    var body: some View {
        ZStack {
            Theme.brandGrey.edgesIgnoringSafeArea(.all)
            
            VStack(spacing: 20) {
                // Card List
                VStack(spacing: 15) {
                    PaymentCardRow(icon: "creditcard.fill", title: "**** **** **** 1234", subtitle: "Expires 12/25")
                    PaymentCardRow(icon: "banknote.fill", title: "Cash on Delivery", subtitle: "Default Method")
                }
                .padding()
                
                Spacer()
                
                Button(action: {
                    // Add Card Logic
                }) {
                    Text("Add Payment Method")
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Theme.brandBlack)
                        .cornerRadius(12)
                        .padding(.horizontal)
                }
                .padding(.bottom, 30)
            }
        }
        .navigationTitle("Payment Methods")
    }
}

struct PaymentCardRow: View {
    let icon: String
    let title: String
    let subtitle: String
    
    var body: some View {
        HStack(spacing: 15) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(Theme.brandBlack)
                .frame(width: 40)
            
            VStack(alignment: .leading) {
                Text(title)
                    .font(.headline)
                Text(subtitle)
                    .font(.caption)
                    .foregroundColor(.gray)
            }
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .foregroundColor(.gray)
                .font(.caption)
        }
        .padding()
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
    }
}
