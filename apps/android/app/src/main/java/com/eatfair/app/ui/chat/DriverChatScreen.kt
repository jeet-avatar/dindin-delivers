package com.eatfair.app.ui.chat

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.eatfair.app.ui.theme.DollorTheme
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

/**
 * DriverChatScreen - Matches iOS DriverChatView
 * Real-time chat with driver using backend API
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DriverChatScreen(
    driverName: String,
    driverPhoto: String?,
    orderId: String,
    onBackClick: () -> Unit,
    onCallDriver: () -> Unit,
    viewModel: ChatViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var messageText by remember { mutableStateOf("") }
    val listState = rememberLazyListState()
    val coroutineScope = rememberCoroutineScope()

    // Quick replies - matches iOS
    val quickReplies = listOf(
        "I'm outside waiting",
        "Please leave it at the door",
        "Please call me when you arrive",
        "Thank you! 🙏"
    )

    val timeFormat = SimpleDateFormat("h:mm a", Locale.getDefault())

    // Scroll to bottom when new messages arrive
    LaunchedEffect(uiState.messages.size) {
        if (uiState.messages.isNotEmpty()) {
            listState.animateScrollToItem(uiState.messages.size - 1)
        }
    }

    // Show error snackbar
    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(uiState.error) {
        uiState.error?.let { error ->
            snackbarHostState.showSnackbar(error)
            viewModel.clearError()
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            // Header - Matches iOS chatHeader
            Surface(
                color = Color.White,
                shadowElevation = 2.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onBackClick) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back"
                        )
                    }

                    // Driver avatar with online indicator - matches iOS
                    Box {
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .clip(CircleShape)
                                .background(DollorTheme.Brand.green),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = driverName.firstOrNull()?.uppercase() ?: "D",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }

                        // Online indicator
                        Box(
                            modifier = Modifier
                                .align(Alignment.BottomEnd)
                                .size(14.dp)
                                .clip(CircleShape)
                                .background(Color.White)
                                .padding(2.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .clip(CircleShape)
                                    .background(Color(0xFF4CAF50))
                            )
                        }
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = driverName,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 16.sp
                        )
                        Text(
                            text = "Your Driver",
                            fontSize = 12.sp,
                            color = Color.Gray
                        )
                    }

                    // Call button - matches iOS
                    IconButton(
                        onClick = onCallDriver,
                        modifier = Modifier
                            .size(44.dp)
                            .clip(CircleShape)
                            .background(DollorTheme.Brand.green)
                    ) {
                        Icon(
                            Icons.Default.Call,
                            contentDescription = "Call Driver",
                            tint = Color.White
                        )
                    }
                }
            }
        },
        bottomBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.White)
            ) {
                // Quick Replies - matches iOS quickActionsSection
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 8.dp)
                ) {
                    Text(
                        text = "Quick Messages",
                        fontSize = 12.sp,
                        color = Color.Gray,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        quickReplies.take(2).forEach { reply ->
                            QuickReplyChip(
                                text = reply,
                                onClick = {
                                    viewModel.sendMessage(reply)
                                },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        quickReplies.drop(2).forEach { reply ->
                            QuickReplyChip(
                                text = reply,
                                onClick = {
                                    viewModel.sendMessage(reply)
                                },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }

                HorizontalDivider()

                // Message Input - matches iOS messageInput
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = messageText,
                        onValueChange = { messageText = it },
                        modifier = Modifier.weight(1f),
                        placeholder = { Text("Message your driver...") },
                        singleLine = true,
                        shape = RoundedCornerShape(24.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = DollorTheme.Brand.green,
                            unfocusedBorderColor = Color(0xFFE0E0E0),
                            unfocusedContainerColor = Color(0xFFF5F5F5),
                            focusedContainerColor = Color(0xFFF5F5F5)
                        ),
                        trailingIcon = {
                            if (messageText.isNotEmpty()) {
                                IconButton(onClick = { messageText = "" }) {
                                    Icon(
                                        Icons.Default.Close,
                                        contentDescription = "Clear",
                                        tint = Color.Gray
                                    )
                                }
                            }
                        }
                    )

                    Spacer(modifier = Modifier.width(8.dp))

                    // Send button - matches iOS
                    IconButton(
                        onClick = {
                            if (messageText.isNotBlank()) {
                                viewModel.sendMessage(messageText)
                                messageText = ""
                            }
                        },
                        enabled = messageText.isNotBlank() && !uiState.isSending,
                        modifier = Modifier.size(48.dp)
                    ) {
                        Icon(
                            Icons.AutoMirrored.Filled.Send,
                            contentDescription = "Send",
                            tint = if (messageText.isNotBlank()) DollorTheme.Brand.green else Color.Gray,
                            modifier = Modifier.size(32.dp)
                        )
                    }
                }
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Color(0xFFF5F5F5))
        ) {
            // Loading indicator
            if (uiState.isLoading && uiState.messages.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator(color = DollorTheme.Brand.green)
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("Loading messages...", color = Color.Gray)
                    }
                }
            } else if (uiState.messages.isEmpty()) {
                // Empty state
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.padding(32.dp)
                    ) {
                        Icon(
                            Icons.Default.Chat,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = Color.Gray
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "No messages yet",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color.Gray
                        )
                        Text(
                            text = "Send a message to your driver",
                            fontSize = 14.sp,
                            color = Color.Gray
                        )
                    }
                }
            } else {
                // Messages - matches iOS messagesView
                LazyColumn(
                    state = listState,
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    contentPadding = PaddingValues(vertical = 12.dp)
                ) {
                    items(uiState.messages, key = { it.id }) { message ->
                        ChatBubble(
                            message = message,
                            timeFormat = timeFormat
                        )
                    }
                }
            }
        }
    }
}

/**
 * Quick Reply Chip - matches iOS QuickMessageButton
 */
@Composable
fun QuickReplyChip(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        onClick = onClick,
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        color = DollorTheme.Brand.green.copy(alpha = 0.1f)
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            fontSize = 12.sp,
            color = DollorTheme.Brand.green,
            maxLines = 1
        )
    }
}

/**
 * Chat Bubble - matches iOS MessageBubble
 */
@Composable
fun ChatBubble(
    message: ChatMessageUi,
    timeFormat: SimpleDateFormat
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = if (message.isFromCustomer) Alignment.End else Alignment.Start
    ) {
        Box(
            modifier = Modifier
                .widthIn(max = 280.dp)
                .clip(
                    RoundedCornerShape(
                        topStart = 20.dp,
                        topEnd = 20.dp,
                        bottomStart = if (message.isFromCustomer) 20.dp else 4.dp,
                        bottomEnd = if (message.isFromCustomer) 4.dp else 20.dp
                    )
                )
                .background(
                    if (message.isFromCustomer) DollorTheme.Brand.green else Color.White
                )
                .padding(horizontal = 16.dp, vertical = 10.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = message.text,
                    color = if (message.isFromCustomer) Color.White else Color.Black,
                    fontSize = 15.sp,
                    modifier = Modifier.weight(1f, fill = false)
                )

                // Pending indicator
                if (message.isPending) {
                    Spacer(modifier = Modifier.width(8.dp))
                    CircularProgressIndicator(
                        modifier = Modifier.size(12.dp),
                        strokeWidth = 1.dp,
                        color = Color.White.copy(alpha = 0.7f)
                    )
                }
            }
        }

        // Timestamp - matches iOS
        Text(
            text = timeFormat.format(Date(message.timestamp)),
            fontSize = 11.sp,
            color = Color.Gray,
            modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
        )
    }
}
