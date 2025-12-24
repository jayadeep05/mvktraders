export const getToken = () => localStorage.getItem('token');

export const removeToken = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
};

export const parseToken = (token) => {
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload;
    } catch (e) {
        console.error('Error parsing token:', e);
        return null;
    }
};

export const getUserRole = () => {
    const token = getToken();
    const payload = parseToken(token);
    if (!payload) return null;
    // Handle both 'rol' and 'roles' as per Login.jsx logic
    return payload.rol ? payload.rol[0] : (payload.roles ? payload.roles[0] : null);
};

export const isAuthenticated = () => {
    const token = getToken();
    if (!token) return false;
    const payload = parseToken(token);
    if (!payload) return false;

    // Check expiration if available
    if (payload.exp) {
        const currentTime = Date.now() / 1000;
        if (payload.exp < currentTime) {
            removeToken(); // Token expired
            return false;
        }
    }

    return true;
};
