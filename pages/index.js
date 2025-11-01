import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';
import AdminLogin from '../components/AdminLogin';
import PollVoting from '../components/PollVoting';
import { User, Lock, Mail, AtSign, RotateCw, LogOut, CheckCircle, X, Search } from 'lucide-react';

// Admin's registered email (for RLS checks and official admin login)
const ADMIN_EMAIL = 'naciss.naotems@fpe.edu'; 
// Hardcoded bypass credentials for quick dev access
const ADMIN_BYPASS_INPUT = 'naciss';
const ADMIN_BYPASS_PASSWORD = 'otmpolL';

// --- AUTHENTICATION HELPERS ---

// Helper function to find the user's real email by Matric Number or Username
const findUserEmailForLogin = async (identifier) => {
    // Check if the identifier is an email (contains @)
    if (identifier.includes('@')) {
        return { email: identifier, error: null };
    }

    // Otherwise, assume it's a Matric Number or Username and look up the real email in profiles table
    // We only need to check the profiles table for the login ID
    const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .or(`matric_number.eq.${identifier},username.eq.${identifier}`)
        .limit(1);

    if (error) {
        console.error('Profile lookup error:', error);
        return { email: null, error: error.message };
    }
    
    if (data && data.length > 0) {
        return { email: data[0].email, error: null };
    } else {
        return { email: null, error: 'User not found. Check Matric Number or Username.' };
    }
}

// --- MAIN COMPONENT ---

