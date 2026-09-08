import CoreGraphics
import Foundation
import ImageIO
import Vision

struct Observation: Codable {
    let text: String
    let confidence: Float
    let x: CGFloat
    let y: CGFloat
    let width: CGFloat
    let height: CGFloat
}

enum OCRError: Error, CustomStringConvertible {
    case usage
    case unreadableImage

    var description: String {
        switch self {
        case .usage:
            return "usage: attendance-ocr IMAGE_PATH"
        case .unreadableImage:
            return "image could not be decoded"
        }
    }
}

func recognize(imagePath: String) throws -> [Observation] {
    let imageURL = URL(fileURLWithPath: imagePath)
    guard
        let source = CGImageSourceCreateWithURL(imageURL as CFURL, nil),
        let image = CGImageSourceCreateImageAtIndex(source, 0, nil)
    else {
        throw OCRError.unreadableImage
    }

    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = false
    request.recognitionLanguages = ["en-US"]

    let handler = VNImageRequestHandler(cgImage: image, options: [:])
    try handler.perform([request])

    return (request.results ?? []).compactMap { result in
        guard let candidate = result.topCandidates(1).first else {
            return nil
        }
        let box = result.boundingBox
        let minX = max(CGFloat.zero, min(1, box.minX))
        let minY = max(CGFloat.zero, min(1, box.minY))
        let maxX = max(minX, min(1, box.maxX))
        let maxY = max(minY, min(1, box.maxY))
        return Observation(
            text: candidate.string,
            confidence: candidate.confidence,
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        )
    }
}

do {
    if CommandLine.arguments == [CommandLine.arguments[0], "--self-test"] {
        let context = CGContext(data: nil, width: 64, height: 64, bitsPerComponent: 8, bytesPerRow: 256, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
        context.setFillColor(CGColor(gray: 1, alpha: 1))
        context.fill(CGRect(x: 0, y: 0, width: 64, height: 64))
        try VNImageRequestHandler(cgImage: context.makeImage()!, options: [:]).perform([VNRecognizeTextRequest()])
        FileHandle.standardOutput.write(Data("{\"ok\":true}\n".utf8))
        exit(0)
    }
    guard CommandLine.arguments.count == 2 else {
        throw OCRError.usage
    }
    let observations = try recognize(imagePath: CommandLine.arguments[1])
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.sortedKeys]
    let data = try encoder.encode(observations)
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data([0x0A]))
} catch {
    let message = "OCR failed: \(error)\n"
    FileHandle.standardError.write(message.data(using: .utf8)!)
    exit(1)
}
