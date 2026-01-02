package com.eatfair.app.ui.cart

import android.util.Log
import android.widget.Toast
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBackIos
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.eatfair.shared.constants.AddressType
import com.eatfair.shared.constants.OrderStatus
import com.eatfair.shared.model.address.AddressDto
import com.eatfair.shared.model.order.DeliveryPartner
import com.eatfair.shared.model.order.OrderTracking
import com.eatfair.shared.model.order.PickUpLocation
import com.eatfair.shared.model.restaurant.CartItem
import com.eatfair.shared.model.restaurant.MenuItem
import com.eatfair.shared.model.restaurant.Restaurant
import com.eatfair.app.ui.common.ConfettiAnimation
import com.eatfair.app.ui.order.OrderDetailRow
import com.eatfair.app.ui.theme.primaryVerticalGradient
import com.stripe.android.PaymentConfiguration
import com.stripe.android.paymentsheet.PaymentSheet
import com.stripe.android.paymentsheet.PaymentSheetResult
import kotlin.random.Random

@Composable
fun CartScreen(
    cartViewModel: CartViewModel,
    onBackClick: () -> Unit,
    onAddMoreItems: () -> Unit = {},
    onPlaceOrderSuccess: (newOrder: OrderTracking) -> Unit = {},
) {
    var showSuccess by remember { mutableStateOf(false) }

    val context = LocalContext.current

    val cartItems = cartViewModel.cartItems.collectAsState().value
    val restaurant = cartViewModel.cartRestaurant.collectAsState().value
    val deliveryAddress = cartViewModel.deliveryAddress.collectAsState().value

    var restaurantNote by remember { mutableStateOf("") }

    val subtotal = cartItems.sumOf { it.menuItem.price.toDouble() * it.quantity }

    val deliveryFee = com.eatfair.app.constants.PricingConfig.getDeliveryFee(subtotal)
    val taxes = subtotal * com.eatfair.app.constants.PricingConfig.DEFAULT_TAX_RATE
    val totalBill = subtotal + deliveryFee + taxes

    // Store payment intent ID for order creation after payment success
    var currentPaymentIntentId by remember { mutableStateOf<String?>(null) }

    fun onPaymentSheetResult(paymentSheetResult: PaymentSheetResult) {
        when (paymentSheetResult) {
            is PaymentSheetResult.Canceled -> {
                Toast.makeText(context, "Payment Canceled", Toast.LENGTH_SHORT).show()
                print("Canceled")
            }

            is PaymentSheetResult.Failed -> {
                Toast.makeText(
                    context,
                    paymentSheetResult.error.localizedMessage,
                    Toast.LENGTH_LONG
                ).show()
                print("Error: ${paymentSheetResult.error}")
            }

            is PaymentSheetResult.Completed -> {
                Toast.makeText(context, "Payment Success", Toast.LENGTH_SHORT).show()
                print("Completed")

                // Use actual delivery address from ViewModel or create placeholder
                val orderDeliveryAddress = deliveryAddress ?: AddressDto(
                    locationName = "Delivery Address",
                    completeAddress = "Please select a delivery address",
                    houseNumber = "",
                    apartmentRoad = "",
                    directions = "",
                    type = AddressType.HOME,
                    latitude = 0.0,
                    longitude = 0.0,
                    phoneNumber = ""
                )

                val newOrder = OrderTracking(
                    orderId = "EF${Random.nextInt(10000, 99999)}",
                    restaurant = restaurant,
                    status = OrderStatus.CONFIRMED,
                    // deliveryPartner uses default - Driver will be assigned by backend
                    estimatedTime = restaurant?.displayDeliveryTime ?: "25-35 mins",
                    pickupLocation = PickUpLocation(
                        address = restaurant?.fullAddress ?: restaurant?.address ?: "Restaurant Address",
                        lat = restaurant?.latitude ?: 0.0,
                        lng = restaurant?.longitude ?: 0.0
                    ),
                    deliveryLocation = orderDeliveryAddress,
                    deliveryInstructions = restaurantNote
                )

                cartViewModel.onOrderPlacedSuccessfully(newOrder, currentPaymentIntentId)
                showSuccess = true
            }
        }
    }

    val paymentSheet = remember { PaymentSheet.Builder(::onPaymentSheetResult) }.build()

    var customerConfig by remember { mutableStateOf<PaymentSheet.CustomerConfiguration?>(null) }
    var paymentIntentClientSecret by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        cartViewModel.paymentSheetEvent.collect { keys ->
            PaymentConfiguration.init(context, keys.publishableKey)

            customerConfig = PaymentSheet.CustomerConfiguration(
                id = keys.customer,
                ephemeralKeySecret = keys.ephemeralKey
            )
            paymentIntentClientSecret = keys.paymentIntent
            currentPaymentIntentId = keys.paymentIntent

            Log.d("CartScreen", "Presenting payment sheet with total: $totalBill")

            // Present the Stripe payment sheet for actual payment processing
            presentPaymentSheet(paymentSheet, customerConfig, paymentIntentClientSecret)
        }
    }

    Box(modifier = Modifier.fillMaxSize())
    {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(primaryVerticalGradient())
        ) {
            // Header
            CartHeader(
                restaurant = restaurant,
                onBackClick = onBackClick,
                onShareClick = {
                    val shareText = "Check out ${restaurant?.name ?: "this restaurant"} on Dollor.ai!"
                    val sendIntent = android.content.Intent().apply {
                        action = android.content.Intent.ACTION_SEND
                        putExtra(android.content.Intent.EXTRA_TEXT, shareText)
                        type = "text/plain"
                    }
                    val shareIntent = android.content.Intent.createChooser(sendIntent, "Share via")
                    context.startActivity(shareIntent)
                }
            )

            LazyColumn(
                contentPadding = PaddingValues(bottom = 120.dp),
                modifier = Modifier.weight(1f)
            )
            {
                // Gold Offer Banner
//                item {
//                    GoldOfferBanner()
//                }

                item {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                        border = BorderStroke(1.dp, Color.Gray.copy(alpha = 0.2f))
                    ) {
                        // Use a Column to stack the items and buttons vertically inside the Card.
                        Column {
                            // --- Cart Items ---
                            // We can no longer use items() here, so we use a simple forEach loop.
                            cartItems.forEach { cartItem ->
                                CartItemCard(
                                    cartItem = cartItem,
                                    onUpdateQuantity = { newQty ->
                                        cartViewModel.updateItemQuantity(
                                            cartItem,
                                            newQty
                                        )
                                    }
                                )
                                // Add a divider between items, but not after the last one.
                                // Fix: Use lastOrNull() to prevent crash on empty list
                                if (cartItems.lastOrNull() != cartItem) {
                                    HorizontalDivider(
                                        modifier = Modifier
                                            .padding(horizontal = 16.dp)
                                            .background(MaterialTheme.colorScheme.background)
                                    )
                                }
                            }

                            // --- Add More Items Button ---
                            TextButton(
                                onClick = onAddMoreItems,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Add,
                                    contentDescription = "Add",
                                    tint = Color(0xFF2E7D32)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "Add more items",
                                    color = Color(0xFF2E7D32),
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }
                }

                // Note Section
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp)
                    ) {
                        TextField(
                            value = restaurantNote,
                            onValueChange = { if (it.length <= 100) restaurantNote = it },
                            modifier = Modifier
                                .fillMaxWidth(),
                            placeholder = {
                                Text(
                                    text = "Add a note for the restaurant",
                                    fontSize = 13.sp,
                                    color = Color.Gray
                                )
                            },
                            leadingIcon = {
                                Icon(
                                    imageVector = Icons.Default.Edit,
                                    contentDescription = "Note",
                                    tint = Color.Gray,
                                    modifier = Modifier
                                        .size(18.dp)
                                        .align(Alignment.TopStart)
                                )
                            },
                            textStyle = TextStyle(fontSize = 13.sp),
                            shape = RoundedCornerShape(8.dp),
                            colors = TextFieldDefaults.colors(
                                focusedContainerColor = Color(0xFFF5F5F5),
                                unfocusedContainerColor = Color(0xFFF5F5F5),
                                disabledContainerColor = Color(0xFFF5F5F5),
                                focusedIndicatorColor = Color.Transparent,
                                unfocusedIndicatorColor = Color.Transparent,
                                disabledIndicatorColor = Color.Transparent
                            ),
                        )
                        Text(
                            text = "${restaurantNote.length}/100",
                            fontSize = 10.sp,
                            color = Color.Gray,
                            modifier = Modifier
                                .align(Alignment.BottomEnd)
                                .padding(end = 12.dp, bottom = 8.dp)
                        )
                    }
                }

                // Complete Your Meal Section
