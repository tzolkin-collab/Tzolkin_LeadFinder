const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Search for a business Instagram profile by name and location.
 * Uses public web scraping (no official API needed).
 */
async function findInstagramProfile(businessName, location) {
    try {
        // SERP API Integration (Optional but recommended)
        if (process.env.SERPER_API_KEY && process.env.SERPER_API_KEY !== 'your_serper_api_key_here') {
            return await findInstagramProfileWithSerper(businessName, location);
        }

        // Clean up business name for search
        const searchQuery = `${businessName} ${location || ''} instagram`.trim();

        // Try to find via Google search
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

        const response = await axios.get(googleUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
            },
            timeout: 10000,
        });

        const $ = cheerio.load(response.data);
        const links = [];

        $('a').each((_, el) => {
            const href = $(el).attr('href');
            if (href && href.includes('instagram.com/')) {
                const match = href.match(/instagram\.com\/([a-zA-Z0-9_.]+)/);
                if (match && !['accounts', 'explore', 'p', 'reel', 'stories', 'about', 'legal', 'developer'].includes(match[1])) {
                    links.push(match[1]);
                }
            }
        });

        if (links.length === 0) {
            console.log(`[Instagram] No profile found for: ${businessName}`);
            return null;
        }

        // Use the most mentioned handle
        const handleCounts = {};
        links.forEach(h => { handleCounts[h] = (handleCounts[h] || 0) + 1; });
        const bestHandle = Object.entries(handleCounts).sort((a, b) => b[1] - a[1])[0][0];

        console.log(`[Instagram] Found profile: @${bestHandle}`);

        // Try to get profile data
        const profileData = await scrapeInstagramProfile(bestHandle);

        return {
            handle: bestHandle,
            url: `https://www.instagram.com/${bestHandle}/`,
            ...profileData,
        };

    } catch (error) {
        console.error(`[Instagram] Search error for "${businessName}":`, error.message);
        return null;
    }
}

/**
 * Scrape public Instagram profile data.
 * Note: This may be rate-limited or blocked. Returns minimal data if blocked.
 */
async function scrapeInstagramProfile(handle) {
    try {
        const response = await axios.get(`https://www.instagram.com/${handle}/`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'pt-BR,pt;q=0.9',
            },
            timeout: 10000,
        });

        const html = response.data;

        // Try to extract meta tags
        const $ = cheerio.load(html);

        const description = $('meta[property="og:description"]').attr('content') || '';
        const profilePic = $('meta[property="og:image"]').attr('content') || null;
        const title = $('meta[property="og:title"]').attr('content') || '';

        // Parse followers/posts from description (e.g., "1,234 Followers, 56 Following, 78 Posts")
        let followers = null;
        let posts = null;

        const followersMatch = description.match(/([\d,.]+[KkMm]?)\s*Followers/i);
        if (followersMatch) {
            followers = followersMatch[1];
        }

        const postsMatch = description.match(/([\d,.]+)\s*Posts/i);
        if (postsMatch) {
            posts = parseInt(postsMatch[1].replace(/,/g, ''));
        }

        // Extract bio from description (part after the counts)
        let bio = null;
        let extWebsite = null;
        const bioParts = description.split(' - ');
        if (bioParts.length > 1) {
            bio = bioParts.slice(1).join(' - ').trim();
            // Remove quotes if present
            bio = bio.replace(/^[""]|[""]$/g, '').trim();

            // Simple regex to find websites in bio
            const urlMatch = bio.match(/(https?:\/\/[^\s]+)/i);
            if (urlMatch) {
                extWebsite = urlMatch[1];
            }
        }

        return {
            bio,
            followers,
            posts,
            profilePicUrl: profilePic,
            website: extWebsite,
        };

    } catch (error) {
        console.log(`[Instagram] Could not scrape @${handle}:`, error.message);
        return {
            bio: null,
            followers: null,
            posts: null,
            profilePicUrl: null,
        };
    }
}

/**
 * Scrape Linktree or similar landing pages to extract categorized links.
 */
async function scrapeLinktree(url) {
    if (!url) return null;
    
    // Only handle Linktree, Beacons, or common landing pages
    const isLandingPage = /linktr\.ee|beacons\.ai|bio\.site|link\.bio/i.test(url);
    if (!isLandingPage) return null;

    try {
        console.log(`[Linktree] Scraping landing page: ${url}`);
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            timeout: 8000
        });

        const $ = cheerio.load(response.data);
        const links = [];

        $('a').each((i, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();

            if (href && href.startsWith('http')) {
                // Categorize based on keywords
                let type = 'other';
                const lowerText = text.toLowerCase();
                const lowerHref = href.toLowerCase();

                if (lowerText.includes('whatsapp') || lowerText.includes('contato') || lowerHref.includes('wa.me')) {
                    type = 'whatsapp';
                } else if (lowerText.includes('site') || lowerText.includes('web') || lowerText.includes('página')) {
                    type = 'website';
                } else if (lowerText.includes('portfólio') || lowerText.includes('trabalhos') || lowerText.includes('fotos')) {
                    type = 'portfolio';
                } else if (lowerText.includes('agenda') || lowerText.includes('calendário') || lowerText.includes('marcar')) {
                    type = 'calendar';
                }

                links.push({ text, url: href, type });
            }
        });

        return links;
    } catch (error) {
        console.log(`[Linktree] Could not scrape ${url}:`, error.message);
        return null;
    }
}

/**
 * Search for Instagram profile using Serper.dev API.
 * Much more stable than direct scraping.
 */
async function findInstagramProfileWithSerper(businessName, location) {
    try {
        const searchQuery = `${businessName} ${location || ''} instagram`.trim();
        
        const response = await axios.post('https://google.serper.dev/search', {
            q: searchQuery,
            num: 5
        }, {
            headers: {
                'X-API-KEY': process.env.SERPER_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const results = response.data.organic || [];
        const links = [];

        results.forEach(result => {
            const link = result.link || '';
            if (link.includes('instagram.com/')) {
                const match = link.match(/instagram\.com\/([a-zA-Z0-9_.]+)/);
                if (match && !['accounts', 'explore', 'p', 'reel', 'stories', 'about', 'legal', 'developer'].includes(match[1])) {
                    links.push(match[1]);
                }
            }
        });

        if (links.length === 0) {
            console.log(`[Instagram-Serper] No profile found for: ${businessName}`);
            return null;
        }

        const handleCounts = {};
        links.forEach(h => { handleCounts[h] = (handleCounts[h] || 0) + 1; });
        const bestHandle = Object.entries(handleCounts).sort((a, b) => b[1] - a[1])[0][0];

        console.log(`[Instagram-Serper] Found profile: @${bestHandle}`);

        const profileData = await scrapeInstagramProfile(bestHandle);
        let extraLinks = null;

        // If a website was found in bio, check if it's a linktree
        if (profileData.website) {
            extraLinks = await scrapeLinktree(profileData.website);
        }

        return {
            handle: bestHandle,
            url: `https://www.instagram.com/${bestHandle}/`,
            ...profileData,
            extraLinks,
        };

    } catch (error) {
        console.error(`[Instagram-Serper] Error for "${businessName}":`, error.message);
        return null;
    }
}

module.exports = {
    findInstagramProfile,
    scrapeInstagramProfile,
};
