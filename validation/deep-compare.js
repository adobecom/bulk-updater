const DOMAIN = 'https://business.adobe.com';

export const MATCH = 'Match';
export const EMPTY = 'Empty';
export const BOTH_EMPTY = 'Both Empty';
export const LENGTHS_MATCH = 'Lengths Match';
export const SIMILARITY = 'Similarity';
export const SIMILARITY_PERCENTAGE = 'Similarity Percentage';
export const SIMILARITY_NONE = 'No Similarity';
export const SIMILARITY_LOW = 'Low Similarity';
export const SIMILARITY_MEDIUM = 'Medium Similarity';
export const SIMILARITY_HIGH = 'High Similarity';
export const SIMILARITY_EXACT = 'Exact Match';
export const SIMILARITY_UNKNOWN = 'Unknown similarity';
export const WHITESPACE = 'Non-whitespace Match';
export const ASCII = 'ASCII Characters';

export const VALID_URL = 'Valid URL';
export const HASH_MATCH = 'Hash Match';
export const DOUBLE_HASH = 'Double Hash';
export const HOST_MATCH = 'Host Match';
export const PATHNAME_MATCH = 'Pathname Match';
export const SEARCH_MATCH = 'Search Match';

export const ANOMALY_EMPTY_LINK = 'Empty link';
export const ANOMALY_MISSING_LINK = 'Missing link';
export const ANOMALY_WHITESPACE_CORRUPTION = 'Whitespace corruption';
export const ANOMALY_ASCII_URL_CORRUPTION = 'ASCII URL corruption';
export const ANOMALY_MULTIPLE_HASHTAGS = 'Multiple hashtags';

/**
 * Calculates the Levenshtein distance between two strings.
 * A lower distance indicates a higher similarity between the strings.
 *
 * @param {string} strOne - The first string.
 * @param {string} strTwo - The second string.
 * @returns {number} The Levenshtein distance between the two strings.
 */
export function lDistance(strOne, strTwo) {
  let previousRow = Array(strTwo.length + 1).fill().map((_, i) => i);

  for (let i = 1; i <= strOne.length; i += 1) {
    const currentRow = [i];
    for (let j = 1; j <= strTwo.length; j += 1) {
      const insertCost = currentRow[j - 1] + 1;
      const deleteCost = previousRow[j] + 1;
      const replaceCost = previousRow[j - 1] + (strOne[i - 1] !== strTwo[j - 1] ? 1 : 0);
      currentRow[j] = Math.min(insertCost, deleteCost, replaceCost);
    }
    previousRow = currentRow;
  }

  return previousRow[strTwo.length];
}

/**
 * Calculates the similarity between two strings using the Levenshtein distance algorithm.
 *
 * @param {string} strOne - The first string.
 * @param {string} strTwo - The second string.
 * @returns {number} The similarity score between the two strings. (0.0 to 1.0)
 */
export function lSimilarity(strOne, strTwo) {
  const distance = lDistance(strOne, strTwo);
  const maxLength = Math.max(strOne.length, strTwo.length);
  return 1 - distance / maxLength;
}

/**
 * Converts a similarity percentage into a readable category.
 *
 * @param {number} similarity - The similarity score between the two strings. (0.0 to 1.0)
 * @returns {string} The readable similarity category.
 */
export function similarityCategory(similarity) {
  const categories = [
    { range: [0, 0.2], value: SIMILARITY_NONE },
    { range: [0.2, 0.5], value: SIMILARITY_LOW },
    { range: [0.5, 0.7], value: SIMILARITY_MEDIUM },
    { range: [0.7, 1.0], value: SIMILARITY_HIGH },
    { range: [1.0, 1.1], value: SIMILARITY_EXACT },
  ];
  const findCategory = (option) => option.range[0] <= similarity && option.range[1] > similarity;
  const category = categories.find(findCategory);

  return category?.value || SIMILARITY_UNKNOWN;
}

/**
 * Compares two strings and returns an object containing observations about their similarity.
 *
 * @param {string} stringOne - The first string to compare.
 * @param {string} stringTwo - The second string to compare.
 * @returns {Object} - An object containing observations about the similarity of the two strings.
 */
