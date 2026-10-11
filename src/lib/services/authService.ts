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

  // Default demo / dummy credentials
  public static readonly DEFAULT_EMAIL = 'user@upipulse.app';
  public static readonly DEFAULT_PASSWORD = 'password123';
  public static readonly DEFAULT_NAME = 'Neil';

  private static isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  /**
   * Retrieves held dummy credentials or returns defaults
   */
  public static getHeldCredentials(): { email: string; password: string; name: string } {
    if (!this.isBrowser()) {
      return {
        email: this.DEFAULT_EMAIL,
        password: this.DEFAULT_PASSWORD,
        name: this.DEFAULT_NAME,
      };
    }

    try {
      const raw = localStorage.getItem(this.CREDS_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // Fallback
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
    if (!this.isBrowser()) return;
    localStorage.setItem(
      this.CREDS_KEY,
      JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        name,
      })
    );
  }

  /**
   * Get current authenticated user session
   */
  public static getCurrentUser(): AuthUser | null {
    if (!this.isBrowser()) {
      return {
        id: 'usr_default',
        email: this.DEFAULT_EMAIL,
        name: this.DEFAULT_NAME,
        isLoggedIn: true,
      };
    }

    try {
      const raw = localStorage.getItem(this.AUTH_KEY);
      if (raw) {
        return JSON.parse(raw);
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

    if (this.isBrowser()) {
      if (remember) {
        localStorage.setItem(this.AUTH_KEY, JSON.stringify(user));
      } else {
        sessionStorage.setItem(this.AUTH_KEY, JSON.stringify(user));
      }
    }

    return { success: true, user };
  }

  /**
   * Logs out the user
   */
  public static logout(): void {
    if (!this.isBrowser()) return;
    localStorage.removeItem(this.AUTH_KEY);
    sessionStorage.removeItem(this.AUTH_KEY);
  }
}
