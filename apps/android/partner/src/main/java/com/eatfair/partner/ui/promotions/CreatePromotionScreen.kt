package com.eatfair.partner.ui.promotions

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreatePromotionScreen(
    onBackClick: () -> Unit,
    onSave: () -> Unit
) {
    var promoCode by remember { mutableStateOf("") }
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var discountType by remember { mutableStateOf(DiscountType.PERCENTAGE) }
    var discountValue by remember { mutableStateOf("") }
    var minOrderValue by remember { mutableStateOf("") }
    var maxDiscount by remember { mutableStateOf("") }
    var usageLimit by remember { mutableStateOf("") }
    var hasEndDate by remember { mutableStateOf(false) }
    var isFormValid by remember { mutableStateOf(false) }

    // Validate form
    LaunchedEffect(promoCode, title, discountValue, discountType) {
        isFormValid = promoCode.isNotBlank() &&
                     title.isNotBlank() &&
                     (discountType == DiscountType.FREE_DELIVERY ||
                      (discountValue.toDoubleOrNull()?.let { it > 0 } == true))
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Create Promotion", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.Default.Close, contentDescription = "Close")
                    }
                },
                actions = {
                    TextButton(
                        onClick = onSave,
                        enabled = isFormValid
                    ) {
                        Text(
                            "Save",
                            color = if (isFormValid) Color.White else Color.White.copy(alpha = 0.5f)
                        )
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
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Color(0xFFF5F5F5)),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Basic Info
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Basic Information",
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        OutlinedTextField(
                            value = promoCode,
                            onValueChange = { promoCode = it.uppercase() },
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("Promo Code *") },
                            placeholder = { Text("e.g., SUMMER20") },
                            leadingIcon = {
                                Icon(Icons.Default.LocalOffer, contentDescription = null)
                            },
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp)
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedTextField(
                            value = title,
                            onValueChange = { title = it },
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("Title *") },
                            placeholder = { Text("e.g., Summer Special") },
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp)
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedTextField(
                            value = description,
                            onValueChange = { description = it },
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("Description") },
                            placeholder = { Text("Describe your promotion") },
                            minLines = 2,
                            maxLines = 3,
                            shape = RoundedCornerShape(12.dp)
                        )
                    }
                }
            }

            // Discount Type
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Discount Type",
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            DiscountType.entries.forEach { type ->
                                FilterChip(
                                    selected = discountType == type,
                                    onClick = { discountType = type },
                                    label = {
                                        Text(
                                            when (type) {
                                                DiscountType.PERCENTAGE -> "Percentage"
                                                DiscountType.FLAT_AMOUNT -> "Flat Amount"
                                                DiscountType.FREE_DELIVERY -> "Free Delivery"
                                            },
                                            fontSize = 12.sp
                                        )
                                    },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = Color(0xFFFF5722),
                                        selectedLabelColor = Color.White
                                    )
                                )
                            }
                        }

                        if (discountType != DiscountType.FREE_DELIVERY) {
                            Spacer(modifier = Modifier.height(16.dp))

                            OutlinedTextField(
                                value = discountValue,
                                onValueChange = { newValue ->
                                    // Only allow valid decimal input
                                    if (newValue.isEmpty() || newValue.matches(Regex("^\\d*\\.?\\d*$"))) {
                                        discountValue = newValue
                                    }
                                },
                                modifier = Modifier.fillMaxWidth(),
                                label = {
                                    Text(
                                        if (discountType == DiscountType.PERCENTAGE)
                                            "Discount Percentage *"
                                        else
                                            "Discount Amount *"
                                    )
                                },
                                placeholder = {
                                    Text(
                                        if (discountType == DiscountType.PERCENTAGE) "e.g., 20" else "e.g., 5.00"
                                    )
                                },
                                leadingIcon = {
                                    Text(
                                        if (discountType == DiscountType.PERCENTAGE) "%" else "$",
                                        fontWeight = FontWeight.Bold
                                    )
                                },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp),
                                isError = discountValue.isNotBlank() && discountValue.toDoubleOrNull() == null
                            )
                        }
                    }
                }
            }

            // Restrictions
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Restrictions",
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        OutlinedTextField(
                            value = minOrderValue,
                            onValueChange = { newValue ->
                                // Only allow valid decimal input
                                if (newValue.isEmpty() || newValue.matches(Regex("^\\d*\\.?\\d*$"))) {
                                    minOrderValue = newValue
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("Minimum Order Value") },
                            placeholder = { Text("e.g., 25.00") },
                            leadingIcon = { Text("$", fontWeight = FontWeight.Bold) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            isError = minOrderValue.isNotBlank() && minOrderValue.toDoubleOrNull() == null
                        )

                        if (discountType == DiscountType.PERCENTAGE) {
                            Spacer(modifier = Modifier.height(12.dp))

                            OutlinedTextField(
                                value = maxDiscount,
                                onValueChange = { newValue ->
                                    // Only allow valid decimal input
                                    if (newValue.isEmpty() || newValue.matches(Regex("^\\d*\\.?\\d*$"))) {
                                        maxDiscount = newValue
                                    }
                                },
                                modifier = Modifier.fillMaxWidth(),
                                label = { Text("Maximum Discount") },
                                placeholder = { Text("e.g., 15.00") },
                                leadingIcon = { Text("$", fontWeight = FontWeight.Bold) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp),
                                isError = maxDiscount.isNotBlank() && maxDiscount.toDoubleOrNull() == null
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedTextField(
                            value = usageLimit,
                            onValueChange = { newValue ->
                                // Only allow valid integer input
                                if (newValue.isEmpty() || newValue.matches(Regex("^\\d+$"))) {
                                    usageLimit = newValue
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("Usage Limit") },
                            placeholder = { Text("Leave empty for unlimited") },
                            leadingIcon = {
                                Icon(Icons.Default.People, contentDescription = null)
                            },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            isError = usageLimit.isNotBlank() && usageLimit.toIntOrNull() == null
                        )
                    }
                }
            }

            // Duration
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Duration",
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Set end date")
                            Switch(
                                checked = hasEndDate,
                                onCheckedChange = { hasEndDate = it },
                                colors = SwitchDefaults.colors(
                                    checkedThumbColor = Color.White,
                                    checkedTrackColor = Color(0xFFFF5722)
                                )
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedButton(
                            onClick = { /* Date picker */ },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Default.CalendarToday, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Select Start Date")
                        }

                        if (hasEndDate) {
                            Spacer(modifier = Modifier.height(8.dp))

                            OutlinedButton(
                                onClick = { /* Date picker */ },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Icon(Icons.Default.Event, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Select End Date")
                            }
                        }
                    }
                }
            }

            // Preview
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = Color(0xFFFF5722).copy(alpha = 0.1f)
                    )
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.Visibility,
                                contentDescription = null,
                                tint = Color(0xFFFF5722)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Preview",
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFFFF5722)
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        Text(
                            text = promoCode.ifEmpty { "PROMO_CODE" },
                            fontWeight = FontWeight.Bold,
                            fontSize = 20.sp
                        )
                        Text(
                            text = title.ifEmpty { "Promotion Title" },
                            fontSize = 14.sp,
                            color = Color.Gray
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            text = buildString {
                                when (discountType) {
                                    DiscountType.PERCENTAGE -> append("${discountValue.ifEmpty { "0" }}% off")
                                    DiscountType.FLAT_AMOUNT -> append("$${discountValue.ifEmpty { "0" }} off")
                                    DiscountType.FREE_DELIVERY -> append("Free delivery")
                                }
                                if (minOrderValue.isNotEmpty()) {
                                    append(" on orders $${minOrderValue}+")
                                }
                            },
                            color = Color(0xFFFF5722),
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }

            // Save Button
            item {
                Button(
                    onClick = onSave,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    enabled = isFormValid,
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFFFF5722)
                    )
                ) {
                    Icon(Icons.Default.Check, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Create Promotion", fontWeight = FontWeight.Bold)
                }

                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }
}