export default function Home() {
    const [session, setSession] = useState(null);
    const [polls, setPolls] = useState([]);
    const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
    const [authInput, setAuthInput] = useState(''); // Matric Number or Email for login
    const [matricNumber, setMatricNumber] = useState(''); // Only for signup
    const [email, setEmail] = useState(''); // Real Email for signup
    const [username, setUsername] = useState(''); // Only for signup
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    
    const router = useRouter();
    const isAdminView = router.query.admin === 'true';

    // --- INITIALIZATION & SESSION CHECK ---
    useEffect(() => {
        // Initial session check
        setSession(supabase.auth.session());

        // Listener for auth changes
        const { data: authListener } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
            }
        );

        return () => {
            if (authListener) authListener.unsubscribe();
        };
    }, []);

    // --- DATA FETCHING (Polls) ---
    const fetchPolls = async () => {
        if (!session) return;
        setLoading(true);

        // FIX: Select ALL columns (including the JSONB 'candidates' column) 
        // We removed the invalid relational join syntax.
        const { data, error } = await supabase
          .from('polls')
          .select(`*`) // <-- Corrected query syntax
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching polls:', error);
        } else {
            setPolls(data);
        }
        setLoading(false);
    };

    // Re-fetch polls when session changes (i.e., user logs in)
    useEffect(() => {
        if (session && !isAdminView) {
            fetchPolls();
        }
    }, [session, isAdminView]);


    // --- AUTHENTICATION HANDLERS ---
    
    // 1. SIGNUP HANDLER
    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        if (matricNumber.length < 5 || username.length < 3 || password.length < 6) {
            setMessage('Matric must be at least 5 chars, Username 3, and Password 6.');
            setLoading(false);
            return;
        }

        try {
            // First, sign up the user using the real email/password
            const { user, error } = await supabase.auth.signUp({
                email: email.toLowerCase(),
                password,
            }, {
                // Pass Matric Number and Username as user metadata for initial storage (optional but helpful)
                data: { matric_number: matricNumber.toUpperCase(), username: username.toLowerCase() }
            });

            if (error) throw error;
            
            if (user) {
                // Second, insert the Matric Number and Username into the 'profiles' table 
                // for the login lookup functionality (CRITICAL STEP)
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([{ 
                        id: user.id, 
                        username: username.toLowerCase(), 
                        matric_number: matricNumber.toUpperCase(), 
                        email: email.toLowerCase()
                    }]);

                if (profileError) throw profileError;

                setMessage('Successfully signed up! Check your email to confirm if necessary.');
                setAuthMode('login');
            }

        } catch (error) {
            console.error('Signup error:', error);
            setMessage(`Signup Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };


    // 2. LOGIN HANDLER
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        // *** 1. HARDCODED ADMIN BYPASS CHECK (FOR QUICK DEV/TESTING) ***
        const isHardcodedAdmin = authInput.toLowerCase() === ADMIN_BYPASS_INPUT && password === ADMIN_BYPASS_PASSWORD;

        if (isHardcodedAdmin) {
            // If the credentials match the hardcoded bypass, redirect to the admin view
            window.location.href = `/?admin=true`;
            setLoading(false);
            return;
        }


        // *** 2. STANDARD STUDENT LOGIN ***
        try {
            // Find the real email using the input (Matric No. or Email)
            const { email: userEmail, error: emailError } = await findUserEmailForLogin(authInput.toLowerCase());

            if (emailError) throw new Error(emailError);
            if (!userEmail) throw new Error('Could not find account. Please check your input.');
            
            // Now sign in with the found real email
            const { error } = await supabase.auth.signInWithPassword({
                email: userEmail,
                password,
            });

            if (error) throw error;

            // Session change handled by listener
            setMessage('Login successful!');

        } catch (error) {
            console.error('Login error:', error);
            setMessage(`Login Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // 3. LOGOUT HANDLER
    const handleLogout = async () => {
        setLoading(true);
        await supabase.auth.signOut();
        setSession(null);
        setPolls([]);
        setLoading(false);
        router.push('/'); // Redirect to standard view if logging out from admin view
    };

    // --- STYLES FOR GLASS MORPHISM ---
    const cardStyle = {
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px) saturate(180%)',
        WebkitBackdropFilter: 'blur(10px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '15px',
        padding: '30px',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.25)',
        maxWidth: '450px',
        width: '100%',
        color: '#f0e6ff',
        transition: 'all 0.3s ease',
        animation: 'fadeIn 0.5s ease-out',
    };

    const inputStyle = {
        width: '100%',
        padding: '12px',
        margin: '8px 0 20px 0',
        borderRadius: '8px',
        border: 'none',
        outline: 'none',
        background: 'rgba(255, 255, 255, 0.15)', // Glass effect background
        color: '#f0e6ff',
        fontSize: '1em',
        transition: 'background 0.3s, border 0.3s',
    };

    const buttonStyle = {
        width: '100%',
        padding: '12px',
        borderRadius: '8px',
        border: 'none',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        fontSize: '1.1em',
        marginTop: '15px',
    };

    const tabStyle = {
        flex: 1,
        textAlign: 'center',
        padding: '10px 0',
        cursor: 'pointer',
        borderBottom: '2px solid transparent',
        transition: 'all 0.3s ease',
        fontWeight: '600',
    };

    // --- RENDER LOGIC ---

    // 1. Admin Login View (Accessed via /?admin=true)
    if (isAdminView) {
        if (session && session.user.email === ADMIN_EMAIL) {
            // If logged in as the official admin, show the panel
            return (
                <div style={{ background: '#1a0033', minHeight: '100vh', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px' }}>
                        <button onClick={handleLogout} style={{ ...buttonStyle, width: 'auto', background: '#dc3545' }}>
                            <LogOut size={18} style={{ marginRight: '5px' }} /> Admin Logout
                        </button>
                    </div>
                    {/* Render the full Admin Panel UI (which is not in this file) */}
                    <div style={{ padding: '20px', color: 'white' }}>
                        <h1 style={{ textAlign: 'center', color: '#a020f0' }}>Admin Dashboard</h1>
                        {/* NOTE: You need to ensure the AdminPanelUI component is correctly rendered here in a separate file */}
                        <div style={{ marginTop: '20px', background: '#330066', padding: '30px', borderRadius: '15px' }}>
                            Admin Panel UI would be loaded here. (Check your `components/AdminPanelUI.js` file for full logic).
                        </div>
                    </div>
                </div>
            );
        } else {
            // If not logged in as admin, show the dedicated admin login form
            return (
                <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a0033' }}>
                    <AdminLogin onLogin={setSession} />
                </div>
            );
        }
    }

    // 2. Student View (Default View)
    return (
        <div style={{ 
            minHeight: '100vh', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            // Reference the background.png file from the public directory
            backgroundImage: 'url("/background.png")', 
            backgroundSize: 'cover', 
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
            padding: '20px'
        }}>
            
            {/* If logged in, show the polls */}
            {session ? (
                <div style={{ maxWidth: '800px', width: '100%', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 0', borderBottom: '1px solid #4b0082' }}>
                        <h1 style={{ margin: 0, color: '#f0e6ff' }}>🗳️ Department Polls</h1>
                        <button 
                            onClick={handleLogout} 
                            disabled={loading}
                            style={{ 
                                ...buttonStyle, 
                                width: 'auto', 
                                background: 'linear-gradient(90deg, #dc3545, #a020f0)',
                                padding: '10px 15px', 
                                fontSize: '1em',
                                marginTop: 0
                            }}
                        >
                            <LogOut size={16} style={{ marginRight: '5px' }} /> Logout
                        </button>
                    </div>
                    
                    <div style={{ marginTop: '30px' }}>
                        {loading && <p style={{ textAlign: 'center', color: '#e0c0ff' }}><RotateCw size={16} style={{ animation: 'spin 2s linear infinite', display: 'inline-block' }} /> Loading active polls...</p>}

                        {!loading && polls.length === 0 && (
                            <div style={{ textAlign: 'center', background: 'rgba(255, 255, 255, 0.1)', padding: '20px', borderRadius: '10px' }}>
                                <p>No active polls currently available. Check back later!</p>
                            </div>
                        )}

                        {polls.map(poll => (
                            <div key={poll.id} style={{ ...cardStyle, maxWidth: 'none', marginBottom: '25px', padding: '25px' }}>
                                <PollVoting poll={poll} session={session} />
                            </div>
                        ))}
                    </div>
                </div>

            ) : (
                
                // If logged out, show the login/signup form (Glass-Morphism Card)
                <div style={cardStyle}>
                    <div style={{ display: 'flex', marginBottom: '25px', borderBottom: '2px solid rgba(255, 255, 255, 0.2)' }}>
                        <div 
                            style={{ 
                                ...tabStyle, 
                                borderBottomColor: authMode === 'login' ? '#a020f0' : 'transparent',
                                color: authMode === 'login' ? '#a020f0' : '#f0e6ff'
                            }} 
                            onClick={() => { setAuthMode('login'); setMessage(''); }}
                        >
                            Log In
                        </div>
                        <div 
                            style={{ 
                                ...tabStyle, 
                                borderBottomColor: authMode === 'signup' ? '#a020f0' : 'transparent',
                                color: authMode === 'signup' ? '#a020f0' : '#f0e6ff'
                            }} 
                            onClick={() => { setAuthMode('signup'); setMessage(''); }}
                        >
                            Sign Up
                        </div>
                    </div>

                    <h2 style={{ textAlign: 'center', marginTop: '0', color: '#e0c0ff' }}>
                        {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
                    </h2>

                    {/* Authentication Form */}
                    <form onSubmit={authMode === 'login' ? handleLogin : handleSignup}>
                        
                        {/* Signup Fields */}
                        {authMode === 'signup' && (
                            <>
                                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                                    <AtSign size={16} style={{ marginRight: '8px' }} /> Real Email
                                </label>
                                <input 
                                    type="email" 
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    style={inputStyle} 
                                    placeholder="Your official email address" 
                                    required 
                                />
                                
                                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                                    <User size={16} style={{ marginRight: '8px' }} /> Username
                                </label>
                                <input 
                                    type="text" 
                                    value={username} 
                                    onChange={(e) => setUsername(e.target.value)} 
                                    style={inputStyle} 
                                    placeholder="Unique Display Name" 
                                    required 
                                />

                                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                                    <User size={16} style={{ marginRight: '8px' }} /> Matric Number
                                </label>
                                <input 
                                    type="text" 
                                    value={matricNumber} 
                                    onChange={(e) => setMatricNumber(e.target.value.toUpperCase())} 
                                    style={inputStyle} 
                                    placeholder="e.g., FPE/20/1234" 
                                    required 
                                />
                            </>
                        )}

                        {/* Login/Shared Fields */}
                        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                            {authMode === 'login' ? <Mail size={16} style={{ marginRight: '8px' }} /> : <User size={16} style={{ marginRight: '8px' }} />}
                            {authMode === 'login' ? 'Email or Matric/Username' : 'Matric/Username (for login later)'}
                        </label>
                        {authMode === 'login' && (
                            <input 
                                type="text" 
                                value={authInput} 
                                onChange={(e) => setAuthInput(e.target.value)} 
                                style={inputStyle} 
                                placeholder="Enter Email, Matric Number, or Username" 
                                required 
                            />
                        )}

                        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                            <Lock size={16} style={{ marginRight: '8px' }} /> Password
                        </label>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            style={inputStyle} 
                            placeholder="••••••••" 
                            required 
                        />

                        {/* Message/Error Display */}
                        {message && (
                            <p style={{ color: message.includes('Error') ? '#dc3545' : '#4CAF50', textAlign: 'center', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '5px', marginTop: '10px' }}>
                                {message}
                            </p>
                        )}
                        
                        {/* Submit Button */}
                        <button 
                            type="submit" 
                            disabled={loading}
                            style={{ 
                                ...buttonStyle,
                                // Gradient button for a sleek look
                                background: loading 
                                    ? '#8b008b' 
                                    : 'linear-gradient(90deg, #a020f0, #4b0082)' 
                            }}
                        >
                            {loading 
                                ? <RotateCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                                : (authMode === 'login' ? 'Log In' : 'Sign Up')
                            }
                        </button>
                    </form>

                    {/* Admin Link Reminder */}
                    <p style={{ textAlign: 'center', fontSize: '0.8em', marginTop: '20px', color: '#e0c0ff' }}>
                        Admin access is via: <a href="/?admin=true" style={{ color: '#a020f0', fontWeight: 'bold' }}>/?admin=true</a>
                    </p>
                </div>
            )}
            
            {/* Global Spin Animation Style */}
            <style jsx global>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

/*
CRITICAL NOTES FOR DEPLOYMENT:

1. PROFILES TABLE: You MUST run the SQL to create the 'profiles' table with 'matric_number' and 'username' columns.

    CREATE TABLE public.profiles (
        id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        username text UNIQUE NOT NULL,
        matric_number text UNIQUE NOT NULL,
        email text UNIQUE NOT NULL,

        CONSTRAINT profiles_pkey PRIMARY KEY (id)
    );

    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    -- Allow user to view/modify only their own profile
    CREATE POLICY "Allow individual read/update" ON public.profiles
    FOR ALL
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
    -- Allow SELECT for login lookup
    CREATE POLICY "Allow authenticated read for login lookup" ON public.profiles
    FOR SELECT
    USING (auth.role() = 'authenticated');


2. ADMIN BYPASS: The hardcoded check is only for ease of development. 
   Official admin login is via the /?admin=true page using the registered email: 'naciss.naotems@fpe.edu'.

3. BACKGROUND: Ensure 'background.png' is in your public directory.
*/
