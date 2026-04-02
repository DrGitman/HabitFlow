/**
 * API Service for Habit Tracker
 * Connects to Python Flask backend
 */

// Replace with your actual backend URL
// For local development: http://localhost:5000
// For production: your deployed backend URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

class ApiService {
  private getHeaders(requiresAuth: boolean = true): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (requiresAuth) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { requiresAuth = true, ...fetchOptions } = options;

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...fetchOptions,
        headers: {
          ...this.getHeaders(requiresAuth),
          ...fetchOptions.headers,
        },
      });

      if (!response.ok) {
        // FastAPI returns error messages in the 'detail' field
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || errorData.error;

        if (errorMessage) {
          throw new Error(errorMessage);
        }

        // Fallback messages for common status codes
        switch (response.status) {
          case 401:
            throw new Error('Session expired. Please sign in again.');
          case 403:
            throw new Error('You do not have permission to perform this action.');
          case 404:
            throw new Error('The requested resource was not found.');
          case 500:
            throw new Error('An internal server error occurred. Please try again later.');
          default:
            throw new Error(`Error: ${response.status} ${response.statusText}`);
        }
      }

      return response.json();
    } catch (error: any) {
      if (error instanceof Error) throw error;
      throw new Error('A network error occurred. Please check your connection.');
    }
  }

  // Auth
  async signup(email: string, password: string, fullName?: string) {
    return this.request('/api/signup', {
      method: 'POST',
      requiresAuth: false,
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
  }

  async login(email: string, password: string) {
    return this.request('/api/login', {
      method: 'POST',
      requiresAuth: false,
      body: JSON.stringify({ email, password }),
    });
  }

  // Habits
  async getHabits() {
    return this.request('/api/habits');
  }

  async createHabit(data: any) {
    return this.request('/api/habits', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateHabit(id: number, data: any) {
    return this.request(`/api/habits/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteHabit(id: number) {
    return this.request(`/api/habits/${id}`, {
      method: 'DELETE',
    });
  }

  async completeHabit(id: number, data?: any) {
    return this.request(`/api/habits/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  // Tasks
  async getTasks(completed?: boolean) {
    const params = completed !== undefined ? `?completed=${completed}` : '';
    return this.request(`/api/tasks${params}`);
  }

  async createTask(data: any) {
    return this.request('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTask(id: number, data: any) {
    return this.request(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTask(id: number) {
    return this.request(`/api/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  async completeTask(id: number, isCompleted: boolean = true) {
    return this.request(`/api/tasks/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ is_completed: isCompleted }),
    });
  }

  // Goals
  async getGoals() {
    return this.request('/api/goals');
  }

  async createGoal(data: any) {
    return this.request('/api/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateGoal(id: number, data: any) {
    return this.request(`/api/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteGoal(id: number) {
    return this.request(`/api/goals/${id}`, {
      method: 'DELETE',
    });
  }

  async updateGoalProgress(id: number, increment: number) {
    return this.request(`/api/goals/${id}/progress`, {
      method: 'POST',
      body: JSON.stringify({ increment }),
    });
  }

  // Analytics
  async getAnalyticsSummary() {
    return this.request('/api/analytics/summary');
  }

  async getAnalyticsProgress() {
    return this.request('/api/analytics/progress');
  }

  async getAnalyticsStreaks() {
    return this.request('/api/analytics/streaks');
  }

  async getCalendarData(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const queryString = params.toString();
    return this.request(`/api/calendar-data${queryString ? `?${queryString}` : ''}`);
  }

  async getNotifications() {
    return this.request('/api/notifications');
  }

  async markNotificationAsRead(id: number) {
    return this.request(`/api/notifications/${id}/read`, {
      method: 'POST',
    });
  }

  async deleteNotification(id: number) {
    return this.request(`/api/notifications/${id}`, {
      method: 'DELETE',
    });
  }

  async globalSearch(query: string) {
    return this.request(`/api/search?q=${encodeURIComponent(query)}`);
  }

  async getProfile() {
    return this.request('/api/profile');
  }

  async updateProfile(data: any) {
    return this.request('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async changePassword(data: any) {
    return this.request('/api/profile/password', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateAvatar(avatarUrl: string) {
    return this.request('/api/profile/avatar', {
      method: 'POST',
      body: JSON.stringify({ avatar_url: avatarUrl }),
    });
  }

  async getAchievements() {
    return this.request('/api/profile/achievements');
  }

  async getRecentActivity() {
    return this.request('/api/recent-activity');
  }
}

export const api = new ApiService();
