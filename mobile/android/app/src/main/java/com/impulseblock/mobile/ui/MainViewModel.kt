package com.impulseblock.mobile.ui

import android.app.Application
import android.content.ComponentName
import android.content.Context
import android.provider.Settings
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.impulseblock.mobile.data.BlockStateRepository
import com.impulseblock.mobile.domain.DomainNormalizer
import com.impulseblock.mobile.domain.ImportExport
import com.impulseblock.mobile.service.ImpulseBlockAccessibilityService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class MainViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = BlockStateRepository.get(application)

    val state: StateFlow<BlockStateRepository.State> = repository.state
        .stateIn(viewModelScope, SharingStarted.Eagerly, BlockStateRepository.State())

    /** UI feedback for the Websites screen (add/import results). */
    val message = MutableStateFlow<String?>(null)

    // ---- permission health -------------------------------------------------

    fun isAccessibilityServiceEnabled(): Boolean {
        val context: Context = getApplication()
        val expected = ComponentName(context, ImpulseBlockAccessibilityService::class.java)
        val enabled = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES,
        ) ?: return false
        return enabled.split(':').any {
            ComponentName.unflattenFromString(it) == expected
        } || ImpulseBlockAccessibilityService.isRunning
    }

    // ---- toggles -----------------------------------------------------------

    fun setEnabled(enabled: Boolean) = viewModelScope.launch { repository.setEnabled(enabled) }

    fun setDisclosureAccepted() = viewModelScope.launch { repository.setDisclosureAccepted(true) }

    fun completeOnboarding() = viewModelScope.launch { repository.setOnboardingComplete(true) }

    fun setDefaultTempMinutes(minutes: Int) =
        viewModelScope.launch { repository.setDefaultTempMinutes(minutes) }

    // ---- apps ----------------------------------------------------------------

    fun togglePackage(packageName: String) = viewModelScope.launch {
        val current = state.value.blockedPackages
        val next = if (packageName in current) current - packageName else current + packageName
        repository.setBlockedPackages(next)
    }

    // ---- domains ---------------------------------------------------------------

    fun addDomain(raw: String) = viewModelScope.launch {
        when (val outcome = DomainNormalizer.normalize(raw)) {
            is DomainNormalizer.Outcome.Valid -> {
                val current = state.value.blockedDomains
                if (outcome.host in current) {
                    message.value = "${outcome.host} is already on your list."
                } else {
                    repository.setBlockedDomains(current + outcome.host)
                    message.value = "Blocked ${outcome.host} and its subdomains."
                }
            }
            is DomainNormalizer.Outcome.Invalid -> {
                message.value = when (outcome.reason) {
                    DomainNormalizer.Reason.EMPTY -> "Enter a domain like example.com."
                    DomainNormalizer.Reason.MALFORMED -> "That doesn't look like a valid domain."
                    DomainNormalizer.Reason.LOCAL_OR_RESERVED -> "Local or reserved names can't be blocked."
                    DomainNormalizer.Reason.IP_UNSUPPORTED -> "IP addresses aren't supported — use a domain name."
                    DomainNormalizer.Reason.TOO_LONG -> "That domain name is too long."
                }
            }
        }
    }

    fun removeDomain(host: String) = viewModelScope.launch {
        repository.setBlockedDomains(state.value.blockedDomains - host)
    }

    fun endTemporaryAccessNow() = viewModelScope.launch { repository.clearTempAllowances() }

    fun resetAllData() = viewModelScope.launch { repository.resetAll() }

    // ---- import / export --------------------------------------------------------

    fun exportJson(): String {
        val iso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
            .apply { timeZone = TimeZone.getTimeZone("UTC") }
            .format(Date())
        val s = state.value
        return ImportExport.exportJson(
            blockedDomains = s.blockedDomains,
            blockedPackages = s.blockedPackages.sorted(),
            isEnabled = s.enabled,
            defaultTempMinutes = s.defaultTempMinutes,
            exportedAtIso = iso,
        )
    }

    fun importJson(text: String) = viewModelScope.launch {
        when (val outcome = ImportExport.importJson(text)) {
            is ImportExport.ImportOutcome.Success -> {
                val s = state.value
                repository.setBlockedDomains((s.blockedDomains + outcome.domains).distinct())
                if (outcome.blockedPackages.isNotEmpty()) {
                    repository.setBlockedPackages(s.blockedPackages + outcome.blockedPackages)
                }
                outcome.settings?.defaultTempMinutes
                    ?.takeIf { it in listOf(5, 15) }
                    ?.let { repository.setDefaultTempMinutes(it) }
                val skipped = if (outcome.rejected.isEmpty()) ""
                else " Skipped ${outcome.rejected.size} invalid entries."
                message.value = "Imported ${outcome.domains.size} domains." + skipped
            }
            is ImportExport.ImportOutcome.Failure -> {
                message.value = when (outcome.reason) {
                    ImportExport.ImportOutcome.Reason.UNREADABLE ->
                        "That file isn't a recognized ImpulseBlock export."
                    ImportExport.ImportOutcome.Reason.UNSUPPORTED_VERSION ->
                        "This file uses a newer format. Update ImpulseBlock to import it."
                    ImportExport.ImportOutcome.Reason.NO_VALID_DOMAINS ->
                        "No valid domains found in that file."
                }
            }
        }
    }
}
