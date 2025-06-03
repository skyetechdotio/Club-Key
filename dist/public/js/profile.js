// Alpine.js component for profile page
document.addEventListener('alpine:init', () => {
  Alpine.data('profilePage', () => ({
    user: null,
    isLoading: true,
    hasError: false,
    errorMessage: '',
    
    // Edit mode state
    isEditMode: false,
    profileForm: {
      firstName: '',
      lastName: '',
      bio: '',
      isHost: false
    },
    
    // File upload
    profileImageFile: null,
    isUploading: false,
    uploadProgress: 0,
    
    // Tabs
    activeTab: 'profile', // 'profile', 'bookings', 'listings', 'reviews'
    
    // User data
    bookings: [],
    listings: [],
    reviews: [],
    isLoadingBookings: false,
    isLoadingListings: false,
    isLoadingReviews: false,
    
    init() {
      this.fetchUserProfile();
    },
    
    setActiveTab(tab) {
      this.activeTab = tab;
      
      // Load data for the active tab if it hasn't been loaded yet
      if (tab === 'bookings' && this.bookings.length === 0) {
        this.fetchUserBookings();
      } else if (tab === 'listings' && this.listings.length === 0 && this.user?.isHost) {
        this.fetchUserListings();
      } else if (tab === 'reviews' && this.reviews.length === 0) {
        this.fetchUserReviews();
      }
    },
    
    async fetchUserProfile() {
      this.isLoading = true;
      this.hasError = false;
      
      try {
        // Get the Firebase ID token
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) {
          throw new Error('You must be logged in to view your profile');
        }
        
        const idToken = await currentUser.getIdToken();
        
        // Fetch the user profile
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch user profile');
        }
        
        this.user = await response.json();
        
        // Set up the edit form with current values
        this.profileForm = {
          firstName: this.user.firstName || '',
          lastName: this.user.lastName || '',
          bio: this.user.bio || '',
          isHost: this.user.isHost || false
        };
      } catch (error) {
        console.error('Error fetching user profile:', error);
        this.hasError = true;
        this.errorMessage = error.message || 'Failed to load user profile';
      } finally {
        this.isLoading = false;
      }
    },
    
    async fetchUserBookings() {
      if (!this.user) return;
      
      this.isLoadingBookings = true;
      
      try {
        // Get Firebase token
        const currentUser = firebase.auth().currentUser;
        const idToken = await currentUser.getIdToken();
        
        // Fetch the user's bookings
        const response = await fetch(`/api/bookings/guest/${this.user._id}`, {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch bookings');
        }
        
        this.bookings = await response.json();
      } catch (error) {
        console.error('Error fetching bookings:', error);
      } finally {
        this.isLoadingBookings = false;
      }
    },
    
    async fetchUserListings() {
      if (!this.user || !this.user.isHost) return;
      
      this.isLoadingListings = true;
      
      try {
        // Get Firebase token
        const currentUser = firebase.auth().currentUser;
        const idToken = await currentUser.getIdToken();
        
        // Fetch the user's listings
        const response = await fetch(`/api/tee-times?hostId=${this.user._id}`, {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch listings');
        }
        
        this.listings = await response.json();
      } catch (error) {
        console.error('Error fetching listings:', error);
      } finally {
        this.isLoadingListings = false;
      }
    },
    
    async fetchUserReviews() {
      if (!this.user) return;
      
      this.isLoadingReviews = true;
      
      try {
        // Get Firebase token
        const currentUser = firebase.auth().currentUser;
        const idToken = await currentUser.getIdToken();
        
        // Fetch reviews about the user
        const response = await fetch(`/api/reviews/target/${this.user._id}?type=host`, {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch reviews');
        }
        
        this.reviews = await response.json();
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        this.isLoadingReviews = false;
      }
    },
    
    toggleEditMode() {
      this.isEditMode = !this.isEditMode;
      
      if (!this.isEditMode) {
        // Reset form if cancelling
        this.profileForm = {
          firstName: this.user.firstName || '',
          lastName: this.user.lastName || '',
          bio: this.user.bio || '',
          isHost: this.user.isHost || false
        };
      }
    },
    
    handleProfileImageChange(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      this.profileImageFile = file;
      
      // Display a preview
      const reader = new FileReader();
      reader.onload = (e) => {
        document.getElementById('profile-image-preview').src = e.target.result;
      };
      reader.readAsDataURL(file);
    },
    
    async saveProfile() {
      try {
        this.isLoading = true;
        
        // Get Firebase token
        const currentUser = firebase.auth().currentUser;
        const idToken = await currentUser.getIdToken();
        
        // First, upload the profile image if one was selected
        if (this.profileImageFile) {
          await this.uploadProfileImage(currentUser);
        }
        
        // Then update the profile data
        const response = await fetch('/api/auth/profile', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify(this.profileForm)
        });
        
        if (!response.ok) {
          throw new Error('Failed to update profile');
        }
        
        // Update local user data with the response
        const updatedUser = await response.json();
        this.user = updatedUser;
        
        // Exit edit mode
        this.isEditMode = false;
        
        // Show success message
        alert('Profile updated successfully!');
      } catch (error) {
        console.error('Error updating profile:', error);
        alert(`Error updating profile: ${error.message}`);
      } finally {
        this.isLoading = false;
      }
    },
    
    async uploadProfileImage(currentUser) {
      this.isUploading = true;
      this.uploadProgress = 0;
      
      try {
        // Create a storage reference
        const storageRef = firebase.storage().ref();
        const fileRef = storageRef.child(`profile-images/${currentUser.uid}/${this.profileImageFile.name}`);
        
        // Upload the file with progress tracking
        const uploadTask = fileRef.put(this.profileImageFile);
        
        uploadTask.on('state_changed', 
          (snapshot) => {
            // Update progress
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            this.uploadProgress = Math.round(progress);
          },
          (error) => {
            // Handle errors
            throw error;
          }
        );
        
        // Wait for upload to complete
        await uploadTask;
        
        // Get download URL
        const downloadURL = await fileRef.getDownloadURL();
        
        // Update the profile form with the URL
        this.profileForm.profileImage = downloadURL;
      } catch (error) {
        console.error('Error uploading profile image:', error);
        throw new Error('Failed to upload profile image');
      } finally {
        this.isUploading = false;
      }
    },
    
    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
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
        case 'confirmed':
          return 'badge-green';
        case 'pending':
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