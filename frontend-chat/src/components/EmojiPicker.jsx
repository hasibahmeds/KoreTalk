import React, { useState, useEffect, useRef } from 'react';
import {
    FiClock, FiSmile, FiGithub, FiCoffee, FiActivity,
    FiTruck, FiSun, FiType, FiHash, FiFlag, FiX, FiDelete, FiSearch, FiSend
} from 'react-icons/fi';
import { FaKeyboard } from "react-icons/fa";
import { EMOJI_CATEGORIES } from '../data/emojiData';
import { useAuth } from '../context/AuthContext';
import './EmojiPicker.css';

const RECENTLY_USED_KEY_PREFIX = 'vibe_chat_recent_emojis_';

const EmojiPicker = ({ onEmojiSelect, onClose, onBackspace, onSend }) => {
    const { currentUser } = useAuth();
    const [recentlyUsed, setRecentlyUsed] = useState([]);
    const [activeTab, setActiveTab] = useState('smileys');
    const [searchQuery, setSearchQuery] = useState('');
    const [keyboardMode, setKeyboardMode] = useState(false);
    const pickerRef = useRef(null);
    const scrollRef = useRef(null);
    const categoryRefs = useRef({});
    const navScrollRef = useRef(null);

    // Horizontal drag-to-scroll state
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const handleNavMouseDown = (e) => {
        setIsDragging(true);
        setStartX(e.pageX - navScrollRef.current.offsetLeft);
        setScrollLeft(navScrollRef.current.scrollLeft);
    };

    const handleNavMouseLeave = () => {
        setIsDragging(false);
    };

    const handleNavMouseUp = () => {
        setIsDragging(false);
    };

    const handleNavMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - navScrollRef.current.offsetLeft;
        const walk = (x - startX) * 1.5; // Natural speed mapping
        navScrollRef.current.scrollLeft = scrollLeft - walk;
    };

    // Load recently used emojis
    useEffect(() => {
        const userId = currentUser?.uid || 'guest';
        const storageKey = `${RECENTLY_USED_KEY_PREFIX}${userId}`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            setRecentlyUsed(JSON.parse(stored));
        }

        // Listen for storage changes across tabs
        const handleStorageChange = (e) => {
            if (e.key === storageKey) {
                try {
                    const newData = e.newValue ? JSON.parse(e.newValue) : [];
                    setRecentlyUsed(newData);
                } catch (err) {
                    console.error('Failed to parse storage update', err);
                }
            }
        };

        // Click outside listener
        const handleClickOutside = (event) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target)) {
                // Don't close if keyboard mode is active
                if (!keyboardMode) {
                    onClose();
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose, keyboardMode, currentUser]);

    // Intersection Observer for scroll-spy
    useEffect(() => {
        if (searchQuery !== '') return;

        const observerOptions = {
            root: scrollRef.current,
            threshold: 0.1,
            rootMargin: '-50px 0px -70% 0px'
        };

        const handleIntersect = (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setActiveTab(entry.target.getAttribute('data-id'));
                }
            });
        };

        const observer = new IntersectionObserver(handleIntersect, observerOptions);

        // Use a small timeout to ensure refs are populated
        const timeoutId = setTimeout(() => {
            Object.entries(categoryRefs.current).forEach(([id, ref]) => {
                if (ref) observer.observe(ref);
            });
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            observer.disconnect();
        };
    }, [searchQuery, recentlyUsed.length]);

    // Handle emoji selection
    const handleSelect = (emoji) => {
        onEmojiSelect(emoji);

        // Update recently used
        const updated = [emoji, ...recentlyUsed.filter(e => e !== emoji)].slice(0, 50);
        setRecentlyUsed(updated);
        const userId = currentUser?.uid || 'guest';
        const storageKey = `${RECENTLY_USED_KEY_PREFIX}${userId}`;
        localStorage.setItem(storageKey, JSON.stringify(updated));
    };

    // Scroll to category
    const scrollToCategory = (id) => {
        setActiveTab(id);
        const element = categoryRefs.current[id];
        if (element && scrollRef.current) {
            // Calculate accurate top offset relative to the scroll container
            const containerTop = scrollRef.current.getBoundingClientRect().top;
            const elementTop = element.getBoundingClientRect().top;
            const currentScroll = scrollRef.current.scrollTop;

            scrollRef.current.scrollTo({
                top: currentScroll + (elementTop - containerTop) - 8,
                behavior: 'smooth'
            });
        }
    };

    // Filter emojis based on search
    const filteredCategories = searchQuery.trim() === ''
        ? EMOJI_CATEGORIES
        : EMOJI_CATEGORIES.map(cat => ({
            ...cat,
            emojis: cat.emojis.filter(e => e.includes(searchQuery) || cat.name.toLowerCase().includes(searchQuery.toLowerCase()))
        })).filter(cat => cat.emojis.length > 0);

    const navItems = [
        ...(recentlyUsed.length > 0 ? [{ id: 'recent', icon: <FiClock />, name: 'Recent' }] : []),
        { id: 'keyboard', icon: <FaKeyboard />, name: 'Keyboard Mode', isKeyboard: true },
        { id: 'smileys', icon: <FiSmile />, name: 'Smileys' },
        { id: 'people', icon: <FiType />, name: 'People' },
        { id: 'animals', icon: <FiGithub />, name: 'Animals' },
        { id: 'food', icon: <FiCoffee />, name: 'Food' },
        { id: 'activities', icon: <FiActivity />, name: 'Activities' },
        { id: 'travel', icon: <FiTruck />, name: 'Travel' },
        { id: 'objects', icon: <FiSun />, name: 'Objects' },
        { id: 'symbols', icon: <FiHash />, name: 'Symbols' },
        { id: 'flags', icon: <FiFlag />, name: 'Flags' }
    ];

    return (
        <div className="tg-emoji-picker" ref={pickerRef} onClick={(e) => e.stopPropagation()}>
            <div className="tg-emoji-header">
                <div className="tg-emoji-nav-container">
                    <div
                        className="tg-emoji-nav"
                        ref={navScrollRef}
                        onMouseDown={handleNavMouseDown}
                        onMouseLeave={handleNavMouseLeave}
                        onMouseUp={handleNavMouseUp}
                        onMouseMove={handleNavMouseMove}
                        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                    >
                        {navItems.map(item => {
                            const isKeyboardItem = item.id === 'keyboard';
                            const isActive = isKeyboardItem ? keyboardMode : activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    className={`tg-nav-item ${isActive ? 'active' : ''} ${isKeyboardItem ? 'keyboard-mode' : ''}`}
                                    onClick={() => {
                                        if (isKeyboardItem) {
                                            setKeyboardMode(prev => !prev);
                                        } else {
                                            scrollToCategory(item.id);
                                        }
                                    }}
                                    title={item.name}
                                >
                                    {item.icon}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="tg-emoji-search">
                    <FiSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search emojis..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                    {searchQuery && (
                        <button type="button" className="clear-search" onClick={() => setSearchQuery('')}>
                            <FiX />
                        </button>
                    )}
                </div>
            </div>

            <div className="tg-emoji-body" ref={scrollRef}>
                {searchQuery === '' && recentlyUsed.length > 0 && (
                    <div
                        className="tg-emoji-section"
                        ref={el => categoryRefs.current['recent'] = el}
                        data-id="recent"
                    >
                        <h4 className="tg-section-title">Recently Used</h4>
                        <div className="tg-emoji-grid">
                            {recentlyUsed.map((emoji, idx) => (
                                <button
                                    key={`recent-${idx}`}
                                    type="button"
                                    className="tg-emoji-item"
                                    onClick={() => handleSelect(emoji)}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {filteredCategories.map(category => (
                    <div
                        key={category.id}
                        className="tg-emoji-section"
                        ref={el => categoryRefs.current[category.id] = el}
                        data-id={category.id}
                    >
                        <h4 className="tg-section-title">{category.name}</h4>
                        <div className="tg-emoji-grid">
                            {category.emojis.map((emoji, idx) => (
                                <button
                                    key={`${category.id}-${idx}`}
                                    type="button"
                                    className="tg-emoji-item"
                                    onClick={() => handleSelect(emoji)}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}

                {filteredCategories.length === 0 && searchQuery !== '' && (
                    <div className="no-results">
                        <p>No emojis found</p>
                    </div>
                )}
            </div>

            <div className="tg-emoji-footer">
                <button type="button" className="tg-footer-btn backspace-btn" onClick={onBackspace} title="Backspace">
                    <FiDelete />
                </button>
                <button type="button" className="tg-footer-btn send-emoji-btn" onClick={onSend} title="Send">
                    <FiSend />
                </button>
            </div>
        </div>
    );
};

export default EmojiPicker;

