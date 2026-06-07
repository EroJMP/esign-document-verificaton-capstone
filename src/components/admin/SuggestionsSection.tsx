'use client';

import { useState, useEffect } from 'react';
import { Lightbulb } from 'lucide-react';
import SuggestionCard, { Suggestion } from './SuggestionCard';

export default function SuggestionsSection() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ignoredSuggestions, setIgnoredSuggestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/dashboard/suggestions');
      
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleIgnoreSuggestion = async (suggestionId: string) => {
    try {
      const response = await fetch('/api/admin/dashboard/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ suggestion_id: suggestionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to ignore suggestion');
      }

      // Add to ignored suggestions set
      setIgnoredSuggestions(prev => new Set(prev).add(suggestionId));
    } catch (err) {
      console.error('Error ignoring suggestion:', err);
    }
  };

  const handleIgnoreAll = async () => {
    try {
      // Ignore all visible suggestions
      const ignorePromises = visibleSuggestions.map(suggestion => 
        fetch('/api/admin/dashboard/suggestions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ suggestion_id: suggestion.id }),
        })
      );

      await Promise.all(ignorePromises);

      // Add all suggestions to ignored set
      const allSuggestionIds = visibleSuggestions.map(s => s.id);
      setIgnoredSuggestions(prev => new Set([...prev, ...allSuggestionIds]));
    } catch (err) {
      console.error('Error ignoring all suggestions:', err);
    }
  };

  // Filter out ignored suggestions
  const visibleSuggestions = suggestions.filter(
    suggestion => !ignoredSuggestions.has(suggestion.id)
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          <h2 className="text-lg font-medium text-gray-900">Suggestions</h2>
        </div>
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          <h2 className="text-lg font-medium text-gray-900">Suggestions</h2>
        </div>
        <div className="text-sm text-red-600">
          Error loading suggestions: {error}
        </div>
      </div>
    );
  }

  if (visibleSuggestions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          <h2 className="text-lg font-medium text-gray-900">Suggestions</h2>
        </div>
        <div className="text-center py-8">
          <Lightbulb className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No suggestions</h3>
          <p className="mt-1 text-sm text-gray-500">
            Everything looks good! No action items at the moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          <h2 className="text-lg font-medium text-gray-900">
            Suggestions ({visibleSuggestions.length})
          </h2>
        </div>
        {visibleSuggestions.length > 0 && (
          <button
            onClick={handleIgnoreAll}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            title="Ignore all suggestions"
          >
            Ignore All
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleSuggestions.map((suggestion) => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            onIgnore={handleIgnoreSuggestion}
          />
        ))}
      </div>
    </div>
  );
}
