package com.eatfair.driver.ui.founding

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.WorkspacePremium
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.eatfair.driver.ui.theme.DollorDriverColors
import com.stripe.android.PaymentConfiguration
import com.stripe.android.paymentsheet.PaymentSheet
import com.stripe.android.paymentsheet.PaymentSheetResult

private val Gold = Color(0xFFFFC107)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FoundingMemberScreen(
    onBackClick: () -> Unit,
    viewModel: FoundingViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val state by viewModel.uiState.collectAsState()

    var clientSecret by remember { mutableStateOf<String?>(null) }

    fun onPaymentSheetResult(result: PaymentSheetResult) {
        when (result) {
            is PaymentSheetResult.Canceled -> viewModel.onPaymentCancelled()
            is PaymentSheetResult.Failed -> viewModel.onPaymentFailed(result.error.localizedMessage)
            is PaymentSheetResult.Completed -> viewModel.onPaymentCompleted(clientSecret)
        }
    }

    val paymentSheet = remember { PaymentSheet.Builder(::onPaymentSheetResult) }.build()

    LaunchedEffect(Unit) {
        viewModel.paymentSheetEvent.collect { keys ->
            PaymentConfiguration.init(context, keys.publishableKey)
            clientSecret = keys.paymentIntent
            val customerConfig = PaymentSheet.CustomerConfiguration(
                id = keys.customer,
                ephemeralKeySecret = keys.ephemeralKey
            )
            keys.paymentIntent?.let { secret ->
                paymentSheet.presentWithPaymentIntent(
                    secret,
                    PaymentSheet.Configuration.Builder(merchantDisplayName = "Dollor.ai")
                        .customer(customerConfig)
                        .allowsDelayedPaymentMethods(true)
                        .build()
                )
            }
        }
    }

    LaunchedEffect(state.message) {
        state.message?.let {
            Toast.makeText(context, it, Toast.LENGTH_LONG).show()
            viewModel.clearMessage()
        }
    }
    LaunchedEffect(state.error) {
        state.error?.let {
            Toast.makeText(context, it, Toast.LENGTH_LONG).show()
            viewModel.clearError()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Founding Member", fontWeight = FontWeight.SemiBold) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DollorDriverColors.White)
            )
        }
    ) { padding ->
        if (state.isLoading) {
            Box(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center
            ) { CircularProgressIndicator() }
            return@Scaffold
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(DollorDriverColors.Gray50)
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .size(96.dp)
                    .clip(CircleShape)
                    .background(Gold.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.WorkspacePremium,
                    contentDescription = null,
                    tint = Gold,
                    modifier = Modifier.size(52.dp)
                )
            }

            Spacer(Modifier.height(16.dp))
            Text(
                "Driver Founding Member",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = DollorDriverColors.Gray900,
                textAlign = TextAlign.Center
            )
            Spacer(Modifier.height(6.dp))
            Text(
                "Lock in the lowest platform fee for life as one of our first drivers.",
                fontSize = 14.sp,
                color = DollorDriverColors.Gray500,
                textAlign = TextAlign.Center
            )

            Spacer(Modifier.height(24.dp))

            if (state.isMember) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = DollorDriverColors.Green.copy(alpha = 0.1f))
                ) {
                    Row(
                        modifier = Modifier.padding(20.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.CheckCircle, null, tint = DollorDriverColors.Green, modifier = Modifier.size(28.dp))
                        Spacer(Modifier.width(12.dp))
                        Column {
                            Text("You're a Founding Member", fontWeight = FontWeight.Bold, color = DollorDriverColors.Gray900)
                            Text("Your lifetime fee-lock is active.", fontSize = 13.sp, color = DollorDriverColors.Gray500)
                        }
                    }
                }
            } else {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = DollorDriverColors.White)
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Text("Member Benefits", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = DollorDriverColors.Gray900)
                        Spacer(Modifier.height(12.dp))
                        Benefit(state.feeLock ?: "Lifetime fee-lock - your per-ride platform fee never goes up")
                        Benefit("One-time $${"%.0f".format(state.membershipFee)} - no recurring charges")
                        Benefit("Priority ride matching and early access to new features")
                    }
                }

                Spacer(Modifier.height(16.dp))

                val slotsText = when {
                    state.slotsRemaining != null && state.slotsTotal != null ->
                        "${state.slotsRemaining} of ${state.slotsTotal} founding spots left"
                    state.slotsRemaining != null -> "${state.slotsRemaining} founding spots left"
                    else -> null
                }
                if (slotsText != null) {
                    Text(slotsText, fontSize = 13.sp, color = DollorDriverColors.Blue, fontWeight = FontWeight.Medium)
                    Spacer(Modifier.height(16.dp))
                }

                val slotsRemaining = state.slotsRemaining
                val canJoin = state.eligible && (slotsRemaining == null || slotsRemaining > 0)
                Button(
                    onClick = { viewModel.onJoinClicked() },
                    enabled = canJoin && !state.isJoining,
                    modifier = Modifier.fillMaxWidth().height(54.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = DollorDriverColors.Blue)
                ) {
                    if (state.isJoining) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = DollorDriverColors.White,
                            strokeWidth = 2.dp
                        )
                        Spacer(Modifier.width(8.dp))
                    }
                    Text("Join for $${"%.0f".format(state.membershipFee)}", fontWeight = FontWeight.SemiBold)
                }

                if (!canJoin) {
                    Spacer(Modifier.height(8.dp))
                    Text(
                        text = if (state.slotsRemaining == 0) "All founding spots have been claimed."
                        else "Founding membership isn't available for your account yet.",
                        fontSize = 12.sp,
                        color = DollorDriverColors.Gray500,
                        textAlign = TextAlign.Center
                    )
                }

                if (state.isDemo) {
                    Spacer(Modifier.height(8.dp))
                    Text("Demo account - payment is bypassed.", fontSize = 12.sp, color = DollorDriverColors.Gray500)
                }
            }
        }
    }
}

@Composable
private fun Benefit(text: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(Icons.Default.CheckCircle, null, tint = DollorDriverColors.Green, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(10.dp))
        Text(text, fontSize = 13.sp, color = DollorDriverColors.Gray700)
    }
}
