/**
 * LeetCode Documentation Generator - Content Script
 * Handles extraction of submission data from LeetCode pages
 */

console.log('LeetCode Doc Generator content script loaded');

/**
 * Detects if the current page is a LeetCode submission page
 * Pattern: /problems/{problem-slug}/submissions/{submission-id}/
 * Note: Only extracts from the full URL format, not from /submissions/detail/
 * @returns {boolean} True if on a valid submission page
 */
function detectLeetCodeSubmissionPage() {
  const pattern = /\/problems\/[^\/]+\/submissions\/\d+/;
  return pattern.test(window.location.pathname);
}

/**
 * Extracts the submission ID from the current URL
 * Examples: 
 * - /problems/minimum-bit-flips/submissions/1886581454/ -> "1886581454"
 * - /submissions/detail/1886581454/ -> "1886581454"
 * @returns {string|null} Submission ID or null if not found
 */
function extractSubmissionId() {
  const match = window.location.pathname.match(/\/submissions\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Validates if the extracted code looks legitimate
 * @param {string} code - The code to validate
 * @returns {boolean} True if code appears valid
 */
function isValidCode(code) {
  if (!code || typeof code !== 'string') return false;
  
  // Check if code is too short (likely corrupted)
  if (code.trim().length < 10) return false;
  
  // Check for common code patterns (at least one of these should be present in real code)
  const codePatterns = [
    /function/i,
    /class/i,
    /def /i,
    /public/i,
    /private/i,
    /return/i,
    /if\s*\(/,
    /for\s*\(/,
    /while\s*\(/,
    /\{[\s\S]*\}/,  // curly braces with content
    /\[[\s\S]*\]/,  // square brackets
    /import/i,
    /include/i,
    /#include/,
    /package/i,
    /var /,
    /let /,
    /const /,
    /=>/,  // arrow function
    /\(\s*\)/,  // empty parentheses (function calls)
  ];
  
  // If code contains at least one code pattern, it's likely valid
  const hasCodePattern = codePatterns.some(pattern => pattern.test(code));
  
  // Check if it looks like ASCII art or garbage (lots of special characters, no letters)
  const letterCount = (code.match(/[a-zA-Z]/g) || []).length;
  const totalLength = code.length;
  const letterRatio = letterCount / totalLength;
  
  // Real code should have at least 20% letters
  if (letterRatio < 0.2) return false;
  
  return hasCodePattern;
}

/**
 * Validates if the language string looks legitimate
 * @param {string} language - The language to validate
 * @returns {boolean} True if language appears valid
 */
function isValidLanguage(language) {
  if (!language || typeof language !== 'string') return false;
  
  // Language should be short (< 30 chars) and contain mostly letters
  if (language.length > 30) return false;
  
  // Should not contain newlines or special characters
  if (/[\n\r\t]/.test(language)) return false;
  
  // Should contain mostly letters
  const letterCount = (language.match(/[a-zA-Z]/g) || []).length;
  return letterCount > language.length * 0.5;
}

/**
 * Removes the LeetCode problem number prefix from a problem title
 * Example: "1. Two Sum" -> "Two Sum"
 * Example: "2. Add Two Numbers" -> "Add Two Numbers"
 * @param {string} title - The problem title with potential number prefix
 * @returns {string} The cleaned title without the number prefix
 */
function removeProblemNumberPrefix(title) {
  if (!title) return title;
  
  // Match pattern: optional whitespace, digits, period, space, then the rest
  // Examples: "1. Two Sum", "  123. Problem Name  "
  const match = title.match(/^\s*\d+\.\s*(.+)$/);
  
  if (match) {
    return match[1].trim();
  }
  
  return title.trim();
}

/**
 * Maps LeetCode language codes to readable names
 * @param {string} langCode - Language code from API (e.g., "cpp", "python3")
 * @returns {string} Readable language name (e.g., "C++", "Python3")
 */
function mapLanguageCode(langCode) {
  const mapping = {
    'cpp': 'C++',
    'python': 'Python',
    'python3': 'Python3',
    'java': 'Java',
    'javascript': 'JavaScript',
    'typescript': 'TypeScript',
    'c': 'C',
    'csharp': 'C#',
    'go': 'Go',
    'rust': 'Rust',
    'kotlin': 'Kotlin',
    'swift': 'Swift',
    'ruby': 'Ruby',
    'scala': 'Scala',
    'php': 'PHP',
    'mysql': 'MySQL',
    'mssql': 'MS SQL Server',
    'oraclesql': 'Oracle SQL'
  };
  return mapping[langCode] || langCode;
}

/**
 * Fetches submission details from LeetCode GraphQL API
 * @param {string} submissionId - The submission ID to fetch
 * @returns {Promise<Object>} Submission data {code, lang, question: {title, titleSlug}}
 * @throws {Error} If API call fails with descriptive error message
 */
async function fetchSubmissionFromAPI(submissionId) {
  const query = `
    query submissionDetails($submissionId: Int!) {
      submissionDetails(submissionId: $submissionId) {
        code
        lang
        question {
          title
          titleSlug
        }
      }
    }
  `;
  
  try {
    const response = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        variables: { submissionId: parseInt(submissionId) }
      }),
      credentials: 'include' // Include cookies for authentication
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication failed. Please make sure you are logged into LeetCode.');
      } else if (response.status === 404) {
        throw new Error('Submission not found. Please check the submission URL.');
      } else if (response.status === 429) {
        throw new Error('Too many requests. Please wait a moment and try again.');
      } else if (response.status >= 500) {
        throw new Error('LeetCode server error. Please try again later.');
      } else {
        throw new Error(`API request failed with status ${response.status}`);
      }
    }
    
    const data = await response.json();
    
    if (data.errors) {
      const errorMessages = data.errors.map(e => e.message).join(', ');
      throw new Error(`LeetCode API error: ${errorMessages}`);
    }
    
    if (!data.data || !data.data.submissionDetails) {
      throw new Error('No submission details found. The submission may not exist or you may not have access to it.');
    }
    
    const submission = data.data.submissionDetails;
    
    // Validate that we got all required fields
    if (!submission.code) {
      throw new Error('Submission code is empty or unavailable.');
    }
    
    if (!submission.question || !submission.question.title) {
      throw new Error('Problem title is unavailable.');
    }
    
    if (!submission.lang) {
      throw new Error('Programming language information is unavailable.');
    }
    
    return submission;
  } catch (error) {
    // If it's already our custom error, rethrow it
    if (error.message.includes('Authentication') || 
        error.message.includes('not found') || 
        error.message.includes('Too many') ||
        error.message.includes('server error') ||
        error.message.includes('API error') ||
        error.message.includes('empty') ||
        error.message.includes('unavailable')) {
      throw error;
    }
    
    // Network or other errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error. Please check your internet connection.');
    }
    
    console.error('API fetch error:', error);
    throw new Error(`Failed to fetch submission data: ${error.message}`);
  }
}

