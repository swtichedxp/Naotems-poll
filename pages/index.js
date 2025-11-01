import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import PollVoting from '../components/PollVoting';
import AdminLogin from '../components/AdminLogin';
import { LogOut, UserPlus, LogIn, TrendingUp, RefreshCcw } from 'lucide-react';
import Head from 'next/head';

// --- CONFIGURATION ---
const APP_DOMAIN = 'example.com'; // CRITICAL: Using reserved domain to pass strict email validation.
const ADMIN_EMAIL = 'naciss.naotems@fpe.edu'; // The designated administrator email

// --- HELPER FUNCTIONS ---

/**
 * Creates a stable, valid email for Supabase authentication.
 * Format: matric-[IDENTIFIER]@example.com
 * @param {string} identifier - The student's matric number or chosen username.
 */
const generateSupabaseEmail = (identifier) => {
    // Sanitize input to ensure no invalid characters in the email local part
    const sanitizedIdentifier = identifier.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `matric-${sanitizedIdentifier}@${APP_DOMAIN}`;
};

/**
 * Looks up the correct Supabase email based on the matric number or username provided during login.
 */
const findUserEmail = async (identifier, type) => {
    // NOTE: This assumes 'profiles' table has 'matric_number' and 'username' columns.
    const column = type === 'matric' ? 'matric_number' : 'username';
    
    // Clean the identifier based on type for lookup uniformity
    const lookupValue = type === 'matric' ? identifier.toUpperCase() : identifier.toLowerCase();

    const { data } = await supabase
        .from('profiles')
        .select(column)
        .eq(column, lookupValue)
        .limit(1);

    if (data && data.length > 0) {
        // We use the identifier stored in the profiles table to ensure we use the same one for email generation
        const userIdentifier = data[0][column]; 
        return generateSupabaseEmail(userIdentifier);
    }
    return null;
};


// --- MAIN COMPONENT ---

