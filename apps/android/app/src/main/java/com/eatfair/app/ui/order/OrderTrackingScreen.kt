package com.eatfair.app.ui.order

import android.annotation.SuppressLint
import android.content.Context
import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.layout.wrapContentSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DividerDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.TextUnitType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.core.graphics.createBitmap
import com.eatfair.app.R
import com.eatfair.shared.model.order.OrderTracking
import com.eatfair.app.ui.cart.CartViewModel
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.MapsInitializer
import com.google.android.gms.maps.model.BitmapDescriptor
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.LatLngBounds
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.MapProperties
import com.google.maps.android.compose.MapUiSettings
import com.google.maps.android.compose.Marker
import com.google.maps.android.compose.MarkerState
import com.google.maps.android.compose.Polyline
import com.google.maps.android.compose.rememberCameraPositionState
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.flow

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderTrackingScreen(
    cartViewModel: CartViewModel,
    onBackClick: () -> Unit = {},
    onCallPartner: () -> Unit = {},
    onAddInstructions: () -> Unit = {},
) {
    val order = cartViewModel.activeOrder.collectAsState().value

    Box(modifier = Modifier.fillMaxSize()) {
        Scaffold(
            topBar = {
                OrderTrackingTopBar(
                    restaurantName = order?.restaurant?.name ?: " Order Tracking",
                    onBackClick = onBackClick
                )
            },
            containerColor = Color(0xFFF5F5F5)
        ) { paddingValues ->
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentPadding = PaddingValues(bottom = 16.dp)
            )
            {
                // Map Section
                item {
                    LiveTrackingMap(order = order)
                }

                // Delivery Status Card
                item {
                    Spacer(modifier = Modifier.height(16.dp))
                    DeliveryStatusCard(
                        order = order,
                        onCallPartner = onCallPartner,
                        onAddInstructions = onAddInstructions
                    )
                }

                // Delay Message (if delayed)
                if (order?.isDelayed == true) {
                    item {
                        Spacer(modifier = Modifier.height(16.dp))
                        DelayMessageCard()
                    }
                }

                // While You Wait Section
                item {
                    Spacer(modifier = Modifier.height(24.dp))
                    WhileYouWaitSection()
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderTrackingTopBar(
    restaurantName: String,
    onBackClick: () -> Unit
) {
    TopAppBar(
        title = {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "Order from",
                    fontSize = 12.sp,
                    color = Color.Gray
                )
                Text(
                    text = restaurantName,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black
                )
            }
        },
        navigationIcon = {
            IconButton(onClick = onBackClick) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = Color.Black
                )
            }
        },
        actions = {
            IconButton(onClick = { /* More options */ }) {
                Icon(
                    imageVector = Icons.Default.MoreVert,
                    contentDescription = "More",
                    tint = Color.Black
                )
            }
        },
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = Color.White
        )
    )
}

