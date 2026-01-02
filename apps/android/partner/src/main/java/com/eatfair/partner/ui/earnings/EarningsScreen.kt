package com.eatfair.partner.ui.earnings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.util.*
import javax.inject.Inject

data class EarningsData(
    val todayEarnings: Double = 0.0,
    val weeklyEarnings: Double = 0.0,
    val monthlyEarnings: Double = 0.0,
    val totalOrders: Int = 0,
    val avgOrderValue: Double = 0.0,
    val pendingPayout: Double = 0.0,
    val lastPayoutDate: String = "",
    val lastPayoutAmount: Double = 0.0
)

data class Transaction(
    val id: String,
    val orderId: String,
    val customerName: String,
    val amount: Double,
    val platformFee: Double,
    val netAmount: Double,
    val date: String,
    val time: String,
    val status: TransactionStatus
)

enum class TransactionStatus {
    COMPLETED,
    PENDING,
    REFUNDED
}

data class EarningsUiState(
    val isLoading: Boolean = true,
    val earnings: EarningsData = EarningsData(),
    val transactions: List<Transaction> = emptyList(),
    val selectedPeriod: String = "This Week",
    val errorMessage: String? = null
)

@HiltViewModel
class EarningsViewModel @Inject constructor() : ViewModel() {

    private val _uiState = MutableStateFlow(EarningsUiState())
    val uiState: StateFlow<EarningsUiState> = _uiState.asStateFlow()

    init {
        loadEarnings()
    }

    fun loadEarnings() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)

            try {
                // TODO: Replace with actual API call to fetch earnings
                // For now, showing empty state - data should come from backend
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    earnings = EarningsData(
                        todayEarnings = 0.0,
                        weeklyEarnings = 0.0,
                        monthlyEarnings = 0.0,
                        totalOrders = 0,
                        avgOrderValue = 0.0,
                        pendingPayout = 0.0,
                        lastPayoutDate = "No payouts yet",
                        lastPayoutAmount = 0.0
                    ),
                    transactions = emptyList()
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = e.message ?: "Failed to load earnings"
                )
            }
        }
    }

    fun selectPeriod(period: String) {
        _uiState.value = _uiState.value.copy(selectedPeriod = period)
        loadEarnings()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EarningsScreen(
    onBackClick: () -> Unit = {},
    viewModel: EarningsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val currencyFormat = remember { NumberFormat.getCurrencyInstance(Locale.US) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Earnings", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadEarnings() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFFFF5722),
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White,
                    actionIconContentColor = Color.White
                )
            )
        }
    ) { padding ->
        if (uiState.isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = Color(0xFFFF5722))
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .background(Color(0xFFF5F5F5)),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Period Selector
                item {
                    PeriodSelector(
                        selected = uiState.selectedPeriod,
                        onSelect = { viewModel.selectPeriod(it) }
                    )
                }

                // Main Earnings Card
                item {
                    EarningsOverviewCard(
                        earnings = uiState.earnings,
                        currencyFormat = currencyFormat
                    )
                }

                // Stats Row
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        StatCard(
                            modifier = Modifier.weight(1f),
                            title = "Orders",
                            value = "${uiState.earnings.totalOrders}",
                            icon = Icons.Default.Receipt,
                            color = Color(0xFF2196F3)
                        )
                        StatCard(
                            modifier = Modifier.weight(1f),
                            title = "Avg Order",
                            value = currencyFormat.format(uiState.earnings.avgOrderValue),
                            icon = Icons.Default.TrendingUp,
                            color = Color(0xFF4CAF50)
                        )
                    }
                }

                // Payout Info
                item {
                    PayoutInfoCard(
                        pendingPayout = uiState.earnings.pendingPayout,
                        lastPayoutDate = uiState.earnings.lastPayoutDate,
                        lastPayoutAmount = uiState.earnings.lastPayoutAmount,
                        currencyFormat = currencyFormat
                    )
                }

                // Transactions Header
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Recent Transactions",
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp
                        )
                        TextButton(onClick = { /* View all */ }) {
                            Text("View All", color = Color(0xFFFF5722))
                        }
                    }
                }

                // Transactions List
                if (uiState.transactions.isEmpty()) {
                    item {
                        EmptyTransactionsView()
                    }
                } else {
                    items(uiState.transactions) { transaction ->
                        TransactionCard(
                            transaction = transaction,
                            currencyFormat = currencyFormat
                        )
                    }
                }

                // Bottom spacing
                item {
                    Spacer(modifier = Modifier.height(80.dp))
                }
            }
        }
    }
}

@Composable
fun PeriodSelector(
    selected: String,
    onSelect: (String) -> Unit
) {
    val periods = listOf("Today", "This Week", "This Month", "All Time")

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        periods.forEach { period ->
            FilterChip(
                selected = selected == period,
                onClick = { onSelect(period) },
                label = { Text(period, fontSize = 12.sp) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = Color(0xFFFF5722),
                    selectedLabelColor = Color.White
                )
            )
        }
    }
}

