const checkTokenExpiration = () => {
    console.log('Checking token expiration');
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('No token found');
        updateToGuestMode();
        return;
    }

    const payload = JSON.parse(atob(token.split('.')[1]));
    const expirationTime = payload.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();

    if (currentTime >= expirationTime) {
        localStorage.removeItem('token');
        updateToGuestMode();
    }
};

const updateToGuestMode = () => {
    // Implement your logic to update the UI to guest mode
    console.log('Switching to guest mode');
    // Example: Redirect to login page or update UI elements
    window.location.href = '/login'; // Redirect to login page
    // Or update UI elements directly
    // document.getElementById('user-info').style.display = 'none';
    // document.getElementById('guest-info').style.display = 'block';
};

// Check token expiration every minute
setInterval(checkTokenExpiration, 30 * 1000);

// Initial check when the page loads
checkTokenExpiration();