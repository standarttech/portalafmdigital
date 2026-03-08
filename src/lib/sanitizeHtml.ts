/**
 * HTML sanitizer for landing page custom_html sections.
 * Uses DOMPurify for production-grade sanitization.
 * Allows a limited subset of HTML tags safe for content display.
 */
import DOMPurify from 'dompurify';

// Allowed tags — restricted subset for landing page content
const ALLOWED_TAGS = [
  'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a', 'img', 'br', 'hr', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'u',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'blockquote', 'pre', 'code', 'section', 'article', 'header', 'footer', 'nav',
  'figure', 'figcaption', 'details', 'summary', 'mark', 'small', 'sub', 'sup',
  'video', 'source', 'picture',
];

const ALLOWED_ATTR = [
  'href', 'src', 'alt', 'title', 'class', 'id', 'style',
  'target', 'rel', 'width', 'height', 'loading', 'decoding',
  'type', 'controls', 'autoplay', 'muted', 'loop', 'poster',
  'srcset', 'sizes', 'media',
  'colspan', 'rowspan',
  'open', // for <details>
];

/**
 * Supported HTML tags for custom_html sections.
 * Use this to display allowed tags in the builder UI.
 */
export const CUSTOM_HTML_ALLOWED_TAGS = ALLOWED_TAGS;

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'applet', 'form', 'input', 'button', 'select', 'textarea', 'link', 'meta', 'base', 'style'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  });
}
