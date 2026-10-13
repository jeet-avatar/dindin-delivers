import SwiftUI
import UIKit

/// Camera OR photo-library picker for capturing ID-style documents (license, insurance,
/// registration). Unlike `DeliveryProofCameraView` (camera-only, no editing — used for
/// delivery proof shots), this allows editing so the driver can crop/straighten the
/// document within the frame before it's used, which is what makes a document capture
/// feel "seamless" instead of "way off."
public struct DocumentCaptureView: UIViewControllerRepresentable {
    public enum Source: Identifiable {
        case camera
        case photoLibrary

        public var id: Self { self }

        var uiSourceType: UIImagePickerController.SourceType {
            switch self {
            case .camera: return .camera
            case .photoLibrary: return .photoLibrary
            }
        }
    }

    /// Whether the device actually has a camera (false in Simulator and on some devices) —
    /// check this before offering "Take Photo" so tapping it can't open a blank/broken picker.
    public static var isCameraAvailable: Bool {
        UIImagePickerController.isSourceTypeAvailable(.camera)
    }

    let source: Source
    @Binding var image: UIImage?
    @Environment(\.dismiss) private var dismiss

    public init(source: Source, image: Binding<UIImage?>) {
        self.source = source
        self._image = image
    }

    public func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = source.uiSourceType
        if source == .camera {
            picker.cameraCaptureMode = .photo
            // Overlay a guide frame on the live viewfinder so the driver can see exactly
            // where to position the document before snapping the photo — without this,
            // nothing on screen indicates where the license needs to be, so shots come out
            // cropped, tilted, or missing a corner. The native shutter/flash/cancel controls
            // stay fully visible and tappable underneath; the guide only draws on top.
            let overlay = UIHostingController(rootView: DocumentGuideOverlay())
            overlay.view.backgroundColor = .clear
            overlay.view.frame = UIScreen.main.bounds
            // `cameraOverlayView` stays attached for the picker's full lifetime, including
            // the post-capture "Retake / Use Photo" review screen — SwiftUI's
            // `.allowsHitTesting(false)` on the content isn't always enough to guarantee
            // that at the UIKit level once this view sits on top of the native review
            // buttons, which was blocking Retake from being tappable. Disabling user
            // interaction directly on the hosting view is the hard guarantee: it removes
            // this view from hit-testing entirely, so every tap passes straight through.
            overlay.view.isUserInteractionEnabled = false
            picker.cameraOverlayView = overlay.view
        }
        // Lets the user crop/align the document within the frame right after capture —
        // this is the fix for a photo being "way off": the user straightens it themselves.
        picker.allowsEditing = true
        picker.delegate = context.coordinator
        return picker
    }

    public func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    public func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    public class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: DocumentCaptureView

        init(_ parent: DocumentCaptureView) {
            self.parent = parent
        }

        public func imagePickerController(
            _ picker: UIImagePickerController,
            didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]
        ) {
            let picked = (info[.editedImage] as? UIImage) ?? (info[.originalImage] as? UIImage)
            parent.image = picked?.normalizedOrientation()
            parent.dismiss()
        }

        public func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.dismiss()
        }
    }
}

/// Guide overlay shown on top of the live camera viewfinder during document capture —
/// a dimmed background with a card-shaped cutout showing the driver exactly where to
/// position their license/insurance card, plus instructions above and below. All content
/// has hit-testing disabled so taps still reach the native shutter/flash/cancel controls
/// underneath; this view only draws, it never intercepts touches.
private struct DocumentGuideOverlay: View {
    // Standard ID/credit-card aspect ratio (ISO/IEC 7810 ID-1 ≈ 1.586:1).
    private let cardAspectRatio: CGFloat = 1.586

    var body: some View {
        GeometryReader { geo in
            let guideWidth = geo.size.width * 0.86
            let guideHeight = guideWidth / cardAspectRatio

            ZStack {
                Color.black.opacity(0.55)
                    .reverseMask {
                        RoundedRectangle(cornerRadius: 16)
                            .frame(width: guideWidth, height: guideHeight)
                    }

                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color(hex: "FF7A1A"), lineWidth: 3)
                    .frame(width: guideWidth, height: guideHeight)

                VStack {
                    Text("Position your document in the frame")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                        .padding(.top, 60)

                    Spacer()

                    Text("Make sure all 4 corners are visible and text is readable")
                        .font(.system(size: 14))
                        .foregroundColor(.white.opacity(0.85))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)
                        .padding(.bottom, 140)
                }
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
    }
}

private extension View {
    /// Masks out `mask`'s shape from `self`, i.e. punches a transparent hole where `mask`
    /// is drawn. Used to dim everything except the card-shaped guide cutout above.
    func reverseMask<Mask: View>(@ViewBuilder _ mask: () -> Mask) -> some View {
        self.mask(
            ZStack {
                Rectangle()
                mask().blendMode(.destinationOut)
            }
            .compositingGroup()
        )
    }
}

public extension UIImage {
    /// Re-draws the image so its pixel data matches `.up` orientation. Photos from the camera
    /// (and some library photos) carry an EXIF orientation flag instead of rotated pixels — if
    /// that flag is ignored downstream (e.g. by a web view, a backend image processor, or a
    /// resize that reads raw pixels), the document ends up sideways or upside-down. Normalizing
    /// here guarantees every consumer sees the same upright image the driver saw on screen.
    func normalizedOrientation() -> UIImage {
        guard imageOrientation != .up else { return self }
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = scale
        let renderer = UIGraphicsImageRenderer(size: size, format: format)
        return renderer.image { _ in
            draw(in: CGRect(origin: .zero, size: size))
        }
    }

    /// Downscales to at most `maxDimension` on the longer side (preserving aspect ratio) and
    /// re-encodes as JPEG. Camera captures can be 10+ MB at full resolution; a document photo
    /// doesn't need more than ~2000px to be clearly legible, and a smaller, consistent upload
    /// size makes the upload itself faster and less likely to time out on a weak connection.
    func resizedForDocumentUpload(maxDimension: CGFloat = 2000, quality: CGFloat = 0.85) -> Data? {
        let longerSide = max(size.width, size.height)
        guard longerSide > maxDimension else {
            return jpegData(compressionQuality: quality)
        }
        let scaleFactor = maxDimension / longerSide
        let newSize = CGSize(width: size.width * scaleFactor, height: size.height * scaleFactor)
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        let renderer = UIGraphicsImageRenderer(size: newSize, format: format)
        let resized = renderer.image { _ in
            draw(in: CGRect(origin: .zero, size: newSize))
        }
        return resized.jpegData(compressionQuality: quality)
    }
}
