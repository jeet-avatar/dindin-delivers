package com.eatfair.partner.ui.documents

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.eatfair.shared.config.AppConfig
import com.eatfair.shared.model.VendorDocument

/**
 * Document metadata for display
 */
data class DocumentInfo(
    val type: String,
    val name: String,
    val description: String,
    val isRequired: Boolean
)

/**
 * Document status enum matching backend
 */
enum class DocumentStatus {
    VERIFIED,
    PENDING,
    EXPIRED,
    NOT_UPLOADED
}

/**
 * Required documents for vendor approval - aligned with backend ZIP requirements
 * Must match iOS and Web document types
 */
val REQUIRED_DOCUMENTS = listOf(
    DocumentInfo("food_license", "Food Service License", "Food service license or certificate", true),
    DocumentInfo("health_permit", "Health Department Permit", "Health department permit", true),
    DocumentInfo("w9_form", "Business License / W-9", "Business license or W-9 tax form", true),
    DocumentInfo("liability_insurance", "Liability Insurance", "General liability insurance", true)
)

val OPTIONAL_DOCUMENTS = listOf(
    DocumentInfo("alcohol_license", "Alcohol License", "License to serve alcohol", false),
    DocumentInfo("other", "Other Documents", "Additional certifications", false)
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RestaurantDocumentsScreen(
    onBackClick: () -> Unit,
    onUploadDocument: (String) -> Unit = {},  // Legacy callback, now handled internally
    viewModel: RestaurantDocumentsViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val documents by viewModel.documents.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val uploadingDocType by viewModel.uploadingDocType.collectAsState()
    val error by viewModel.error.collectAsState()
    val uploadSuccess by viewModel.uploadSuccess.collectAsState()

    // Get vendor credentials from AppConfig
    val vendorId = AppConfig.currentVendorId
    val token = AppConfig.vendorToken

    // State for file picker
    var selectedDocType by remember { mutableStateOf<String?>(null) }

    // File picker launcher
    val imagePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            selectedDocType?.let { docType ->
                if (vendorId != null && token != null) {
                    viewModel.uploadDocument(context, vendorId, token, docType, it)
                }
            }
        }
        selectedDocType = null
    }

    // Fetch documents on first composition
    LaunchedEffect(vendorId, token) {
        if (vendorId != null && token != null) {
            viewModel.fetchDocuments(vendorId, token)
        }
    }

    // Show snackbar on upload success
    LaunchedEffect(uploadSuccess) {
        if (uploadSuccess) {
            // Could show a snackbar here
            viewModel.clearUploadSuccess()
        }
    }

    // Calculate completion stats
    val verifiedCount = REQUIRED_DOCUMENTS.count { docInfo ->
        viewModel.getDocumentStatus(docInfo.type) == DocumentStatus.VERIFIED
    }
    val requiredCount = REQUIRED_DOCUMENTS.size
    val completionPercent = if (requiredCount > 0) (verifiedCount * 100) / requiredCount else 0

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Documents", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFFFF5722),
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xFFF5F5F5)),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Compliance Status Card
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(
                                        text = "Compliance Status",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 18.sp
                                    )
                                    Text(
                                        text = "$verifiedCount of $requiredCount required documents verified",
                                        fontSize = 13.sp,
                                        color = Color.Gray
                                    )
                                }
                                Box(
                                    modifier = Modifier
                                        .size(60.dp)
                                        .clip(CircleShape)
                                        .background(
                                            if (completionPercent == 100) Color(0xFF4CAF50).copy(alpha = 0.1f)
                                            else Color(0xFFFFA726).copy(alpha = 0.1f)
                                        ),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = "$completionPercent%",
                                        fontWeight = FontWeight.Bold,
                                        color = if (completionPercent == 100) Color(0xFF4CAF50) else Color(0xFFFFA726)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            LinearProgressIndicator(
                                progress = { completionPercent / 100f },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(8.dp)
                                    .clip(RoundedCornerShape(4.dp)),
                                color = if (completionPercent == 100) Color(0xFF4CAF50) else Color(0xFFFFA726),
                                trackColor = Color(0xFFE0E0E0)
                            )

                            // Show warning if documents need attention
                            val needsAttention = REQUIRED_DOCUMENTS.any { docInfo ->
                                val status = viewModel.getDocumentStatus(docInfo.type)
                                status == DocumentStatus.EXPIRED || status == DocumentStatus.NOT_UPLOADED
                            }
                            if (needsAttention) {
                                Spacer(modifier = Modifier.height(12.dp))
                                Surface(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(8.dp),
                                    color = Color(0xFFFFF3E0)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(12.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Icon(
                                            Icons.Default.Warning,
                                            contentDescription = null,
                                            tint = Color(0xFFFF9800)
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(
                                            text = "Action required: Some documents need attention",
                                            fontSize = 13.sp,
                                            color = Color(0xFFE65100)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // Error message
                error?.let { errorMsg ->
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(8.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFFFEBEE))
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.Error,
                                    contentDescription = null,
                                    tint = Color(0xFFF44336)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = errorMsg,
                                    fontSize = 13.sp,
                                    color = Color(0xFFC62828),
                                    modifier = Modifier.weight(1f)
                                )
                                IconButton(onClick = { viewModel.clearError() }) {
                                    Icon(Icons.Default.Close, contentDescription = "Dismiss")
                                }
                            }
                        }
                    }
                }

                // Required Documents Header
                item {
                    Text(
                        text = "Required Documents",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                }

                // Required Documents List
                items(REQUIRED_DOCUMENTS) { docInfo ->
                    val status = viewModel.getDocumentStatus(docInfo.type)
                    val existingDoc = viewModel.getDocumentByType(docInfo.type)
                    val isUploading = uploadingDocType == docInfo.type

                    DocumentCard(
                        documentInfo = docInfo,
                        status = status,
                        existingDoc = existingDoc,
                        isUploading = isUploading,
                        onUpload = {
                            selectedDocType = docInfo.type
                            imagePickerLauncher.launch("image/*")
                        }
                    )
                }

                // Optional Documents Header
                item {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Optional Documents",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                }

                // Optional Documents List
                items(OPTIONAL_DOCUMENTS) { docInfo ->
                    val status = viewModel.getDocumentStatus(docInfo.type)
                    val existingDoc = viewModel.getDocumentByType(docInfo.type)
                    val isUploading = uploadingDocType == docInfo.type

                    DocumentCard(
                        documentInfo = docInfo,
                        status = status,
                        existingDoc = existingDoc,
                        isUploading = isUploading,
                        onUpload = {
                            selectedDocType = docInfo.type
                            imagePickerLauncher.launch("image/*")
                        }
                    )
                }

                // Add spacing at bottom
                item {
                    Spacer(modifier = Modifier.height(24.dp))
                }
            }

            // Loading overlay
            if (isLoading) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.3f)),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = Color(0xFFFF5722))
                }
            }
        }
    }
}

