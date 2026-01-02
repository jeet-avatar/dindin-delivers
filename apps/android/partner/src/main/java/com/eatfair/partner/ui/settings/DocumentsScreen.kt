package com.eatfair.partner.ui.settings

import android.net.Uri
import android.util.Log
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.eatfair.shared.data.local.SecureStorage
import com.eatfair.shared.data.repository.DollorRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File
import java.io.FileOutputStream
import javax.inject.Inject

// iOS Colors
private val BackgroundGrouped = Color(0xFFF2F2F7)
private val BackgroundSecondary = Color.White
private val TextPrimary = Color(0xFF000000)
private val TextSecondary = Color(0xFF8E8E93)
private val BrandOrange = Color(0xFFF2994A)
private val BrandGreen = Color(0xFF06C167)
private val BrandRed = Color(0xFFF44336)
private val BrandBlue = Color(0xFF2196F3)
private val SeparatorColor = Color(0xFFC6C6C8)

enum class DocumentStatus {
    NOT_UPLOADED,
    PENDING,
    APPROVED,
    REJECTED
}

data class DocumentItem(
    val id: Int? = null,
    val title: String,
    val description: String,
    val icon: ImageVector,
    val status: DocumentStatus,
    val expiryDate: String? = null,
    val documentType: String = ""
)

/**
 * Documents Screen State
 */
data class DocumentsState(
    val documents: List<DocumentItem> = getDefaultDocuments(),
    val isLoading: Boolean = false,
    val isUploading: Boolean = false,
    val error: String? = null
)

private fun getDefaultDocuments() = listOf(
    DocumentItem(
        title = "Business License",
        description = "State or local business license",
        icon = Icons.Default.Badge,
        status = DocumentStatus.NOT_UPLOADED,
        documentType = "business_license"
    ),
    DocumentItem(
        title = "Food Handler's Permit",
        description = "Food safety certification",
        icon = Icons.Default.Restaurant,
        status = DocumentStatus.NOT_UPLOADED,
        documentType = "food_handler_permit"
    ),
    DocumentItem(
        title = "Health Inspection Certificate",
        description = "Latest health department inspection",
        icon = Icons.Default.HealthAndSafety,
        status = DocumentStatus.NOT_UPLOADED,
        documentType = "health_inspection"
    ),
    DocumentItem(
        title = "Tax ID / EIN",
        description = "Employer Identification Number",
        icon = Icons.Default.AccountBalance,
        status = DocumentStatus.NOT_UPLOADED,
        documentType = "tax_id"
    ),
    DocumentItem(
        title = "Liability Insurance",
        description = "General liability insurance certificate",
        icon = Icons.Default.Security,
        status = DocumentStatus.NOT_UPLOADED,
        documentType = "liability_insurance"
    ),
    DocumentItem(
        title = "Menu & Allergen Info",
        description = "Menu with allergen information",
        icon = Icons.Default.MenuBook,
        status = DocumentStatus.NOT_UPLOADED,
        documentType = "menu_allergen"
    )
)

