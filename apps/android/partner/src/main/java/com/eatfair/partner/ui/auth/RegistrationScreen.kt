package com.eatfair.partner.ui.auth

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.animateContentSize
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
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import kotlinx.coroutines.launch

// Brand Colors matching iOS and Web
private val DollorGold = Color(0xFFFFD700)
private val DollorDark = Color(0xFF1A1A2E)
private val BrandOrange = Color(0xFFF2994A)
private val BrandGreen = Color(0xFF06C167)
private val TextSecondary = Color(0xFF8E8E93)
private val BackgroundGrouped = Color(0xFFF2F2F7)

// Registration Steps matching Web and iOS exactly
enum class RegistrationStep(val title: String, val subtitle: String, val icon: ImageVector) {
    RESTAURANT_INFO("Restaurant", "Basic Info", Icons.Default.Store),
    CONTACT_LOCATION("Location", "Address", Icons.Default.LocationOn),
    OPERATIONS("Operations", "Hours & Services", Icons.Default.Schedule),
    REVIEW("Review", "Submit", Icons.Default.Description)
}

// Cuisine types matching Web
val cuisineTypes = listOf(
    "American", "Chinese", "Indian", "Italian", "Japanese",
    "Mexican", "Thai", "Mediterranean", "Fast Food", "Vietnamese",
    "Korean", "Greek", "French", "Spanish", "Other"
)

// US States
val usStates = listOf(
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
)

// Form Data State
data class RegistrationFormData(
    // Step 1: Restaurant Info
    val restaurantName: String = "",
    val cuisineType: String = "",
    val description: String = "",
    val contactName: String = "",
    val contactEmail: String = "",
    val contactPhone: String = "",
    val password: String = "",
    val confirmPassword: String = "",

    // Step 2: Contact & Location
    val streetAddress: String = "",
    val city: String = "",
    val state: String = "",
    val zipCode: String = "",
    val website: String = "",

    // Step 3: Operations
    val seatingCapacity: String = "50",
    val avgPrepTime: String = "25",
    val deliveryAvailable: Boolean = true,
    val pickupAvailable: Boolean = true,
    val mondayHours: String = "9:00 AM - 9:00 PM",
    val tuesdayHours: String = "9:00 AM - 9:00 PM",
    val wednesdayHours: String = "9:00 AM - 9:00 PM",
    val thursdayHours: String = "9:00 AM - 9:00 PM",
    val fridayHours: String = "9:00 AM - 10:00 PM",
    val saturdayHours: String = "10:00 AM - 10:00 PM",
    val sundayHours: String = "10:00 AM - 9:00 PM",

    // Step 4: Terms
    val acceptedTerms: Boolean = false,
    val acceptedPrivacy: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegistrationScreen(
    viewModel: RegistrationViewModel = hiltViewModel(),
    onRegistrationSuccess: () -> Unit,
    onBackClick: () -> Unit
) {
    var currentStep by remember { mutableStateOf(RegistrationStep.RESTAURANT_INFO) }
    var formData by remember { mutableStateOf(RegistrationFormData()) }
    val registrationState by viewModel.registrationState.collectAsState()
    val scrollState = rememberScrollState()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    // Handle registration success
    LaunchedEffect(registrationState) {
        when (registrationState) {
            is RegistrationState.Success -> onRegistrationSuccess()
            is RegistrationState.Error -> {
                scope.launch {
                    snackbarHostState.showSnackbar(
                        (registrationState as RegistrationState.Error).message
                    )
                }
            }
            else -> {}
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text("Partner Application", fontWeight = FontWeight.SemiBold) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(BackgroundGrouped)
        ) {
            // Step Progress Indicator
            StepProgressIndicator(
                currentStep = currentStep,
                modifier = Modifier.padding(16.dp)
            )

            // Content Area
            Box(modifier = Modifier.weight(1f)) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(scrollState)
                        .padding(16.dp)
                ) {
                    AnimatedContent(
                        targetState = currentStep,
                        label = "step_content"
                    ) { step ->
                        when (step) {
                            RegistrationStep.RESTAURANT_INFO -> Step1RestaurantInfo(
                                formData = formData,
                                onFormDataChange = { formData = it }
                            )
                            RegistrationStep.CONTACT_LOCATION -> Step2ContactLocation(
                                formData = formData,
                                onFormDataChange = { formData = it }
                            )
                            RegistrationStep.OPERATIONS -> Step3Operations(
                                formData = formData,
                                onFormDataChange = { formData = it }
                            )
                            RegistrationStep.REVIEW -> Step4Review(
                                formData = formData,
                                onFormDataChange = { formData = it }
                            )
                        }
                    }
                }
            }

            // Navigation Buttons
            NavigationButtons(
                currentStep = currentStep,
                isLoading = registrationState is RegistrationState.Loading,
                isStepValid = isStepValid(currentStep, formData),
                onBack = {
                    val previousStep = RegistrationStep.entries.getOrNull(currentStep.ordinal - 1)
                    if (previousStep != null) {
                        currentStep = previousStep
                    }
                },
                onNext = {
                    val nextStep = RegistrationStep.entries.getOrNull(currentStep.ordinal + 1)
                    if (nextStep != null) {
                        currentStep = nextStep
                    }
                },
                onSubmit = {
                    viewModel.registerVendor(formData)
                }
            )
        }
    }
}