/**
 * Fallback method: Extract submission data from DOM
 * Used when API call fails or returns corrupted data
 * @returns {Promise<Object>} Extracted data {name, code, language}
 * @throws {Error} If DOM extraction fails with descriptive error message
 */
async function extractFromDOM() {
  try {
    // Wait a bit for page to fully load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Starting DOM extraction...');
    
    // Try multiple selectors for problem name
    let problemName = null;
    const nameSelectors = [
      'a[href*="/problems/"]',
      '.text-title-large',
      'h1',
      '[data-cy="question-title"]',
      '.question-title'
    ];
    
    for (const selector of nameSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        problemName = element.textContent.trim();
        console.log(`Found problem name with selector "${selector}":`, problemName);
        break;
      }
    }
    
    if (!problemName) {
      throw new Error('Could not find problem name on this page. Please make sure you are on a submission detail page.');
    }
    
    // Try to find code block - LeetCode uses Monaco editor or CodeMirror
    let code = null;
    const codeSelectors = [
      '.view-lines',  // Monaco editor
      '.monaco-editor .view-lines',
      'pre code',
      '[class*="code-container"]',
      '[class*="CodeMirror"]',
      'pre',
      '[data-mode-id]'
    ];
    
    for (const selector of codeSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        code = element.textContent.trim();
        console.log(`Found code with selector "${selector}", length:`, code.length);
        
        // Validate the extracted code
        if (isValidCode(code)) {
          console.log('Code validation passed');
          break;
        } else {
          console.log('Code validation failed, trying next selector');
          code = null;
        }
      }
    }
    
    if (!code) {
      throw new Error('Could not extract valid code from this page. Please make sure the submission has loaded completely.');
    }
    
    // Try to find language - look for language indicators
    let language = 'Unknown';
    const langSelectors = [
      '[class*="lang"]',
      '[data-language]',
      'select[name*="lang"]',
      '[class*="language"]',
      '.language-label'
    ];
    
    for (const selector of langSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const langText = element.textContent || element.getAttribute('data-language') || element.value;
        if (langText && isValidLanguage(langText)) {
          language = langText.trim();
          console.log(`Found language with selector "${selector}":`, language);
          break;
        }
      }
    }
    
    // If we couldn't find language, try to detect from code
    if (language === 'Unknown') {
      language = detectLanguageFromCode(code);
      console.log('Detected language from code:', language);
    }
    
    return {
      name: problemName,
      code: code,
      language: language
    };
  } catch (error) {
    console.error('DOM extraction error:', error);
    
    // Provide more helpful error messages
    if (error.message.includes('problem name')) {
      throw error; // Already has a good message
    } else if (error.message.includes('code')) {
      throw error; // Already has a good message
    } else {
      throw new Error(`Failed to extract data from page: ${error.message}`);
    }
  }
}

/**
 * Attempts to detect programming language from code content
 * @param {string} code - The code to analyze
 * @returns {string} Detected language or 'Unknown'
 */
