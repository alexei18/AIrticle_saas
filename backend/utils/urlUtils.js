const { URL } = require('url');

function normalizeUrl(urlString) {
    try {
        const url = new URL(urlString);

        // 1. Remove 'www.' from the beginning of the hostname
        if (url.hostname.startsWith('www.')) {
            url.hostname = url.hostname.substring(4);
        }

        // 2. Remove trailing slashes from the pathname
        if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
            url.pathname = url.pathname.slice(0, -1);
        }

        // 3. Remove the fragment identifier
        url.hash = '';

        // 4. Sort query parameters for consistency
        if (url.search) {
            const searchParams = new URLSearchParams(url.search);
            const sortedParams = new URLSearchParams();
            Array.from(searchParams.keys()).sort().forEach(key => {
                sortedParams.append(key, searchParams.get(key));
            });
            url.search = sortedParams.toString();
        }

        return url.toString();
    } catch (error) {
        console.error(`Could not normalize URL "${urlString}": ${error.message}`);
        return urlString; // Return original if parsing fails
    }
}

module.exports = { normalizeUrl };