//                item {
//                    Spacer(modifier = Modifier.height(24.dp))
//                    CompleteYourMealSection()
//                }

                // Coupons
                item {
                    Spacer(modifier = Modifier.height(16.dp))
                    CouponsSection(
                        onCouponsClick = {
                            Toast.makeText(context, "Coupons coming soon!", Toast.LENGTH_SHORT).show()
                        }
                    )
                }

                // Special Offers
//                item {
//                    Spacer(modifier = Modifier.height(16.dp))
//                    SpecialOffersSection()
//                }

                // Delivery Options
//                item {
//                    Spacer(modifier = Modifier.height(16.dp))
//                    DeliveryOptionsSection()
//                }

                // Delivery Address
                item {
                    Spacer(modifier = Modifier.height(16.dp))
                    DeliveryAddressSection(
                        deliveryAddress = deliveryAddress?.addressLine1() + "\n" + deliveryAddress?.addressLine2(),
                        onAddressClick = {
                            Toast.makeText(context, "Change address from profile", Toast.LENGTH_SHORT).show()
                        },
                        onAddInstructionsClick = {
                            // TODO: Show dialog to add instructions
                            Toast.makeText(context, "Add delivery instructions in notes below", Toast.LENGTH_SHORT).show()
                        }
                    )
                }

                // Bill Details
                item {
                    Spacer(modifier = Modifier.height(16.dp))
                    BillDetailsSection(
                        subtotal = subtotal,
                        deliveryFee = deliveryFee,
                        taxes = taxes,
                        totalBill = totalBill
                    )
                }

                // Cancellation Policy
                item {
                    Spacer(modifier = Modifier.height(16.dp))
                    CancellationPolicySection()
                }
            }
        }

        PaymentBottomBar(
            totalBill = totalBill,
            onPlaceOrder = {
                val currentConfig = customerConfig
                val currentClientSecret = paymentIntentClientSecret

//                if (currentConfig != null && currentClientSecret != null) {
                cartViewModel.onPlaceOrderClicked(totalBill)
//                }
            },
            modifier = Modifier.align(Alignment.BottomCenter)
        )

        if (showSuccess) {
//            ConfettiAnimation()

            val activeOrder = cartViewModel.activeOrder.collectAsState().value

            if (activeOrder != null) {
                OrderSuccessBottomSheet(
                    orderNumber = activeOrder.orderId,
                    restaurantName = activeOrder.restaurant?.name ?: "-",
                    onTrackOrder = {
                        showSuccess = false

                        cartViewModel.clearCart()
                        onPlaceOrderSuccess(activeOrder)
                    }
                )
            }
        }
    }
}

