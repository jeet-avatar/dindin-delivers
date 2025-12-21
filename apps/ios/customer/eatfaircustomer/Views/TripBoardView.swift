import SwiftUI
import Combine
import EatFairShared

/// Trip Board - Craigslist-style rideshare listings
/// LEGALLY SAFE: User-generated content, no fare calculation, no payment processing
/// MATCH SUCCESS FEE MODEL: $1 from each party when match is confirmed
struct TripBoardView: View {
    @StateObject private var viewModel = TripBoardViewModel()
    @State private var showLegalDisclaimer = true
    @State private var hasAcceptedDisclaimer = false
    @State private var searchOriginCity = ""
    @State private var searchDestinationCity = ""
    @State private var showFilters = false
    @State private var selectedTab = 0 // 0 = Browse, 1 = My Matches

    var body: some View {
        NavigationStack {
            ZStack {
                if showLegalDisclaimer && !hasAcceptedDisclaimer {
                    legalDisclaimerView
                } else {
                    mainContent
                }
            }
            .navigationTitle("Trip Board")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                if hasAcceptedDisclaimer {
                    ToolbarItem(placement: .topBarTrailing) {
                        NavigationLink(destination: MyMatchesView()) {
                            Image(systemName: "person.2.badge.gearshape")
                        }
                    }
                }
            }
        }
    }

    // MARK: - Legal Disclaimer View

    private var legalDisclaimerView: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Warning Icon
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 60))
                    .foregroundColor(.orange)
                    .padding(.top, 40)

                Text("Important Legal Notice")
                    .font(.title)
                    .fontWeight(.bold)

                // Disclaimer Text
                VStack(alignment: .leading, spacing: 16) {
                    disclaimerSection(
                        title: "NOT A RIDESHARE SERVICE",
                        content: "Dollor.ai Trip Board is a CLASSIFIED ADVERTISING service, like Craigslist. We are NOT a Transportation Network Company (TNC) like Uber or Lyft."
                    )

                    disclaimerSection(
                        title: "USER-GENERATED CONTENT",
                        content: "All trip listings are created by users. Dollor.ai does not verify, endorse, or guarantee any listing content."
                    )

                    disclaimerSection(
                        title: "NO FARE CALCULATION",
                        content: "Dollor.ai does NOT calculate, suggest, or set prices. All prices are set entirely by users."
                    )

                    disclaimerSection(
                        title: "MATCHMAKING SERVICE FEE",
                        content: "FREE to browse, message, and negotiate. $1 fee from EACH party ONLY when both confirm a match. This is a matchmaking service fee, NOT a transportation fee."
                    )

                    disclaimerSection(
                        title: "ASSUMPTION OF RISK",
                        content: "You assume all risks when arranging transportation through connections made on this platform. Exercise caution when meeting strangers."
                    )

                    disclaimerSection(
                        title: "PRIVATE ARRANGEMENTS",
                        content: "Any transportation arranged is a private matter between individuals. Dollor.ai is not a party to any arrangement."
                    )
                }
                .padding(.horizontal)

                // Accept Button
                Button(action: {
                    withAnimation {
                        hasAcceptedDisclaimer = true
                        showLegalDisclaimer = false
                    }
                }) {
                    Text("I Understand and Accept")
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Theme.brandGreen)
                        .cornerRadius(12)
                }
                .padding(.horizontal)
                .padding(.top)

                Text("By continuing, you agree to our Terms of Service")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.bottom, 40)
            }
        }
        .background(Color(.systemGroupedBackground))
    }

    private func disclaimerSection(title: String, content: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.subheadline)
                .fontWeight(.bold)
                .foregroundColor(.orange)

            Text(content)
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }

    // MARK: - Main Content

    private var mainContent: some View {
        VStack(spacing: 0) {
            // Search Bar
            searchBar

            // Results
            if viewModel.isLoading {
                Spacer()
                ProgressView("Loading trips...")
                Spacer()
            } else if viewModel.listings.isEmpty {
                emptyStateView
            } else {
                listingsListView
            }
        }
        .background(Color(.systemGroupedBackground))
        .onAppear {
            if hasAcceptedDisclaimer {
                viewModel.loadListings()
            }
        }
        .refreshable {
            viewModel.loadListings()
        }
        .sheet(isPresented: $showFilters) {
            filterSheet
        }
    }

    // MARK: - Search Bar

    private var searchBar: some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                // Origin
                HStack {
                    Image(systemName: "circle")
                        .font(.caption)
                        .foregroundColor(.green)
                    TextField("From city", text: $searchOriginCity)
                        .font(.subheadline)
                }
                .padding(10)
                .background(Color(.systemBackground))
                .cornerRadius(8)

                Image(systemName: "arrow.right")
                    .foregroundColor(.secondary)

                // Destination
                HStack {
                    Image(systemName: "mappin.circle.fill")
                        .font(.caption)
                        .foregroundColor(.red)
                    TextField("To city", text: $searchDestinationCity)
                        .font(.subheadline)
                }
                .padding(10)
                .background(Color(.systemBackground))
                .cornerRadius(8)
            }

            HStack {
                Button(action: {
                    viewModel.searchOriginCity = searchOriginCity.isEmpty ? nil : searchOriginCity
                    viewModel.searchDestinationCity = searchDestinationCity.isEmpty ? nil : searchDestinationCity
                    viewModel.loadListings()
                }) {
                    HStack {
                        Image(systemName: "magnifyingglass")
                        Text("Search")
                    }
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Theme.brandGreen)
                    .cornerRadius(8)
                }

                Spacer()

                Button(action: { showFilters = true }) {
                    HStack {
                        Image(systemName: "slider.horizontal.3")
                        Text("Filters")
                    }
                    .font(.subheadline)
                    .foregroundColor(.primary)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Color(.systemBackground))
                    .cornerRadius(8)
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
    }

    // MARK: - Listings List

    private var listingsListView: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                // Platform notice
                platformNoticeCard

                ForEach(viewModel.listings) { listing in
                    NavigationLink(destination: TripListingDetailView(listing: listing)) {
                        TripListingCard(listing: listing)
                    }
                    .buttonStyle(PlainButtonStyle())
                }

                // Load more
                if viewModel.hasMorePages {
                    Button("Load More") {
                        viewModel.loadMoreListings()
                    }
                    .padding()
                }
            }
            .padding()
        }
    }

    private var platformNoticeCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 12) {
                Image(systemName: "info.circle.fill")
                    .foregroundColor(.blue)

                Text("This is a bulletin board service. All listings are user-generated. Dollor.ai does not verify or endorse any listing.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            HStack(spacing: 12) {
                Image(systemName: "dollarsign.circle.fill")
                    .foregroundColor(.green)

                Text("FREE to browse, message & negotiate. $1 fee only when you confirm a match.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color.blue.opacity(0.1))
        .cornerRadius(8)
    }

    // MARK: - Empty State

    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Spacer()

            Image(systemName: "car.2.fill")
                .font(.system(size: 60))
                .foregroundColor(.gray.opacity(0.5))

            Text("No Trips Found")
                .font(.title2)
                .fontWeight(.semibold)

            Text("Be the first to post a trip listing!")
                .font(.subheadline)
                .foregroundColor(.secondary)

            NavigationLink(destination: PostTripListingView(hasAcceptedDisclaimer: hasAcceptedDisclaimer)) {
                HStack {
                    Image(systemName: "plus.circle.fill")
                    Text("Post a Trip")
                }
                .fontWeight(.medium)
                .foregroundColor(.white)
                .padding(.horizontal, 24)
                .padding(.vertical, 12)
                .background(Theme.brandGreen)
                .cornerRadius(12)
            }
            .padding(.top)

            Spacer()
        }
        .padding()
    }

    // MARK: - Filter Sheet

    private var filterSheet: some View {
        NavigationStack {
            Form {
                Section("Seats Needed") {
                    Stepper("Minimum seats: \(viewModel.minSeats)", value: $viewModel.minSeats, in: 1...10)
                }

                Section("Looking For") {
                    Picker("Type", selection: $viewModel.searchIsDriver) {
                        Text("Drivers with seats").tag(true as Bool?)
                        Text("Passengers seeking rides").tag(false as Bool?)
                        Text("Both").tag(nil as Bool?)
                    }
                    .pickerStyle(.segmented)
                }
            }
            .navigationTitle("Filters")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Apply") {
                        showFilters = false
                        viewModel.loadListings()
                    }
                }
            }
        }
        .presentationDetents([.medium])
    }
}

