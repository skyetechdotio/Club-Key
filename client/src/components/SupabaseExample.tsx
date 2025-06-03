import { useEffect, useState } from 'react';
import { supabase, getCurrentUser, getCurrentUserProfile } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

interface Club {
  id: number;
  name: string;
  location: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  is_host: boolean;
  onboarding_completed: boolean;
}

function SupabaseExample() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch clubs (public data - no auth required)
        const { data: clubsData, error: clubsError } = await supabase
          .from('clubs')
          .select('*')
          .limit(5);

        if (clubsError) {
          console.error('Error fetching clubs:', clubsError);
          setError(`Error fetching clubs: ${clubsError.message}`);
        } else {
          setClubs(clubsData || []);
        }

        // Get current user and profile (if authenticated)
        const currentUser = await getCurrentUser();
        setUser(currentUser);

        if (currentUser) {
          const userProfile = await getCurrentUserProfile();
          setProfile(userProfile);
        }

      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setUser(session?.user || null);
        
        if (session?.user) {
          const userProfile = await getCurrentUserProfile();
          setProfile(userProfile);
        } else {
          setProfile(null);
        }
      }
    );

    // Cleanup subscription
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="p-4">Loading Supabase data...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Supabase Integration Example</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Authentication Status */}
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="text-lg font-semibold mb-2">Authentication Status</h2>
        {user ? (
          <div>
            <p className="text-green-600">✅ Authenticated</p>
            <p><strong>User ID:</strong> {user.id}</p>
            <p><strong>Email:</strong> {user.email}</p>
            {profile && (
              <div className="mt-2">
                <p><strong>Name:</strong> {profile.first_name} {profile.last_name}</p>
                <p><strong>Username:</strong> {profile.username || 'Not set'}</p>
                <p><strong>Host Status:</strong> {profile.is_host ? 'Yes' : 'No'}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-600">❌ Not authenticated</p>
        )}
      </div>

      {/* Clubs Data */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Sample Clubs Data</h2>
        {clubs.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clubs.map((club) => (
              <div key={club.id} className="border rounded-lg p-4 shadow-sm">
                <h3 className="font-semibold">{club.name}</h3>
                <p className="text-gray-600 text-sm">{club.location}</p>
                {club.description && (
                  <p className="text-gray-700 mt-2 text-sm">{club.description}</p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Created: {new Date(club.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No clubs found or error loading clubs.</p>
        )}
      </div>

      {/* Sample Auth Actions */}
      <div className="border-t pt-4">
        <h2 className="text-lg font-semibold mb-4">Sample Auth Actions</h2>
        <div className="space-x-4">
          <button
            onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Sign in with Google
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export default SupabaseExample; 