// Step validation matching iOS and Web
private fun isStepValid(step: RegistrationStep, formData: RegistrationFormData): Boolean {
    return when (step) {
        RegistrationStep.RESTAURANT_INFO -> {
            formData.restaurantName.isNotBlank() &&
            formData.cuisineType.isNotBlank() &&
            formData.contactName.isNotBlank() &&
            formData.contactEmail.isNotBlank() &&
            formData.contactPhone.isNotBlank() &&
            formData.password.isNotBlank() &&
            formData.password == formData.confirmPassword &&
            formData.password.length >= 8 &&
            android.util.Patterns.EMAIL_ADDRESS.matcher(formData.contactEmail).matches()
        }
        RegistrationStep.CONTACT_LOCATION -> {
            formData.streetAddress.isNotBlank() &&
            formData.city.isNotBlank() &&
            formData.state.isNotBlank() &&
            formData.zipCode.isNotBlank()
        }
        RegistrationStep.OPERATIONS -> {
            formData.seatingCapacity.isNotBlank() &&
            formData.avgPrepTime.isNotBlank()
        }
        RegistrationStep.REVIEW -> {
            formData.acceptedTerms && formData.acceptedPrivacy
        }
    }
}

@Composable
private fun StepProgressIndicator(
    currentStep: RegistrationStep,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(Color.White, RoundedCornerShape(12.dp))
            .padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        RegistrationStep.entries.forEachIndexed { index, step ->
            val isCompleted = step.ordinal < currentStep.ordinal
            val isCurrent = step == currentStep

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.weight(1f)
            ) {
                // Step Circle
                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .clip(CircleShape)
                        .background(
                            when {
                                isCompleted -> DollorGold
                                isCurrent -> DollorGold
                                else -> Color.Gray.copy(alpha = 0.3f)
                            }
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    if (isCompleted) {
                        Icon(
                            Icons.Default.Check,
                            contentDescription = null,
                            tint = Color.Black,
                            modifier = Modifier.size(16.dp)
                        )
                    } else {
                        Icon(
                            step.icon,
                            contentDescription = null,
                            tint = if (isCurrent) Color.Black else Color.Gray,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = step.title,
                    fontSize = 10.sp,
                    fontWeight = if (isCurrent) FontWeight.SemiBold else FontWeight.Normal,
                    color = if (isCurrent || isCompleted) Color.Black else Color.Gray
                )
            }

            // Connector line
            if (index < RegistrationStep.entries.size - 1) {
                Box(
                    modifier = Modifier
                        .weight(0.5f)
                        .height(2.dp)
                        .background(
                            if (step.ordinal < currentStep.ordinal) DollorGold
                            else Color.Gray.copy(alpha = 0.3f)
                        )
                )
            }
        }
    }
}

