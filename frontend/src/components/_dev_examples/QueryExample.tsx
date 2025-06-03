import { useQuery } from '@tanstack/react-query';
import { supabaseQueries } from '@/lib/queryClient';
import { getCurrentUser } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';

// Type definitions for query results
interface Profile {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
  is_host: boolean;
  onboarding_completed: boolean;
  bio: string | null;
}

interface Club {
  id: number;
  name: string;
  location: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
}

interface Booking {
  id: string;
  number_of_players: number;
  status: string;
  total_price: number;
  created_at: string;
  tee_time_listings?: {
    clubs?: {
      name: string;
      location: string;
    };
  };
}

function QueryExample() {
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user ID
  useEffect(() => {
    async function fetchUserId() {
      const user = await getCurrentUser();
      setUserId(user?.id || null);
    }
    fetchUserId();
  }, []);

  // Example 1: Traditional API query (backward compatibility)
  const { data: apiData, isLoading: apiLoading } = useQuery({
    queryKey: ['/api/some-endpoint'],
    enabled: false // Disabled since endpoint doesn't exist yet
  });

  // Example 2: Supabase query for clubs
  const { data: clubs, isLoading: clubsLoading, error: clubsError } = useQuery<Club[]>({
    queryKey: supabaseQueries.clubs.all(5),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Example 3: User profile query (only if authenticated)
  const { data: userProfile, isLoading: profileLoading } = useQuery<Profile>({
    queryKey: userId ? supabaseQueries.profile.byId(userId) : ['disabled'],
    enabled: !!userId,
  });

  // Example 4: User bookings (only if authenticated)
  const { data: userBookings, isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: userId ? supabaseQueries.bookings.byUserId(userId) : ['disabled'],
    enabled: !!userId,
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">TanStack Query + Supabase Examples</h1>

      {/* User Profile Section */}
      <div className="mb-6 p-4 bg-blue-50 rounded">
        <h2 className="text-lg font-semibold mb-4">User Profile (Authenticated Query)</h2>
        {!userId ? (
          <p className="text-gray-600">Not authenticated - query disabled</p>
        ) : profileLoading ? (
          <p>Loading profile...</p>
        ) : userProfile ? (
          <div>
            <p><strong>Name:</strong> {userProfile.first_name} {userProfile.last_name}</p>
            <p><strong>Username:</strong> {userProfile.username || 'Not set'}</p>
            <p><strong>Host:</strong> {userProfile.is_host ? 'Yes' : 'No'}</p>
            <p><strong>Onboarding:</strong> {userProfile.onboarding_completed ? 'Complete' : 'Incomplete'}</p>
          </div>
        ) : (
          <p>No profile found</p>
        )}
      </div>

      {/* Clubs Section */}
      <div className="mb-6 p-4 bg-green-50 rounded">
        <h2 className="text-lg font-semibold mb-4">Clubs (Public Query)</h2>
        {clubsLoading ? (
          <p>Loading clubs...</p>
        ) : clubsError ? (
          <p className="text-red-600">Error: {clubsError.message}</p>
        ) : clubs && clubs.length > 0 ? (
          <div className="grid gap-2">
            {clubs.map((club) => (
              <div key={club.id} className="border rounded p-3">
                <h3 className="font-medium">{club.name}</h3>
                <p className="text-sm text-gray-600">{club.location}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>No clubs found</p>
        )}
      </div>

      {/* User Bookings Section */}
      <div className="mb-6 p-4 bg-yellow-50 rounded">
        <h2 className="text-lg font-semibold mb-4">User Bookings (Relational Query)</h2>
        {!userId ? (
          <p className="text-gray-600">Not authenticated - query disabled</p>
        ) : bookingsLoading ? (
          <p>Loading bookings...</p>
        ) : userBookings && userBookings.length > 0 ? (
          <div className="space-y-2">
            {userBookings.map((booking) => (
              <div key={booking.id} className="border rounded p-3">
                <p><strong>Booking ID:</strong> {booking.id}</p>
                <p><strong>Players:</strong> {booking.number_of_players}</p>
                <p><strong>Status:</strong> {booking.status}</p>
                <p><strong>Total:</strong> ${booking.total_price}</p>
                {booking.tee_time_listings?.clubs && (
                  <p><strong>Club:</strong> {booking.tee_time_listings.clubs.name}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p>No bookings found</p>
        )}
      </div>

      {/* Query Info */}
      <div className="mt-6 p-4 bg-gray-50 rounded text-sm">
        <h3 className="font-semibold mb-2">Query Information</h3>
        <ul className="space-y-1 text-gray-600">
          <li>• Clubs query: Always enabled, cached for 5 minutes</li>
          <li>• Profile query: Only enabled when authenticated</li>
          <li>• Bookings query: Only enabled when authenticated, includes related data</li>
          <li>• All queries use the new Supabase-focused defaultQueryFn</li>
          <li>• Data is automatically refetched on window focus</li>
          <li>• Legacy API calls would throw helpful error messages</li>
        </ul>
      </div>

      {/* Example of how legacy API calls would work */}
      <div className="mt-4 p-4 bg-orange-50 rounded text-sm">
        <h3 className="font-semibold mb-2">Legacy API Example (Commented Out)</h3>
        <pre className="text-xs text-gray-600 bg-white p-2 rounded">
{`// This would throw an error with the new defaultQueryFn:
// useQuery({ queryKey: ['/api/legacy-endpoint'] })

// Instead, use explicit queryFn for legacy calls:
// useQuery({ 
//   queryKey: ['/api/legacy-endpoint'], 
//   queryFn: () => apiRequest('GET', '/api/legacy-endpoint') 
// })`}
        </pre>
      </div>
    </div>
  );
}

export default QueryExample; 