# MVK Traders - Production Deployment Guide

## 🚀 Complete Deployment Steps

### Prerequisites
- AWS EC2 instance (already set up)
- SSH access: `ssh -i "backend.pem" ubuntu@ec2-13-48-212-110.eu-north-1.compute.amazonaws.com`
- Domain name (optional, for custom URL)

---

## Part 1: Backend Deployment to AWS EC2

### Step 1: Prepare Production Configuration

Create `application-prod.yml` in `backend/src/main/resources/`:

```yaml
spring:
  application:
    name: mvk-traders-api
  datasource:
    url: jdbc:mysql://localhost:3306/mvk_traders_prod
    username: mvk_user
    password: ${DB_PASSWORD}
    driver-class-name: com.mysql.cj.jdbc.Driver
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQL8Dialect
        format_sql: false
    show-sql: false

logging:
  level:
    com.enterprise.investmentanalytics: INFO
    org.springframework.web: WARN
    org.hibernate: WARN
  file:
    name: /var/log/mvk-traders/application.log

server:
  port: 8080
  error:
    include-message: always

jwt:
  secret: ${JWT_SECRET}
  expiration: 86400000
  refresh-expiration: 604800000
```

### Step 2: Build Production JAR

```bash
cd c:\Users\jayadeep\trading-mvk\backend
mvn clean package -DskipTests
```

### Step 3: Deploy to EC2

#### 3.1 Connect to EC2
```bash
ssh -i "backend.pem" ubuntu@ec2-13-48-212-110.eu-north-1.compute.amazonaws.com
```

#### 3.2 Install Java 17 (if not installed)
```bash
sudo apt update
sudo apt install openjdk-17-jdk -y
java -version
```

#### 3.3 Install MySQL (if not installed)
```bash
sudo apt install mysql-server -y
sudo systemctl start mysql
sudo systemctl enable mysql
```

#### 3.4 Setup MySQL Database
```bash
sudo mysql
```

```sql
CREATE DATABASE mvk_traders_prod;
CREATE USER 'mvk_user'@'localhost' IDENTIFIED BY 'SecurePassword123!';
GRANT ALL PRIVILEGES ON mvk_traders_prod.* TO 'mvk_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### 3.5 Create Application Directory
```bash
sudo mkdir -p /opt/mvk-traders
sudo mkdir -p /var/log/mvk-traders
sudo chown -R ubuntu:ubuntu /opt/mvk-traders
sudo chown -R ubuntu:ubuntu /var/log/mvk-traders
```

#### 3.6 Upload JAR File (from your local machine)
```bash
scp -i "backend.pem" c:\Users\jayadeep\trading-mvk\backend\target\*.jar ubuntu@ec2-13-48-212-110.eu-north-1.compute.amazonaws.com:/opt/mvk-traders/mvk-traders.jar
```

#### 3.7 Create Environment File
```bash
sudo nano /opt/mvk-traders/.env
```

Add:
```
DB_PASSWORD=SecurePassword123!
JWT_SECRET=your-super-secret-jwt-key-that-is-at-least-64-characters-long-for-production
```

#### 3.8 Create Systemd Service
```bash
sudo nano /etc/systemd/system/mvk-traders.service
```

Add:
```ini
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
```

#### 3.9 Start the Service
```bash
sudo systemctl daemon-reload
sudo systemctl enable mvk-traders
sudo systemctl start mvk-traders
sudo systemctl status mvk-traders
```

#### 3.10 Configure Nginx (Reverse Proxy)
```bash
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/mvk-traders
```

Add:
```nginx
server {
    listen 80;
    server_name ec2-13-48-212-110.eu-north-1.compute.amazonaws.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/mvk-traders /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 3.11 Configure Firewall
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

### Step 4: Setup HTTPS with Let's Encrypt (Optional but Recommended)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

---

## Part 2: Build Android APK

### Step 1: Install EAS CLI
```bash
npm install -g eas-cli
```

### Step 2: Login to Expo
```bash
cd c:\Users\jayadeep\trading-mvk\mvktraders-mobile
eas login
```

### Step 3: Configure EAS Build
```bash
eas build:configure
```

### Step 4: Build APK
```bash
eas build -p android --profile preview
```

Or for a local build (faster):
```bash
npx expo prebuild
cd android
./gradlew assembleRelease
```

The APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

---

## Part 3: Update Mobile App API URL

Update `src/config.js`:

```javascript
const config = {
  API_BASE_URL: __DEV__ 
    ? 'http://localhost:8080/api' 
    : 'http://ec2-13-48-212-110.eu-north-1.compute.amazonaws.com/api',
  IMAGE_BASE_URL: __DEV__ 
    ? 'http://localhost:8080' 
    : 'http://ec2-13-48-212-110.eu-north-1.compute.amazonaws.com',
};

export default config;
```

---

## 🎯 Final URLs

- **Backend API**: `http://ec2-13-48-212-110.eu-north-1.compute.amazonaws.com/api`
- **Health Check**: `http://ec2-13-48-212-110.eu-north-1.compute.amazonaws.com/api/health`

---

## 📱 Testing

1. Test backend: `curl http://ec2-13-48-212-110.eu-north-1.compute.amazonaws.com/api/health`
2. Install APK on Android device
3. Login and test all features

---

## 🔧 Maintenance Commands

```bash
# View logs
sudo journalctl -u mvk-traders -f

# Restart service
sudo systemctl restart mvk-traders

# Check status
sudo systemctl status mvk-traders

# Update application
scp -i "backend.pem" new-version.jar ubuntu@ec2-13-48-212-110.eu-north-1.compute.amazonaws.com:/opt/mvk-traders/mvk-traders.jar
sudo systemctl restart mvk-traders
```

---

## ✅ Deployment Checklist

- [ ] Backend JAR built successfully
- [ ] MySQL database created
- [ ] JAR uploaded to EC2
- [ ] Systemd service configured and running
- [ ] Nginx configured
- [ ] Firewall rules set
- [ ] API accessible from public URL
- [ ] Mobile app config updated
- [ ] APK built successfully
- [ ] APK tested on device
- [ ] All features working in production