// MARK: - Trip Listing Card

struct TripListingCard: View {
    let listing: TripListing

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Route
            HStack(spacing: 8) {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 4) {
                        Circle()
                            .fill(Color.green)
                            .frame(width: 8, height: 8)
                        Text(listing.originCity)
                            .font(.headline)
                    }

                    HStack(spacing: 4) {
                        Circle()
                            .fill(Color.red)
                            .frame(width: 8, height: 8)
                        Text(listing.destinationCity)
                            .font(.headline)
                    }
                }

                Spacer()

                // Price
                VStack(alignment: .trailing, spacing: 2) {
                    Text(listing.formattedPrice)
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(Theme.brandGreen)

                    if listing.priceNegotiable {
                        Text("Negotiable")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
            }

            Divider()

            // Details Row
            HStack {
                Label(listing.departureDate, systemImage: "calendar")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Spacer()

                Label("\(listing.availableSeats) seat\(listing.availableSeats > 1 ? "s" : "")", systemImage: "person.2")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Spacer()

                if listing.isDriver {
                    Label("Driver", systemImage: "car.fill")
                        .font(.caption)
                        .foregroundColor(.blue)
                } else {
                    Label("Passenger", systemImage: "figure.wave")
                        .font(.caption)
                        .foregroundColor(.orange)
                }
            }

            // Poster
            HStack {
                Text("Posted by \(listing.posterName)")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Spacer()

                if listing.returnTripAvailable {
                    Label("Return available", systemImage: "arrow.uturn.left")
                        .font(.caption2)
                        .foregroundColor(.purple)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}

// MARK: - Trip Listing Detail View

struct TripListingDetailView: View {
    let listing: TripListing
    @State private var showContactSheet = false
    @State private var showProposeMatchSheet = false
    @State private var hasAcknowledgedContact = false
    @State private var message = ""
    @State private var agreedPrice: String = ""
    @State private var isProposingMatch = false
    @State private var matchProposalResult: String?
    @State private var showMatchResult = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Route Card
                routeCard

                // Details Card
                detailsCard

                // Price Card
                priceCard

                // Vehicle Info
                if let vehicle = listing.vehicleDescription {
                    infoCard(title: "Vehicle", content: vehicle, icon: "car.fill")
                }

                // Trip Description
                if let desc = listing.tripDescription {
                    infoCard(title: "Trip Details", content: desc, icon: "doc.text")
                }

                // Preferences
                if let prefs = listing.preferences {
                    infoCard(title: "Preferences", content: prefs, icon: "checkmark.circle")
                }

                // Legal Disclaimer
                disclaimerCard

                // Contact Button
                contactButton
            }
            .padding()
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("Trip Details")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showContactSheet) {
            contactSheet
        }
        .sheet(isPresented: $showProposeMatchSheet) {
            proposeMatchSheet
        }
        .alert("Match Proposal", isPresented: $showMatchResult) {
            Button("OK") { }
        } message: {
            Text(matchProposalResult ?? "")
        }
    }

    private var proposeMatchSheet: some View {
        NavigationStack {
            Form {
                Section {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Image(systemName: "dollarsign.circle.fill")
                                .foregroundColor(.green)
                            Text("Match Success Fee")
                                .fontWeight(.semibold)
                        }

                        Text("Proposing a match is FREE. You only pay $1 if BOTH parties confirm the match.")
                            .font(.caption)
                            .foregroundColor(.secondary)

                        HStack {
                            Image(systemName: "checkmark.circle")
                                .foregroundColor(.green)
                            Text("FREE to propose")
                        }
                        .font(.caption)

                        HStack {
                            Image(systemName: "checkmark.circle")
                                .foregroundColor(.green)
                            Text("FREE to negotiate")
                        }
                        .font(.caption)

                        HStack {
                            Image(systemName: "dollarsign.circle")
                                .foregroundColor(.orange)
                            Text("$1 each ONLY when both confirm")
                        }
                        .font(.caption)
                    }
                }

                Section("Agreed Price (from your negotiation)") {
                    TextField("Enter the agreed price", text: $agreedPrice)
                        .keyboardType(.decimalPad)

                    Text("This is the price YOU and the poster agreed on. Dollor.ai does NOT set prices.")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }

                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.orange)
                            Text("Legal Notice")
                                .fontWeight(.semibold)
                        }

                        Text(TripBoardLegal.matchDisclaimer)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                Section {
                    Button(action: proposeMatch) {
                        HStack {
                            if isProposingMatch {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Image(systemName: "paperplane.fill")
                            }
                            Text("Send Match Proposal")
                        }
                        .frame(maxWidth: .infinity)
                        .foregroundColor(.white)
                    }
                    .listRowBackground(Theme.brandGreen)
                    .disabled(agreedPrice.isEmpty || isProposingMatch)
                }
            }
            .navigationTitle("Propose Match")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { showProposeMatchSheet = false }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    private func proposeMatch() {
        guard let price = Double(agreedPrice) else { return }
        isProposingMatch = true

        TripBoardService.shared.proposeMatch(
            listingId: listing.id,
            agreedPrice: price
        ) { result in
            isProposingMatch = false
            showProposeMatchSheet = false

            switch result {
            case .success(_):
                matchProposalResult = "Match proposal sent! The poster will review and can confirm. You'll both pay $1 only if they confirm."
                showMatchResult = true
            case .failure(let error):
                matchProposalResult = "Failed: \(error.localizedDescription)"
                showMatchResult = true
            }
        }
    }

    private var routeCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 8) {
                        Circle()
                            .fill(Color.green)
                            .frame(width: 12, height: 12)
                        VStack(alignment: .leading) {
                            Text("From")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text("\(listing.originCity), \(listing.originState)")
                                .font(.headline)
                        }
                    }

                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .frame(width: 2, height: 20)
                        .padding(.leading, 5)

                    HStack(spacing: 8) {
                        Circle()
                            .fill(Color.red)
                            .frame(width: 12, height: 12)
                        VStack(alignment: .leading) {
                            Text("To")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text("\(listing.destinationCity), \(listing.destinationState)")
                                .font(.headline)
                        }
                    }
                }

                Spacer()
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }

    private var detailsCard: some View {
        VStack(spacing: 16) {
            HStack {
                detailItem(icon: "calendar", title: "Date", value: listing.departureDate)
                Spacer()
                if let time = listing.departureTime {
                    detailItem(icon: "clock", title: "Time", value: time)
                    Spacer()
                }
                detailItem(icon: "person.2", title: "Seats", value: "\(listing.availableSeats)")
            }

            if listing.returnTripAvailable {
                HStack {
                    Image(systemName: "arrow.uturn.left.circle.fill")
                        .foregroundColor(.purple)
                    Text("Return trip available")
                        .font(.subheadline)
                        .foregroundColor(.purple)
                    Spacer()
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }

    private func detailItem(icon: String, title: String, value: String) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(Theme.brandGreen)
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
            Text(value)
                .font(.subheadline)
                .fontWeight(.medium)
        }
    }

    private var priceCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Price")
                    .font(.headline)
                Spacer()
                Text(listing.formattedPrice)
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(Theme.brandGreen)
            }

            if listing.priceNegotiable {
                Label("Price is negotiable", systemImage: "checkmark.circle")
                    .font(.caption)
                    .foregroundColor(.blue)
            }

            if let note = listing.priceNote {
                Text(note)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            // Important notice
            HStack(spacing: 8) {
                Image(systemName: "info.circle.fill")
                    .foregroundColor(.orange)
                Text("This price was set by the poster. Dollor.ai does NOT calculate or suggest prices.")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .padding(.top, 8)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }

    private func infoCard(title: String, content: String, icon: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(Theme.brandGreen)
                Text(title)
                    .font(.headline)
            }
            Text(content)
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }

    private var disclaimerCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundColor(.orange)
                Text("Important Notice")
                    .font(.headline)
            }
            Text(listing.disclaimer)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.orange.opacity(0.1))
        .cornerRadius(12)
    }

    private var contactButton: some View {
        VStack(spacing: 12) {
            // Message button (FREE)
            Button(action: { showContactSheet = true }) {
                HStack {
                    Image(systemName: "message.fill")
                    Text("Message \(listing.posterName)")
                    Spacer()
                    Text("FREE")
                        .font(.caption)
                        .fontWeight(.bold)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.white.opacity(0.2))
                        .cornerRadius(4)
                }
                .fontWeight(.semibold)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.blue)
                .cornerRadius(12)
            }

            // Propose Match button
            Button(action: { showProposeMatchSheet = true }) {
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                    Text("Propose Match")
                    Spacer()
                    Text("$1 when confirmed")
                        .font(.caption)
                        .fontWeight(.bold)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.white.opacity(0.2))
                        .cornerRadius(4)
                }
                .fontWeight(.semibold)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Theme.brandGreen)
                .cornerRadius(12)
            }
        }
    }

    private var contactSheet: some View {
        NavigationStack {
            Form {
                Section {
                    if !hasAcknowledgedContact {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundColor(.orange)
                                Text("Before Contacting")
                                    .fontWeight(.semibold)
                            }

                            Text(TripBoardLegal.messageDisclaimer)
                                .font(.caption)
                                .foregroundColor(.secondary)

                            Toggle("I understand Dollor.ai is not a party to any arrangement I make", isOn: $hasAcknowledgedContact)
                                .font(.subheadline)
                        }
                    }
                }

                if hasAcknowledgedContact {
                    Section("Your Message") {
                        TextEditor(text: $message)
                            .frame(height: 120)
                    }

                    Section {
                        Button(action: sendMessage) {
                            HStack {
                                Image(systemName: "paperplane.fill")
                                Text("Send Message")
                            }
                            .frame(maxWidth: .infinity)
                        }
                    }
                }
            }
            .navigationTitle("Contact Poster")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { showContactSheet = false }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    private func sendMessage() {
        // Would send via TripBoardService
        showContactSheet = false
    }
}

