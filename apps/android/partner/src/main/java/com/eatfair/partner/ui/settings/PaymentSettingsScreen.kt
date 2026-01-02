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
import com.eatfair.shared.config.AppConfig
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
private val BrandRed = Color(0xFFF44336)
private val SeparatorColor = Color(0xFFC6C6C8)

/**
 * Payment Settings State
 */
data class PaymentSettingsState(
    val accountHolderName: String = "",
    val routingNumber: String = "",
    val accountNumber: String = "",
    val accountType: String = "Checking",
    val bankName: String = "",
    val hasBankLinked: Boolean = false,
    val pendingBalance: Double = 0.0,
    val availableBalance: Double = 0.0,
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val saveSuccess: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class PaymentSettingsViewModel @Inject constructor(
    private val dollorRepository: DollorRepository,
    private val secureStorage: SecureStorage
) : ViewModel() {

    companion object {
        private const val TAG = "PaymentSettingsVM"
    }

    private val _uiState = MutableStateFlow(PaymentSettingsState())
    val uiState: StateFlow<PaymentSettingsState> = _uiState.asStateFlow()

    init {
        loadPaymentSettings()
    }

    private fun loadPaymentSettings() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            try {
                val result = dollorRepository.getVendorPayouts()
                result.onSuccess { payouts ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            pendingBalance = payouts.pendingBalance,
                            availableBalance = payouts.availableBalance,
                            hasBankLinked = payouts.bankAccount != null,
                            accountHolderName = payouts.bankAccount?.accountHolderName ?: "",
                            bankName = payouts.bankAccount?.let { bank ->
                                "Bank ending in ${bank.accountNumberLast4}"
                            } ?: "",
                            accountType = payouts.bankAccount?.accountType?.replaceFirstChar { c ->
                                c.uppercase()
                            } ?: "Checking"
                        )
                    }
                }.onFailure { e ->
                    Log.e(TAG, "Error loading payment settings from API: ${e.message}")
                    // Use placeholder data on failure
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            pendingBalance = 0.0,
                            availableBalance = 0.0
                        )
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error loading payment settings: ${e.message}")
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = "Failed to load payment settings"
                    )
                }
            }
        }
    }

    fun updateAccountHolderName(value: String) {
        _uiState.update { it.copy(accountHolderName = value) }
    }

    fun updateRoutingNumber(value: String) {
        if (value.length <= 9 && value.all { it.isDigit() }) {
            _uiState.update { it.copy(routingNumber = value) }
        }
    }

    fun updateAccountNumber(value: String) {
        if (value.length <= 17 && value.all { it.isDigit() }) {
            _uiState.update { it.copy(accountNumber = value) }
        }
    }

    fun updateAccountType(value: String) {
        _uiState.update { it.copy(accountType = value) }
    }

    fun linkBankAccount() {
        viewModelScope.launch {
            val state = _uiState.value

            // Validation
            if (state.accountHolderName.isBlank()) {
                _uiState.update { it.copy(error = "Account holder name is required") }
                return@launch
            }
            if (state.routingNumber.length != 9) {
                _uiState.update { it.copy(error = "Routing number must be 9 digits") }
                return@launch
            }
            if (state.accountNumber.length < 8) {
                _uiState.update { it.copy(error = "Account number must be at least 8 digits") }
                return@launch
            }

            _uiState.update { it.copy(isSaving = true, error = null) }

            try {
                val request = com.eatfair.shared.model.VendorBankAccountRequest(
                    accountHolderName = state.accountHolderName,
                    routingNumber = state.routingNumber,
                    accountNumber = state.accountNumber,
                    accountType = state.accountType.lowercase()
                )

                val result = dollorRepository.updateVendorBankAccount(request)
                result.onSuccess { payouts ->
                    Log.d(TAG, "Bank account linked successfully")
                    _uiState.update {
                        it.copy(
                            isSaving = false,
                            hasBankLinked = true,
                            bankName = payouts.bankAccount?.let { bank ->
                                "Bank ending in ${bank.accountNumberLast4}"
                            } ?: "Bank ending in ${state.accountNumber.takeLast(4)}",
                            availableBalance = payouts.availableBalance,
                            pendingBalance = payouts.pendingBalance,
                            saveSuccess = true
                        )
                    }
                }.onFailure { e ->
                    Log.e(TAG, "Error linking bank account to API: ${e.message}")
                    _uiState.update {
                        it.copy(
                            isSaving = false,
                            error = "Failed to link bank account: ${e.message}"
                        )
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error linking bank account: ${e.message}")
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        error = "Failed to link bank account: ${e.message}"
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
fun PaymentSettingsScreen(
    onBackClick: () -> Unit,
    viewModel: PaymentSettingsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "Payment & Payouts",
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
                // Balance Card
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    color = BrandOrange
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp)
                    ) {
                        Text(
                            "Available Balance",
                            fontSize = 14.sp,
                            color = Color.White.copy(alpha = 0.8f)
                        )
                        Text(
                            "$${String.format("%.2f", uiState.availableBalance)}",
                            fontSize = 36.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.Schedule,
                                contentDescription = null,
                                tint = Color.White.copy(alpha = 0.8f),
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                "Pending: $${String.format("%.2f", uiState.pendingBalance)}",
                                fontSize = 14.sp,
                                color = Color.White.copy(alpha = 0.8f)
                            )
                        }
                    }
                }

                // Platform Fee Info
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    color = BackgroundSecondary
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Info,
                            contentDescription = null,
                            tint = BrandOrange,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                "Platform Fee",
                                fontSize = 17.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = TextPrimary
                            )
                            Text(
                                "\$${String.format("%.2f", AppConfig.FoodDelivery.RESTAURANT_FEE)} per order - the lowest in the industry!",
                                fontSize = 14.sp,
                                color = TextSecondary
                            )
                        }
                    }
                }

                // Bank Account Section
                if (uiState.hasBankLinked) {
                    // Linked bank account
                    SectionWithHeader(title = "PAYOUT METHOD") {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.AccountBalance,
                                contentDescription = null,
                                tint = BrandGreen,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    uiState.bankName,
                                    fontSize = 17.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = TextPrimary
                                )
                                Text(
                                    "${uiState.accountType} Account",
                                    fontSize = 14.sp,
                                    color = TextSecondary
                                )
                            }
                            Icon(
                                Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = BrandGreen,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    }
                } else {
                    // Add bank account form
                    SectionWithHeader(title = "LINK BANK ACCOUNT") {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            OutlinedTextField(
                                value = uiState.accountHolderName,
                                onValueChange = { viewModel.updateAccountHolderName(it) },
                                label = { Text("Account Holder Name") },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                leadingIcon = {
                                    Icon(Icons.Default.Person, contentDescription = null)
                                },
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = BrandOrange,
                                    focusedLabelColor = BrandOrange
                                )
                            )

                            OutlinedTextField(
                                value = uiState.routingNumber,
                                onValueChange = { viewModel.updateRoutingNumber(it) },
                                label = { Text("Routing Number") },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                leadingIcon = {
                                    Icon(Icons.Default.Numbers, contentDescription = null)
                                },
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = BrandOrange,
                                    focusedLabelColor = BrandOrange
                                )
                            )

                            OutlinedTextField(
                                value = uiState.accountNumber,
                                onValueChange = { viewModel.updateAccountNumber(it) },
                                label = { Text("Account Number") },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                leadingIcon = {
                                    Icon(Icons.Default.CreditCard, contentDescription = null)
                                },
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = BrandOrange,
                                    focusedLabelColor = BrandOrange
                                )
                            )

                            // Account type selector
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                listOf("Checking", "Savings").forEach { type ->
                                    FilterChip(
                                        selected = uiState.accountType == type,
                                        onClick = { viewModel.updateAccountType(type) },
                                        label = { Text(type) },
                                        leadingIcon = if (uiState.accountType == type) {
                                            {
                                                Icon(
                                                    Icons.Default.Check,
                                                    contentDescription = null,
                                                    modifier = Modifier.size(16.dp)
                                                )
                                            }
                                        } else null,
                                        colors = FilterChipDefaults.filterChipColors(
                                            selectedContainerColor = BrandOrange.copy(alpha = 0.2f),
                                            selectedLabelColor = BrandOrange
                                        )
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            Button(
                                onClick = { viewModel.linkBankAccount() },
                                modifier = Modifier.fillMaxWidth(),
                                enabled = !uiState.isSaving,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = BrandOrange
                                ),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                if (uiState.isSaving) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(20.dp),
                                        strokeWidth = 2.dp,
                                        color = Color.White
                                    )
                                } else {
                                    Icon(Icons.Default.Add, contentDescription = null)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Link Bank Account", fontSize = 17.sp)
                                }
                            }
                        }
                    }
                }

                // Security info
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    color = BrandGreen.copy(alpha = 0.1f)
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Lock,
                            contentDescription = null,
                            tint = BrandGreen,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            "Your payment information is encrypted and secure. We use bank-level security to protect your data.",
                            fontSize = 14.sp,
                            color = TextPrimary
                        )
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

    // Success dialog
    if (uiState.saveSuccess) {
        AlertDialog(
            onDismissRequest = { viewModel.clearSaveSuccess() },
            title = { Text("Success", fontWeight = FontWeight.SemiBold) },
            text = { Text("Bank account linked successfully!") },
            confirmButton = {
                TextButton(onClick = { viewModel.clearSaveSuccess() }) {
                    Text("OK", color = BrandGreen)
                }
            }
        )
    }
}

@Composable
private fun SectionWithHeader(
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