@Composable
fun EarningsOverviewCard(
    earnings: EarningsData,
    currencyFormat: NumberFormat
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.horizontalGradient(
                        colors = listOf(Color(0xFFFF5722), Color(0xFFFF8A65))
                    )
                )
                .padding(24.dp)
        ) {
            Column {
                Text(
                    text = "Total Earnings",
                    color = Color.White.copy(alpha = 0.8f),
                    fontSize = 14.sp
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = currencyFormat.format(earnings.weeklyEarnings),
                    color = Color.White,
                    fontSize = 36.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    EarningsStat(
                        label = "Today",
                        value = currencyFormat.format(earnings.todayEarnings)
                    )
                    EarningsStat(
                        label = "This Month",
                        value = currencyFormat.format(earnings.monthlyEarnings)
                    )
                }
            }
        }
    }
}

@Composable
fun EarningsStat(label: String, value: String) {
    Column {
        Text(
            text = label,
            color = Color.White.copy(alpha = 0.7f),
            fontSize = 12.sp
        )
        Text(
            text = value,
            color = Color.White,
            fontSize = 18.sp,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
fun StatCard(
    modifier: Modifier = Modifier,
    title: String,
    value: String,
    icon: ImageVector,
    color: Color
) {
    Card(
        modifier = modifier,
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
                    .background(color.copy(alpha = 0.1f), RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = color)
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = title,
                    fontSize = 12.sp,
                    color = Color.Gray
                )
                Text(
                    text = value,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            }
        }
    }
}

@Composable
fun PayoutInfoCard(
    pendingPayout: Double,
    lastPayoutDate: String,
    lastPayoutAmount: Double,
    currencyFormat: NumberFormat
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Pending Payout",
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                    Text(
                        text = currencyFormat.format(pendingPayout),
                        fontWeight = FontWeight.Bold,
                        fontSize = 20.sp,
                        color = Color(0xFFFF5722)
                    )
                }
                Button(
                    onClick = { /* Request payout */ },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFFFF5722)
                    ),
                    enabled = pendingPayout > 0
                ) {
                    Icon(Icons.Default.AccountBalance, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Request Payout")
                }
            }

            HorizontalDivider(modifier = Modifier.padding(vertical = 16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(
                        text = "Last Payout",
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                    Text(
                        text = lastPayoutDate,
                        fontWeight = FontWeight.Medium
                    )
                }
                Text(
                    text = if (lastPayoutAmount > 0) currencyFormat.format(lastPayoutAmount) else "-",
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF4CAF50)
                )
            }
        }
    }
}

@Composable
fun TransactionCard(
    transaction: Transaction,
    currencyFormat: NumberFormat
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
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
                    .background(
                        when (transaction.status) {
                            TransactionStatus.COMPLETED -> Color(0xFF4CAF50).copy(alpha = 0.1f)
                            TransactionStatus.PENDING -> Color(0xFFFFA726).copy(alpha = 0.1f)
                            TransactionStatus.REFUNDED -> Color(0xFFF44336).copy(alpha = 0.1f)
                        },
                        RoundedCornerShape(12.dp)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    when (transaction.status) {
                        TransactionStatus.COMPLETED -> Icons.Default.CheckCircle
                        TransactionStatus.PENDING -> Icons.Default.Schedule
                        TransactionStatus.REFUNDED -> Icons.Default.Undo
                    },
                    contentDescription = null,
                    tint = when (transaction.status) {
                        TransactionStatus.COMPLETED -> Color(0xFF4CAF50)
                        TransactionStatus.PENDING -> Color(0xFFFFA726)
                        TransactionStatus.REFUNDED -> Color(0xFFF44336)
                    }
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "#${transaction.orderId}",
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = transaction.customerName,
                    fontSize = 13.sp,
                    color = Color.Gray
                )
                Text(
                    text = "${transaction.date} • ${transaction.time}",
                    fontSize = 12.sp,
                    color = Color.Gray
                )
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = currencyFormat.format(transaction.netAmount),
                    fontWeight = FontWeight.Bold,
                    color = when (transaction.status) {
                        TransactionStatus.REFUNDED -> Color(0xFFF44336)
                        else -> Color.Black
                    }
                )
                Text(
                    text = "Fee: ${currencyFormat.format(transaction.platformFee)}",
                    fontSize = 11.sp,
                    color = Color.Gray
                )
            }
        }
    }
}

@Composable
fun EmptyTransactionsView() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                Icons.Default.ReceiptLong,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = Color.LightGray
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "No transactions yet",
                fontWeight = FontWeight.Medium,
                color = Color.Gray
            )
            Text(
                text = "Your earnings will appear here once you start receiving orders",
                fontSize = 13.sp,
                color = Color.Gray,
                modifier = Modifier.padding(top = 4.dp)
            )
        }
    }
}
