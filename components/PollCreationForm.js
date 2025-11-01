import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function PollCreationForm({ session }) {
    const [pollTitle, setPollTitle] = useState('');
    const [costPerVote, setCostPerVote] = useState(100);
    // Structure for candidates: { name, pictureUrl, summary }
    const [candidates, setCandidates] = useState([
        { name: '', pictureUrl: '', summary: '' }, 
        { name: '', pictureUrl: '', summary: '' }
    ]); 
    const [isActive, setIsActive] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [submitMessage, setSubmitMessage] = useState(null);

    // --- Candidate Handlers (Dynamic Inputs) ---
    const handleCandidateChange = (index, field, value) => {
        const newCandidates = [...candidates];
        newCandidates[index][field] = value;
        setCandidates(newCandidates);
    };

    const addCandidate = () => {
        setCandidates([...candidates, { name: '', pictureUrl: '', summary: '' }]);
    };

    const removeCandidate = (index) => {
        const newCandidates = candidates.filter((_, i) => i !== index);
        setCandidates(newCandidates);
    };

    // --- Submission Handler ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitError(null);
        setSubmitMessage(null);
        
        const validCandidates = candidates.filter(c => c.name.trim() !== '');

        if (!pollTitle || validCandidates.length < 2 || costPerVote <= 0) {
            setSubmitError('Please enter a title, at least two candidate names, and a cost greater than zero.');
            setIsSubmitting(false);
            return;
        }

        try {
            // 1. Insert the new poll
            const newPoll = {
                title: pollTitle,
                cost_per_vote: costPerVote,
                is_active: isActive,
                // Do NOT include candidates here. They go in their own table.
            };

            const { data: pollData, error: pollError } = await supabase
                .from('polls')
                .insert([newPoll])
                .select()
                .single();

            if (pollError || !pollData) throw pollError || new Error("Failed to retrieve new poll ID.");

            const newPollId = pollData.id;

            // 2. Insert candidates associated with the new poll ID
            const candidatesToInsert = validCandidates.map(c => ({
                poll_id: newPollId,
                name: c.name.trim(),
                picture_url: c.pictureUrl.trim() || null, // Allow null picture
                manifesto_summary: c.summary.trim() || null, // Allow null summary
            }));

            const { error: candidateError } = await supabase
                .from('candidates')
                .insert(candidatesToInsert);

            if (candidateError) throw candidateError;

            // Success
            setSubmitMessage(`Poll "${pollTitle}" and ${candidatesToInsert.length} candidates published successfully!`);
            setPollTitle('');
            setCostPerVote(100);
            setCandidates([{ name: '', pictureUrl: '', summary: '' }, { name: '', pictureUrl: '', summary: '' }]);

        } catch (error) {
            console.error('Submission Error:', error);
            setSubmitError(`Failed to publish poll: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Render Logic ---
    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {submitError && <div style={{ color: '#ff6b6b', background: 'rgba(255, 107, 107, 0.2)', padding: '10px', borderRadius: '8px' }}>Error: {submitError}</div>}
            {submitMessage && <div style={{ color: '#4CAF50', background: 'rgba(76, 175, 80, 0.2)', padding: '10px', borderRadius: '8px' }}>Success: {submitMessage}</div>}

            <label style={{ display: 'block', color: '#e0c0ff', fontWeight: 'bold' }}>Poll Title:</label>
            <input 
                type="text" 
                value={pollTitle}
                onChange={(e) => setPollTitle(e.target.value)}
                placeholder="e.g., Departmental President Election 2024"
                required
            />
            
            <h3 style={{ color: '#f0e6ff', borderBottom: '1px solid #4b0082', paddingBottom: '10px', marginTop: '10px' }}>Candidates</h3>
            {candidates.map((candidate, index) => (
                <div key={index} style={{ border: '1px solid #4b0082', padding: '15px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input 
                            type="text" 
                            value={candidate.name}
                            onChange={(e) => handleCandidateChange(index, 'name', e.target.value)}
                            placeholder={`Candidate #${index + 1} Name`}
                            required
                        />
                        {candidates.length > 2 && (
                            <button 
                                type="button" 
                                onClick={() => removeCandidate(index)}
                                style={{ background: '#dc3545', padding: '8px 12px', width: 'auto', flexShrink: 0 }}
                            >
                                Remove
                            </button>
                        )}
                    </div>
                    <input 
                        type="url" 
                        value={candidate.pictureUrl}
                        onChange={(e) => handleCandidateChange(index, 'pictureUrl', e.target.value)}
                        placeholder="Picture URL (optional)"
                        style={{ fontSize: '0.9em' }}
                    />
                    <textarea 
                        value={candidate.summary}
                        onChange={(e) => handleCandidateChange(index, 'summary', e.target.value)}
                        placeholder="Manifesto Summary (Optional, max 100 chars)"
                        maxLength={100}
                        rows={2}
                        style={{ background: '#1f2b57', border: '1px solid #3c5484', color: '#f0e6ff', padding: '10px', borderRadius: '8px', width: '100%', resize: 'vertical' }}
                    />
                </div>
            ))}

            <button 
                type="button" 
                onClick={addCandidate}
                style={{ 
                    background: 'linear-gradient(90deg, #2e8b57, #4CAF50)', 
                    padding: '10px 20px', 
                    fontSize: '1em',
                }}
            >
                + Add Candidate
            </button>
            
            {/* Poll Configuration */}
            <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px', color: '#e0c0ff', fontWeight: 'bold' }}>Cost Per Vote (₦):</label>
                <input 
                    type="number" 
                    value={costPerVote}
                    onChange={(e) => setCostPerVote(Math.max(1, parseInt(e.target.value) || 1))} 
                    min="1"
                    required
                    style={{ marginBottom: 0 }}
                />
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <label style={{ display: 'block', marginBottom: '5px', color: '#e0c0ff', fontWeight: 'bold' }}>Poll Status:</label>
                    <label style={{ display: 'flex', alignItems: 'center', color: '#f0e6ff', cursor: 'pointer', userSelect: 'none' }}>
                        <input 
                            type="checkbox" 
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            style={{ width: '20px', height: '20px', marginRight: '10px', accentColor: '#007aff' }}
                        />
                        {isActive ? 'Active (Live)' : 'Inactive (Hidden)'}
                    </label>
                </div>
            </div>
            
            <button 
                type="submit" 
                disabled={isSubmitting}
                style={{ 
                    background: 'linear-gradient(90deg, #007aff, #5ac8fa)', 
                    width: '100%', 
                    padding: '15px 20px', 
                    fontSize: '1.2em'
                }}
            >
                {isSubmitting ? 'Publishing Poll...' : 'Publish Poll Now'}
            </button>
        </form>
    );
                    }
