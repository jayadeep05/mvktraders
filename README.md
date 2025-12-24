# Booku - Investment Analytics Platform

Welcome to the Booku project monorepo. This repository contains the complete source code for the platform, including the backend services, web frontend, and mobile application.

## 📂 Project Structure

```
Booku/
├── backend/            # Java Spring Boot REST API
├── frontend/           # React + Vite Web Application
├── mvktraders-mobile/  # React Native (Expo) Mobile App
├── tools/              # (Ignored) Local development tools
└── README.md           # This file
```

## 🛠 Tech Stack

### Backend
- **Framework**: Spring Boot 3.2.0
- **Language**: Java 17
- **Database**: MySQL (Production), H2 (Test)
- **Security**: Spring Security, JWT
- **Build Tool**: Maven

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Styling**: CSS / Tailwind (if applicable)
- **State/Data**: Axios, Recharts

### Mobile
- **Framework**: React Native 0.81
- **Platform**: Expo 54
- **Navigation**: React Navigation

## 🚀 Setup & Installation

### Prerequisites
- **Git**
- **Node.js** (v18+)
- **Java JDK 17**
- **Maven** (or use `./mvnw` if included, though this repo requires local maven)
- **MySQL** (for local database)

### 1. Clone the Repository
```bash
git clone https://github.com/jayadeep05/mvktraders.git
cd mvktraders
```

### 2. Backend Setup
Navigate to the `backend` directory:
```bash
cd backend
```

**Configuration**:
Ensure you have a database running. Update `src/resources/application.properties` or create a `.env` file if configured to use one.

**Run**:
```bash
mvn spring-boot:run
```
The server typically runs on `http://localhost:8080`.

### 3. Frontend Setup
Navigate to the `frontend` directory:
```bash
cd ../frontend
```

**Install Dependencies**:
```bash
npm install
```

**Run Development Server**:
```bash
npm run dev
```
The web app will be available at `http://localhost:5173`.

### 4. Mobile App Setup
Navigate to the `mvktraders-mobile` directory:
```bash
cd ../mvktraders-mobile
```

**Install Dependencies**:
```bash
npm install
```

**Run Expo**:
```bash
npx expo start
```
Scan the QR code with the Expo Go app on your phone.

## 🤝 Contributing
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

## 📄 License
[Proprietary/License Name]
