import React from 'react';
import { Helmet } from 'react-helmet-async';
import {
    generateTitle,
    getCanonicalUrl,
    getDefaultOgImage,
} from '../utils/seo';

/**
 * SEOHead Component
 * Handles all SEO-related meta tags, Open Graph, Twitter Cards, and structured data
 * 
 * @param {Object} props
 * @param {string} props.title - Page title (will be combined with site name)
 * @param {string} props.description - Meta description
 * @param {string} props.image - Open Graph image URL
 * @param {string} props.url - Canonical URL (path, will be made absolute)
 * @param {string} props.type - og:type (default: 'website', use 'article' for blog posts)
 * @param {Object} props.article - Article metadata (for blog posts)
 * @param {string} props.article.publishedTime - ISO 8601 date
 * @param {string} props.article.modifiedTime - ISO 8601 date
 * @param {string} props.article.author - Author name
 * @param {Array<string>} props.article.tags - Array of tag names
 * @param {boolean} props.noindex - Whether to add noindex meta tag
 * @param {Object} props.structuredData - JSON-LD structured data object
 * @param {Array<string>} props.keywords - Meta keywords (optional, not heavily used by search engines)
 */
const SEOHead = ({
    title,
    description,
    image,
    url,
    type = 'website',
    article,
    noindex = false,
    structuredData,
    keywords,
}) => {
    const pageTitle = generateTitle(title);
    const canonicalUrl = url ? getCanonicalUrl(url) : getCanonicalUrl('/');
    const ogImage = image || getDefaultOgImage();

    return (
        <Helmet>
            {/* Basic Meta Tags */}
            <title>{pageTitle}</title>
            {description && <meta name="description" content={description} />}
            {keywords && keywords.length > 0 && (
                <meta name="keywords" content={keywords.join(', ')} />
            )}

            {/* Canonical URL */}
            <link rel="canonical" href={canonicalUrl} />

            {/* Robots */}
            {noindex && <meta name="robots" content="noindex, nofollow" />}

            {/* Open Graph */}
            <meta property="og:type" content={type} />
            <meta property="og:title" content={title || pageTitle} />
            {description && <meta property="og:description" content={description} />}
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:image" content={ogImage} />
            <meta property="og:site_name" content="PeakSelf" />

            {/* Article-specific Open Graph tags */}
            {type === 'article' && article && (
                <>
                    {article.publishedTime && (
                        <meta property="article:published_time" content={article.publishedTime} />
                    )}
                    {article.modifiedTime && (
                        <meta property="article:modified_time" content={article.modifiedTime} />
                    )}
                    {article.author && (
                        <meta property="article:author" content={article.author} />
                    )}
                    {article.tags && article.tags.map((tag, index) => (
                        <meta key={index} property="article:tag" content={tag} />
                    ))}
                </>
            )}

            {/* Twitter Card */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title || pageTitle} />
            {description && <meta name="twitter:description" content={description} />}
            <meta name="twitter:image" content={ogImage} />
            {/* Add your Twitter handle if you have one */}
            {/* <meta name="twitter:site" content="@peakself" /> */}
            {/* <meta name="twitter:creator" content="@peakself" /> */}

            {/* Structured Data (JSON-LD) */}
            {structuredData && (
                <script type="application/ld+json">
                    {JSON.stringify(structuredData)}
                </script>
            )}
        </Helmet>
    );
};

export default SEOHead;