// MARK: - Post Trip Listing View

struct PostTripListingView: View {
    let hasAcceptedDisclaimer: Bool
    @Environment(\.dismiss) private var dismiss

    @State private var originCity = ""
    @State private var originState = "CA"
    @State private var destinationCity = ""
    @State private var destinationState = "CA"
    @State private var departureDate = Date()
    @State private var availableSeats = 1
    @State private var askingPrice = ""
    @State private var priceNegotiable = true
    @State private var priceNote = ""
    @State private var vehicleDescription = ""
    @State private var tripDescription = ""
    @State private var isDriver = true
    @State private var showConfirmation = false

    var body: some View {
        Form {
            Section("Route") {
                TextField("From City", text: $originCity)
                Picker("From State", selection: $originState) {
                    ForEach(states, id: \.self) { Text($0) }
                }

                TextField("To City", text: $destinationCity)
                Picker("To State", selection: $destinationState) {
                    ForEach(states, id: \.self) { Text($0) }
                }
            }

            Section("Trip Details") {
                DatePicker("Departure Date", selection: $departureDate, displayedComponents: .date)

                Stepper("Available Seats: \(availableSeats)", value: $availableSeats, in: 1...8)

                Picker("I am a", selection: $isDriver) {
                    Text("Driver with seats").tag(true)
                    Text("Passenger seeking ride").tag(false)
                }
            }

            Section(header: Text("Price"), footer: Text("YOU set the price. Dollor.ai does NOT calculate or suggest prices.")) {
                TextField("Your asking price (optional)", text: $askingPrice)
                    .keyboardType(.decimalPad)

                Toggle("Price is negotiable", isOn: $priceNegotiable)

                TextField("Price note (e.g., 'split gas costs')", text: $priceNote)
            }

            Section("Additional Info") {
                TextField("Vehicle description", text: $vehicleDescription)
                TextEditor(text: $tripDescription)
                    .frame(height: 80)
            }

            Section {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "checkmark.shield.fill")
                            .foregroundColor(.green)
                        Text("Legal Acknowledgment")
                            .fontWeight(.semibold)
                    }

                    Text("By posting, you confirm this is YOUR listing. Dollor.ai only hosts user-generated content and is not a party to any arrangement.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            Section {
                Button(action: postListing) {
                    HStack {
                        Image(systemName: "paperplane.fill")
                        Text("Post Listing")
                    }
                    .frame(maxWidth: .infinity)
                    .foregroundColor(.white)
                }
                .listRowBackground(Theme.brandGreen)
            }
        }
        .navigationTitle("Post Trip")
        .alert("Listing Posted!", isPresented: $showConfirmation) {
            Button("OK") { dismiss() }
        } message: {
            Text("Your trip listing is now live.")
        }
    }

    private func postListing() {
        // Would use TripBoardService.shared.createListing
        showConfirmation = true
    }

    private let states = ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"]
}

