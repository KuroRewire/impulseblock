package com.impulseblock.mobile.ui

import android.content.Intent
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Checkbox
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.graphics.drawable.toBitmap
import java.text.DateFormat
import java.util.Date

// ---------------------------------------------------------------------------
// Onboarding + prominent accessibility disclosure
// ---------------------------------------------------------------------------

@Composable
fun OnboardingScreen(viewModel: MainViewModel) {
    val context = LocalContext.current
    val state by viewModel.state.collectAsState()

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Spacer(Modifier.height(24.dp))
        Text("ImpulseBlock", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold)
        Text("Pause before the click.", style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.primary)

        Text(
            "ImpulseBlock puts a calm pause in front of apps and websites you choose. " +
                "No account, no cloud, no shame — just a breath before you continue."
        )

        Card {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Accessibility access — what and why",
                    style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(
                    "To pause the apps and sites you select, ImpulseBlock needs Android's " +
                        "accessibility permission. With it, ImpulseBlock:"
                )
                Text("• Observes which app is currently on screen, to check whether you chose to pause it.")
                Text("• In Chrome, reads only the visible address-bar text to match it against the domains you added.")
                Text("• Shows a full-screen pause over blocked apps and sites.")
                Text(
                    "Everything is processed on this device. ImpulseBlock stores no browsing " +
                        "history, never records the URLs you visit, has no internet permission, " +
                        "and uploads nothing. Accessibility access is used only for the blocking " +
                        "you configure.",
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }

        if (!state.disclosureAccepted) {
            Button(onClick = { viewModel.setDisclosureAccepted() }, modifier = Modifier.fillMaxWidth()) {
                Text("I understand and agree")
            }
        } else {
            val serviceOn by rememberServiceEnabled(viewModel)
            if (serviceOn) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.CheckCircle, contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary)
                    Spacer(Modifier.size(8.dp))
                    Text("Accessibility service is on.")
                }
                Button(onClick = { viewModel.completeOnboarding() }, modifier = Modifier.fillMaxWidth()) {
                    Text("Start using ImpulseBlock")
                }
            } else {
                Button(
                    onClick = {
                        context.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Open Accessibility settings")
                }
                Text(
                    "Find “ImpulseBlock pause service” in the list and turn it on, then come back here.",
                    style = MaterialTheme.typography.bodySmall,
                )
                TextButton(onClick = { viewModel.completeOnboarding() }) {
                    Text("Skip for now (blocking stays off)")
                }
            }
        }
        Spacer(Modifier.height(24.dp))
    }
}

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------

