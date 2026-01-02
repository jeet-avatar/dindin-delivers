package com.eatfair.app.ui.search

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * AI Recommendations Dialog
 * Matches iOS AIRecommendationsSheet for platform parity
 * Provides personalized food recommendations based on preferences
 */

data class AIRecommendation(
    val id: String,
    val restaurantName: String,
    val itemName: String,
    val description: String,
    val price: Double,
    val matchScore: Int, // 0-100
    val cuisineType: String,
    val dietaryTags: List<String> = emptyList()
)

data class PreferenceOption(
    val id: String,
    val label: String,
    val emoji: String,
    val isSelected: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AIRecommendationsDialog(
    onDismiss: () -> Unit,
    onSelectRecommendation: (AIRecommendation) -> Unit
) {
    var currentStep by remember { mutableStateOf(0) } // 0 = preferences, 1 = results
    var isLoading by remember { mutableStateOf(false) }
    var recommendations by remember { mutableStateOf<List<AIRecommendation>>(emptyList()) }

    // Preference selections
    var selectedMoods by remember { mutableStateOf(setOf<String>()) }
    var selectedDietary by remember { mutableStateOf(setOf<String>()) }
    var selectedCuisines by remember { mutableStateOf(setOf<String>()) }

    val moodOptions = listOf(
        PreferenceOption("comfort", "Comfort Food", "🍝"),
        PreferenceOption("healthy", "Healthy", "🥗"),
        PreferenceOption("adventurous", "Adventurous", "🌶️"),
        PreferenceOption("quick", "Quick Bite", "⚡"),
        PreferenceOption("indulgent", "Indulgent", "🍰"),
        PreferenceOption("light", "Light Meal", "🥒")
    )

    val dietaryOptions = listOf(
        PreferenceOption("vegetarian", "Vegetarian", "🥬"),
        PreferenceOption("vegan", "Vegan", "🌱"),
        PreferenceOption("gluten_free", "Gluten-Free", "🌾"),
        PreferenceOption("halal", "Halal", "☪️"),
        PreferenceOption("kosher", "Kosher", "✡️"),
        PreferenceOption("none", "No Restrictions", "✓")
    )

    val cuisineOptions = listOf(
        PreferenceOption("italian", "Italian", "🍕"),
        PreferenceOption("indian", "Indian", "🍛"),
        PreferenceOption("chinese", "Chinese", "🥡"),
        PreferenceOption("mexican", "Mexican", "🌮"),
        PreferenceOption("japanese", "Japanese", "🍱"),
        PreferenceOption("american", "American", "🍔"),
        PreferenceOption("thai", "Thai", "🍜"),
        PreferenceOption("mediterranean", "Mediterranean", "🥙")
    )

    fun generateRecommendations() {
        isLoading = true
        // Simulated AI recommendations based on preferences
        recommendations = listOf(
            AIRecommendation(
                id = "1",
                restaurantName = "Bella Italia",
                itemName = "Truffle Mushroom Pasta",
                description = "Creamy pasta with wild mushrooms and truffle oil",
                price = 18.99,
                matchScore = 95,
                cuisineType = "Italian",
                dietaryTags = listOf("Vegetarian")
            ),
            AIRecommendation(
                id = "2",
                restaurantName = "Spice Garden",
                itemName = "Butter Chicken",
                description = "Tender chicken in rich tomato cream sauce",
                price = 16.99,
                matchScore = 92,
                cuisineType = "Indian",
                dietaryTags = listOf("Gluten-Free")
            ),
            AIRecommendation(
                id = "3",
                restaurantName = "Green Bowl",
                itemName = "Mediterranean Quinoa Bowl",
                description = "Fresh veggies, feta, and lemon tahini dressing",
                price = 14.99,
                matchScore = 88,
                cuisineType = "Mediterranean",
                dietaryTags = listOf("Vegetarian", "Gluten-Free")
            ),
            AIRecommendation(
                id = "4",
                restaurantName = "Sakura Sushi",
                itemName = "Rainbow Roll Combo",
                description = "Chef's selection of premium sushi rolls",
                price = 24.99,
                matchScore = 85,
                cuisineType = "Japanese",
                dietaryTags = emptyList()
            )
        )
        isLoading = false
        currentStep = 1
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = Color.White,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.9f)
        ) {
            // Header
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.horizontalGradient(
                            colors = listOf(Color(0xFFFF6B35), Color(0xFFFF8F6B))
                        )
                    )
                    .padding(24.dp)
            ) {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                Icons.Default.AutoAwesome,
                                contentDescription = null,
                                tint = Color.White
                            )
                            Text(
                                text = "AI Food Picks",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }

                        IconButton(onClick = onDismiss) {
                            Icon(
                                Icons.Default.Close,
                                contentDescription = "Close",
                                tint = Color.White
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = if (currentStep == 0)
                            "Tell us what you're in the mood for"
                        else
                            "Here's what we think you'll love",
                        fontSize = 14.sp,
                        color = Color.White.copy(alpha = 0.9f)
                    )
                }
            }

            if (currentStep == 0) {
                // Preferences Selection
                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = 24.dp),
                    verticalArrangement = Arrangement.spacedBy(24.dp)
                ) {
                    item { Spacer(modifier = Modifier.height(8.dp)) }

                    // Mood Section
                    item {
                        PreferenceSection(
                            title = "What's your mood?",
                            options = moodOptions,
                            selectedIds = selectedMoods,
                            onToggle = { id ->
                                selectedMoods = if (selectedMoods.contains(id)) {
                                    selectedMoods - id
                                } else {
                                    selectedMoods + id
                                }
                            }
                        )
                    }

                    // Dietary Section
                    item {
                        PreferenceSection(
                            title = "Dietary preferences",
                            options = dietaryOptions,
                            selectedIds = selectedDietary,
                            onToggle = { id ->
                                selectedDietary = if (selectedDietary.contains(id)) {
                                    selectedDietary - id
                                } else {
                                    selectedDietary + id
                                }
                            }
                        )
                    }

                    // Cuisine Section
                    item {
                        PreferenceSection(
                            title = "Favorite cuisines",
                            options = cuisineOptions,
                            selectedIds = selectedCuisines,
                            onToggle = { id ->
                                selectedCuisines = if (selectedCuisines.contains(id)) {
                                    selectedCuisines - id
                                } else {
                                    selectedCuisines + id
                                }
                            }
                        )
                    }

                    item { Spacer(modifier = Modifier.height(80.dp)) }
                }

                // Generate Button
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color.White)
                        .padding(24.dp)
                ) {
                    Button(
                        onClick = { generateRecommendations() },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFFFF6B35)
                        ),
                        enabled = selectedMoods.isNotEmpty() || selectedCuisines.isNotEmpty()
                    ) {
                        Icon(
                            Icons.Default.AutoAwesome,
                            contentDescription = null,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Get AI Recommendations",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 16.sp
                        )
                    }
                }
            } else {
                // Results
                if (isLoading) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            CircularProgressIndicator(
                                color = Color(0xFFFF6B35)
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = "Finding perfect matches...",
                                color = Color.Gray
                            )
                        }
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .weight(1f)
                            .padding(horizontal = 24.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        item { Spacer(modifier = Modifier.height(8.dp)) }

                        items(recommendations) { recommendation ->
                            RecommendationCard(
                                recommendation = recommendation,
                                onClick = { onSelectRecommendation(recommendation) }
                            )
                        }

                        item { Spacer(modifier = Modifier.height(16.dp)) }
                    }

                    // Back Button
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color.White)
                            .padding(24.dp)
                    ) {
                        OutlinedButton(
                            onClick = { currentStep = 0 },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(52.dp),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(
                                Icons.Default.ArrowBack,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Adjust Preferences",
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun PreferenceSection(
    title: String,
    options: List<PreferenceOption>,
    selectedIds: Set<String>,
    onToggle: (String) -> Unit
) {
    Column {
        Text(
            text = title,
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold,
            color = Color.Black
        )

        Spacer(modifier = Modifier.height(12.dp))

        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(options) { option ->
                val isSelected = selectedIds.contains(option.id)
                FilterChip(
                    selected = isSelected,
                    onClick = { onToggle(option.id) },
                    label = {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(option.emoji)
                            Text(option.label)
                        }
                    },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = Color(0xFFFF6B35).copy(alpha = 0.1f),
                        selectedLabelColor = Color(0xFFFF6B35)
                    )
                )
            }
        }
    }
}

