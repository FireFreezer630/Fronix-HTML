export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

interface AuthResponse {
  token: string;
  user: { id: string; email: string; plan: string; username?: string };
}

interface UserProfile {
  id: string;
  email: string;
  plan: string;
  username?: string;
}

interface Chat {
  id: string;
  title: string;
  created_at: string;
}

interface Message {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  image_url?: string;
  created_at: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const refreshAuthToken = async (): Promise<ApiResponse<AuthResponse>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('refreshToken')}`,
      },
    });
    const data = await response.json();
    if (response.ok) {
      localStorage.setItem('accessToken', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      return { success: true, data: data };
    } else {
      return { success: false, error: data.message || 'Failed to refresh token' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const signIn = async (email: string, password: string): Promise<ApiResponse<AuthResponse>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (response.ok) {
      localStorage.setItem('accessToken', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      return { success: true, data: data };
    } else {
      return { success: false, error: data.message || 'Sign-in failed' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const signUp = async (email: string, password: string): Promise<ApiResponse<AuthResponse>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (response.ok) {
      localStorage.setItem('accessToken', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      return { success: true, data: data };
    } else {
      return { success: false, error: data.message || 'Sign-up failed' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const getUserProfile = async (): Promise<ApiResponse<UserProfile>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user/me`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });
    const data = await response.json();
    if (response.ok) {
      return { success: true, data: data };
    } else {
      return { success: false, error: data.message || 'Failed to fetch user profile' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const getChats = async (): Promise<ApiResponse<Chat[]>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });
    const data = await response.json();
    if (response.ok) {
      return { success: true, data: data };
    } else {
      return { success: false, error: data.message || 'Failed to fetch chats' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const createChat = async (): Promise<ApiResponse<Chat>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });
    const data = await response.json();
    if (response.ok) {
      return { success: true, data: data };
    } else {
      return { success: false, error: data.message || 'Failed to create chat' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const getChatMessages = async (chatId: string): Promise<ApiResponse<Message[]>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/${chatId}/messages`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });
    const data = await response.json();
    if (response.ok) {
      return { success: true, data: data };
    } else {
      return { success: false, error: data.message || 'Failed to fetch messages' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const toggleStudyMode = async (chatId: string, enabled: boolean): Promise<ApiResponse<void>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/${chatId}/toggle-study-mode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify({ enabled }),
    });
    if (response.ok) {
      return { success: true };
    } else {
      const errorData = await response.json();
      return { success: false, error: errorData.message || 'Failed to toggle study mode' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const generateImage = async (prompt: string): Promise<ApiResponse<{ imageUrl: string }>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify({ prompt }),
    });
    const data = await response.json();
    if (response.ok) {
      return { success: true, data: data };
    } else {
      return { success: false, error: data.message || 'Failed to generate image' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const sendChatMessage = async (chatId: string, message: string, imageUrl?: string): Promise<ApiResponse<Message>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify({ chatId, message, imageUrl }),
    });
    const data = await response.json();
    if (response.ok) {
      return { success: true, data: data };
    } else {
      return { success: false, error: data.message || 'Failed to send message' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const saveMessages = async (chatId: string, messages: Message[]): Promise<ApiResponse<void>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/${chatId}/save-messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify({ messages }),
    });
    if (response.ok) {
      return { success: true };
    } else {
      const errorData = await response.json();
      return { success: false, error: errorData.message || 'Failed to save messages' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const updateChat = async (chatId: string, title: string): Promise<ApiResponse<void>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/${chatId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify({ title }),
    });
    if (response.ok) {
      return { success: true };
    } else {
      const errorData = await response.json();
      return { success: false, error: errorData.message || 'Failed to update chat' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const deleteChat = async (chatId: string): Promise<ApiResponse<void>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/${chatId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });
    if (response.ok) {
      return { success: true };
    } else {
      const errorData = await response.json();
      return { success: false, error: errorData.message || 'Failed to delete chat' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
