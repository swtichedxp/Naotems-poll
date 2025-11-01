import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PollCreationForm from './PollCreationForm'; 
import { RefreshCw, CheckCircle, X, Loader } from 'lucide-react';

const ADMIN_EMAIL = 'naciss.naotems@fpe.edu'; // <-- UPDATED ADMIN EMAIL

export default function AdminPanelUI({ session, onLogout }) {
    const [pendingVotes, setPendingVotes] = useState([]);
    const [isLoadingVotes, setIsLoadingVotes] = useState(true);

    // --- Fetch Pending Votes ---
    const fetchPendingVotes = async () => {
        setIsLoadingVotes(true);
        
        // Select vote details and join the poll title, candidate name, and user's profile info
        const { data, error } = await supabase
            .from('votes')
            .select(`
                id, transaction_ref, proof_url, created_at,
                polls(title), 
                candidates(name),
                profiles(username, matric_number)
            `)
            .eq('status', 'PENDING')
            .order('created_at', { ascending: true }); // Oldest first

        if (error) {
            console.error('Error fetching pending votes:', error);
        } else {
            setPendingVotes(data);
        }
        setIsLoadingVotes(false);
    };

    useEffect(() => {
        fetchPendingVotes();
        // Setup real-time listener for new pending votes (optional but highly recommended)
        const voteSubscription = supabase
            .channel('pending-votes-changes')
            .on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'votes', filter: 'status=eq.PENDING' }, 
                (payload) => {
                    // Add new vote to the top of the list
                    setPendingVotes(current => [payload.new, ...current]); 
                }
            )
            .subscribe();

        return () => supabase.removeChannel(voteSubscription);
    }, []);

    // --- Approval Handler ---
    const handleVoteApproval = async (voteId, newStatus) => {
        const adminId = session.user.id;
        const { error } = await supabase
            .from('votes')
            .update({ status: newStatus, approved_by: adminId, approved_at: new Date().toISOString() })
            .eq('id', voteId);

        if (error) {
            alert(`Failed to update vote status: ${error.message}`);
            console.error(error);
        } else {
            // Remove the approved/rejected vote from the UI immediately
            setPendingVotes(current => current.filter(vote => vote.id !== voteId));
        }
    };

    const cardStyle = {
        background: '#1f2b57',
        borderRadius: '15px',
        padding: '30px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
        marginBottom: '30px',
        border: '1px solid #3c5484'
    };

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0c1a3f 0%, #061025 100%)', padding: '30px 5%', fontFamily: 'Inter, sans-serif', color: '#f0e6ff' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', borderBottom: '1px solid #3c5484', paddingBottom: '15px' }}>
                <h1 style={{ color: '#5ac8fa', fontSize: '1.8em' }}>Admin Control Panel</h1>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <span style={{ color: '#ccc', fontSize: '0.9em' }}>Admin: {ADMIN_EMAIL}</span>
                    <button onClick={onLogout} style={{ background: '#dc3545', padding: '10px 20px' }}>
                        Log Out
                    </button>
                </div>
            </header>
            
            <div style={{ ...cardStyle }}>
                <h2 style={{ color: '#f0e6ff', borderBottom: '1px solid #3c5484', paddingBottom: '15px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
                    🗳️ Pending Vote Approvals ({pendingVotes.length})
                    <button onClick={fetchPendingVotes} style={{ background: '#5ac8fa', padding: '5px 10px', fontSize: '0.9em', display: 'flex', alignItems: 'center' }}>
                        <RefreshCw size={14} style={{ marginRight: '5px' }} /> Refresh
                    </button>
                </h2>
                {isLoadingVotes ? (
                    <div style={{ textAlign: 'center', padding: '30px' }}>
                        <Loader size={32} className="animate-spin" color="#5ac8fa" />
                        <p style={{ marginTop: '10px' }}>Loading pending votes...</p>
                    </div>
                ) : pendingVotes.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#ccc', padding: '30px', background: '#131e3c', borderRadius: '10px' }}>
                        All clear! No pending votes to approve.
                    </p>
                ) : (
                    <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                        {pendingVotes.map(vote => (
                            <div key={vote.id} style={{ border: '1px solid #3c5484', borderRadius: '10px', padding: '20px', background: '#131e3c' }}>
                                <p style={{ fontWeight: 'bold', color: '#5ac8fa' }}>Poll: {vote.polls?.title || 'N/A'}</p>
                                <p><strong>Candidate Voted:</strong> {vote.candidates?.name || 'N/A'}</p>
                                {/* Access profile data */}
                                <p><strong>Voter:</strong> {vote.profiles?.username} ({vote.profiles?.matric_number})</p>
                                <p><strong>Submitted:</strong> {new Date(vote.created_at).toLocaleString()}</p>
                                <p><strong>Ref:</strong> {vote.transaction_ref}</p>
                                
                                <div style={{ margin: '15px 0' }}>
                                    <a href={vote.proof_url} target="_blank" rel="noopener noreferrer" 
                                       style={{ display: 'inline-block', background: '#4b0082', padding: '8px 15px', borderRadius: '6px', color: 'white', textDecoration: 'none' }}>
                                        View Proof Screenshot
                                    </a>
                                </div>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '15px'}}>
                                    <button 
                                        onClick={() => handleVoteApproval(vote.id, 'APPROVED')}
                                        style={{ background: 'linear-gradient(90deg, #4CAF50, #2e8b57)', padding: '8px 15px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <CheckCircle size={16} style={{ marginRight: '5px' }} /> Approve
                                    </button>
                                    <button 
                                        onClick={() => handleVoteApproval(vote.id, 'REJECTED')}\
                                        style={{ background: 'linear-gradient(90deg, #dc3545, #a020f0)', padding: '8px 15px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <X size={16} style={{ marginRight: '5px' }} /> Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- 2. Create New Poll --- */}
            <div style={cardStyle}>
                <h2 style={{ color: '#f0e6ff', borderBottom: '1px solid #3c5484', paddingBottom: '15px' }}>
                    ➕ Create New Poll
                </h2>
                <PollCreationForm session={session} />
            </div>
        </div>
    );
                    }
