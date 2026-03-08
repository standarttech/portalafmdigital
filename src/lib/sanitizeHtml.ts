/**
 * Simple HTML sanitizer for landing page custom_html sections.
 * Strips scripts, event handlers, and dangerous elements.
 * For production, consider a full library like DOMPurify.
 */

const DANGEROUS_TAGS = /(<script[\s>][\s\S]*?<\/script>|<iframe[\s>][\s\S]*?<\/iframe>|<object[\s>][\s\S]*?<\/object>|<embed[\s>][\s\S]*?<\/embed>|<applet[\s>][\s\S]*?<\/applet>|<form[\s>][\s\S]*?<\/form>|<link[\s>][\s\S]*?>|<meta[\s>][\s\S]*?>|<base[\s>][\s\S]*?>)/gi;

const EVENT_HANDLERS = /\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

const JAVASCRIPT_URLS = /(?:href|src|action)\s*=\s*["']javascript:/gi;

const DATA_URLS = /(?:href|src)\s*=\s*["']data:(?!image\/)/gi;

const STYLE_EXPRESSIONS = /expression\s*\(|url\s*\(\s*["']?javascript:/gi;

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  
  let sanitized = html;
  
  // Remove dangerous tags and their content
  sanitized = sanitized.replace(DANGEROUS_TAGS, '<!-- removed -->');
  
  // Remove event handlers (onclick, onload, onerror, etc.)
  sanitized = sanitized.replace(EVENT_HANDLERS, '');
  
  // Remove javascript: URLs
  sanitized = sanitized.replace(JAVASCRIPT_URLS, 'href="#"');
  
  // Remove non-image data: URLs
  sanitized = sanitized.replace(DATA_URLS, 'href="#"');
  
  // Remove CSS expressions
  sanitized = sanitized.replace(STYLE_EXPRESSIONS, '/* removed */');
  
  return sanitized;
}
