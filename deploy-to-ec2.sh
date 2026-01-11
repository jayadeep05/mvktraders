#!/bin/bash

# MVK Traders - Quick Deployment Script for EC2
# Run this script on your EC2 server after uploading the JAR file

echo "🚀 MVK Traders Deployment Script"
echo "=================================="

# Step 1: Install Java 17
echo "📦 Installing Java 17..."
sudo apt update
sudo apt install openjdk-17-jdk -y

# Step 2: Install MySQL
echo "📦 Installing MySQL..."
sudo apt install mysql-server -y
sudo systemctl start mysql
sudo systemctl enable mysql

# Step 3: Create Database (Skipped - using existing)
# echo "🗄️  Setting up database..."
# sudo mysql <<EOF
# CREATE DATABASE IF NOT EXISTS investment_analysis;
# CREATE USER IF NOT EXISTS 'app_user'@'localhost' IDENTIFIED BY 'mSRINIVAS777!!';
# GRANT ALL PRIVILEGES ON investment_analysis.* TO 'app_user'@'localhost';
# FLUSH PRIVILEGES;
# EOF

# Step 4: Create directories
echo "📁 Creating application directories..."
sudo mkdir -p /opt/mvk-traders
sudo mkdir -p /var/log/mvk-traders
sudo chown -R ubuntu:ubuntu /opt/mvk-traders
sudo chown -R ubuntu:ubuntu /var/log/mvk-traders

# Step 5: Create environment file
echo "🔐 Creating environment file..."
cat > /opt/mvk-traders/.env <<EOF
DB_URL=jdbc:mysql://localhost:3306/investment_analysis
DB_USERNAME=app_user
DB_PASSWORD='mSRINIVAS777!!'
JWT_SECRET=mvk-traders-super-secret-jwt-key-for-production-must-be-at-least-64-chars
EOF

# Step 6: Create systemd service
echo "⚙️  Creating systemd service..."
sudo tee /etc/systemd/system/mvk-traders.service > /dev/null <<EOF
[Unit]
Description=MVK Traders API Service
After=syslog.target network.target mysql.service

[Service]
User=ubuntu
WorkingDirectory=/opt/mvk-traders
EnvironmentFile=/opt/mvk-traders/.env
ExecStart=/usr/bin/java -jar -Dspring.profiles.active=prod /opt/mvk-traders/mvk-traders.jar
SuccessExitStatus=143
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Step 7: Install and configure Nginx
# echo "🌐 Installing and configuring Nginx..."
# sudo apt install nginx -y

# sudo tee /etc/nginx/sites-available/mvk-traders > /dev/null <<EOF
# server {
#     listen 80;
#     server_name ec2-13-48-212-110.eu-north-1.compute.amazonaws.com;
#
#     location / {
#         proxy_pass http://localhost:8080;
#         proxy_set_header Host \$host;
#         proxy_set_header X-Real-IP \$remote_addr;
#         proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto \$scheme;
#     }
# }
# EOF

# sudo ln -sf /etc/nginx/sites-available/mvk-traders /etc/nginx/sites-enabled/
# sudo rm -f /etc/nginx/sites-enabled/default
# sudo nginx -t
# sudo systemctl restart nginx

# Step 8: Configure firewall
echo "🔥 Configuring firewall..."
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
echo "y" | sudo ufw enable

# Step 9: Start the service
echo "🎯 Starting MVK Traders service..."
sudo systemctl daemon-reload
sudo systemctl enable mvk-traders
sudo systemctl start mvk-traders

# Step 10: Check status
echo ""
echo "✅ Deployment complete!"
echo ""
echo "Service status:"
sudo systemctl status mvk-traders --no-pager

echo ""
echo "📊 View logs:"
echo "  sudo journalctl -u mvk-traders -f"
echo ""
echo "🌐 API URL:"
echo "  http://ec2-13-48-212-110.eu-north-1.compute.amazonaws.com/api"
echo ""
echo "🔍 Health check:"
echo "  curl http://ec2-13-48-212-110.eu-north-1.compute.amazonaws.com/api/health"
