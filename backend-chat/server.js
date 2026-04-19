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

// Socket.io setup
const io = new Server(server, {
    cors: {
        origin: "https://koretalk007.onrender.com",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
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

    // ─── WebRTC Signaling ────────────────────────────────────────────────────
    // Caller → Callee: initiate a call with an SDP offer
    socket.on('call:initiate', (data) => {
        const { calleeId, offer, callerId, callerName, callerPhoto } = data;
        console.log(`Call initiated: ${callerId} → ${calleeId}`);
        io.to(calleeId).emit('call:incoming', { offer, callerId, callerName, callerPhoto });
    });

    // Callee → Caller: accept with SDP answer
    socket.on('call:accepted', (data) => {
        const { callerId, calleeId, answer } = data;
        console.log(`Call accepted: ${calleeId} → ${callerId}`);
        io.to(callerId).emit('call:accepted', { answer, calleeId });
    });

    // Callee → Caller: declined the call
    socket.on('call:declined', (data) => {
        const { callerId, calleeId } = data;
        console.log(`Call declined: ${calleeId} → ${callerId}`);
        io.to(callerId).emit('call:declined', { calleeId });
    });

    // Both directions: relay ICE candidates
    socket.on('call:ice-candidate', (data) => {
        const { targetId, candidate } = data;
        io.to(targetId).emit('call:ice-candidate', { candidate });
    });

    // Either party: ended the call
    socket.on('call:ended', (data) => {
        const { targetId } = data;
        console.log(`Call ended → ${targetId}`);
        io.to(targetId).emit('call:ended');
    });

    // Callee is busy (already in a call)
    socket.on('call:busy', (data) => {
        const { callerId } = data;
        io.to(callerId).emit('call:busy');
    });
    // ─────────────────────────────────────────────────────────────────────────

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
