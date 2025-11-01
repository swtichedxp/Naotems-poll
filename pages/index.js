import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PollVoting from '../components/PollVoting';
import { Sun, LogIn, UserPlus, Send, AlertTriangle, Loader, RefreshCw, X } from 'lucide-react';

// --- CONSTANTS ---
// We convert Matric/Username to a valid Supabase email for auth:
const EMAIL_DOMAIN = '@fpe.edu';
const ADMIN_EMAIL = 'naciss.naotems@fpe.edu'; // <-- UPDATED ADMIN EMAIL

// --- CUSTOM HOOK FOR AUTHENTICATION STATUS ---
const useAuth = () => {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: authListener } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
                setLoading(false);
            }
        );

        return () => {
            authListener?.unsubscribe();
        };
    }, []);

    return { session, loading };
};

// --- HELPER FUNCTION: Convert Matric/Username to Supabase Email ---
// This is used for login. It searches the profiles table for a match.
const findUserEmail = async (input) => {
    const term = input.toLowerCase().trim();
    
    // Check if it looks like a matric number
    const isMatric = term.includes('/');
    
    let query = supabase.from('profiles').select('email').limit(1);

    if (isMatric) {
        query = query.eq('matric_number', term);
    } else {
        query = query.eq('username', term);
    }

    const { data, error } = await query;
    
    if (error) {
        console.error("Profile search error:", error);
        return null;
    }
    
    return data && data.length > 0 ? data[0].email : null;
};

