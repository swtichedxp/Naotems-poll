import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PollVoting from '../components/PollVoting';
import Head from 'next/head';

export default function Home() {
  const [session, setSession] = useState(null);
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSession(supabase.auth.session);
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );
    fetchPolls();
    return () => authListener?.unsubscribe();
  }, []);

  const fetchPolls = async () => {
    const { data, error } = await supabase
      .from('polls')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching polls:', error.message);
    } else {
      setPolls(data);
    }
    setLoading(false);
  };

  const handleLogin = async (e, isSigningUp) => {
    e.preventDefault();
    const matric_number = e.target.matric.value;
    const password = e.target.password.value;
    const username = e.target.username?.value;

    try {
      if (isSigningUp) {
        const { user, error: signUpError } = await supabase.auth.signUp({
          email: `${matric_number}@uni.edu`,
          password,
        }, {
          data: { matric_number, username }
        });

        if (signUpError) throw signUpError;
        alert('Signup successful! Check your email to verify (or just log in if verification is disabled).');

      } else {
        const { error: loginError } = await supabase.auth.signIn({
          email: `${matric_number}@uni.edu`,
          password,
        });

        if (loginError) throw loginError;
        alert('Logged in successfully!');
      }

    } catch (error) {
      alert(`Authentication Error: ${error.message}`);
      console.error(error);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error.message);
    } else {
      setSession(null);
      alert('Logged out!');
    }
  };

  if (loading) return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh',
      fontSize: '24px', color: '#a020f0'
    }}>
      Loading...
    </div>
  );

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto', borderRadius: '15px' }}>
      <Head>
        <title>Department Polls</title>
        <link rel="icon" href="/favicon.ico" /> {/* You might want to replace this with a purple icon */}
      </Head>
      
      <h1 style={{ textAlign: 'center', fontSize: '2.5em', marginBottom: '30px', 
                   background: 'linear-gradient(45deg, #a020f0, #8a2be2)', 
                   WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        🏛️ Department Poll Site
      </h1>

      {session ? (
        // --- LOGGED IN VIEW ---
        <div>
          <div style={{ 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
            background: 'linear-gradient(90deg, #4b0082, #6a00a4)', 
            padding: '15px 20px', borderRadius: '12px', marginBottom: '25px' 
          }}>
            <p style={{ margin: 0, fontSize: '1.1em' }}>
              Welcome, <span style={{ fontWeight: 'bold', color: '#ffeb3b' }}>
                {session.user.user_metadata.username || session.user.email.split('@')[0]}
              </span>!
            </p>
            <button 
              onClick={handleLogout} 
              style={{ background: 'linear-gradient(45deg, #dc3545, #bd2130)', padding: '8px 15px' }}
            >
              Logout
            </button>
          </div>
          
          <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #4b0082' }} />

          <h2 style={{ fontSize: '2em', marginBottom: '20px', color: '#f0e6ff' }}>🗳️ Active Polls</h2>
          {polls.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#b080d0' }}>No active polls available right now.</p>
          ) : (
            polls.map((poll) => (
              <div 
                key={poll.id} 
                style={{ 
                  background: '#330066', 
                  borderRadius: '12px', 
                  padding: '20px', 
                  marginBottom: '20px', 
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)' 
                }}
              >
                <h3 style={{ marginTop: 0, color: '#f0e6ff', marginBottom: '10px' }}>{poll.title}</h3>
                <p style={{ fontSize: '0.9em', color: '#b080d0' }}>Cost: **₦{poll.cost_per_vote.toLocaleString()}** per vote</p>
                <PollVoting poll={poll} session={session} />
              </div>
            ))
          )}
        </div>
      ) : (
        // --- LOGOUT/LOGIN VIEW ---
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          
          {/* SIGNUP FORM */}
          <div style={{ 
            background: 'linear-gradient(135deg, #4b0082, #6a00a4)', 
            borderRadius: '15px', padding: '30px', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)' 
          }}>
            <h3 style={{ textAlign: 'center', fontSize: '1.8em', marginBottom: '25px', color: '#f0e6ff' }}>
              New Student? Sign Up
            </h3>
            <form onSubmit={(e) => handleLogin(e, true)}>
              <input name="matric" type="text" placeholder="Matric Number" required />
              <input name="username" type="text" placeholder="Username" required />
              <input name="password" type="password" placeholder="Password" required />
              <button 
                type="submit" 
                style={{ 
                  background: 'linear-gradient(90deg, #a020f0, #8a2be2)', 
                  width: '100%', 
                  marginTop: '15px' 
                }}
              >
                Create Account
              </button>
            </form>
          </div>

          {/* LOGIN FORM */}
          <div style={{ 
            background: 'linear-gradient(135deg, #4b0082, #6a00a4)', 
            borderRadius: '15px', padding: '30px', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)' 
          }}>
            <h3 style={{ textAlign: 'center', fontSize: '1.8em', marginBottom: '25px', color: '#f0e6ff' }}>
              Existing Student Login
            </h3>
            <form onSubmit={(e) => handleLogin(e, false)}>
              <input name="matric" type="text" placeholder="Matric Number" required />
              <input name="password" type="password" placeholder="Password" required />
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', color: '#b080d0' }}>
                <input 
                  type="checkbox" 
                  name="remember" 
                  defaultChecked 
                  style={{ marginRight: '10px', width: 'auto' }} 
                /> Remember Me
              </label>
              <button 
                type="submit" 
                style={{ 
                  background: 'linear-gradient(90deg, #a020f0, #8a2be2)', 
                  width: '100%' 
                }}
              >
                Login
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