// MARK: - View Model

class TripBoardViewModel: ObservableObject {
    @Published var listings: [TripListing] = []
    @Published var isLoading = false
    @Published var error: String?

    var searchOriginCity: String?
    var searchDestinationCity: String?
    @Published var minSeats = 1
    @Published var searchIsDriver: Bool? = true

    private var currentPage = 1
    private var totalListings = 0
    var hasMorePages: Bool { listings.count < totalListings }

    deinit {
        // Clean up any resources if needed
    }

    func loadListings() {
        isLoading = true
        currentPage = 1

        TripBoardService.shared.searchListings(
            originCity: searchOriginCity,
            destinationCity: searchDestinationCity,
            minSeats: minSeats,
            isDriver: searchIsDriver,
            page: currentPage
        ) { [weak self] result in
            self?.isLoading = false
            switch result {
            case .success(let response):
                self?.listings = response.listings
                self?.totalListings = response.total
            case .failure(let err):
                self?.error = err.localizedDescription
            }
        }
    }

    func loadMoreListings() {
        currentPage += 1
        TripBoardService.shared.searchListings(
            originCity: searchOriginCity,
            destinationCity: searchDestinationCity,
            minSeats: minSeats,
            isDriver: searchIsDriver,
            page: currentPage
        ) { [weak self] result in
            switch result {
            case .success(let response):
                self?.listings.append(contentsOf: response.listings)
            case .failure:
                break
            }
        }
    }
}

// MARK: - My Matches View

struct MyMatchesView: View {
    @StateObject private var viewModel = MyMatchesViewModel()
    @State private var selectedMatch: TripMatch?
    @State private var showConfirmSheet = false

    var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView("Loading matches...")
            } else if viewModel.matches.isEmpty {
                emptyState
            } else {
                matchesList
            }
        }
        .navigationTitle("My Matches")
        .onAppear { viewModel.loadMatches() }
        .refreshable { viewModel.loadMatches() }
        .sheet(isPresented: $showConfirmSheet) {
            if let match = selectedMatch {
                ConfirmMatchSheet(match: match, onConfirm: {
                    viewModel.loadMatches()
                    showConfirmSheet = false
                })
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "person.2.slash")
                .font(.system(size: 60))
                .foregroundColor(.gray.opacity(0.5))

            Text("No Matches Yet")
                .font(.title2)
                .fontWeight(.semibold)

            Text("When you propose a match or someone proposes to you, they'll appear here.")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
        .padding()
    }

    private var matchesList: some View {
        List {
            // Fee info card
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "dollarsign.circle.fill")
                            .foregroundColor(.green)
                        Text("Match Success Fee")
                            .fontWeight(.semibold)
                    }
                    Text("$1 from each party ONLY when both confirm. FREE until then!")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            // Pending matches (needs your confirmation)
            if !viewModel.pendingMatches.isEmpty {
                Section("Awaiting Your Confirmation") {
                    ForEach(viewModel.pendingMatches) { match in
                        MatchCard(match: match, isPending: true) {
                            selectedMatch = match
                            showConfirmSheet = true
                        }
                    }
                }
            }

            // Proposed matches (waiting for other party)
            if !viewModel.proposedMatches.isEmpty {
                Section("Waiting for Other Party") {
                    ForEach(viewModel.proposedMatches) { match in
                        MatchCard(match: match, isPending: false) { }
                    }
                }
            }

            // Confirmed matches
            if !viewModel.confirmedMatches.isEmpty {
                Section("Confirmed Matches") {
                    ForEach(viewModel.confirmedMatches) { match in
                        ConfirmedMatchCard(match: match)
                    }
                }
            }
        }
    }
}

