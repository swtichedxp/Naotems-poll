import { useState } from 'react';
import { supabase } from '../lib/supabase';

// **IMPORTANT: Must match the email used to register the Admin account on the main site.**
const ADMIN_EMAIL = 'naciss.naotems@fpe.edu'; // Using the value defined in index.js

// AdminLogin component is used for both the public admin login view and the authenticated Admin Panel UI
export default function AdminLogin({ session, onLogin, onLogout, isAdmin }) {
  const [email, setEmail] = useState(ADMIN_EMAIL); // Pre-fill with admin email
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);

    if (email !== ADMIN_EMAIL) {
        setAuthError("Login failed: The entered email is not recognized as an administrator.");
        setLoading(false);
        return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // onLogin is a function that updates the session in the parent component
      if (data.user) {
          onLogin(data.user); 
      }

    } catch (error) {
      console.error(`Admin Login Error: ${error.message}`);
      setAuthError(`Login Error: Check password or ensure the admin account is registered.`);
    } finally {
      setLoading(false);
    }
  };

  // If the user is the authenticated admin, render the Admin Panel UI (which is a different component)
  if (isAdmin) {
    // Note: We are now exporting AdminPanelUI as a separate file, so we expect the parent (index.js) to handle the UI.
    // For now, we just show a simple placeholder if this component is mistakenly used for the full panel.
    return (
        <div style={{ padding: '20px', textAlign: 'right' }}>
            <p style={{ color: '#f0e6ff' }}>Welcome Admin!</p>
            <button 
                onClick={onLogout} 
                style={{ background: 'linear-gradient(90deg, #dc3545, #a020f0)', padding: '10px 15px' }}
            >
                Log Out
            </button>
        </div>
    );
  }

  // Otherwise, show the login form for the admin view
  return (
    <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: '#1a0033' 
    }}>
        <div style={{ 
            padding: '40px', 
            maxWidth: '450px', 
            width: '100%',
            background: 'linear-gradient(135deg, #4b0082, #6a00a4)', 
            borderRadius: '15px', 
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
            color: '#f0e6ff'
        }}>
            <h2 style={{ textAlign: 'center', color: '#f0e6ff', marginBottom: '25px' }}>
                Admin Panel Access
            </h2>
            {authError && (
                <p style={{ color: '#ff6b6b', textAlign: 'center', background: 'rgba(255, 107, 107, 0.2)', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>
                    {authError}
                </p>
            )}
            <form onSubmit={handleAdminLogin}>
                <label style={{ display: 'block', marginBottom: '5px', color: '#e0c0ff' }}>Email:</label>
                <input 
                    type="email" 
                    placeholder="Admin Email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    readOnly 
                    className="glass-input"
                    style={{ marginBottom: '15px' }}
                />

                <label style={{ display: 'block', marginBottom: '5px', color: '#e0c0ff' }}>Password:</label>
                <input 
                    type="password" 
                    placeholder="Password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="glass-input"
                    style={{ marginBottom: '25px' }}
                />

                <button 
                    type="submit" 
                    disabled={loading}
                    style={{ 
                        background: 'linear-gradient(90deg, #a020f0, #8a2be2)', 
                        width: '100%', 
                        padding: '12px 20px', 
                    }}
                >
                    {loading ? 'Logging in...' : 'Log In Securely'}
                </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: '20px', color: '#ccc' }}>
                Only registered administrator accounts can access this panel.
            </p>
        </div>
        {/* Re-using global input styles defined in index.js for consistency */}
    </div>
  );
    }
