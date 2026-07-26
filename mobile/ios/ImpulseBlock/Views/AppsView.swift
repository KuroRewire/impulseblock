import SwiftUI
import FamilyControls
import ManagedSettings

struct AppsView: View {
    @EnvironmentObject var model: AppModel
    @State private var pickerPresented = false
    @State private var confirmClear = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text("Selections are made with Apple's system picker. iOS shows ImpulseBlock only opaque tokens — your choices never leave this device.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section("Selected apps (\(model.selection.applicationTokens.count))") {
                    if model.selection.applicationTokens.isEmpty {
                        Text("No apps selected yet.")
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(Array(model.selection.applicationTokens), id: \.self) { token in
                            Label(token)   // System-rendered app name + icon.
                        }
                    }
                }

                if !model.selection.categoryTokens.isEmpty {
                    Section("Selected categories (\(model.selection.categoryTokens.count))") {
                        ForEach(Array(model.selection.categoryTokens), id: \.self) { token in
                            Label(token)
                        }
                    }
                }

                if !model.selection.webDomainTokens.isEmpty {
                    Section("Websites picked here (\(model.selection.webDomainTokens.count))") {
                        ForEach(Array(model.selection.webDomainTokens), id: \.self) { token in
                            Label(token)
                        }
                    }
                }

                Section {
                    Button {
                        pickerPresented = true
                    } label: {
                        Label("Choose apps & categories", systemImage: "plus.circle")
                    }
                    .disabled(model.authorization.state != .authorized)

                    if model.authorization.state != .authorized {
                        Text("Grant Screen Time access on the Home tab first.")
                            .font(.footnote).foregroundStyle(.orange)
                    }

                    if !model.selection.applicationTokens.isEmpty
                        || !model.selection.categoryTokens.isEmpty
                        || !model.selection.webDomainTokens.isEmpty {
                        Button(role: .destructive) {
                            confirmClear = true
                        } label: {
                            Label("Clear all selections", systemImage: "trash")
                        }
                    }
                } footer: {
                    Text("Popular targets like Instagram, TikTok and YouTube are selected through this picker — search for them by name. To remove a single app, open the picker and uncheck it.")
                }
            }
            .navigationTitle("Apps")
            .familyActivityPicker(isPresented: $pickerPresented, selection: $model.selection)
            .confirmationDialog("Remove every selected app, category and picked website?",
                                isPresented: $confirmClear, titleVisibility: .visible) {
                Button("Clear all", role: .destructive) { model.clearAllSelections() }
            }
        }
    }
}
