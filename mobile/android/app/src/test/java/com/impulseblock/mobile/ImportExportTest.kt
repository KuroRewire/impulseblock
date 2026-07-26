package com.impulseblock.mobile

import com.impulseblock.mobile.domain.ImportExport
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ImportExportTest {

    @Test fun exportImportRoundTrip() {
        val json = ImportExport.exportJson(
            blockedDomains = listOf("tiktok.com", "youtube.com"),
            blockedPackages = listOf("com.instagram.android"),
            isEnabled = true,
            defaultTempMinutes = 15,
            exportedAtIso = "2026-07-26T00:00:00Z",
        )
        val outcome = ImportExport.importJson(json)
        assertTrue(outcome is ImportExport.ImportOutcome.Success)
        outcome as ImportExport.ImportOutcome.Success
        assertEquals(listOf("tiktok.com", "youtube.com"), outcome.domains)
        assertEquals(listOf("com.instagram.android"), outcome.blockedPackages)
        assertEquals(15, outcome.settings?.defaultTempMinutes)
    }

    @Test fun importsExtensionStorageDump() {
        val json = """{"blockedHosts":["youtube.com","WWW.Reddit.com","bad entry"]}"""
        val outcome = ImportExport.importJson(json) as ImportExport.ImportOutcome.Success
        assertEquals(listOf("youtube.com", "reddit.com"), outcome.domains)
        assertEquals(listOf("bad entry"), outcome.rejected)
    }

    @Test fun importsBareArray() {
        val json = """["instagram.com","https://x.com/home"]"""
        val outcome = ImportExport.importJson(json) as ImportExport.ImportOutcome.Success
        assertEquals(listOf("instagram.com", "x.com"), outcome.domains)
    }

    @Test fun importsIosExport() {
        // Shape produced by ImpulseBlock iOS (platform differs, schema shared).
        val json = """
            {"schema":"impulseblock.settings","version":1,
             "exportedAt":"2026-07-26T00:00:00Z","platform":"ios",
             "blockedHosts":["youtube.com"],
             "settings":{"isEnabled":true,"adultFilterEnabled":true,"defaultTempMinutes":5}}
        """.trimIndent()
        val outcome = ImportExport.importJson(json) as ImportExport.ImportOutcome.Success
        assertEquals(listOf("youtube.com"), outcome.domains)
        assertEquals(5, outcome.settings?.defaultTempMinutes)
    }

    @Test fun rejectsGarbage() {
        assertTrue(ImportExport.importJson("not json") is ImportExport.ImportOutcome.Failure)
        assertTrue(ImportExport.importJson("42") is ImportExport.ImportOutcome.Failure)
    }

    @Test fun rejectsNewerVersion() {
        val json = """{"schema":"impulseblock.settings","version":99,"exportedAt":"x","blockedHosts":["a.com"]}"""
        val outcome = ImportExport.importJson(json) as ImportExport.ImportOutcome.Failure
        assertEquals(ImportExport.ImportOutcome.Reason.UNSUPPORTED_VERSION, outcome.reason)
    }

    @Test fun allInvalidDomainsFails() {
        val outcome = ImportExport.importJson("""["localhost","192.168.0.1"]""")
        assertTrue(outcome is ImportExport.ImportOutcome.Failure)
    }
}
