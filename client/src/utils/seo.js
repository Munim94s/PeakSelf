/**
 * SEO utility functions for Peakium
 * Provides helpers for generating meta tags, structured data, and canonical URLs
 */

// Site configuration
const SITE_NAME = 'Peakium';
const SITE_TAGLINE = 'Analytics Platform';
const SITE_DESCRIPTION = 'Modern, self-hosted analytics and blog platform built with React, Express, and PostgreSQL. Complete control over your data.';
const DEFAULT_OG_IMAGE = '/og-image.png'; // You'll need to add this image to public folder

// Get base URL from environment or default to localhost
export function getBaseUrl() {
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }
    return import.meta.env.VITE_APP_BASE_URL || 'http://localhost:5173';
}

/**
 * Generate full page title with site name
 * @param {string} pageTitle - The page-specific title
 * @param {boolean} includeSiteName - Whether to append site name
 * @returns {string} Full page title
 */
export function generateTitle(pageTitle, includeSiteName = true) {
    if (!pageTitle) {
        return `${SITE_NAME} - ${SITE_TAGLINE}`;
    }

    if (includeSiteName) {
        return `${pageTitle} | ${SITE_NAME}`;
    }

    return pageTitle;
}

/**
 * Truncate text to specified length for meta descriptions
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length (default: 160 for meta descriptions)
 * @returns {string} Truncated text
 */
export function truncateDescription(text, maxLength = 160) {
    if (!text) return SITE_DESCRIPTION;

    // Remove HTML tags
    const plainText = text.replace(/<[^>]*>/g, '');

    if (plainText.length <= maxLength) {
        return plainText;
    }

    // Truncate at last space before maxLength
    const truncated = plainText.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');

    if (lastSpace > 0) {
        return truncated.substring(0, lastSpace) + '...';
    }

    return truncated + '...';
}

/**
 * Generate canonical URL from path
 * @param {string} path - The URL path
 * @returns {string} Full canonical URL
 */
export function getCanonicalUrl(path) {
    const baseUrl = getBaseUrl();

    // Remove trailing slash from base URL
    const cleanBase = baseUrl.replace(/\/$/, '');

    // Ensure path starts with /
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    return `${cleanBase}${cleanPath}`;
}

/**
 * Generate JSON-LD structured data for a blog post
 * @param {Object} post - Blog post object
 * @returns {Object} Blog post structured data
 */
export function generateBlogPostSchema(post) {
    const baseUrl = getBaseUrl();

    return {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.excerpt || truncateDescription(post.content),
        image: post.image ? (post.image.startsWith('http') ? post.image : `${baseUrl}${post.image}`) : `${baseUrl}${DEFAULT_OG_IMAGE}`,
        datePublished: post.published_at || post.created_at,
        dateModified: post.updated_at || post.published_at || post.created_at,
        author: {
            '@type': 'Person',
            name: post.author || 'Peakium Team',
        },
        publisher: {
            '@type': 'Organization',
            name: SITE_NAME,
            logo: {
                '@type': 'ImageObject',
                url: `${baseUrl}/logo.png`, // You'll need to add this
            },
        },
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': getCanonicalUrl(`/blog/${post.slug}`),
        },
    };
}

/**
 * Generate JSON-LD structured data for organization
 * @returns {Object} Organization structured data
 */
export function generateOrganizationSchema() {
    const baseUrl = getBaseUrl();

    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE_NAME,
        url: baseUrl,
        logo: `${baseUrl}/logo.png`,
        description: SITE_DESCRIPTION,
        sameAs: [
            // Add your social media URLs here
            // 'https://twitter.com/Peakium',
            // 'https://github.com/Peakium',
        ],
    };
}

/**
 * Generate JSON-LD breadcrumb structured data
 * @param {Array} items - Array of breadcrumb items { name, url }
 * @returns {Object} Breadcrumb structured data
 */
export function generateBreadcrumbSchema(items) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: getCanonicalUrl(item.url),
        })),
    };
}

/**
 * Get default Open Graph image
 * @returns {string} Default OG image URL
 */
export function getDefaultOgImage() {
    return `${getBaseUrl()}${DEFAULT_OG_IMAGE}`;
}

/**
 * Extract excerpt from HTML content
 * @param {string} html - HTML content
 * @param {number} maxLength - Maximum length
 * @returns {string} Plain text excerpt
 */
export function extractExcerpt(html, maxLength = 160) {
    if (!html) return '';

    // Remove HTML tags
    const text = html.replace(/<[^>]*>/g, ' ');

    // Remove extra whitespace
    const cleaned = text.replace(/\s+/g, ' ').trim();

    return truncateDescription(cleaned, maxLength);
}