function detectLanguageFromCode(code) {
  if (!code) return 'Unknown';
  
  // Simple heuristics to detect language
  if (/^#include|using namespace std|cout|cin/.test(code)) return 'C++';
  if (/^def |^class.*:|^import /.test(code)) return 'Python';
  if (/^public class|^import java\./.test(code)) return 'Java';
  if (/^function |^const |^let |^var |=>/.test(code)) return 'JavaScript';
  if (/^fn |^impl |^use /.test(code)) return 'Rust';
  if (/^func |^package main/.test(code)) return 'Go';
  if (/^using System|^namespace /.test(code)) return 'C#';
  
  return 'Unknown';
}

/**
 * Main extraction function that tries API first, then falls back to DOM scraping
 * @returns {Promise<Object>} Problem data {name, code, language, submissionLink}
 * @throws {Error} If both extraction methods fail with descriptive error message
 */
async function extractProblemData() {
  const submissionId = extractSubmissionId();
  
  if (!submissionId) {
    throw new Error('Could not extract submission ID from URL. Please make sure you are on a submission detail page.');
  }
  
  // Try API first
  try {
    console.log('Attempting to fetch from API...');
    const apiData = await fetchSubmissionFromAPI(submissionId);
    
    // Format submission link as: /submissions/detail/{id}/
    const formattedSubmissionLink = `/submissions/detail/${submissionId}/`;
    
    console.log('Extracted code length:', apiData.code?.length);
    console.log('Code preview:', apiData.code?.substring(0, 100));
    console.log('Language:', apiData.lang);
    
    // Validate the extracted data
    const codeIsValid = isValidCode(apiData.code);
    const languageIsValid = isValidLanguage(apiData.lang);
    
    console.log('Code validation:', codeIsValid);
    console.log('Language validation:', languageIsValid);
    
    // If API data is corrupted, throw error to trigger fallback
    if (!codeIsValid || !languageIsValid) {
      console.warn('API returned corrupted data, will try DOM scraping');
      throw new Error('API returned corrupted data (code or language appears invalid)');
    }
    
    return {
      name: removeProblemNumberPrefix(apiData.question.title),
      code: apiData.code,
      language: mapLanguageCode(apiData.lang),
      submissionLink: formattedSubmissionLink
    };
  } catch (apiError) {
    console.warn('API extraction failed, falling back to DOM scraping:', apiError.message);
    
    // Fallback to DOM scraping
    try {
      const domData = await extractFromDOM();
      
      // Format submission link as: /submissions/detail/{id}/
      const formattedSubmissionLink = `/submissions/detail/${submissionId}/`;
      
      return {
        name: removeProblemNumberPrefix(domData.name),
        code: domData.code,
        language: domData.language,
        submissionLink: formattedSubmissionLink
      };
    } catch (domError) {
      console.error('Both API and DOM extraction failed');
      
      // Provide a comprehensive error message
      const errorMessage = `Failed to capture problem data.\n\nAPI Error: ${apiError.message}\n\nDOM Error: ${domError.message}\n\nPlease try refreshing the page or add the problem manually.`;
      throw new Error(errorMessage);
    }
  }
}

/**
 * Sends extracted problem data to the extension
 * @param {Object} data - Problem data to send
 */
function sendToExtension(data) {
  chrome.runtime.sendMessage({
    type: 'PROBLEM_DATA_EXTRACTED',
    data: data
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error sending message:', chrome.runtime.lastError);
    } else {
      console.log('Data sent to extension:', response);
    }
  });
}

// Always set up message listener, regardless of page type
// This ensures the popup can always communicate with the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  // Handle ping to verify content script is loaded
  if (message.type === 'PING') {
    console.log('Responding to PING');
    sendResponse({ success: true, message: 'Content script is ready' });
    return true;
  }
  
  if (message.type === 'EXTRACT_PROBLEM_DATA') {
    console.log('Received EXTRACT_PROBLEM_DATA message');
    
    // Check if we're on a submission page
    if (!detectLeetCodeSubmissionPage()) {
      console.error('Not on a LeetCode submission page');
      sendResponse({ 
        success: false, 
        error: 'Not on a LeetCode submission page. Please navigate to a submission page (URL pattern: /problems/*/submissions/*)' 
      });
      return true;
    }
    
    // Check if we can extract submission ID
    const submissionId = extractSubmissionId();
    if (!submissionId) {
      console.error('Failed to extract submission ID from URL');
      sendResponse({ 
        success: false, 
        error: 'Could not extract submission ID from URL. Make sure you are on a submission detail page.' 
      });
      return true;
    }
    
    console.log('Extracting problem data for submission ID:', submissionId);
    
    // Extract problem data
    extractProblemData()
      .then(data => {
        console.log('Successfully extracted problem data:', data);
        sendResponse({ success: true, data: data });
      })
      .catch(error => {
        console.error('Error extracting problem data:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Keep message channel open for async response
  }
  
  // Unknown message type
  console.warn('Unknown message type:', message.type);
  return false;
});

// Log initialization
console.log('Content script initialized and message listener registered');
if (detectLeetCodeSubmissionPage()) {
  const submissionId = extractSubmissionId();
  if (submissionId) {
    console.log('On LeetCode submission page with ID:', submissionId);
  } else {
    console.log('On LeetCode submission page but could not extract ID');
  }
} else {
  console.log('Not on a LeetCode submission page');
}
