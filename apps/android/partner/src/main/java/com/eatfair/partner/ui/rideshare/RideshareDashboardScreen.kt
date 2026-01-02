package com.eatfair.partner.ui.rideshare

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.eatfair.shared.model.rideshare.RideBid
import com.eatfair.shared.model.rideshare.RideRequestForBidding
import kotlinx.coroutines.launch

/**
 * RideshareDashboardScreen - Main rideshare screen with tabs
 * Matches iOS RideshareDashboardView exactly
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RideshareDashboardScreen(
    viewModel: RideshareViewModel = viewModel(),
    onNavigateToActiveRide: (RideBid) -> Unit = {},
    onNavigateToChat: (Int, String) -> Unit = { _, _ -> }
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    // Initialize ViewModel
    LaunchedEffect(Unit) {
        viewModel.initialize(context)
    }

    // Collect states
    val availableRequests by viewModel.availableRequests.collectAsState()
    val myBids by viewModel.myBids.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val showError by viewModel.showError.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val showSuccess by viewModel.showSuccess.collectAsState()
    val successMessage by viewModel.successMessage.collectAsState()

    // Tab state
    val tabs = listOf(
        RideshareTab.Available,
        RideshareTab.MyBids,
        RideshareTab.Active
    )
    val pagerState = rememberPagerState(pageCount = { tabs.size })

    // Selected request for bidding
    var selectedRequest by remember { mutableStateOf<RideRequestForBidding?>(null) }
    var showBidSheet by remember { mutableStateOf(false) }

    // Selected bid for counter-offer
    var selectedBid by remember { mutableStateOf<RideBid?>(null) }
    var showCounterOfferSheet by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Rideshare", fontWeight = FontWeight.Bold) },
                actions = {
                    IconButton(onClick = { viewModel.refreshData() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Tab Selector
            TabRow(
                selectedTabIndex = pagerState.currentPage,
                containerColor = MaterialTheme.colorScheme.surface
            ) {
                tabs.forEachIndexed { index, tab ->
                    val count = when (tab) {
                        RideshareTab.Available -> availableRequests.size
                        RideshareTab.MyBids -> viewModel.pendingBids.size + viewModel.counteredBids.size
                        RideshareTab.Active -> viewModel.activeRides.size
                    }

                    Tab(
                        selected = pagerState.currentPage == index,
                        onClick = {
                            scope.launch {
                                pagerState.animateScrollToPage(index)
                            }
                        },
                        text = {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(
                                        imageVector = tab.icon,
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Text(
                                        text = tab.title,
                                        fontWeight = FontWeight.SemiBold,
                                        style = MaterialTheme.typography.bodySmall
                                    )
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Badge(
                                    containerColor = if (pagerState.currentPage == index)
                                        tab.color else tab.color.copy(alpha = 0.2f),
                                    contentColor = if (pagerState.currentPage == index)
                                        Color.White else tab.color
                                ) {
                                    Text(count.toString())
                                }
                            }
                        }
                    )
                }
            }

            // Pager Content
            HorizontalPager(
                state = pagerState,
                modifier = Modifier.fillMaxSize()
            ) { page ->
                when (tabs[page]) {
                    RideshareTab.Available -> AvailableRequestsContent(
                        requests = availableRequests,
                        isLoading = isLoading,
                        onRefresh = { viewModel.fetchAvailableRequests() },
                        onBidClick = { request ->
                            selectedRequest = request
                            showBidSheet = true
                        }
                    )
                    RideshareTab.MyBids -> MyBidsContent(
                        pendingBids = viewModel.pendingBids,
                        counteredBids = viewModel.counteredBids,
                        onCounterOfferClick = { bid ->
                            selectedBid = bid
                            showCounterOfferSheet = true
                        },
                        onWithdrawClick = { viewModel.withdrawBid(it) }
                    )
                    RideshareTab.Active -> ActiveRidesContent(
                        activeRides = viewModel.activeRides,
                        onRideClick = onNavigateToActiveRide
                    )
                }
            }
        }

        // Submit Bid Sheet
        if (showBidSheet && selectedRequest != null) {
            SubmitBidSheet(
                request = selectedRequest!!,
                viewModel = viewModel,
                onDismiss = {
                    showBidSheet = false
                    selectedRequest = null
                }
            )
        }

        // Counter-Offer Sheet
        if (showCounterOfferSheet && selectedBid != null) {
            CounterOfferResponseSheet(
                bid = selectedBid!!,
                viewModel = viewModel,
                onDismiss = {
                    showCounterOfferSheet = false
                    selectedBid = null
                }
            )
        }

        // Error Dialog
        if (showError) {
            AlertDialog(
                onDismissRequest = { viewModel.dismissError() },
                title = { Text("Error") },
                text = { Text(errorMessage ?: "An error occurred") },
                confirmButton = {
                    TextButton(onClick = { viewModel.dismissError() }) {
                        Text("OK")
                    }
                }
            )
        }

        // Success Dialog
        if (showSuccess) {
            AlertDialog(
                onDismissRequest = { viewModel.dismissSuccess() },
                title = { Text("Success") },
                text = { Text(successMessage ?: "") },
                confirmButton = {
                    TextButton(onClick = { viewModel.dismissSuccess() }) {
                        Text("OK")
                    }
                }
            )
        }
    }
}

/**
 * Tab definitions matching iOS RideshareTab enum
 */
