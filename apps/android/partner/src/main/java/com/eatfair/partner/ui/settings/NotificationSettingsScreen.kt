package com.eatfair.partner.ui.settings

import android.util.Log
import androidx.compose.foundation.background
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.eatfair.shared.data.local.SecureStorage
import com.eatfair.shared.data.repository.DollorRepository
import com.eatfair.shared.model.NotificationPreferences
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
private val BrandBlue = Color(0xFF2196F3)
private val SeparatorColor = Color(0xFFC6C6C8)

/**
 * Notification Settings State
 */
data class NotificationSettingsState(
    val newOrdersEnabled: Boolean = true,
    val orderUpdatesEnabled: Boolean = true,
    val driverAssignedEnabled: Boolean = true,
    val lowStockAlertsEnabled: Boolean = true,
    val reviewsEnabled: Boolean = true,
    val promotionsEnabled: Boolean = false,
    val weeklyReportEnabled: Boolean = true,
    val soundEnabled: Boolean = true,
    val vibrationEnabled: Boolean = true,
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class NotificationSettingsViewModel @Inject constructor(
    private val dollorRepository: DollorRepository,
    private val secureStorage: SecureStorage
) : ViewModel() {

    companion object {
        private const val TAG = "NotificationSettingsVM"
    }

    private val _uiState = MutableStateFlow(NotificationSettingsState())
    val uiState: StateFlow<NotificationSettingsState> = _uiState.asStateFlow()

    init {
        loadNotificationSettings()
    }

    private fun loadNotificationSettings() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            try {
                val result = dollorRepository.getVendorProfile()
                result.onSuccess { profile ->
                    val prefs = profile.notificationPreferences
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            newOrdersEnabled = prefs?.newOrders ?: true,
                            orderUpdatesEnabled = prefs?.orderUpdates ?: true,
                            driverAssignedEnabled = prefs?.driverAssigned ?: true,
                            lowStockAlertsEnabled = prefs?.lowStockAlerts ?: true,
                            reviewsEnabled = prefs?.reviews ?: true,
                            promotionsEnabled = prefs?.promotions ?: false,
                            weeklyReportEnabled = prefs?.weeklyReport ?: true,
                            soundEnabled = prefs?.soundEnabled ?: true,
                            vibrationEnabled = prefs?.vibrationEnabled ?: true
                        )
                    }
                }.onFailure { e ->
                    Log.e(TAG, "Error loading notification settings from API: ${e.message}")
                    _uiState.update { it.copy(isLoading = false) }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error loading notification settings: ${e.message}")
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = "Failed to load notification settings"
                    )
                }
            }
        }
    }

    fun updateNewOrders(value: Boolean) {
        _uiState.update { it.copy(newOrdersEnabled = value) }
        saveSettings()
    }

    fun updateOrderUpdates(value: Boolean) {
        _uiState.update { it.copy(orderUpdatesEnabled = value) }
        saveSettings()
    }

    fun updateDriverAssigned(value: Boolean) {
        _uiState.update { it.copy(driverAssignedEnabled = value) }
        saveSettings()
    }

    fun updateLowStockAlerts(value: Boolean) {
        _uiState.update { it.copy(lowStockAlertsEnabled = value) }
        saveSettings()
    }

    fun updateReviews(value: Boolean) {
        _uiState.update { it.copy(reviewsEnabled = value) }
        saveSettings()
    }

    fun updatePromotions(value: Boolean) {
        _uiState.update { it.copy(promotionsEnabled = value) }
        saveSettings()
    }

    fun updateWeeklyReport(value: Boolean) {
        _uiState.update { it.copy(weeklyReportEnabled = value) }
        saveSettings()
    }

    fun updateSound(value: Boolean) {
        _uiState.update { it.copy(soundEnabled = value) }
        saveSettings()
    }

    fun updateVibration(value: Boolean) {
        _uiState.update { it.copy(vibrationEnabled = value) }
        saveSettings()
    }

    private fun saveSettings() {
        viewModelScope.launch {
            val state = _uiState.value
            val prefs = NotificationPreferences(
                newOrders = state.newOrdersEnabled,
                orderUpdates = state.orderUpdatesEnabled,
                driverAssigned = state.driverAssignedEnabled,
                lowStockAlerts = state.lowStockAlertsEnabled,
                reviews = state.reviewsEnabled,
                weeklyReport = state.weeklyReportEnabled,
                promotions = state.promotionsEnabled,
                soundEnabled = state.soundEnabled,
                vibrationEnabled = state.vibrationEnabled
            )

            try {
                dollorRepository.updateVendorNotificationSettings(prefs)
                    .onFailure { e ->
                        Log.e(TAG, "Error saving notification settings: ${e.message}")
                    }
            } catch (e: Exception) {
                Log.e(TAG, "Error saving notification settings: ${e.message}")
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationSettingsScreen(
    onBackClick: () -> Unit,
    viewModel: NotificationSettingsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "Notifications",
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
                // Order Notifications
                NotificationSection(title = "ORDER NOTIFICATIONS") {
                    NotificationToggle(
                        icon = Icons.Default.Notifications,
                        iconColor = BrandOrange,
                        title = "New Orders",
                        subtitle = "Get notified when you receive a new order",
                        checked = uiState.newOrdersEnabled,
                        onCheckedChange = { viewModel.updateNewOrders(it) }
                    )
                    NotificationToggle(
                        icon = Icons.Default.Update,
                        iconColor = BrandBlue,
                        title = "Order Updates",
                        subtitle = "Status changes, cancellations, modifications",
                        checked = uiState.orderUpdatesEnabled,
                        onCheckedChange = { viewModel.updateOrderUpdates(it) }
                    )
                    NotificationToggle(
                        icon = Icons.Default.DeliveryDining,
                        iconColor = BrandGreen,
                        title = "Driver Assigned",
                        subtitle = "When a driver accepts your order",
                        checked = uiState.driverAssignedEnabled,
                        onCheckedChange = { viewModel.updateDriverAssigned(it) },
                        showDivider = false
                    )
                }

                // Business Alerts
                NotificationSection(title = "BUSINESS ALERTS") {
                    NotificationToggle(
                        icon = Icons.Default.Inventory,
                        iconColor = Color(0xFFFF9800),
                        title = "Low Stock Alerts",
                        subtitle = "When menu items are running low",
                        checked = uiState.lowStockAlertsEnabled,
                        onCheckedChange = { viewModel.updateLowStockAlerts(it) }
                    )
                    NotificationToggle(
                        icon = Icons.Default.Star,
                        iconColor = Color(0xFFFFD700),
                        title = "Reviews & Ratings",
                        subtitle = "New customer reviews and ratings",
                        checked = uiState.reviewsEnabled,
                        onCheckedChange = { viewModel.updateReviews(it) }
                    )
                    NotificationToggle(
                        icon = Icons.Default.BarChart,
                        iconColor = BrandBlue,
                        title = "Weekly Report",
                        subtitle = "Weekly performance summary",
                        checked = uiState.weeklyReportEnabled,
                        onCheckedChange = { viewModel.updateWeeklyReport(it) },
                        showDivider = false
                    )
                }

                // Marketing
                NotificationSection(title = "MARKETING") {
                    NotificationToggle(
                        icon = Icons.Default.Campaign,
                        iconColor = BrandOrange,
                        title = "Promotions & Tips",
                        subtitle = "Tips to grow your business",
                        checked = uiState.promotionsEnabled,
                        onCheckedChange = { viewModel.updatePromotions(it) },
                        showDivider = false
                    )
                }

                // Sound & Vibration
                NotificationSection(title = "SOUND & VIBRATION") {
                    NotificationToggle(
                        icon = Icons.Default.VolumeUp,
                        iconColor = TextSecondary,
                        title = "Sound",
                        subtitle = "Play sound for new orders",
                        checked = uiState.soundEnabled,
                        onCheckedChange = { viewModel.updateSound(it) }
                    )
                    NotificationToggle(
                        icon = Icons.Default.Vibration,
                        iconColor = TextSecondary,
                        title = "Vibration",
                        subtitle = "Vibrate for notifications",
                        checked = uiState.vibrationEnabled,
                        onCheckedChange = { viewModel.updateVibration(it) },
                        showDivider = false
                    )
                }

                // Info card
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
                        Text(
                            "Make sure notifications are enabled in your device settings to receive order alerts.",
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
}

@Composable
private fun NotificationSection(
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
private fun NotificationToggle(
    icon: ImageVector,
    iconColor: Color,
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    showDivider: Boolean = true
) {
    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = iconColor,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    title,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Medium,
                    color = TextPrimary
                )
                Text(
                    subtitle,
                    fontSize = 13.sp,
                    color = TextSecondary
                )
            }
            Spacer(modifier = Modifier.width(8.dp))
            Switch(
                checked = checked,
                onCheckedChange = onCheckedChange,
                colors = SwitchDefaults.colors(
                    checkedThumbColor = Color.White,
                    checkedTrackColor = BrandGreen,
                    uncheckedThumbColor = Color.White,
                    uncheckedTrackColor = Color(0xFFE9E9EB)
                )
            )
        }
        if (showDivider) {
            HorizontalDivider(
                color = SeparatorColor.copy(alpha = 0.3f),
                modifier = Modifier.padding(start = 52.dp)
            )
        }
    }
}
