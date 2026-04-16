require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const { MongoDBUri, ImgBBApiKey } = require('./config');
const userRoutes = require('./routes/users');
const chatRoutes = require('./routes/chats');
const messageRoutes = require('./routes/messages');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);

// CORS configuration - allow both localhost and production frontend
const allowedOrigins = [
    "http://localhost:5173", // Local development
    "https://koretalk008.onrender.com" // Production - UPDATE THIS WITH YOUR ACTUAL FRONTEND URL
];

// Socket.io setup with CORS
const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);

            if (allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                console.log('Blocked by CORS:', origin);
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Middleware with CORS
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('Blocked by CORS:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// MongoDB Connection
mongoose.connect(MongoDBUri)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);

// ImgBB Upload endpoint
app.post('/api/upload', async (req, res) => {
    try {
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({ error: 'No image provided' });
        }

        const formData = new FormData();
        formData.append('image', image);
        formData.append('key', ImgBBApiKey);

        const response = await fetch('https://api.imgbb.com/1/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            res.json({ url: data.data.url });
        } else {
            res.status(500).json({ error: 'Upload failed' });
        }
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_chat', (userId) => {
        socket.join(userId);
        console.log(`User ${userId} joined their room`);
    });

    socket.on('send_message', async (data) => {
        const { receiverId, message, senderId } = data;

        // Check if receiver has blocked the sender
        const receiver = await User.findOne({ uid: receiverId });
        if (receiver) {
            const isBlocked = receiver.blockedUsers.some(
                blockedId => blockedId.toString() === senderId
            );

            if (isBlocked) {
                console.log(`Message blocked: ${senderId} is blocked by ${receiverId}`);
                return; // Don't deliver the message
            }
        }

        io.to(receiverId).emit('receive_message', message);
    });

    socket.on('message_edited', (data) => {
        const { receiverId, message } = data;
        io.to(receiverId).emit('message_edited', message);
    });

    socket.on('message_deleted', (data) => {
        const { receiverId, messageId } = data;
        io.to(receiverId).emit('message_deleted', { messageId });
    });

    socket.on('friend_request', (data) => {
        const { receiverId, request } = data;
        io.to(receiverId).emit('friend_request', request);
    });

    socket.on('friend_request_accepted', (data) => {
        const { receiverId, user } = data;
        io.to(receiverId).emit('friend_request_accepted', user);
    });

    socket.on('typing', (data) => {
        const { receiverId, isTyping } = data;
        io.to(receiverId).emit('typing', { isTyping });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Root route - to prevent "Cannot GET /" error
app.get('/', (req, res) => {
    res.json({
        message: 'Chat API Server is running',
        version: '1.0.0',
        endpoints: {
            users: '/api/users',
            chats: '/api/chats',
            messages: '/api/messages',
            upload: '/api/upload',
            health: '/api/health'
        },
        status: 'OK',
        timestamp: new Date().toISOString()
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        database: dbStatus,
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Root endpoint: http://localhost:${PORT}/`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});
