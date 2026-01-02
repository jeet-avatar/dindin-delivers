package com.eatfair.partner.ui.settings

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
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
import javax.inject.Inject

// iOS Colors
private val BackgroundGrouped = Color(0xFFF2F2F7)
private val BackgroundSecondary = Color.White
private val TextPrimary = Color(0xFF000000)
private val TextSecondary = Color(0xFF8E8E93)
private val BrandOrange = Color(0xFFF2994A)
private val BrandGreen = Color(0xFF06C167)

/**
 * Edit Profile ViewModel
 */
data class EditProfileState(
    val businessName: String = "",
    val email: String = "",
    val phone: String = "",
    val address: String = "",
    val city: String = "",
    val state: String = "",
    val zipCode: String = "",
    val cuisine: String = "",
    val description: String = "",
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val saveSuccess: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class EditProfileViewModel @Inject constructor(
    private val dollorRepository: DollorRepository,
    private val secureStorage: SecureStorage
) : ViewModel() {

    companion object {
        private const val TAG = "EditProfileViewModel"
    }

    private val _uiState = MutableStateFlow(EditProfileState())
    val uiState: StateFlow<EditProfileState> = _uiState.asStateFlow()

    init {
        loadProfile()
    }

    private fun loadProfile() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            try {
                val result = dollorRepository.getVendorProfile()
                result.onSuccess { profile ->
                    _uiState.update {
                        it.copy(
                            businessName = profile.restaurantName ?: secureStorage.vendorName ?: "",
                            email = profile.contactEmail ?: secureStorage.vendorEmail ?: "",
                            phone = profile.contactPhone ?: "",
                            address = profile.street ?: "",
                            city = profile.city ?: "",
                            state = profile.state ?: "",
                            zipCode = profile.zipCode ?: "",
                            cuisine = profile.cuisineType ?: "Restaurant",
                            description = "",
                            isLoading = false
                        )
                    }
                }.onFailure { e ->
                    Log.e(TAG, "Error loading profile from API: ${e.message}")
                    // Fall back to secure storage
                    _uiState.update {
                        it.copy(
                            businessName = secureStorage.vendorName ?: "",
                            email = secureStorage.vendorEmail ?: "",
                            isLoading = false
                        )
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error loading profile: ${e.message}")
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = "Failed to load profile"
                    )
                }
            }
        }
    }

    fun updateBusinessName(value: String) {
        _uiState.update { it.copy(businessName = value) }
    }

    fun updateEmail(value: String) {
        _uiState.update { it.copy(email = value) }
    }

    fun updatePhone(value: String) {
        _uiState.update { it.copy(phone = value) }
    }

    fun updateAddress(value: String) {
        _uiState.update { it.copy(address = value) }
    }

    fun updateCity(value: String) {
        _uiState.update { it.copy(city = value) }
    }

    fun updateState(value: String) {
        _uiState.update { it.copy(state = value) }
    }

    fun updateZipCode(value: String) {
        _uiState.update { it.copy(zipCode = value) }
    }

    fun updateCuisine(value: String) {
        _uiState.update { it.copy(cuisine = value) }
    }

    fun updateDescription(value: String) {
        _uiState.update { it.copy(description = value) }
    }

    fun saveProfile() {
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, error = null) }

            try {
                val state = _uiState.value
                val request = com.eatfair.shared.model.UpdateVendorProfileRequest(
                    restaurantName = state.businessName.takeIf { it.isNotBlank() },
                    cuisineType = state.cuisine.takeIf { it.isNotBlank() },
                    contactEmail = state.email.takeIf { it.isNotBlank() },
                    contactPhone = state.phone.takeIf { it.isNotBlank() },
                    streetAddress = state.address.takeIf { it.isNotBlank() },
                    city = state.city.takeIf { it.isNotBlank() },
                    state = state.state.takeIf { it.isNotBlank() },
                    zipCode = state.zipCode.takeIf { it.isNotBlank() }
                )

                val result = dollorRepository.updateVendorProfile(request)
                result.onSuccess { profile ->
                    // Update secure storage with new name
                    secureStorage.vendorName = profile.restaurantName ?: state.businessName

                    Log.d(TAG, "Profile saved successfully")
                    _uiState.update {
                        it.copy(
                            isSaving = false,
                            saveSuccess = true
                        )
                    }
                }.onFailure { e ->
                    Log.e(TAG, "Error saving profile to API: ${e.message}")
                    _uiState.update {
                        it.copy(
                            isSaving = false,
                            error = "Failed to save profile: ${e.message}"
                        )
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error saving profile: ${e.message}")
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        error = "Failed to save profile: ${e.message}"
                    )
                }
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    fun clearSaveSuccess() {
        _uiState.update { it.copy(saveSuccess = false) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditProfileScreen(
    onBackClick: () -> Unit,
    viewModel: EditProfileViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    // Handle save success
    LaunchedEffect(uiState.saveSuccess) {
        if (uiState.saveSuccess) {
            viewModel.clearSaveSuccess()
            onBackClick()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "Edit Profile",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    TextButton(
                        onClick = { viewModel.saveProfile() },
                        enabled = !uiState.isSaving
                    ) {
                        if (uiState.isSaving) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                strokeWidth = 2.dp,
                                color = BrandOrange
                            )
                        } else {
                            Text("Save", color = BrandOrange, fontWeight = FontWeight.SemiBold)
                        }
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
                // Business Information Section
                SectionCard(title = "BUSINESS INFORMATION") {
                    ProfileTextField(
                        label = "Business Name",
                        value = uiState.businessName,
                        onValueChange = { viewModel.updateBusinessName(it) },
                        leadingIcon = Icons.Default.Store
                    )
                    ProfileTextField(
                        label = "Email",
                        value = uiState.email,
                        onValueChange = { viewModel.updateEmail(it) },
                        leadingIcon = Icons.Default.Email,
                        keyboardType = KeyboardType.Email
                    )
                    ProfileTextField(
                        label = "Phone",
                        value = uiState.phone,
                        onValueChange = { viewModel.updatePhone(it) },
                        leadingIcon = Icons.Default.Phone,
                        keyboardType = KeyboardType.Phone
                    )
                    ProfileTextField(
                        label = "Cuisine Type",
                        value = uiState.cuisine,
                        onValueChange = { viewModel.updateCuisine(it) },
                        leadingIcon = Icons.Default.Restaurant
                    )
                }

                // Address Section
                SectionCard(title = "ADDRESS") {
                    ProfileTextField(
                        label = "Street Address",
                        value = uiState.address,
                        onValueChange = { viewModel.updateAddress(it) },
                        leadingIcon = Icons.Default.LocationOn
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        ProfileTextField(
                            label = "City",
                            value = uiState.city,
                            onValueChange = { viewModel.updateCity(it) },
                            modifier = Modifier.weight(1f)
                        )
                        ProfileTextField(
                            label = "State",
                            value = uiState.state,
                            onValueChange = { viewModel.updateState(it) },
                            modifier = Modifier.weight(0.5f)
                        )
                    }
                    ProfileTextField(
                        label = "ZIP Code",
                        value = uiState.zipCode,
                        onValueChange = { viewModel.updateZipCode(it) },
                        keyboardType = KeyboardType.Number
                    )
                }

                // Description Section
                SectionCard(title = "ABOUT") {
                    OutlinedTextField(
                        value = uiState.description,
                        onValueChange = { viewModel.updateDescription(it) },
                        label = { Text("Description") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 3,
                        maxLines = 5,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = BrandOrange,
                            focusedLabelColor = BrandOrange
                        )
                    )
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
private fun SectionCard(
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
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                content = content
            )
        }
    }
}

@Composable
private fun ProfileTextField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    leadingIcon: androidx.compose.ui.graphics.vector.ImageVector? = null,
    keyboardType: KeyboardType = KeyboardType.Text
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        modifier = modifier.fillMaxWidth(),
        singleLine = true,
        leadingIcon = leadingIcon?.let {
            { Icon(it, contentDescription = null, tint = TextSecondary) }
        },
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = BrandOrange,
            focusedLabelColor = BrandOrange
        )
    )
}
