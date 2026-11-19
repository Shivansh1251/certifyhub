const configuredApiUrl = (process.env.REACT_APP_API_URL || '').replace(/\/+$/, '');
export const API_BASE = configuredApiUrl
  ? (/\/api$/i.test(configuredApiUrl) ? configuredApiUrl : `${configuredApiUrl}/api`)
  : 'http://localhost:5000/api';
export const API_ORIGIN = API_BASE.replace(/\/api$/i, '');

export const serverUrl = (path) => {
  if (!path) return '';
  const value = String(path);
  if (/^(?:https?:)?\/\//i.test(value) || /^(?:data|blob):/i.test(value)) return value;
  return `${API_ORIGIN}/${value.replace(/^\/+/, '')}`;
};

async function apiRequest(endpoint, method = "GET", body = null, auth = false, includeMeta = false) {
  const headers = {};

  // Only set Content-Type to application/json if body is not FormData
  if (!(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = localStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : null),
      credentials: 'include',
    });
  } catch (networkError) {
    throw new Error('Network error: Unable to connect to server. Please check your connection.');
  }

  let data;
  try {
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      // If response is not JSON, read as text for error message
      const text = await res.text();
      throw new Error(`Server error (${res.status}): ${text || res.statusText}`);
    }
  } catch (parseError) {
    if (parseError instanceof Error && parseError.message.startsWith('Server error')) {
      throw parseError;
    }
    throw new Error(`Failed to parse server response: ${res.status} ${res.statusText}`);
  }

  if (!res.ok) {
    // Handle standardized error responses
    throw new Error(data.message || `API Error: ${res.status}`);
  }

  // Handle standardized success responses
  if (data.success !== undefined) {
    if (includeMeta) return data;
    return data.data || data; // Return data field for new format, full response for old format
  }

  return data; // Return as-is for non-standardized responses
}

export default apiRequest;