@Composable
private fun NavigationButtons(
    currentStep: RegistrationStep,
    isLoading: Boolean,
    isStepValid: Boolean,
    onBack: () -> Unit,
    onNext: () -> Unit,
    onSubmit: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White)
            .padding(16.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Back Button
        if (currentStep != RegistrationStep.RESTAURANT_INFO) {
            OutlinedButton(
                onClick = onBack,
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Back")
            }
        }

        // Next/Submit Button
        Button(
            onClick = if (currentStep == RegistrationStep.REVIEW) onSubmit else onNext,
            modifier = Modifier.weight(1f),
            enabled = !isLoading && isStepValid,
            colors = ButtonDefaults.buttonColors(containerColor = DollorGold),
            shape = RoundedCornerShape(12.dp)
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    color = Color.Black,
                    modifier = Modifier.size(24.dp)
                )
            } else {
                Text(
                    if (currentStep == RegistrationStep.REVIEW) "Submit Application" else "Continue",
                    color = Color.Black,
                    fontWeight = FontWeight.Bold
                )
                if (currentStep != RegistrationStep.REVIEW) {
                    Spacer(modifier = Modifier.width(8.dp))
                    Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, tint = Color.Black)
                }
            }
        }
    }
}

// Step 1: Restaurant Info
@Composable
private fun Step1RestaurantInfo(
    formData: RegistrationFormData,
    onFormDataChange: (RegistrationFormData) -> Unit
) {
    var showCuisinePicker by remember { mutableStateOf(false) }
    var passwordVisible by remember { mutableStateOf(false) }
    var confirmPasswordVisible by remember { mutableStateOf(false) }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        // Header
        SectionHeader(
            title = "Restaurant Information",
            subtitle = "Tell us about your restaurant"
        )

        // Restaurant Name
        FormTextField(
            label = "Restaurant Name",
            value = formData.restaurantName,
            onValueChange = { onFormDataChange(formData.copy(restaurantName = it)) },
            icon = Icons.Default.Store,
            placeholder = "Enter restaurant name"
        )

        // Cuisine Type Dropdown
        FormDropdown(
            label = "Cuisine Type",
            value = formData.cuisineType,
            options = cuisineTypes,
            onValueChange = { onFormDataChange(formData.copy(cuisineType = it)) },
            icon = Icons.Default.Restaurant,
            placeholder = "Select cuisine type"
        )

        // Description
        FormTextField(
            label = "Description (Optional)",
            value = formData.description,
            onValueChange = { onFormDataChange(formData.copy(description = it)) },
            icon = Icons.Default.Description,
            placeholder = "Describe your restaurant",
            singleLine = false,
            minLines = 3
        )

        HorizontalDivider()

        SectionHeader(title = "Contact Information", subtitle = null)

        // Contact Name
        FormTextField(
            label = "Contact Name",
            value = formData.contactName,
            onValueChange = { onFormDataChange(formData.copy(contactName = it)) },
            icon = Icons.Default.Person,
            placeholder = "Full name"
        )

        // Contact Email
        FormTextField(
            label = "Email Address",
            value = formData.contactEmail,
            onValueChange = { onFormDataChange(formData.copy(contactEmail = it)) },
            icon = Icons.Default.Email,
            placeholder = "email@example.com",
            keyboardType = KeyboardType.Email
        )

        // Contact Phone
        FormTextField(
            label = "Phone Number",
            value = formData.contactPhone,
            onValueChange = { onFormDataChange(formData.copy(contactPhone = it)) },
            icon = Icons.Default.Phone,
            placeholder = "(555) 123-4567",
            keyboardType = KeyboardType.Phone
        )

        HorizontalDivider()

        SectionHeader(title = "Account Security", subtitle = null)

        // Password
        FormTextField(
            label = "Password",
            value = formData.password,
            onValueChange = { onFormDataChange(formData.copy(password = it)) },
            icon = Icons.Default.Lock,
            placeholder = "At least 8 characters",
            isPassword = true,
            passwordVisible = passwordVisible,
            onPasswordVisibilityChange = { passwordVisible = it }
        )

        // Confirm Password
        FormTextField(
            label = "Confirm Password",
            value = formData.confirmPassword,
            onValueChange = { onFormDataChange(formData.copy(confirmPassword = it)) },
            icon = Icons.Default.Lock,
            placeholder = "Confirm your password",
            isPassword = true,
            passwordVisible = confirmPasswordVisible,
            onPasswordVisibilityChange = { confirmPasswordVisible = it }
        )

        // Password validation messages
        if (formData.password.isNotEmpty() && formData.password.length < 8) {
            Text(
                "Password must be at least 8 characters",
                color = BrandOrange,
                fontSize = 12.sp
            )
        }
        if (formData.confirmPassword.isNotEmpty() && formData.password != formData.confirmPassword) {
            Text(
                "Passwords do not match",
                color = Color.Red,
                fontSize = 12.sp
            )
        }

        Spacer(modifier = Modifier.height(60.dp))
    }
}