struct MatchCard: View {
    let match: TripMatch
    let isPending: Bool
    let onConfirm: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("\(match.originCity) → \(match.destinationCity)")
                        .font(.headline)
                    Text("Agreed Price: $\(String(format: "%.2f", match.agreedPrice))")
                        .font(.subheadline)
                        .foregroundColor(Theme.brandGreen)
                }

                Spacer()

                if isPending {
                    Button(action: onConfirm) {
                        Text("Confirm")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Theme.brandGreen)
                            .cornerRadius(6)
                    }
                } else {
                    Text("Pending")
                        .font(.caption)
                        .foregroundColor(.orange)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.orange.opacity(0.1))
                        .cornerRadius(4)
                }
            }

            Text("With: \(match.otherPartyName)")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
}

struct ConfirmedMatchCard: View {
    let match: TripMatch

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("\(match.originCity) → \(match.destinationCity)")
                        .font(.headline)
                    Text("Agreed Price: $\(String(format: "%.2f", match.agreedPrice))")
                        .font(.subheadline)
                        .foregroundColor(Theme.brandGreen)
                }

                Spacer()

                HStack(spacing: 4) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                    Text("Confirmed")
                        .font(.caption)
                        .foregroundColor(.green)
                }
            }

            // Contact info revealed after confirmation
            VStack(alignment: .leading, spacing: 4) {
                Label(match.otherPartyName, systemImage: "person.fill")
                    .font(.subheadline)
                if let phone = match.otherPartyPhone {
                    Label(phone, systemImage: "phone.fill")
                        .font(.subheadline)
                        .foregroundColor(.blue)
                }
                if let email = match.otherPartyEmail {
                    Label(email, systemImage: "envelope.fill")
                        .font(.caption)
                        .foregroundColor(.blue)
                }
            }
            .padding()
            .background(Color.green.opacity(0.1))
            .cornerRadius(8)

            // Safety Button - Navigate to pre-trip safety checklist
            NavigationLink(destination: TripSafetyView(match: match)) {
                HStack {
                    Image(systemName: "shield.checkered")
                    Text("Pre-Trip Safety")
                    Spacer()
                    Image(systemName: "chevron.right")
                }
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(.white)
                .padding()
                .background(Color.blue)
                .cornerRadius(10)
            }
        }
        .padding(.vertical, 4)
    }
}

struct ConfirmMatchSheet: View {
    let match: TripMatch
    let onConfirm: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var isConfirming = false
    @State private var showError = false
    @State private var errorMessage = ""

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("\(match.originCity) → \(match.destinationCity)")
                            .font(.headline)

                        HStack {
                            Text("Agreed Price:")
                            Spacer()
                            Text("$\(String(format: "%.2f", match.agreedPrice))")
                                .fontWeight(.bold)
                                .foregroundColor(Theme.brandGreen)
                        }

                        HStack {
                            Text("With:")
                            Spacer()
                            Text(match.otherPartyName)
                        }
                    }
                }

                Section {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Image(systemName: "dollarsign.circle.fill")
                                .foregroundColor(.orange)
                            Text("Match Success Fee: $\(String(format: "%.2f", AppConfig.shared.rideshareTier1Fee))")
                                .fontWeight(.semibold)
                        }

                        Text("By confirming this match, you agree to pay a $\(String(format: "%.0f", AppConfig.shared.rideshareTier1Fee)) matchmaking service fee. This fee is for the platform service, NOT for transportation.")
                            .font(.caption)
                            .foregroundColor(.secondary)

                        Text("After confirmation, you'll receive the other party's contact information to arrange your private trip.")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.orange)
                            Text("Legal Notice")
                                .fontWeight(.semibold)
                        }

                        Text(TripBoardLegal.matchDisclaimer)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                Section {
                    Button(action: confirmMatch) {
                        HStack {
                            if isConfirming {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Image(systemName: "checkmark.circle.fill")
                            }
                            Text("Confirm Match ($1)")
                        }
                        .frame(maxWidth: .infinity)
                        .foregroundColor(.white)
                    }
                    .listRowBackground(Theme.brandGreen)
                    .disabled(isConfirming)
                }
            }
            .navigationTitle("Confirm Match")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
            .alert("Error", isPresented: $showError) {
                Button("OK") { }
            } message: {
                Text(errorMessage)
            }
        }
    }

    private func confirmMatch() {
        isConfirming = true

        TripBoardService.shared.confirmMatch(matchId: match.id) { result in
            isConfirming = false

            switch result {
            case .success:
                onConfirm()
            case .failure(let error):
                errorMessage = error.localizedDescription
                showError = true
            }
        }
    }
}

class MyMatchesViewModel: ObservableObject {
    @Published var matches: [TripMatch] = []
    @Published var isLoading = false

    var pendingMatches: [TripMatch] {
        matches.filter { $0.status == "pending" && $0.needsYourConfirmation }
    }

    var proposedMatches: [TripMatch] {
        matches.filter { $0.status == "pending" && !$0.needsYourConfirmation }
    }

    var confirmedMatches: [TripMatch] {
        matches.filter { $0.status == "confirmed" }
    }

    deinit {
        // Clean up any resources if needed
    }

    func loadMatches() {
        isLoading = true

        TripBoardService.shared.getMyMatches { [weak self] result in
            self?.isLoading = false
            switch result {
            case .success(let matches):
                self?.matches = matches
            case .failure:
                break
            }
        }
    }
}

// MARK: - Trip Safety View
/// Pre-trip safety checklist, recording consent, payment confirmation, and identity verification
struct TripSafetyView: View {
    let match: TripMatch
    @StateObject private var viewModel: TripSafetyViewModel