export default function Home() {
    const [session, setSession] = useState(null);
    const [polls, setPolls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdminView, setIsAdminView] = useState(false);
    const [isLoginMode, setIsLoginMode] = useState(true); // true for Login, false for Signup

    // Auth Form State
    const [authInput, setAuthInput] = useState(''); // Holds username (Signup/Login) or matric_number (Login)
    const [password, setPassword] = useState('');
    const [isAuthLoading, setIsAuthLoading] = useState(false);
    const [authError, setAuthError] = useState(null);
    const [matricNumber, setMatricNumber] = useState(''); // Only used in Signup

    // --- EFFECT: Initialize Session and Check Admin Status ---
    useEffect(() => {
        // Check for admin view via URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        setIsAdminView(urlParams.get('admin') === 'true');

        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        // Setup listener for auth state changes
        const { data: authListener } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
                if (_event === 'SIGNED_OUT') {
                    // Force refresh when signing out to clear state
                    window.location.reload(); 
                }
            }
        );

        return () => authListener.subscription.unsubscribe();
    }, []);

    // --- DATA FETCHING ---
    const fetchPolls = useCallback(async () => {
        if (loading) return; // Wait for initial loading to finish
        
        // CRITICAL FIX: We must select all columns (*) to get the JSONB 'candidates' column.
        // The previous relational join syntax was causing the client-side error.
        const { data, error } = await supabase
          .from('polls')
          .select(`*`) 
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching polls:', error);
            setPolls([]);
        } else {
            setPolls(data || []);
        }
    }, [loading]);

    useEffect(() => {
        if (!isAdminView && !loading) {
            fetchPolls();
        }
    }, [isAdminView, loading, fetchPolls]);

    // --- AUTH HANDLERS ---
    const handleLogin = async (e) => {
        e.preventDefault();
        setIsAuthLoading(true);
        setAuthError(null);
        
        // 1. Try to find email using input as Matric Number
        let emailToUse = await findUserEmail(authInput, 'matric');
        
        // 2. If not found, try to find email using input as Username
        if (!emailToUse) {
            emailToUse = await findUserEmail(authInput, 'username');
        }
        
        try {
            if (!emailToUse) {
                throw new Error("Login failed: Matric number or Username not found. Please sign up.");
            }

            // Use signInWithPassword as signIn is deprecated
            const { error } = await supabase.auth.signInWithPassword({
                email: emailToUse,
                password,
            });

            if (error) throw error;

        } catch (error) {
            setAuthError(error.message || 'Login failed. Check your credentials.');
        } finally {
            setIsAuthLoading(false);
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setIsAuthLoading(true);
        setAuthError(null);

        // Basic validation
        if (!matricNumber || !authInput || !password) {
            setAuthError('Please fill in all fields (Matric Number, Username, Password).');
            setIsAuthLoading(false);
            return;
        }

        const emailToUse = generateSupabaseEmail(matricNumber);

        try {
            // 1. Create the user in auth.users
            // Use signUp instead of deprecated signUpWithEmailAndPassword
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: emailToUse,
                password: password,
            });

            if (authError) throw authError;

            const userId = authData.user.id;
            
            // 2. Insert profile details into public.profiles table
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    id: userId,
                    username: authInput.toLowerCase(),
                    matric_number: matricNumber.toUpperCase(),
                    email: emailToUse, // Store the generated email for reference
                });

            if (profileError) {
                // Log and provide user-friendly error
                console.error("Profile insert failed:", profileError);
                throw new Error("Signup failed. Internal error during profile creation.");
            }

            // Success: User is automatically logged in and session state updates
            setAuthError("Signup successful! You are now logged in.");
            
        } catch (error) {
            console.error('Signup Error:', error);
            if (error.code === '23505') {
                 setAuthError('Error: That Matric Number or Username is already registered.');
            } else {
                 setAuthError(error.message || 'Signup failed. Please try again.');
            }
        } finally {
            setIsAuthLoading(false);
        }
    };

    const handleLogout = async () => {
        setLoading(true);
        await supabase.auth.signOut();
    };

    // --- RENDERING VIEWS ---

    // 1. Loading State
    if (loading) {
        return (
            <div className="flex-center" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: '#e0c0ff' }}>Loading application...</p>
            </div>
        );
    }

    // 2. Admin View
    if (isAdminView) {
        // If the session exists and the user is the Admin, show the full Admin view
        if (session && session.user.email === ADMIN_EMAIL) {
            // Note: AdminLogin is used as a wrapper/container for the AdminPanelUI component
            // We pass a flag to tell it to render the panel, not the login form.
            return <AdminLogin session={session} onLogout={handleLogout} isAdmin={true} />; 
        }
        // Otherwise, show the restricted Admin Login form
        return <AdminLogin session={session} onLogin={setSession} isAdmin={false} />;
    }

    // 3. Student View (Logged In)
    if (session) {
        // Find display name from email (e.g., matric-OT20240116642@example.com -> OT20240116642)
        const emailPart = session.user.email.split('@')[0];
        const displayName = emailPart.startsWith('matric-') ? emailPart.substring(7) : 'Voter';


        return (
            <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
                <Head>
                    <title>Live Polls</title>
                </Head>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #4b0082', paddingBottom: '15px' }}>
                    <h1 style={{ color: '#f0e6ff', display: 'flex', alignItems: 'center' }}>
                         <TrendingUp size={32} style={{ marginRight: '10px' }}/> Department Polls
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ marginRight: '20px', fontWeight: 'bold', color: '#e0c0ff' }}>
                            Welcome, {displayName}
                        </span>
                        <button 
                            onClick={fetchPolls} 
                            style={{ background: 'linear-gradient(90deg, #8a2be2, #4b0082)', marginRight: '10px', padding: '10px 15px' }}
                            title="Refresh Polls"
                        >
                            <RefreshCcw size={16} />
                        </button>
                        <button 
                            onClick={handleLogout} 
                            style={{ background: 'linear-gradient(90deg, #dc3545, #a020f0)', padding: '10px 15px' }}
                        >
                            <LogOut size={16} style={{ marginRight: '5px' }} /> Logout
                        </button>
                    </div>
                </header>

                <div className="grid-layout">
                    {polls.length === 0 ? (
                        <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#e0c0ff' }}>
                            No active polls are available right now. Check back later!
                        </p>
                    ) : (
                        polls.map(poll => (
                            <div key={poll.id} style={{ 
                                background: '#330066', 
                                borderRadius: '15px', 
                                padding: '25px', 
                                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)' 
                            }}>
                                <PollVoting poll={poll} session={session} />
                            </div>
                        ))
                    )}
                </div>

                {/* Custom CSS for Grid Layout (since Tailwind is not used here) */}
                <style jsx global>{`
                    .grid-layout {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                        gap: 30px;
                    }
                `}</style>
            </div>
        );
    }

    // 4. Student Logic (Logged Out / Auth Form) - The Glass-morphism Design
    return (
        <div style={{ 
            minHeight: '100vh', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            // Background image reference here: Make sure background.png is in your public folder
            backgroundImage: 'url("/background.png")', 
            backgroundSize: 'cover', 
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
            padding: '20px'
        }}>
            <Head>
                <title>{isLoginMode ? 'Login' : 'Sign Up'} - Poll</title>
            </Head>

            <div style={{ 
                padding: '40px', 
                maxWidth: '450px', 
                width: '100%',
                // Glass-morphism Effect
                background: 'rgba(255, 255, 255, 0.1)', 
                backdropFilter: 'blur(10px)', 
                WebkitBackdropFilter: 'blur(10px)',
                borderRadius: '20px', 
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            }}>
                <div style={{ display: 'flex', marginBottom: '30px', borderRadius: '15px', overflow: 'hidden' }}>
                    <button
                        onClick={() => { setIsLoginMode(true); setAuthError(null); }}
                        style={{ 
                            flex: 1, 
                            padding: '15px 20px', 
                            fontWeight: 'bold', 
                            transition: 'all 0.3s',
                            background: isLoginMode 
                                ? 'linear-gradient(45deg, #a020f0, #8a2be2)' 
                                : 'rgba(255, 255, 255, 0.1)',
                            color: isLoginMode ? 'white' : '#e0c0ff',
                            borderRight: '1px solid rgba(255, 255, 255, 0.2)'
                        }}
                    >
                        <LogIn size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Login
                    </button>
                    <button
                        onClick={() => { setIsLoginMode(false); setAuthError(null); }}
                        style={{ 
                            flex: 1, 
                            padding: '15px 20px', 
                            fontWeight: 'bold', 
                            transition: 'all 0.3s',
                            background: !isLoginMode 
                                ? 'linear-gradient(45deg, #a020f0, #8a2be2)' 
                                : 'rgba(255, 255, 255, 0.1)',
                            color: !isLoginMode ? 'white' : '#e0c0ff',
                        }}
                    >
                        <UserPlus size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Sign Up
                    </button>
                </div>

                <h2 style={{ textAlign: 'center', color: 'white', marginBottom: '25px', fontWeight: 'lighter' }}>
                    {isLoginMode ? 'Welcome Back, Voter' : 'Create Your Voting Account'}
                </h2>

                <form onSubmit={isLoginMode ? handleLogin : handleSignup}>
                    
                    {/* --- SIGNUP ONLY: Matric Number --- */}
                    {!isLoginMode && (
                        <>
                            <label style={{ display: 'block', marginBottom: '5px', color: 'white', fontWeight: '500' }}>Matric Number (Unique ID):</label>
                            <input 
                                type="text" 
                                placeholder="E.g., OT20240116642" 
                                value={matricNumber}
                                onChange={(e) => setMatricNumber(e.target.value.toUpperCase())}
                                required={!isLoginMode}
                                className="glass-input"
                                style={{ marginBottom: '15px' }}
                            />
                        </>
                    )}

                    {/* --- BOTH: Username (Signup) / Matric or Username (Login) --- */}
                    <label style={{ display: 'block', marginBottom: '5px', color: 'white', fontWeight: '500' }}>
                        {isLoginMode ? 'Matric Number or Username:' : 'Username (for login):'}
                    </label>
                    <input 
                        type="text" 
                        placeholder={isLoginMode ? 'Enter Matric No. or Username' : 'Choose a unique username'} 
                        value={authInput}
                        onChange={(e) => setAuthInput(e.target.value)}
                        required
                        className="glass-input"
                        style={{ marginBottom: '15px' }}
                    />
                    
                    <label style={{ display: 'block', marginBottom: '5px', color: 'white', fontWeight: '500' }}>Password:</label>
                    <input 
                        type="password" 
                        placeholder="Enter your password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="glass-input"
                        style={{ marginBottom: '25px' }}
                    />

                    {authError && (
                        <p style={{ color: '#ff6b6b', textAlign: 'center', background: 'rgba(255, 107, 107, 0.2)', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>
                            {authError}
                        </p>
                    )}

                    <button 
                        type="submit" 
                        disabled={isAuthLoading}
                        style={{ 
                            background: isLoginMode 
                                ? 'linear-gradient(90deg, #4CAF50, #2e8b57)' 
                                : 'linear-gradient(90deg, #0077b6, #00b4d8)',
                            width: '100%', 
                            padding: '15px 20px', 
                            fontSize: '1.1em',
                            border: 'none',
                            borderRadius: '10px'
                        }}
                    >
                        {isAuthLoading ? 'Processing...' : (isLoginMode ? 'Log In Now' : 'Create Account')}
                    </button>
                    
                    <p style={{ textAlign: 'center', color: '#e0c0ff', marginTop: '20px', fontSize: '0.9em' }}>
                        {isLoginMode ? 'Need an account?' : 'Already registered?'} 
                        <span 
                            onClick={() => { setIsLoginMode(!isLoginMode); setAuthError(null); }} 
                            style={{ color: '#a020f0', cursor: 'pointer', fontWeight: 'bold', marginLeft: '5px', textDecoration: 'underline' }}
                        >
                            {isLoginMode ? 'Sign Up' : 'Log In'}
                        </span>
                    </p>
                </form>
            </div>
            {/* Additional Global Styles for Glass Input Fields */}
            <style jsx global>{`
                input[type="text"],
                input[type="password"],
                input[type="email"] {
                    width: 100%;
                    padding: 12px 15px;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    border-radius: 8px;
                    background: rgba(255, 255, 255, 0.1); /* Slightly visible fill */
                    color: white;
                    outline: none;
                    transition: all 0.3s;
                    font-size: 1em;
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                }
                input[type="text"]::placeholder,
                input[type="password"]::placeholder,
                input[type="email"]::placeholder {
                    color: rgba(255, 255, 255, 0.7);
                }
                input[type="text"]:focus,
                input[type="password"]:focus,
                input[type="email"]:focus {
                    border-color: #a020f0; /* Purple glow on focus */
                    box-shadow: 0 0 15px rgba(160, 32, 240, 0.5);
                }
            `}</style>
        </div>
    );
    }
