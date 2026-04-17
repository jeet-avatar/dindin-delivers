output "public_ip" {
  value       = aws_eip.arthaBuild.public_ip
  description = "ArthaBuild public IP address"
}

output "arthaBuild_url" {
  value       = "http://${aws_eip.arthaBuild.public_ip}"
  description = "ArthaBuild application URL"
}

output "ssh_command" {
  value       = "ssh -i ~/.ssh/${var.key_pair_name}.pem ubuntu@${aws_eip.arthaBuild.public_ip}"
  description = "SSH command to connect to ArthaBuild instance"
}