    init(match: TripMatch) {
        self.match = match
        self._viewModel = StateObject(wrappedValue: TripSafetyViewModel(match: match))
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Header
                safetyHeaderCard

                // Your Verification Code Card
                verificationCodeCard

                // Recording Consent
                recordingConsentCard

                // Payment Confirmation
                paymentConfirmationCard

                // Identity Verification
                identityVerificationCard

                // Safety Checklist
                safetyChecklistCard

                // Trip Status
                tripStatusCard

                // Legal Disclaimer
                legalDisclaimerCard
            }
            .padding()
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("Pre-Trip Safety")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            viewModel.loadSafetyStatus()
        }
        .alert("Result", isPresented: $viewModel.showAlert) {
            Button("OK") { }
        } message: {
            Text(viewModel.alertMessage)
        }
    }

    // MARK: - Header Card

    private var safetyHeaderCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "shield.checkered")
                    .font(.title)
                    .foregroundColor(.blue)
                Text("Trip Safety Checklist")
                    .font(.title2)
                    .fontWeight(.bold)
            }

            Text("\(match.originCity) → \(match.destinationCity)")
                .font(.headline)
                .foregroundColor(.secondary)

            Text("with \(match.otherPartyName)")
                .font(.subheadline)
                .foregroundColor(.secondary)

            // Ready status
            HStack {
                Circle()
                    .fill(viewModel.readyToStart ? Color.green : Color.orange)
                    .frame(width: 12, height: 12)
                Text(viewModel.readyToStart ? "Ready to Start" : "Complete Safety Steps")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(viewModel.readyToStart ? .green : .orange)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }

    // MARK: - Verification Code Card

    private var verificationCodeCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "number.square.fill")
                    .foregroundColor(.purple)
                Text("Your Verification Code")
                    .font(.headline)
            }

            if let code = viewModel.myVerificationCode {
                HStack {
                    Spacer()
                    Text(code)
                        .font(.system(size: 48, weight: .bold, design: .rounded))
                        .foregroundColor(.purple)
                    Spacer()
                }
                .padding()
                .background(Color.purple.opacity(0.1))
                .cornerRadius(12)

                Text("Show this code to \(match.otherPartyName) when you meet. They will enter it in their app to verify your identity.")
                    .font(.caption)
                    .foregroundColor(.secondary)

                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.orange)
                        .font(.caption)
                    Text("Do NOT share this code before meeting in person!")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.orange)
                }
            } else {
                ProgressView()
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }

    // MARK: - Recording Consent Card

    private var recordingConsentCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "video.fill")
                    .foregroundColor(.red)
                Text("Recording Consent")
                    .font(.headline)
                Spacer()
                statusBadge(complete: viewModel.mutualRecordingAgreed)
            }

            Text("Both parties can agree to allow audio/video recording for safety.")
                .font(.caption)
                .foregroundColor(.secondary)

            HStack {
                VStack(alignment: .leading) {
                    Label(viewModel.yourRecordingConsent ? "You consented" : "You haven't consented",
                          systemImage: viewModel.yourRecordingConsent ? "checkmark.circle.fill" : "circle")
                        .font(.subheadline)
                        .foregroundColor(viewModel.yourRecordingConsent ? .green : .secondary)

                    Label(viewModel.otherRecordingConsent ? "\(match.otherPartyName) consented" : "\(match.otherPartyName) hasn't consented",
                          systemImage: viewModel.otherRecordingConsent ? "checkmark.circle.fill" : "circle")
                        .font(.subheadline)
                        .foregroundColor(viewModel.otherRecordingConsent ? .green : .secondary)
                }
                Spacer()
            }

            if !viewModel.yourRecordingConsent {
                Button(action: { viewModel.giveRecordingConsent() }) {
                    HStack {
                        Image(systemName: "checkmark.circle")
                        Text("I Consent to Recording")
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(10)
                }
            }

            Text("This is a private agreement. Dollor.ai does NOT record or store recordings.")
                .font(.caption2)
                .foregroundColor(.secondary)
                .italic()
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }

    // MARK: - Payment Confirmation Card

    private var paymentConfirmationCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "dollarsign.circle.fill")
                    .foregroundColor(.green)
                Text("Payment Confirmation")
                    .font(.headline)
                Spacer()
                statusBadge(complete: viewModel.paymentConfirmed)
            }

            Text("Confirm payment method and that payment has been arranged before the trip.")
                .font(.caption)
                .foregroundColor(.secondary)

            // Payment method picker
            VStack(alignment: .leading, spacing: 8) {
                Text("Payment Method")
                    .font(.subheadline)
                    .fontWeight(.medium)

                Picker("Method", selection: $viewModel.selectedPaymentMethod) {
                    Text("Select...").tag("")
                    Text("Cash").tag("cash")
                    Text("Venmo").tag("venmo")
                    Text("PayPal").tag("paypal")
                    Text("Zelle").tag("zelle")
                    Text("Other").tag("other")
                }
                .pickerStyle(.segmented)
            }

            HStack {
                VStack(alignment: .leading) {
                    Label(viewModel.yourPaymentConfirmed ? "You confirmed" : "You haven't confirmed",
                          systemImage: viewModel.yourPaymentConfirmed ? "checkmark.circle.fill" : "circle")
                        .font(.subheadline)
                        .foregroundColor(viewModel.yourPaymentConfirmed ? .green : .secondary)

                    Label(viewModel.otherPaymentConfirmed ? "\(match.otherPartyName) confirmed" : "\(match.otherPartyName) hasn't confirmed",
                          systemImage: viewModel.otherPaymentConfirmed ? "checkmark.circle.fill" : "circle")
                        .font(.subheadline)
                        .foregroundColor(viewModel.otherPaymentConfirmed ? .green : .secondary)
                }
                Spacer()
            }

            if !viewModel.yourPaymentConfirmed && !viewModel.selectedPaymentMethod.isEmpty {
                Button(action: { viewModel.confirmPayment() }) {
                    HStack {
                        Image(systemName: "checkmark.circle")
                        Text("Confirm Payment Arranged")
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Theme.brandGreen)
                    .foregroundColor(.white)
                    .cornerRadius(10)
                }
            }

            if viewModel.userRole == "driver" && !viewModel.yourPaymentConfirmed {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.orange)
                        .font(.caption)
                    Text("As driver, confirm you received payment BEFORE starting!")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.orange)
                }
            }

            Text("Dollor.ai does NOT process payments. This is for your records only.")
                .font(.caption2)
                .foregroundColor(.secondary)
                .italic()
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }

    // MARK: - Identity Verification Card

    private var identityVerificationCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "person.badge.shield.checkmark.fill")
                    .foregroundColor(.blue)
                Text("Identity Verification")
                    .font(.headline)
                Spacer()
                statusBadge(complete: viewModel.bothVerified)
            }

            Text("Enter the code shown by \(match.otherPartyName) to verify their identity.")
                .font(.caption)
                .foregroundColor(.secondary)

            HStack {
                VStack(alignment: .leading) {
                    Label(viewModel.youVerifiedThem ? "You verified them" : "You haven't verified them",
                          systemImage: viewModel.youVerifiedThem ? "checkmark.circle.fill" : "circle")
                        .font(.subheadline)
                        .foregroundColor(viewModel.youVerifiedThem ? .green : .secondary)

                    Label(viewModel.theyVerifiedYou ? "They verified you" : "They haven't verified you",
                          systemImage: viewModel.theyVerifiedYou ? "checkmark.circle.fill" : "circle")
                        .font(.subheadline)
                        .foregroundColor(viewModel.theyVerifiedYou ? .green : .secondary)
                }
                Spacer()
            }

            if !viewModel.youVerifiedThem {
                VStack(spacing: 8) {
                    TextField("Enter their 4-digit code", text: $viewModel.enteredVerificationCode)
                        .keyboardType(.numberPad)
                        .textFieldStyle(.roundedBorder)
                        .frame(maxWidth: 200)

                    Button(action: { viewModel.verifyOtherParty() }) {
                        HStack {
                            Image(systemName: "checkmark.shield")
                            Text("Verify Identity")
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(viewModel.enteredVerificationCode.count == 4 ? Color.blue : Color.gray)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                    }
                    .disabled(viewModel.enteredVerificationCode.count != 4)
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }

    // MARK: - Safety Checklist Card

    private var safetyChecklistCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "checklist")
                    .foregroundColor(.orange)
                Text("Safety Checklist")
                    .font(.headline)
                Spacer()
                statusBadge(complete: viewModel.safetyChecklistComplete)
            }

            Text("Acknowledge these safety recommendations before your trip.")
                .font(.caption)
                .foregroundColor(.secondary)

            ForEach(viewModel.checklistItems, id: \.id) { item in
                Button(action: { viewModel.toggleChecklistItem(item.id) }) {
                    HStack {
                        Image(systemName: viewModel.acknowledgedItems.contains(item.id) ? "checkmark.square.fill" : "square")
                            .foregroundColor(viewModel.acknowledgedItems.contains(item.id) ? .green : .gray)
                        VStack(alignment: .leading) {
                            Text(item.title)
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(.primary)
                            Text(item.description)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }

            if !viewModel.safetyChecklistComplete && viewModel.allRequiredItemsAcknowledged {
                Button(action: { viewModel.submitSafetyChecklist() }) {
                    HStack {
                        Image(systemName: "checkmark.circle")
                        Text("Complete Safety Checklist")
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.orange)
                    .foregroundColor(.white)
                    .cornerRadius(10)
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }

    // MARK: - Trip Status Card

    private var tripStatusCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "car.fill")
                    .foregroundColor(.purple)
                Text("Trip Status")
                    .font(.headline)
            }

            if viewModel.tripCompleted {
                Label("Trip Completed", systemImage: "checkmark.circle.fill")
                    .foregroundColor(.green)
                    .font(.headline)
            } else if viewModel.tripStarted {
                Label("Trip In Progress", systemImage: "arrow.right.circle.fill")
                    .foregroundColor(.blue)
                    .font(.headline)

                Button(action: { viewModel.updateTripStatus(status: "completed") }) {
                    HStack {
                        Image(systemName: "flag.checkered")
                        Text("Mark Trip Completed")
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.green)
                    .foregroundColor(.white)
                    .cornerRadius(10)
                }
            } else {
                if viewModel.readyToStart {
                    Button(action: { viewModel.updateTripStatus(status: "started") }) {
                        HStack {
                            Image(systemName: "play.fill")
                            Text("Start Trip")
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.purple)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                    }
                } else {
                    Text("Complete all safety steps before starting")
                        .font(.caption)
                        .foregroundColor(.orange)
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }

    // MARK: - Legal Disclaimer Card

    private var legalDisclaimerCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundColor(.orange)
                Text("Legal Notice")
                    .font(.caption)
                    .fontWeight(.bold)
            }

            Text("These safety features are VOLUNTARY tools to help protect yourself. Dollor.ai does NOT verify users, guarantee safety, or monitor trips. You are responsible for your own safety. Exercise caution when meeting strangers.")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.orange.opacity(0.1))
        .cornerRadius(12)
    }

    // MARK: - Helper Views

    private func statusBadge(complete: Bool) -> some View {
        HStack(spacing: 4) {
            Image(systemName: complete ? "checkmark.circle.fill" : "circle")
            Text(complete ? "Complete" : "Pending")
        }
        .font(.caption)
        .foregroundColor(complete ? .green : .orange)
    }
}

