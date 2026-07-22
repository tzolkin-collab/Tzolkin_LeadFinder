const axios = require('axios');

const ACCESS_TOKEN = process.env.META_ADS_TOKEN;
const BASE_URL = 'https://graph.facebook.com/v18.0/ads_archive';

/**
 * Check if a business has active ads on Meta Platforms.
 * @param {string} businessName 
 * @returns {Promise<{ hasAds: boolean, count: number, error: string|null }>}
 */
async function checkActiveAds(businessName) {
    if (!ACCESS_TOKEN || ACCESS_TOKEN === 'your_meta_token_here') {
        return { hasAds: false, count: 0, error: 'Meta token not configured' };
    }

    try {
        const params = {
            access_token: ACCESS_TOKEN,
            search_terms: businessName,
            ad_reached_countries: "['BR']",
            ad_active_status: 'ACTIVE',
            limit: 5,
            fields: 'id,ad_snapshot_url,page_name,page_id'
        };

        const response = await axios.get(BASE_URL, { params });
        const ads = response.data.data || [];

        return {
            hasAds: ads.length > 0,
            count: ads.length,
            error: null
        };
    } catch (error) {
        console.error(`[MetaAds] Error checking ads for "${businessName}":`, error.response?.data || error.message);
        return {
            hasAds: false,
            count: 0,
            error: error.response?.data?.error?.message || error.message
        };
    }
}

module.exports = {
    checkActiveAds
};
