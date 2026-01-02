package com.eatfair.app.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.LocationSearching
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

sealed class LocationAction {
    object UseCurrentLocation : LocationAction()
    object AddNewAddress : LocationAction()
    object BrowseCities : LocationAction()
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LocationBottomSheet(
    isOpen: Boolean,
    onDismissRequest: () -> Unit,
    onItemClick: (LocationAction) -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    if (isOpen) {
        ModalBottomSheet(
            onDismissRequest = onDismissRequest,
            sheetState = sheetState,
            dragHandle = null
        ) {
            Column(modifier = Modifier.padding(bottom = 6.dp, top = 12.dp)) {

                // --- HEADER: Title and Close Button ---
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Location",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Medium,
                    )
                    IconButton(
                        onClick = onDismissRequest,
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(color = MaterialTheme.colorScheme.surface)
                    ) {
                        Icon(Icons.Filled.Close, contentDescription = "Close")
                    }
                }

                Spacer(Modifier.height(16.dp))

                LocationSheetItem(
                    icon = Icons.Outlined.LocationSearching,
                    text = "Use my current location",
                    onClick = { onItemClick(LocationAction.UseCurrentLocation) }
                )

                // Divider lines between items
                HorizontalDivider(Modifier.padding(horizontal = 16.dp))

                LocationSheetItem(
                    icon = Icons.Outlined.Add,
                    text = "Add new address",
                    onClick = { onItemClick(LocationAction.AddNewAddress) }
                )

                HorizontalDivider(Modifier.padding(horizontal = 16.dp))

                LocationSheetItem(
                    icon = Icons.Outlined.Place,
                    text = "Browse all options",
                    onClick = { onItemClick(LocationAction.BrowseCities) }
                )
            }
        }
    }
}

// Reusable Composable for a single list item
@Composable
fun LocationSheetItem(
    icon: ImageVector,
    text: String,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = text,
            modifier = Modifier.size(24.dp)
        )
        Spacer(Modifier.width(20.dp))
        Text(
            text = text,
            fontSize = 16.sp
        )
    }
}

@Preview(showBackground = true)
@Composable
fun LocBSPreview() {
    LocationBottomSheet(true, {}, {})
}