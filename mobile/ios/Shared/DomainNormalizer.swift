import Foundation

/// Normalizes user-entered website strings into a canonical registrable
/// hostname, mirroring the semantics of the ImpulseBlock browser extension
/// (`blockedHosts` stores bare lowercase hostnames; matching is
/// host == entry || host.hasSuffix("." + entry)).
enum DomainNormalizer {

    enum Failure: Error, Equatable {
        case empty
        case malformed
        case localOrReserved
        case ipAddressUnsupported
        case tooLong
    }

    /// Hostnames that must never be blockable (local/reserved).
    private static let reservedHosts: Set<String> = ["localhost"]
    private static let reservedSuffixes: [String] = [".local", ".localhost", ".internal", ".home.arpa"]

    static func normalize(_ raw: String) -> Result<String, Failure> {
        var s = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if s.isEmpty { return .failure(.empty) }

        // Lowercase + NFC normalization before any parsing.
        s = s.lowercased().precomposedStringWithCanonicalMapping

        // Strip scheme ("https://", "http://", any "scheme://", or protocol-relative "//").
        if let range = s.range(of: "://") {
            s = String(s[range.upperBound...])
        } else if s.hasPrefix("//") {
            s = String(s.dropFirst(2))
        }

        // Cut authority at first path/query/fragment delimiter.
        if let cut = s.firstIndex(where: { $0 == "/" || $0 == "?" || $0 == "#" }) {
            s = String(s[..<cut])
        }

        // Strip userinfo.
        if let at = s.lastIndex(of: "@") {
            s = String(s[s.index(after: at)...])
        }

        // Bracketed IPv6 literals are not supported.
        if s.hasPrefix("[") { return .failure(.ipAddressUnsupported) }

        // Strip a trailing :port (digits only).
        if let colon = s.lastIndex(of: ":") {
            let portPart = s[s.index(after: colon)...]
            if !portPart.isEmpty && portPart.allSatisfy({ $0.isNumber }) {
                s = String(s[..<colon])
            } else {
                return .failure(.malformed)
            }
        }

        // Strip trailing dot(s) (FQDN form).
        while s.hasSuffix(".") { s = String(s.dropLast()) }

        // Strip a single leading "www.".
        if s.hasPrefix("www.") && s.count > 4 {
            s = String(s.dropFirst(4))
        }

        if s.isEmpty { return .failure(.empty) }

        // IDNA conversion (no-op for pure-ASCII hosts).
        guard let ascii = Punycode.toASCII(s) else { return .failure(.malformed) }
        s = ascii

        // Reject local / reserved names.
        if reservedHosts.contains(s) { return .failure(.localOrReserved) }
        for suffix in reservedSuffixes where s.hasSuffix(suffix) || s == String(suffix.dropFirst()) {
            return .failure(.localOrReserved)
        }

        // Reject IPv4 literals.
        let labels = s.split(separator: ".", omittingEmptySubsequences: false).map(String.init)
        if labels.count == 4 && labels.allSatisfy({ !$0.isEmpty && $0.allSatisfy(\.isNumber) }) {
            return .failure(.ipAddressUnsupported)
        }

        // Must be at least two labels (single-label hosts are local-style).
        if labels.count < 2 { return .failure(.localOrReserved) }

        // Per-label and total length / character validation.
        if s.utf8.count > 253 { return .failure(.tooLong) }
        for label in labels {
            if label.isEmpty || label.utf8.count > 63 { return .failure(.malformed) }
            if label.hasPrefix("-") || label.hasSuffix("-") { return .failure(.malformed) }
            let valid = label.allSatisfy { $0.isASCII && ($0.isLetter || $0.isNumber || $0 == "-" || $0 == "_") }
            if !valid { return .failure(.malformed) }
        }

        // TLD must not be all-numeric.
        if let tld = labels.last, tld.allSatisfy(\.isNumber) { return .failure(.malformed) }

        return .success(s)
    }

    /// Root-domain + subdomain matching, identical to the browser extension
    /// (`background.js` hostMatches).
    static func matches(host: String, blockedEntry: String) -> Bool {
        return host == blockedEntry || host.hasSuffix("." + blockedEntry)
    }

    /// True when `host` matches any entry in `blockedEntries`.
    static func isBlocked(host: String, in blockedEntries: [String]) -> Bool {
        blockedEntries.contains { matches(host: host, blockedEntry: $0) }
    }
}
