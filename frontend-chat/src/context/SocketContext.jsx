import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const socketRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);
    const { currentUser, dbUser } = useAuth();

    useEffect(() => {
        // Initialize socket connection
        socketRef.current = io('https://koretalk007.onrender.com');

        socketRef.current.on('connect', () => {
            console.log('Connected to socket server');
            setIsConnected(true);
        });

        socketRef.current.on('disconnect', () => {
            console.log('Disconnected from socket server');
            setIsConnected(false);
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    // Join user's room when logged in
    useEffect(() => {
        if (socketRef.current && currentUser) {
            socketRef.current.emit('join_chat', currentUser.uid);
        }
    }, [currentUser]);

    const sendMessage = (receiverId, message) => {
        if (socketRef.current) {
            socketRef.current.emit('send_message', {
                receiverId,
                message,
                senderId: currentUser.uid
            });
        }
    };

    const sendEditedMessage = (receiverId, message) => {
        if (socketRef.current) {
            socketRef.current.emit('message_edited', { receiverId, message });
        }
    };

    const sendDeletedMessage = (receiverId, messageId) => {
        if (socketRef.current) {
            socketRef.current.emit('message_deleted', { receiverId, messageId });
        }
    };

    const sendFriendRequest = (receiverId, request) => {
        if (socketRef.current) {
            socketRef.current.emit('friend_request', { receiverId, request });
        }
    };

    const sendFriendRequestAccepted = (receiverId, user) => {
        if (socketRef.current) {
            socketRef.current.emit('friend_request_accepted', { receiverId, user });
        }
    };

    const sendTyping = (receiverId, isTyping) => {
        if (socketRef.current) {
            socketRef.current.emit('typing', { receiverId, isTyping });
        }
    };

    // ───── WebRTC Call Signaling ─────
    const sendCallOffer = (receiverId, callerId, callerName, callerPhoto, offer, callType) => {
        if (socketRef.current) {
            socketRef.current.emit('call_offer', { receiverId, callerId, callerName, callerPhoto, offer, callType });
        }
    };

    const sendCallAnswer = (callerId, answer) => {
        if (socketRef.current) {
            socketRef.current.emit('call_answer', { callerId, answer });
        }
    };

    const sendCallRejected = (callerId) => {
        if (socketRef.current) {
            socketRef.current.emit('call_rejected', { callerId });
        }
    };

    const sendCallEnded = (receiverId) => {
        if (socketRef.current) {
            socketRef.current.emit('call_ended', { receiverId });
        }
    };

    const sendIceCandidate = (receiverId, candidate) => {
        if (socketRef.current) {
            socketRef.current.emit('ice_candidate', { receiverId, candidate });
        }
    };

    // ───── Listener helpers ─────
    const onReceiveMessage = (callback) => {
        if (socketRef.current) {
            socketRef.current.on('receive_message', callback);
        }
    };

    const onMessageEdited = (callback) => {
        if (socketRef.current) {
            socketRef.current.on('message_edited', callback);
        }
    };

    const onMessageDeleted = (callback) => {
        if (socketRef.current) {
            socketRef.current.on('message_deleted', callback);
        }
    };

    const onFriendRequest = (callback) => {
        if (socketRef.current) {
            socketRef.current.on('friend_request', callback);
        }
    };

    const onFriendRequestAccepted = (callback) => {
        if (socketRef.current) {
            socketRef.current.on('friend_request_accepted', callback);
        }
    };

    const onTyping = (callback) => {
        if (socketRef.current) {
            socketRef.current.on('typing', callback);
        }
    };

    const onIncomingCall = (callback) => {
        if (socketRef.current) {
            socketRef.current.on('incoming_call', callback);
        }
    };

    const onCallAnswered = (callback) => {
        if (socketRef.current) {
            socketRef.current.on('call_answered', callback);
        }
    };

    const onCallRejected = (callback) => {
        if (socketRef.current) {
            socketRef.current.on('call_rejected', callback);
        }
    };

    const onCallEnded = (callback) => {
        if (socketRef.current) {
            socketRef.current.on('call_ended', callback);
        }
    };

    const onIceCandidate = (callback) => {
        if (socketRef.current) {
            socketRef.current.on('ice_candidate', callback);
        }
    };

    const removeAllListeners = () => {
        if (socketRef.current) {
            socketRef.current.removeAllListeners();
        }
    };

    const value = {
        socket: socketRef.current,
        isConnected,
        sendMessage,
        sendEditedMessage,
        sendDeletedMessage,
        sendFriendRequest,
        sendFriendRequestAccepted,
        sendTyping,
        // call signaling emitters
        sendCallOffer,
        sendCallAnswer,
        sendCallRejected,
        sendCallEnded,
        sendIceCandidate,
        // message listeners
        onReceiveMessage,
        onMessageEdited,
        onMessageDeleted,
        onFriendRequest,
        onFriendRequestAccepted,
        onTyping,
        // call listeners
        onIncomingCall,
        onCallAnswered,
        onCallRejected,
        onCallEnded,
        onIceCandidate,
        removeAllListeners
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};
