import SwiftUI
import EatFairShared

struct ScheduleDeliveryView: View {
    @Environment(\.dismiss) var dismiss
    @Binding var selectedDate: Date?
    @Binding var isScheduled: Bool

    @State private var tempDate = Date()
    @State private var selectedTimeSlot: TimeSlot?

    let availableSlots: [TimeSlot] = TimeSlot.generateSlots()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Header info
                headerInfo

                ScrollView {
                    VStack(spacing: 24) {
                        // Date Picker
                        datePickerSection

                        // Time Slots
                        timeSlotsSection

                        // Summary
                        if let slot = selectedTimeSlot {
                            summarySection(slot: slot)
                        }
                    }
                    .padding()
                }

                // Confirm Button
                confirmButton
            }
            .navigationTitle("Schedule Delivery")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    // MARK: - Header Info
    private var headerInfo: some View {
        HStack(spacing: 12) {
            Image(systemName: "clock.badge.checkmark")
                .font(.title2)
                .foregroundColor(Theme.brandGreen)

            VStack(alignment: .leading, spacing: 2) {
                Text("Schedule for Later")
                    .font(.headline)
                Text("Choose when you'd like your order delivered")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()
        }
        .padding()
        .background(Color.white)
    }

    // MARK: - Date Picker Section
    private var datePickerSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Select Date")
                .font(.headline)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(0..<7, id: \.self) { dayOffset in
                        let date = Calendar.current.date(byAdding: .day, value: dayOffset, to: Date()) ?? Date()
                        DateCard(
                            date: date,
                            isSelected: Calendar.current.isDate(date, inSameDayAs: tempDate),
                            isToday: dayOffset == 0
                        ) {
                            tempDate = date
                            selectedTimeSlot = nil // Reset time slot when date changes
                        }
                    }
                }
            }
        }
    }

    // MARK: - Time Slots Section
    private var timeSlotsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Select Time")
                .font(.headline)

            let isToday = Calendar.current.isDateInToday(tempDate)
            let filteredSlots = isToday ? availableSlots.filter { $0.isAvailable(for: Date()) } : availableSlots

            if filteredSlots.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "clock.badge.exclamationmark")
                        .font(.title)
                        .foregroundColor(.gray)
                    Text("No time slots available")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Text("Try selecting a different date")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 30)
            } else {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    ForEach(filteredSlots) { slot in
                        TimeSlotCard(
                            slot: slot,
                            isSelected: selectedTimeSlot?.id == slot.id
                        ) {
                            selectedTimeSlot = slot
                        }
                    }
                }
            }
        }
    }

    // MARK: - Summary Section
    private func summarySection(slot: TimeSlot) -> some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: "info.circle")
                    .foregroundColor(.blue)
                Text("Delivery Summary")
                    .font(.headline)
                Spacer()
            }

            VStack(spacing: 8) {
                HStack {
                    Text("Date")
                        .foregroundColor(.secondary)
                    Spacer()
                    Text(tempDate, style: .date)
                        .fontWeight(.medium)
                }

                HStack {
                    Text("Time")
                        .foregroundColor(.secondary)
                    Spacer()
                    Text(slot.displayTime)
                        .fontWeight(.medium)
                }

                Divider()

                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(Theme.brandGreen)
                    Text("Your order will be delivered during this time")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding()
            .background(Color.blue.opacity(0.05))
            .cornerRadius(12)
        }
    }

    // MARK: - Confirm Button
    private var confirmButton: some View {
        VStack(spacing: 0) {
            Divider()

            Button(action: confirmSchedule) {
                HStack {
                    Image(systemName: "calendar.badge.clock")
                    Text(selectedTimeSlot == nil ? "Select a Time" : "Confirm Schedule")
                }
                .font(.headline)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(selectedTimeSlot == nil ? Color.gray : Theme.brandGreen)
                .cornerRadius(12)
            }
            .disabled(selectedTimeSlot == nil)
            .padding()
        }
        .background(Color.white)
    }

    // MARK: - Confirm Action
    private func confirmSchedule() {
        guard let slot = selectedTimeSlot else { return }

        // Combine date and time
        let calendar = Calendar.current
        var components = calendar.dateComponents([.year, .month, .day], from: tempDate)
        let timeComponents = calendar.dateComponents([.hour, .minute], from: slot.startTime)
        components.hour = timeComponents.hour
        components.minute = timeComponents.minute

        selectedDate = calendar.date(from: components)
        isScheduled = true
        dismiss()
    }
}

