/* eslint-disable no-useless-escape */
import { expect } from '@esm-bundle/chai';
import {
  lDistance,
  lSimilarity,
  observeText,
  observeUrl,
  observeLinks,
  detectAnomaly,
  MATCH,
  EMPTY,
  BOTH_EMPTY,
  LENGTHS_MATCH,
  SIMILARITY,
  SIMILARITY_PERCENTAGE,
  DOUBLE_HASH,
  SIMILARITY_EXACT,
  WHITESPACE,
  ASCII,
  VALID_URL,
  HASH_MATCH,
  HOST_MATCH,
  PATHNAME_MATCH,
  SEARCH_MATCH,
  ANOMALY_EMPTY_LINK,
  ANOMALY_MISSING_LINK,
  ANOMALY_WHITESPACE_CORRUPTION,
  ANOMALY_ASCII_URL_CORRUPTION,
  ANOMALY_MULTIPLE_HASHTAGS,
  ANOMALY_UNKNOWN,
} from '../../validation/deep-compare.js';

describe('Deep Compare', () => {
  describe('Levenshtein Distance', () => {
    it('returns the correct distance between two strings', () => {
      const strOne = 'kitten';
      const strTwo = 'sitting';
      const distance = lDistance(strOne, strTwo);

      expect(distance).to.equal(3);
    });
  });

  describe('Levenshtein Similarity', () => {
    it('returns the correct similarity between two strings', () => {
      const strOne = 'kitten';
      const strTwo = 'sitting';
      const similarity = lSimilarity(strOne, strTwo);

      expect(similarity.toFixed(4)).to.equal('0.5714');
    });
  });

  describe('Text Observation', () => {
    it('returns the correct observations for text', () => {
      const oldText = 'Adobe Experience Manager';
      const newText = 'Adobe Experience Manager';
      const observations = observeText(oldText, newText);

      expect(observations).to.deep.include({
        [MATCH]: true,
        [EMPTY]: false,
        [BOTH_EMPTY]: false,
        [LENGTHS_MATCH]: true,
        [SIMILARITY_PERCENTAGE]: '100%',
        [SIMILARITY]: SIMILARITY_EXACT,
        [WHITESPACE]: true,
        [ASCII]: false,
      });
    });
  });

  describe('URL Observation', () => {
    it('returns the correct observations for URLs', () => {
      const oldUrl = 'https://business.adobe.com/';
      const newUrl = 'https://business.adobe.com/';
      const observations = observeUrl(oldUrl, newUrl);

      expect(observations).to.deep.include({
        [MATCH]: true,
        [EMPTY]: false,
        [BOTH_EMPTY]: false,
        [HASH_MATCH]: true,
        [DOUBLE_HASH]: false,
        [HOST_MATCH]: true,
        [LENGTHS_MATCH]: true,
        [PATHNAME_MATCH]: true,
        [SEARCH_MATCH]: true,
        [SIMILARITY_PERCENTAGE]: '100%',
        [SIMILARITY]: SIMILARITY_EXACT,
        [WHITESPACE]: true,
        [VALID_URL]: true,
        [ASCII]: false,
      });
    });
  });

  describe('Link Observation', () => {
    it('returns the correct observations for links', () => {
      const oldUrl = 'https://business.adobe.com/';
      const newUrl = 'https://business.adobe.com/';
      const oldText = 'Adobe Experience Manager';
      const newText = 'Adobe Experience Manager';
      const expected = {
        oldUrl,
        newUrl,
        oldText,
        newText,
      };
      const expectedText = {
        [MATCH]: true,
        [EMPTY]: false,
        [BOTH_EMPTY]: false,
        [LENGTHS_MATCH]: true,
        [SIMILARITY_PERCENTAGE]: '100%',
        [SIMILARITY]: SIMILARITY_EXACT,
        [WHITESPACE]: true,
        [ASCII]: false,
      };
      const expectedUrl = {
        [MATCH]: true,
        [EMPTY]: false,
        [BOTH_EMPTY]: false,
        [DOUBLE_HASH]: false,
        [HASH_MATCH]: true,
        [HOST_MATCH]: true,
        [LENGTHS_MATCH]: true,
        [PATHNAME_MATCH]: true,
        [SEARCH_MATCH]: true,
        [SIMILARITY_PERCENTAGE]: '100%',
        [SIMILARITY]: SIMILARITY_EXACT,
        [WHITESPACE]: true,
        [VALID_URL]: true,
        [ASCII]: false,
      };

      const observations = observeLinks(oldUrl, newUrl, oldText, newText);

      expect(observations).to.deep.include(expected);
      expect(observations.text).to.deep.include(expectedText);
      expect(observations.url).to.deep.include(expectedUrl);
    });

    it('returns the correct observations for links with different URLs', () => {
      const oldUrl = 'https://business.adobe.com/entry';
      const newUrl = 'https://business.adobe.com/';
      const oldText = 'Adobe Experience Manager';
      const newText = 'Adobe Experience Manager';
      const observations = observeLinks(oldUrl, newUrl, oldText, newText);

      expect(observations.url).to.contain({
        [MATCH]: false,
        [PATHNAME_MATCH]: false,
        [SIMILARITY_PERCENTAGE]: '84%',
        [SIMILARITY]: 'High Similarity',
      });
    });
  });

  describe('Anomaly Detection', () => {
    it('No anomalies for exact match', () => {
      const observation = {
        text: {},
        url: {},
      };
      const { anomaly } = detectAnomaly(observation);

      expect(anomaly).to.deep.equal(ANOMALY_UNKNOWN);
    });

    it('identifies empty link anomaly', () => {
      const observation = {
        text: { [EMPTY]: true },
        url: { [EMPTY]: true },
      };

      const { anomaly } = detectAnomaly(observation);

      expect(anomaly).to.deep.equal(ANOMALY_MISSING_LINK);
    });

    it('identifies anomalies for text with whitespace changes', () => {
      const observation = {
        text: {
          [MATCH]: false,
          [WHITESPACE]: true,
        },
        url: {},
      };

      const { anomaly } = detectAnomaly(observation);

      expect(anomaly).to.deep.equal(ANOMALY_WHITESPACE_CORRUPTION);
    });

    it('identifies anomalies for URLs with multiple hashtags', () => {
      const observation = {
        text: {},
        url: { [DOUBLE_HASH]: true },
      };

      const { anomaly } = detectAnomaly(observation);

      expect(anomaly).to.equal(ANOMALY_MULTIPLE_HASHTAGS);
    });

    it('identifies anomalies for URLs with ASCII characters', () => {
      const observation = {
        text: {
          [MATCH]: true,
          [ASCII]: false,
        },
        url: {
          [MATCH]: false,
          [ASCII]: true,
        },
      };

      const { anomaly } = detectAnomaly(observation);

      expect(anomaly).to.equal(ANOMALY_ASCII_URL_CORRUPTION);
    });
  });
});

