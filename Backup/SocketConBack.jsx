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
        socketRef.current = io('http://localhost:5000');

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
        onReceiveMessage,
        onMessageEdited,
        onMessageDeleted,
        onFriendRequest,
        onFriendRequestAccepted,
        onTyping,
        removeAllListeners
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};
