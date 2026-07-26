package com.impulseblock.mobile.data

import android.annotation.SuppressLint
import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.impulseblock.mobile.domain.BlockDecision
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.MapSerializer
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.json.Json

/**
 * Single local persistence layer (DataStore Preferences). Stores ONLY:
 * user-selected package names, user-entered domains, toggles, and temporary
 * allowance expiry timestamps. Never browsing history, URLs, or titles.
 */
class BlockStateRepository(private val context: Context) {

    companion object {
        private val Context.dataStore: DataStore<Preferences> by preferencesDataStore("impulseblock_state")

        private val KEY_ENABLED = booleanPreferencesKey("enabled")
        private val KEY_ONBOARDED = booleanPreferencesKey("onboarding_complete")
        private val KEY_DISCLOSURE_ACCEPTED = booleanPreferencesKey("disclosure_accepted")
        private val KEY_DEFAULT_TEMP_MINUTES = intPreferencesKey("default_temp_minutes")
        private val KEY_BLOCKED_PACKAGES = stringPreferencesKey("blocked_packages_json")
        private val KEY_BLOCKED_DOMAINS = stringPreferencesKey("blocked_domains_json")
        private val KEY_TEMP_PACKAGES = stringPreferencesKey("temp_allowed_packages_json")
        private val KEY_TEMP_HOSTS = stringPreferencesKey("temp_allowed_hosts_json")
        private val KEY_SETTINGS_VERSION = intPreferencesKey("settings_version")

        const val SETTINGS_VERSION = 1

        // Holds the application context only (see get()) — cannot leak an Activity.
        @SuppressLint("StaticFieldLeak")
        @Volatile
        private var instance: BlockStateRepository? = null

        fun get(context: Context): BlockStateRepository =
            instance ?: synchronized(this) {
                instance ?: BlockStateRepository(context.applicationContext).also { instance = it }
            }
    }

    private val json = Json { ignoreUnknownKeys = true }
    private val listSerializer = ListSerializer(String.serializer())
    private val mapSerializer = MapSerializer(String.serializer(), Long.serializer())

    data class State(
        val enabled: Boolean = true,
        val onboardingComplete: Boolean = false,
        val disclosureAccepted: Boolean = false,
        val defaultTempMinutes: Int = 5,
        val blockedPackages: Set<String> = emptySet(),
        val blockedDomains: List<String> = emptyList(),
        val tempAllowedPackages: Map<String, Long> = emptyMap(),
        val tempAllowedHosts: Map<String, Long> = emptyMap(),
        val settingsVersion: Int = SETTINGS_VERSION,
    ) {
        fun toSnapshot(selfPackage: String, launcherPackages: Set<String>) =
            BlockDecision.Snapshot(
                enabled = enabled,
                blockedPackages = blockedPackages,
                blockedDomains = blockedDomains,
                tempAllowedPackages = tempAllowedPackages,
                tempAllowedHosts = tempAllowedHosts,
                selfPackage = selfPackage,
                launcherPackages = launcherPackages,
            )
    }

    val state: Flow<State> = context.dataStore.data.map { prefs ->
        State(
            enabled = prefs[KEY_ENABLED] ?: true,
            onboardingComplete = prefs[KEY_ONBOARDED] ?: false,
            disclosureAccepted = prefs[KEY_DISCLOSURE_ACCEPTED] ?: false,
            defaultTempMinutes = prefs[KEY_DEFAULT_TEMP_MINUTES] ?: 5,
            blockedPackages = decodeList(prefs[KEY_BLOCKED_PACKAGES]).toSet(),
            blockedDomains = decodeList(prefs[KEY_BLOCKED_DOMAINS]),
            tempAllowedPackages = decodeMap(prefs[KEY_TEMP_PACKAGES]),
            tempAllowedHosts = decodeMap(prefs[KEY_TEMP_HOSTS]),
            settingsVersion = prefs[KEY_SETTINGS_VERSION] ?: SETTINGS_VERSION,
        )
    }

    private fun decodeList(encoded: String?): List<String> =
        encoded?.let { runCatching { json.decodeFromString(listSerializer, it) }.getOrNull() } ?: emptyList()

    private fun decodeMap(encoded: String?): Map<String, Long> =
        encoded?.let { runCatching { json.decodeFromString(mapSerializer, it) }.getOrNull() } ?: emptyMap()

    // MARK: mutations ------------------------------------------------------

    suspend fun setEnabled(enabled: Boolean) =
        context.dataStore.edit { it[KEY_ENABLED] = enabled }

    suspend fun setOnboardingComplete(done: Boolean) =
        context.dataStore.edit { it[KEY_ONBOARDED] = done }

    suspend fun setDisclosureAccepted(accepted: Boolean) =
        context.dataStore.edit { it[KEY_DISCLOSURE_ACCEPTED] = accepted }

    suspend fun setDefaultTempMinutes(minutes: Int) =
        context.dataStore.edit { it[KEY_DEFAULT_TEMP_MINUTES] = minutes }

    suspend fun setBlockedPackages(packages: Set<String>) =
        context.dataStore.edit {
            it[KEY_BLOCKED_PACKAGES] = json.encodeToString(listSerializer, packages.sorted())
        }

    suspend fun setBlockedDomains(domains: List<String>) =
        context.dataStore.edit {
            it[KEY_BLOCKED_DOMAINS] = json.encodeToString(listSerializer, domains.distinct().sorted())
        }

    suspend fun addTempAllowPackage(packageName: String, untilMs: Long) =
        context.dataStore.edit { prefs ->
            val current = decodeMap(prefs[KEY_TEMP_PACKAGES]).pruned()
            prefs[KEY_TEMP_PACKAGES] =
                json.encodeToString(mapSerializer, current + (packageName to untilMs))
        }

    suspend fun addTempAllowHost(host: String, untilMs: Long) =
        context.dataStore.edit { prefs ->
            val current = decodeMap(prefs[KEY_TEMP_HOSTS]).pruned()
            prefs[KEY_TEMP_HOSTS] =
                json.encodeToString(mapSerializer, current + (host to untilMs))
        }

    suspend fun clearTempAllowances() =
        context.dataStore.edit {
            it[KEY_TEMP_PACKAGES] = json.encodeToString(mapSerializer, emptyMap())
            it[KEY_TEMP_HOSTS] = json.encodeToString(mapSerializer, emptyMap())
        }

    suspend fun pruneExpiredAllowances(nowMs: Long) =
        context.dataStore.edit { prefs ->
            prefs[KEY_TEMP_PACKAGES] =
                json.encodeToString(mapSerializer, decodeMap(prefs[KEY_TEMP_PACKAGES]).pruned(nowMs))
            prefs[KEY_TEMP_HOSTS] =
                json.encodeToString(mapSerializer, decodeMap(prefs[KEY_TEMP_HOSTS]).pruned(nowMs))
        }

    suspend fun resetAll() = context.dataStore.edit { it.clear() }

    private fun Map<String, Long>.pruned(nowMs: Long = System.currentTimeMillis()): Map<String, Long> =
        filterValues { it > nowMs }
}
