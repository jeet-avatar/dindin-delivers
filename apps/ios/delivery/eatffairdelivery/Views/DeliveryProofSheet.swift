import SwiftUI
import EatFairShared

/// Sheet that handles the delivery proof photo capture and submission flow.
/// Shows camera → photo preview → submit/retake buttons.
struct DeliveryProofSheet: View {
    @ObservedObject var viewModel: DeliveryViewModel
    @State private var showCamera = false

    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                if viewModel.isUploadingProof {
                    // Uploading state
                    VStack(spacing: 16) {
                        ProgressView()
                            .scaleEffect(1.5)
                        Text("Uploading proof photo...")
                            .font(.headline)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)

                } else if let image = viewModel.deliveryProofImage {
                    // Photo preview
                    VStack(spacing: 16) {
                        Text("Delivery Proof Photo")
                            .font(.headline)

                        Image(uiImage: image)
                            .resizable()
                            .scaledToFit()
                            .frame(maxHeight: 400)
                            .cornerRadius(12)
                            .shadow(radius: 4)
                            .padding(.horizontal)

                        HStack(spacing: 16) {
                            Button(action: {
                                viewModel.deliveryProofImage = nil
                                showCamera = true
                            }) {
                                HStack {
                                    Image(systemName: "camera.rotate")
                                    Text("Retake")
                                }
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(.primary)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(Color(.systemGray5))
                                .cornerRadius(12)
                            }

                            Button(action: {
                                viewModel.submitDeliveryWithProof()
                            }) {
                                HStack {
                                    Image(systemName: "checkmark.circle.fill")
                                    Text("Submit & Complete")
                                }
                                .font(.subheadline)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(Color.green)
                                .cornerRadius(12)
                            }
                        }
                        .padding(.horizontal)
                    }

                } else {
                    // Instructions before camera opens
                    VStack(spacing: 20) {
                        Image(systemName: "camera.fill")
                            .font(.system(size: 60))
                            .foregroundColor(.blue)

                        Text("Take a Delivery Photo")
                            .font(.title2)
                            .fontWeight(.bold)

                        Text("Take a photo of the order at the customer's door to confirm delivery and release payment.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 32)

                        Button(action: { showCamera = true }) {
                            HStack {
                                Image(systemName: "camera.fill")
                                Text("Open Camera")
                            }
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Color.blue)
                            .cornerRadius(12)
                        }
                        .padding(.horizontal, 32)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        viewModel.cancelDeliveryProof()
                    }
                    .disabled(viewModel.isUploadingProof)
                }
            }
            .sheet(isPresented: $showCamera) {
                DeliveryProofCameraView(image: $viewModel.deliveryProofImage)
            }
            .onAppear {
                // Auto-open camera on first appearance
                if viewModel.deliveryProofImage == nil {
                    showCamera = true
                }
            }
        }
    }
}
