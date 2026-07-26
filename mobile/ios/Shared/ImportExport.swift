import Foundation

/// Versioned, portable JSON settings format shared by ImpulseBlock mobile apps
/// and compatible with the browser extension's `blockedHosts` storage.
///
/// Accepted import shapes:
///  1. Full document: {"schema":"impulseblock.settings","version":1,"blockedHosts":[...],...}
///  2. Extension storage dump: {"blockedHosts":["youtube.com", ...]}
///  3. Bare array: ["youtube.com", ...]
///
/// Opaque Screen Time tokens are never exported (platform restriction);
/// exports carry only portable settings.
enum ImportExport {

    struct Document: Codable {
        var schema: String = "impulseblock.settings"
        var version: Int = 1
        var exportedAt: String
        var platform: String
        var blockedHosts: [String]
        var settings: PortableSettings?
        /// Android-only; ignored on iOS.
        var blockedPackages: [String]?
    }

    struct PortableSettings: Codable {
        var isEnabled: Bool?
        var adultFilterEnabled: Bool?
        var defaultTempMinutes: Int?
    }

    enum ImportError: Error, Equatable {
        case unreadable
        case unsupportedVersion(Int)
        case noValidDomains
    }

    struct ImportResult: Equatable {
        var domains: [String]
        var rejected: [String]
        var settings: PortableSettings?

        static func == (lhs: ImportResult, rhs: ImportResult) -> Bool {
            lhs.domains == rhs.domains && lhs.rejected == rhs.rejected
        }
    }

    // MARK: - Export

    static func exportJSON(settings: BlockSettings, platform: String = "ios", now: Date = Date()) throws -> Data {
        let formatter = ISO8601DateFormatter()
        let doc = Document(
            exportedAt: formatter.string(from: now),
            platform: platform,
            blockedHosts: settings.blockedDomains,
            settings: PortableSettings(
                isEnabled: settings.isEnabled,
                adultFilterEnabled: settings.adultFilterEnabled,
                defaultTempMinutes: settings.defaultTempMinutes
            ),
            blockedPackages: nil
        )
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        return try encoder.encode(doc)
    }

    // MARK: - Import

    static func importJSON(_ data: Data) -> Result<ImportResult, ImportError> {
        let decoder = JSONDecoder()

        var rawHosts: [String]? = nil
        var portable: PortableSettings? = nil

        if let doc = try? decoder.decode(Document.self, from: data) {
            if doc.version > 1 { return .failure(.unsupportedVersion(doc.version)) }
            rawHosts = doc.blockedHosts
            portable = doc.settings
        } else if let dump = try? decoder.decode([String: [String]].self, from: data),
                  let hosts = dump["blockedHosts"] {
            rawHosts = hosts
        } else if let array = try? decoder.decode([String].self, from: data) {
            rawHosts = array
        }

        guard let rawHosts else { return .failure(.unreadable) }

        var accepted: [String] = []
        var rejected: [String] = []
        for raw in rawHosts {
            switch DomainNormalizer.normalize(raw) {
            case .success(let host):
                if !accepted.contains(host) { accepted.append(host) }
            case .failure:
                rejected.append(raw)
            }
        }

        if accepted.isEmpty && !rawHosts.isEmpty {
            return .failure(.noValidDomains)
        }
        return .success(ImportResult(domains: accepted, rejected: rejected, settings: portable))
    }
}
