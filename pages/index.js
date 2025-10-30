import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PollVoting from '../components/PollVoting';
import Head from 'next/head';

// --- Global Constant for Faking Email ---
const FAKE_DOMAIN = '@uni.edu'; 

export default function Home() {
  const [session, setSession] = useState(null);
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);

  // [Omitted: useEffect and fetchPolls functions remain the same as previous steps]
  // ... (Code for fetching session and polls) ...

  // --- REVISED AUTH HANDLER ---
  const handleLogin = async (e, isSigningUp) => {
    e.preventDefault();
    const matric_number = e.target.matric.value.toLowerCase().trim();
    const password = e.target.password.value;
    const username = e.target.username?.value; // Only available for signup
    
    // 1. Convert Matric Number to the required email format
    const email = `${matric_number}${FAKE_DOMAIN}`;

    try {
      if (isSigningUp) {
        // --- Sign Up ---
        const { user, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        }, {
          // Store the real matric number and username in the user's metadata (a custom JSON field)
          data: { matric_number, username: username || matric_number } 
        });

        if (signUpError) throw signUpError;
        alert(`Account created for Matric ${matric_number}! You can now log in.`);

      } else {
        // --- Log In ---
        const { error: loginError } = await supabase.auth.signIn({
          email, // Use the faked email for login
          password,
        });

        if (loginError) throw loginError;
        alert('Logged in successfully!');
      }

    } catch (error) {
      // Check for common errors (e.g., user not found)
      let errorMessage = error.message;
      if (errorMessage.includes('Invalid login credentials')) {
          errorMessage = 'Incorrect Matric Number or Password.';
      }
      if (errorMessage.includes('User already registered')) {
          errorMessage = 'This Matric Number is already registered. Please log in.';
      }

      alert(`Authentication Error: ${errorMessage}`);
      console.error(error);
    }
  };

  const handleLogout = async () => {
    // [Omitted: handleLogout function remains the same]
  };

  // [Omitted: Loading and Polls rendering logic remains the same]

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
      <Head>
        <title>Department Polls</title>
      </Head>
      
      {/* ... [H1 heading remains the same] ... */}

      {session ? (
        // --- LOGGED IN VIEW ---
        // ... (The Logged In UI remains the same, but the welcome message 
        // now uses the stored matric_number and username)
        <div>
          <div style={{ /* ... styles ... */ }}>
            <p style={{ margin: 0, fontSize: '1.1em' }}>
              Welcome, <span style={{ fontWeight: 'bold', color: '#ffeb3b' }}>
                {session.user.user_metadata.username || session.user.user_metadata.matric_number}
              </span>!
            </p>
            {/* ... Logout button ... */}
          </div>
          {/* ... Polls Display ... */}
        </div>
      ) : (
        // --- LOGOUT/LOGIN VIEW (REVISED FORMS) ---
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          
          {/* SIGNUP FORM */}
          <div style={{ /* ... styles ... */ }}>
            <h3 style={{ /* ... styles ... */ }}>New Student? Sign Up</h3>
            <form onSubmit={(e) => handleLogin(e, true)}>
              {/* Matric Number input */}
              <input name="matric" type="text" placeholder="Matric Number (e.g., CSC/20/1234)" required />
              {/* Username input */}
              <input name="username" type="text" placeholder="Username" required />
              {/* Password input */}
              <input name="password" type="password" placeholder="Password" required />
              <button 
                type="submit" 
                style={{ /* ... styles ... */ }}
              >
                Create Account
              </button>
            </form>
          </div>

          {/* LOGIN FORM */}
          <div style={{ /* ... styles ... */ }}>
            <h3 style={{ /* ... styles ... */ }}>Existing Student Login</h3>
            <form onSubmit={(e) => handleLogin(e, false)}>
              {/* Matric Number input */}
              <input name="matric" type="text" placeholder="Matric Number" required />
              {/* Password input */}
              <input name="password" type="password" placeholder="Password" required />
              <label style={{ /* ... styles ... */ }}>
                <input type="checkbox" name="remember" defaultChecked style={{ /* ... styles ... */ }} /> Remember Me
              </label>
              <button 
                type="submit" 
                style={{ /* ... styles ... */ }}
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
