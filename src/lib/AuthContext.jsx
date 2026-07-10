import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { auth } from '@/api/authClient';
import { captureRuntimeError } from '@/monitoring/sentryErrors';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  const checkUserAuth = useCallback(async (options = {}) => {
    const silent = options.silent === true;
    try {
      if (!silent) setIsLoadingAuth(true);
      const currentUser = await auth.getCurrentUser();
      setUser(currentUser);
      setIsAuthenticated(!!currentUser);
      if (!silent) setIsLoadingAuth(false);
      setAuthChecked(true);
      setAuthError(null);
    } catch (error) {
      console.error('User auth check failed:', error);
      captureRuntimeError(error, {
        subsystem: 'AUTH',
        category: error.status === 401 || error.status === 403 ? 'session_expired' : 'session_restore_failure',
      });
      setUser(null);
      if (!silent) setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);

      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  }, []);

  const checkAppState = useCallback(async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      const publicSettings = await auth.checkAppReady();
      setAppPublicSettings(publicSettings);
      setIsLoadingPublicSettings(false);

      const authed = await auth.isAuthenticated();
      if (authed) {
        await checkUserAuth();
      } else {
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        setAuthChecked(true);
      }
    } catch (appError) {
      console.error('App state check failed:', appError);
      setAuthError({
        type: 'unknown',
        message: appError.message || 'Failed to initialize auth'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, [checkUserAuth]);

  useEffect(() => {
    checkAppState();
  }, [checkAppState]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChange(async (session) => {
      if (session) {
        try {
          await auth.ensureAppUser();
        } catch (error) {
          console.warn("ensureAppUser on auth state change failed:", error);
          captureRuntimeError(error, { subsystem: "AUTH", category: "ensure_app_user_failure" });
        }
        await checkUserAuth({ silent: true });
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setAuthChecked(true);
        setIsLoadingAuth(false);
      }
    });

    return unsubscribe;
  }, [checkUserAuth]);

  const applyUser = useCallback((nextUser) => {
    setUser(nextUser);
    setIsAuthenticated(!!nextUser);
    setAuthChecked(true);
    setAuthError(null);
  }, []);

  const refreshUser = useCallback(async () => {
    return checkUserAuth({ silent: true });
  }, [checkUserAuth]);

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);

    if (shouldRedirect) {
      auth.logout(window.location.href);
    } else {
      auth.logout();
    }
  };

  const navigateToLogin = () => {
    auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState,
      applyUser,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