@Composable
fun DocumentCard(
    documentInfo: DocumentInfo,
    status: DocumentStatus,
    existingDoc: VendorDocument?,
    isUploading: Boolean,
    onUpload: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Document Icon
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(
                        when (status) {
                            DocumentStatus.VERIFIED -> Color(0xFF4CAF50)
                            DocumentStatus.PENDING -> Color(0xFF2196F3)
                            DocumentStatus.EXPIRED -> Color(0xFFF44336)
                            DocumentStatus.NOT_UPLOADED -> Color.Gray
                        }.copy(alpha = 0.1f)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    when (status) {
                        DocumentStatus.VERIFIED -> Icons.Default.CheckCircle
                        DocumentStatus.PENDING -> Icons.Default.Schedule
                        DocumentStatus.EXPIRED -> Icons.Default.Error
                        DocumentStatus.NOT_UPLOADED -> Icons.Default.Description
                    },
                    contentDescription = null,
                    tint = when (status) {
                        DocumentStatus.VERIFIED -> Color(0xFF4CAF50)
                        DocumentStatus.PENDING -> Color(0xFF2196F3)
                        DocumentStatus.EXPIRED -> Color(0xFFF44336)
                        DocumentStatus.NOT_UPLOADED -> Color.Gray
                    }
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = documentInfo.name,
                        fontWeight = FontWeight.Medium
                    )
                    if (documentInfo.isRequired) {
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "*",
                            color = Color(0xFFF44336),
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                Text(
                    text = documentInfo.description,
                    fontSize = 12.sp,
                    color = Color.Gray
                )

                when (status) {
                    DocumentStatus.VERIFIED -> {
                        Text(
                            text = "Verified ✓",
                            fontSize = 12.sp,
                            color = Color(0xFF4CAF50)
                        )
                    }
                    DocumentStatus.PENDING -> {
                        Text(
                            text = "Under review",
                            fontSize = 12.sp,
                            color = Color(0xFF2196F3)
                        )
                    }
                    DocumentStatus.EXPIRED -> {
                        Text(
                            text = "Needs re-upload",
                            fontSize = 12.sp,
                            color = Color(0xFFF44336)
                        )
                    }
                    DocumentStatus.NOT_UPLOADED -> {
                        Text(
                            text = "Not uploaded",
                            fontSize = 12.sp,
                            color = Color.Gray
                        )
                    }
                }

                existingDoc?.uploadDate?.let { date ->
                    Text(
                        text = "Uploaded: $date",
                        fontSize = 11.sp,
                        color = Color.LightGray
                    )
                }
            }

            // Action button
            when {
                isUploading -> {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = Color(0xFFFF5722),
                        strokeWidth = 2.dp
                    )
                }
                status == DocumentStatus.VERIFIED -> {
                    IconButton(onClick = { /* View document */ }) {
                        Icon(
                            Icons.Default.Visibility,
                            contentDescription = "View",
                            tint = Color.Gray
                        )
                    }
                }
                status == DocumentStatus.PENDING -> {
                    IconButton(onClick = { /* View document */ }) {
                        Icon(
                            Icons.Default.Visibility,
                            contentDescription = "View",
                            tint = Color.Gray
                        )
                    }
                }
                else -> {
                    Button(
                        onClick = onUpload,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFFFF5722)
                        ),
                        contentPadding = PaddingValues(horizontal = 12.dp)
                    ) {
                        Icon(
                            Icons.Default.Upload,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Upload", fontSize = 12.sp)
                    }
                }
            }
        }
    }
}
