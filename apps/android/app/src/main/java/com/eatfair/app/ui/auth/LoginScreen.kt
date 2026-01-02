package com.eatfair.app.ui.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.eatfair.app.ui.components.DollorLogo
import com.eatfair.app.ui.components.DollorBrandColors

// Brand Colors - Enterprise Orange Theme
private val PrimaryOrange = DollorBrandColors.PrimaryOrange  // Vibrant orange
private val DarkOrange = DollorBrandColors.DarkOrange
private val TextPrimary = Color(0xFF202123)
private val TextSecondary = Color(0xFF6E6E80)
private val BorderColor = Color(0xFFC5C5D2)
private val BackgroundWhite = Color(0xFFFFFFFF)
private val BackgroundGrey = Color(0xFFF7F7F8)

@Preview(showBackground = true)
@Composable
fun LoginScreenPreview() {
    LoginScreen(
        onLoginClick = { _, _ -> },
        onSignUpClick = { _, _, _, _ -> },
        onGoogleSignInClick = { },
        onAppleSignInClick = { },
        onForgotPasswordClick = { }
    )
}

@Composable
fun LoginScreen(
    onLoginClick: (email: String, password: String) -> Unit,
    onSignUpClick: (email: String, password: String, fullName: String, phone: String) -> Unit,
    onGoogleSignInClick: () -> Unit = {},
    onAppleSignInClick: () -> Unit = {},
    onForgotPasswordClick: () -> Unit = {},
    onTermsClick: () -> Unit = {},
    onPrivacyClick: () -> Unit = {},
    isLoading: Boolean = false,
    isGoogleLoading: Boolean = false,
    isAppleLoading: Boolean = false,
    errorMessage: String? = null
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isSignUp by remember { mutableStateOf(false) }
    var fullName by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var validationError by remember { mutableStateOf<String?>(null) }

    // Validation functions
    fun isValidEmail(email: String): Boolean {
        return android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()
    }

    fun validateLogin(): String? {
        return when {
            email.isBlank() -> "Please enter your email address"
            !isValidEmail(email) -> "Please enter a valid email address"
            password.isBlank() -> "Please enter your password"
            password.length < 6 -> "Password must be at least 6 characters"
            else -> null
        }
    }

    fun validateSignUp(): String? {
        return when {
            fullName.isBlank() -> "Please enter your full name"
            fullName.length < 2 -> "Name must be at least 2 characters"
            phone.isBlank() -> "Please enter your phone number"
            phone.length < 10 -> "Please enter a valid phone number"
            email.isBlank() -> "Please enter your email address"
            !isValidEmail(email) -> "Please enter a valid email address"
            password.isBlank() -> "Please enter your password"
            password.length < 6 -> "Password must be at least 6 characters"
            else -> null
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundWhite)
            .systemBarsPadding()
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(20.dp))

            // Logo Section - Smiley with $$ eyes
            DollorLogo(
                size = 60.dp,
                backgroundColor = PrimaryOrange,
                contentColor = Color.White
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Dollor.ai",
                fontSize = 22.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary,
                letterSpacing = (-0.5).sp
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Header
            Text(
                text = if (isSignUp) "Create your account" else "Welcome back",
                fontSize = 24.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary,
                letterSpacing = (-0.5).sp
            )

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = if (isSignUp) "Start riding with just \$1 platform fee" else "Log in to continue to Dollor.ai",
                fontSize = 14.sp,
                color = TextSecondary,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(20.dp))

            // Social Login Buttons
            // Apple Sign In Button (Black)
            Button(
                onClick = onAppleSignInClick,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color.Black
                ),
                shape = RoundedCornerShape(6.dp),
                enabled = !isAppleLoading && !isLoading
            ) {
                if (isAppleLoading) {
                    CircularProgressIndicator(
                        color = Color.White,
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp
                    )
                } else {
                    Row(
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Apple Logo (simplified)
                        Text(
                            text = "\uF8FF", // Apple logo unicode
                            fontSize = 18.sp,
                            color = Color.White,
                            fontWeight = FontWeight.Normal
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = "Continue with Apple",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color.White
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Google Sign In Button (White with border)
            OutlinedButton(
                onClick = onGoogleSignInClick,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                shape = RoundedCornerShape(6.dp),
                colors = ButtonDefaults.outlinedButtonColors(
                    containerColor = BackgroundWhite
                ),
                border = androidx.compose.foundation.BorderStroke(1.dp, BorderColor),
                enabled = !isGoogleLoading && !isLoading
            ) {
                if (isGoogleLoading) {
                    CircularProgressIndicator(
                        color = PrimaryOrange,
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp
                    )
                } else {
                    Row(
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Google Logo Colors
                        Text(
                            text = "G",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFDB4437) // Google Red
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = "Continue with Google",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Medium,
                            color = TextPrimary
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Divider with "or"
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Divider(
                    modifier = Modifier.weight(1f),
                    color = BorderColor,
                    thickness = 1.dp
                )
                Text(
                    text = "or",
                    modifier = Modifier.padding(horizontal = 16.dp),
                    fontSize = 13.sp,
                    color = TextSecondary
                )
                Divider(
                    modifier = Modifier.weight(1f),
                    color = BorderColor,
                    thickness = 1.dp
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Input Fields
            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (isSignUp) {
                    // Full Name Field
                    OutlinedTextField(
                        value = fullName,
                        onValueChange = { fullName = it },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("Full name", color = TextSecondary) },
                        leadingIcon = {
                            Icon(Icons.Default.Person, contentDescription = null, tint = TextSecondary)
                        },
                        shape = RoundedCornerShape(6.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary,
                            cursorColor = PrimaryOrange,
                            focusedContainerColor = BackgroundWhite,
                            unfocusedContainerColor = BackgroundWhite,
                            focusedBorderColor = PrimaryOrange,
                            unfocusedBorderColor = BorderColor
                        ),
                        singleLine = true
                    )

                    // Phone Field
                    OutlinedTextField(
                        value = phone,
                        onValueChange = { phone = it },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("Phone number", color = TextSecondary) },
                        leadingIcon = {
                            Icon(Icons.Default.Phone, contentDescription = null, tint = TextSecondary)
                        },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                        shape = RoundedCornerShape(6.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary,
                            cursorColor = PrimaryOrange,
                            focusedContainerColor = BackgroundWhite,
                            unfocusedContainerColor = BackgroundWhite,
                            focusedBorderColor = PrimaryOrange,
                            unfocusedBorderColor = BorderColor
                        ),
                        singleLine = true
                    )
                }

                // Email Field
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("Email address", color = TextSecondary) },
                    leadingIcon = {
                        Icon(Icons.Default.Email, contentDescription = null, tint = TextSecondary)
                    },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    shape = RoundedCornerShape(6.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                        cursorColor = PrimaryOrange,
                        focusedContainerColor = BackgroundWhite,
                        unfocusedContainerColor = BackgroundWhite,
                        focusedBorderColor = PrimaryOrange,
                        unfocusedBorderColor = BorderColor
                    ),
                    singleLine = true
                )

                // Password Field
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("Password", color = TextSecondary) },
                    leadingIcon = {
                        Icon(Icons.Default.Lock, contentDescription = null, tint = TextSecondary)
                    },
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    shape = RoundedCornerShape(6.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                        cursorColor = PrimaryOrange,
                        focusedContainerColor = BackgroundWhite,
                        unfocusedContainerColor = BackgroundWhite,
                        focusedBorderColor = PrimaryOrange,
                        unfocusedBorderColor = BorderColor
                    ),
                    singleLine = true
                )
            }

            // Forgot Password (only show on login)
            if (!isSignUp) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    TextButton(onClick = onForgotPasswordClick) {
                        Text(
                            text = "Forgot password?",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                            color = PrimaryOrange
                        )
                    }
                }
            } else {
                Spacer(modifier = Modifier.height(16.dp))
            }

            // Login/Sign Up Button
            Button(
                onClick = {
                    validationError = null // Clear previous validation error
                    if (isSignUp) {
                        val error = validateSignUp()
                        if (error != null) {
                            validationError = error
                        } else {
                            onSignUpClick(email, password, fullName, phone)
                        }
                    } else {
                        val error = validateLogin()
                        if (error != null) {
                            validationError = error
                        } else {
                            onLoginClick(email, password)
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = PrimaryOrange
                ),
                shape = RoundedCornerShape(6.dp),
                enabled = !isLoading
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        color = Color.White,
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp
                    )
                } else {
                    Text(
                        text = if (isSignUp) "Create account" else "Continue",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            // Error Message (validation or API error)
            val displayError = validationError ?: errorMessage
            displayError?.let { error ->
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = error,
                    fontSize = 14.sp,
                    color = Color(0xFFEF4444),
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Toggle Login/Sign Up
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = if (isSignUp) "Already have an account?" else "Don't have an account?",
                    fontSize = 14.sp,
                    color = TextSecondary
                )
                TextButton(
                    onClick = { isSignUp = !isSignUp }
                ) {
                    Text(
                        text = if (isSignUp) "Log in" else "Sign up",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = PrimaryOrange
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Fee Info Badge
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(BackgroundGrey)
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .clip(CircleShape)
                        .background(PrimaryOrange),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "$1",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = "flat platform fee. 100% tips go to drivers.",
                    fontSize = 12.sp,
                    color = TextSecondary
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Footer Links - Clickable for legal compliance
            Row(
                modifier = Modifier.padding(bottom = 16.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Terms of Use",
                    fontSize = 12.sp,
                    color = PrimaryOrange,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.clickable { onTermsClick() }
                )
                Text(
                    text = " · ",
                    fontSize = 12.sp,
                    color = BorderColor
                )
                Text(
                    text = "Privacy Policy",
                    fontSize = 12.sp,
                    color = PrimaryOrange,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.clickable { onPrivacyClick() }
                )
            }
        }
    }
}