@Composable
fun CartHeader(
    restaurant: Restaurant?,
    onBackClick: () -> Unit,
    onShareClick: () -> Unit = {}
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .windowInsetsPadding(WindowInsets.statusBars)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(
                onClick = onBackClick,
                modifier = Modifier
//                    .padding(start = 12.dp)
                    .background(
                        color = Color.White,
                        shape = RoundedCornerShape(8.dp)
                    )
                    .size(38.dp)
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBackIos,
                    contentDescription = "Back",
                    tint = Color.Black,
                    modifier = Modifier
                        .size(20.dp)
                        .padding(start = 4.dp)
                )
            }


            Spacer(modifier = Modifier.width(8.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = restaurant?.name ?: "",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = "${restaurant?.deliveryTime} to Home • ${restaurant?.distance}",
                    fontSize = 12.sp,
                    color = Color.Gray
                )
            }

            IconButton(onClick = onShareClick) {
                Icon(
                    imageVector = Icons.Default.Share,
                    contentDescription = "Share",
                    tint = Color.Black
                )
            }
        }

//        Surface(
//            modifier = Modifier.fillMaxWidth(),
//            color = Color(0xFFFFF3E0)
//        ) {
//            Text(
//                text = "Selected address is 448 km away from your location",
//                fontSize = 12.sp,
//                color = Color(0xFFE65100),
//                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
//            )
//        }