@HiltViewModel
class DocumentsViewModel @Inject constructor(
    private val dollorRepository: DollorRepository,
    private val secureStorage: SecureStorage
) : ViewModel() {

    companion object {
        private const val TAG = "DocumentsViewModel"
    }

    private val _uiState = MutableStateFlow(DocumentsState())
    val uiState: StateFlow<DocumentsState> = _uiState.asStateFlow()

    init {
        loadDocuments()
    }

    private fun loadDocuments() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            try {
                val result = dollorRepository.getVendorDocuments()
                result.onSuccess { response ->
                    val defaultDocs = getDefaultDocuments().toMutableList()

                    // Update default docs with API data
                    response.documents.forEach { apiDoc ->
                        val index = defaultDocs.indexOfFirst { it.documentType == apiDoc.documentType }
                        if (index >= 0) {
                            defaultDocs[index] = defaultDocs[index].copy(
                                id = apiDoc.id,
                                status = when (apiDoc.status.lowercase()) {
                                    "approved" -> DocumentStatus.APPROVED
                                    "pending" -> DocumentStatus.PENDING
                                    "rejected" -> DocumentStatus.REJECTED
                                    else -> DocumentStatus.NOT_UPLOADED
                                }
                            )
                        }
                    }

                    _uiState.update {
                        it.copy(
                            documents = defaultDocs,
                            isLoading = false
                        )
                    }
                }.onFailure { e ->
                    Log.e(TAG, "Error loading documents from API: ${e.message}")
                    _uiState.update { it.copy(isLoading = false) }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error loading documents: ${e.message}")
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = "Failed to load documents"
                    )
                }
            }
        }
    }

    fun uploadDocument(documentType: String, filePart: okhttp3.MultipartBody.Part) {
        viewModelScope.launch {
            _uiState.update { it.copy(isUploading = true) }

            try {
                val result = dollorRepository.uploadVendorDocument(filePart, documentType)
                result.onSuccess {
                    Log.d(TAG, "Document uploaded successfully")
                    // Update local state to pending
                    val docs = _uiState.value.documents.map { doc ->
                        if (doc.documentType == documentType) {
                            doc.copy(status = DocumentStatus.PENDING)
                        } else {
                            doc
                        }
                    }
                    _uiState.update {
                        it.copy(
                            documents = docs,
                            isUploading = false
                        )
                    }
                }.onFailure { e ->
                    Log.e(TAG, "Error uploading document: ${e.message}")
                    _uiState.update {
                        it.copy(
                            isUploading = false,
                            error = "Failed to upload document: ${e.message}"
                        )
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error uploading document: ${e.message}")
                _uiState.update {
                    it.copy(
                        isUploading = false,
                        error = "Failed to upload document"
                    )
                }
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DocumentsScreen(
    onBackClick: () -> Unit,
    viewModel: DocumentsViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val uiState by viewModel.uiState.collectAsState()

    // Track which document type we're uploading
    var selectedDocumentType by remember { mutableStateOf<String?>(null) }

    // File picker launcher
    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let { selectedUri ->
            selectedDocumentType?.let { docType ->
                try {
                    // Get file from content URI
                    val inputStream = context.contentResolver.openInputStream(selectedUri)
                    val fileName = "document_${System.currentTimeMillis()}.pdf"
                    val tempFile = File(context.cacheDir, fileName)

                    inputStream?.use { input ->
                        FileOutputStream(tempFile).use { output ->
                            input.copyTo(output)
                        }
                    }

                    // Create multipart body
                    val mimeType = context.contentResolver.getType(selectedUri) ?: "application/pdf"
                    val requestBody = tempFile.asRequestBody(mimeType.toMediaTypeOrNull())
                    val filePart = MultipartBody.Part.createFormData("file", fileName, requestBody)

                    // Upload the document
                    viewModel.uploadDocument(docType, filePart)

                    Log.d("DocumentsScreen", "File selected: $fileName for document type: $docType")
                } catch (e: Exception) {
                    Log.e("DocumentsScreen", "Error processing file: ${e.message}")
                }
            }
        }
        selectedDocumentType = null
    }

    val approvedCount = uiState.documents.count { it.status == DocumentStatus.APPROVED }
    val pendingCount = uiState.documents.count { it.status == DocumentStatus.PENDING }
    val notUploadedCount = uiState.documents.count { it.status == DocumentStatus.NOT_UPLOADED }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "Documents",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = BackgroundSecondary
                )
            )
        }
    ) { paddingValues ->
        if (uiState.isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = BrandOrange)
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(BackgroundGrouped)
                    .padding(paddingValues)
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                // Status summary
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    color = BackgroundSecondary
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        StatusBadge(
                            count = approvedCount,
                            label = "Approved",
                            color = BrandGreen
                        )
                        StatusBadge(
                            count = pendingCount,
                            label = "Pending",
                            color = BrandOrange
                        )
                        StatusBadge(
                            count = notUploadedCount,
                            label = "Required",
                            color = BrandRed
                        )
                    }
                }

                // Required documents info
                if (notUploadedCount > 0) {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        color = BrandRed.copy(alpha = 0.1f)
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.Warning,
                                contentDescription = null,
                                tint = BrandRed,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(
                                "Please upload all required documents to complete your restaurant verification.",
                                fontSize = 14.sp,
                                color = TextPrimary
                            )
                        }
                    }
                }

                // Documents list
                DocumentSection(title = "VERIFICATION DOCUMENTS") {
                    uiState.documents.forEachIndexed { index, document ->
                        DocumentRow(
                            document = document,
                            isUploading = uiState.isUploading,
                            onUploadClick = {
                                // Set the document type and launch file picker
                                selectedDocumentType = document.documentType
                                // Accept images and PDFs for document upload
                                filePickerLauncher.launch("*/*")
                            },
                            showDivider = index < uiState.documents.size - 1
                        )
                    }
                }

            // Help card
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                color = BrandBlue.copy(alpha = 0.1f)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Info,
                        contentDescription = null,
                        tint = BrandBlue,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            "Need help?",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = TextPrimary
                        )
                        Text(
                            "Contact support@dollor.ai for document verification assistance.",
                            fontSize = 14.sp,
                            color = TextSecondary
                        )
                    }
                }
            }

                Spacer(modifier = Modifier.height(60.dp))
            }
        }
    }

    // Error dialog
    uiState.error?.let { error ->
        AlertDialog(
            onDismissRequest = { viewModel.clearError() },
            title = { Text("Error", fontWeight = FontWeight.SemiBold) },
            text = { Text(error) },
            confirmButton = {
                TextButton(onClick = { viewModel.clearError() }) {
                    Text("OK", color = BrandOrange)
                }
            }
        )
    }
}

