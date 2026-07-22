const axios = require('axios');

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const BASE_URL = 'https://places.googleapis.com/v1/places:searchText';

/**
 * Search for businesses using Google Places API (New).
 * Filters results that do NOT have a website.
 */
async function searchBusinesses(query, location, radius = 5000) {
    const fieldMask = [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.nationalPhoneNumber',
        'places.internationalPhoneNumber',
        'places.websiteUri',
        'places.googleMapsUri',
        'places.rating',
        'places.userRatingCount',
        'places.types',
        'places.photos',
        'places.location',
        'places.currentOpeningHours',
        'places.primaryType',
    ].join(',');

    const body = {
        textQuery: query,
        languageCode: 'pt-BR',
    };

    // Add location bias if coordinates are provided
    if (location && location.latitude && location.longitude) {
        body.locationBias = {
            circle: {
                center: {
                    latitude: location.latitude,
                    longitude: location.longitude,
                },
                radius: radius,
            },
        };
    }

    try {
        const response = await axios.post(BASE_URL, body, {
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': API_KEY,
                'X-Goog-FieldMask': fieldMask,
            },
        });

        const places = response.data.places || [];

        // Map to our internal format
        return places.map(place => ({
            placeId: place.id,
            name: place.displayName?.text || '',
            address: place.formattedAddress || '',
            phone: place.internationalPhoneNumber || place.nationalPhoneNumber || null,
            category: place.primaryType || (place.types ? place.types[0] : null),
            rating: place.rating || null,
            reviewCount: place.userRatingCount || null,
            hasWebsite: !!place.websiteUri,
            websiteUrl: place.websiteUri || null,
            googleMapsUrl: place.googleMapsUri || null,
            latitude: place.location?.latitude || null,
            longitude: place.location?.longitude || null,
            photos: place.photos ? place.photos.slice(0, 5).map(p => p.name) : [],
            openingHours: place.currentOpeningHours?.weekdayDescriptions
                ? place.currentOpeningHours.weekdayDescriptions.join(' | ')
                : null,
        }));
    } catch (error) {
        console.error('[GooglePlaces] Error:', error.response?.data || error.message);
        throw new Error(`Google Places API error: ${error.response?.data?.error?.message || error.message}`);
    }
}

/**
 * Get a photo URL from a photo resource name.
 */
function getPhotoUrl(photoName, maxWidth = 400) {
    return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${API_KEY}`;
}

/**
 * Search and return all businesses, indicating those WITHOUT a website.
 */
async function searchBusinessesWithoutWebsite(query, location, radius) {
    const all = await searchBusinesses(query, location, radius);
    const withoutSite = all.filter(b => !b.hasWebsite);

    console.log(`[GooglePlaces] Found ${all.length} total, ${withoutSite.length} without website`);

    return {
        total: all.length,
        withoutWebsite: withoutSite.length,
        businesses: all, // Return all, let the database/frontend handle the filter
    };
}

module.exports = {
    searchBusinesses,
    searchBusinessesWithoutWebsite,
    getPhotoUrl,
};