//        HorizontalDivider()
    }
}

@Composable
fun GoldOfferBanner() {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        shape = RoundedCornerShape(8.dp),
        color = Color(0xFFFFF9C4)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Star,
                contentDescription = "Gold",
                tint = Color(0xFFFFA000),
                modifier = Modifier.size(24.dp)
            )

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Get Gold for 3 months at $1",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black
                )
                Text(
                    text = "Enjoy FREE delivery above $99 and extra offers with Gold!",
                    fontSize = 12.sp,
                    color = Color(0xFF6D4C41)
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Learn more ▸",
                    fontSize = 12.sp,
                    color = Color(0xFFF57C00),
                    fontWeight = FontWeight.Medium
                )
            }

            Spacer(modifier = Modifier.width(8.dp))

            Button(
                onClick = { },
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color.White
                ),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                shape = RoundedCornerShape(6.dp)
            ) {
                Text(
                    text = "ADD",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF2E7D32)
                )
            }
        }
    }
}

@Composable
fun CartItemCard(
    cartItem: CartItem,
    onUpdateQuantity: (Int) -> Unit,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 4.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(
                modifier = Modifier
                    .weight(1f)
                    .height(IntrinsicSize.Min),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Veg / Non Veg indicator
                    Box(
                        modifier = Modifier
                            .size(12.dp)
                            .background(
                                if (cartItem.menuItem.isVeg) Color(0xFF2E7D32) else Color(0xFFD32F2F),
                                shape = CircleShape
                            )
                            .border(1.dp, Color.Black.copy(alpha = 0.1f), CircleShape)
                    )

                    Spacer(modifier = Modifier.width(4.dp))

                    Text(
                        text = cartItem.menuItem.name
                                + if (cartItem.customizations.isNotEmpty())
                            " (${cartItem.customizations})" else "",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color.Black
                    )
                }

//                if (cartItem.customizations.isNotEmpty()) {
//                    Text(
//                        text = cartItem.customizations,
//                        fontSize = 12.sp,
//                        color = Color.Gray
//                    )
//                }

//                if (cartItem.menuItem.isHighlyOrdered) {
//                    Spacer(modifier = Modifier.height(4.dp))
//                    Text(
//                        text = "Highly reordered",
//                        fontSize = 11.sp,
//                        color = Color(0xFFF57C00)
//                    )
//                }

//                TextButton(
//                    modifier = Modifier.defaultMinSize(minWidth = 1.dp, minHeight = 1.dp)
////                        .height(IntrinsicSize.Min)
//                        .padding(0.dp), // Reduces minimum size
//                    onClick = { /* Edit customization */ },
//                    contentPadding = PaddingValues(0.dp)
//                ) {
                Text(
                    modifier = Modifier.padding(start = 2.dp),
                    text = "Customize ▼",
                    fontSize = 12.sp,
                    color = Color.Gray
                )
//                }
            }

            Column(
                horizontalAlignment = Alignment.End,
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                // Quantity Controls
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = Color.White,
                    border = BorderStroke(1.dp, Color.Gray),
                    shadowElevation = 4.dp
                )
                {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
//                        modifier = Modifier.height(32.dp)
                    ) {
                        IconButton(
                            onClick = {
                                onUpdateQuantity(cartItem.quantity - 1)
                            },
                            modifier = Modifier.size(28.dp)
                        ) {
                            Text(
                                text = "−",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.Red
                            )
                        }

                        Text(
                            text = cartItem.quantity.toString(),
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.Black,
                            modifier = Modifier.padding(horizontal = 4.dp)
                        )

                        IconButton(
                            onClick = { onUpdateQuantity(cartItem.quantity + 1) },
                            modifier = Modifier.size(28.dp)
                        ) {
                            Text(
                                text = "+",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF2E7D32)
                            )
                        }
                    }
                }

            }

            Spacer(modifier = Modifier.width(16.dp))

            Text(
                text = "$${(cartItem.menuItem.price * cartItem.quantity).toInt()}",
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = Color.Black
            )
        }
    }
}

