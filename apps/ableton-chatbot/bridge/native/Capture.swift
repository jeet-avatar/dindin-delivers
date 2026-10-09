import Foundation
import ScreenCaptureKit
import AVFoundation
import CoreGraphics

func emit(_ object: [String: Any]) {
    if let data = try? JSONSerialization.data(withJSONObject: object, options: [.sortedKeys]),
       let line = String(data: data, encoding: .utf8) {
        print(line)
        fflush(stdout)
    }
}

final class AudioSink: NSObject, SCStreamOutput, SCStreamDelegate {
    let writer: AVAssetWriter
    let input: AVAssetWriterInput
    var started = false
    var failure: Error?
    let queue = DispatchQueue(label: "io.beatmind.audio.capture")

    init(url: URL) throws {
        writer = try AVAssetWriter(outputURL: url, fileType: .m4a)
        input = AVAssetWriterInput(mediaType: .audio, outputSettings: [
            AVFormatIDKey: kAudioFormatMPEG4AAC,
            AVSampleRateKey: 48000,
            AVNumberOfChannelsKey: 2,
            AVEncoderBitRateKey: 192000
        ])
        input.expectsMediaDataInRealTime = true
        super.init()
        writer.add(input)
    }

    func stream(_ stream: SCStream, didOutputSampleBuffer sampleBuffer: CMSampleBuffer, of type: SCStreamOutputType) {
        guard type == .audio, sampleBuffer.isValid, CMSampleBufferDataIsReady(sampleBuffer) else { return }
        if !started {
            guard writer.startWriting() else { failure = writer.error; return }
            writer.startSession(atSourceTime: CMSampleBufferGetPresentationTimeStamp(sampleBuffer))
            started = true
        }
        if input.isReadyForMoreMediaData && !input.append(sampleBuffer) {
            failure = writer.error
        }
    }

    func stream(_ stream: SCStream, didStopWithError error: Error) {
        failure = error
    }

    func finish() async throws {
        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
            queue.async { continuation.resume() }
        }
        if let failure = failure { throw failure }
        guard started else { throw NSError(domain: "BeatMindAudio", code: 2, userInfo: [NSLocalizedDescriptionKey: "Ableton supplied no audio buffers."]) }
        input.markAsFinished()
        await writer.finishWriting()
        if let error = writer.error { throw error }
    }
}

func audioMetrics(url: URL) throws -> [String: Any] {
    let file = try AVAudioFile(forReading: url)
    let format = file.processingFormat
    guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: 4096) else {
        throw NSError(domain: "BeatMindAudio", code: 3)
    }
    var peak: Float = 0
    var sum: Double = 0
    var samples = 0
    var waveform: [Float] = []
    while file.framePosition < file.length {
        try file.read(into: buffer)
        guard let channels = buffer.floatChannelData else { continue }
        var blockPeak: Float = 0
        for channel in 0..<Int(format.channelCount) {
            for frame in 0..<Int(buffer.frameLength) {
                let value = channels[channel][frame]
                peak = max(peak, abs(value))
                blockPeak = max(blockPeak, abs(value))
                sum += Double(value * value)
                samples += 1
            }
        }
        waveform.append(blockPeak)
    }
    let rms = samples > 0 ? sqrt(sum / Double(samples)) : 0
    return ["duration_seconds": Double(file.length) / format.sampleRate,
            "sample_rate": format.sampleRate, "channels": format.channelCount,
            "peak_dbfs": 20 * log10(max(Double(peak), 0.000000001)),
            "rms_dbfs": 20 * log10(max(rms, 0.000000001)),
            "has_signal": peak > 0.0001, "waveform": waveform]
}

@main
struct BeatMindAudio {
    static func main() async {
        let args = CommandLine.arguments
        if args.contains("--check") {
            emit(["authorized": CGPreflightScreenCaptureAccess(), "capture_source": "Ableton Live application audio"])
            return
        }
        if args.contains("--request-permission") {
            emit(["authorized": CGRequestScreenCaptureAccess()])
            return
        }
        guard args.count == 3, let duration = Double(args[2]), duration >= 1, duration <= 30 else {
            emit(["error": "Usage: BeatMindAudio output.m4a duration_seconds"])
            exit(2)
        }
        guard CGPreflightScreenCaptureAccess() || CGRequestScreenCaptureAccess() else {
            emit(["error": "macOS audio-capture permission is required.", "permission_required": true])
            exit(3)
        }
        do {
            let content = try await SCShareableContent.excludingDesktopWindows(true, onScreenWindowsOnly: false)
            let apps = content.applications.filter { $0.bundleIdentifier.lowercased().hasPrefix("com.ableton.live") }
            guard !apps.isEmpty, let display = content.displays.first else {
                emit(["error": "Ableton Live must be open on an active display."])
                exit(4)
            }
            let filter = SCContentFilter(display: display, including: apps, exceptingWindows: [])
            let config = SCStreamConfiguration()
            config.capturesAudio = true
            config.excludesCurrentProcessAudio = true
            config.sampleRate = 48000
            config.channelCount = 2
            config.width = 2
            config.height = 2
            config.minimumFrameInterval = CMTime(value: 1, timescale: 1)
            config.showsCursor = false
            let url = URL(fileURLWithPath: args[1])
            let sink = try AudioSink(url: url)
            let stream = SCStream(filter: filter, configuration: config, delegate: sink)
            try stream.addStreamOutput(sink, type: .audio, sampleHandlerQueue: sink.queue)
            try await stream.startCapture()
            emit(["type": "ready", "source": "Ableton Live", "applications": apps.map { $0.bundleIdentifier }])
            try await Task.sleep(nanoseconds: UInt64(duration * 1_000_000_000))
            try await stream.stopCapture()
            try await sink.finish()
            emit(["type": "complete", "metrics": try audioMetrics(url: url)])
        } catch {
            emit(["error": error.localizedDescription])
            exit(1)
        }
    }
}
