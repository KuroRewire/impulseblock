import Foundation

/// RFC 3492 Punycode encoder used for best-effort IDNA conversion of
/// internationalized domain labels. Foundation on iOS does not expose a public
/// IDN-to-ASCII API, so ImpulseBlock performs its own conversion before handing
/// domains to ManagedSettings. Full UTS #46 mapping is intentionally out of
/// scope; input is lowercased and NFC-normalized first, which covers the
/// practical cases (see docs/mobile/KNOWN_LIMITATIONS.md).
enum Punycode {

    private static let base = 36
    private static let tMin = 1
    private static let tMax = 26
    private static let skew = 38
    private static let damp = 700
    private static let initialBias = 72
    private static let initialN = 128

    /// Encodes a single Unicode label to its Punycode form (without "xn--").
    /// Returns nil on overflow or invalid input.
    static func encode(_ input: String) -> String? {
        let scalars = Array(input.unicodeScalars.map { Int($0.value) })
        var output: [Character] = []

        let basic = scalars.filter { $0 < 128 }
        for cp in basic {
            output.append(Character(UnicodeScalar(UInt32(cp))!))
        }

        var handled = basic.count
        let basicCount = handled
        if basicCount > 0 {
            output.append("-")
        }

        var n = initialN
        var delta = 0
        var bias = initialBias

        while handled < scalars.count {
            guard let m = scalars.filter({ $0 >= n }).min() else { return nil }
            let (product, overflow1) = (m - n).multipliedReportingOverflow(by: handled + 1)
            if overflow1 { return nil }
            let (sum, overflow2) = delta.addingReportingOverflow(product)
            if overflow2 { return nil }
            delta = sum
            n = m

            for cp in scalars {
                if cp < n {
                    delta += 1
                    if delta < 0 { return nil }
                }
                if cp == n {
                    var q = delta
                    var k = base
                    while true {
                        let t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias)
                        if q < t { break }
                        let digitValue = t + (q - t) % (base - t)
                        guard let ch = digit(digitValue) else { return nil }
                        output.append(ch)
                        q = (q - t) / (base - t)
                        k += base
                    }
                    guard let ch = digit(q) else { return nil }
                    output.append(ch)
                    bias = adapt(delta: delta, numPoints: handled + 1, firstTime: handled == basicCount)
                    delta = 0
                    handled += 1
                }
            }
            delta += 1
            n += 1
        }
        return String(output)
    }

    /// Converts a full (already lowercased, NFC-normalized) hostname to its
    /// IDNA ASCII form, label by label. ASCII labels pass through unchanged.
    static func toASCII(_ host: String) -> String? {
        let labels = host.split(separator: ".", omittingEmptySubsequences: false)
        var result: [String] = []
        for label in labels {
            let s = String(label)
            if s.isEmpty { return nil }
            if s.allSatisfy({ $0.isASCII }) {
                result.append(s)
            } else {
                guard let encoded = encode(s) else { return nil }
                result.append("xn--" + encoded)
            }
        }
        return result.joined(separator: ".")
    }

    private static func adapt(delta: Int, numPoints: Int, firstTime: Bool) -> Int {
        var d = firstTime ? delta / damp : delta / 2
        d += d / numPoints
        var k = 0
        while d > ((base - tMin) * tMax) / 2 {
            d /= base - tMin
            k += base
        }
        return k + ((base - tMin + 1) * d) / (d + skew)
    }

    private static func digit(_ value: Int) -> Character? {
        switch value {
        case 0...25: return Character(UnicodeScalar(UInt32(value + 97))!) // a-z
        case 26...35: return Character(UnicodeScalar(UInt32(value - 26 + 48))!) // 0-9
        default: return nil
        }
    }
}