@SuppressLint("UnrememberedMutableState")
@Composable
fun LiveTrackingMap(
    order: OrderTracking?
) {

    if (order == null) return

    var isMapInitialized by remember { mutableStateOf(false) }
    val context = LocalContext.current

    // This LaunchedEffect will run once to initialize the Maps SDK.
    LaunchedEffect(Unit) {
        try {
            // Check if Google Play Services is available, which is required for Maps.
            val googleApiAvailability = GoogleApiAvailability.getInstance()
            val resultCode = googleApiAvailability.isGooglePlayServicesAvailable(context)
            if (resultCode == ConnectionResult.SUCCESS) {
                MapsInitializer.initialize(context, MapsInitializer.Renderer.LATEST) {
                    // This block is called when initialization is complete.
                    isMapInitialized = true
                }
            } else {
                Log.e("LiveTrackingMap", "Google Play Services not available.")
            }
        } catch (e: Exception) {
            Log.e("LiveTrackingMap", "MapsInitializer failed: ${e.message}", e)
            // Map will not be shown if initialization fails
        }
    }

    if (isMapInitialized) {
        // 1. Define static locations for restaurant and home
        val restaurantLocation = remember {
            LatLng(
                order.pickupLocation.lat,
                order.pickupLocation.lng
            )
        }
        val homeLocation =
            remember {
                val location = order.deliveryLocation
                LatLng(
                    location?.latitude ?: 0.0,
                    location?.longitude ?: 0.0
                )
            }

        // 2. Simulate the delivery partner's live location
        // This flow will emit a new LatLng every 2 seconds, moving from restaurant to home.
        val partnerLocation by remember {
            flow {
                val totalSteps = 100
                for (i in 0..totalSteps) {
                    // Interpolate between restaurant and home locations
                    val lat =
                        restaurantLocation.latitude + (homeLocation.latitude - restaurantLocation.latitude) * i / totalSteps
                    val lng =
                        restaurantLocation.longitude + (homeLocation.longitude - restaurantLocation.longitude) * i / totalSteps
                    emit(LatLng(lat, lng))
                    delay(2000) // 2-second delay for simulation
                }
            }
        }.collectAsState(initial = restaurantLocation) // Start at the restaurant

        // 3. Set up the camera state
        val cameraPositionState = rememberCameraPositionState {
            position = CameraPosition.fromLatLngZoom(restaurantLocation, 15f)
        }

        // 4. Create bounds to keep all markers in view and update the camera
        LaunchedEffect(partnerLocation) {
            val bounds = LatLngBounds.builder()
                .include(restaurantLocation)
                .include(homeLocation)
                .include(partnerLocation)
                .build()
            // Animate the camera to show all markers with a 100dp padding
            cameraPositionState.animate(CameraUpdateFactory.newLatLngBounds(bounds, 100))
        }

        // 5. Define Map Properties and UI Settings
        val mapProperties = MapProperties(
            isTrafficEnabled = true,
//        mapStyleOptions = MapStyleOptions.loadRawResourceStyle(
//            LocalContext.current,
//            R.raw.google_map_style
//        ) // Optional: for a custom map theme
        )
        val mapUiSettings = MapUiSettings(
            zoomControlsEnabled = false, // Disable default zoom controls
            mapToolbarEnabled = false
        )

        GoogleMap(
            modifier = Modifier
                .fillMaxWidth()
                .height(300.dp),
            cameraPositionState = cameraPositionState,
            properties = mapProperties,
            uiSettings = mapUiSettings
        ) {
            // --- Markers and Polyline ---

            // A. Marker for the Restaurant (Pickup)
            Marker(
                state = MarkerState(position = restaurantLocation),
                title = "Restaurant",
                snippet = order.restaurant?.name,
                icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_ORANGE)
            )

            // B. Marker for the Home (Delivery)
            Marker(
                state = MarkerState(position = homeLocation),
                title = "Home",
                snippet = "Your Location",
                icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_GREEN)
            )

            val markerIcon = bitmapDescriptorFromVector(context, R.drawable.ic_delivery_bike)
            // C. Animated Marker for the Delivery Partner
            Marker(
                state = MarkerState(position = partnerLocation),
                title = order.deliveryPartner.name,
                // You should add a custom icon for the bike/car in your res/drawable folder
                icon = markerIcon,
                anchor = Offset(0.5f, 0.5f), // Center the icon on the coordinate
                flat = true, // Keep the icon flat on the map
                rotation = 0f // In a real app, you would calculate the bearing between points
            )

            // D. Polyline to draw the route
            Polyline(
                points = listOf(restaurantLocation, partnerLocation, homeLocation),
                color = Color(0xFF7B7B7B),
                width = 15f
            )
        }
    }
}