// MARK: - Trip Safety ViewModel

class TripSafetyViewModel: ObservableObject {
    let match: TripMatch

    // Safety Status
    @Published var myVerificationCode: String?
    @Published var yourRecordingConsent = false
    @Published var otherRecordingConsent = false
    @Published var mutualRecordingAgreed = false
    @Published var yourPaymentConfirmed = false
    @Published var otherPaymentConfirmed = false
    @Published var paymentConfirmed = false
    @Published var youVerifiedThem = false
    @Published var theyVerifiedYou = false
    @Published var bothVerified = false
    @Published var safetyChecklistComplete = false
    @Published var tripStarted = false
    @Published var tripCompleted = false

    // User inputs
    @Published var selectedPaymentMethod = ""
    @Published var enteredVerificationCode = ""
    @Published var acknowledgedItems: Set<String> = []

    // Checklist items
    @Published var checklistItems: [SafetyChecklistItem] = []

    // UI state
    @Published var showAlert = false
    @Published var alertMessage = ""
    @Published var isLoading = false

    // User role (inferred from match)
    var userRole: String {
        match.otherPartyRole == "driver" ? "passenger" : "driver"
    }

    // Ready to start
    var readyToStart: Bool {
        paymentConfirmed && bothVerified
    }

    // Check if all required items are acknowledged
    var allRequiredItemsAcknowledged: Bool {
        let requiredIds = ["shared_plans_with_someone", "verified_identity", "confirmed_payment_method", "phone_charged", "meeting_in_safe_location"]
        return requiredIds.allSatisfy { acknowledgedItems.contains($0) }
    }

