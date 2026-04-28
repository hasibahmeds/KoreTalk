const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const User = require('../models/User');

// Get all chats for a user
router.get('/:uid', async (req, res) => {
    try {
        const user = await User.findOne({ uid: req.params.uid });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const chats = await Chat.find({
            participants: user._id
        })
            .populate('participants', 'uid email displayName photoURL')
            .sort({ lastMessageTime: -1 });

        res.json(chats);
    } catch (error) {
        console.error('Get chats error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get or create chat between two users
router.post('/get-or-create', async (req, res) => {
    try {
        const { userUid1, userUid2 } = req.body;

        const user1 = await User.findOne({ uid: userUid1 });
        const user2 = await User.findOne({ uid: userUid2 });

        if (!user1 || !user2) {
            return res.status(404).json({ error: 'User not found' });
        }

        let chat = await Chat.findOne({
            participants: { $all: [user1._id, user2._id] }
        }).populate('participants', 'uid email displayName photoURL');

        if (!chat) {
            chat = new Chat({
                participants: [user1._id, user2._id]
            });
            await chat.save();
            chat = await Chat.findById(chat._id)
                .populate('participants', 'uid email displayName photoURL');
        }

        res.json(chat);
    } catch (error) {
        console.error('Get or create chat error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete chat between two users
router.delete('/between-users', async (req, res) => {
    try {
        const { userUid1, userUid2 } = req.body;

        const user1 = await User.findOne({ uid: userUid1 });
        const user2 = await User.findOne({ uid: userUid2 });

        if (!user1 || !user2) {
            return res.status(404).json({ error: 'User not found' });
        }

        const chat = await Chat.findOne({
            participants: { $all: [user1._id, user2._id] }
        });

        if (chat) {
            await Chat.findByIdAndDelete(chat._id);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Delete chat error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;