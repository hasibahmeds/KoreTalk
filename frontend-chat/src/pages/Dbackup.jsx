
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
    FiSend, FiImage, FiPaperclip, FiMoreVertical,
    FiTrash2, FiCheck, FiX, FiUserPlus,
    FiMessageCircle, FiUsers, FiSearch, FiLogOut, FiEdit,
    FiLock, FiUnlock, FiMenu, FiSmile, FiDownload,
    FiMoreHorizontal, FiMic, FiPlay, FiPause
} from 'react-icons/fi';
import { PiPlayCircleDuotone, PiPauseCircleDuotone } from "react-icons/pi";
import EmojiPicker from '../components/EmojiPicker';
import './Dashboard.css';



const AudioPlayer = ({ src, durationLabel, isSentByMe }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef(null);

    const togglePlay = () => {
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const onTimeUpdate = () => {
        setCurrentTime(audioRef.current.currentTime);
    };

    const onLoadedMetadata = () => {
        setDuration(audioRef.current.duration);
    };

    const onEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
    };

    const handleSeek = (e) => {
        const time = parseFloat(e.target.value);
        audioRef.current.currentTime = time;
        setCurrentTime(time);
    };

    const formatTime = (time) => {
        if (isNaN(time)) return '0:00';
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`messenger-audio-player ${isSentByMe ? 'sent' : 'received'}`}>
            <audio
                ref={audioRef}
                src={src}
                onTimeUpdate={onTimeUpdate}
                onLoadedMetadata={onLoadedMetadata}
                onEnded={onEnded}
            />
            <button type="button" className="audio-play-btn" onClick={togglePlay}>
                {isPlaying ? <PiPauseCircleDuotone /> : <PiPlayCircleDuotone />}
            </button>
            <div className="audio-progress-container">
                <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    step="0.01"
                    value={currentTime}
                    onChange={handleSeek}
                    className="audio-slider"
                />
            </div>
            <span className="audio-duration">
                {isPlaying ? formatTime(currentTime) : (durationLabel || formatTime(duration))}
            </span>
        </div>
    );
};


