package com.impulseblock.mobile.domain

import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/**
 * Versioned, portable JSON settings shared with ImpulseBlock iOS and
 * compatible with the browser extension's `blockedHosts` storage.
 *
 * Accepted import shapes:
 *  1. Full document: {"schema":"impulseblock.settings","version":1,...}
 *  2. Extension storage dump: {"blockedHosts":[...]}
 *  3. Bare array: ["youtube.com", ...]
 */
object ImportExport {

    const val SCHEMA = "impulseblock.settings"
    const val VERSION = 1

    @Serializable
    data class Document(
        val schema: String = SCHEMA,
        val version: Int = VERSION,
        val exportedAt: String,
        val platform: String = "android",
        val blockedHosts: List<String>,
        val settings: PortableSettings? = null,
        val blockedPackages: List<String>? = null,
    )

    @Serializable
    data class PortableSettings(
        val isEnabled: Boolean? = null,
        val adultFilterEnabled: Boolean? = null,
        val defaultTempMinutes: Int? = null,
    )

    sealed class ImportOutcome {
        data class Success(
            val domains: List<String>,
            val rejected: List<String>,
            val blockedPackages: List<String>,
            val settings: PortableSettings?,
        ) : ImportOutcome()

        data class Failure(val reason: Reason) : ImportOutcome()
        enum class Reason { UNREADABLE, UNSUPPORTED_VERSION, NO_VALID_DOMAINS }
    }

    private val json = Json {
        ignoreUnknownKeys = true
        prettyPrint = true
    }

    fun exportJson(
        blockedDomains: List<String>,
        blockedPackages: List<String>,
        isEnabled: Boolean,
        defaultTempMinutes: Int,
        exportedAtIso: String,
    ): String = json.encodeToString(
        Document(
            exportedAt = exportedAtIso,
            blockedHosts = blockedDomains,
            settings = PortableSettings(
                isEnabled = isEnabled,
                defaultTempMinutes = defaultTempMinutes,
            ),
            blockedPackages = blockedPackages,
        )
    )

    fun importJson(text: String): ImportOutcome {
        val element = try {
            json.parseToJsonElement(text)
        } catch (e: Exception) {
            return ImportOutcome.Failure(ImportOutcome.Reason.UNREADABLE)
        }

        var rawHosts: List<String>? = null
        var packages: List<String> = emptyList()
        var settings: PortableSettings? = null

        when (element) {
            is JsonArray -> {
                rawHosts = element.mapNotNull { (it as? JsonPrimitive)?.contentOrNullSafe() }
            }
            is JsonObject -> {
                val version = (element["version"] as? JsonPrimitive)?.content?.toIntOrNull()
                if (version != null && version > VERSION) {
                    return ImportOutcome.Failure(ImportOutcome.Reason.UNSUPPORTED_VERSION)
                }
                rawHosts = (element["blockedHosts"] as? JsonArray)
                    ?.mapNotNull { (it as? JsonPrimitive)?.contentOrNullSafe() }
                packages = (element["blockedPackages"] as? JsonArray)
                    ?.mapNotNull { (it as? JsonPrimitive)?.contentOrNullSafe() }
                    ?.filter { it.isNotBlank() }
                    ?: emptyList()
                settings = element["settings"]?.let {
                    try {
                        json.decodeFromJsonElement(PortableSettings.serializer(), it)
                    } catch (e: Exception) {
                        null
                    }
                }
            }
            else -> return ImportOutcome.Failure(ImportOutcome.Reason.UNREADABLE)
        }

        val hosts = rawHosts ?: return ImportOutcome.Failure(ImportOutcome.Reason.UNREADABLE)

        val accepted = mutableListOf<String>()
        val rejected = mutableListOf<String>()
        for (raw in hosts) {
            when (val outcome = DomainNormalizer.normalize(raw)) {
                is DomainNormalizer.Outcome.Valid ->
                    if (outcome.host !in accepted) accepted.add(outcome.host)
                is DomainNormalizer.Outcome.Invalid -> rejected.add(raw)
            }
        }

        if (accepted.isEmpty() && hosts.isNotEmpty() && packages.isEmpty()) {
            return ImportOutcome.Failure(ImportOutcome.Reason.NO_VALID_DOMAINS)
        }
        return ImportOutcome.Success(accepted, rejected, packages, settings)
    }

    private fun JsonPrimitive.contentOrNullSafe(): String? =
        if (isString) content else null
}
