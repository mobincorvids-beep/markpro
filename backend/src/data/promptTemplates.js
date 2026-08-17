/**
 * All 35 prompt templates from the original AIGen PHP source
 * text-prompt-collections.php → converted to JS
 *
 * Field placeholder syntax: __placeholder__ in prompt string
 * Field types: text | number | dropdown
 */

const PROMPT_TEMPLATES = {
  'ads-and-marketing-tools': {
    title: 'Ads and Marketing Tools',
    slug:  'ads-and-marketing-tools',
    icon:  'fas fa-ad',
    description: 'Generate content for Ads and Marketing Tools',
    templates: {
      'google-ads-titles': {
        title: 'Google Ads Titles',
        icon: 'fab fa-google',
        description: 'Generate Google Ads headlines for your product or service',
        prompt: 'Generate __number__ Google Ads Titles on topic __topic__',
        fields: [
          { key: '__number__', title: 'Number of Titles', type: 'number', default: '1' },
          { key: '__topic__',  title: 'Topic',            type: 'text'   },
        ],
      },
      'google-ad-description': {
        title: 'Google Ad Description',
        icon: 'fab fa-google',
        description: 'Generate a Google Ad description for your product',
        prompt: 'Generate __number__ Google Ad Descriptions on topic __topic__',
        fields: [
          { key: '__number__', title: 'Number of Descriptions', type: 'number', default: '1' },
          { key: '__topic__',  title: 'Topic',                  type: 'text'   },
        ],
      },
      'facebook-ads-headlines': {
        title: 'Facebook Ads Headlines',
        icon: 'fab fa-facebook',
        description: 'Generate Facebook ad headlines',
        prompt: 'Generate __number__ Facebook Ads Headlines on topic __topic__',
        fields: [
          { key: '__number__', title: 'Number of Headlines', type: 'number', default: '1' },
          { key: '__topic__',  title: 'Topic',               type: 'text'   },
        ],
      },
      'facebook-ads': {
        title: 'Facebook Ads',
        icon: 'fab fa-facebook',
        description: 'Generate full Facebook ad copy',
        prompt: 'Generate __number__ Facebook Ads on topic __topic__',
        fields: [
          { key: '__number__', title: 'Number of Ads', type: 'number', default: '1' },
          { key: '__topic__',  title: 'Topic',          type: 'text'   },
        ],
      },
      'linkedin-ad-headlines': {
        title: 'LinkedIn Ad Headlines',
        icon: 'fab fa-linkedin',
        description: 'Generate LinkedIn ad headlines',
        prompt: 'Generate __number__ LinkedIn Ad Headlines on topic __topic__',
        fields: [
          { key: '__number__', title: 'Number of Headlines', type: 'number', default: '1' },
          { key: '__topic__',  title: 'Topic',               type: 'text'   },
        ],
      },
      'linkedin-ad-description': {
        title: 'LinkedIn Ad Description',
        icon: 'fab fa-linkedin',
        description: 'Generate LinkedIn ad descriptions',
        prompt: 'Generate __number__ LinkedIn Ad Descriptions on topic __topic__',
        fields: [
          { key: '__number__', title: 'Number of Descriptions', type: 'number', default: '1' },
          { key: '__topic__',  title: 'Topic',                  type: 'text'   },
        ],
      },
      'short-tail-keywords': {
        title: 'Short Tail Keywords',
        icon: 'fas fa-key',
        description: 'Generate short tail keywords for your topic',
        prompt: 'Generate __number__ Short Tail Keywords on topic __topic__',
        fields: [
          { key: '__number__', title: 'Number of Keywords', type: 'number', default: '5' },
          { key: '__topic__',  title: 'Topic',              type: 'text'   },
        ],
      },
      'long-tail-keywords': {
        title: 'Long Tail Keywords',
        icon: 'fas fa-key',
        description: 'Generate long tail keywords for your topic',
        prompt: 'Generate __number__ Long Tail Keywords on topic __topic__',
        fields: [
          { key: '__number__', title: 'Number of Keywords', type: 'number', default: '5' },
          { key: '__topic__',  title: 'Topic',              type: 'text'   },
        ],
      },
      'keywordextractor': {
        title: 'Keyword Extractor',
        icon: 'fas fa-search',
        description: 'Extract keywords from a given text',
        prompt: 'Extract keywords from below text.\n Text: __text__',
        fields: [
          { key: '__text__', title: 'Text', type: 'text' },
        ],
      },
      'seo-meta-titles': {
        title: 'SEO Meta Titles',
        icon: 'fas fa-heading',
        description: 'Generate SEO-optimized meta titles',
        prompt: 'Generate __number__ SEO Meta Titles for __topic__',
        fields: [
          { key: '__number__', title: 'Number of Titles', type: 'number', default: '3' },
          { key: '__topic__',  title: 'Topic / Page',     type: 'text'   },
        ],
      },
      'seo-meta-description': {
        title: 'SEO Meta Description',
        icon: 'fas fa-align-left',
        description: 'Generate SEO meta descriptions',
        prompt: 'Generate __number__ SEO Meta Descriptions for __topic__',
        fields: [
          { key: '__number__', title: 'Number of Descriptions', type: 'number', default: '3' },
          { key: '__topic__',  title: 'Topic / Page',           type: 'text'   },
        ],
      },
    },
  },

  'bussiness': {
    title: 'Business',
    slug:  'bussiness',
    icon:  'fas fa-briefcase',
    description: 'Generate content for Business',
    templates: {
      'article-outlines': {
        title: 'Article Outlines',
        icon: 'fas fa-list',
        description: 'Generate article outlines for any topic',
        prompt: 'Generate article outline for topic: __topic__',
        fields: [
          { key: '__topic__', title: 'Topic', type: 'text' },
        ],
      },
      'articlegenerator': {
        title: 'Article Generator',
        icon: 'fas fa-newspaper',
        description: 'Generate a full article on any topic',
        prompt: 'Write a complete article on: __topic__',
        fields: [
          { key: '__topic__', title: 'Topic', type: 'text' },
        ],
      },
      'blog-ideas': {
        title: 'Blog Ideas',
        icon: 'fas fa-lightbulb',
        description: 'Generate blog post ideas for your niche',
        prompt: 'Generate __number__ blog post ideas for topic: __topic__',
        fields: [
          { key: '__number__', title: 'Number of Ideas', type: 'number', default: '5' },
          { key: '__topic__',  title: 'Topic / Niche',   type: 'text'   },
        ],
      },
      'blog-intros': {
        title: 'Blog Intros',
        icon: 'fas fa-paragraph',
        description: 'Generate compelling blog introductions',
        prompt: 'Write an engaging blog introduction for topic: __topic__',
        fields: [
          { key: '__topic__', title: 'Blog Topic', type: 'text' },
        ],
      },
      'email-subject-lines': {
        title: 'Email Subject Lines',
        icon: 'fas fa-envelope',
        description: 'Generate catchy email subject lines',
        prompt: 'Generate __number__ email subject lines for: __topic__',
        fields: [
          { key: '__number__', title: 'Number of Subject Lines', type: 'number', default: '5' },
          { key: '__topic__',  title: 'Topic / Campaign',        type: 'text'   },
        ],
      },
      'answer': {
        title: 'Answer',
        icon: 'fas fa-question-circle',
        description: 'Get an answer to any question',
        prompt: 'Answer the following question in detail: __question__',
        fields: [
          { key: '__question__', title: 'Question', type: 'text' },
        ],
      },
      'definitions': {
        title: 'Definitions',
        icon: 'fas fa-book',
        description: 'Get clear definitions for any term',
        prompt: 'Provide a clear and comprehensive definition for: __term__',
        fields: [
          { key: '__term__', title: 'Term / Word / Concept', type: 'text' },
        ],
      },
    },
  },

  'email': {
    title: 'Emails',
    slug:  'email',
    icon:  'far fa-envelope',
    description: 'Generate content for Emails',
    templates: {
      'testimonials': {
        title: 'Testimonials',
        icon: 'fas fa-star',
        description: 'Generate customer testimonials for your product or service',
        prompt: 'Write __number__ customer testimonials for: __product__',
        fields: [
          { key: '__number__',  title: 'Number of Testimonials', type: 'number', default: '3' },
          { key: '__product__', title: 'Product / Service',       type: 'text'   },
        ],
      },
      'reviews': {
        title: 'Reviews',
        icon: 'fas fa-star-half-alt',
        description: 'Generate product or service reviews',
        prompt: 'Write __number__ reviews for: __product__',
        fields: [
          { key: '__number__',  title: 'Number of Reviews', type: 'number', default: '3' },
          { key: '__product__', title: 'Product / Service',  type: 'text'   },
        ],
      },
      'cold-email': {
        title: 'Cold Email',
        icon: 'fas fa-paper-plane',
        description: 'Write a cold outreach email',
        prompt: 'Write a professional cold email for: __purpose__. Target audience: __audience__',
        fields: [
          { key: '__purpose__',  title: 'Purpose / Offer', type: 'text' },
          { key: '__audience__', title: 'Target Audience', type: 'text' },
        ],
      },
    },
  },

  'other-content': {
    title: 'Other Content',
    slug:  'other-content',
    icon:  'fas fa-box-open',
    description: 'Generate other content',
    templates: {
      'song-lyrics': {
        title: 'Song Lyrics',
        icon: 'fas fa-music',
        description: 'Generate song lyrics on any topic',
        prompt: 'Write song lyrics about: __topic__. Genre: __genre__',
        fields: [
          { key: '__topic__', title: 'Topic / Theme', type: 'text' },
          { key: '__genre__', title: 'Music Genre',   type: 'text', default: 'Pop' },
        ],
      },
      'poem': {
        title: 'Poem',
        icon: 'fas fa-feather-alt',
        description: 'Generate a poem on any topic',
        prompt: 'Write a poem about: __topic__',
        fields: [
          { key: '__topic__', title: 'Topic / Theme', type: 'text' },
        ],
      },
      'faqs': {
        title: 'FAQs',
        icon: 'fas fa-question',
        description: 'Generate FAQs for your topic',
        prompt: 'Generate __number__ frequently asked questions (FAQs) about: __topic__',
        fields: [
          { key: '__number__', title: 'Number of FAQs', type: 'number', default: '5' },
          { key: '__topic__',  title: 'Topic',           type: 'text'   },
        ],
      },
      'faq-answers': {
        title: 'FAQ Answers',
        icon: 'fas fa-comments',
        description: 'Generate answers for frequently asked questions',
        prompt: 'Provide detailed answers to the following FAQ: __question__',
        fields: [
          { key: '__question__', title: 'FAQ Question', type: 'text' },
        ],
      },
      'ask-any-question': {
        title: 'Ask Any Question',
        icon: 'fas fa-comment-dots',
        description: 'Get answers to any question',
        prompt: '__question__',
        fields: [
          { key: '__question__', title: 'Your Question', type: 'text' },
        ],
      },
      'pros-and-cons': {
        title: 'Pros and Cons',
        icon: 'fas fa-balance-scale',
        description: 'Generate pros and cons for any topic',
        prompt: 'List the pros and cons of: __topic__',
        fields: [
          { key: '__topic__', title: 'Topic', type: 'text' },
        ],
      },
      'paragraph': {
        title: 'Paragraph',
        icon: 'fas fa-paragraph',
        description: 'Generate a paragraph on any topic',
        prompt: 'Write a well-structured paragraph about: __topic__',
        fields: [
          { key: '__topic__', title: 'Topic', type: 'text' },
        ],
      },
      'explain-it-to-child': {
        title: 'Explain It To a Child',
        icon: 'fas fa-child',
        description: 'Explain a complex topic in simple terms',
        prompt: 'Explain the following in simple terms a child can understand: __topic__',
        fields: [
          { key: '__topic__', title: 'Topic / Concept', type: 'text' },
        ],
      },
      'summarize': {
        title: 'Summarize',
        icon: 'fas fa-compress-alt',
        description: 'Summarize any text',
        prompt: 'Summarize the following text:\n\n__text__',
        fields: [
          { key: '__text__', title: 'Text to Summarize', type: 'text' },
        ],
      },
      'essay': {
        title: 'Essay',
        icon: 'fas fa-file-alt',
        description: 'Generate a complete essay on any topic',
        prompt: 'Write a complete essay on: __topic__',
        fields: [
          { key: '__topic__', title: 'Essay Topic', type: 'text' },
        ],
      },
      'cover-letter': {
        title: 'Cover Letter',
        icon: 'fas fa-file-signature',
        description: 'Generate a professional cover letter',
        prompt: 'Write a professional cover letter for a __position__ position at __company__. Skills: __skills__',
        fields: [
          { key: '__position__', title: 'Job Position',    type: 'text' },
          { key: '__company__',  title: 'Company Name',    type: 'text' },
          { key: '__skills__',   title: 'Key Skills',      type: 'text' },
        ],
      },
    },
  },

  'social-media': {
    title: 'Social Media',
    slug:  'social-media',
    icon:  'fas fa-users',
    description: 'Generate content for Social Media',
    templates: {
      'social-media-post-personal': {
        title: 'Social Media Post (Personal)',
        icon: 'fas fa-user',
        description: 'Generate a personal social media post',
        prompt: 'Write a personal social media post about: __topic__',
        fields: [
          { key: '__topic__', title: 'Topic', type: 'text' },
        ],
      },
      'social-media-post-business': {
        title: 'Social Media Post (Business)',
        icon: 'fas fa-building',
        description: 'Generate a business social media post',
        prompt: 'Write a professional business social media post for: __topic__. Tone: __tone__',
        fields: [
          { key: '__topic__', title: 'Topic / Product', type: 'text' },
          { key: '__tone__',  title: 'Tone',             type: 'dropdown', options: ['Professional', 'Friendly', 'Exciting', 'Informative'] },
        ],
      },
      'instagram-captions': {
        title: 'Instagram Captions',
        icon: 'fab fa-instagram',
        description: 'Generate engaging Instagram captions',
        prompt: 'Write __number__ Instagram captions for: __topic__',
        fields: [
          { key: '__number__', title: 'Number of Captions', type: 'number', default: '3' },
          { key: '__topic__',  title: 'Topic / Photo',       type: 'text'   },
        ],
      },
      'instagram-hashtags': {
        title: 'Instagram Hashtags',
        icon: 'fab fa-instagram',
        description: 'Generate relevant Instagram hashtags',
        prompt: 'Generate __number__ relevant Instagram hashtags for: __topic__',
        fields: [
          { key: '__number__', title: 'Number of Hashtags', type: 'number', default: '15' },
          { key: '__topic__',  title: 'Topic / Niche',       type: 'text'   },
        ],
      },
      'twitter-tweets': {
        title: 'Twitter / X Tweets',
        icon: 'fab fa-twitter',
        description: 'Generate engaging tweets',
        prompt: 'Write __number__ engaging tweets about: __topic__',
        fields: [
          { key: '__number__', title: 'Number of Tweets', type: 'number', default: '3' },
          { key: '__topic__',  title: 'Topic',             type: 'text'   },
        ],
      },
      'youtube-titles': {
        title: 'YouTube Titles',
        icon: 'fab fa-youtube',
        description: 'Generate compelling YouTube video titles',
        prompt: 'Generate __number__ YouTube video titles for: __topic__',
        fields: [
          { key: '__number__', title: 'Number of Titles', type: 'number', default: '5' },
          { key: '__topic__',  title: 'Topic',             type: 'text'   },
        ],
      },
      'youtube-descriptions': {
        title: 'YouTube Descriptions',
        icon: 'fab fa-youtube',
        description: 'Generate YouTube video descriptions',
        prompt: 'Write a YouTube video description for a video about: __topic__',
        fields: [
          { key: '__topic__', title: 'Video Topic', type: 'text' },
        ],
      },
      'youtube-outlines': {
        title: 'YouTube Video Outlines',
        icon: 'fab fa-youtube',
        description: 'Generate YouTube video script outlines',
        prompt: 'Create a detailed YouTube video script outline for: __topic__',
        fields: [
          { key: '__topic__', title: 'Video Topic', type: 'text' },
        ],
      },
      'youtube-tags-generator': {
        title: 'YouTube Tags Generator',
        icon: 'fab fa-youtube',
        description: 'Generate YouTube video tags',
        prompt: 'Generate __number__ YouTube tags for a video about: __topic__',
        fields: [
          { key: '__number__', title: 'Number of Tags', type: 'number', default: '20' },
          { key: '__topic__',  title: 'Video Topic',    type: 'text'   },
        ],
      },
      'linkedin-post-generator': {
        title: 'LinkedIn Post Generator',
        icon: 'fab fa-linkedin',
        description: 'Generate professional LinkedIn posts',
        prompt: 'Write a professional LinkedIn post about: __topic__',
        fields: [
          { key: '__topic__', title: 'Topic / Achievement', type: 'text' },
        ],
      },
    },
  },
};

// Flat list of all templates with category info
const TEMPLATE_LIST = [];
for (const [catKey, cat] of Object.entries(PROMPT_TEMPLATES)) {
  for (const [tplKey, tpl] of Object.entries(cat.templates)) {
    TEMPLATE_LIST.push({
      ...tpl,
      key: tplKey,
      categoryKey: catKey,
      categoryTitle: cat.title,
    });
  }
}

module.exports = { PROMPT_TEMPLATES, TEMPLATE_LIST };
