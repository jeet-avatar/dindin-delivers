package com.eatfair.partner.ui.documents

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.eatfair.shared.data.remote.DollorApiService
import com.eatfair.shared.model.VendorDocument
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import java.io.FileOutputStream
import javax.inject.Inject

/**
 * ViewModel for Restaurant Documents Screen
 * Connects to P2P Backend API for document management
 */
@HiltViewModel
class RestaurantDocumentsViewModel @Inject constructor(
    private val api: DollorApiService
) : ViewModel() {

    private val _documents = MutableStateFlow<List<VendorDocument>>(emptyList())
    val documents: StateFlow<List<VendorDocument>> = _documents.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _uploadingDocType = MutableStateFlow<String?>(null)
    val uploadingDocType: StateFlow<String?> = _uploadingDocType.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _uploadSuccess = MutableStateFlow(false)
    val uploadSuccess: StateFlow<Boolean> = _uploadSuccess.asStateFlow()

    // Required document types for vendor approval
    private val requiredDocumentTypes = listOf(
        "w9_form",
        "health_permit",
        "food_handler",
        "liability_insurance",
        "business_license"
    )

    val completionPercentage: Int
        get() {
            val uploaded = requiredDocumentTypes.count { docType ->
                _documents.value.any { it.documentType == docType }
            }
            return if (requiredDocumentTypes.isEmpty()) 0 else (uploaded * 100) / requiredDocumentTypes.size
        }

    val hasPendingDocuments: Boolean
        get() = _documents.value.any { it.status == "pending" }

    fun fetchDocuments(vendorId: Int, token: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                val response = api.getVendorDocuments(vendorId, "Bearer $token")
                _documents.value = response.documents
            } catch (e: Exception) {
                _error.value = e.message ?: "Failed to fetch documents"
                // Return empty list on error but don't crash
                _documents.value = emptyList()
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun uploadDocument(
        context: Context,
        vendorId: Int,
        token: String,
        documentType: String,
        imageUri: Uri
    ) {
        viewModelScope.launch {
            _uploadingDocType.value = documentType
            _error.value = null
            _uploadSuccess.value = false

            try {
                // Convert URI to File
                val file = uriToFile(context, imageUri, documentType)
                if (file == null) {
                    _error.value = "Failed to process image"
                    _uploadingDocType.value = null
                    return@launch
                }

                // Create multipart request
                val requestFile = file.asRequestBody("image/jpeg".toMediaTypeOrNull())
                val filePart = MultipartBody.Part.createFormData("file", file.name, requestFile)
                val documentTypePart = documentType.toRequestBody("text/plain".toMediaTypeOrNull())

                // Upload to backend
                val response = api.uploadVendorDocument(
                    vendorId = vendorId,
                    file = filePart,
                    documentType = documentTypePart,
                    token = "Bearer $token"
                )

                // Refresh documents list
                fetchDocuments(vendorId, token)
                _uploadSuccess.value = true

                // Clean up temp file
                file.delete()

            } catch (e: Exception) {
                _error.value = e.message ?: "Upload failed"
            } finally {
                _uploadingDocType.value = null
            }
        }
    }

    fun deleteDocument(vendorId: Int, token: String, documentId: Int) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                api.deleteVendorDocument(vendorId, documentId, "Bearer $token")
                // Refresh documents list
                fetchDocuments(vendorId, token)
            } catch (e: Exception) {
                _error.value = e.message ?: "Failed to delete document"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun clearError() {
        _error.value = null
    }

    fun clearUploadSuccess() {
        _uploadSuccess.value = false
    }

    private fun uriToFile(context: Context, uri: Uri, prefix: String): File? {
        return try {
            val inputStream = context.contentResolver.openInputStream(uri) ?: return null
            val file = File(context.cacheDir, "${prefix}_${System.currentTimeMillis()}.jpg")
            FileOutputStream(file).use { outputStream ->
                inputStream.copyTo(outputStream)
            }
            inputStream.close()
            file
        } catch (e: Exception) {
            null
        }
    }

    fun getDocumentStatus(documentType: String): DocumentStatus {
        val doc = _documents.value.find { it.documentType == documentType }
        return when {
            doc == null -> DocumentStatus.NOT_UPLOADED
            doc.status == "approved" -> DocumentStatus.VERIFIED
            doc.status == "pending" -> DocumentStatus.PENDING
            doc.status == "rejected" -> DocumentStatus.EXPIRED // Show as needing re-upload
            else -> DocumentStatus.PENDING
        }
    }

    fun getDocumentByType(documentType: String): VendorDocument? {
        return _documents.value.find { it.documentType == documentType }
    }
}
