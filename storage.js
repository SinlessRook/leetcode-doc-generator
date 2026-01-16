/**
 * Storage Manager for LeetCode Documentation Generator
 * Handles all Chrome storage operations for problem sets and problems
 */

const STORAGE_KEY = 'currentProblemSet';

/**
 * Save problem set information (title and student name)
 * @param {Object} info - Problem set info {title: string, submittedBy: string}
 * @returns {Promise<void>}
 * @throws {Error} If info data is invalid
 */
async function saveProblemSetInfo(info) {
  // Validate input
  if (!info || typeof info !== 'object') {
    throw new Error('Invalid problem set info: info must be an object');
  }
  
  if (!info.title || typeof info.title !== 'string' || info.title.trim().length === 0) {
    throw new Error('Invalid problem set info: title is required');
  }
  
  if (!info.submittedBy || typeof info.submittedBy !== 'string' || info.submittedBy.trim().length === 0) {
    throw new Error('Invalid problem set info: submittedBy is required');
  }
  
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const currentData = data[STORAGE_KEY] || { info: {}, problems: [] };
  
  currentData.info = {
    title: info.title.trim(),
    submittedBy: info.submittedBy.trim()
  };
  
  await chrome.storage.local.set({ [STORAGE_KEY]: currentData });
}

/**
 * Get problem set information
 * @returns {Promise<Object>} Problem set info {title: string, submittedBy: string}
 */
async function getProblemSetInfo() {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    const currentData = data[STORAGE_KEY] || { info: {}, problems: [] };
    
    // Ensure we return a valid object
    const info = currentData.info || {};
    return {
      title: info.title || '',
      submittedBy: info.submittedBy || ''
    };
  } catch (error) {
    console.error('Error getting problem set info from storage:', error);
    throw new Error(`Failed to retrieve problem set info: ${error.message}`);
  }
}

/**
 * Add a new problem to the problem set
 * @param {Object} problem - Problem data {name, submissionLink, code, language}
 * @returns {Promise<void>}
 * @throws {Error} If problem data is invalid
 */
async function addProblem(problem) {
  // Validate required fields
  if (!problem || typeof problem !== 'object') {
    throw new Error('Invalid problem data: problem must be an object');
  }
  
  if (!problem.name || typeof problem.name !== 'string' || problem.name.trim().length === 0) {
    throw new Error('Invalid problem data: name is required');
  }
  
  if (!problem.submissionLink || typeof problem.submissionLink !== 'string' || problem.submissionLink.trim().length === 0) {
    throw new Error('Invalid problem data: submissionLink is required');
  }
  
  if (!problem.code || typeof problem.code !== 'string' || problem.code.trim().length === 0) {
    throw new Error('Invalid problem data: code is required');
  }
  
  if (!problem.language || typeof problem.language !== 'string' || problem.language.trim().length === 0) {
    throw new Error('Invalid problem data: language is required');
  }
  
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const currentData = data[STORAGE_KEY] || { info: {}, problems: [] };
  
  const newProblem = {
    id: Date.now().toString(),
    name: problem.name.trim(),
    submissionLink: problem.submissionLink.trim(),
    code: problem.code,
    language: problem.language.trim(),
    capturedAt: Date.now(),
    order: currentData.problems.length
  };
  
  currentData.problems.push(newProblem);
  await chrome.storage.local.set({ [STORAGE_KEY]: currentData });
}

/**
 * Update an existing problem
 * @param {string} id - Problem ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
async function updateProblem(id, updates) {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const currentData = data[STORAGE_KEY] || { info: {}, problems: [] };
  
  const problemIndex = currentData.problems.findIndex(p => p.id === id);
  if (problemIndex === -1) {
    throw new Error(`Problem with id ${id} not found`);
  }
  
  currentData.problems[problemIndex] = {
    ...currentData.problems[problemIndex],
    ...updates
  };
  
  await chrome.storage.local.set({ [STORAGE_KEY]: currentData });
}

/**
 * Delete a problem from the problem set
 * @param {string} id - Problem ID
 * @returns {Promise<void>}
 */
async function deleteProblem(id) {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const currentData = data[STORAGE_KEY] || { info: {}, problems: [] };
  
  const problemIndex = currentData.problems.findIndex(p => p.id === id);
  
  if (problemIndex === -1) {
    console.warn(`Problem with id ${id} not found in storage`);
    // Don't throw error, just return - problem might already be deleted
    return;
  }
  
  // Remove the problem
  currentData.problems = currentData.problems.filter(p => p.id !== id);
  
  // Reorder remaining problems
  currentData.problems.forEach((problem, index) => {
    problem.order = index;
  });
  
  await chrome.storage.local.set({ [STORAGE_KEY]: currentData });
  console.log(`Problem ${id} deleted, ${currentData.problems.length} problems remaining`);
}

/**
 * Get all problems in the current problem set
 * @returns {Promise<Array>} Array of problems sorted by order
 */
async function getAllProblems() {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    const currentData = data[STORAGE_KEY] || { info: {}, problems: [] };
    
    // Validate that problems is an array
    if (!Array.isArray(currentData.problems)) {
      console.warn('Problems data is not an array, returning empty array');
      return [];
    }
    
    // Sort by order field
    return currentData.problems.sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (error) {
    console.error('Error getting problems from storage:', error);
    throw new Error(`Failed to retrieve problems: ${error.message}`);
  }
}

/**
 * Reorder problems based on array of problem IDs
 * @param {Array<string>} problemIds - Array of problem IDs in desired order
 * @returns {Promise<void>}
 * @throws {Error} If problemIds is invalid
 */
async function reorderProblems(problemIds) {
  // Validate input
  if (!Array.isArray(problemIds)) {
    throw new Error('Invalid input: problemIds must be an array');
  }
  
  if (problemIds.length === 0) {
    throw new Error('Invalid input: problemIds array is empty');
  }
  
  try {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    const currentData = data[STORAGE_KEY] || { info: {}, problems: [] };
    
    // Create a map of id to problem for quick lookup
    const problemMap = new Map(currentData.problems.map(p => [p.id, p]));
    
    // Reorder problems based on the provided IDs
    const reorderedProblems = problemIds
      .map(id => problemMap.get(id))
      .filter(p => p !== undefined);
    
    // Check if we lost any problems during reordering
    if (reorderedProblems.length !== problemIds.length) {
      console.warn(`Some problem IDs were not found. Expected ${problemIds.length}, got ${reorderedProblems.length}`);
    }
    
    // Update order field
    reorderedProblems.forEach((problem, index) => {
      problem.order = index;
    });
    
    currentData.problems = reorderedProblems;
    await chrome.storage.local.set({ [STORAGE_KEY]: currentData });
  } catch (error) {
    console.error('Error reordering problems:', error);
    throw new Error(`Failed to reorder problems: ${error.message}`);
  }
}

/**
 * Clear all data (problem set info and all problems)
 * @returns {Promise<void>}
 */
async function clearAll() {
  await chrome.storage.local.remove(STORAGE_KEY);
}
