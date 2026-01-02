package com.eatfair.app.ui.delivery

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.text.SimpleDateFormat
import java.util.*

data class DeliveryTimeSlot(
    val id: String,
    val startTime: String,
    val endTime: String,
    val isAvailable: Boolean = true,
    val isBusy: Boolean = false
)

data class DeliveryDay(
    val date: Date,
    val dayName: String,
    val dayNumber: Int,
    val isToday: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScheduleDeliveryScreen(
    onBackClick: () -> Unit,
    onScheduleConfirm: (Date, DeliveryTimeSlot) -> Unit
) {
    var selectedDay by remember { mutableStateOf<DeliveryDay?>(null) }
    var selectedTimeSlot by remember { mutableStateOf<DeliveryTimeSlot?>(null) }

    val calendar = Calendar.getInstance()
    val dateFormat = SimpleDateFormat("EEE", Locale.getDefault())

    // Generate next 7 days
    val availableDays = remember {
        (0 until 7).map { dayOffset ->
            val cal = Calendar.getInstance()
            cal.add(Calendar.DAY_OF_MONTH, dayOffset)
            DeliveryDay(
                date = cal.time,
                dayName = if (dayOffset == 0) "Today" else if (dayOffset == 1) "Tomorrow" else dateFormat.format(cal.time),
                dayNumber = cal.get(Calendar.DAY_OF_MONTH),
                isToday = dayOffset == 0
            )
        }
    }

    // Time slots
    val timeSlots = remember {
        listOf(
            DeliveryTimeSlot("1", "8:00 AM", "9:00 AM", isAvailable = false),
            DeliveryTimeSlot("2", "9:00 AM", "10:00 AM"),
            DeliveryTimeSlot("3", "10:00 AM", "11:00 AM"),
            DeliveryTimeSlot("4", "11:00 AM", "12:00 PM", isBusy = true),
            DeliveryTimeSlot("5", "12:00 PM", "1:00 PM", isBusy = true),
            DeliveryTimeSlot("6", "1:00 PM", "2:00 PM"),
            DeliveryTimeSlot("7", "2:00 PM", "3:00 PM"),
            DeliveryTimeSlot("8", "3:00 PM", "4:00 PM"),
            DeliveryTimeSlot("9", "4:00 PM", "5:00 PM"),
            DeliveryTimeSlot("10", "5:00 PM", "6:00 PM", isBusy = true),
            DeliveryTimeSlot("11", "6:00 PM", "7:00 PM", isBusy = true),
            DeliveryTimeSlot("12", "7:00 PM", "8:00 PM"),
            DeliveryTimeSlot("13", "8:00 PM", "9:00 PM"),
            DeliveryTimeSlot("14", "9:00 PM", "10:00 PM")
        )
    }

    // Initialize with today
    LaunchedEffect(Unit) {
        selectedDay = availableDays.firstOrNull() ?: return@LaunchedEffect
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Schedule Delivery", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF6C63FF),
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        },
        bottomBar = {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shadowElevation = 8.dp
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color.White)
                        .padding(16.dp)
                ) {
                    if (selectedDay != null && selectedTimeSlot != null) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "Selected Time",
                                    fontSize = 12.sp,
                                    color = Color.Gray
                                )
                                Text(
                                    text = "${selectedDay?.dayName}, ${selectedTimeSlot?.startTime} - ${selectedTimeSlot?.endTime}",
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                            TextButton(onClick = { selectedTimeSlot = null }) {
                                Text("Change", color = Color(0xFF6C63FF))
                            }
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                    }

                    Button(
                        onClick = {
                            selectedDay?.let { day ->
                                selectedTimeSlot?.let { slot ->
                                    onScheduleConfirm(day.date, slot)
                                }
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        enabled = selectedDay != null && selectedTimeSlot != null,
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF6C63FF)
                        )
                    ) {
                        Icon(Icons.Default.Schedule, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Schedule Delivery", fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Color(0xFFF5F5F5))
        ) {
            // ASAP Option
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                        .clickable { onBackClick() },
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color(0xFF4CAF50).copy(alpha = 0.1f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.FlashOn,
                                contentDescription = null,
                                tint = Color(0xFF4CAF50),
                                modifier = Modifier.size(28.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(16.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Deliver Now",
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 16.sp
                            )
                            Text(
                                text = "Estimated: 25-35 min",
                                fontSize = 13.sp,
                                color = Color.Gray
                            )
                        }
                        Icon(
                            Icons.Default.ChevronRight,
                            contentDescription = null,
                            tint = Color.Gray
                        )
                    }
                }
            }

            // Day Selection
            item {
                Text(
                    text = "Select a Day",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 16.sp,
                    modifier = Modifier.padding(horizontal = 16.dp)
                )
                Spacer(modifier = Modifier.height(12.dp))

                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(availableDays) { day ->
                        DayCard(
                            day = day,
                            isSelected = selectedDay == day,
                            onClick = { selectedDay = day }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))
            }

            // Time Slot Selection
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Select a Time",
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 16.sp
                    )

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(RoundedCornerShape(4.dp))
                                .background(Color(0xFFFFA726))
                        )
                        Text(
                            text = " Busy",
                            fontSize = 12.sp,
                            color = Color.Gray
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))
            }

            // Time slots grid
            items(timeSlots.chunked(2)) { rowSlots ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    rowSlots.forEach { slot ->
                        TimeSlotCard(
                            slot = slot,
                            isSelected = selectedTimeSlot == slot,
                            onClick = {
                                if (slot.isAvailable) {
                                    selectedTimeSlot = slot
                                }
                            },
                            modifier = Modifier.weight(1f)
                        )
                    }
                    // Add empty space if odd number
                    if (rowSlots.size == 1) {
                        Spacer(modifier = Modifier.weight(1f))
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(100.dp))
            }
        }
    }
}

@Composable
fun DayCard(
    day: DeliveryDay,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .width(72.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) Color(0xFF6C63FF) else Color.White
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = if (isSelected) 4.dp else 1.dp
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = day.dayName,
                fontSize = 12.sp,
                color = if (isSelected) Color.White.copy(alpha = 0.8f) else Color.Gray
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "${day.dayNumber}",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = if (isSelected) Color.White else Color.Black
            )
        }
    }
}

@Composable
fun TimeSlotCard(
    slot: DeliveryTimeSlot,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val backgroundColor = when {
        !slot.isAvailable -> Color(0xFFF5F5F5)
        isSelected -> Color(0xFF6C63FF)
        else -> Color.White
    }

    val textColor = when {
        !slot.isAvailable -> Color.Gray
        isSelected -> Color.White
        else -> Color.Black
    }

    Card(
        modifier = modifier
            .clickable(enabled = slot.isAvailable, onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = backgroundColor),
        elevation = CardDefaults.cardElevation(
            defaultElevation = if (isSelected) 4.dp else 1.dp
        )
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp)
        ) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "${slot.startTime} - ${slot.endTime}",
                    fontSize = 13.sp,
                    fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                    color = textColor
                )

                if (!slot.isAvailable) {
                    Text(
                        text = "Unavailable",
                        fontSize = 11.sp,
                        color = Color.Gray
                    )
                }
            }

            // Busy indicator
            if (slot.isBusy && slot.isAvailable) {
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .size(8.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .background(Color(0xFFFFA726))
                )
            }
        }
    }
}
