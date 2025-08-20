'use client';

import { useState, useEffect } from 'react';

/**
 * Custom hook for managing session storage (browser tab persistence)
 * Stores and retrieves login form data
 */

export interface LoginFormData {
  name: string;
  sessionCode: string;
}

const STORAGE_KEY = 'leadership-values-login';

export function useSessionStorage() {
  const [data, setData] = useState<LoginFormData>({
    name: '',
    sessionCode: ''
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Load data from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedData = JSON.parse(stored) as LoginFormData;
        setData(parsedData);
      }
    } catch (error) {
      console.warn('Failed to load from sessionStorage:', error);
    }
    setIsLoaded(true);
  }, []);

  // Save data to sessionStorage
  const saveData = (formData: LoginFormData) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
      setData(formData);
    } catch (error) {
      console.warn('Failed to save to sessionStorage:', error);
    }
  };

  // Update specific field
  const updateField = (field: keyof LoginFormData, value: string) => {
    const newData = { ...data, [field]: value };
    saveData(newData);
  };

  // Clear all data
  const clearData = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      setData({ name: '', sessionCode: '' });
    } catch (error) {
      console.warn('Failed to clear sessionStorage:', error);
    }
  };

  // Check if URL parameters should override stored data
  const loadFromURL = () => {
    if (typeof window === 'undefined') return data;
    
    const params = new URLSearchParams(window.location.search);
    const urlName = params.get('name');
    const urlSession = params.get('session');
    
    if (urlName || urlSession) {
      const urlData: LoginFormData = {
        name: urlName || data.name,
        sessionCode: urlSession || data.sessionCode
      };
      
      // Update stored data with URL parameters
      saveData(urlData);
      return urlData;
    }
    
    return data;
  };

  return {
    data: isLoaded ? loadFromURL() : data,
    saveData,
    updateField,
    clearData,
    isLoaded
  };
}