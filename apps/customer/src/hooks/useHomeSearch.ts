import { useState, useEffect, useRef } from 'react';
import { HomeBasicServiceItem } from '../types/home.types';
import { homeService } from '../services/home.service';

export function useHomeSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<HomeBasicServiceItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  
  // Track current search request to avoid out-of-order race conditions
  const latestRequestId = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const currentId = ++latestRequestId.current;

    const handler = setTimeout(async () => {
      try {
        const items = await homeService.searchServices(trimmed);
        // Only update if this request is still the newest one
        if (currentId === latestRequestId.current) {
          setResults(items);
          setIsSearching(false);
        }
      } catch {
        if (currentId === latestRequestId.current) {
          setResults([]);
          setIsSearching(false);
        }
      }
    }, 280); // 280ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [query]);

  return {
    query,
    setQuery,
    results,
    isSearching,
    isSearchActive,
    openSearch: () => setIsSearchActive(true),
    closeSearch: () => {
      setIsSearchActive(false);
      setQuery('');
      setResults([]);
    },
    clearSearch: () => {
      setQuery('');
      setResults([]);
    },
  };
}
