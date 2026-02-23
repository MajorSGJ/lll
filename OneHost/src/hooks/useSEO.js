import { useEffect } from 'react';

export function useSEO({ title, description, keywords, ogImage, ogUrl, robots }) {
  useEffect(() => {
    if (title) {
      document.title = title;
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', title);
      const twitterTitle = document.querySelector('meta[name="twitter:title"]');
      if (twitterTitle) twitterTitle.setAttribute('content', title);
    }

    if (description) {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', description);
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', description);
      const twitterDesc = document.querySelector('meta[name="twitter:description"]');
      if (twitterDesc) twitterDesc.setAttribute('content', description);
    }

    if (keywords) {
      const metaKeywords = document.querySelector('meta[name="keywords"]');
      if (metaKeywords) metaKeywords.setAttribute('content', keywords);
    }

    if (robots) {
      const metaRobots = document.querySelector('meta[name="robots"]');
      if (metaRobots) metaRobots.setAttribute('content', robots);
    }

    if (ogImage) {
      const metaOgImage = document.querySelector('meta[property="og:image"]');
      if (metaOgImage) metaOgImage.setAttribute('content', ogImage);
      const metaTwitterImage = document.querySelector('meta[name="twitter:image"]');
      if (metaTwitterImage) metaTwitterImage.setAttribute('content', ogImage);
    }

    if (ogUrl) {
      const metaOgUrl = document.querySelector('meta[property="og:url"]');
      if (metaOgUrl) metaOgUrl.setAttribute('content', ogUrl);
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) canonical.setAttribute('href', ogUrl);
    }
  }, [title, description, keywords, ogImage, ogUrl, robots]);
}