@Composable
fun RecommendationCard(
    recommendation: AIRecommendation,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFF8F8F8))
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = recommendation.itemName,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.Black
                    )
                    Text(
                        text = recommendation.restaurantName,
                        fontSize = 14.sp,
                        color = Color.Gray
                    )
                }

                // Match Score
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(
                            when {
                                recommendation.matchScore >= 90 -> Color(0xFF4CAF50)
                                recommendation.matchScore >= 80 -> Color(0xFFFF9800)
                                else -> Color(0xFF9E9E9E)
                            }
                        )
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = "${recommendation.matchScore}% Match",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = recommendation.description,
                fontSize = 14.sp,
                color = Color.Gray
            )

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    AssistChip(
                        onClick = { },
                        label = { Text(recommendation.cuisineType, fontSize = 12.sp) },
                        colors = AssistChipDefaults.assistChipColors(
                            containerColor = Color(0xFFE3F2FD)
                        )
                    )
                    recommendation.dietaryTags.take(2).forEach { tag ->
                        AssistChip(
                            onClick = { },
                            label = { Text(tag, fontSize = 12.sp) },
                            colors = AssistChipDefaults.assistChipColors(
                                containerColor = Color(0xFFE8F5E9)
                            )
                        )
                    }
                }

                Text(
                    text = "$${String.format("%.2f", recommendation.price)}",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFFFF6B35)
                )
            }
        }
    }
}
