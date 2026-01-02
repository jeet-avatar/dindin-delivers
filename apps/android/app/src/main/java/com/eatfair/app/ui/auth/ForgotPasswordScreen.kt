package com.eatfair.app.ui.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.eatfair.app.ui.theme.BrandGreen
import com.eatfair.app.ui.theme.BrandGrey
import com.eatfair.app.ui.theme.BrandBlack
import com.eatfair.app.ui.theme.TextGrey

/**
 * Forgot Password Screen - Matches iOS ForgotPasswordView exactly
 *
 * Flow:
 * 1. User enters email
 * 2. User clicks "Send Reset Code"
 * 3. Backend sends code to email
 * 4. Navigate to ResetCodeEntryScreen
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ForgotPasswordScreen(
    onSendCodeClick: (email: String) -> Unit,
    onCancelClick: () -> Unit,
    isLoading: Boolean = false,
    errorMessage: String? = null
) {
    var email by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { },
                actions = {
                    TextButton(onClick = onCancelClick) {
                        Text(
                            text = "Cancel",
                            color = BrandGreen,
                            fontWeight = FontWeight.Medium
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = BrandGrey
                )
            )
        },
        containerColor = BrandGrey
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 30.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(30.dp))

            // Title - Matches iOS
            Text(
                text = "Reset Password",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = BrandBlack
            )

            Spacer(modifier = Modifier.height(25.dp))

            // Description - Matches iOS
            Text(
                text = "Enter your email address and we'll send you a code to reset your password.",
                fontSize = 14.sp,
                color = TextGrey,
                textAlign = TextAlign.Center,
                lineHeight = 20.sp
            )

            Spacer(modifier = Modifier.height(25.dp))

            // Email Input - Matches iOS style
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .shadow(
                        elevation = 2.dp,
                        shape = RoundedCornerShape(12.dp),
                        ambientColor = Color.Black.copy(alpha = 0.05f)
                    ),
                placeholder = { Text("Email", color = TextGrey) },
                leadingIcon = {
                    Icon(
                        Icons.Default.Email,
                        contentDescription = null,
                        tint = TextGrey
                    )
                },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = Color.White,
                    unfocusedContainerColor = Color.White,
                    focusedBorderColor = BrandGreen,
                    unfocusedBorderColor = Color.Transparent
                ),
                singleLine = true
            )

            // Error Message
            errorMessage?.let { error ->
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = error,
                    fontSize = 12.sp,
                    color = Color.Red,
                    textAlign = TextAlign.Center
                )
            }

            Spacer(modifier = Modifier.height(25.dp))

            // Send Reset Code Button - Matches iOS
            Button(
                onClick = { onSendCodeClick(email) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = BrandGreen,
                    disabledContainerColor = BrandGreen.copy(alpha = 0.5f)
                ),
                shape = RoundedCornerShape(12.dp),
                enabled = !isLoading && email.isNotEmpty()
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        color = Color.White,
                        modifier = Modifier.size(24.dp),
                        strokeWidth = 2.dp
                    )
                } else {
                    Text(
                        text = "Send Reset Code",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            Spacer(modifier = Modifier.weight(1f))
        }
    }
}

/**
 * Reset Code Entry Screen - Matches iOS ResetCodeEntryView exactly
 *
 * Flow:
 * 1. User enters code received via email
 * 2. User enters new password
 * 3. User clicks "Reset Password"
 * 4. Password is reset, navigate back to login
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ResetCodeEntryScreen(
    email: String,
    onResetPasswordClick: (code: String, newPassword: String) -> Unit,
    onCancelClick: () -> Unit,
    isLoading: Boolean = false,
    errorMessage: String? = null,
    onSuccess: () -> Unit = {}
) {
    var resetCode by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { },
                actions = {
                    TextButton(onClick = onCancelClick) {
                        Text(
                            text = "Cancel",
                            color = BrandGreen,
                            fontWeight = FontWeight.Medium
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = BrandGrey
                )
            )
        },
        containerColor = BrandGrey
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 30.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(30.dp))

            // Title - Matches iOS
            Text(
                text = "Enter Reset Code",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = BrandBlack
            )

            Spacer(modifier = Modifier.height(25.dp))

            // Description - Matches iOS
            Text(
                text = "We sent a code to $email. Enter it below along with your new password.",
                fontSize = 14.sp,
                color = TextGrey,
                textAlign = TextAlign.Center,
                lineHeight = 20.sp
            )

            Spacer(modifier = Modifier.height(25.dp))

            // Reset Code Input - Matches iOS style
            OutlinedTextField(
                value = resetCode,
                onValueChange = { resetCode = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .shadow(
                        elevation = 2.dp,
                        shape = RoundedCornerShape(12.dp),
                        ambientColor = Color.Black.copy(alpha = 0.05f)
                    ),
                placeholder = { Text("Reset Code", color = TextGrey) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = Color.White,
                    unfocusedContainerColor = Color.White,
                    focusedBorderColor = BrandGreen,
                    unfocusedBorderColor = Color.Transparent
                ),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(16.dp))

            // New Password Input - Matches iOS style
            OutlinedTextField(
                value = newPassword,
                onValueChange = { newPassword = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .shadow(
                        elevation = 2.dp,
                        shape = RoundedCornerShape(12.dp),
                        ambientColor = Color.Black.copy(alpha = 0.05f)
                    ),
                placeholder = { Text("New Password", color = TextGrey) },
                leadingIcon = {
                    Icon(
                        Icons.Default.Lock,
                        contentDescription = null,
                        tint = TextGrey
                    )
                },
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = Color.White,
                    unfocusedContainerColor = Color.White,
                    focusedBorderColor = BrandGreen,
                    unfocusedBorderColor = Color.Transparent
                ),
                singleLine = true
            )

            // Error Message
            errorMessage?.let { error ->
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = error,
                    fontSize = 12.sp,
                    color = Color.Red,
                    textAlign = TextAlign.Center
                )
            }

            Spacer(modifier = Modifier.height(25.dp))

            // Reset Password Button - Matches iOS
            Button(
                onClick = { onResetPasswordClick(resetCode, newPassword) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = BrandGreen,
                    disabledContainerColor = BrandGreen.copy(alpha = 0.5f)
                ),
                shape = RoundedCornerShape(12.dp),
                enabled = !isLoading && resetCode.isNotEmpty() && newPassword.isNotEmpty()
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        color = Color.White,
                        modifier = Modifier.size(24.dp),
                        strokeWidth = 2.dp
                    )
                } else {
                    Text(
                        text = "Reset Password",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            Spacer(modifier = Modifier.weight(1f))
        }
    }
}

@Preview(showBackground = true)
@Composable
fun ForgotPasswordScreenPreview() {
    ForgotPasswordScreen(
        onSendCodeClick = { },
        onCancelClick = { }
    )
}

@Preview(showBackground = true)
@Composable
fun ResetCodeEntryScreenPreview() {
    ResetCodeEntryScreen(
        email = "user@example.com",
        onResetPasswordClick = { _, _ -> },
        onCancelClick = { }
    )
}
