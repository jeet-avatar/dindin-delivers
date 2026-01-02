package com.eatfair.partner.ui.settings

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.PaddingValues
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
 * Business Hours Data Model
 */
data class DayHours(
    val day: String,
    val isOpen: Boolean = true,
    val openTime: String = "10:00 AM",
    val closeTime: String = "10:00 PM"
)

data class BusinessHoursState(
    val hours: List<DayHours> = listOf(
        DayHours("Monday"),
        DayHours("Tuesday"),
        DayHours("Wednesday"),
        DayHours("Thursday"),
        DayHours("Friday"),
        DayHours("Saturday"),
        DayHours("Sunday", isOpen = false)
    ),
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val saveSuccess: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class BusinessHoursViewModel @Inject constructor(
    private val dollorRepository: DollorRepository,
    private val secureStorage: SecureStorage
) : ViewModel() {

    companion object {
        private const val TAG = "BusinessHoursViewModel"
    }

    private val _uiState = MutableStateFlow(BusinessHoursState())
    val uiState: StateFlow<BusinessHoursState> = _uiState.asStateFlow()

    init {
        loadHours()
    }

    private fun loadHours() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            try {
                val result = dollorRepository.getVendorProfile()
                result.onSuccess { profile ->
                    val hours = parseOperatingHours(profile.operatingHours)
                    _uiState.update { it.copy(hours = hours, isLoading = false) }
                }.onFailure { e ->
                    Log.e(TAG, "Error loading hours from API: ${e.message}")
                    // Use default hours on failure
                    _uiState.update { it.copy(isLoading = false) }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error loading hours: ${e.message}")
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = "Failed to load business hours"
                    )
                }
            }
        }
    }

    /**
     * Parse operating hours JSON string into list of DayHours
     * Expected format: "Mon:10:00 AM-10:00 PM;Tue:10:00 AM-10:00 PM;..."
     */
    private fun parseOperatingHours(hoursString: String?): List<DayHours> {
        if (hoursString.isNullOrBlank()) {
            return _uiState.value.hours // Return default
        }

        val dayNames = listOf("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
        val shortDays = listOf("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
        val result = mutableListOf<DayHours>()

        for (i in dayNames.indices) {
            val shortDay = shortDays[i]
            val pattern = "$shortDay:([^;]+)".toRegex()
            val match = pattern.find(hoursString)

            if (match != null) {
                val hoursValue = match.groupValues[1].trim()
                if (hoursValue.equals("Closed", ignoreCase = true)) {
                    result.add(DayHours(dayNames[i], isOpen = false))
                } else {
                    val parts = hoursValue.split("-")
                    if (parts.size == 2) {
                        result.add(DayHours(
                            day = dayNames[i],
                            isOpen = true,
                            openTime = parts[0].trim(),
                            closeTime = parts[1].trim()
                        ))
                    } else {
                        result.add(DayHours(dayNames[i]))
                    }
                }
            } else {
                result.add(DayHours(dayNames[i]))
            }
        }

        return result
    }

    fun toggleDayOpen(dayIndex: Int) {
        _uiState.update { state ->
            val updatedHours = state.hours.mapIndexed { index, day ->
                if (index == dayIndex) day.copy(isOpen = !day.isOpen) else day
            }
            state.copy(hours = updatedHours)
        }
    }

    fun updateOpenTime(dayIndex: Int, time: String) {
        _uiState.update { state ->
            val updatedHours = state.hours.mapIndexed { index, day ->
                if (index == dayIndex) day.copy(openTime = time) else day
            }
            state.copy(hours = updatedHours)
        }
    }

    fun updateCloseTime(dayIndex: Int, time: String) {
        _uiState.update { state ->
            val updatedHours = state.hours.mapIndexed { index, day ->
                if (index == dayIndex) day.copy(closeTime = time) else day
            }
            state.copy(hours = updatedHours)
        }
    }

    fun saveHours() {
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, error = null) }

            try {
                val hoursString = formatOperatingHours(_uiState.value.hours)
                val result = dollorRepository.updateVendorBusinessHours(hoursString)

                result.onSuccess {
                    Log.d(TAG, "Business hours saved successfully")
                    _uiState.update {
                        it.copy(
                            isSaving = false,
                            saveSuccess = true
                        )
                    }
                }.onFailure { e ->
                    Log.e(TAG, "Error saving hours to API: ${e.message}")
                    _uiState.update {
                        it.copy(
                            isSaving = false,
                            error = "Failed to save hours: ${e.message}"
                        )
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error saving hours: ${e.message}")
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        error = "Failed to save hours: ${e.message}"
                    )
                }
            }
        }
    }

    /**
     * Format list of DayHours into API string format
     * Output format: "Mon:10:00 AM-10:00 PM;Tue:10:00 AM-10:00 PM;..."
     */
    private fun formatOperatingHours(hours: List<DayHours>): String {
        val shortDays = listOf("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
        return hours.mapIndexed { index, day ->
            val shortDay = shortDays.getOrNull(index) ?: return@mapIndexed ""
            if (day.isOpen) {
                "$shortDay:${day.openTime}-${day.closeTime}"
            } else {
                "$shortDay:Closed"
            }
        }.filter { it.isNotBlank() }.joinToString(";")
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
fun BusinessHoursScreen(
    onBackClick: () -> Unit,
    viewModel: BusinessHoursViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    val timeOptions = listOf(
        "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
        "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM",
        "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM", "11:00 PM",
        "12:00 AM"
    )

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
                        "Business Hours",
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
                        onClick = { viewModel.saveHours() },
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
                // Info card
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    color = BrandOrange.copy(alpha = 0.1f)
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
                        Text(
                            "Set your restaurant's operating hours. Customers will only be able to place orders during these times.",
                            fontSize = 14.sp,
                            color = TextPrimary
                        )
                    }
                }

                // Hours list
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    color = BackgroundSecondary
                ) {
                    Column {
                        uiState.hours.forEachIndexed { index, dayHours ->
                            DayHoursRow(
                                dayHours = dayHours,
                                timeOptions = timeOptions,
                                onToggleOpen = { viewModel.toggleDayOpen(index) },
                                onOpenTimeChange = { viewModel.updateOpenTime(index, it) },
                                onCloseTimeChange = { viewModel.updateCloseTime(index, it) },
                                showDivider = index < uiState.hours.size - 1
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
private fun DayHoursRow(
    dayHours: DayHours,
    timeOptions: List<String>,
    onToggleOpen: () -> Unit,
    onOpenTimeChange: (String) -> Unit,
    onCloseTimeChange: (String) -> Unit,
    showDivider: Boolean
) {
    var showOpenTimeMenu by remember { mutableStateOf(false) }
    var showCloseTimeMenu by remember { mutableStateOf(false) }

    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Day name - fixed width to prevent squeezing
            Column(modifier = Modifier.width(100.dp)) {
                Text(
                    dayHours.day,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Medium,
                    color = TextPrimary,
                    maxLines = 1
                )
                Text(
                    if (dayHours.isOpen) "Open" else "Closed",
                    fontSize = 12.sp,
                    color = if (dayHours.isOpen) BrandGreen else BrandRed
                )
            }

            // Time selectors - take remaining space
            if (dayHours.isOpen) {
                Row(
                    modifier = Modifier.weight(1f),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    // Open time
                    Box {
                        TextButton(
                            onClick = { showOpenTimeMenu = true },
                            contentPadding = PaddingValues(horizontal = 4.dp, vertical = 4.dp)
                        ) {
                            Text(dayHours.openTime, fontSize = 14.sp, color = TextSecondary)
                            Icon(
                                Icons.Default.KeyboardArrowDown,
                                contentDescription = null,
                                tint = TextSecondary,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                        DropdownMenu(
                            expanded = showOpenTimeMenu,
                            onDismissRequest = { showOpenTimeMenu = false }
                        ) {
                            timeOptions.forEach { time ->
                                DropdownMenuItem(
                                    text = { Text(time) },
                                    onClick = {
                                        onOpenTimeChange(time)
                                        showOpenTimeMenu = false
                                    }
                                )
                            }
                        }
                    }

                    Text("-", color = TextSecondary, fontSize = 14.sp)

                    // Close time
                    Box {
                        TextButton(
                            onClick = { showCloseTimeMenu = true },
                            contentPadding = PaddingValues(horizontal = 4.dp, vertical = 4.dp)
                        ) {
                            Text(dayHours.closeTime, fontSize = 14.sp, color = TextSecondary)
                            Icon(
                                Icons.Default.KeyboardArrowDown,
                                contentDescription = null,
                                tint = TextSecondary,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                        DropdownMenu(
                            expanded = showCloseTimeMenu,
                            onDismissRequest = { showCloseTimeMenu = false }
                        ) {
                            timeOptions.forEach { time ->
                                DropdownMenuItem(
                                    text = { Text(time) },
                                    onClick = {
                                        onCloseTimeChange(time)
                                        showCloseTimeMenu = false
                                    }
                                )
                            }
                        }
                    }
                }
            } else {
                // Empty space when closed
                Spacer(modifier = Modifier.weight(1f))
            }

            // Toggle switch
            Switch(
                checked = dayHours.isOpen,
                onCheckedChange = { onToggleOpen() },
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
                modifier = Modifier.padding(start = 16.dp)
            )
        }
    }
}