describe('Detect Real Anomaly', () => {
  it('identifies empty link', () => {
    const oldUrl = 'https://business.adobe.com/products/target/adobe-target.html';
    const newUrl = '';
    const oldText = 'Adobe Target';
    const newText = 'Adobe Target';
    const observation = observeLinks(oldUrl, newUrl, oldText, newText);
    const { anomaly } = detectAnomaly(observation);

    expect(anomaly).to.equal(ANOMALY_EMPTY_LINK);
  });

  it('identifies missing link', () => {
    const oldUrl = 'https://business.adobe.com/products/target/adobe-target.html';
    const newUrl = '';
    const oldText = 'Adobe Target';
    const newText = '';
    const observation = observeLinks(oldUrl, newUrl, oldText, newText);
    const { anomaly } = detectAnomaly(observation);

    expect(anomaly).to.equal(ANOMALY_MISSING_LINK);
  });

  it('identifies whitespace corruption', () => {
    const oldUrl = 'https://business.adobe.com/products/target/adobe-target.html';
    const newUrl = 'https://business.adobe.com/products/target/adobe-target.html';
    const oldText = 'Adobe Target';
    const newText = 'Adobe Target ';
    const observation = observeLinks(oldUrl, newUrl, oldText, newText);
    const { anomaly } = detectAnomaly(observation);

    expect(anomaly).to.equal(ANOMALY_WHITESPACE_CORRUPTION);
  });

  it('identifies ASCII URL corruption', () => {
    const oldUrl = 'https://experienceleague.adobe.com/?lang=en" \l "home';
    const newUrl = 'https://experienceleague.adobe.com/?lang=en%22%20\l%20%22home';
    const oldText = 'Adobe Experience League';
    const newText = 'Adobe Experience League';
    const observation = observeLinks(oldUrl, newUrl, oldText, newText);
    const { anomaly } = detectAnomaly(observation);

    expect(anomaly).to.equal(ANOMALY_ASCII_URL_CORRUPTION);
  });

  it('identifies multiple hashtags', () => {
    const oldUrl = 'https://experienceleague.adobe.com/docs/experience-manager-cloud-service/content/overview/architecture.html?lang=en#service-architecture#_blank';
    const newUrl = 'https://experienceleague.adobe.com/docs/experience-manager-cloud-service/content/overview/architecture.html?lang=en#_blank';
    const oldText = 'technical documentation';
    const newText = 'technical documentation';
    const observation = observeLinks(oldUrl, newUrl, oldText, newText);
    const { anomaly } = detectAnomaly(observation);

    expect(anomaly).to.equal(ANOMALY_MULTIPLE_HASHTAGS);
  });
});
