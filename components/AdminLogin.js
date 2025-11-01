import { useState } from 'react';
import { supabase } from '../lib/supabase';

// **IMPORTANT: Must match the email used to register the Admin account on the main site.**
const ADMIN_EMAIL = 'naciss.naotems@fpe.edu'; 

export default function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState(ADMIN_EMAIL); // Pre-fill with admin email
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (email !== ADMIN_EMAIL) {
        setMessage("Login failed: The entered email is not recognized as an administrator.");
        setLoading(false);
        return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      if (data.user) {
          onLogin(data.user); // Triggers state change in parent to show panel
      }

    } catch (error) {
      setMessage(`Login Error: ${error.message}. Check password or ensure the admin account is registered.`);
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
        <label style={{ display: 'block', marginBottom: '5px', color: '#e0c0ff' }}>Email:</label>
        <input 
          type="email" 
          placeholder="Admin Email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          readOnly 
          style={{ width: '100%', padding: '12px', margin: '8px 0 20px 0', borderRadius: '8px', border: '1px solid #a020f0', outline: 'none', background: '#330066', color: '#f0e6ff' }}
        />

        <label style={{ display: 'block', marginBottom: '5px', color: '#e0c0ff' }}>Password:</label>
        <input 
          type="password" 
          placeholder="Password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: '100%', padding: '12px', margin: '8px 0 20px 0', borderRadius: '8px', border: '1px solid #a020f0', outline: 'none', background: '#330066', color: '#f0e6ff' }}
        />
        
        {message && (
            <p style={{ color: '#dc3545', textAlign: 'center', background: 'rgba(220, 53, 69, 0.2)', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>
                {message}
            </p>
        )}

        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            background: 'linear-gradient(90deg, #a020f0, #8a2be2)', 
            width: '100%', 
            padding: '12px 20px', 
            borderRadius: '8px',
            border: 'none',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            fontSize: '1.1em',
            marginTop: '15px',
            color: 'white'
          }}
        >
          {loading ? 'Logging in...' : 'Log In Securely'}
        </button>
      </form>
      <p style={{ textAlign: 'center', fontSize: '0.8em', marginTop: '20px', color: '#e0c0ff' }}>
        Only registered administrators can access this section.
      </p>
    </div>
  );
}
