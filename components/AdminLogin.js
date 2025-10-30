import { useState } from 'react';
import { supabase } from '../lib/supabase';

// **IMPORTANT: Replace this with your secure admin email address.**
const ADMIN_EMAIL = 'admin.department@uni.edu'; 

export default function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (email !== ADMIN_EMAIL) {
        alert("Login failed: The entered email is not recognized as an administrator.");
        setLoading(false);
        return;
    }

    try {
      // Use Supabase's standard sign-in function
      const { user, error } = await supabase.auth.signIn({
        email,
        password,
      });

      if (error) throw error;
      
      // If login is successful, call the parent function to update state
      if (user) {
          alert('Admin login successful!');
          onLogin(user); 
      }

    } catch (error) {
      alert(`Login Error: ${error.message}. Check the email and password.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '30px', maxWidth: '400px', margin: '50px auto', 
                  background: 'linear-gradient(135deg, #4b0082, #6a00a4)', 
                  borderRadius: '15px', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)' }}>
      <h2 style={{ textAlign: 'center', color: '#f0e6ff', marginBottom: '25px' }}>
        Admin Panel Access
      </h2>
      <form onSubmit={handleAdminLogin}>
        <label style={{ display: 'block', marginBottom: '5px', color: '#e0c0ff' }}>Email (Admin Only):</label>
        <input 
          type="email" 
          placeholder="Admin Email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label style={{ display: 'block', marginBottom: '5px', color: '#e0c0ff' }}>Password:</label>
        <input 
          type="password" 
          placeholder="Password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
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
      <p style={{ textAlign: 'center', marginTop: '20px', color: '#b080d0' }}>
        <a href="/" style={{ color: '#ffeb3b', textDecoration: 'underline' }}>
            ← Back to Student Polls
        </a>
      </p>
    </div>
  );
}

// **NOTE: You must first sign up this ADMIN_EMAIL with a strong password 
// on your main site's registration form (pages/index.js) for Supabase to recognize it.**
