import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FcGoogle } from 'react-icons/fc';
import { FiEye, FiEyeOff, FiImage, FiLink, FiX, FiUpload, FiCheck } from 'react-icons/fi';
import './Auth.css';

const Register = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [confirmPasswordError, setConfirmPasswordError] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);
    const [imageUrl, setImageUrl] = useState('');
    const [uploadMethod, setUploadMethod] = useState('file'); // 'file' or 'url'
    const fileInputRef = useRef(null);
    const { signup, loginWithGoogle, fetchDbUser, dbUserLoading } = useAuth();
    const navigate = useNavigate();

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setError('Image size must be less than 5MB');
                return;
            }
            const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
                return;
            }
            const previewUrl = URL.createObjectURL(file);
            setImagePreview(previewUrl);
            setImageUrl('');
            setError('');
        }
    };

    const handleImageUrlChange = (e) => {
        const url = e.target.value;
        setImageUrl(url);
        if (url) {
            setImagePreview(url);
        } else {
            setImagePreview(null);
        }
        setError('');
    };

    const handleRemoveImage = () => {
        setImagePreview(null);
        setImageUrl('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const handleConfirmPasswordChange = (e) => {
        const value = e.target.value;
        setConfirmPassword(value);
        if (value && password && value !== password) {
            setConfirmPasswordError('Password does not match');
        } else {
            setConfirmPasswordError('');
        }
    };

    const handlePasswordChange = (e) => {
        const value = e.target.value;
        setPassword(value);
        if (confirmPassword && value && value !== confirmPassword) {
            setConfirmPasswordError('Password does not match');
        } else {
            setConfirmPasswordError('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setConfirmPasswordError('Password does not match');
            return;
        }

        if (password.length < 6) {
            return setError('Password must be at least 6 characters');
        }

        setLoading(true);

        try {
            const result = await signup(email, password);
            const uid = result.user.uid;
            // Update display name and profile image
            const updateData = { displayName };
            if (imagePreview) {
                updateData.photoURL = imagePreview;
            }
            await fetch(`http://localhost:5000/api/users/update/${uid}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            // Fetch and update user data in context
            await fetchDbUser(uid);
            // Wait for dbUser to be loaded before navigating
            while (dbUserLoading) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            navigate('/dashboard');
        } catch (err) {
            setError(getErrorMessage(err.code));
        }

        setLoading(false);
    };

    const handleGoogleSignup = async () => {
        setError('');
        setLoading(true);

        try {
            await loginWithGoogle();
            // Wait for dbUser to be loaded before navigating
            while (dbUserLoading) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            navigate('/dashboard');
        } catch (err) {
            setError(getErrorMessage(err.code));
        }

        setLoading(false);
    };

    const getErrorMessage = (code) => {
        switch (code) {
            case 'auth/email-already-in-use':
                return 'Email already registered';
            case 'auth/invalid-email':
                return 'Invalid email address';
            case 'auth/weak-password':
                return 'Password is too weak';
            case 'auth/popup-closed-by-user':
                return 'Popup was closed before completing sign up';
            default:
                return 'An error occurred. Please try again';
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h1>Create Account</h1>
                    <p>Join us and start chatting</p>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="profile-image-section">
                        <div className="profile-image-container">
                            <div className="profile-image-preview">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Profile preview" className="preview-image" />
                                ) : (
                                    <div className="profile-image-placeholder">
                                        <FiImage />
                                        <span>Add Photo</span>
                                    </div>
                                )}
                            </div>
                            {imagePreview && (
                                <button type="button" className="remove-image-btn" onClick={handleRemoveImage}>
                                    Remove
                                </button>
                            )}
                        </div>
                        <div className="upload-method-tabs">
                            <button
                                type="button"
                                className={`upload-tab ${uploadMethod === 'file' ? 'active' : ''}`}
                                onClick={() => setUploadMethod('file')}
                            >
                                <FiUpload />
                                Upload File
                            </button>
                            <button
                                type="button"
                                className={`upload-tab ${uploadMethod === 'url' ? 'active' : ''}`}
                                onClick={() => setUploadMethod('url')}
                            >
                                <FiLink />
                                Use Link
                            </button>
                        </div>
                        {uploadMethod === 'file' ? (
                            <div className="file-upload-area" onClick={triggerFileInput}>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImageSelect}
                                    accept="image/jpeg,image/png,image/gif,image/webp"
                                    className="file-input"
                                />
                                <div className="file-upload-content">
                                    <FiImage className="upload-icon" />
                                    <span>Click to select image</span>
                                    <small>JPEG, PNG, GIF, WebP (max 5MB)</small>
                                </div>
                            </div>
                        ) : (
                            <div className="url-input-area">
                                <input
                                    type="url"
                                    value={imageUrl}
                                    onChange={handleImageUrlChange}
                                    placeholder="Paste image URL here..."
                                    className="url-input"
                                />
                                {imageUrl && (
                                    <div className="url-valid-indicator">
                                        <FiCheck /> URL added
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Display Name</label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Enter your name"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <div className="password-input-wrapper">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={handlePasswordChange}
                                placeholder="Create a password"
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <FiEyeOff /> : <FiEye />}
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Confirm Password</label>
                        <div className="password-input-wrapper">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={handleConfirmPasswordChange}
                                placeholder="Confirm your password"
                                className={confirmPasswordError ? 'input-error' : ''}
                                required
                            />
                            {confirmPasswordError && (
                                <span className="field-error">{confirmPasswordError}</span>
                            )}
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="auth-btn" disabled={loading}>
                        {loading ? 'Creating account...' : 'Sign Up'}
                    </button>
                </form>

                <div className="auth-divider">
                    <span>or</span>
                </div>

                <button
                    onClick={handleGoogleSignup}
                    className="google-btn"
                    disabled={loading}
                >
                    <FcGoogle className="google-icon" />
                    Continue with Google
                </button>

                <div className="auth-footer">
                    <p>
                        Already have an account? <Link to="/login">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