    // User email (would come from auth in real app)
    private var userEmail: String {
        // In production, get from AuthViewModel
        "user@example.com"
    }

    init(match: TripMatch) {
        self.match = match
        loadDefaultChecklist()
    }

    deinit {
        // Clean up any resources if needed
    }

    func loadDefaultChecklist() {
        checklistItems = [
            SafetyChecklistItem(id: "shared_plans_with_someone", title: "Share Your Plans", description: "Tell someone where you're going and when", required: true),
            SafetyChecklistItem(id: "verified_identity", title: "Verify Identity", description: "Exchange verification codes", required: true),
            SafetyChecklistItem(id: "confirmed_payment_method", title: "Confirm Payment", description: "Agree on payment method", required: true),
            SafetyChecklistItem(id: "phone_charged", title: "Phone Charged", description: "Keep your phone charged", required: true),
            SafetyChecklistItem(id: "meeting_in_safe_location", title: "Safe Meeting Location", description: "Meet in a public place", required: true)
        ]
    }

    func loadSafetyStatus() {
        // Load verification code
        TripBoardService.shared.getMyVerificationCode(matchId: match.matchId, userEmail: userEmail, userRole: userRole) { [weak self] result in
            if case .success(let response) = result {
                self?.myVerificationCode = response.yourCode
            }
        }

        // Load pre-trip summary
        TripBoardService.shared.getPreTripSummary(matchId: match.matchId, userEmail: userEmail, userRole: userRole) { [weak self] result in
            if case .success(let summary) = result {
                self?.yourRecordingConsent = summary.safetyStatus.recordingConsent.yourConsent
                self?.otherRecordingConsent = summary.safetyStatus.recordingConsent.otherPartyConsent
                self?.mutualRecordingAgreed = summary.safetyStatus.recordingConsent.status == "complete"

                self?.yourPaymentConfirmed = summary.safetyStatus.payment.youConfirmed
                self?.otherPaymentConfirmed = summary.safetyStatus.payment.otherConfirmed
                self?.paymentConfirmed = summary.safetyStatus.payment.status == "confirmed"
                if let method = summary.safetyStatus.payment.method {
                    self?.selectedPaymentMethod = method
                }

                self?.youVerifiedThem = summary.safetyStatus.identity.youVerifiedThem
                self?.theyVerifiedYou = summary.safetyStatus.identity.theyVerifiedYou
                self?.bothVerified = summary.safetyStatus.identity.status == "verified"

                self?.safetyChecklistComplete = summary.safetyStatus.safetyChecklist.status == "complete"
            }
        }
    }

    func giveRecordingConsent() {
        TripBoardService.shared.giveRecordingConsent(matchId: match.matchId, userEmail: userEmail, userRole: userRole, consent: true) { [weak self] result in
            switch result {
            case .success(let response):
                self?.yourRecordingConsent = true
                self?.mutualRecordingAgreed = response.mutualRecordingAgreed ?? false
                self?.alertMessage = response.message
                self?.showAlert = true
            case .failure(let error):
                self?.alertMessage = error.localizedDescription
                self?.showAlert = true
            }
        }
    }

    func confirmPayment() {
        TripBoardService.shared.confirmPayment(matchId: match.matchId, userEmail: userEmail, userRole: userRole, paymentMethod: selectedPaymentMethod, amount: match.agreedPrice) { [weak self] result in
            switch result {
            case .success(let response):
                self?.yourPaymentConfirmed = true
                self?.paymentConfirmed = response.paymentConfirmed ?? false
                self?.alertMessage = response.message
                self?.showAlert = true
            case .failure(let error):
                self?.alertMessage = error.localizedDescription
                self?.showAlert = true
            }
        }
    }

    func verifyOtherParty() {
        TripBoardService.shared.verifyIdentity(matchId: match.matchId, userEmail: userEmail, userRole: userRole, verificationCode: enteredVerificationCode) { [weak self] result in
            switch result {
            case .success(let response):
                if response.verified ?? false {
                    self?.youVerifiedThem = true
                    self?.bothVerified = response.bothVerified ?? false
                }
                self?.alertMessage = response.message
                self?.showAlert = true
            case .failure(let error):
                self?.alertMessage = error.localizedDescription
                self?.showAlert = true
            }
        }
    }

    func toggleChecklistItem(_ id: String) {
        if acknowledgedItems.contains(id) {
            acknowledgedItems.remove(id)
        } else {
            acknowledgedItems.insert(id)
        }
    }

    func submitSafetyChecklist() {
        TripBoardService.shared.acknowledgeSafetyChecklist(matchId: match.matchId, userEmail: userEmail, userRole: userRole, acknowledgedItems: Array(acknowledgedItems)) { [weak self] result in
            switch result {
            case .success(let response):
                self?.safetyChecklistComplete = true
                self?.alertMessage = response.message
                self?.showAlert = true
            case .failure(let error):
                self?.alertMessage = error.localizedDescription
                self?.showAlert = true
            }
        }
    }

    func updateTripStatus(status: String) {
        TripBoardService.shared.updateTripStatus(matchId: match.matchId, userEmail: userEmail, userRole: userRole, status: status) { [weak self] result in
            switch result {
            case .success(let response):
                if status == "started" {
                    self?.tripStarted = true
                } else if status == "completed" {
                    self?.tripCompleted = true
                }
                self?.alertMessage = response.message
                self?.showAlert = true
            case .failure(let error):
                self?.alertMessage = error.localizedDescription
                self?.showAlert = true
            }
        }
    }
}

#Preview {
    TripBoardView()
}