const Dashboard = () => {
    const { currentUser, dbUser, logout, fetchDbUser } = useAuth();
    const {
        sendMessage, sendDeletedMessage, sendEditedMessage,
        sendFriendRequest, sendTyping, onReceiveMessage,
        onMessageDeleted, onFriendRequest, onMessageEdited, socket
    } = useSocket();

    const [users, setUsers] = useState([]);
    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [showUsers, setShowUsers] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [editingMessage, setEditingMessage] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [fullscreenImage, setFullscreenImage] = useState(null);
    const [selectedImages, setSelectedImages] = useState([]); // Array of { file, preview }
    const [previewFullscreen, setPreviewFullscreen] = useState(null); // Now stores the preview URL itself

    // Audio recording states
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerIntervalRef = useRef(null);

    const [isTyping, setIsTyping] = useState(false);
    const [showFriendRequests, setShowFriendRequests] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showImageMenu, setShowImageMenu] = useState(false);
    const [loading, setLoading] = useState({
        users: false,
        chats: false,
        messages: false
    });

    const messagesEndRef = useRef(null);
    const imageInputRef = useRef(null);
    const sidebarRef = useRef(null);

    // Toggle sidebar for mobile
    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    // Close sidebar when clicking outside on mobile
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target) &&
                !event.target.closest('.sidebar-toggle') && window.innerWidth <= 768) {
                setSidebarOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Cleanup for audio recording
    useEffect(() => {
        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Close sidebar when chat is selected on mobile
    useEffect(() => {
        if (selectedChat && window.innerWidth <= 768) {
            setSidebarOpen(false);
        }
    }, [selectedChat]);

    // Fetch all users
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(prev => ({ ...prev, users: true }));
                const response = await fetch(`https://koretalk007.onrender.com/api/users/all/${currentUser.uid}`);
                const data = await response.json();
                setUsers(data);
            } catch (error) {
                console.error('Error fetching users:', error);
            } finally {
                setLoading(prev => ({ ...prev, users: false }));
            }
        };
        if (currentUser) {
            fetchUsers();
        }
    }, [currentUser]);

    // Fetch user's chats
    useEffect(() => {
        const fetchChats = async () => {
            try {
                setLoading(prev => ({ ...prev, chats: true }));
                const response = await fetch(`https://koretalk007.onrender.com/api/chats/${currentUser.uid}`);
                const data = await response.json();
                setChats(data);
            } catch (error) {
                console.error('Error fetching chats:', error);
            } finally {
                setLoading(prev => ({ ...prev, chats: false }));
            }
        };
        if (currentUser) {
            fetchChats();
        }
    }, [currentUser]);

    // Fetch messages when chat is selected
    useEffect(() => {
        const fetchMessages = async () => {
            if (selectedChat) {
                try {
                    setLoading(prev => ({ ...prev, messages: true }));
                    const response = await fetch(`https://koretalk007.onrender.com/api/messages/${selectedChat._id}`);
                    const data = await response.json();
                    setMessages(data);

                    // Check if the other user is blocked
                    const otherUser = selectedChat.participants.find(p => p.uid !== currentUser.uid);
                    if (otherUser) {
                        checkBlockedStatus(otherUser.uid);
                    }
                } catch (error) {
                    console.error('Error fetching messages:', error);
                } finally {
                    setLoading(prev => ({ ...prev, messages: false }));
                }
            }
        };
        fetchMessages();
        setSelectedMessageIds([]);
    }, [selectedChat]);

    // Socket listeners
    useEffect(() => {
        // Set up message received listener
        const handleReceiveMessage = (message) => {
            if (selectedChat && message.chatId === selectedChat._id) {
                setMessages(prev => [...prev, message]);
            }
        };

        // Set up message deleted listener
        const handleMessageDeleted = ({ messageId }) => {
            setMessages(prev => prev.map(msg =>
                msg._id === messageId ? { ...msg, isDeleted: true, content: 'This message was deleted' } : msg
            ));
        };

        // Set up message edited listener
        const handleMessageEdited = (message) => {
            setMessages(prev => prev.map(msg =>
                msg._id === message._id ? message : msg
            ));
        };

        // Set up friend request listener
        const handleFriendRequest = () => {
            fetchDbUser(currentUser.uid);
        };

        // Register listeners
        onReceiveMessage(handleReceiveMessage);
        onMessageDeleted(handleMessageDeleted);
        onMessageEdited(handleMessageEdited);
        onFriendRequest(handleFriendRequest);

        // Cleanup function to remove listeners when component unmounts or dependencies change
        return () => {
            if (socket) {
                socket.off('receive_message', handleReceiveMessage);
                socket.off('message_deleted', handleMessageDeleted);
                socket.off('message_edited', handleMessageEdited);
                socket.off('friend_request', handleFriendRequest);
            }
        };
    }, [selectedChat, currentUser, onReceiveMessage, onMessageDeleted, onMessageEdited, onFriendRequest, fetchDbUser, socket]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Send message
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChat) return;

        const receiver = selectedChat.participants.find(p => p.uid !== currentUser.uid);

        try {
            const response = await fetch('https://koretalk007.onrender.com/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: selectedChat._id,
                    senderUid: currentUser.uid,
                    content: newMessage,
                    messageType: 'text'
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                // Show "Unable to send" message when blocked
                const errorMessage = {
                    _id: Date.now().toString(),
                    chatId: selectedChat._id,
                    senderUid: currentUser.uid,
                    content: 'Unable to send',
                    messageType: 'text',
                    createdAt: new Date().toISOString(),
                    isError: true
                };
                setMessages(prev => [...prev, errorMessage]);
                setNewMessage('');
                return;
            }

            const message = await response.json();
            setMessages(prev => [...prev, message]);
            sendMessage(receiver.uid, message);
            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    // Format duration for display
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerIntervalRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        } catch (error) {
            console.error('Error starting recording:', error);
            alert('Could not access microphone.');
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
        clearInterval(timerIntervalRef.current);
        setIsRecording(false);
        setRecordingTime(0);
        audioChunksRef.current = [];
    };

    const stopRecordingAndSend = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await sendAudioMessage(audioBlob, recordingTime);
                audioChunksRef.current = [];
                setRecordingTime(0);
            };
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            clearInterval(timerIntervalRef.current);
            setIsRecording(false);
        }
    };

    const sendAudioMessage = async (audioBlob, durationInSeconds) => {
        if (!selectedChat) return;
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
            const base64Audio = reader.result;
            const receiver = selectedChat.participants.find(p => p.uid !== currentUser.uid);

            try {
                const response = await fetch('https://koretalk007.onrender.com/api/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chatId: selectedChat._id,
                        senderUid: currentUser.uid,
                        content: formatTime(durationInSeconds),
                        messageType: 'audio',
                        fileUrl: base64Audio
                    })
                });

                if (!response.ok) {
                    const errorMessage = {
                        _id: Date.now().toString(),
                        chatId: selectedChat._id,
                        senderUid: currentUser.uid,
                        content: 'Unable to send',
                        messageType: 'text',
                        createdAt: new Date().toISOString(),
                        isError: true
                    };
                    setMessages(prev => [...prev, errorMessage]);
                    return;
                }

                const message = await response.json();
                setMessages(prev => [...prev, message]);
                sendMessage(receiver.uid, message);
            } catch (error) {
                console.error('Error sending audio message:', error);
            }
        };
    };



    // Delete messages (bulk support)
    const handleDeleteMessages = async (messageIds) => {
        if (!messageIds || (Array.isArray(messageIds) && messageIds.length === 0)) return;
        const idsToDelete = Array.isArray(messageIds) ? messageIds : [messageIds];

        if (!window.confirm(`Are you sure you want to delete ${idsToDelete.length} message(s)?`)) {
            return;
        }

        const receiver = selectedChat.participants.find(p => p.uid !== currentUser.uid);

        try {
            const response = await fetch('https://koretalk007.onrender.com/api/messages/bulk-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageIds: idsToDelete })
            });

            if (response.ok) {
                setMessages(prev => prev.filter(msg => !idsToDelete.includes(msg._id)));
                idsToDelete.forEach(id => sendDeletedMessage(receiver.uid, id));
                clearSelection();
                setShowMessageMenu(null);
            }
        } catch (error) {
            console.error('Error deleting messages:', error);
        }
    };

    // Remove all my messages in the chat
    const handleRemoveAllMyMessages = async () => {
        if (!selectedChat) return;

        if (!window.confirm('Are you sure you want to remove all your messages in this chat?')) {
            return;
        }

        try {
            const response = await fetch(
                `https://koretalk007.onrender.com/api/messages/chat/${selectedChat._id}/user/${currentUser.uid}`,
                {
                    method: 'DELETE'
                }
            );

            const data = await response.json();
            if (data.success) {
                // Refresh messages to show remaining messages
                const messagesResponse = await fetch(
                    `https://koretalk007.onrender.com/api/messages/${selectedChat._id}`
                );
                const messagesData = await messagesResponse.json();
                setMessages(messagesData);
                alert(`Removed ${data.deletedCount} message(s)`);
            }
        } catch (error) {
            console.error('Error removing messages:', error);
            alert('Failed to remove messages. Please make sure the backend server is running.');
        }
    };

    // Edit message
    const handleEditMessage = async (messageId) => {
        if (!editContent.trim()) return;

        const receiver = selectedChat.participants.find(p => p.uid !== currentUser.uid);

        try {
            const response = await fetch(`https://koretalk007.onrender.com/api/messages/edit/${messageId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: editContent })
            });

            const updatedMessage = await response.json();
            setMessages(prev => prev.map(msg =>
                msg._id === messageId ? updatedMessage : msg
            ));
            sendEditedMessage(receiver.uid, updatedMessage);
            setEditingMessage(null);
            setEditContent('');
        } catch (error) {
            console.error('Error editing message:', error);
        }
    };

    // Start editing a message
    const startEditing = (message) => {
        setEditingMessage(message._id);
        setEditContent(message.content);
    };

    // Cancel editing
    const cancelEditing = () => {
        setEditingMessage(null);
        setEditContent('');
    };

    // Send friend request
    const handleSendFriendRequest = async (user) => {
        try {
            await fetch('https://koretalk007.onrender.com/api/users/friend-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fromUid: currentUser.uid,
                    toUid: user.uid
                })
            });
            alert('Friend request sent!');
        } catch (error) {
            console.error('Error sending friend request:', error);
        }
    };

    // Accept friend request
    const handleAcceptRequest = async (requestId) => {
        try {
            const response = await fetch('https://koretalk007.onrender.com/api/users/accept-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userUid: currentUser.uid,
                    requestId
                })
            });

            const data = await response.json();
            if (data.success) {
                fetchDbUser(currentUser.uid);
                // Refresh chats
                const chatResponse = await fetch(`https://koretalk007.onrender.com/api/chats/${currentUser.uid}`);
                const chatData = await chatResponse.json();
                setChats(chatData);
            }
        } catch (error) {
            console.error('Error accepting request:', error);
        }
    };

    // Reject friend request
    const handleRejectRequest = async (requestId) => {
        try {
            await fetch('https://koretalk007.onrender.com/api/users/reject-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userUid: currentUser.uid,
                    requestId
                })
            });
            fetchDbUser(currentUser.uid);
        } catch (error) {
            console.error('Error rejecting request:', error);
        }
    };

    // Check if user is blocked
    const checkBlockedStatus = async (otherUserUid) => {
        try {
            const response = await fetch(`https://koretalk007.onrender.com/api/users/is-blocked/${currentUser.uid}/${otherUserUid}`);
            const data = await response.json();
            setIsBlocked(data.isBlocked);
        } catch (error) {
            console.error('Error checking block status:', error);
        }
    };

    // Block user
    const handleBlockUser = async () => {
        const otherUser = getOtherUser(selectedChat);
        if (!otherUser) return;

        try {
            await fetch('https://koretalk007.onrender.com/api/users/block', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userUid: currentUser.uid,
                    blockedUid: otherUser.uid
                })
            });
            setIsBlocked(true);
            alert(`You blocked ${otherUser.displayName || otherUser.email}`);
        } catch (error) {
            console.error('Error blocking user:', error);
        }
    };

    // Unblock user
    const handleUnblockUser = async () => {
        const otherUser = getOtherUser(selectedChat);
        if (!otherUser) return;

        try {
            await fetch('https://koretalk007.onrender.com/api/users/unblock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userUid: currentUser.uid,
                    blockedUid: otherUser.uid
                })
            });
            setIsBlocked(false);
            alert(`You unblocked ${otherUser.displayName || otherUser.email}`);
        } catch (error) {
            console.error('Error unblocking user:', error);
        }
    };

    // Handle image selection (show preview)
    const handleImageSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const readFiles = files.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => {
                    resolve({ file, preview: reader.result });
                };
                reader.readAsDataURL(file);
            });
        });

        Promise.all(readFiles).then(newImages => {
            setSelectedImages(prev => [...prev, ...newImages]);
        });
    };

    // Cancel all selected images
    const handleCancelImage = () => {
        setSelectedImages([]);
        if (imageInputRef.current) {
            imageInputRef.current.value = '';
        }
    };

    // Download fullscreen image
    // Download fullscreen image
    const handleDownloadImage = async () => {
        let imageUrl = '';
        if (fullscreenImage && typeof fullscreenImage === 'object') {
            imageUrl = fullscreenImage.fileUrl;
        } else if (typeof fullscreenImage === 'string') {
            imageUrl = fullscreenImage;
        } else if (previewFullscreen && typeof previewFullscreen === 'object') {
            imageUrl = previewFullscreen.url;
        } else if (typeof previewFullscreen === 'string') {
            imageUrl = previewFullscreen;
        }

        if (!imageUrl) return;

        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `chat-image-${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            setShowImageMenu(false);
        } catch (error) {
            console.error('Error downloading image:', error);
            // Fallback for CORS or other issues
            const link = document.createElement('a');
            link.href = imageUrl;
            link.target = '_blank';
            link.download = `chat-image-${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setShowImageMenu(false);
        }
    };

    // Remove individual image from selection
    const handleRemoveIndividualImage = (indexToRemove) => {
        setSelectedImages(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    // Send the selected images
    const handleSendSelectedImage = async () => {
        if (selectedImages.length === 0 || !selectedChat) return;

        const imagesToSend = [...selectedImages];
        handleCancelImage(); // Clear selection immediately to close modal

        for (const item of imagesToSend) {
            const base64 = item.preview.split(',')[1];
            try {
                const response = await fetch('https://koretalk007.onrender.com/api/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: base64 })
                });

                const data = await response.json();

                if (data.url) {
                    const receiver = selectedChat.participants.find(p => p.uid !== currentUser.uid);

                    const msgResponse = await fetch('https://koretalk007.onrender.com/api/messages', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chatId: selectedChat._id,
                            senderUid: currentUser.uid,
                            content: item.file.name,
                            messageType: 'image',
                            fileUrl: data.url
                        })
                    });

                    const message = await msgResponse.json();
                    setMessages(prev => [...prev, message]);
                    sendMessage(receiver.uid, message);
                }
            } catch (error) {
                console.error('Error uploading image:', error);
            }
        }
    };

    // Handle image upload (legacy - not used anymore)
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedChat) return;

        const reader = new FileReader();
        reader.onload = async () => {
            const base64 = reader.result.split(',')[1];

            try {
                const response = await fetch('https://koretalk007.onrender.com/api/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: base64 })
                });

                const data = await response.json();

                if (data.url) {
                    const receiver = selectedChat.participants.find(p => p.uid !== currentUser.uid);

                    const msgResponse = await fetch('https://koretalk007.onrender.com/api/messages', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chatId: selectedChat._id,
                            senderUid: currentUser.uid,
                            content: file.name,
                            messageType: 'image',
                            fileUrl: data.url
                        })
                    });

                    const message = await msgResponse.json();
                    setMessages(prev => [...prev, message]);
                    sendMessage(receiver.uid, message);
                }
            } catch (error) {
                console.error('Error uploading image:', error);
            }
        };
        reader.readAsDataURL(file);
    };



    // Add emoji to message
    const addEmoji = (emoji) => {
        if (editingMessage) {
            setEditContent(prev => prev + emoji);
        } else {
            setNewMessage(prev => prev + emoji);
        }
        // Don't close picker automatically to allow multiple emojis
    };

    // Handle backspace in emoji picker
    const handleBackspace = () => {
        const deleteLastCharacter = (str) => {
            if (!str) return str;
            // Use Intl.Segmenter to correctly handle complex Emojis (surrogate pairs, ZWJ sequences, flags, etc.)
            if (typeof Intl !== 'undefined' && Intl.Segmenter) {
                const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
                const segments = Array.from(segmenter.segment(str)).map(s => s.segment);
                return segments.slice(0, -1).join('');
            }
            // Fallback
            const arr = [...str];
            return arr.slice(0, -1).join('');
        };

        if (editingMessage) {
            setEditContent(prev => deleteLastCharacter(prev));
        } else {
            setNewMessage(prev => deleteLastCharacter(prev));
        }
    };

    // Handle send button inside emoji picker
    const handleEmojiSend = () => {
        if (editingMessage) {
            handleEditMessage(editingMessage);
        } else {
            handleSendMessage({ preventDefault: () => { } });
        }
        setShowEmojiPicker(false);
    };

    // Get other user in chat
    const getOtherUser = (chat) => {
        return chat.participants.find(p => p.uid !== currentUser.uid);
    };

    // Filter users - show all users (friends and non-friends)
    const filteredUsers = users.filter(user => {
        const name = (user.displayName || user.email).toLowerCase();
        return name.includes(searchTerm.toLowerCase());
    });

    // Check if friend request already sent to a user
    const hasSentRequestToUser = (userUid) => {
        return dbUser?.sentRequests?.some(req => req.toUid === userUid);
    };

    // Check if user is a friend
    const isUserFriend = (userUid) => {
        return dbUser?.friends?.some(f => f.uid === userUid);
    };

    // Remove friend
    const handleRemoveFriend = async (friendUid) => {
        if (!window.confirm('Are you sure you want to remove this friend?')) {
            return;
        }
        try {
            const response = await fetch('https://koretalk007.onrender.com/api/users/remove-friend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userUid: currentUser.uid,
                    friendUid
                })
            });
            const data = await response.json();
            if (data.success) {
                fetchDbUser(currentUser.uid);
                // Refresh chats to remove the chat with this friend
                const chatResponse = await fetch(`https://koretalk007.onrender.com/api/chats/${currentUser.uid}`);
                const chatData = await chatResponse.json();
                setChats(chatData);
                // Clear selected chat if it was with this friend
                if (selectedChat) {
                    const otherUser = selectedChat.participants.find(p => p.uid !== currentUser.uid);
                    if (otherUser && otherUser.uid === friendUid) {
                        setSelectedChat(null);
                        setMessages([]);
                    }
                }
            } else {
                alert(data.error || 'Failed to remove friend');
            }
        } catch (error) {
            console.error('Error removing friend:', error);
            alert('Failed to remove friend. Please make sure the backend server is running and restarted.');
        }
    };

    // Filter chats
    const filteredChats = chats.filter(chat => {
        const user = getOtherUser(chat);
        const name = (user?.displayName || user?.email || '').toLowerCase();
        return name.includes(searchTerm.toLowerCase());
    });

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    const [showMessageMenu, setShowMessageMenu] = useState(null);
    const [selectedMessageIds, setSelectedMessageIds] = useState([]);

    const handleSelectMessage = (item) => {
        const isGroup = item.type === 'image-group';
        const mainMsg = isGroup ? item.messages[0] : item;

        // Only allow selecting user's own non-deleted messages
        if (!mainMsg.isDeleted && mainMsg.sender?.uid === currentUser.uid) {
            const itemIds = isGroup ? item.messages.map(m => m._id) : [item._id];

            setSelectedMessageIds(prev => {
                const allExists = itemIds.every(id => prev.includes(id));
                if (allExists) {
                    // Remove all from selection
                    return prev.filter(id => !itemIds.includes(id));
                } else {
                    // Add all to selection (unique)
                    return [...new Set([...prev, ...itemIds])];
                }
            });
            setEditingMessage(null); // Cancel any ongoing edit locally
            setEditContent('');
        }
    };

    const clearSelection = () => {
        setSelectedMessageIds([]);
    };

    const selectedMessages = messages.filter(m => selectedMessageIds.includes(m._id));
    const firstSelectedMessage = selectedMessages[0];

    return (
        <div className="dashboard">
            {/* Mobile Sidebar Toggle Button */}
            <button
                className="sidebar-toggle"
                onClick={toggleSidebar}
                aria-label="Toggle sidebar"
            >
                {sidebarOpen ? <FiX /> : <FiMenu />}
            </button>

            {/* Mobile Overlay */}
            <div
                className={`overlay ${sidebarOpen ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
            />

            {/* Sidebar */}
            <div
                className={`sidebar ${sidebarOpen ? 'active' : ''}`}
                ref={sidebarRef}
            >
                <div className="sidebar-header">
                    <h2>KoreTalk</h2>
                    <div className="sidebar-actions">
                        <button
                            className={`icon-btn ${showUsers ? 'active' : ''}`}
                            onClick={() => {
                                setShowUsers(!showUsers);
                                setShowFriendRequests(false);
                            }}
                            title="Find users"
                        >
                            <FiUserPlus />
                        </button>
                        <button
                            className={`icon-btn ${showFriendRequests ? 'active' : ''}`}
                            onClick={() => { setShowFriendRequests(!showFriendRequests); setShowUsers(false); }}
                            title="Friend requests"
                        >
                            <FiUsers />
                            {dbUser?.friendRequests?.length > 0 && (
                                <span className="badge">{dbUser.friendRequests.length}</span>
                            )}
                        </button>
                        <button className="icon-btn" onClick={handleLogout} title="Logout">
                            <FiLogOut />
                        </button>
                    </div>
                </div>

                <div className="search-bar">
                    <FiSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* User Profile */}
                <div className="user-profile">
                    {(dbUser?.photoURL || currentUser?.photoURL) ? (
                        <img
                            src={dbUser?.photoURL || currentUser?.photoURL}
                            alt="User"
                            className="user-avatar"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                const placeholder = e.target.nextSibling;
                                if (placeholder) placeholder.style.display = 'flex';
                            }}
                        />
                    ) : null}
                    <div
                        className="user-avatar user-avatar-placeholder"
                        style={{ display: (dbUser?.photoURL || currentUser?.photoURL) ? 'none' : 'flex' }}
                    />
                    <div className="user-info">
                        <span className="user-name">{dbUser?.displayName || currentUser?.displayName || 'User'}</span>
                        <span className="user-email">{currentUser?.email}</span>
                    </div>
                </div>

                {/* Users List (for friend requests) */}
                {showUsers && (
                    <div className="users-list">
                        <h3>Find Users</h3>
                        {filteredUsers.map(user => (
                            <div key={user.uid} className="user-item">
                                {user.photoURL ? (
                                    <img
                                        src={user.photoURL}
                                        alt="User"
                                        className="user-avatar-small"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'flex';
                                        }}
                                    />
                                ) : null}
                                <div
                                    className="user-avatar-small user-avatar-small-placeholder"
                                    style={{ display: user.photoURL ? 'none' : 'flex' }}
                                />
                                <div className="user-details">
                                    <span className="user-name">{user.displayName || user.email}</span>
                                </div>
                                {isUserFriend(user.uid) ? (
                                    <button
                                        className="remove-friend-btn"
                                        onClick={() => handleRemoveFriend(user.uid)}
                                    >
                                        Remove
                                    </button>
                                ) : (
                                    <button
                                        className="add-friend-btn"
                                        onClick={() => handleSendFriendRequest(user)}
                                        disabled={hasSentRequestToUser(user.uid)}
                                    >
                                        {hasSentRequestToUser(user.uid) ? 'Pending' : 'Add'}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Friend Requests */}
                {showFriendRequests && (
                    <div className="friend-requests">
                        <h3>Friend Requests</h3>
                        {dbUser?.friendRequests?.map(request => (
                            <div key={request._id} className="request-item">
                                {request.fromPhoto ? (
                                    <img
                                        src={request.fromPhoto}
                                        alt="User"
                                        className="user-avatar-small"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'flex';
                                        }}
                                    />
                                ) : null}
                                <div
                                    className="user-avatar-small user-avatar-small-placeholder"
                                    style={{ display: request.fromPhoto ? 'none' : 'flex' }}
                                />
                                <div className="request-details">
                                    <span className="user-name">{request.fromName}</span>
                                </div>
                                <div className="request-actions">
                                    <button
                                        className="accept-btn"
                                        onClick={() => handleAcceptRequest(request._id)}
                                    >
                                        <FiCheck />
                                    </button>
                                    <button
                                        className="reject-btn"
                                        onClick={() => handleRejectRequest(request._id)}
                                    >
                                        <FiX />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Chats List */}
                {!showUsers && !showFriendRequests && (
                    <div className="chats-list">
                        {filteredChats.map(chat => {
                            const otherUser = getOtherUser(chat);
                            return (
                                <div
                                    key={chat._id}
                                    className={`chat-item ${selectedChat?._id === chat._id ? 'active' : ''}`}
                                    onClick={() => setSelectedChat(chat)}
                                >
                                    {otherUser?.photoURL ? (
                                        <img
                                            src={otherUser.photoURL}
                                            alt="User"
                                            className="user-avatar-small"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                            }}
                                        />
                                    ) : null}
                                    <div
                                        className="user-avatar-small user-avatar-small-placeholder"
                                        style={{ display: otherUser?.photoURL ? 'none' : 'flex' }}
                                    />
                                    <div className="chat-details">
                                        <span className="chat-name">{otherUser?.displayName || otherUser?.email}</span>
                                        {/* <span className="last-message">{chat.lastMessage || 'No messages yet'}</span> */}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Chat Area */}
            <div className="chat-area">
                {selectedChat ? (
                    <>
                        <div className={`chat-header ${selectedMessageIds.length > 0 ? 'selection-mode' : ''}`}>
                            {selectedMessageIds.length > 0 ? (
                                <>
                                    <button className="icon-btn cancel-selection" onClick={clearSelection} title="Cancel Selection">
                                        <FiX />
                                    </button>
                                    <span className="selection-count">{selectedMessageIds.length} Selected</span>
                                    <div className="chat-header-actions selection-actions">
                                        {selectedMessageIds.length === 1 && firstSelectedMessage?.messageType !== 'audio' && (
                                            <button
                                                className="edit-action-btn"
                                                onClick={() => {
                                                    if (firstSelectedMessage) {
                                                        startEditing(firstSelectedMessage);
                                                        clearSelection();
                                                    }
                                                }}
                                                title="Edit Message"
                                            >
                                                <FiEdit /> <span className="action-text">Edit</span>
                                            </button>
                                        )}
                                        <button
                                            className="delete-action-btn remove-messages-btn"
                                            onClick={() => handleDeleteMessages(selectedMessageIds)}
                                            title="Delete Selected"
                                        >
                                            <FiTrash2 /> <span className="action-text">Delete</span>
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {getOtherUser(selectedChat)?.photoURL ? (
                                        <img
                                            src={getOtherUser(selectedChat).photoURL}
                                            alt="User"
                                            className="user-avatar"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                            }}
                                        />
                                    ) : null}
                                    <div
                                        className="user-avatar user-avatar-placeholder"
                                        style={{ display: getOtherUser(selectedChat)?.photoURL ? 'none' : 'flex' }}
                                    />
                                    <span className="chat-name">{getOtherUser(selectedChat)?.displayName || getOtherUser(selectedChat)?.email}</span>
                                    <div className="chat-header-actions">
                                        <button
                                            className="remove-messages-btn"
                                            onClick={handleRemoveAllMyMessages}
                                            title="Remove all my messages"
                                        >
                                            <FiTrash2 /> <span className="action-text">Remove My Messages</span>
                                        </button>
                                        {isBlocked ? (
                                            <button
                                                className="unblock-btn"
                                                onClick={handleUnblockUser}
                                                title="Unblock user"
                                            >
                                                <FiUnlock /> <span className="action-text">Unblock</span>
                                            </button>
                                        ) : (
                                            <button
                                                className="block-btn"
                                                onClick={handleBlockUser}
                                                title="Block user"
                                            >
                                                <FiLock /> <span className="action-text">Block</span>
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className={`messages ${isBlocked ? 'disabled' : ''}`}>
                            {isBlocked && (
                                <div className="blocked-notice">
                                    <FiLock />
                                    <p>You have blocked this user. Unblock to send messages.</p>
                                </div>
                            )}
                            {(() => {
                                const groupedMessages = [];
                                messages.forEach((msg, index) => {
                                    const prevMsg = messages[index - 1];
                                    const isImage = msg.messageType === 'image';
                                    const isSameSender = prevMsg && (msg.sender?.uid || msg.senderUid) === (prevMsg.sender?.uid || prevMsg.senderUid);
                                    const timeDiff = prevMsg ? (new Date(msg.createdAt) - new Date(prevMsg.createdAt)) / 1000 : Infinity;

                                    if (isImage && prevMsg && prevMsg.messageType === 'image' && isSameSender && timeDiff < 15) {
                                        const lastGroup = groupedMessages[groupedMessages.length - 1];
                                        if (lastGroup.type === 'image-group') {
                                            lastGroup.messages.push(msg);
                                        } else {
                                            groupedMessages.pop();
                                            groupedMessages.push({
                                                type: 'image-group',
                                                messages: [prevMsg, msg],
                                                senderUid: msg.senderUid,
                                                sender: msg.sender,
                                                createdAt: msg.createdAt,
                                                _id: `group-${msg._id}`
                                            });
                                        }
                                    } else {
                                        groupedMessages.push({ ...msg, type: 'single' });
                                    }
                                });

                                return groupedMessages.map((gMsg, index) => {
                                    const isGroup = gMsg.type === 'image-group';
                                    const msg = isGroup ? gMsg.messages[0] : gMsg;
                                    const sender = msg.sender || users.find(u => u.uid === msg.senderUid);
                                    const isSentByMe = (msg.sender?.uid || msg.senderUid) === currentUser.uid;

                                    const isAnySelected = isGroup
                                        ? gMsg.messages.some(m => selectedMessageIds.includes(m._id))
                                        : selectedMessageIds.includes(gMsg._id);

                                    return (
                                        <div
                                            key={gMsg._id || index}
                                            className={`message-wrapper ${isSentByMe ? 'sent' : 'received'} ${isAnySelected ? 'selected-wrapper' : ''} ${isGroup ? 'group-wrapper' : ''} ${msg.isEdited ? 'has-edited' : ''}`}
                                        >
                                            {sender?.photoURL ? (
                                                <img
                                                    src={sender.photoURL}
                                                    alt="User"
                                                    className="message-avatar"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'flex';
                                                    }}
                                                />
                                            ) : null}
                                            <div
                                                className="message-avatar message-avatar-placeholder"
                                                style={{ display: sender?.photoURL ? 'none' : 'flex' }}
                                            />

                                            <div
                                                className={`message ${isSentByMe ? 'sent' : 'received'} ${msg.isDeleted ? 'deleted' : ''} ${msg.isError ? 'error' : ''} ${isAnySelected ? 'selected' : ''} ${isGroup ? 'group-message' : ''}`}
                                                onDoubleClick={() => handleSelectMessage(gMsg)}
                                                onContextMenu={(e) => {
                                                    if (window.innerWidth <= 768) {
                                                        e.preventDefault();
                                                        handleSelectMessage(gMsg);
                                                    }
                                                }}
                                            >
                                                {isGroup ? (
                                                    <div className="message-content-container">
                                                        <div className={`image-grid grid-${Math.min(gMsg.messages.length, 5)}`}>
                                                            {gMsg.messages.map((imgMsg, imgIndex) => (
                                                                <div key={imgMsg._id || imgIndex} className="image-grid-item">
                                                                    <img
                                                                        src={imgMsg.fileUrl}
                                                                        alt="Shared"
                                                                        className="message-image"
                                                                        onClick={() => setFullscreenImage(imgMsg)}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : msg.messageType === 'image' ? (
                                                    <div className="message-content-container">
                                                        <div className="message-image-container">
                                                            <img
                                                                src={msg.fileUrl}
                                                                alt="Shared"
                                                                className="message-image"
                                                                onClick={() => setFullscreenImage(msg)}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : msg.messageType === 'file' ? (
                                                    <div className="message-content-container">
                                                        <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="message-file">
                                                            <FiPaperclip /> {msg.fileName || msg.content}
                                                        </a>
                                                    </div>
                                                ) : msg.messageType === 'audio' ? (
                                                    <div className="message-content-container">
                                                        <AudioPlayer
                                                            src={msg.fileUrl}
                                                            durationLabel={msg.content}
                                                            isSentByMe={isSentByMe}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="message-content-container">
                                                        <p className="message-content">
                                                            {msg.content}
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="message-info">
                                                    <span className="message-date">{new Date(msg.createdAt).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}</span>
                                                    <span className="message-time">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                            {msg.isEdited && <div className="edited-label">(Edited)</div>}
                                        </div>
                                    );
                                });
                            })()}
                            <div ref={messagesEndRef} />
                        </div>

                        <form className={`message-input ${isBlocked ? 'disabled' : ''}`} onSubmit={(e) => {
                            e.preventDefault();
                            if (editingMessage) {
                                handleEditMessage(editingMessage);
                            } else {
                                handleSendMessage(e);
                            }
                        }} disabled={isBlocked}>
                            {editingMessage ? (
                                <div className="unified-input-area edit-mode">
                                    <button type="button" className="emoji-btn-unified cancel-edit-btn" onClick={cancelEditing} title="Cancel Edit">
                                        <FiX />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        className="emoji-btn-unified"
                                        title="Emojis"
                                    >
                                        <FiSmile />
                                    </button>
                                    <div className="edit-indicator">
                                        <FiEdit />
                                    </div>
                                    <input
                                        type="text"
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        autoFocus
                                        placeholder="Edit message..."
                                    />
                                    <button type="submit" className="send-btn-unified save-edit-btn" title="Save changes">
                                        <FiCheck />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Image Preview */}
                                    {/* Image Preview removed from here and moved to a modal overlay below */}

                                    {selectedImages.length === 0 && (
                                        <div className="unified-input-area">
                                            {isRecording ? (
                                                <>
                                                    <button type="button" className="emoji-btn-unified cancel-recording-btn" onClick={cancelRecording} title="Cancel Recording">
                                                        <FiX />
                                                    </button>
                                                    <div className="recording-indicator">
                                                        <div className="recording-dot blink"></div>
                                                        <span className="recording-time">{formatTime(recordingTime)}</span>
                                                    </div>
                                                    <div className="input-right-actions">
                                                        <button type="button" className="send-btn-unified recording-send-btn" onClick={stopRecordingAndSend} title="Send voice message">
                                                            <FiSend />
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                                        className="emoji-btn-unified"
                                                        title="Emojis"
                                                    >
                                                        <FiSmile />
                                                    </button>

                                                    <input
                                                        type="text"
                                                        placeholder="Type a message..."
                                                        value={newMessage}
                                                        onChange={(e) => setNewMessage(e.target.value)}
                                                    />

                                                    <input
                                                        type="file"
                                                        ref={imageInputRef}
                                                        onChange={handleImageSelect}
                                                        accept="image/*"
                                                        multiple
                                                        style={{ display: 'none' }}
                                                    />

                                                    <div className="input-right-actions">
                                                        <button
                                                            type="button"
                                                            className="attach-btn-unified"
                                                            onClick={startRecording}
                                                            title="Voice message"
                                                        >
                                                            <FiMic />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="attach-btn-unified"
                                                            onClick={() => imageInputRef.current?.click()}
                                                            title="Attach image"
                                                        >
                                                            <FiImage />
                                                        </button>

                                                        <button type="submit" className="send-btn-unified" title="Send message">
                                                            <FiSend />
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                </>
                            )}
                        </form>
                        {showEmojiPicker && (
                            <EmojiPicker
                                onEmojiSelect={addEmoji}
                                onClose={() => setShowEmojiPicker(false)}
                                onBackspace={handleBackspace}
                                onSend={handleEmojiSend}
                            />
                        )}
                    </>
                ) : (
                    <div className="no-chat-selected">
                        <FiMessageCircle className="no-chat-icon" />
                        <h3>Select a chat to start messaging</h3>
                    </div>
                )}
            </div>

            {/* Fullscreen Image Viewer */}
            {fullscreenImage && (
                <div className="fullscreen-image-overlay" onClick={() => { setFullscreenImage(null); setShowImageMenu(false); }}>
                    <div className="fullscreen-menu-container" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="fullscreen-menu-btn"
                            onClick={(e) => { e.stopPropagation(); setShowImageMenu(!showImageMenu); }}
                            title="Menu"
                        >
                            <FiMoreHorizontal />
                        </button>
                        {showImageMenu && (
                            <div className="fullscreen-menu">
                                <button
                                    className="fullscreen-menu-item"
                                    onClick={() => setFullscreenImage(null)}
                                    title="Close"
                                >
                                    <FiX /> Close
                                </button>
                                <button
                                    className="fullscreen-menu-item"
                                    onClick={handleDownloadImage}
                                    title="Download"
                                >
                                    <FiDownload /> Download
                                </button>
                                {typeof fullscreenImage === 'object' && (fullscreenImage.sender?.uid === currentUser.uid || fullscreenImage.senderUid === currentUser.uid) && (
                                    <button
                                        className="fullscreen-menu-item remove-action-btn"
                                        onClick={() => {
                                            handleDeleteMessages(fullscreenImage._id);
                                            setFullscreenImage(null);
                                        }}
                                        title="Remove"
                                    >
                                        <FiTrash2 /> Remove
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    <img
                        src={typeof fullscreenImage === 'object' ? fullscreenImage.fileUrl : fullscreenImage}
                        alt="Fullscreen"
                        className="fullscreen-image"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            {/* Fullscreen Preview Image Viewer */}
            {previewFullscreen && (
                <div className="fullscreen-image-overlay" onClick={() => { setPreviewFullscreen(null); setShowImageMenu(false); }}>
                    <div className="fullscreen-menu-container" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="fullscreen-menu-btn"
                            onClick={(e) => { e.stopPropagation(); setShowImageMenu(!showImageMenu); }}
                            title="Menu"
                        >
                            <FiMoreHorizontal />
                        </button>
                        {showImageMenu && (
                            <div className="fullscreen-menu">
                                <button
                                    className="fullscreen-menu-item"
                                    onClick={() => setPreviewFullscreen(null)}
                                    title="Close"
                                >
                                    <FiX /> Close
                                </button>
                                <button
                                    className="fullscreen-menu-item"
                                    onClick={handleDownloadImage}
                                    title="Download"
                                >
                                    <FiDownload /> Download
                                </button>
                                <button
                                    className="fullscreen-menu-item remove-action-btn"
                                    onClick={() => {
                                        const idx = typeof previewFullscreen === 'object' ? previewFullscreen.index : -1;
                                        if (idx !== -1) {
                                            handleRemoveIndividualImage(idx);
                                        }
                                        setPreviewFullscreen(null);
                                    }}
                                    title="Remove"
                                >
                                    <FiTrash2 /> Remove
                                </button>
                            </div>
                        )}
                    </div>
                    <img
                        src={typeof previewFullscreen === 'object' ? previewFullscreen.url : previewFullscreen}
                        alt="Preview Fullscreen"
                        className="fullscreen-image"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            {/* Telegram-Style Send Photo Modal */}
            {selectedImages.length > 0 && !previewFullscreen && (
                <div className="send-photo-modal-overlay">
                    <div className="send-photo-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="send-photo-header">
                            <button type="button" className="close-btn" onClick={handleCancelImage} title="Cancel">
                                <FiX />
                            </button>
                            <h3>Send {selectedImages.length} {selectedImages.length === 1 ? 'Photo' : 'Photos'}</h3>
                        </div>
                        <div className="send-photo-content images-list-view">
                            {selectedImages.map((item, index) => (
                                <div key={index} className="send-photo-item">
                                    <img
                                        src={item.preview}
                                        alt={`Preview ${index}`}
                                        className="send-photo-image"
                                        onClick={() => setPreviewFullscreen({ url: item.preview, index })}
                                    />
                                    <button
                                        type="button"
                                        className="remove-image-text-btn"
                                        onClick={() => handleRemoveIndividualImage(index)}
                                        title="Remove this image"
                                    >
                                        <FiTrash2 />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="send-photo-footer">
                            <button
                                type="button"
                                className="send-btn-floating"
                                onClick={handleSendSelectedImage}
                                title="Send Photo"
                            >
                                <FiSend />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
