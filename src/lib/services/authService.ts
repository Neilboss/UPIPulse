export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  isLoggedIn: boolean;
  loggedInAt?: string;
}

export class AuthService {
  private static AUTH_KEY = 'upipulse_auth_user';
  private static CREDS_KEY = 'upipulse_held_credentials';
  private static LOGOUT_KEY = 'upipulse_logged_out';

  // Default demo / dummy credentials
  public static readonly DEFAULT_EMAIL = 'user@upipulse.app';
  public static readonly DEFAULT_PASSWORD = 'password123';
  public static readonly DEFAULT_NAME = 'Neil';

  private static memoryStore: Record<string, string> = {};

  private static isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  /**
   * Retrieves held dummy credentials or returns defaults
   */
  public static getHeldCredentials(): { email: string; password: string; name: string } {
    if (this.isBrowser()) {
      try {
        const raw = localStorage.getItem(this.CREDS_KEY);
        if (raw) {
          return JSON.parse(raw);
        }
      } catch {
        // Fallback
      }
    } else if (this.memoryStore[this.CREDS_KEY]) {
      return JSON.parse(this.memoryStore[this.CREDS_KEY]);
    }

    const defaultCreds = {
      email: this.DEFAULT_EMAIL,
      password: this.DEFAULT_PASSWORD,
      name: this.DEFAULT_NAME,
    };
    this.saveHeldCredentials(defaultCreds.email, defaultCreds.password, defaultCreds.name);
    return defaultCreds;
  }

  /**
   * Updates held dummy credentials
   */
  public static saveHeldCredentials(email: string, password: string, name = 'Neil'): void {
    const payload = JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
      name,
    });
    this.memoryStore[this.CREDS_KEY] = payload;
    if (!this.isBrowser()) return;
    try {
      localStorage.setItem(this.CREDS_KEY, payload);
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Get current authenticated user session
   */
  public static getCurrentUser(): AuthUser | null {
    if (!this.isBrowser()) {
      if (this.memoryStore[this.LOGOUT_KEY] === 'true') return null;
      if (this.memoryStore[this.AUTH_KEY]) {
        return JSON.parse(this.memoryStore[this.AUTH_KEY]);
      }
      return {
        id: 'usr_default',
        email: this.DEFAULT_EMAIL,
        name: this.DEFAULT_NAME,
        isLoggedIn: true,
      };
    }

    try {
      const raw = localStorage.getItem(this.AUTH_KEY) || sessionStorage.getItem(this.AUTH_KEY);
      if (raw) {
        return JSON.parse(raw);
      }

      // Auto-login with held dummy credentials if user has not explicitly logged out
      if (localStorage.getItem(this.LOGOUT_KEY) !== 'true') {
        const held = this.getHeldCredentials();
        const autoUser: AuthUser = {
          id: 'usr_demo',
          email: held.email,
          name: held.name || this.DEFAULT_NAME,
          isLoggedIn: true,
          loggedInAt: new Date().toISOString(),
        };
        localStorage.setItem(this.AUTH_KEY, JSON.stringify(autoUser));
        return autoUser;
      }
    } catch {
      // Ignore
    }
    return null;
  }

  /**
   * Check if user is currently logged in
   */
  public static isAuthenticated(): boolean {
    const user = this.getCurrentUser();
    return !!(user && user.isLoggedIn);
  }

  /**
   * Authenticates using provided or held dummy credentials
   */
  public static login(
    email: string,
    password: string,
    remember = true
  ): { success: boolean; user?: AuthUser; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const held = this.getHeldCredentials();

    // Check credentials against held dummy credentials or default demo credentials
    const matchesHeld =
      cleanEmail === held.email.toLowerCase() && password === held.password;
    const matchesDefault =
      cleanEmail === this.DEFAULT_EMAIL.toLowerCase() &&
      password === this.DEFAULT_PASSWORD;

    if (!matchesHeld && !matchesDefault) {
      return {
        success: false,
        error: 'Invalid email or password. Use demo credentials or reset.',
      };
    }

    const user: AuthUser = {
      id: 'usr_' + Date.now().toString(36),
      email: cleanEmail,
      name: held.name || this.DEFAULT_NAME,
      isLoggedIn: true,
      loggedInAt: new Date().toISOString(),
    };

    const serialized = JSON.stringify(user);
    this.memoryStore[this.AUTH_KEY] = serialized;
    delete this.memoryStore[this.LOGOUT_KEY];

    if (this.isBrowser()) {
      try {
        localStorage.removeItem(this.LOGOUT_KEY);
        if (remember) {
          localStorage.setItem(this.AUTH_KEY, serialized);
        } else {
          sessionStorage.setItem(this.AUTH_KEY, serialized);
        }
      } catch {
        // Ignore storage errors
      }
    }

    return { success: true, user };
  }

  /**
   * Logs out the user
   */
  public static logout(): void {
    delete this.memoryStore[this.AUTH_KEY];
    this.memoryStore[this.LOGOUT_KEY] = 'true';
    if (!this.isBrowser()) return;
    try {
      localStorage.removeItem(this.AUTH_KEY);
      sessionStorage.removeItem(this.AUTH_KEY);
      localStorage.setItem(this.LOGOUT_KEY, 'true');
    } catch {
      // Ignore
    }
  }
}
