package com.eatfair.partner.ui.reviews

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

data class Review(
    val id: String,
    val customerName: String,
    val rating: Int,
    val comment: String,
    val date: String,
    val orderId: String,
    val response: String?,
    val itemsOrdered: List<String>
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReviewsScreen(
    onBackClick: () -> Unit
) {
    var selectedFilter by remember { mutableStateOf("All") }
    val filters = listOf("All", "5 Star", "4 Star", "3 Star", "1-2 Star", "No Reply")

    // Sample reviews
    val reviews = remember {
        listOf(
            Review(
                id = "1",
                customerName = "John D.",
                rating = 5,
                comment = "Amazing pizza! Best I've had in the city. The crust was perfectly crispy and the toppings were fresh. Will definitely order again!",
                date = "2 hours ago",
                orderId = "ORD-123",
                response = "Thank you so much for your kind words! We're thrilled you enjoyed our pizza. See you again soon!",
                itemsOrdered = listOf("Margherita Pizza", "Tiramisu")
            ),
            Review(
                id = "2",
                customerName = "Emily R.",
                rating = 4,
                comment = "Great food, delivery was a bit slow but the quality made up for it.",
                date = "1 day ago",
                orderId = "ORD-122",
                response = null,
                itemsOrdered = listOf("Spaghetti Carbonara", "Caesar Salad")
            ),
            Review(
                id = "3",
                customerName = "Mike T.",
                rating = 5,
                comment = "Perfect! Fast delivery and delicious food. The tiramisu was heavenly!",
                date = "2 days ago",
                orderId = "ORD-121",
                response = "We're so happy you loved it! Our tiramisu is made fresh daily. Thanks for ordering!",
                itemsOrdered = listOf("Chicken Parmesan", "Tiramisu")
            ),
            Review(
                id = "4",
                customerName = "Sarah L.",
                rating = 3,
                comment = "Food was okay, but portion sizes could be bigger for the price.",
                date = "3 days ago",
                orderId = "ORD-120",
                response = null,
                itemsOrdered = listOf("Bruschetta", "Pepperoni Pizza")
            )
        )
    }

    val filteredReviews = when (selectedFilter) {
        "5 Star" -> reviews.filter { it.rating == 5 }
        "4 Star" -> reviews.filter { it.rating == 4 }
        "3 Star" -> reviews.filter { it.rating == 3 }
        "1-2 Star" -> reviews.filter { it.rating <= 2 }
        "No Reply" -> reviews.filter { it.response == null }
        else -> reviews
    }

    val avgRating = reviews.map { it.rating }.average()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Reviews", fontWeight = FontWeight.Bold) },
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
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Color(0xFFF5F5F5))
        ) {
            // Rating Summary
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = String.format("%.1f", avgRating),
                                fontSize = 48.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFFFF5722)
                            )
                            Row {
                                repeat(5) { index ->
                                    Icon(
                                        Icons.Default.Star,
                                        contentDescription = null,
                                        tint = if (index < (if (avgRating.isNaN()) 0 else avgRating.toInt())) Color(0xFFFFC107) else Color.LightGray,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                            }
                            Text(
                                text = "${reviews.size} reviews",
                                fontSize = 14.sp,
                                color = Color.Gray
                            )
                        }

                        Spacer(modifier = Modifier.width(24.dp))

                        Column(modifier = Modifier.weight(1f)) {
                            (5 downTo 1).forEach { star ->
                                val count = reviews.count { it.rating == star }
                                val percentage = if (reviews.isNotEmpty()) count * 100 / reviews.size else 0
                                RatingBar(star = star, percentage = percentage, count = count)
                            }
                        }
                    }
                }
            }

            // Filters
            item {
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(filters) { filter ->
                        FilterChip(
                            selected = selectedFilter == filter,
                            onClick = { selectedFilter = filter },
                            label = { Text(filter, fontSize = 12.sp) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Color(0xFFFF5722),
                                selectedLabelColor = Color.White
                            )
                        )
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            // Reviews List
            items(filteredReviews) { review ->
                ReviewCard(review = review)
            }

            item {
                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}

@Composable
fun RatingBar(star: Int, percentage: Int, count: Int) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "$star",
            fontSize = 12.sp,
            color = Color.Gray
        )
        Icon(
            Icons.Default.Star,
            contentDescription = null,
            tint = Color(0xFFFFC107),
            modifier = Modifier.size(14.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        LinearProgressIndicator(
            progress = { percentage / 100f },
            modifier = Modifier
                .weight(1f)
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp)),
            color = Color(0xFFFF5722),
            trackColor = Color(0xFFE0E0E0)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = "$count",
            fontSize = 12.sp,
            color = Color.Gray
        )
    }
}

@Composable
fun ReviewCard(review: Review) {
    var showReplyField by remember { mutableStateOf(false) }
    var replyText by remember { mutableStateOf("") }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFFF5722).copy(alpha = 0.1f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = review.customerName.firstOrNull()?.toString() ?: "C",
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFFF5722)
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = review.customerName,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = review.date,
                            fontSize = 12.sp,
                            color = Color.Gray
                        )
                    }
                }

                // Rating
                Row {
                    repeat(review.rating) {
                        Icon(
                            Icons.Default.Star,
                            contentDescription = null,
                            tint = Color(0xFFFFC107),
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Comment
            Text(
                text = review.comment,
                fontSize = 14.sp,
                lineHeight = 20.sp
            )

            // Items Ordered
            Spacer(modifier = Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.ShoppingBag,
                    contentDescription = null,
                    tint = Color.Gray,
                    modifier = Modifier.size(14.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = review.itemsOrdered.joinToString(", "),
                    fontSize = 12.sp,
                    color = Color.Gray
                )
            }

            // Response
            if (review.response != null) {
                Spacer(modifier = Modifier.height(12.dp))
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = Color(0xFFF5F5F5)
                    )
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.Reply,
                                contentDescription = null,
                                tint = Color(0xFFFF5722),
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Your Response",
                                fontWeight = FontWeight.Medium,
                                fontSize = 12.sp,
                                color = Color(0xFFFF5722)
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = review.response,
                            fontSize = 13.sp
                        )
                    }
                }
            } else {
                Spacer(modifier = Modifier.height(12.dp))

                if (showReplyField) {
                    OutlinedTextField(
                        value = replyText,
                        onValueChange = { replyText = it },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("Write a response...") },
                        minLines = 2,
                        maxLines = 4,
                        shape = RoundedCornerShape(8.dp)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.End, modifier = Modifier.fillMaxWidth()) {
                        TextButton(onClick = { showReplyField = false }) {
                            Text("Cancel")
                        }
                        Button(
                            onClick = { /* Submit reply */ },
                            enabled = replyText.isNotBlank(),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFFFF5722)
                            )
                        ) {
                            Text("Reply")
                        }
                    }
                } else {
                    OutlinedButton(
                        onClick = { showReplyField = true },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Reply, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Reply to Review")
                    }
                }
            }
        }
    }
}
