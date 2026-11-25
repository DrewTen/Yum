Project Overview
Yum is a recipe discovery and social networking mobile application designed to help users discover, create and share recipes from different cultures and cuisines.

The application incorporates a rule-based recommendation algorithm that aims to balance personalised recommendations with unfamiliar cuisines, encouraging users to broaden their tastes and reducing the risk of recommendation filter bubbles.
Core Features
- User registration and authentication
- Recipe discovery, searching and filtering
- Personalised recipe recommendations
- Recipe creation, editing and deletion
- Recipe image uploads
- Ingredient quantity and serving adjustments
- Saving and liking recipes
- Personal recipe collections
- User profiles, following and commenting

Technologies Used
- React Native
- Expo
- TypeScript
- Expo Router
- Supabase Authentication
- Supabase PostgreSQL Database
- Supabase Storage
- TheMealDB API
- AsyncStorage
- Expo ImagePicker

Installation and Setup
Prerequisites
- Node.js and npm
- Expo Go installed on a compatible mobile device, or a suitable emulator

1. Install Dependencies
Open a terminal within the project directory and run:
npm install

2. Configure Environment Variables
Create a file named .env in the root directory of the project (alongside package.json). Add the following configuration:

EXPO_PUBLIC_SUPABASE_URL=https://gagllsmtxqatfzvtcjox.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ecdhNf2_IfbVPe6RcR6qpA_M3-mbN4U

These client-side configuration values allow the application to connect to its existing hosted Supabase backend. No administrative credentials are required.

3. Run the Application
Start the Expo development server:
npx expo start
Scan the generated QR code using Expo Go or launch the application using a compatible emulator.

An internet connection is required to access Supabase and TheMealDB.
Backend and Data Storage
The application uses an existing hosted Supabase project to manage authentication, user-generated recipes, saved recipes, likes and recipe images.

Some features, including collections, favourite cuisines, followed creators and comments, currently utilise local storage.

No separate database installation is required.
Known Limitations
- Some locally stored data does not synchronise across devices.
- The notification system is not currently functional.
- Account deletion has not yet been implemented.

External Resources
- React Native: https://reactnative.dev/
- Expo: https://expo.dev/
- Supabase: https://supabase.com/
- TheMealDB: https://www.themealdb.com/

AI Acknowledgement
ChatGPT was used to assist with development, code generation, debugging, problem-solving and documentation. Further details and reflection on AI usage are provided in the accompanying project report.