// Step 2: Contact & Location
@Composable
private fun Step2ContactLocation(
    formData: RegistrationFormData,
    onFormDataChange: (RegistrationFormData) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        SectionHeader(
            title = "Restaurant Location",
            subtitle = "Where is your restaurant located?"
        )

        // Street Address
        FormTextField(
            label = "Street Address",
            value = formData.streetAddress,
            onValueChange = { onFormDataChange(formData.copy(streetAddress = it)) },
            icon = Icons.Default.LocationOn,
            placeholder = "123 Main Street"
        )

        // City
        FormTextField(
            label = "City",
            value = formData.city,
            onValueChange = { onFormDataChange(formData.copy(city = it)) },
            icon = Icons.Default.LocationCity,
            placeholder = "City"
        )

        // State Dropdown
        FormDropdown(
            label = "State",
            value = formData.state,
            options = usStates,
            onValueChange = { onFormDataChange(formData.copy(state = it)) },
            icon = Icons.Default.Map,
            placeholder = "Select state"
        )

        // ZIP Code
        FormTextField(
            label = "ZIP Code",
            value = formData.zipCode,
            onValueChange = { onFormDataChange(formData.copy(zipCode = it)) },
            icon = Icons.Default.Pin,
            placeholder = "12345",
            keyboardType = KeyboardType.Number
        )

        HorizontalDivider()

        // Website (Optional)
        FormTextField(
            label = "Website (Optional)",
            value = formData.website,
            onValueChange = { onFormDataChange(formData.copy(website = it)) },
            icon = Icons.Default.Language,
            placeholder = "https://yourrestaurant.com",
            keyboardType = KeyboardType.Uri
        )

        Spacer(modifier = Modifier.height(60.dp))
    }
}

// Step 3: Operations
@Composable
private fun Step3Operations(
    formData: RegistrationFormData,
    onFormDataChange: (RegistrationFormData) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        SectionHeader(
            title = "Operations",
            subtitle = "Set up your restaurant's operational details"
        )

        // Seating Capacity
        FormTextField(
            label = "Seating Capacity",
            value = formData.seatingCapacity,
            onValueChange = { onFormDataChange(formData.copy(seatingCapacity = it)) },
            icon = Icons.Default.Groups,
            placeholder = "50",
            keyboardType = KeyboardType.Number
        )

        // Average Prep Time
        FormTextField(
            label = "Average Prep Time (minutes)",
            value = formData.avgPrepTime,
            onValueChange = { onFormDataChange(formData.copy(avgPrepTime = it)) },
            icon = Icons.Default.Timer,
            placeholder = "25",
            keyboardType = KeyboardType.Number
        )

        HorizontalDivider()

        SectionHeader(title = "Services Offered", subtitle = null)

        // Delivery Toggle
        ToggleRow(
            label = "Delivery Available",
            icon = Icons.Default.DeliveryDining,
            iconColor = BrandOrange,
            checked = formData.deliveryAvailable,
            onCheckedChange = { onFormDataChange(formData.copy(deliveryAvailable = it)) }
        )

        // Pickup Toggle
        ToggleRow(
            label = "Pickup Available",
            icon = Icons.Default.ShoppingBag,
            iconColor = BrandGreen,
            checked = formData.pickupAvailable,
            onCheckedChange = { onFormDataChange(formData.copy(pickupAvailable = it)) }
        )

        HorizontalDivider()

        SectionHeader(title = "Operating Hours", subtitle = null)

        // Operating Hours
        OperatingHoursRow("Monday", formData.mondayHours) {
            onFormDataChange(formData.copy(mondayHours = it))
        }
        OperatingHoursRow("Tuesday", formData.tuesdayHours) {
            onFormDataChange(formData.copy(tuesdayHours = it))
        }
        OperatingHoursRow("Wednesday", formData.wednesdayHours) {
            onFormDataChange(formData.copy(wednesdayHours = it))
        }
        OperatingHoursRow("Thursday", formData.thursdayHours) {
            onFormDataChange(formData.copy(thursdayHours = it))
        }
        OperatingHoursRow("Friday", formData.fridayHours) {
            onFormDataChange(formData.copy(fridayHours = it))
        }
        OperatingHoursRow("Saturday", formData.saturdayHours) {
            onFormDataChange(formData.copy(saturdayHours = it))
        }
        OperatingHoursRow("Sunday", formData.sundayHours) {
            onFormDataChange(formData.copy(sundayHours = it))
        }

        Spacer(modifier = Modifier.height(60.dp))
    }
}

