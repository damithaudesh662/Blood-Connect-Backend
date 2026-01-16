1. Backend Setup (Node.js + Express + PostgreSQL)
1.1 Prerequisites

Node.js LTS installed
PostgreSQL installed and running
npm installed
Git

1.2 Clone and install

1. Clone the backend repository

git clone https://github.com/damithaudesh662/Blood-Connect-Backend.git
cd blood-connect-backend

2. Install dependencies

npm install

1.3 Configure PostgreSQL database

PORT=3000
DATABASE_URL=postgres://avnadmin:password@blood-connect-damithaudesh2000-f991.j.aivencloud.com:13435/defaultdb?sslmode=require

1.4 Environment variables

Create a .env file in the backend root:

DATABASE_URL=postgresql://blood_user:strong_password@localhost:5432/blood_connect

JWT_SECRET=your_jwt_secret_here

# Expo push

EXPO_ACCESS_TOKEN=your_expo_access_token_here

# Twilio SMS

TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+94XXXXXXXXX

1.5 Start the backend server

node src/index.js

2. Frontend Setup (React Native + Expo)
   2.1 Prerequisites

Node.js installed
Expo Go app installed on your phone
Git

2.2 Clone and install

1. Clone the mobile app repo

https://github.com/damithaudesh662/Blood-Connect.git
cd blood-connect

2. Install dependencies

npm install

2.3 Configure API base URL and Expo project ID

import axios from "axios";

const api = axios.create({
baseURL: "http://192.168.1.5:4000", // change to your backend IP:PORT
});

export default api;

Also set your Expo project ID in .env or app.json:

EXPO_PUBLIC_PROJECT_ID=your-expo-project-id
EXPO_PUBLIC_API_URL

And ensure your notification code reads it correctly.
​
2.4 Start the Expo development server

# From blood-connect folder

npx expo start

This will open Expo Dev Tools in the browser and show a QR code.​
On Android physical device: open Expo Go → scan QR.
On iOS physical device: use Camera app to scan QR and open with Expo Go.
