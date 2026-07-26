import SwiftUI
import UniformTypeIdentifiers

struct WebsitesView: View {
    @EnvironmentObject var model: AppModel

    @State private var input = ""
    @State private var search = ""
    @State private var statusMessage: String?
    @State private var showImporter = false
    @State private var showExporter = false
    @State private var exportDocument: JSONDocument?
    @State private var importSummary: String?

    private var filteredDomains: [String] {
        let all = model.settings.blockedDomains
        guard !search.isEmpty else { return all }
        return all.filter { $0.localizedCaseInsensitiveContains(search) }
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack {
                        TextField("e.g. youtube.com", text: $input)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .keyboardType(.URL)
                            .onSubmit(addCurrent)
                            .accessibilityLabel("Domain to block")
                        Button("Add", action: addCurrent)
                            .buttonStyle(.borderedProminent)
                            .tint(Theme.indigo)
                            .disabled(input.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                    if let statusMessage {
                        Text(statusMessage)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                } header: {
                    Text("Block a website")
                } footer: {
                    Text("Blocks the domain and all its subdomains (m.youtube.com, music.youtube.com, …). \(model.settings.blockedDomains.count)/\(BlockSettings.webDomainLimit) used — iOS limits manually shielded domains to \(BlockSettings.webDomainLimit). Path-level filtering is not part of this version.")
                }

                Section {
                    Toggle(isOn: $model.settings.adultFilterEnabled) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Block adult websites")
                            Text("Uses Apple's on-device classifier. Independent of your list; it may not catch every website.")
                                .font(.footnote).foregroundStyle(.secondary)
                        }
                    }
                    .tint(Theme.indigo)
                }

                Section("Blocked websites (\(model.settings.blockedDomains.count))") {
                    if model.settings.blockedDomains.isEmpty {
                        Text("Nothing here yet. Add a first domain above.")
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(filteredDomains, id: \.self) { host in
                            Text(host)
                                .swipeActions {
                                    Button(role: .destructive) {
                                        model.removeDomain(host)
                                    } label: {
                                        Label("Remove", systemImage: "trash")
                                    }
                                }
                        }
                    }
                }

                Section("Import / export") {
                    Button {
                        prepareExport()
                    } label: {
                        Label("Export list as JSON", systemImage: "square.and.arrow.up")
                    }
                    Button {
                        showImporter = true
                    } label: {
                        Label("Import JSON", systemImage: "square.and.arrow.down")
                    }
                    if let importSummary {
                        Text(importSummary).font(.footnote).foregroundStyle(.secondary)
                    }
                }
            }
            .searchable(text: $search, prompt: "Search blocked websites")
            .navigationTitle("Websites")
            .fileImporter(isPresented: $showImporter,
                          allowedContentTypes: [.json, .plainText]) { result in
                handleImport(result)
            }
            .fileExporter(isPresented: $showExporter,
                          document: exportDocument,
                          contentType: .json,
                          defaultFilename: "impulseblock-settings") { _ in }
        }
    }

    private func addCurrent() {
        let outcome = model.addDomain(input)
        switch outcome {
        case .added(let host):
            statusMessage = "Blocked \(host) and its subdomains."
            input = ""
        case .already(let host):
            statusMessage = "\(host) is already on your list."
        case .limitReached:
            statusMessage = "You've reached the iOS limit of \(BlockSettings.webDomainLimit) manually blocked domains. Remove one to add another — this is an Apple platform limit, not an ImpulseBlock plan limit."
        case .invalid(let reason):
            statusMessage = message(for: reason)
        }
    }

    private func message(for reason: DomainNormalizer.Failure) -> String {
        switch reason {
        case .empty: return "Enter a domain like example.com."
        case .malformed: return "That doesn't look like a valid domain."
        case .localOrReserved: return "Local or reserved names can't be blocked."
        case .ipAddressUnsupported: return "IP addresses aren't supported — use a domain name."
        case .tooLong: return "That domain name is too long."
        }
    }

    private func prepareExport() {
        if let data = try? ImportExport.exportJSON(settings: model.settings) {
            exportDocument = JSONDocument(data: data)
            showExporter = true
        }
    }

    private func handleImport(_ result: Result<URL, Error>) {
        guard case .success(let url) = result else { return }
        let secured = url.startAccessingSecurityScopedResource()
        defer { if secured { url.stopAccessingSecurityScopedResource() } }
        guard let data = try? Data(contentsOf: url) else {
            importSummary = "Couldn't read that file."
            return
        }
        switch ImportExport.importJSON(data) {
        case .success(let parsed):
            let before = model.settings.blockedDomains.count
            model.applyImport(parsed)
            let added = model.settings.blockedDomains.count - before
            var text = "Imported \(added) new domain\(added == 1 ? "" : "s")."
            if !parsed.rejected.isEmpty {
                text += " Skipped \(parsed.rejected.count) invalid entr\(parsed.rejected.count == 1 ? "y" : "ies")."
            }
            importSummary = text
        case .failure(.unsupportedVersion(let v)):
            importSummary = "This file uses a newer format (version \(v)). Update ImpulseBlock to import it."
        case .failure:
            importSummary = "That file isn't a recognized ImpulseBlock export."
        }
    }
}

struct JSONDocument: FileDocument {
    static var readableContentTypes: [UTType] { [.json] }
    var data: Data

    init(data: Data) { self.data = data }

    init(configuration: ReadConfiguration) throws {
        data = configuration.file.regularFileContents ?? Data()
    }

    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        FileWrapper(regularFileWithContents: data)
    }
}
