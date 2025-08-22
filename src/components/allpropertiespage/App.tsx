import React, { useState, useMemo, useEffect } from 'react';
import { MapPin, ChevronDown, Home, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Property, Filters } from './types';
import { PropertyCard } from './components/PropertyCard';
import { FiltersPanel } from './components/FiltersPanel';
import { searchProperties, extractSearchCriteria } from './utils/searchUtils';
import axios from 'axios';
import ListingTypeSelector from '../updatedpropertyForms/ListingTypeSelector';

function Allproperties() {
  const [location, setLocation] = useState('Bangalore, Karnataka');
  const [fetchedProperties, setFetchedProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [recentLocations, setRecentLocations] = useState<string[]>(() => {
    const saved = localStorage.getItem('recentLocations');
    return saved ? JSON.parse(saved) : [];
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchAllProperties = async () => {
      try {
        const [propertyRes, tokenRes] = await Promise.all([
          axios.get('https://backend-7vs3.onrender.com/api/allproperties/all'),
          axios.get('https://backend-7vs3.onrender.com/api/lead-token'),
        ]);

        const grouped = propertyRes.data?.data || {};
        const tokens = tokenRes.data || [];

        const flattenGrouped = (grouped: Record<string, any>) => {
          const all: any[] = [];
          for (const groupKey in grouped) {
            const category = grouped[groupKey];
            for (const subType in category) {
              const items = category[subType];
              if (Array.isArray(items)) {
                all.push(...items);
              }
            }
          }
          return all;
        };

        const allProperties: Property[] = flattenGrouped(grouped);

        // Keep only properties that have verified & active lead tokens
        const filtered = allProperties.filter((property: any) => {
          const matchingToken = tokens.find(
            (token: any) =>
              token.propertyId === property.propertyId &&
              token.verified === true &&
              token.status?.toLowerCase() === 'active'
          );
          return !!matchingToken;
        });

        setFetchedProperties(filtered);
      } catch (error) {
        console.error('Error fetching properties or tokens:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllProperties();
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Filters>({
    listingTypes: [],
    propertyTypes: [],
    furnishingTypes: [],
    sharingTypes: [],
    priceRange: { min: null, max: null },
    category: [],
  });

  const handleFilterChange = (filters: Filters) => {
    setShowFilters(false);
    setActiveFilters(filters);
  };

  const handleDeleteProperty = (deletedPropertyId: string) => {
    setFetchedProperties(prev =>
      prev.filter(p => p.propertyId !== deletedPropertyId)
    );
  };

  // --- Live search: compute filtered list on every keystroke ---
  const liveResults: Property[] = useMemo(() => {
    // If you want a tiny debounce, you could store searchQuery in a debounced state; not strictly needed.
    const normalizedQuery = searchQuery.trim().toLowerCase();

    // 1) Build criteria from your utility
    let criteria = extractSearchCriteria
      ? extractSearchCriteria(normalizedQuery)
      : {};

    // 2) Apply active filters to criteria
    if (activeFilters.listingTypes.length) criteria.listingTypes = activeFilters.listingTypes;
    if (activeFilters.propertyTypes.length) criteria.propertyTypes = [...activeFilters.propertyTypes];
    if (activeFilters.furnishingTypes.length)
      (criteria as any).furnishing = activeFilters.furnishingTypes[0];
    if (activeFilters.sharingTypes.length)
      (criteria as any).sharing = activeFilters.sharingTypes[0];
    if (activeFilters.priceRange.min !== null || activeFilters.priceRange.max !== null) {
      (criteria as any).priceRange = {
        min: activeFilters.priceRange.min,
        max: activeFilters.priceRange.max,
        strict: true,
      };
    }

    // 3) Try your existing search function first (if it exists)
    try {
      if (searchProperties) {
        // Your searchUtils may return shape { exact, partial, ... }, prefer exact; fall back to combined
        const res = searchProperties(fetchedProperties, criteria as any);
        const list =
          (res?.exact && Array.isArray(res.exact) && res.exact.length > 0)
            ? res.exact
            : Array.isArray(res?.all)
              ? res.all
              : Array.isArray(res?.partial)
                ? res.partial
                : [];

        // If user typed nothing, show all (post-filtered by tokens)
        if (!normalizedQuery) return fetchedProperties;

        // If the util returns something, use it
        if (list.length > 0) return list;
        // If it returns empty, we'll fall through to a simple text includes filter below
      }
    } catch (e) {
      // If searchUtils throws, we still fall back to text filter
      console.warn('searchProperties failed, falling back to text filter', e);
    }

    // 4) Fallback: simple text match across common fields so search always works
    if (!normalizedQuery) return fetchedProperties;

    const includes = (v?: any) =>
      (v ?? '')
        .toString()
        .toLowerCase()
        .includes(normalizedQuery);

    return fetchedProperties.filter((p: any) => {
      // Gather searchable strings
      const bag = [
        p.propertyId,
        p.propertyType,
        p.listingType,
        p.title,
        p.name,
        p.projectName,
        p.propertyTitle,
        p.location,
        p.address?.city,
        p.address?.state,
        p.address?.locality,
        p.address?.landmark,
        p.category,
      ]
        .filter(Boolean)
        .map((x: any) => x.toString().toLowerCase())
        .join(' ');

      return bag.includes(normalizedQuery);
    });
  }, [searchQuery, activeFilters, fetchedProperties]);

  const handlePropertyClick = (propertyname: string, propertyId: string) => {
    const url = propertyname !== 'PL' && propertyname !== 'AG'
      ? `/detailprop/${propertyId}`
      : `/agriplot/${propertyId}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-black text-white py-3 sticky top-0 z-10">
        <div className="container mx-auto px-2">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
            <Link to="/" className="flex items-center gap-2 mb-2 md:mb-0 cursor-pointer">
  <img
    src="/images/rentamigologou.png"
    alt="PropAmigo Logo"
    className="h-10 w-15 object-contain"
  />
</Link>


            {/* <span className="text-xl font-bold" style={{ fontFamily: 'Neuropol X' }}>
              PropAmigo
            </span> */}

            <div className="flex items-center justify-center w-full md:w-auto">
              <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center gap-2 max-w-xs">
                <MapPin className="h-5 w-5 text-gray-300" />
                <span className="text-gray-100 truncate">{location}</span>
                <button
                  className="ml-2 p-1 hover:bg-white/10 rounded-full transition"
                  onClick={() => setShowLocationModal(true)}
                  aria-label="Change location"
                >
                  <svg className="h-4 w-4 text-gray-300" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1">
              <form onSubmit={(e) => e.preventDefault()} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <Search size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="Search properties..."
                    className="w-full px-3 py-2 pl-9 rounded text-black text-sm focus:outline-none focus:ring-1 focus:ring-black"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)} // 🔥 live filter as you type
                    aria-label="Search properties"
                    autoComplete="off"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-1 bg-white/10 px-3 py-2 rounded text-sm hover:bg-white/20"
                >
                  <Filter size={16} />
                  <span>Filters</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-2 py-3">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading properties...</div>
        ) : liveResults.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No properties match your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {liveResults.map((property: any) => (
              <div
                key={property.id || property.propertyId}
                onClick={() =>
                  handlePropertyClick(property.propertyId?.slice(8, 10), property.propertyId)
                }
                className="cursor-pointer"
              >
                <PropertyCard property={property} onDelete={handleDeleteProperty} />
              </div>
            ))}
          </div>
        )}
      </main>

      <div
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${showFilters ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setShowFilters(false)}
      >
        <div
          className={`absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white overflow-y-auto flex flex-col transform transition-transform duration-300 ${showFilters ? 'translate-x-0' : 'translate-x-full'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <FiltersPanel
            onFilterChange={handleFilterChange}
            onClose={() => setShowFilters(false)}
          />
        </div>
      </div>
    </div>
  );
}

export default Allproperties;
