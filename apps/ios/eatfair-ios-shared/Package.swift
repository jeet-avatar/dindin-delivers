// swift-tools-version:5.5
import PackageDescription

let package = Package(
    name: "EatFairShared",
    platforms: [
        .iOS(.v15),
        .macOS(.v10_15)
    ],
    products: [
        .library(
            name: "EatFairShared",
            targets: ["EatFairShared"]),
    ],
    dependencies: [
        .package(url: "https://github.com/firebase/firebase-ios-sdk.git", from: "12.0.0")
    ],
    targets: [
        .target(
            name: "EatFairShared",
            dependencies: [
                .product(name: "FirebaseFirestore", package: "firebase-ios-sdk"),
                .product(name: "FirebaseAuth", package: "firebase-ios-sdk"),
                .product(name: "FirebaseMessaging", package: "firebase-ios-sdk")
            ]),
    ]
)