// MARK: - Date Card
struct DateCard: View {
    let date: Date
    let isSelected: Bool
    let isToday: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Text(dayName)
                    .font(.caption)
                    .foregroundColor(isSelected ? .white : .secondary)

                Text(dayNumber)
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(isSelected ? .white : .primary)

                if isToday {
                    Text("Today")
                        .font(.caption2)
                        .foregroundColor(isSelected ? .white.opacity(0.8) : Theme.brandGreen)
                }
            }
            .frame(width: 70, height: 90)
            .background(isSelected ? Theme.brandGreen : Color.white)
            .cornerRadius(12)
            .shadow(color: .black.opacity(isSelected ? 0.1 : 0.05), radius: 4, x: 0, y: 2)
        }
    }

    private var dayName: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE"
        return formatter.string(from: date)
    }

    private var dayNumber: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "d"
        return formatter.string(from: date)
    }
}

// MARK: - Time Slot Card
struct TimeSlotCard: View {
    let slot: TimeSlot
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(slot.displayTime)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(isSelected ? .white : .primary)

                    if slot.isPeakTime {
                        Text("Peak time")
                            .font(.caption2)
                            .foregroundColor(isSelected ? .white.opacity(0.8) : .orange)
                    }
                }

                Spacer()

                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.white)
                }
            }
            .padding()
            .background(isSelected ? Theme.brandGreen : Color.white)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color.clear : Color.gray.opacity(0.2), lineWidth: 1)
            )
        }
    }
}

// MARK: - Time Slot Model
struct TimeSlot: Identifiable {
    let id = UUID()
    let startTime: Date
    let endTime: Date
    let isPeakTime: Bool

    var displayTime: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return "\(formatter.string(from: startTime)) - \(formatter.string(from: endTime))"
    }

    func isAvailable(for currentTime: Date) -> Bool {
        // Slot is available if it starts at least 30 minutes from now
        let minLeadTime: TimeInterval = 30 * 60 // 30 minutes
        return startTime.timeIntervalSince(currentTime) >= minLeadTime
    }

    static func generateSlots() -> [TimeSlot] {
        var slots: [TimeSlot] = []
        let calendar = Calendar.current
        let today = Date()

        // Generate slots from 10 AM to 10 PM
        for hour in 10..<22 {
            var startComponents = calendar.dateComponents([.year, .month, .day], from: today)
            startComponents.hour = hour
            startComponents.minute = 0

            var endComponents = startComponents
            endComponents.hour = hour + 1

            if let start = calendar.date(from: startComponents),
               let end = calendar.date(from: endComponents) {
                let isPeak = (hour >= 12 && hour <= 13) || (hour >= 18 && hour <= 20) // Lunch and dinner
                slots.append(TimeSlot(startTime: start, endTime: end, isPeakTime: isPeak))
            }
        }

        return slots
    }
}

// MARK: - Schedule Badge (for CheckoutView)
struct ScheduleBadge: View {
    let date: Date

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "calendar.badge.clock")
                .foregroundColor(Theme.brandGreen)

            VStack(alignment: .leading, spacing: 2) {
                Text("Scheduled Delivery")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(Theme.brandGreen)

                Text(formattedDate)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Theme.brandGreen.opacity(0.1))
        .cornerRadius(8)
    }

    /// World-class scheduled time formatting (like Uber/DoorDash)
    private var formattedDate: String {
        // Use DateTimeFormatter for scheduled ride/delivery display
        return DateTimeFormatter.shared.scheduledRideTime(from: date)
    }
}
