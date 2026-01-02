package com.eatfair.app.ui.home.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.eatfair.app.ui.theme.*
import com.eatfair.shared.model.restaurant.Restaurant

/**
 * Featured Restaurants Section - Matches iOS featuredRestaurantsSection
 *
 * Features:
 * - "Featured Near You" header with "See All" link
 * - Horizontal scrolling restaurant cards
 * - 180x110 card size
 * - TOP PICK badge for high-rated restaurants (4.5+)
 */
@Composable
fun FeaturedRestaurantsSection(
    restaurants: List<Restaurant>,
    onRestaurantClick: (Restaurant) -> Unit,
    onSeeAllClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    if (restaurants.isEmpty()) return

    Column(modifier = modifier.fillMaxWidth()) {
        // Header with "See All" link
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Featured Near You",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = BrandBlack
            )
            TextButton(onClick = onSeeAllClick) {
                Text(
                    text = "See All",
                    fontSize = 14.sp,
                    color = BrandGreen,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Horizontal scrolling restaurant cards
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(horizontal = 16.dp)
        ) {
            items(restaurants.take(10)) { restaurant ->
                FeaturedRestaurantCard(
                    restaurant = restaurant,
                    onClick = { onRestaurantClick(restaurant) }
                )
            }
        }
    }
}

/**
 * Featured Restaurant Card - Matches iOS FeaturedRestaurantCard
 *
 * Size: 180x110
 * Features:
 * - Restaurant image (or placeholder)
 * - TOP PICK badge if rating >= 4.5
 * - Name, rating, delivery time
 * - "$1 delivery" in green text
 */
@Composable
fun FeaturedRestaurantCard(
    restaurant: Restaurant,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val rating = restaurant.rating.toDouble()
    val isTopPick = rating >= 4.5

    Card(
        modifier = modifier
            .width(180.dp)
            .height(150.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column {
            // Image section
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(90.dp)
            ) {
                if (restaurant.imageUrl.isNotEmpty()) {
                    AsyncImage(
                        model = restaurant.imageUrl,
                        contentDescription = restaurant.name,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .fillMaxSize()
                            .clip(RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp))
                    )
                } else {
                    // Placeholder
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(BrandGrey)
                            .clip(RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Restaurant,
                            contentDescription = null,
                            tint = TextGrey,
                            modifier = Modifier.size(32.dp)
                        )
                    }
                }

                // TOP PICK badge
                if (isTopPick) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(8.dp)
                            .background(
                                color = StarYellow,
                                shape = RoundedCornerShape(4.dp)
                            )
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = "TOP PICK",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = BrandBlack
                        )
                    }
                }
            }

            // Info section
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 10.dp, vertical = 8.dp)
            ) {
                Text(
                    text = restaurant.name,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = BrandBlack,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                Spacer(modifier = Modifier.height(4.dp))

                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Star,
                        contentDescription = null,
                        tint = StarYellow,
                        modifier = Modifier.size(12.dp)
                    )
                    Spacer(modifier = Modifier.width(2.dp))
                    Text(
                        text = String.format("%.1f", rating),
                        fontSize = 11.sp,
                        color = BrandBlack
                    )
                    Text(
                        text = " • ${restaurant.deliveryTime.ifEmpty { "20-30 min" }}",
                        fontSize = 11.sp,
                        color = TextGrey
                    )
                }

                Spacer(modifier = Modifier.height(2.dp))

                Text(
                    text = "\$1 delivery",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                    color = BrandGreen
                )
            }
        }
    }
}

// Preview removed - no mock data