@Composable
fun CompleteYourMealSection() {
    Column(modifier = Modifier.padding(horizontal = 16.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Restaurant,
                contentDescription = "Complete meal",
                tint = Color.Black,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "Complete your meal with",
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = Color.Black
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(3) { index ->
                SuggestionItemCard()
            }
        }
    }
}

@Composable
fun SuggestionItemCard() {
    Card(
        modifier = Modifier.width(140.dp),
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(100.dp)
                    .background(Color(0xFFFFE0B2)),
                contentAlignment = Alignment.Center
            ) {
                Text(text = "🥤", fontSize = 40.sp)
            }

            Column(modifier = Modifier.padding(8.dp)) {
                Text(
                    text = "Bhujia",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color.Black,
                    maxLines = 1
                )
                Text(
                    text = "$69",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black
                )

                Spacer(modifier = Modifier.height(6.dp))

                Button(
                    onClick = { },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(28.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color.White,
                        contentColor = Color(0xFF2E7D32)
                    ),
                    border = BorderStroke(1.dp, Color(0xFF2E7D32)),
                    contentPadding = PaddingValues(0.dp),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text(
                        text = "ADD",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

@Composable
fun CouponsSection(
    onCouponsClick: () -> Unit = {}
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .clickable { onCouponsClick() },
        shape = RoundedCornerShape(8.dp),
        color = Color(0xFFF5F5F5)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.LocalOffer,
                    contentDescription = "Coupons",
                    tint = Color(0xFF2E7D32),
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "View all coupons",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color.Black
                )
            }

            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = "View",
                tint = Color.Gray
            )
        }
    }
}

@Composable
fun SpecialOffersSection() {
    Column(modifier = Modifier.padding(horizontal = 16.dp)) {
        Text(
            text = "Special offer for you",
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold,
            color = Color.Black
        )

        Spacer(modifier = Modifier.height(12.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(8.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Row(
                modifier = Modifier.padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    modifier = Modifier.size(40.dp),
                    shape = RoundedCornerShape(6.dp),
                    color = Color(0xFF1A237E)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            text = "VIP",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Make this a VIP order at $50",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.Black
                    )
                    Text(
                        text = "Available only to select customers",
                        fontSize = 11.sp,
                        color = Color.Gray
                    )
                }

                Button(
                    onClick = { },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFFF5F5F5)
                    ),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text(
                        text = "ADD",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.Black
                    )
                }
            }
        }
    }
}