@Composable
fun DeliveryStatusCard(
    order: OrderTracking?,
    onCallPartner: () -> Unit,
    onAddInstructions: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp)
        ) {
            // Status and Time
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .wrapContentHeight(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(
                    Modifier.weight(0.8f)
                ) {
                    Text(
                        text = "Out for delivery",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.Black
                    )
                    Text(
                        text = "${order?.deliveryPartner?.name} is on the way to deliver your order",
                        fontSize = 13.sp,
                        color = Color.Gray,
                        modifier = Modifier.padding(top = 4.dp),
                        lineHeight = TextUnit(15f, TextUnitType.Sp)
                    )
                }

                Surface(
                    Modifier.weight(0.2f),
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0xFF2E7D32),
                ) {
                    Column(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "18",
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            text = "mins",
                            fontSize = 12.sp,
                            color = Color.White
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            HorizontalDivider(Modifier, DividerDefaults.Thickness, DividerDefaults.color)

            Spacer(modifier = Modifier.height(4.dp))

            // Add Delivery Instructions
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(onClick = onAddInstructions)
                    .padding(vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    Modifier.weight(0.8f),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                )
                {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = "Add",
                        tint = Color.Black,
                        modifier = Modifier
                            .size(28.dp)
                            .background(Color(0xFFF5F5F5), CircleShape)
                            .padding(8.dp)
                    )

                    Column(
                        verticalArrangement = Arrangement.Center
                    ) {
                        Text(
                            text = "Add Delivery Instructions",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color.Black
                        )
                        if (order?.deliveryInstructions?.isNotEmpty() == true) {
                            Text(
                                text = order.deliveryInstructions,
                                fontSize = 12.sp,
                                color = Color.Gray,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }

                Row(
                    Modifier.weight(0.2f),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                )
                {
                    Box(
                        modifier = Modifier
                            .wrapContentSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        // Delivery person image
//                        Image(
//                            painter = painterResource(id = R.drawable.ic_delivery_bike),
//                            contentDescription = "Delivery Person",
//                            modifier = Modifier
//                                .size(40.dp)
//                                .clip(CircleShape)
//                                .border(2.dp, Color.White, CircleShape),
//                            contentScale = ContentScale.Crop
//                        )

                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .background(Color(0xFFFFE0B2), CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "👨",
                                fontSize = 20.sp
                            )
                        }
                        Box(
                            modifier = Modifier
                                .align(Alignment.Center)
                                .offset(x = 24.dp, y = 0.dp) // controls overlap position
                                .size(32.dp)
                                .background(Color(0xFFFFF3E0), CircleShape)
                                .clickable { onCallPartner() },
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Call,
                                contentDescription = "Call",
                                tint = Color(0xFFFF5722),
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }

                }
            }
        }
    }
}

@Composable
fun DelayMessageCard() {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Schedule,
                contentDescription = "Delayed",
                tint = Color(0xFF2E7D32),
                modifier = Modifier.size(32.dp)
            )

            Column {
                Text(
                    text = "SORRY, WE ARE DELAYED!",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black
                )
                Text(
                    text = "Get ₹25 coupon after order delivery",
                    fontSize = 13.sp,
                    color = Color.Gray
                )
            }
        }
    }
}

@Composable
fun WhileYouWaitSection() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
    ) {
        Text(
            text = "WHILE YOU WAIT",
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            color = Color.Black,
            modifier = Modifier.padding(bottom = 12.dp)
        )

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = Color(0xFFF3E5F5)
            )
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "₹500 ₹0 Joining Fees",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF6A1B9A)
                    )
                    Text(
                        text = "On Swiggy HDFC Bank Credit Card!",
                        fontSize = 12.sp,
                        color = Color(0xFF6A1B9A),
                        modifier = Modifier.padding(vertical = 4.dp)
                    )

                    Button(
                        onClick = { },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFFFF5722)
                        ),
                        shape = RoundedCornerShape(20.dp),
                        modifier = Modifier.padding(top = 8.dp)
                    ) {
                        Text("APPLY NOW", fontSize = 12.sp)
                    }
                }

                Box(
                    modifier = Modifier.size(100.dp)
                ) {
                    Text(
                        text = "💳",
                        fontSize = 60.sp
                    )
                }
            }
        }
    }
}

@Composable
fun OrderDetailRow(
    label: String,
    value: String,
    valueColor: Color = Color.Black
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            fontSize = 13.sp,
            color = Color.Gray
        )
        Text(
            text = value,
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium,
            color = valueColor
        )
    }
}

fun bitmapDescriptorFromVector(context: Context, vectorResId: Int): BitmapDescriptor {
    val vectorDrawable = ContextCompat.getDrawable(context, vectorResId)
        ?: return BitmapDescriptorFactory.defaultMarker()

    vectorDrawable.setBounds(
        0, 0,
        vectorDrawable.intrinsicWidth,
        vectorDrawable.intrinsicHeight
    )

    val bitmap = createBitmap(vectorDrawable.intrinsicWidth, vectorDrawable.intrinsicHeight)

    val canvas = android.graphics.Canvas(bitmap)
    vectorDrawable.draw(canvas)
    return BitmapDescriptorFactory.fromBitmap(bitmap)
}

@Preview(showBackground = true)
@Composable
fun DeliveryStatusCardPreview() {
//    DeliveryStatusCard(getSampleOrderTracking(), {}, {})
}