sealed class RideshareTab(
    val title: String,
    val icon: androidx.compose.ui.graphics.vector.ImageVector,
    val color: Color
) {
    object Available : RideshareTab("Available", Icons.Default.DirectionsCar, Color(0xFF2196F3))
    object MyBids : RideshareTab("My Bids", Icons.Default.PanTool, Color(0xFFFF9800))
    object Active : RideshareTab("Active", Icons.Default.LocationOn, Color(0xFF4CAF50))
}

/**
 * Available Requests Tab Content
 */
@Composable
fun AvailableRequestsContent(
    requests: List<RideRequestForBidding>,
    isLoading: Boolean,
    onRefresh: () -> Unit,
    onBidClick: (RideRequestForBidding) -> Unit
) {
    when {
        isLoading && requests.isEmpty() -> {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    CircularProgressIndicator(color = Color(0xFF2196F3))
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        "Finding ride requests...",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
        requests.isEmpty() -> {
            EmptyStateView(
                icon = Icons.Default.DirectionsCar,
                title = "No Ride Requests",
                subtitle = "Ride requests will appear here.\nSubmit competitive bids to get matched!",
                iconColor = Color(0xFF2196F3),
                onRefresh = onRefresh
            )
        }
        else -> {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                items(requests) { request ->
                    RideRequestCard(
                        request = request,
                        onBidClick = { onBidClick(request) }
                    )
                }
            }
        }
    }
}

/**
 * My Bids Tab Content
 */
