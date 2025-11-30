import SwiftUI

struct ReviewsView: View {
    var body: some View {
        List {
            ReviewRow(author: "John Doe", rating: 5, comment: "Amazing food! The butter chicken was perfect.", date: "2 days ago")
            ReviewRow(author: "Jane Smith", rating: 4, comment: "Good, but delivery was a bit slow.", date: "1 week ago")
            ReviewRow(author: "Mike Johnson", rating: 5, comment: "Best Indian food in town!", date: "2 weeks ago")
        }
        .navigationTitle("Reviews")
    }
}

struct ReviewRow: View {
    let author: String
    let rating: Int
    let comment: String
    let date: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(author)
                    .font(.headline)
                Spacer()
                HStack(spacing: 2) {
                    ForEach(0..<5) { index in
                        Image(systemName: index < rating ? "star.fill" : "star")
                            .foregroundColor(.orange)
                            .font(.caption)
                    }
                }
            }
            Text(comment)
                .font(.body)
            Text(date)
                .font(.caption)
                .foregroundColor(.gray)
        }
        .padding(.vertical, 4)
    }
}
