const axios = require('axios');
require('dotenv').config();

const API_USERNAME = process.env.DATAFORSEO_USERNAME;
const API_PASSWORD = process.env.DATAFORSEO_PASSWORD;

const BASE_URL = 'https://api.dataforseo.com/v3';

/**
 * Fetches backlinks for a given domain from the DataForSEO API.
 * @param {string} domain The domain to fetch backlinks for.
 * @returns {Promise<Array>} A promise that resolves to an array of backlinks.
 */
const getBacklinksForDomain = async (domain) => {
    if (!API_USERNAME || !API_PASSWORD) {
        console.error('DataForSEO API credentials are not set in .env file.');
        throw new Error('Missing API credentials for backlink service.');
    }

    const postData = [{
        target: domain,
        limit: 100, // Fetch up to 100 backlinks
        order_by: ["rank,desc"],
        // You can add more parameters here as needed
    }];

    const config = {
        headers: {
            'Authorization': `Basic ${Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64')}`,
            'Content-Type': 'application/json'
        }
    };

    try {
        const response = await axios.post(`${BASE_URL}/backlinks/backlinks/live`, postData, config);
        
        if (response.data.tasks && response.data.tasks[0].result) {
            return response.data.tasks[0].result.items;
        }
        
        return [];
    } catch (error) {
        console.error('Error fetching backlinks from DataForSEO:', error.response ? error.response.data : error.message);
        throw new Error('Failed to fetch backlinks.');
    }
};

module.exports = {
    getBacklinksForDomain
};
