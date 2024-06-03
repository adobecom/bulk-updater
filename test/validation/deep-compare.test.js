/* eslint-disable no-useless-escape */
import { expect } from '@esm-bundle/chai';
import {
  lDistance,
  lSimilarity,
  observeText,
  observeUrl,
  observeLinks,
  detectAnomalies,
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

      expect(observations).to.deep.equal({
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

      expect(observations).to.deep.equal({
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
      const observations = observeLinks(oldUrl, newUrl, oldText, newText);

      expect(observations).to.deep.equal({
        oldUrl,
        newUrl,
        oldText,
        newText,
        text: {
          [MATCH]: true,
          [EMPTY]: false,
          [BOTH_EMPTY]: false,
          [LENGTHS_MATCH]: true,
          [SIMILARITY_PERCENTAGE]: '100%',
          [SIMILARITY]: SIMILARITY_EXACT,
          [WHITESPACE]: true,
          [ASCII]: false,
        },
        url: {
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
        },
      });
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
      const observations = {
        text: {},
        url: {},
      };
      const anomalies = detectAnomalies([observations]);

      expect(anomalies).to.deep.equal([]);
    });

    it('identifies empty link anomaly', () => {
      const observations = {
        text: { [EMPTY]: true },
        url: { [EMPTY]: true },
      };

      const anomalies = detectAnomalies([observations]);

      expect(anomalies).to.deep.equal(['Missing link']);
    });

    it('identifies anomalies for text with whitespace changes', () => {
      const observations = {
        text: {
          [MATCH]: false,
          [WHITESPACE]: true,
        },
        url: {},
      };

      const anomalies = detectAnomalies([observations]);

      expect(anomalies).to.deep.equal(['Whitespace corruption']);
    });

    it('identifies anomalies for URLs with multiple hashtags', () => {
      const observations = {
        text: {},
        url: { [DOUBLE_HASH]: true },
      };

      const anomalies = detectAnomalies([observations]);

      expect(anomalies).to.deep.equal(['Multiple hashtags']);
    });

    it('identifies anomalies for URLs with ASCII characters', () => {
      const observations = {
        text: {
          [MATCH]: true,
          [ASCII]: false,
        },
        url: {
          [MATCH]: false,
          [ASCII]: true,
        },
      };

      const anomalies = detectAnomalies([observations]);

      expect(anomalies).to.deep.equal(['ASCII URL corruption']);
    });
  });
});

describe('Detect Real Anomalies', () => {
  it('identifies empty link', () => {
    const oldUrl = 'https://business.adobe.com/products/target/adobe-target.html';
    const newUrl = '';
    const oldText = 'Adobe Target';
    const newText = 'Adobe Target';
    const observations = observeLinks(oldUrl, newUrl, oldText, newText);
    const anomalies = detectAnomalies([observations]);

    expect(anomalies).to.deep.equal([ANOMALY_EMPTY_LINK]);
  });

  it('identifies missing link', () => {
    const oldUrl = 'https://business.adobe.com/products/target/adobe-target.html';
    const newUrl = '';
    const oldText = 'Adobe Target';
    const newText = '';
    const observations = observeLinks(oldUrl, newUrl, oldText, newText);
    const anomalies = detectAnomalies([observations]);

    expect(anomalies).to.deep.equal([ANOMALY_MISSING_LINK]);
  });

  it('identifies whitespace corruption', () => {
    const oldUrl = 'https://business.adobe.com/products/target/adobe-target.html';
    const newUrl = 'https://business.adobe.com/products/target/adobe-target.html';
    const oldText = 'Adobe Target';
    const newText = 'Adobe Target ';
    const observations = observeLinks(oldUrl, newUrl, oldText, newText);
    const anomalies = detectAnomalies([observations]);

    expect(anomalies).to.deep.equal([ANOMALY_WHITESPACE_CORRUPTION]);
  });

  it('identifies ASCII URL corruption', () => {
    const oldUrl = 'https://experienceleague.adobe.com/?lang=en" \l "home';
    const newUrl = 'https://experienceleague.adobe.com/?lang=en%22%20\l%20%22home';
    const oldText = 'Adobe Experience League';
    const newText = 'Adobe Experience League';
    const observations = observeLinks(oldUrl, newUrl, oldText, newText);
    const anomalies = detectAnomalies([observations]);

    expect(anomalies).to.deep.equal([ANOMALY_ASCII_URL_CORRUPTION]);
  });

  it('identifies multiple hashtags', () => {
    const oldUrl = 'https://experienceleague.adobe.com/docs/experience-manager-cloud-service/content/overview/architecture.html?lang=en#service-architecture#_blank';
    const newUrl = 'https://experienceleague.adobe.com/docs/experience-manager-cloud-service/content/overview/architecture.html?lang=en#_blank';
    const oldText = 'technical documentation';
    const newText = 'technical documentation';
    const observations = observeLinks(oldUrl, newUrl, oldText, newText);
    const anomalies = detectAnomalies([observations]);

    expect(anomalies).to.deep.equal([ANOMALY_MULTIPLE_HASHTAGS]);
  });
});