@Composable
fun DeliveryOptionsSection() {
    Column(modifier = Modifier.padding(horizontal = 16.dp)) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Schedule,
                contentDescription = "Delivery",
                tint = Color.Black,
                modifier = Modifier.size(20.dp)
            )
            Text(
                text = "Delivery in 40-45 mins",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = Color.Black
            )
        }

        Text(
            text = "Want this later? Schedule it",
            fontSize = 12.sp,
            color = Color(0xFF2E7D32),
            modifier = Modifier.padding(start = 28.dp, top = 4.dp)
        )

        Spacer(modifier = Modifier.height(16.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            DeliveryFleetCard(
                title = "Standard Fleet",
                subtitle = "Our standard food delivery experience",
                icon = "🛵",
                isSelected = true,
                modifier = Modifier.weight(1f)
            )

            DeliveryFleetCard(
                title = "Special Veg-only Fleet",
                subtitle = "Veg-only Fleet is temporarily unavailable at the restaurant!",
                icon = "🥬",
                isSelected = false,
                isDisabled = true,
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
fun DeliveryFleetCard(
    title: String,
    subtitle: String,
    icon: String,
    isSelected: Boolean,
    isDisabled: Boolean = false,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) Color(0xFFE8F5E9) else Color(0xFFF5F5F5)
        ),
        border = if (isSelected) BorderStroke(2.dp, Color(0xFF2E7D32)) else null
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                if (isSelected) {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = "Selected",
                        tint = Color(0xFF2E7D32),
                        modifier = Modifier.size(16.dp)
                    )
                }
                Text(
                    text = title,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (isDisabled) Color.Gray else Color.Black
                )
            }

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = icon,
                fontSize = 24.sp
            )

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = subtitle,
                fontSize = 10.sp,
                color = Color.Gray,
                lineHeight = 12.sp
            )
        }
    }
}

@Composable
fun DeliveryAddressSection(
    deliveryAddress: String,
    onAddressClick: () -> Unit = {},
    onAddInstructionsClick: () -> Unit = {}
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .clickable { onAddressClick() },
        shape = RoundedCornerShape(8.dp),
        color = Color(0xFFF5F5F5)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.LocationOn,
                    contentDescription = "Location",
                    tint = Color.Black,
                    modifier = Modifier.size(20.dp)
                )
                Text(
                    text = "Delivery at Home",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black
                )
            }

            Text(
                text = deliveryAddress,
                fontSize = 12.sp,
                color = Color.Gray,
                modifier = Modifier.padding(start = 28.dp, top = 4.dp)
            )

            TextButton(
                onClick = onAddInstructionsClick,
                contentPadding = PaddingValues(0.dp),
                modifier = Modifier.padding(start = 20.dp)
            ) {
                Text(
                    text = "Add instructions for delivery partner",
                    fontSize = 12.sp,
                    color = Color(0xFF2E7D32)
                )
            }
        }
    }
}

@Composable
fun BillDetailsSection(
    subtotal: Double,
    deliveryFee: Double,
    taxes: Double,
    totalBill: Double
) {
    Column(modifier = Modifier.padding(horizontal = 16.dp)) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Receipt,
                contentDescription = "Bill",
                tint = Color.Black,
                modifier = Modifier.size(20.dp)
            )
            Text(
                text = "Total Bill $${totalBill.toInt()}",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = Color.Black
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        BillRow("Item total", subtotal)
        BillRow("Delivery fee", deliveryFee)
        BillRow("Taxes & charges", taxes)

        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = "To Pay",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = Color.Black
            )
            Text(
                text = "$${totalBill.toInt()}",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = Color.Black
            )
        }
    }
}

@Composable
fun BillRow(label: String, amount: Double) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            fontSize = 13.sp,
            color = Color.Gray
        )
        Text(
            text = "$${amount.toInt()}",
            fontSize = 13.sp,
            color = Color.Gray
        )
    }
}

@Composable
fun CancellationPolicySection() {
    Column(modifier = Modifier.padding(16.dp)) {
        Text(
            text = "CANCELLATION POLICY",
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = Color.Gray
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "Help us reduce food waste by avoiding cancellations after placing your order. A 100% cancellation fee applies for cancellations made after placing the order.",
            fontSize = 11.sp,
            color = Color.Gray,
            lineHeight = 14.sp
        )
    }
}