// Step 4: Review
@Composable
private fun Step4Review(
    formData: RegistrationFormData,
    onFormDataChange: (RegistrationFormData) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        SectionHeader(
            title = "Review & Submit",
            subtitle = "Please review your information before submitting"
        )

        // Summary Card
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            color = Color.White
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                ReviewSection("Restaurant", listOf(
                    "Name" to formData.restaurantName,
                    "Cuisine" to formData.cuisineType,
                    "Description" to formData.description.ifEmpty { "Not provided" }
                ))

                HorizontalDivider()

                ReviewSection("Contact", listOf(
                    "Name" to formData.contactName,
                    "Email" to formData.contactEmail,
                    "Phone" to formData.contactPhone
                ))

                HorizontalDivider()

                ReviewSection("Location", listOf(
                    "Address" to formData.streetAddress,
                    "City" to "${formData.city}, ${formData.state} ${formData.zipCode}",
                    "Website" to formData.website.ifEmpty { "Not provided" }
                ))

                HorizontalDivider()

                ReviewSection("Operations", listOf(
                    "Seating" to "${formData.seatingCapacity} seats",
                    "Prep Time" to "${formData.avgPrepTime} minutes",
                    "Delivery" to if (formData.deliveryAvailable) "Available" else "Not available",
                    "Pickup" to if (formData.pickupAvailable) "Available" else "Not available"
                ))
            }
        }

        // Pricing Info
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            color = DollorGold.copy(alpha = 0.1f)
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.AttachMoney,
                    contentDescription = null,
                    tint = DollorGold,
                    modifier = Modifier.size(32.dp)
                )
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        "Just \$1 Per Order",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp
                    )
                    Text(
                        "No percentage commission - keep more of your profits!",
                        color = TextSecondary,
                        fontSize = 12.sp
                    )
                }
            }
        }

        HorizontalDivider()

        SectionHeader(title = "Legal Agreements", subtitle = null)

        // Terms Toggle
        ToggleRow(
            label = "I accept the Terms of Service",
            icon = if (formData.acceptedTerms) Icons.Default.CheckBox else Icons.Default.CheckBoxOutlineBlank,
            iconColor = if (formData.acceptedTerms) BrandGreen else Color.Gray,
            checked = formData.acceptedTerms,
            onCheckedChange = { onFormDataChange(formData.copy(acceptedTerms = it)) }
        )

        // Privacy Toggle
        ToggleRow(
            label = "I accept the Privacy Policy",
            icon = if (formData.acceptedPrivacy) Icons.Default.CheckBox else Icons.Default.CheckBoxOutlineBlank,
            iconColor = if (formData.acceptedPrivacy) BrandGreen else Color.Gray,
            checked = formData.acceptedPrivacy,
            onCheckedChange = { onFormDataChange(formData.copy(acceptedPrivacy = it)) }
        )

        Text(
            "By submitting, you agree to our matchmaking platform terms. Dollor.ai connects restaurants with customers and independent delivery partners.",
            color = TextSecondary,
            fontSize = 12.sp
        )

        Spacer(modifier = Modifier.height(60.dp))
    }
}

