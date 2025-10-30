import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PollCreationForm from './PollCreationForm'; // Extracted for clarity

export default function AdminPanelUI({ session, onLogout }) {
    const [pendingVotes, setPendingVotes] = useState([]);
    const [isLoadingVotes, setIsLoadingVotes] = useState(true);

    // --- Fetch Pending Votes ---
    const fetchPendingVotes = async () => {
        setIsLoadingVotes(true);
        // Select vote details and join the poll title and user's matric/username
        const { data, error } = await supabase
            .from('votes')
            .select(`
                id, transaction_ref, proof_url, option_voted, created_at,
                polls(title), 
                users!inner(user_metadata->>matric_number, user_metadata->>username)
            `)
            .eq('status', 'PENDING');

        if (error) {
            console.error('Error fetching pending votes:', error);
        } else {
            setPendingVotes(data);
        }
        setIsLoadingVotes(false);
    };

    useEffect(() => {
        fetchPendingVotes();
        // Optional: Set up a real-time listener here for instant updates
    }, []);

    // --- Approval Handler ---
    const handleVoteApproval = async (voteId, newStatus) => {
        const adminId = session.user.id;
        const { error } = await supabase
            .from('votes')
            .update({ status: newStatus, approved_by: adminId, approved_at: new Date().toISOString() })
            .eq('id', voteId);

        if (error) {
            alert(`Failed to ${newStatus}: ${error.message}`);
        } else {
            alert(`Vote ${voteId} successfully marked as ${newStatus}!`);
            fetchPendingVotes(); // Refresh the list
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: 'auto' }}>
            <h1 style={{ textAlign: 'center', background: 'linear-gradient(45deg, #a020f0, #8a2be2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '30px' }}>
                ⚙️ Poll Control Panel
            </h1>

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '20px' }}>
                <p style={{ margin: '0 15px', color: '#e0c0ff' }}>
                    Logged in as: **{session.user.email}**
                </p>
                <button 
                    onClick={onLogout} 
                    style={{ background: 'linear-gradient(45deg, #dc3545, #bd2130)', padding: '8px 15px' }}
                >
                    Logout
                </button>
            </div>

            {/* --- 1. Pending Vote Approvals --- */}
            <div style={{ marginBottom: '40px', background: '#330066', borderRadius: '15px', padding: '30px', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)' }}>
                <h2 style={{ color: '#ffeb3b', borderBottom: '1px solid #4b0082', paddingBottom: '15px' }}>
                    ⚠️ Pending Vote Approvals ({pendingVotes.length})
                </h2>
                
                {isLoadingVotes ? (
                    <p style={{ color: '#b080d0', textAlign: 'center' }}>Loading pending votes...</p>
                ) : pendingVotes.length === 0 ? (
                    <p style={{ color: '#4CAF50', textAlign: 'center', fontWeight: 'bold' }}>No pending votes currently require approval. All clear!</p>
                ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {pendingVotes.map((vote) => (
                            <div key={vote.id} style={{ 
                                width: '48%', 
                                background: '#4b0082', 
                                padding: '15px', 
                                borderRadius: '10px', 
                                borderLeft: '5px solid #ffeb3b' 
                            }}>
                                <p style={{ margin: '5px 0', color: '#f0e6ff', fontSize: '1.1em' }}>**Poll:** {vote.polls?.title || 'Unknown Poll'}</p>
                                <p style={{ margin: '5px 0', color: '#e0c0ff' }}>**Voter:** {vote.users?.username} ({vote.users?.matric_number})</p>
                                <p style={{ margin: '5px 0', color: '#e0c0ff' }}>**Voted For:** {vote.option_voted}</p>
                                <p style={{ margin: '5px 0', color: '#e0c0ff' }}>**Time:** {new Date(vote.created_at).toLocaleString()}</p>
                                
                                <a href={vote.proof_url} target="_blank" rel="noopener noreferrer" style={{ color: '#ffeb3b', textDecoration: 'underline', display: 'block', margin: '10px 0' }}>
                                    View Payment Screenshot
                                </a>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                    <button 
                                        onClick={() => handleVoteApproval(vote.id, 'APPROVED')}
                                        style={{ background: '#4CAF50', padding: '8px 15px', flex: 1 }}
                                    >
                                        ✅ Approve Vote
                                    </button>
                                    <button 
                                        onClick={() => handleVoteApproval(vote.id, 'REJECTED')}
                                        style={{ background: '#dc3545', padding: '8px 15px', flex: 1 }}
                                    >
                                        ❌ Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- 2. Create New Poll --- */}
            <div style={{ background: '#330066', borderRadius: '15px', padding: '30px', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)' }}>
                <h2 style={{ color: '#f0e6ff', borderBottom: '1px solid #4b0082', paddingBottom: '15px' }}>
                    ➕ Create New Poll
                </h2>
                <PollCreationForm session={session} />
            </div>
        </div>
    );
}

// NOTE: The PollCreationForm component is needed to clean up the AdminPanelUI. 
// Its code is in the next section.
