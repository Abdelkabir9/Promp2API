
// Default to localhost, but allow override via localStorage for hosted preview environments
const getBaseUrl = () => {
  return localStorage.getItem('API_BASE_URL') || 'http://localhost:8000';
};

export const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

export const apiRequest = async <T = any>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const BASE_URL = getBaseUrl();
  // Ensure we don't have double slashes if endpoint starts with /
  const sanitizedBaseUrl = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  const sanitizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  const url = `${sanitizedBaseUrl}${sanitizedEndpoint}`;
  let headers: any = { ...getAuthHeaders(), ...options.headers };
  
  try {
    let response = await fetch(url, { ...options, headers });
    
    // Token Refresh Logic
    if (response.status === 401) {
      const refreshToken = localStorage.getItem('refresh_token');
      // Prevent infinite loops if the refresh endpoint itself fails or login fails
      const isAuthRequest = endpoint.includes('/auth/login') || endpoint.includes('/token/refresh');
      
      if (refreshToken && !isAuthRequest) {
        try {
          console.debug('Access token expired, attempting refresh...');
          // Attempt to refresh the token using the refresh_token
          const refreshResponse = await fetch(`${sanitizedBaseUrl}/api/auth/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken })
          });

          if (refreshResponse.ok) {
            const data = await refreshResponse.json();
            localStorage.setItem('access_token', data.access);
            // Update refresh token if returned (optional rotation)
            if (data.refresh) {
              localStorage.setItem('refresh_token', data.refresh);
            }

            // Update headers with new token and retry original request
            headers = {
              ...headers,
              'Authorization': `Bearer ${data.access}`
            };
            response = await fetch(url, { ...options, headers });
            
          } else {
            console.warn('Token refresh failed');
          }
        } catch (refreshErr) {
          console.error('Error during token refresh:', refreshErr);
        }
      }
    }

    if (response.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      
      const isLoginRequest = endpoint.includes('/auth/login');
      
      if (isLoginRequest) {
        throw new Error("Invalid credentials. Please check your email and password.");
      } else {
        // Only redirect if not already on login page
        if (!window.location.hash.includes('/login')) {
          window.location.href = '/#/login';
        }
        throw new Error("Session expired. Please login again.");
      }
    }

    if (!response.ok) {
      // Clone response to avoid "body already read" if we need to inspect it multiple ways
      const errorResponse = response.clone();
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      
      try {
        const errorData = await errorResponse.json();
        
        // Handle common DRF error formats and structured validation errors
        if (typeof errorData === 'object') {
           if (errorData.detail) errorMessage = errorData.detail;
           else if (errorData.message) errorMessage = errorData.message;
           else if (errorData.non_field_errors) errorMessage = Array.isArray(errorData.non_field_errors) ? errorData.non_field_errors.join(' ') : errorData.non_field_errors;
           else {
             // Try to find specific field errors
             const fieldErrors = Object.entries(errorData)
               .map(([key, value]) => {
                 const msg = Array.isArray(value) ? value[0] : value;
                 // Don't prefix with key if the message already contains it or is generic
                 return `${key}: ${msg}`;
               })
               .join(', ');
             
             if (fieldErrors) errorMessage = fieldErrors;
             else errorMessage = JSON.stringify(errorData);
           }
        }
      } catch (e) {
        // If not JSON, try text for a short snippet of the error
        try {
          const errorText = await response.text();
          if (errorText && errorText.length < 200) {
            errorMessage = errorText;
          }
        } catch (textErr) {
          // Ignore text read errors
        }
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  } catch (error: any) {
    console.error(`API Request to ${endpoint} failed:`, error);
    
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error(
        `Network Error: Unable to connect to ${sanitizedBaseUrl}. ` +
        `Check if your backend is running and CORS is enabled.`
      );
    }
    
    throw error;
  }
};