// Reusable Components
@Composable
private fun SectionHeader(title: String, subtitle: String?) {
    Column {
        Text(
            text = title,
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold
        )
        if (subtitle != null) {
            Text(
                text = subtitle,
                fontSize = 14.sp,
                color = TextSecondary
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FormTextField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    icon: ImageVector,
    placeholder: String,
    keyboardType: KeyboardType = KeyboardType.Text,
    singleLine: Boolean = true,
    minLines: Int = 1,
    isPassword: Boolean = false,
    passwordVisible: Boolean = false,
    onPasswordVisibilityChange: ((Boolean) -> Unit)? = null
) {
    Column {
        Text(
            text = label,
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium,
            color = TextSecondary
        )
        Spacer(modifier = Modifier.height(8.dp))
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text(placeholder, color = TextSecondary) },
            leadingIcon = { Icon(icon, contentDescription = null, tint = TextSecondary) },
            trailingIcon = if (isPassword && onPasswordVisibilityChange != null) {
                {
                    IconButton(onClick = { onPasswordVisibilityChange(!passwordVisible) }) {
                        Icon(
                            if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                            contentDescription = null
                        )
                    }
                }
            } else null,
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
            visualTransformation = if (isPassword && !passwordVisible) PasswordVisualTransformation() else VisualTransformation.None,
            singleLine = singleLine,
            minLines = minLines,
            shape = RoundedCornerShape(10.dp),
            colors = OutlinedTextFieldDefaults.colors(
                unfocusedContainerColor = Color.White,
                focusedContainerColor = Color.White
            )
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FormDropdown(
    label: String,
    value: String,
    options: List<String>,
    onValueChange: (String) -> Unit,
    icon: ImageVector,
    placeholder: String
) {
    var expanded by remember { mutableStateOf(false) }

    Column {
        Text(
            text = label,
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium,
            color = TextSecondary
        )
        Spacer(modifier = Modifier.height(8.dp))
        ExposedDropdownMenuBox(
            expanded = expanded,
            onExpandedChange = { expanded = it }
        ) {
            OutlinedTextField(
                value = value,
                onValueChange = {},
                modifier = Modifier
                    .fillMaxWidth()
                    .menuAnchor(),
                readOnly = true,
                placeholder = { Text(placeholder, color = TextSecondary) },
                leadingIcon = { Icon(icon, contentDescription = null, tint = TextSecondary) },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                shape = RoundedCornerShape(10.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    unfocusedContainerColor = Color.White,
                    focusedContainerColor = Color.White
                )
            )
            ExposedDropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false }
            ) {
                options.forEach { option ->
                    DropdownMenuItem(
                        text = { Text(option) },
                        onClick = {
                            onValueChange(option)
                            expanded = false
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun ToggleRow(
    label: String,
    icon: ImageVector,
    iconColor: Color,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(10.dp),
        color = Color.White
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(icon, contentDescription = null, tint = iconColor)
                Spacer(modifier = Modifier.width(12.dp))
                Text(label)
            }
            Switch(
                checked = checked,
                onCheckedChange = onCheckedChange,
                colors = SwitchDefaults.colors(
                    checkedTrackColor = BrandGreen
                )
            )
        }
    }
}

@Composable
private fun OperatingHoursRow(
    day: String,
    hours: String,
    onHoursChange: (String) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = day,
            modifier = Modifier.width(100.dp),
            fontSize = 14.sp
        )
        OutlinedTextField(
            value = hours,
            onValueChange = onHoursChange,
            modifier = Modifier.weight(1f),
            placeholder = { Text("9:00 AM - 9:00 PM") },
            singleLine = true,
            shape = RoundedCornerShape(8.dp),
            colors = OutlinedTextFieldDefaults.colors(
                unfocusedContainerColor = Color.White,
                focusedContainerColor = Color.White
            )
        )
    }
}

@Composable
private fun ReviewSection(title: String, items: List<Pair<String, String>>) {
    Column {
        Text(
            text = title,
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
            color = TextSecondary
        )
        Spacer(modifier = Modifier.height(8.dp))
        items.forEach { (label, value) ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(text = label, color = TextSecondary, fontSize = 14.sp)
                Text(
                    text = value,
                    fontWeight = FontWeight.Medium,
                    fontSize = 14.sp,
                    textAlign = TextAlign.End,
                    modifier = Modifier.weight(1f, fill = false)
                )
            }
        }
    }
}
