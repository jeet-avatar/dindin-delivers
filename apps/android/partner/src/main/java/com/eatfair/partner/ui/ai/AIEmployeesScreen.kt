package com.eatfair.partner.ui.ai

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

data class AIEmployee(
    val id: String,
    val name: String,
    val role: String,
    val description: String,
    val isActive: Boolean,
    val tasksCompleted: Int,
    val efficiency: Int, // percentage
    val icon: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AIEmployeesScreen(
    onBackClick: () -> Unit
) {
    val aiEmployees = remember {
        listOf(
            AIEmployee(
                id = "1",
                name = "Order Manager",
                role = "Order Processing",
                description = "Automatically accepts orders, manages queues, and optimizes preparation timing",
                isActive = true,
                tasksCompleted = 1247,
                efficiency = 98,
                icon = "receipt"
            ),
            AIEmployee(
                id = "2",
                name = "Inventory Assistant",
                role = "Stock Management",
                description = "Tracks ingredient usage, predicts shortages, and suggests reorder times",
                isActive = true,
                tasksCompleted = 856,
                efficiency = 95,
                icon = "inventory"
            ),
            AIEmployee(
                id = "3",
                name = "Customer Support Bot",
                role = "Customer Service",
                description = "Handles FAQs, order status inquiries, and basic customer issues",
                isActive = false,
                tasksCompleted = 432,
                efficiency = 92,
                icon = "support"
            ),
            AIEmployee(
                id = "4",
                name = "Marketing Assistant",
                role = "Promotions & Marketing",
                description = "Creates promotions, suggests deals based on sales data, and manages campaigns",
                isActive = true,
                tasksCompleted = 156,
                efficiency = 88,
                icon = "campaign"
            ),
            AIEmployee(
                id = "5",
                name = "Analytics Advisor",
                role = "Business Intelligence",
                description = "Analyzes sales trends, provides insights, and suggests menu optimizations",
                isActive = true,
                tasksCompleted = 78,
                efficiency = 94,
                icon = "insights"
            )
        )
    }

    val activeCount = aiEmployees.count { it.isActive }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("AI Employees", fontWeight = FontWeight.Bold)
                        Text(
                            "$activeCount of ${aiEmployees.size} active",
                            fontSize = 12.sp,
                            color = Color.White.copy(alpha = 0.7f)
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFFFF5722),
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Color(0xFFF5F5F5)),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Overview Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(
                                Brush.horizontalGradient(
                                    colors = listOf(Color(0xFF6C63FF), Color(0xFF8B83FF))
                                )
                            )
                            .padding(20.dp)
                    ) {
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    Icons.Default.SmartToy,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(32.dp)
                                )
                                Spacer(modifier = Modifier.width(12.dp))
                                Text(
                                    text = "AI Workforce",
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceEvenly
                            ) {
                                AIStatItem(
                                    value = "${aiEmployees.sumOf { it.tasksCompleted }}",
                                    label = "Tasks Done"
                                )
                                AIStatItem(
                                    value = "${aiEmployees.filter { it.isActive }.map { it.efficiency }.takeIf { it.isNotEmpty() }?.average()?.toInt() ?: 0}%",
                                    label = "Avg Efficiency"
                                )
                                AIStatItem(
                                    value = "24/7",
                                    label = "Availability"
                                )
                            }
                        }
                    }
                }
            }

            // AI Employees List
            item {
                Text(
                    text = "Your AI Team",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
            }

            items(aiEmployees) { employee ->
                AIEmployeeCard(employee = employee)
            }

            // Add More AI
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { /* Add more AI */ },
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = Color(0xFF6C63FF).copy(alpha = 0.1f)
                    )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            Icons.Default.Add,
                            contentDescription = null,
                            tint = Color(0xFF6C63FF)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Add More AI Employees",
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFF6C63FF)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun AIStatItem(value: String, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = value,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )
        Text(
            text = label,
            fontSize = 12.sp,
            color = Color.White.copy(alpha = 0.8f)
        )
    }
}

@Composable
fun AIEmployeeCard(employee: AIEmployee) {
    var isExpanded by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { isExpanded = !isExpanded },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // AI Avatar
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .clip(CircleShape)
                        .background(
                            if (employee.isActive)
                                Brush.linearGradient(listOf(Color(0xFF6C63FF), Color(0xFF8B83FF)))
                            else
                                Brush.linearGradient(listOf(Color.Gray, Color.LightGray))
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.SmartToy,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(28.dp)
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = employee.name,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = if (employee.isActive) Color(0xFF4CAF50) else Color.Gray
                        ) {
                            Text(
                                text = if (employee.isActive) "ACTIVE" else "PAUSED",
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                    }
                    Text(
                        text = employee.role,
                        fontSize = 13.sp,
                        color = Color(0xFF6C63FF)
                    )
                }

                Switch(
                    checked = employee.isActive,
                    onCheckedChange = { /* Toggle */ },
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = Color.White,
                        checkedTrackColor = Color(0xFF6C63FF)
                    )
                )
            }

            if (isExpanded) {
                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider(color = Color(0xFFF0F0F0))
                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = employee.description,
                    fontSize = 14.sp,
                    color = Color.Gray
                )

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "${employee.tasksCompleted}",
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF6C63FF)
                        )
                        Text(
                            text = "Tasks",
                            fontSize = 12.sp,
                            color = Color.Gray
                        )
                    }
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "${employee.efficiency}%",
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF4CAF50)
                        )
                        Text(
                            text = "Efficiency",
                            fontSize = 12.sp,
                            color = Color.Gray
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = { /* Configure */ },
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Default.Settings, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Configure", fontSize = 12.sp)
                    }
                    Button(
                        onClick = { /* View Activity */ },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6C63FF))
                    ) {
                        Icon(Icons.Default.History, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Activity", fontSize = 12.sp)
                    }
                }
            }
        }
    }
}
