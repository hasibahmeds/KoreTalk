// Frontend Configuration
// Uses environment variables for different environments

const config = {
    // API Base URL - for all backend API calls
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',

    // Socket.io Server URL
    SOCKET_URL: import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000',

    // Environment
    NODE_ENV: import.meta.env.VITE_NODE_ENV || 'development',

    // Firebase configuration (optional - can be moved from firebase/config.js)
    FIREBASE: {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDRYkq8KvlKych8zsZxh_dSEWE2ehR7T4E",
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "react-web-9283c.firebaseapp.com",
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "react-web-9283c",
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "react-web-9283c.firebasestorage.app",
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "900245367602",
        appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:900245367602:web:a491f917f96ebe8e07852b"
    }
};

// Log configuration in development
if (config.NODE_ENV === 'development') {
    console.log('Frontend Configuration:', {
        API_BASE_URL: config.API_BASE_URL,
        SOCKET_URL: config.SOCKET_URL,
        NODE_ENV: config.NODE_ENV
    });
}

export default config;