@Composable
fun MyBidsContent(
    pendingBids: List<RideBid>,
    counteredBids: List<RideBid>,
    onCounterOfferClick: (RideBid) -> Unit,
    onWithdrawClick: (RideBid) -> Unit
) {
    if (pendingBids.isEmpty() && counteredBids.isEmpty()) {
        EmptyStateView(
            icon = Icons.Default.PanTool,
            title = "No Bids Yet",
            subtitle = "Submit bids on ride requests\nto see them here.",
            iconColor = Color(0xFFFF9800)
        )
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Counter-offers section
            if (counteredBids.isNotEmpty()) {
                item {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            Icons.Default.Info,
                            contentDescription = null,
                            tint = Color(0xFF2196F3)
                        )
                        Text(
                            "Counter-Offers (${counteredBids.size})",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
                items(counteredBids) { bid ->
                    BidCard(
                        bid = bid,
                        isCountered = true,
                        onCounterOfferClick = { onCounterOfferClick(bid) }
                    )
                }
            }

            // Pending bids section
            if (pendingBids.isNotEmpty()) {
                item {
                    if (counteredBids.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                    Text(
                        "Pending (${pendingBids.size})",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
                items(pendingBids) { bid ->
                    BidCard(
                        bid = bid,
                        isCountered = false,
                        onWithdrawClick = { onWithdrawClick(bid) }
                    )
                }
            }
        }
    }
}

/**
 * Active Rides Tab Content
 */
@Composable
fun ActiveRidesContent(
    activeRides: List<RideBid>,
    onRideClick: (RideBid) -> Unit
) {
    if (activeRides.isEmpty()) {
        EmptyStateView(
            icon = Icons.Default.LocationOn,
            title = "No Active Rides",
            subtitle = "When a customer accepts your bid,\nthe ride will appear here.",
            iconColor = Color(0xFF4CAF50)
        )
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            items(activeRides) { bid ->
                ActiveRideCard(
                    bid = bid,
                    onClick = { onRideClick(bid) }
                )
            }
        }
    }
}

/**
 * Empty State View
 */
@Composable
fun EmptyStateView(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String,
    iconColor: Color,
    onRefresh: (() -> Unit)? = null
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .size(120.dp)
                .clip(CircleShape)
                .background(iconColor.copy(alpha = 0.1f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(48.dp),
                tint = iconColor
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = title,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = subtitle,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center
        )

        onRefresh?.let {
            Spacer(modifier = Modifier.height(24.dp))
            Button(
                onClick = it,
                colors = ButtonDefaults.buttonColors(containerColor = iconColor)
            ) {
                Icon(Icons.Default.Refresh, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Refresh")
            }
        }
    }
}

/**
 * Ride Request Card - matches iOS RideRequestCard
 */
@Composable
fun RideRequestCard(
    request: RideRequestForBidding,
    onBidClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column {
            // Header - Price & Distance
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Suggested Price Badge
                Column(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFF2196F3))
                        .padding(horizontal = 12.dp, vertical = 8.dp)
                ) {
                    Text(
                        text = "$${request.suggestedPrice?.toInt() ?: 0}",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Text(
                        text = "suggested",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.White.copy(alpha = 0.8f)
                    )
                }

                // Distance & Bid Count
                Column(horizontalAlignment = Alignment.End) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            Icons.Default.LocationOn,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = "${request.formattedPickupDistance} away",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    request.bidCount?.takeIf { it > 0 }?.let { count ->
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(Color(0xFFFF9800).copy(alpha = 0.15f))
                                .padding(horizontal = 8.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                Icons.Default.People,
                                contentDescription = null,
                                modifier = Modifier.size(12.dp),
                                tint = Color(0xFFFF9800)
                            )
                            Text(
                                text = "$count bid${if (count == 1) "" else "s"}",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFFFF9800)
                            )
                        }
                    }
                }
            }

            Divider(modifier = Modifier.padding(horizontal = 16.dp))

            // Pickup Location
            Row(
                modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 12.dp),
                verticalAlignment = Alignment.Top,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF4CAF50).copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.Person,
                        contentDescription = null,
                        tint = Color(0xFF4CAF50)
                    )
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "PICKUP",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = request.pickup.address,
                        style = MaterialTheme.typography.bodyMedium,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            // Route line
            Box(
                modifier = Modifier
                    .padding(start = 35.dp)
                    .width(2.dp)
                    .height(24.dp)
                    .background(Color(0xFF2196F3).copy(alpha = 0.3f))
            )

            // Dropoff Location
            Row(
                modifier = Modifier.padding(start = 16.dp, end = 16.dp, bottom = 12.dp),
                verticalAlignment = Alignment.Top,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(Color(0xFFF44336).copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = Color(0xFFF44336)
                    )
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "DROP-OFF",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = request.dropoff.address,
                        style = MaterialTheme.typography.bodyMedium,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            // Trip Stats
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                TripStatBadge(
                    icon = Icons.Default.SyncAlt,
                    text = request.formattedTripDistance,
                    label = "Trip"
                )
                TripStatBadge(
                    icon = Icons.Default.Schedule,
                    text = request.formattedDuration,
                    label = "Duration"
                )
            }

            Divider(modifier = Modifier.padding(horizontal = 16.dp))

            // Bid Button
            Button(
                onClick = onBidClick,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2196F3))
            ) {
                Icon(Icons.Default.PanTool, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Submit Bid", fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

/**
 * Trip Stat Badge
 */
@Composable
fun TripStatBadge(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    text: String,
    label: String
) {
    Column(
        modifier = Modifier
            .clip(RoundedCornerShape(10.dp))
            .background(Color(0xFF2196F3).copy(alpha = 0.1f))
            .padding(horizontal = 12.dp, vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(12.dp),
                tint = Color(0xFF2196F3)
            )
            Text(
                text = text,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.SemiBold,
                color = Color(0xFF2196F3)
            )
        }
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

/**
 * Bid Card for My Bids tab
 */
@Composable
fun BidCard(
    bid: RideBid,
    isCountered: Boolean,
    onCounterOfferClick: () -> Unit = {},
    onWithdrawClick: () -> Unit = {}
) {
    val request = bid.rideRequest

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Your Bid: $${bid.proposedPrice.toInt()}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    bid.customerCounterPrice?.takeIf { isCountered }?.let { counterPrice ->
                        Text(
                            text = "Counter: $${counterPrice.toInt()}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFF2196F3),
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }

                if (isCountered) {
                    Button(
                        onClick = onCounterOfferClick,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50)),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("Respond", style = MaterialTheme.typography.labelMedium)
                    }
                } else {
                    Badge(
                        containerColor = Color(0xFFFF9800).copy(alpha = 0.15f),
                        contentColor = Color(0xFFFF9800)
                    ) {
                        Text("Pending")
                    }
                }
            }

            // Route info
            request?.let {
                Spacer(modifier = Modifier.height(12.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF4CAF50))
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = it.pickup.address,
                        style = MaterialTheme.typography.bodySmall,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFF44336))
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = it.dropoff.address,
                        style = MaterialTheme.typography.bodySmall,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            // Withdraw button for pending bids
            if (!isCountered) {
                Spacer(modifier = Modifier.height(12.dp))
                TextButton(
                    onClick = onWithdrawClick,
                    colors = ButtonDefaults.textButtonColors(contentColor = Color(0xFFF44336))
                ) {
                    Text("Withdraw Bid")
                }
            }
        }
    }
}

/**
 * Active Ride Card
 */
@Composable
fun ActiveRideCard(
    bid: RideBid,
    onClick: () -> Unit
) {
    val request = bid.rideRequest
    val finalPrice = bid.customerCounterPrice ?: bid.proposedPrice

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column {
            // Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        Icons.Default.CheckCircle,
                        contentDescription = null,
                        tint = Color(0xFF4CAF50)
                    )
                    Text(
                        text = "Matched",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF4CAF50)
                    )
                }
                Text(
                    text = "$${finalPrice.toInt()}",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
            }

            Divider(modifier = Modifier.padding(horizontal = 16.dp))

            // Route
            request?.let {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(10.dp)
                                .clip(CircleShape)
                                .background(Color(0xFF4CAF50))
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = it.pickup.address,
                            style = MaterialTheme.typography.bodySmall,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(10.dp)
                                .clip(CircleShape)
                                .background(Color(0xFFF44336))
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = it.dropoff.address,
                            style = MaterialTheme.typography.bodySmall,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }

            // View Ride Button
            Button(
                onClick = onClick,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50))
            ) {
                Icon(Icons.Default.DirectionsCar, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("View Ride", fontWeight = FontWeight.SemiBold)
            }
        }
    }
}
