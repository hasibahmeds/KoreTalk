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
const Message = require('./models/Message');
const Chat = require('./models/Chat');

const activeCalls = new Map(); // userId -> call info

function formatDuration(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    let parts = [];
    if (hours > 0) parts.push(`${hours}hr`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0) parts.push(`${secs}s`);

    return parts.join(' ');
}

async function saveCallNotification(chatId, senderUid, content) {
    try {
        const sender = await User.findOne({ uid: senderUid });
        if (!sender) return null;

        const message = new Message({
            chatId,
            sender: sender._id,
            content,
            messageType: 'video_call'
        });
        await message.save();

        const chat = await Chat.findById(chatId);
        if (chat) {
            chat.lastMessage = content;
            chat.lastMessageTime = new Date();
            await chat.save();
        }

        return await Message.findById(message._id).populate('sender', 'uid email displayName photoURL');
    } catch (err) {
        console.error('Error saving call notification:', err);
        return null;
    }
}

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
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
        socket.userId = userId; // Store userId on socket for disconnect handling
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
        const { calleeId, offer, callerId, callerName, callerPhoto, chatId } = data;
        console.log(`Call initiated: ${callerId} → ${calleeId} (Chat: ${chatId})`);

        activeCalls.set(callerId, { calleeId, callerId, chatId, status: 'calling', timestamp: Date.now() });
        activeCalls.set(calleeId, { calleeId, callerId, chatId, status: 'incoming', timestamp: Date.now() });

        io.to(calleeId).emit('call:incoming', { offer, callerId, callerName, callerPhoto, chatId });
    });

    // Callee → Caller: accept with SDP answer
    socket.on('call:accepted', (data) => {
        const { callerId, calleeId, answer } = data;
        console.log(`Call accepted: ${calleeId} → ${callerId}`);

        const call = activeCalls.get(calleeId);
        if (call) {
            call.status = 'active';
            call.startTime = Date.now();
            activeCalls.set(callerId, call);
            activeCalls.set(calleeId, call);
        }

        io.to(callerId).emit('call:accepted', { answer, calleeId });
    });

    // Callee → Caller: declined the call
    socket.on('call:declined', async (data) => {
        const { callerId, calleeId } = data;
        console.log(`Call declined: ${calleeId} → ${callerId}`);

        const call = activeCalls.get(calleeId);
        if (call && call.chatId) {
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const content = `Missed video call at ${timeStr}`;
            const message = await saveCallNotification(call.chatId, callerId, content);
            if (message) {
                io.to(callerId).to(calleeId).emit('receive_message', message);
            }
        }

        activeCalls.delete(callerId);
        activeCalls.delete(calleeId);

        io.to(callerId).emit('call:declined', { calleeId });
    });

    // Both directions: relay ICE candidates
    socket.on('call:ice-candidate', (data) => {
        const { targetId, candidate } = data;
        io.to(targetId).emit('call:ice-candidate', { candidate });
    });

    // Either party: ended the call
    socket.on('call:ended', async (data) => {
        const { targetId, senderId } = data;
        console.log(`Call ended by ${senderId} → ${targetId}`);

        const call = activeCalls.get(senderId) || activeCalls.get(targetId);
        if (call) {
            if (call.status === 'active' && call.startTime) {
                const durationSeconds = Math.floor((Date.now() - call.startTime) / 1000);
                const durationStr = formatDuration(durationSeconds);
                const content = `Video call: ${durationStr}`;
                const message = await saveCallNotification(call.chatId, call.callerId, content);
                if (message) {
                    io.to(call.callerId).to(call.calleeId).emit('receive_message', message);
                }
            } else if (call.status === 'calling' || call.status === 'incoming') {
                // This was a missed call or cancelled call
                const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const content = `Missed video call at ${timeStr}`;
                const message = await saveCallNotification(call.chatId, call.callerId, content);
                if (message) {
                    io.to(call.callerId).to(call.calleeId).emit('receive_message', message);
                }
            }
            activeCalls.delete(call.callerId);
            activeCalls.delete(call.calleeId);
        }

        io.to(targetId).emit('call:ended');
    });

    // Callee is busy (already in a call)
    socket.on('call:busy', async (data) => {
        const { callerId, calleeId, chatId } = data;
        console.log(`User busy: ${calleeId}`);

        // Busy also counts as a missed call notification in the chat
        if (chatId) {
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const content = `Missed video call at ${timeStr}`;
            const message = await saveCallNotification(chatId, callerId, content);
            if (message) {
                io.to(callerId).to(calleeId).emit('receive_message', message);
            }
        }

        // Note: we don't necessarily delete the callee's ACTUAL call because they were already busy with someone else.
        // But we should clean up the entry if it was just created for this incoming busy call.
        // Actually, 'call:busy' is sent by the callee who is already in a call.
        // The activeCalls map for callee already has their REAL call.
        // So we should only clear the caller's pending state if they were calling this busy person.
        activeCalls.delete(callerId);

        io.to(callerId).emit('call:busy');
    });
    // ─────────────────────────────────────────────────────────────────────────

    socket.on('disconnect', async () => {
        console.log('User disconnected:', socket.id);

        // Find if this user was in a call and end it
        // We need to know which userId this socket belonged to.
        // Since we don't have socket.userId yet, I'll add it in join_chat.
        if (socket.userId) {
            const userId = socket.userId;
            const call = activeCalls.get(userId);
            if (call) {
                const otherId = (call.callerId === userId) ? call.calleeId : call.callerId;

                if (call.status === 'active' && call.startTime) {
                    const durationSeconds = Math.floor((Date.now() - call.startTime) / 1000);
                    const durationStr = formatDuration(durationSeconds);
                    const content = `Video call: ${durationStr}`;
                    const message = await saveCallNotification(call.chatId, call.callerId, content);
                    if (message) {
                        io.to(call.callerId).to(call.calleeId).emit('receive_message', message);
                    }
                } else if (call.status === 'calling' || call.status === 'incoming') {
                    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const content = `Missed video call at ${timeStr}`;
                    const message = await saveCallNotification(call.chatId, call.callerId, content);
                    if (message) {
                        io.to(call.callerId).to(call.calleeId).emit('receive_message', message);
                    }
                }

                activeCalls.delete(call.callerId);
                activeCalls.delete(call.calleeId);
                io.to(otherId).emit('call:ended');
            }
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