@Composable
fun PaymentBottomBar(
    totalBill: Double,
    onPlaceOrder: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = Color.White,
//        shadowElevation = 8.dp
    ) {
        Column(
            modifier = Modifier
                .background(MaterialTheme.colorScheme.background)
                .padding(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(0.5f)) {
                    Text(
                        text = "PAY USING",
                        fontSize = 10.sp,
                        color = Color.Gray
                    )
                    Text(
                        text = "Stripe",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.Black
                    )
                }

                Button(
                    onClick = onPlaceOrder,
                    modifier = Modifier
                        .weight(0.5f)
//                        .height(48.dp)
                    ,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary
                    ),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {

                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = "$ ${totalBill.toInt()}",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Text(
                                text = "TOTAL",
                                fontSize = 10.sp,
                                color = Color.White
                            )
                        }
//                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = "Place Order  ▸",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                }
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun CartItemCardPreview() {
    val cartItem = CartItem(
        menuItem = MenuItem(
            1,
            "Kaju Barfi",
            42.0f,
            "Indulge in the heavenly sweetness of kaju barfi...",
            true,
            true,
            true,
            1,
            "https://picsum.photos/seed/201/200/200",
            2
        ),
        quantity = 2,
        customizations = "2 Pieces"
    )

    CartItemCard(cartItem) {}
}

private fun presentPaymentSheet(
    paymentSheet: PaymentSheet,
    customerConfig: PaymentSheet.CustomerConfiguration?,
    paymentIntentClientSecret: String?
) {
    paymentIntentClientSecret?.let {
        paymentSheet.presentWithPaymentIntent(
            it,
            PaymentSheet.Configuration.Builder(merchantDisplayName = "Dollor.ai")
                .customer(customerConfig)
                // Set `allowsDelayedPaymentMethods` to true if your business handles
                // delayed notification payment methods like US bank accounts.
                .allowsDelayedPaymentMethods(true)
                .build()
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderSuccessBottomSheet(
    orderNumber: String,
    restaurantName: String,
    onTrackOrder: () -> Unit
) {

//    val sheetState = rememberModalBottomSheetState(
//        skipPartiallyExpanded = true,
//    )

    val scale by rememberInfiniteTransition(label = "scale").animateFloat(
        initialValue = 0.8f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scale"
    )

    ModalBottomSheet(
        onDismissRequest = {},
//        sheetState = sheetState,
        containerColor = Color.White,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
        dragHandle = null,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Success Icon with Animation
            Box(
                modifier = Modifier
                    .size(120.dp)
                    .background(
                        brush = Brush.radialGradient(
                            colors = listOf(
                                Color(0xFF4CAF50).copy(alpha = 0.2f),
                                Color.Transparent
                            )
                        ),
                        shape = CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                Surface(
                    modifier = Modifier.size(80.dp),
                    shape = CircleShape,
                    color = Color(0xFF4CAF50)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = "Success",
                            tint = Color.White,
                            modifier = Modifier
                                .size(50.dp)
                                .alpha(scale)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = "Order Placed Successfully!",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = Color.Black,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = "Your order from $restaurantName has been confirmed",
                fontSize = 14.sp,
                color = Color.Gray,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Order #$orderNumber",
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                color = Color(0xFF2E7D32)
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Order Details Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(
                    containerColor = Color(0xFFF5F5F5)
                )
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OrderDetailRow("Estimated Delivery", "23 mins")
                    OrderDetailRow("Payment", "Cash on Delivery")
                    OrderDetailRow("Status", "Preparing", Color(0xFFFF9800))
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            Button(
                onClick = onTrackOrder,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF2E7D32)
                ),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text(
                    text = "Track Order",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}


//@Preview(showBackground = true)
@Composable
fun PaymentBottomBarPreview() {
    PaymentBottomBar(0.0, {}, Modifier.fillMaxWidth())
}