// --- GLASS MORPHISM STYLES ---
const glassStyle = {
    background: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(15px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
    borderRadius: '15px',
};

// --- Custom Glass Input Component ---
const InputGlass = (props) => (
    <input 
        {...props}
        style={{
            width: '100%', padding: '15px 20px', marginBottom: '15px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            color: 'white',
            outline: 'none',
            fontSize: '1em',
            borderRadius: '10px',
            transition: 'border-color 0.3s, background 0.3s',
            boxShadow: '0 0 5px rgba(0, 0, 0, 0.2) inset',
            '::placeholder': { color: 'rgba(255, 255, 255, 0.6)' },
            '::-webkit-input-placeholder': { color: 'rgba(255, 255, 255, 0.6)' },
            '::-moz-placeholder': { color: 'rgba(255, 255, 255, 0.6)' }
        }}
    />
);


// --- AUTHENTICATION FORM COMPONENT ---
const AuthForm = ({ setMode, mode }) => {
    const [matricOrUsername, setMatricOrUsername] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        // 1. Find the Supabase email based on Matric/Username
        const email = await findUserEmail(matricOrUsername);
        
        if (!email || !password) {
            setError('Login failed. Invalid Matric/Username or Password.');
            setLoading(false);
            return;
        }

        try {
            // 2. Sign in with the found email
            const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
            
            if (authError) {
                setError('Login failed. Please check your credentials.');
            }
        } catch (err) {
            setError(err.message || 'An unexpected error occurred during login.');
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const matricNumber = matricOrUsername.trim();
        const supEmail = `${matricNumber.toLowerCase().replace(/[^a-z0-9\/]/g, '')}${EMAIL_DOMAIN}`;
        
        if (!matricNumber || !password || username.trim().length < 3) {
            setError('Please fill in Matric Number, Username, and Password.');
            setLoading(false);
            return;
        }

        try {
            // 1. Check if the username is already taken
            const { data: userCheck, error: checkError } = await supabase.from('profiles').select('id').eq('username', username.trim()).limit(1);
            if (checkError) throw checkError;
            if (userCheck && userCheck.length > 0) {
                 setError('This username is already taken.');
                 setLoading(false);
                 return;
            }

            // 2. Sign Up (uses generated email/password)
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: supEmail,
                password: password,
            });

            if (signUpError) {
                if (signUpError.message.includes('already registered')) {
                    setError('This Matric Number is already registered.');
                } else {
                    setError(`Signup error: ${signUpError.message}`);
                }
                setLoading(false);
                return;
            }
            
            // 3. Create User Profile
            if (signUpData.user) {
                const { error: profileError } = await supabase.from('profiles').insert([
                    { 
                        id: signUpData.user.id, 
                        username: username.trim(),
                        matric_number: matricNumber,
                        email: supEmail 
                    }
                ]);

                if (profileError) {
                    // Critical failure: user created, but profile failed.
                    console.error("Profile creation failed:", profileError);
                    // It's best to allow the user to try logging in now, as their user might exist
                    setError("Account created, but failed to save profile. Please log in.");
                } else {
                    // Success! Log the user in directly if desired, or redirect to login.
                    alert('Signup successful! Please log in with your details.');
                    setMode('login');
                }
            }

        } catch (err) {
            setError(err.message || 'An unexpected error occurred during signup.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '30px', ...glassStyle, maxWidth: '400px', width: '90%', margin: '20px auto' }}>
            <h2 style={{ color: 'white', textAlign: 'center', marginBottom: '20px', textShadow: '0 0 5px rgba(0, 0, 0, 0.5)' }}>
                {mode === 'login' ? 'Student Login' : 'Student Sign Up'}
            </h2>
            <form onSubmit={mode === 'login' ? handleLogin : handleSignup}>
                {/* Dynamic Switcher Buttons */}
                <div style={{ display: 'flex', marginBottom: '30px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '5px' }}>
                    <button 
                        type="button"
                        onClick={() => { setMode('login'); setError(null); }}
                        style={{
                            flex: 1, padding: '10px 0', borderRadius: '8px', 
                            background: mode === 'login' ? 'rgba(255, 255, 255, 0.3)' : 'transparent',
                            color: 'white', fontWeight: mode === 'login' ? 'bold' : 'normal',
                            border: 'none', cursor: 'pointer', transition: 'background 0.3s',
                            boxShadow: mode === 'login' ? '0 2px 10px rgba(0, 0, 0, 0.4)' : 'none'
                        }}
                    >
                        <LogIn size={16} style={{ marginRight: '5px' }} /> Login
                    </button>
                    <button 
                        type="button"
                        onClick={() => { setMode('signup'); setError(null); }}
                        style={{
                            flex: 1, padding: '10px 0', borderRadius: '8px', 
                            background: mode === 'signup' ? 'rgba(255, 255, 255, 0.3)' : 'transparent',
                            color: 'white', fontWeight: mode === 'signup' ? 'bold' : 'normal',
                            border: 'none', cursor: 'pointer', transition: 'background 0.3s',
                            boxShadow: mode === 'signup' ? '0 2px 10px rgba(0, 0, 0, 0.4)' : 'none'
                        }}
                    >
                        <UserPlus size={16} style={{ marginRight: '5px' }} /> Sign Up
                    </button>
                </div>

                {/* Input Fields */}
                <InputGlass 
                    type="text"
                    placeholder={mode === 'login' ? "Matric No. or Username" : "Matric Number (e.g., FPE/20/1234)"}
                    value={matricOrUsername}
                    onChange={(e) => setMatricOrUsername(e.target.value)}
                    required
                />
                
                {mode === 'signup' && (
                    <InputGlass 
                        type="text"
                        placeholder="Username (Publicly Visible)"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                )}

                <InputGlass 
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                {error && (
                    <div style={{ color: '#ff6b6b', background: 'rgba(255, 107, 107, 0.2)', padding: '10px', borderRadius: '8px', marginTop: '15px', display: 'flex', alignItems: 'center', border: '1px solid #ff6b6b' }}>
                        <AlertTriangle size={16} style={{ marginRight: '8px' }} /> {error}
                    </div>
                )}
                
                <button 
                    type="submit" 
                    disabled={loading}
                    style={{
                        width: '100%', padding: '15px', borderRadius: '10px', marginTop: '25px',
                        background: 'linear-gradient(45deg, #007aff, #5ac8fa)',
                        color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(0, 122, 255, 0.4)', transition: 'transform 0.2s, opacity 0.2s',
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        opacity: loading ? 0.7 : 1, transform: loading ? 'scale(0.98)' : 'scale(1)'
                    }}
                >
                    {loading ? <Loader size={20} className="animate-spin" /> : (mode === 'login' ? 'LOG IN' : 'SIGN UP')}
                </button>
            </form>
            <a href="/admin" style={{ display: 'block', textAlign: 'center', marginTop: '20px', color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', fontSize: '0.9em' }}>
                Admin Login
            </a>
        </div>
    );
};


// --- MAIN APP COMPONENT ---
export default function Index() {
    const { session, loading: authLoading } = useAuth();
    const [polls, setPolls] = useState([]);
    const [loadingPolls, setLoadingPolls] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [mode, setMode] = useState('login'); // 'login' or 'signup'

    const fetchPolls = async () => {
        setLoadingPolls(true);
        setFetchError(null);

        // Fetch active polls and join the candidates associated with them
        const { data, error } = await supabase
            .from('polls')
            .select(`
                *, 
                candidates(id, name, picture_url, manifesto_summary) // <-- NEW JOIN
            `)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching polls:', error);
            setFetchError('Failed to load polls. Check RLS or database connection.');
        } else {
            // Filter polls that have at least one candidate
            setPolls(data.filter(poll => poll.candidates && poll.candidates.length > 0));
        }
        setLoadingPolls(false);
    };

    useEffect(() => {
        if (session) {
            fetchPolls();
        }
    }, [session]);

    // Handle Logout
    const handleLogout = async () => {
        await supabase.auth.signOut();
        setPolls([]);
        setLoadingPolls(true);
        setMode('login'); // Reset mode after logout
    };

    // --- RENDER LOGIC ---

    // 1. Loading State
    if (authLoading) {
        return <div style={fullScreenCenterStyle}>
            <Loader size={32} className="animate-spin" color="#fff" />
            <p style={{ color: 'white', marginTop: '15px' }}>Authenticating...</p>
        </div>;
    }

    // 2. Authentication Required (Show the stylish Auth form)
    if (!session) {
        return (
            <div style={{ ...fullScreenCenterStyle, backgroundImage: 'url(/background.png), linear-gradient(135deg, #1f2b57 0%, #0c1a3f 100%)' }}>
                <AuthForm setMode={setMode} mode={mode} />
            </div>
        );
    }
    
    // Check if logged-in user is the Admin
    const isAdmin = session.user.email === ADMIN_EMAIL;

    // 3. Admin Logged In (Redirect/Warning)
    if (isAdmin) {
        return (
            <div style={{ ...fullScreenCenterStyle, background: 'linear-gradient(135deg, #1f2b57 0%, #0c1a3f 100%)' }}>
                <div style={{ padding: '30px', ...glassStyle, maxWidth: '500px', width: '90%', textAlign: 'center' }}>
                    <AlertTriangle size={48} color="#ffeb3b" style={{ margin: '0 auto 20px' }} />
                    <h2 style={{ color: 'white' }}>Admin Portal Access</h2>
                    <p style={{ color: '#ccc', marginBottom: '20px' }}>
                        You are logged in as the Administrator. Please navigate to the dedicated Admin route:
                    </p>
                    <a href="/admin" style={{ textDecoration: 'none', padding: '10px 20px', borderRadius: '8px', backgroundColor: '#5ac8fa', color: '#1f2b57', fontWeight: 'bold' }}>
                        Go to Admin Panel
                    </a>
                    <button onClick={handleLogout} style={{ marginTop: '15px', background: 'transparent', color: '#ff6b6b', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                        <X size={16} style={{ marginRight: '5px' }} /> Log Out Admin
                    </button>
                </div>
            </div>
        );
    }

    // 4. Student Logged In (Show Polls)
    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1f2b57 0%, #0c1a3f 100%)', fontFamily: 'Inter, sans-serif' }}>
            <header style={{ ...glassStyle, backdropFilter: 'blur(10px)', background: 'rgba(31, 43, 87, 0.4)', padding: '15px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
                <h1 style={{ color: 'white', fontSize: '1.2em', margin: 0, display: 'flex', alignItems: 'center' }}>
                    <Sun size={20} color="#ffeb3b" style={{ marginRight: '8px' }} /> FPE Department Poll
                </h1>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ color: '#ccc', fontSize: '0.9em' }}>
                        Matric/User: {session.user.email.split(EMAIL_DOMAIN)[0]}
                    </span>
                    <button onClick={handleLogout} style={{ background: '#ff6b6b', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' }}>
                        Log Out
                    </button>
                </div>
            </header>

            <main style={{ padding: '30px 5%', maxWidth: '800px', margin: '0 auto' }}>
                <h2 style={{ color: 'white', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', paddingBottom: '10px', marginBottom: '30px' }}>
                    Active Elections ({polls.length})
                </h2>

                {fetchError && (
                    <div style={{ color: '#ff6b6b', background: 'rgba(255, 107, 107, 0.2)', padding: '15px', borderRadius: '10px', display: 'flex', alignItems: 'center', marginBottom: '20px', border: '1px solid #dc3545' }}>
                        <AlertTriangle size={20} style={{ marginRight: '10px' }} /> {fetchError}
                        <button onClick={fetchPolls} style={{ marginLeft: 'auto', background: 'none', color: '#ff6b6b', border: '1px solid #ff6b6b', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>
                            <RefreshCw size={14} style={{ marginRight: '5px' }} /> Retry
                        </button>
                    </div>
                )}

                {loadingPolls ? (
                    <div style={{ color: 'white', textAlign: 'center', padding: '50px' }}>
                        <Loader size={32} className="animate-spin" />
                        <p style={{ marginTop: '15px' }}>Loading active polls...</p>
                    </div>
                ) : polls.length === 0 ? (
                    <p style={{ color: '#ccc', textAlign: 'center', padding: '50px', ...glassStyle }}>
                        No active polls available at this time. Check back later!
                    </p>
                ) : (
                    polls.map(poll => (
                        <div key={poll.id} style={{ marginBottom: '40px' }}>
                            <PollVoting poll={poll} session={session} />
                        </div>
                    ))
                )}
            </main>
        </div>
    );
}

// --- GLOBAL STYLES (Tailwind/CSS equivalent for full screen centering) ---
const fullScreenCenterStyle = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    fontFamily: 'Inter, sans-serif',
};
