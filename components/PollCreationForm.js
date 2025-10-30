import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function PollCreationForm({ session }) {
    const [pollTitle, setPollTitle] = useState('');
    const [costPerVote, setCostPerVote] = useState(100);
    const [options, setOptions] = useState(['', '']); 
    const [isActive, setIsActive] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- Option Handlers (Dynamic Inputs) ---
    const handleOptionChange = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const addOption = () => {
        setOptions([...options, '']);
    };

    const removeOption = (index) => {
        const newOptions = options.filter((_, i) => i !== index);
        setOptions(newOptions);
    };

    // --- Submission Handler ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        const validOptions = options.filter(opt => opt.trim() !== '');

        if (!pollTitle || validOptions.length < 2 || costPerVote <= 0) {
            alert('Please enter a title, at least two options, and a cost greater than zero.');
            setIsSubmitting(false);
            return;
        }

        const newPoll = {
            title: pollTitle,
            cost_per_vote: costPerVote,
            is_active: isActive,
            options: validOptions, 
            created_by: session.user.id 
        };

        const { error } = await supabase
            .from('polls')
            .insert([newPoll]);

        if (error) {
            alert(`Error creating poll: ${error.message}`);
            console.error('Error creating poll:', error);
        } else {
            alert(`Poll "${pollTitle}" created successfully!`);
            // Reset form
            setPollTitle('');
            setCostPerVote(100);
            setOptions(['', '']);
            setIsActive(true);
        }
        setIsSubmitting(false);
    };

    return (
        <form onSubmit={handleSubmit}>
            
            <label style={{ display: 'block', marginBottom: '5px', color: '#e0c0ff', fontWeight: 'bold' }}>Poll Question/Title:</label>
            <input 
                type="text" 
                value={pollTitle} 
                onChange={(e) => setPollTitle(e.target.value)} 
                placeholder="e.g., Who is the best candidate for HOD?"
                required
                style={{ marginBottom: '25px' }}
            />

            <label style={{ display: 'block', marginBottom: '10px', color: '#e0c0ff', fontWeight: 'bold' }}>Voting Options (Minimum 2):</label>
            {options.map((option, index) => (
                <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <input 
                    type="text" 
                    value={option} 
                    onChange={(e) => handleOptionChange(index, e.target.value)} 
                    placeholder={`Option ${index + 1}`}
                    required={index < 2} 
                    style={{ flexGrow: 1, marginBottom: 0 }}
                />
                {options.length > 2 && (
                    <button 
                    type="button" 
                    onClick={() => removeOption(index)} 
                    style={{ background: '#dc3545', padding: '10px', width: 'auto' }}
                    >
                    Remove
                    </button>
                )}
                </div>
            ))}
            <button 
                type="button" 
                onClick={addOption} 
                style={{ 
                    background: 'linear-gradient(90deg, #8a2be2, #a020f0)', 
                    width: '100%', 
                    padding: '12px 20px', 
                    marginTop: '15px',
                    marginBottom: '30px'
                }}
            >
                + Add Another Option
            </button>

            <div style={{ display: 'flex', gap: '30px', marginBottom: '30px', borderTop: '1px solid #4b0082', paddingTop: '20px' }}>
                
                <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px', color: '#e0c0ff', fontWeight: 'bold' }}>Cost Per Vote (₦):</label>
                <input 
                    type="number" 
                    value={costPerVote} 
                    onChange={(e) => setCostPerVote(Number(e.target.value))} 
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
                            style={{ width: '20px', height: '20px', marginRight: '10px', accentColor: '#a020f0' }}
                        />
                        {isActive ? 'Active (Live)' : 'Inactive (Hidden)'}
                    </label>
                </div>
            </div>
            
            <button 
                type="submit" 
                disabled={isSubmitting}
                style={{ 
                    background: 'linear-gradient(90deg, #4CAF50, #2e8b57)', 
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