export function observeText(stringOne = '', stringTwo = '') {
  const observations = {};

  observations[MATCH] = stringOne === stringTwo;
  observations[EMPTY] = (!stringOne || !stringTwo);
  observations[BOTH_EMPTY] = (!stringOne && !stringTwo);
  observations[LENGTHS_MATCH] = stringOne.length === stringTwo.length;

  const similarity = lSimilarity(stringOne, stringTwo);

  observations[SIMILARITY_PERCENTAGE] = `${Math.round(similarity * 100)}%`;
  observations[SIMILARITY] = similarityCategory(similarity);
  observations[WHITESPACE] = (stringOne.replace(/\s/g, '') === stringTwo.replace(/\s/g, ''));
  observations[ASCII] = [stringOne, stringTwo].filter((string) => string.match(/%20/g)).length > 0;

  return observations;
}

/**
 * Observes and compares two URLs.
 *
 * @param {string} [oldUrl=''] - The old URL to observe.
 * @param {string} [newUrl=''] - The new URL to observe.
 * @returns {Object} - An object containing observations about the URL comparison.
 */
export function observeUrl(oldUrl = '', newUrl = '') {
  const observations = observeText(oldUrl, newUrl);
  const oldUrlObj = oldUrl ? new URL(oldUrl, DOMAIN) : null;
  const newUrlObj = newUrl ? new URL(newUrl, DOMAIN) : null;
  const validUrl = !!(oldUrlObj?.href && newUrlObj?.href);

  observations[DOUBLE_HASH] = oldUrl?.match(/#/g)?.length > 1 || newUrl?.match(/#/g)?.length > 1;
  observations[VALID_URL] = validUrl;

  if (validUrl) {
    observations[HASH_MATCH] = oldUrlObj?.hash === newUrlObj?.hash;
    observations[HOST_MATCH] = oldUrlObj?.host === newUrlObj?.host;
    observations[PATHNAME_MATCH] = oldUrlObj?.pathname === newUrlObj?.pathname;
    observations[SEARCH_MATCH] = oldUrlObj?.search === newUrlObj?.search;
  } else {
    observations[HASH_MATCH] = false;
    observations[HOST_MATCH] = false;
    observations[PATHNAME_MATCH] = false;
    observations[SEARCH_MATCH] = false;
  }

  return observations;
}

/**
 * Observes the changes in a link and its associated text.
 *
 * @param {string} oldUrl - The old link URL.
 * @param {string} newUrl - The new link URL.
 * @param {string} oldText - The old link text.
 * @param {string} newText - The new link text.
 * @returns {Object} - An object containing observations for the link and text changes.
 */
export function observeLinks(oldUrl, newUrl, oldText, newText) {
  const observations = { oldUrl, newUrl, oldText, newText };

  observations.text = observeText(oldText, newText);
  observations.url = observeUrl(oldUrl, newUrl);

  return observations;
}

/**
 * Detects anomalies using a list of observations.
 * Account for authoring irregularities including double hashs (#one#two),
 * ASCII character transformations, link shuffling, and empty links.
 *
 * @param {Array} observations - The list of observations to analyze.
 * @returns {Array} - An array of anomalies detected using the observations.
 */
export function detectAnomalies(observations) {
  const anomalies = [];
  for (const observation of observations) {
    const { text, url } = observation;
    if (text[EMPTY] && url[EMPTY]) {
      anomalies.push(ANOMALY_MISSING_LINK);
    } else if (text[EMPTY] || url[EMPTY]) {
      anomalies.push(ANOMALY_EMPTY_LINK);
    }
    if (text[WHITESPACE] && !text[MATCH]) {
      anomalies.push(ANOMALY_WHITESPACE_CORRUPTION);
    }
    if (url[ASCII] && !url[MATCH] && !url[DOUBLE_HASH]) {
      anomalies.push(ANOMALY_ASCII_URL_CORRUPTION);
    }
    if (url[DOUBLE_HASH]) {
      anomalies.push(ANOMALY_MULTIPLE_HASHTAGS);
    }
  }

  return anomalies;
}
