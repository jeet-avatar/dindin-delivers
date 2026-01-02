package com.eatfair.app.ui.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.eatfair.shared.model.LanguageDto

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LanguageScreen(
    languages: List<LanguageDto> = emptyList(),
    onBackClick: () -> Unit = {},
    onLanguageSelect: (LanguageDto) -> Unit = {}
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFFFF5F7))
    ) {
        // Top App Bar
        TopAppBar(
            title = {
                Text(
                    text = "Language",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.Black,
                    modifier = Modifier.fillMaxWidth(),
                    textAlign = TextAlign.Center
                )
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
                Spacer(modifier = Modifier.width(48.dp))
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = Color(0xFFFFF5F7)
            )
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
        ) {
            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "Select your preferred language",
                fontSize = 14.sp,
                color = Color.Gray,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            languages.forEach { language ->
                LanguageItem(
                    language = language,
                    onClick = { onLanguageSelect(language) }
                )
                Spacer(modifier = Modifier.height(12.dp))
            }

            Spacer(modifier = Modifier.height(100.dp))
        }
    }
}

@Composable
fun LanguageItem(
    language: LanguageDto,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = if (language.isSelected) Color(0xFFF3E8FF) else Color.White
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text(
                    text = language.name,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.Black
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = language.nativeName,
                    fontSize = 13.sp,
                    color = Color.Gray
                )
            }

            if (language.isSelected) {
                Icon(
                    imageVector = Icons.Filled.Check,
                    contentDescription = "Selected",
                    tint = Color(0xFF8B5CF6),
                    modifier = Modifier.size(24.dp)
                )
            }
        }
    }
}


// Sample data for Language Screen
fun getSampleLanguages(): List<LanguageDto> {
    return listOf(
        LanguageDto("en", "English", "English", isSelected = true),
        LanguageDto("es", "Spanish", "Español"),
        LanguageDto("fr", "French", "Français"),
        LanguageDto("de", "German", "Deutsch"),
        LanguageDto("it", "Italian", "Italiano"),
        LanguageDto("pt", "Portuguese", "Português"),
        LanguageDto("zh", "Chinese", "中文"),
        LanguageDto("ja", "Japanese", "日本語"),
        LanguageDto("ko", "Korean", "한국어"),
        LanguageDto("ar", "Arabic", "العربية")
    )
}