// Alpine.js component for tee times page
document.addEventListener('alpine:init', () => {
  Alpine.data('teeTimesPage', () => ({
    teeTimeListings: [],
    filteredListings: [],
    isLoading: true,
    hasError: false,
    errorMessage: '',
    
    // Search filters
    filters: {
      location: '',
      date: '',
      players: '',
      minPrice: '',
      maxPrice: ''
    },
    
    // Sorting
    sortOption: 'relevance', // options: relevance, price-low, price-high, date
    
    init() {
      this.fetchTeeTimeListings();
    },
    
    async fetchTeeTimeListings() {
      this.isLoading = true;
      this.hasError = false;
      
      try {
        // Build query params from filters
        const queryParams = new URLSearchParams();
        if (this.filters.location) queryParams.append('location', this.filters.location);
        if (this.filters.date) queryParams.append('date', this.filters.date);
        if (this.filters.players) queryParams.append('players', this.filters.players);
        
        // Fetch the tee time listings
        const response = await fetch(`/api/tee-times?${queryParams.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch tee time listings');
        }
        
        // Get the listings and store them
        this.teeTimeListings = await response.json();
        this.applyFilters();
      } catch (error) {
        console.error('Error fetching tee time listings:', error);
        this.hasError = true;
        this.errorMessage = error.message || 'Failed to load tee time listings';
      } finally {
        this.isLoading = false;
      }
    },
    
    applyFilters() {
      let filtered = [...this.teeTimeListings];
      
      // Filter by price range
      if (this.filters.minPrice) {
        filtered = filtered.filter(listing => listing.price >= Number(this.filters.minPrice));
      }
      
      if (this.filters.maxPrice) {
        filtered = filtered.filter(listing => listing.price <= Number(this.filters.maxPrice));
      }
      
      // Apply sorting
      switch (this.sortOption) {
        case 'price-low':
          filtered.sort((a, b) => a.price - b.price);
          break;
        case 'price-high':
          filtered.sort((a, b) => b.price - a.price);
          break;
        case 'date':
          filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
          break;
        case 'relevance':
        default:
          // If we're sorting by relevance, the API already sorted them for us
          // based on location, date, and player count
          filtered.sort((a, b) => b.relevanceScore - a.relevanceScore);
          break;
      }
      
      this.filteredListings = filtered;
    },
    
    resetFilters() {
      this.filters = {
        location: '',
        date: '',
        players: '',
        minPrice: '',
        maxPrice: ''
      };
      this.applyFilters();
    },
    
    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    },
    
    formatTime(dateString) {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit'
      });
    },
    
    getStatusBadgeClass(status) {
      switch(status) {
        case 'available':
          return 'badge-green';
        case 'booked':
          return 'badge-yellow';
        case 'completed':
          return 'badge-blue';
        case 'cancelled':
          return 'badge-red';
        default:
          return 'badge-gray';
      }
    }
  }));
});