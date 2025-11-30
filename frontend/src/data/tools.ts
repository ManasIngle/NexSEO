import {
  FileText, Link, ArrowRight, FileSearch, Target, LayoutDashboard,
  ShieldCheck, Accessibility, Zap, Code, AlertTriangle, Clock,
  Search, Image as ImageIcon, BookOpen, Share2, Type, Globe, Hash, Layout,
  Sparkles, Activity, ExternalLink
} from 'lucide-react';

export interface ToolDefinition {
  id: string;
  title: string;
  description: string;
  icon: any;
  endpoint: string;
  category: 'on-page' | 'technical' | 'links' | 'performance';
}

export const tools: ToolDefinition[] = [
  {
    id: 'link-graph',
    title: 'Internal Link Graph',
    description: 'Visualize your internal linking structure as a force-directed network graph.',
    icon: Link,
    endpoint: 'link-graph',
    category: 'links'
  },
  {
    id: 'core-web-vitals',
    title: 'Core Web Vitals Checker',
    description: 'Evaluate loading performance, interactivity, and visual stability (LCP, FID, CLS proxies).',
    icon: Zap,
    endpoint: 'web-vitals',
    category: 'performance'
  },
  {
    id: 'duplicate-checker',
    title: 'Duplicate Content Checker',
    description: 'Identify near-duplicate content across your pages that could trigger search engine penalties.',
    icon: FileSearch,
    endpoint: 'duplicates',
    category: 'technical'
  },
  {
    id: 'schema-validator',
    title: 'Schema Markup Validator',
    description: 'Extract and validate JSON-LD structured data to ensure eligibility for rich snippets in Google.',
    icon: Code,
    endpoint: 'structured-data',
    category: 'technical'
  },
  {
    id: 'seo-score',
    title: 'SEO Score Calculator',
    description: 'Get a comprehensive grade (A-F) based on technical and on-page SEO factors for any URL.',
    icon: Target,
    endpoint: 'scores',
    category: 'on-page'
  },
  {
    id: 'wcag-checker',
    title: 'Accessibility (WCAG) Checker',
    description: 'Audit your pages for color contrast, ARIA labels, missing alt text, and semantic HTML structure.',
    icon: Accessibility,
    endpoint: 'wcag',
    category: 'technical'
  },
  {
    id: 'link-flow',
    title: 'Internal Link Equity Flow',
    description: 'See which pages have the most incoming internal links (PageRank proxy).',
    icon: LayoutDashboard,
    endpoint: 'link-flow',
    category: 'links'
  },
  {
    id: 'performance-analyzer',
    title: 'Page Speed Analyzer',
    description: 'Analyze server response times, total content sizes, and HTML structure bloat.',
    icon: Zap,
    endpoint: 'raw',
    category: 'performance'
  },
  {
    id: 'cannibalization-checker',
    title: 'Keyword Cannibalization Checker',
    description: 'Check if multiple pages are competing for the exact same primary topics or H1 headings.',
    icon: Search,
    endpoint: 'cannibalization',
    category: 'on-page'
  },
  {
    id: 'redirect-chains',
    title: 'Redirect Chain Finder',
    description: 'Discover long redirect chains and loops that slow down your site and dilute link equity.',
    icon: ArrowRight,
    endpoint: 'redirect-chains',
    category: 'technical'
  },
  {
    id: 'hreflang-validator',
    title: 'Hreflang Validator',
    description: 'Extract and analyze multi-language hreflang tags for international SEO targeting.',
    icon: Globe,
    endpoint: 'hreflang',
    category: 'technical'
  },
  {
    id: 'mixed-content',
    title: 'Mixed Content Checker',
    description: 'Identify insecure HTTP resources loading on HTTPS pages to maintain green padlock security.',
    icon: ShieldCheck,
    endpoint: 'mixed-content',
    category: 'technical'
  },
  {
    id: 'semantic-html',
    title: 'Semantic HTML5 Auditor',
    description: 'Verify if your pages use modern semantic tags like <main>, <nav>, <article>, and <aside>.',
    icon: Layout,
    endpoint: 'semantic-html',
    category: 'technical'
  },
  {
    id: 'social-tags-preview',
    title: 'Social Meta Tags Previewer',
    description: 'Extract OpenGraph and Twitter Card tags to ensure your links look perfect when shared.',
    icon: Share2,
    endpoint: 'social-tags',
    category: 'on-page'
  },
  {
    id: 'heading-hierarchy',
    title: 'Heading Hierarchy Auditor',
    description: 'Detect skipped heading levels, missing H1s, or multiple H1 tags that ruin accessibility.',
    icon: Type,
    endpoint: 'heading-hierarchy',
    category: 'technical'
  },
  {
    id: 'readability-grader',
    title: 'Readability & NLP Grader',
    description: 'Calculate content length and estimate reading difficulty based on word counts.',
    icon: BookOpen,
    endpoint: 'readability',
    category: 'on-page'
  },
  {
    id: 'keyword-analyzer',
    title: 'Keyword Density Analyzer',
    description: 'Extract and analyze the most frequently used keywords and phrases across your page.',
    icon: FileText,
    endpoint: 'keywords',
    category: 'on-page'
  },
  {
    id: 'orphan-pages',
    title: 'Orphan Page Finder',
    description: 'Find pages with no internal links pointing to them. Orphan pages are rarely indexed or ranked.',
    icon: FileSearch,
    endpoint: 'orphans',
    category: 'technical'
  },
  {
    id: 'broken-links',
    title: 'Broken Link Checker',
    description: 'Find 404s and broken outbound/inbound links instantly to improve user experience and crawlability.',
    icon: AlertTriangle,
    endpoint: 'broken-links',
    category: 'links'
  },
  {
    id: 'canonical-audit',
    title: 'Canonical Misconfiguration Checker',
    description: 'Identify missing, cross-referencing, or self-referencing canonical tags instantly.',
    icon: Target,
    endpoint: 'canonical-audit',
    category: 'technical'
  },
  {
    id: 'image-seo',
    title: 'Image Optimization Auditor',
    description: 'Extract all images to check for missing alt text, incorrect formatting, and source paths.',
    icon: ImageIcon,
    endpoint: 'image-seo',
    category: 'on-page'
  },
  {
    id: 'content-freshness',
    title: 'Content Freshness Analyzer',
    description: 'Check published dates, modified dates, and HTTP headers to see if your content is considered fresh.',
    icon: Clock,
    endpoint: 'freshness',
    category: 'on-page'
  },
  {
    id: 'meta-analyzer',
    title: 'Meta Tag Analyzer',
    description: 'Analyze page titles and meta descriptions for SEO best practices, length limits, and missing tags.',
    icon: FileText,
    endpoint: 'summary',
    category: 'on-page'
  },
  {
    id: 'url-structure',
    title: 'URL Structure Analyzer',
    description: 'Flag URLs that are too long, contain uppercase letters, underscores, or messy parameters.',
    icon: Hash,
    endpoint: 'url-structure',
    category: 'technical'
  },
  {
    id: 'outbound-link-analyzer',
    title: 'Outbound Link Analyzer',
    description: 'Extract every single link leaving your website to find spammy outbound links or 404s.',
    icon: ExternalLink,
    endpoint: 'raw',
    category: 'links'
  },
  {
    id: 'http-status-checker',
    title: 'Bulk HTTP Status Checker',
    description: 'Instantly map 200s, 404s, and 500s across your pages to find dead ends and server errors.',
    icon: Activity,
    endpoint: 'raw',
    category: 'technical'
  }
];
