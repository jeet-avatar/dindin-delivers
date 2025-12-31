output "sns_topic_arn" {
  value = aws_sns_topic.alarms.arn
}

output "dashboard_arn" {
  value = aws_cloudwatch_dashboard.main.dashboard_arn
}
