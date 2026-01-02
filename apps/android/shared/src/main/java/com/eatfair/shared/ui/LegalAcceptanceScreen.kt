package com.eatfair.shared.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.OpenInNew
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.eatfair.shared.config.AppConfig

/**
 * Legal Acceptance Screen
 * Shared component for Customer, Driver, and Restaurant apps
 * Must be shown before users can access the main app
 */
@Composable
fun LegalAcceptanceScreen(
    userType: String = "Customer", // "Customer", "Driver", or "Restaurant"
    onAccept: () -> Unit
) {
    val context = LocalContext.current
    var termsAccepted by remember { mutableStateOf(false) }
    var privacyAccepted by remember { mutableStateOf(false) }

    val scrollState = rememberScrollState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF5F5F5))
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp)
                .verticalScroll(scrollState),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(32.dp))

            // Header
            Text(
                text = "Welcome to Dollor",
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF2C3E50)
            )

            Text(
                text = "Before you continue, please review and accept our terms",
                fontSize = 14.sp,
                color = Color.Gray,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 8.dp)
            )

            Spacer(modifier = Modifier.height(32.dp))

            // P2P Model Explanation Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        text = "How Dollor Works",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF2C3E50)
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    BulletPoint("Dollor is a peer-to-peer marketplace connecting customers, restaurants, and drivers directly")
                    BulletPoint("Payments go directly from customer to restaurant via Stripe")
                    BulletPoint("Dollor charges a flat \$1-\$3 platform fee (not 25-35% commission)")
                    BulletPoint("Drivers receive 100% of their earnings plus tips")
                    BulletPoint("All users are independent - not employees of Dollor")
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Terms of Service Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Terms of Service",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFF2C3E50)
                        )

                        TextButton(
                            onClick = {
                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(AppConfig.Legal.TERMS_OF_SERVICE_URL))
                                context.startActivity(intent)
                            }
                        ) {
                            Text("Read Full Terms")
                            Icon(
                                Icons.Default.OpenInNew,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp).padding(start = 4.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = "By using Dollor, you agree to use the platform for legitimate purchases, respect other users, and comply with all applicable laws.",
                        fontSize = 13.sp,
                        color = Color.Gray
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(
                            checked = termsAccepted,
                            onCheckedChange = { termsAccepted = it },
                            colors = CheckboxDefaults.colors(
                                checkedColor = Color(0xFF6C63FF)
                            )
                        )
                        Text(
                            text = "I have read and agree to the Terms of Service",
                            fontSize = 14.sp,
                            color = Color(0xFF2C3E50)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Privacy Policy Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Privacy Policy",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFF2C3E50)
                        )

                        TextButton(
                            onClick = {
                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(AppConfig.Legal.PRIVACY_POLICY_URL))
                                context.startActivity(intent)
                            }
                        ) {
                            Text("Read Full Policy")
                            Icon(
                                Icons.Default.OpenInNew,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp).padding(start = 4.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = "We collect only essential data needed to provide our services. Your information is never sold to third parties.",
                        fontSize = 13.sp,
                        color = Color.Gray
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(
                            checked = privacyAccepted,
                            onCheckedChange = { privacyAccepted = it },
                            colors = CheckboxDefaults.colors(
                                checkedColor = Color(0xFF6C63FF)
                            )
                        )
                        Text(
                            text = "I have read and agree to the Privacy Policy",
                            fontSize = 14.sp,
                            color = Color(0xFF2C3E50)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // User-specific info
            if (userType == "Driver") {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Driver Agreement",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFF2E7D32)
                        )
                        Text(
                            text = "As a driver, you are an independent contractor. You control your schedule, routes, and which deliveries/rides to accept.",
                            fontSize = 13.sp,
                            color = Color(0xFF388E3C),
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            if (userType == "Restaurant") {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF3E0))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Restaurant Partner Agreement",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFFE65100)
                        )
                        Text(
                            text = "Payments go directly to your Stripe account. Dollor only charges \$1-\$3 per order - you keep the rest!",
                            fontSize = 13.sp,
                            color = Color(0xFFF57C00),
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            // Continue Button
            Button(
                onClick = onAccept,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                enabled = termsAccepted && privacyAccepted,
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF6C63FF),
                    disabledContainerColor = Color.Gray.copy(alpha = 0.3f)
                ),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(
                    Icons.Default.Check,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Accept & Continue",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
private fun BulletPoint(text: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.Top
    ) {
        Text(
            text = "•",
            fontSize = 14.sp,
            color = Color(0xFF6C63FF),
            modifier = Modifier.padding(end = 8.dp, top = 2.dp)
        )
        Text(
            text = text,
            fontSize = 14.sp,
            color = Color(0xFF5D6D7E)
        )
    }
}
