import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

// Mock fetch for API calls
global.fetch = jest.fn();

beforeEach(() => {
  fetch.mockClear();
  localStorage.clear();
});

describe('App Component', () => {
  test('renders loading state initially', () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ breeds: [] })
    });
    
    render(<App />);
    expect(screen.getByText(/Loading puppy data/)).toBeInTheDocument();
  });

  test('renders main app title', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ breeds: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'Test Puppy',
          happiness: 50,
          energy: 50,
          skills: [],
          level: 1,
          age: '1.0'
        })
      });

    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('🐶 Raise Your LLM Puppy!')).toBeInTheDocument();
    });
  });

  test('shows name dialog for new users', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          breeds: [
            { id: 'labrador', name: 'Labrador', description: 'Friendly', specialties: ['happiness'] }
          ]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ needsNewPuppy: true })
      });

    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('🎉 Welcome! Choose Your Puppy!')).toBeInTheDocument();
    });
  });

  test('mode switcher buttons work', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ breeds: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'Test Puppy',
          happiness: 50,
          energy: 50,
          skills: [],
          level: 1,
          age: '1.0'
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'Community Puppy',
          happiness: 40,
          energy: 60,
          skills: [],
          level: 1,
          age: '2.0'
        })
      });

    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('👤 My Puppy')).toBeInTheDocument();
    });

    const communityButton = screen.getByText('🏘️ Community');
    fireEvent.click(communityButton);
    
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/puppy?mode=community'),
      expect.any(Object)
    );
  });

  test('action buttons work when puppy is loaded', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ breeds: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'Test Puppy',
          happiness: 50,
          energy: 50,
          skills: [],
          level: 1,
          age: '1.0'
        })
      });

    render(<App />);
    
    // Wait for the component to finish loading and render the buttons
    await waitFor(() => {
      expect(screen.getByText('🍖 Feed')).toBeInTheDocument();
    });
    
    const feedButton = screen.getByText('🍖 Feed');
    const playButton = screen.getByText('🎾 Play');
    
    // Buttons should be enabled when puppy has loaded successfully
    expect(feedButton).not.toBeDisabled();
    expect(playButton).not.toBeDisabled();
  });

  test('play button is disabled when puppy has low energy', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ breeds: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'Tired Puppy',
          happiness: 50,
          energy: 5, // Very low energy
          skills: [],
          level: 1,
          age: '1.0'
        })
      });

    render(<App />);
    
    // Wait for the component to finish loading and render the buttons
    await waitFor(() => {
      expect(screen.getByText('🍖 Feed')).toBeInTheDocument();
    });
    
    const feedButton = screen.getByText('🍖 Feed');
    const playButton = screen.getByText('🎾 Play');
    
    // Feed button should still work, but play button should be disabled due to low energy
    expect(feedButton).not.toBeDisabled();
    expect(playButton).toBeDisabled();
  });

  test('feed action works correctly', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ breeds: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'Test Puppy',
          happiness: 50,
          energy: 50,
          skills: [],
          level: 1,
          age: '1.0'
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'Test Puppy',
          happiness: 50,
          energy: 80,
          skills: [],
          level: 1,
          message: 'Fed successfully!'
        })
      });

    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Puppy')).toBeInTheDocument();
    });

    const feedButton = screen.getByText('🍖 Feed');
    fireEvent.click(feedButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/action'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ action: 'feed', message: '', mode: 'personal' })
        })
      );
    });
  });

  test('talk dialog opens and closes', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ breeds: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'Test Puppy',
          happiness: 50,
          energy: 50,
          skills: [],
          level: 1,
          age: '1.0'
        })
      });

    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Puppy')).toBeInTheDocument();
    });

    const talkButton = screen.getByText('💬 Talk');
    fireEvent.click(talkButton);
    
    expect(screen.getByText('💬 Chat with Test Puppy')).toBeInTheDocument();
    
    const closeButton = screen.getByText('Close Chat');
    fireEvent.click(closeButton);
    
    expect(screen.queryByText('💬 Chat with Test Puppy')).not.toBeInTheDocument();
  });

  test('community tabs work correctly', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ breeds: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'Community Puppy',
          happiness: 50,
          energy: 50,
          skills: [],
          level: 1,
          age: '1.0'
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([])
      });

    render(<App />);
    
    // Switch to community mode first
    await waitFor(() => {
      expect(screen.getByText('🏘️ Community')).toBeInTheDocument();
    });
    
    const communityButton = screen.getByText('🏘️ Community');
    fireEvent.click(communityButton);
    
    await waitFor(() => {
      expect(screen.getByText('🐕 Browse Puppies')).toBeInTheDocument();
    });

    const leaderboardTab = screen.getByText('🏆 Leaderboards');
    fireEvent.click(leaderboardTab);
    
    expect(leaderboardTab).toHaveClass('active');
  });

  test('puppy creation works with name and breed selection', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          breeds: [
            { id: 'labrador', name: 'Labrador', description: 'Friendly', specialties: ['happiness'] }
          ]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ needsNewPuppy: true })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'My New Puppy',
          happiness: 100,
          energy: 100,
          skills: [],
          level: 1
        })
      });

    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('🎉 Welcome! Choose Your Puppy!')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('Enter puppy name...');
    fireEvent.change(nameInput, { target: { value: 'My New Puppy' } });
    
    const createButton = screen.getByText(/Create/);
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/puppy/create'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'My New Puppy', breedId: 'labrador' })
        })
      );
    });
  });

  test('error handling works for API failures', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ breeds: [] })
      })
      .mockRejectedValueOnce(new Error('Network error'));

    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });

  test('skill progression shows correctly', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ breeds: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'Test Puppy',
          happiness: 50,
          energy: 50,
          skills: ['Sit', 'Stay'],
          level: 1,
          age: '1.0'
        })
      });

    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Sit')).toBeInTheDocument();
      expect(screen.getByText('Stay')).toBeInTheDocument();
    });
  });

  test('breed specialties display correctly', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ breeds: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'Test Puppy',
          happiness: 50,
          energy: 50,
          skills: [],
          level: 1,
          age: '1.0',
          breedInfo: {
            name: 'Labrador',
            description: 'Friendly dog',
            specialties: ['happiness', 'energy']
          }
        })
      });

    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('🐕 Labrador')).toBeInTheDocument();
      expect(screen.getByText('Friendly dog')).toBeInTheDocument();
    });
  });
});
