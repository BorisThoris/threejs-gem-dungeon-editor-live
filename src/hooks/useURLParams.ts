import { useState, useEffect, useCallback } from 'react';

export interface URLParams {
  // Editor mode
  editor?: string;
  'room-builder'?: string;
  'texture-painter'?: string;
  'mosaic-creator'?: string;
  'texture-painter-example'?: string;
  
  // 3D Editor state
  type?: string;
  category?: 'rooms' | 'biomes' | 'objects' | 'elements';
  subcategory?: string;
  tab?: 'demo' | 'game';
  
  // Component types
  componentType?: string;
  objectType?: string;
  elementType?: string;
  
  // Component props (serialized as JSON)
  componentProps?: string;
  objectProps?: string;
  elementProps?: string;
  
  // Camera state
  cameraX?: string;
  cameraY?: string;
  cameraZ?: string;
  
  // UI state
  showPropsEditor?: string;
  showRoomInfo?: string;
  showActionCards?: string;
  searchQuery?: string;
  
  // Props (serialized as JSON)
  props?: string;
  
  // Collapsed groups (serialized as JSON)
  collapsedGroups?: string;
}

export const useURLParams = () => {
  const [urlParams, setUrlParams] = useState<URLParams>(() => {
    const params = new URLSearchParams(window.location.search);
    const result: URLParams = {};
    
    // Convert URLSearchParams to object
    for (const [key, value] of params.entries()) {
      result[key as keyof URLParams] = value;
    }
    
    return result;
  });

  const updateURL = useCallback((updates: Partial<URLParams>, replace = false) => {
    const newParams = new URLSearchParams(window.location.search);
    
    // Update parameters
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        newParams.set(key, String(value));
      } else {
        newParams.delete(key);
      }
    });
    
    const newURL = `${window.location.pathname}?${newParams.toString()}`;
    
    if (replace) {
      window.history.replaceState({}, '', newURL);
    } else {
      window.history.pushState({}, '', newURL);
    }
    
    // Update local state
    setUrlParams(prev => ({ ...prev, ...updates }));
  }, []);

  const getParam = useCallback((key: keyof URLParams) => {
    return urlParams[key];
  }, [urlParams]);

  const setParam = useCallback((key: keyof URLParams, value: string | undefined) => {
    updateURL({ [key]: value });
  }, [updateURL]);

  const clearParam = useCallback((key: keyof URLParams) => {
    updateURL({ [key]: undefined });
  }, [updateURL]);

  const clearAllParams = useCallback(() => {
    window.history.replaceState({}, '', window.location.pathname);
    setUrlParams({});
  }, []);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const newParams: URLParams = {};
      
      for (const [key, value] of params.entries()) {
        newParams[key as keyof URLParams] = value;
      }
      
      setUrlParams(newParams);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return {
    urlParams,
    updateURL,
    getParam,
    setParam,
    clearParam,
    clearAllParams,
  };
};

// Helper functions for common parameter types
export const parseCameraPosition = (x?: string, y?: string, z?: string): [number, number, number] => {
  const defaultPos: [number, number, number] = [10, 10, 10];
  
  if (!x || !y || !z) return defaultPos;
  
  const parsedX = parseFloat(x);
  const parsedY = parseFloat(y);
  const parsedZ = parseFloat(z);
  
  if (isNaN(parsedX) || isNaN(parsedY) || isNaN(parsedZ)) {
    return defaultPos;
  }
  
  return [parsedX, parsedY, parsedZ];
};

export const serializeCameraPosition = (position: [number, number, number]): { cameraX: string; cameraY: string; cameraZ: string } => {
  return {
    cameraX: position[0].toString(),
    cameraY: position[1].toString(),
    cameraZ: position[2].toString(),
  };
};

export const parseBoolean = (value?: string): boolean => {
  return value === 'true';
};

export const parseJSON = <T>(value?: string, defaultValue: T): T => {
  if (!value) return defaultValue;
  
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
};

export const serializeJSON = (value: any): string => {
  return JSON.stringify(value);
};
