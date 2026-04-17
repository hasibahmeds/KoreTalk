import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FcGoogle } from 'react-icons/fc';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import './Auth.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, loginWithGoogle, dbUserLoading } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
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

    const handleGoogleLogin = async () => {
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
            case 'auth/invalid-email':
                return 'Invalid email address';
            case 'auth/user-disabled':
                return 'This user has been disabled';
            case 'auth/user-not-found':
                return 'No user found with this email';
            case 'auth/wrong-password':
                return 'Wrong password';
            case 'auth/invalid-credential':
                return 'Invalid email or password';
            case 'auth/popup-closed-by-user':
                return 'Popup was closed before completing sign in';
            default:
                return 'An error occurred. Please try again';
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h1>Welcome Back</h1>
                    <p>Sign in to continue chatting</p>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
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
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
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

                    <button type="submit" className="auth-btn" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div className="auth-divider">
                    <span>or</span>
                </div>

                <button
                    onClick={handleGoogleLogin}
                    className="google-btn"
                    disabled={loading}
                >
                    <FcGoogle className="google-icon" />
                    Continue with Google
                </button>

                <div className="auth-footer">
                    <p>
                        Don't have an account? <Link to="/register">Sign up</Link>
                    </p>
                    <p className="forgot-password">
                        <Link to="/reset-password">Forgot password?</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
