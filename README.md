# 🩸 Blood Connect -- Full Stack Setup Guide

This repository contains the **Blood Connect** mobile application and
backend services. Follow the instructions below to set up both the
**backend (Node.js + Express + PostgreSQL)** and **frontend (React
Native + Expo)**.

------------------------------------------------------------------------

## 📦 1. Backend Setup (Node.js + Express + PostgreSQL)

### 1.1 Prerequisites

-   Node.js (LTS version)
-   npm
-   PostgreSQL (running)
-   Git

------------------------------------------------------------------------

### 1.2 Clone Repository & Install Dependencies

``` bash
git clone https://github.com/damithaudesh662/Blood-Connect-Backend.git
cd blood-connect-backend
npm install
```

------------------------------------------------------------------------

### 1.3 PostgreSQL Configuration

``` env
PORT=3000
DATABASE_URL=postgres://avnadmin:password@blood-connect-damithaudesh2000-f991.j.aivencloud.com:13435/defaultdb?sslmode=require
```

> ⚠️ Never commit real credentials to GitHub.

------------------------------------------------------------------------

### 1.4 Environment Variables

Create a `.env` file in the backend root:

``` env
DATABASE_URL=postgresql://blood_user:strong_password@localhost:5432/blood_connect
JWT_SECRET=your_jwt_secret_here

# Expo Push
EXPO_ACCESS_TOKEN=your_expo_access_token_here

# Twilio SMS
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+94XXXXXXXXX
```

------------------------------------------------------------------------

### 1.5 Start Backend Server

``` bash
node src/index.js
```

------------------------------------------------------------------------

## 📱 2. Frontend Setup (React Native + Expo)

### 2.1 Prerequisites

-   Node.js
-   Git
-   Expo Go app

------------------------------------------------------------------------

### 2.2 Clone Repository & Install Dependencies

``` bash
git clone https://github.com/damithaudesh662/Blood-Connect.git
cd blood-connect
npm install
```

------------------------------------------------------------------------

### 2.3 Configure API Base URL & Expo Project ID

``` javascript
import axios from "axios";

const api = axios.create({
  baseURL: "http://192.168.1.5:4000",
});

export default api;
```

Set environment variables:

``` env
EXPO_PUBLIC_PROJECT_ID=your-expo-project-id
EXPO_PUBLIC_API_URL=http://192.168.1.5:4000
```

------------------------------------------------------------------------

### 2.4 Start Expo Development Server

``` bash
npx expo start
```

Scan the QR code using Expo Go.

------------------------------------------------------------------------
