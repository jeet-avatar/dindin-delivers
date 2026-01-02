package com.eatfair.app.ui.search

import android.Manifest
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MicOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import java.util.Locale

/**
 * Voice Search Dialog
 * Matches iOS VoiceSearchSheet for platform parity
 * Uses Android SpeechRecognizer for voice-to-text
 */

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VoiceSearchDialog(
    onDismiss: () -> Unit,
    onSearchResult: (String) -> Unit
) {
    val context = LocalContext.current
    var isListening by remember { mutableStateOf(false) }
    var transcribedText by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var hasPermission by remember { mutableStateOf(false) }

    // Permission launcher
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        hasPermission = granted
        if (!granted) {
            errorMessage = "Microphone permission required for voice search"
        }
    }

    // Speech recognizer
    val speechRecognizer = remember { SpeechRecognizer.createSpeechRecognizer(context) }

    DisposableEffect(Unit) {
        permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)

        val listener = object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {
                isListening = true
                errorMessage = null
            }

            override fun onBeginningOfSpeech() {}

            override fun onRmsChanged(rmsdB: Float) {}

            override fun onBufferReceived(buffer: ByteArray?) {}

            override fun onEndOfSpeech() {
                isListening = false
            }

            override fun onError(error: Int) {
                isListening = false
                errorMessage = when (error) {
                    SpeechRecognizer.ERROR_NO_MATCH -> "No speech detected. Please try again."
                    SpeechRecognizer.ERROR_NETWORK -> "Network error. Please check connection."
                    SpeechRecognizer.ERROR_AUDIO -> "Audio recording error."
                    else -> "Voice recognition error. Please try again."
                }
            }

            override fun onResults(results: Bundle?) {
                val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                if (!matches.isNullOrEmpty()) {
                    transcribedText = matches[0]
                }
                isListening = false
            }

            override fun onPartialResults(partialResults: Bundle?) {
                val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                if (!matches.isNullOrEmpty()) {
                    transcribedText = matches[0]
                }
            }

            override fun onEvent(eventType: Int, params: Bundle?) {}
        }

        speechRecognizer.setRecognitionListener(listener)

        onDispose {
            speechRecognizer.destroy()
        }
    }

    fun startListening() {
        if (!hasPermission) {
            permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
            return
        }

        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
        }

        transcribedText = ""
        errorMessage = null
        speechRecognizer.startListening(intent)
    }

    fun stopListening() {
        speechRecognizer.stopListening()
        isListening = false
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = Color.White,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Voice Search",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black
                )

                IconButton(onClick = onDismiss) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = "Close",
                        tint = Color.Gray
                    )
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Mic Button with Animation
            VoiceMicButton(
                isListening = isListening,
                onClick = {
                    if (isListening) {
                        stopListening()
                    } else {
                        startListening()
                    }
                }
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Status Text
            Text(
                text = when {
                    isListening -> "Listening..."
                    transcribedText.isNotEmpty() -> "\"$transcribedText\""
                    errorMessage != null -> errorMessage!!
                    else -> "Tap the microphone and say what you're looking for"
                },
                fontSize = 16.sp,
                color = if (errorMessage != null) Color(0xFFE53935) else Color.Gray,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 16.dp)
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Search Button (when text is available)
            if (transcribedText.isNotEmpty()) {
                Button(
                    onClick = {
                        onSearchResult(transcribedText)
                        onDismiss()
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFFFF6B35)
                    )
                ) {
                    Text(
                        text = "Search for \"$transcribedText\"",
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 16.sp
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                TextButton(onClick = { startListening() }) {
                    Text(
                        text = "Try Again",
                        color = Color(0xFFFF6B35)
                    )
                }
            }

            // Quick Suggestions
            if (!isListening && transcribedText.isEmpty()) {
                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "Try saying:",
                    fontSize = 14.sp,
                    color = Color.Gray
                )

                Spacer(modifier = Modifier.height(8.dp))

                Column(
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf(
                        "Pizza near me",
                        "Indian food",
                        "Coffee shops",
                        "Healthy salads"
                    ).forEach { suggestion ->
                        SuggestionChip(
                            onClick = {
                                onSearchResult(suggestion)
                                onDismiss()
                            },
                            label = { Text(suggestion) },
                            colors = SuggestionChipDefaults.suggestionChipColors(
                                containerColor = Color(0xFFF5F5F5)
                            )
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
fun VoiceMicButton(
    isListening: Boolean,
    onClick: () -> Unit
) {
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")

    val scale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = if (isListening) 1.2f else 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(600, easing = EaseInOut),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseScale"
    )

    val alpha by infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = if (isListening) 0.8f else 0.3f,
        animationSpec = infiniteRepeatable(
            animation = tween(600, easing = EaseInOut),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseAlpha"
    )

    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier.size(120.dp)
    ) {
        // Pulse ring (when listening)
        if (isListening) {
            Box(
                modifier = Modifier
                    .size(120.dp)
                    .scale(scale)
                    .background(
                        Color(0xFFFF6B35).copy(alpha = alpha),
                        CircleShape
                    )
            )
        }

        // Main button
        FilledIconButton(
            onClick = onClick,
            modifier = Modifier.size(80.dp),
            colors = IconButtonDefaults.filledIconButtonColors(
                containerColor = if (isListening) Color(0xFFFF6B35) else Color(0xFFF5F5F5)
            )
        ) {
            Icon(
                imageVector = if (isListening) Icons.Default.Mic else Icons.Default.MicOff,
                contentDescription = if (isListening) "Stop listening" else "Start listening",
                modifier = Modifier.size(36.dp),
                tint = if (isListening) Color.White else Color(0xFFFF6B35)
            )
        }
    }
}
