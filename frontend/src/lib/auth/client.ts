'use client';

import { useState, useEffect } from 'react';

// Retrieve base API URL from env or fallback to localhost
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export const authClient = {
  // Mock/Custom useSession
  useSession() {
    const [session, setSession] = useState<{ user: { id: string; email: string; name?: string } | null } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      async function loadSession() {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          setSession(null);
          setLoading(false);
          return;
        }

        try {
          const res = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            setSession({
              user: {
                id: String(data.id),
                email: data.email,
                name: data.name || data.email.split('@')[0]
              }
            });
          } else {
            // Token expired or invalid, clean up local storage and cookies
            localStorage.removeItem("auth_token");
            document.cookie = "auth_token=; path=/; max-age=0; SameSite=Lax";
            setSession(null);
          }
        } catch (err) {
          console.error("Failed to load user session", err);
          setSession(null);
        } finally {
          setLoading(false);
        }
      }
      loadSession();
    }, []);

    return { data: session, loading };
  },

  // Mock/Custom getSession
  async getSession() {
    const token = localStorage.getItem("auth_token");
    if (!token) return null;
    
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        return {
          data: {
            user: {
              id: String(data.id),
              email: data.email,
              name: data.name || data.email.split('@')[0]
            }
          }
        };
      }
    } catch (err) {
      console.error("Failed to get session:", err);
    }
    return null;
  },

  // Custom signIn endpoints
  signIn: {
    async email({ email, password }: any) {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) {
          return { error: { message: data.detail || "Invalid credentials. Please try again." } };
        }
        
        // Save token to localStorage and Cookie for Next.js middleware checking
        localStorage.setItem("auth_token", data.token);
        document.cookie = `auth_token=${data.token}; path=/; max-age=${3600*24}; SameSite=Lax`;
        return { data };
      } catch (err: any) {
        return { error: { message: err.message || "Failed to sign in. Please try again." } };
      }
    },
    async social() {
      return { error: { message: "Social login is not supported in custom JWT auth mode." } };
    }
  },

  // Custom signUp endpoints
  signUp: {
    async email({ email, password, name }: any) {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email, password, name })
        });
        const data = await res.json();
        if (!res.ok) {
          return { error: { message: data.detail || "Failed to create account. Please try again." } };
        }
        
        // Save token to localStorage and Cookie for Next.js middleware checking
        localStorage.setItem("auth_token", data.token);
        document.cookie = `auth_token=${data.token}; path=/; max-age=${3600*24}; SameSite=Lax`;
        return { data };
      } catch (err: any) {
        return { error: { message: err.message || "Failed to sign up. Please try again." } };
      }
    }
  },

  // Sign out logic
  async signOut() {
    localStorage.removeItem("auth_token");
    document.cookie = "auth_token=; path=/; max-age=0; SameSite=Lax";
    window.location.href = "/";
  }
};
