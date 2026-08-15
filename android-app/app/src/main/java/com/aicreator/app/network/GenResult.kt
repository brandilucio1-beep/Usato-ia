package com.aicreator.app.network

import java.io.File

enum class ErrorKind { NETWORK, TIMEOUT, SERVER, AUTH, NOT_FOUND, UNKNOWN }

sealed class GenResult {
    data class Success(val file: File) : GenResult()
    data class Queued(val etaSeconds: Int) : GenResult()
    data class Error(val kind: ErrorKind, val message: String) : GenResult()
}