@Composable
private fun StatusBadge(
    count: Int,
    label: String,
    color: Color
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            count.toString(),
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            color = color
        )
        Text(
            label,
            fontSize = 13.sp,
            color = TextSecondary
        )
    }
}

@Composable
private fun DocumentSection(
    title: String,
    content: @Composable ColumnScope.() -> Unit
) {
    Column {
        Text(
            title,
            modifier = Modifier.padding(start = 16.dp, bottom = 6.dp),
            fontSize = 13.sp,
            fontWeight = FontWeight.Normal,
            color = TextSecondary,
            letterSpacing = 0.5.sp
        )
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            color = BackgroundSecondary
        ) {
            Column(content = content)
        }
    }
}

@Composable
private fun DocumentRow(
    document: DocumentItem,
    isUploading: Boolean = false,
    onUploadClick: () -> Unit,
    showDivider: Boolean
) {
    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(onClick = onUploadClick)
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Icon
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .background(
                        color = when (document.status) {
                            DocumentStatus.APPROVED -> BrandGreen.copy(alpha = 0.1f)
                            DocumentStatus.PENDING -> BrandOrange.copy(alpha = 0.1f)
                            DocumentStatus.REJECTED -> BrandRed.copy(alpha = 0.1f)
                            DocumentStatus.NOT_UPLOADED -> TextSecondary.copy(alpha = 0.1f)
                        },
                        shape = RoundedCornerShape(10.dp)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    document.icon,
                    contentDescription = null,
                    tint = when (document.status) {
                        DocumentStatus.APPROVED -> BrandGreen
                        DocumentStatus.PENDING -> BrandOrange
                        DocumentStatus.REJECTED -> BrandRed
                        DocumentStatus.NOT_UPLOADED -> TextSecondary
                    },
                    modifier = Modifier.size(24.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Text
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    document.title,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Medium,
                    color = TextPrimary
                )
                Text(
                    document.description,
                    fontSize = 13.sp,
                    color = TextSecondary
                )
                if (document.expiryDate != null) {
                    Text(
                        "Expires: ${document.expiryDate}",
                        fontSize = 12.sp,
                        color = BrandOrange
                    )
                }
            }

            Spacer(modifier = Modifier.width(8.dp))

            // Status badge or upload button
            when (document.status) {
                DocumentStatus.APPROVED -> {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = BrandGreen.copy(alpha = 0.15f)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = BrandGreen,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                "Approved",
                                fontSize = 12.sp,
                                color = BrandGreen
                            )
                        }
                    }
                }
                DocumentStatus.PENDING -> {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = BrandOrange.copy(alpha = 0.15f)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.Schedule,
                                contentDescription = null,
                                tint = BrandOrange,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                "Pending",
                                fontSize = 12.sp,
                                color = BrandOrange
                            )
                        }
                    }
                }
                DocumentStatus.REJECTED -> {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = BrandRed.copy(alpha = 0.15f)
                    ) {
                        Text(
                            "Rejected",
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            fontSize = 12.sp,
                            color = BrandRed
                        )
                    }
                }
                DocumentStatus.NOT_UPLOADED -> {
                    Button(
                        onClick = onUploadClick,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = BrandOrange
                        ),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Icon(
                            Icons.Default.Upload,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Upload", fontSize = 13.sp)
                    }
                }
            }
        }

        if (showDivider) {
            HorizontalDivider(
                color = SeparatorColor.copy(alpha = 0.3f),
                modifier = Modifier.padding(start = 72.dp)
            )
        }
    }
}
