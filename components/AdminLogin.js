import { useState } from 'react';
import { supabase } from '../lib/supabase';

// **IMPORTANT: Must match the email used to register the Admin account on the main site.**
const ADMIN_EMAIL = 'naciss.naotems@fpe.edu'; // <-- UPDATED EMAIL

export default function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState(ADMIN_EMAIL); // Pre-fill with admin email
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (email !== ADMIN_EMAIL) {
        setError("Login failed: The entered email is not recognized as an administrator.");
        setLoading(false);
        return;
    }

    try {
      // Use signInWithPassword for security
      const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      
      if (user) {
          onLogin(user); // Triggers state change in parent to show panel
      }

    } catch (error) {
      setError(`Login Error: ${error.message}. Check password or ensure the admin account is registered.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '30px', maxWidth: '400px', margin: '50px auto', 
                  background: 'linear-gradient(135deg, #1f2b57, #0c1a3f)', 
                  borderRadius: '15px', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)' }}>
      <h2 style={{ textAlign: 'center', color: '#f0e6ff', marginBottom: '25px' }}>
        Admin Panel Access
      </h2>
      {error && <p style={{ color: '#ff6b6b', textAlign: 'center', marginBottom: '15px' }}>{error}</p>}
      <form onSubmit={handleAdminLogin}>
        <label style={{ display: 'block', marginBottom: '5px', color: '#e0c0ff' }}>Email:</label>
        <input 
          type="email" 
          placeholder="Admin Email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          readOnly // Disable changing the email for security once deployed
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
            background: 'linear-gradient(90deg, #5ac8fa, #007aff)', 
            width: '100%', 
            padding: '12px 20px', 
          }}
        >
          {loading ? 'Logging in...' : 'Log In Securely'}
        </button>
      </form>
      <p style={{ textAlign: 'center', color: '#ccc', fontSize: '0.8em', marginTop: '20px' }}>
        This login is restricted to the administrator.
      </p>
    </div>
  );
}