@Composable
fun HomeScreen(viewModel: MainViewModel, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val state by viewModel.state.collectAsState()
    val serviceOn by rememberServiceEnabled(viewModel)
    val now = System.currentTimeMillis()
    val activeAllowances =
        state.tempAllowedPackages.filterValues { it > now } + state.tempAllowedHosts.filterValues { it > now }

    Column(
        modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("ImpulseBlock", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)

        Card {
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(Modifier.weight(1f)) {
                    Text("Blocking", style = MaterialTheme.typography.titleMedium)
                    Text(
                        if (state.enabled) "Pauses are active" else "Everything is allowed",
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
                Switch(checked = state.enabled, onCheckedChange = viewModel::setEnabled)
            }
        }

        Card {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("Status", style = MaterialTheme.typography.titleMedium)
                Text("Blocked apps: ${state.blockedPackages.size}")
                Text("Blocked websites: ${state.blockedDomains.size}")
                if (activeAllowances.isNotEmpty()) {
                    val until = activeAllowances.values.max()
                    Text(
                        "Temporary access active until " +
                            DateFormat.getTimeInstance(DateFormat.SHORT).format(Date(until)),
                        color = MaterialTheme.colorScheme.tertiary,
                    )
                    TextButton(onClick = viewModel::endTemporaryAccessNow) {
                        Text("End access now")
                    }
                }
            }
        }

        Card {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Permission health", style = MaterialTheme.typography.titleMedium)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        if (serviceOn) Icons.Filled.CheckCircle else Icons.Filled.Warning,
                        contentDescription = null,
                        tint = if (serviceOn) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.error,
                    )
                    Spacer(Modifier.size(8.dp))
                    Text(
                        if (serviceOn) "Accessibility service is on."
                        else "Accessibility service is OFF — blocking cannot work.",
                    )
                }
                if (!serviceOn) {
                    Button(onClick = {
                        context.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
                    }) {
                        Text("Fix in Accessibility settings")
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Apps
// ---------------------------------------------------------------------------

@Composable
fun AppsScreen(viewModel: MainViewModel, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val state by viewModel.state.collectAsState()
    val allApps = remember { InstalledApps.loadLauncherApps(context) }
    var search by remember { mutableStateOf("") }

    val suggestions = remember(allApps) {
        allApps.filter { it.packageName in InstalledApps.suggestedPackages }
    }
    val filtered = if (search.isBlank()) allApps
    else allApps.filter {
        it.label.contains(search, ignoreCase = true) ||
            it.packageName.contains(search, ignoreCase = true)
    }

    LazyColumn(modifier.fillMaxSize().padding(horizontal = 16.dp)) {
        item {
            Text(
                "Apps", style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(vertical = 12.dp),
            )
            Text(
                "Pick the apps that pull you away. ImpulseBlock pauses them the moment they open.",
                style = MaterialTheme.typography.bodySmall,
            )
            OutlinedTextField(
                value = search,
                onValueChange = { search = it },
                label = { Text("Search apps") },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 12.dp),
                singleLine = true,
            )
        }

        if (search.isBlank() && suggestions.isNotEmpty()) {
            item {
                Text("Quick picks", style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(bottom = 4.dp))
            }
            items(suggestions, key = { "s-" + it.packageName }) { app ->
                AppRow(app, app.packageName in state.blockedPackages) {
                    viewModel.togglePackage(app.packageName)
                }
            }
            item {
                HorizontalDivider(Modifier.padding(vertical = 8.dp))
                Text("All apps", style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(bottom = 4.dp))
            }
        }

        items(filtered, key = { it.packageName }) { app ->
            AppRow(app, app.packageName in state.blockedPackages) {
                viewModel.togglePackage(app.packageName)
            }
        }
    }
}

@Composable
private fun AppRow(app: InstalledApps.AppEntry, selected: Boolean, onToggle: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .clickable(onClick = onToggle)
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        val bitmap = remember(app.packageName) {
            app.icon?.toBitmap(96, 96)?.asImageBitmap()
        }
        if (bitmap != null) {
            Image(bitmap, contentDescription = null, modifier = Modifier.size(40.dp))
        } else {
            Spacer(Modifier.size(40.dp))
        }
        Column(
            Modifier
                .weight(1f)
                .padding(horizontal = 12.dp),
        ) {
            Text(app.label)
            Text(app.packageName, style = MaterialTheme.typography.bodySmall)
        }
        Checkbox(checked = selected, onCheckedChange = { onToggle() })
    }
}

// ---------------------------------------------------------------------------
// Websites
// ---------------------------------------------------------------------------

@Composable
fun WebsitesScreen(viewModel: MainViewModel, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val state by viewModel.state.collectAsState()
    val message by viewModel.message.collectAsState()
    var input by remember { mutableStateOf("") }
    var search by remember { mutableStateOf("") }

    val exportLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.CreateDocument("application/json"),
    ) { uri ->
        uri?.let {
            runCatching {
                context.contentResolver.openOutputStream(it)?.use { out ->
                    out.write(viewModel.exportJson().toByteArray())
                }
                viewModel.message.value = "Exported settings JSON."
            }.onFailure { viewModel.message.value = "Export failed." }
        }
    }

    val importLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocument(),
    ) { uri ->
        uri?.let {
            runCatching {
                context.contentResolver.openInputStream(it)?.use { stream ->
                    viewModel.importJson(stream.readBytes().decodeToString())
                }
            }.onFailure { viewModel.message.value = "Couldn't read that file." }
        }
    }

    val filtered = if (search.isBlank()) state.blockedDomains
    else state.blockedDomains.filter { it.contains(search, ignoreCase = true) }

    LazyColumn(modifier.fillMaxSize().padding(horizontal = 16.dp)) {
        item {
            Text("Websites", style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(vertical = 12.dp))
            Text(
                "Blocks the domain and all its subdomains in Chrome. " +
                    "Only the domains you add here are stored — never your browsing history.",
                style = MaterialTheme.typography.bodySmall,
            )
            Row(Modifier.padding(vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = input,
                    onValueChange = { input = it },
                    label = { Text("e.g. youtube.com") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                )
                Spacer(Modifier.size(8.dp))
                Button(onClick = {
                    viewModel.addDomain(input)
                    input = ""
                }) { Text("Add") }
            }
            message?.let {
                Text(it, style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary)
            }
            OutlinedTextField(
                value = search,
                onValueChange = { search = it },
                label = { Text("Search blocked websites") },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                singleLine = true,
            )
        }

        items(filtered, key = { it }) { host ->
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(host, Modifier.weight(1f))
                IconButton(onClick = { viewModel.removeDomain(host) }) {
                    Icon(Icons.Filled.Delete, contentDescription = "Remove $host")
                }
            }
        }

        item {
            HorizontalDivider(Modifier.padding(vertical = 12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedButton(onClick = { exportLauncher.launch("impulseblock-settings.json") }) {
                    Text("Export JSON")
                }
                OutlinedButton(onClick = {
                    importLauncher.launch(arrayOf("application/json", "text/plain", "*/*"))
                }) {
                    Text("Import JSON")
                }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

@Composable
fun SettingsScreen(viewModel: MainViewModel, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val state by viewModel.state.collectAsState()
    var confirmReset by remember { mutableStateOf(false) }

    val version = remember {
        runCatching {
            context.packageManager.getPackageInfo(context.packageName, 0).versionName
        }.getOrNull() ?: "?"
    }

    Column(
        modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Settings", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)

        Card {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Default temporary access", style = MaterialTheme.typography.titleMedium)
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    listOf(5, 15).forEach { minutes ->
                        val selected = state.defaultTempMinutes == minutes
                        if (selected) {
                            Button(onClick = {}) { Text("$minutes min") }
                        } else {
                            OutlinedButton(onClick = { viewModel.setDefaultTempMinutes(minutes) }) {
                                Text("$minutes min")
                            }
                        }
                    }
                }
            }
        }

        Card {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Privacy", style = MaterialTheme.typography.titleMedium)
                Text("• Everything stays on this device — no account, no server, no sync.")
                Text("• No browsing history: only the domains you add are stored.")
                Text("• The app has no internet permission; it is technically unable to upload data.")
                Text("• Accessibility access is used only for the pauses you configure.")
                Text("• Uninstalling the app (or Reset below) removes all data.")
            }
        }

        val serviceOn by rememberServiceEnabled(viewModel)
        Card {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Permissions", style = MaterialTheme.typography.titleMedium)
                Text(
                    if (serviceOn) "Accessibility service: on"
                    else "Accessibility service: OFF",
                )
                OutlinedButton(onClick = {
                    context.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
                }) {
                    Text("Open Accessibility settings")
                }
            }
        }

        Card {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Data", style = MaterialTheme.typography.titleMedium)
                OutlinedButton(onClick = { confirmReset = true }) { Text("Reset all data") }
            }
        }

        Text("Version $version · No analytics · No third-party SDKs",
            style = MaterialTheme.typography.bodySmall)
    }

    if (confirmReset) {
        AlertDialog(
            onDismissRequest = { confirmReset = false },
            title = { Text("Reset all data?") },
            text = { Text("Removes every selected app, blocked domain and setting. This cannot be undone.") },
            confirmButton = {
                TextButton(onClick = {
                    confirmReset = false
                    viewModel.resetAllData()
                }) { Text("Reset everything") }
            },
            dismissButton = {
                TextButton(onClick = { confirmReset = false }) { Text("Cancel") }
            },
        )
    }
}
