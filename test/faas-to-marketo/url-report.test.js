import { expect } from '@esm-bundle/chai';
import { init, getMarketoData, generateMarketoUrl } from '../../faas-to-marketo/url-report.js';

describe('faas to marketo url report', () => {
  describe('init', () => {
    it('adds the mapping from the csv', () => {
      const config = init('test/faas-to-marketo/mocks/mapping.csv');
      expect(config.pathMapping).to.eql([
        { path: '/page-1', template: 'Full Form' },
        { path: '/page-2', template: 'Expanded Form' },
        { path: '/page-3', template: 'Essential Form' },
        { path: '/page-4', template: 'No Forms' },
      ]);
    });
    it('adds the list from the csv', () => {
      const config = init('test/faas-to-marketo/mocks/mapping.csv');
      expect(config.list).to.eql(['/page-1', '/page-2', '/page-3', '/page-4']);
    });
  });
  describe('getMarketoData', () => {
    it('gets the marketo data from the faas url', () => {
      const path = '/ae_ar/customers/consulting-services/contact-us';
      const data = getMarketoData(
        path,
        'https://milo.adobe.com/tools/faas#eyIxNDkiOiIiLCIxNzIiOiIiLCJpZCI6IjIyIiwibCI6ImVuX3VzIiwiZCI6Imh0dHBzOi8vYnVzaW5lc3MuYWRvYmUuY29tL2FlX2FyL3JlcXVlc3QtY29uc3VsdGF0aW9uL3RoYW5reW91Lmh0bWwiLCJhcyI6ZmFsc2UsImFyIjp0cnVlLCJwYyI6eyIxIjoianMiLCIyIjoiZmFhc19zdWJtaXNzaW9uIiwiMyI6InNmZGMiLCI0IjoiZGVtYW5kYmFzZSIsIjUiOiIifSwicSI6e30sInAiOnsianMiOnsiMzYiOiIiLCIzOSI6IiIsIjc3IjoxLCI3OCI6MSwiNzkiOjEsIjkwIjoiRkFBUyIsIjkyIjoiMjg0NiIsIjkzIjoiMjg0OCIsIjk0IjoiIn19LCJlIjp7fSwidGl0bGVfYWxpZ24iOiJjZW50ZXIiLCJ0aXRsZV9zaXplIjoiaDMiLCJwYzEiOnRydWUsInBjMiI6dHJ1ZSwicGMzIjp0cnVlLCJwYzQiOnRydWUsInBqczk0IjoiMzIzMSIsInBqczM2IjoiNzAxMU8wMDAwMDJUMFY2UUFLIiwicGpzMzkiOiIiLCJwanM5MiI6IjI4NDYiLCJwanM5MyI6IjI4NTEiLCJxMTAzIjpbXSwicGM1IjpmYWxzZX0=',
        [{ path, template: 'Full Form' }],
      );
      expect(data).to.eql({
        campaignID: '7011O000002T0V6QAK',
        destinationUrl: 'https://business.adobe.com/ae_ar/request-consultation/thankyou.html',
        onsiteID: '',
        poi: 'DIGITALPERFORMANCE',
        subtype: 'request_for_information',
        template: 'full',
      });
    });
    it('gets the data from the old faas format', () => {
      const path = '/jp/resources/articles/002972-smcc';
      const data = getMarketoData(
        path,
        'https://milo.adobe.com/tools/faas#eyJsIjoiamFfanAiLCJkIjoiL3Jlc291cmNlcy9hcnRpY2xlcy8wMDI5NzItc21jYy90aGFuay15b3UuaHRtbCIsImFyIjp0cnVlLCJ0ZXN0IjpmYWxzZSwicSI6e30sInBjIjp7IjEiOiJqcyIsIjIiOiJmYWFzX3N1Ym1pc3Npb24iLCIzIjoic2ZkYyIsIjQiOiJkZW1hbmRiYXNlIiwiNSI6IiJ9LCJwIjp7ImpzIjp7IjMyIjoidW5rbm93biIsIjM2IjoiNzAxMTQwMDAwMDI3c05TQUFZIiwiMzkiOiIiLCI3NyI6MSwiNzgiOjEsIjc5IjoxLCI5MCI6IkZBQVMiLCI5MiI6Mjg0NiwiOTMiOiIyODQ3IiwiOTQiOjI4MzksIjE3MyI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMS9qcC9yZXNvdXJjZXMvYXJ0aWNsZXMvMDAyOTcyLXNtY2MuaHRtbD9ob3N0PWh0dHBzJTNhJTJmJTJmYnVzaW5lc3MuYWRvYmUuY29tIn0sImZhYXNfc3VibWlzc2lvbiI6e30sInNmZGMiOnsiY29udGFjdElkIjpudWxsfSwiZGVtYW5kYmFzZSI6e319LCJhcyI6InRydWUiLCJvIjp7fSwiZSI6e30sImNvb2tpZSI6eyJwIjp7ImpzIjp7fX19LCJ1cmwiOnsicCI6eyJqcyI6eyIzNiI6IjcwMTMwMDAwMDAwa1llMEFBRSJ9fX0sImpzIjp7ImlkIjoiNzkiLCJsIjoiamFfanAiLCJkIjoiaHR0cHM6Ly9idXNpbmVzcy5hZG9iZS5jb20vanAvcmVzb3VyY2VzL2FydGljbGVzLzAwMjk3Mi1zbWNjL3RoYW5rLXlvdS5odG1sIiwiYXMiOiJ0cnVlIiwiYXIiOnRydWUsInBjIjp7IjEiOiJqcyIsIjIiOiJmYWFzX3N1Ym1pc3Npb24iLCIzIjoic2ZkYyIsIjQiOiJkZW1hbmRiYXNlIiwiNSI6IiJ9LCJxIjp7fSwicCI6eyJqcyI6eyIzNiI6IjcwMTE0MDAwMDAyN3NOU0FBWSIsIjM5IjoiIiwiNzciOjEsIjc4IjoxLCI3OSI6MSwiOTAiOiJGQUFTIiwiOTIiOjI4NDYsIjkzIjoiMjg0NyIsIjk0IjoyODM5fX0sImUiOnt9fSwib25ldHJ1c3RfYWR2ZXJ0aXNpbmdfYWNjZXB0YW5jZSI6Im5vIiwib25ldHJ1c3RfcGVyZm9ybWFuY2VfYWNjZXB0YW5jZSI6Im5vIiwib25ldHJ1c3RfZnVuY3Rpb25hbGl0eV9hY2NlcHRhbmNlIjoibm8iLCJjbGVhcmJpdFN0ZXAiOjEsImZvcm1UYWciOiJmYWFzLU9mZmVyIiwiaWQiOiI3OSIsIl9mYyI6MSwiY29tcGxldGUiOnRydWUsInRpdGxlIjoiIiwic3R5bGVfbGF5b3V0IjoiY29sdW1uMiIsImNsZWFiaXRTdHlsZSI6IiJ9',
        [{ path, template: 'Full Form' }],
      );
      expect(data).to.eql({
        campaignID: '701140000027sNSAAY',
        destinationUrl: '/resources/articles/002972-smcc/thank-you.html',
        onsiteID: '',
        poi: 'ANALYTICSSOLNSTANNDARD',
        subtype: 'whitepaper_form',
        template: 'full',
      });
    });
  });
  describe('generateMarketoUrl', () => {
    it('generates the marketo url for the Full form template', () => {
      const data = {
        template: 'full',
        subtype: 'nurture',
        campaignID: 1,
        destinationUrl: '#hello-world',
        onsiteID: 2,
        poi: 'Acrobat',
      };
      const url = generateMarketoUrl(data);
      expect(url).to.equal('https://milo.adobe.com/tools/marketo#eyJmaWVsZF9maWx0ZXJzLmZ1bmN0aW9uYWxfYXJlYSI6IkZ1bmN0aW9uYWwgQXJlYS1EWCIsImZpZWxkX2ZpbHRlcnMuaW5kdXN0cnkiOiJoaWRkZW4iLCJmaWVsZF9maWx0ZXJzLmpvYl9yb2xlIjoiRFgiLCJmaWVsZF9maWx0ZXJzLnByb2R1Y3RzIjoiUE9JLUR4b25seS1hcmVhIiwiZmllbGRfdmlzaWJpbGl0eS5jb21tZW50cyI6ImhpZGRlbiIsImZpZWxkX3Zpc2liaWxpdHkuY29tcGFueSI6InJlcXVpcmVkIiwiZmllbGRfdmlzaWJpbGl0eS5jb21wYW55X3NpemUiOiJoaWRkZW4iLCJmaWVsZF92aXNpYmlsaXR5LmRlbW8iOiJoaWRkZW4iLCJmaWVsZF92aXNpYmlsaXR5Lm5hbWUiOiJyZXF1aXJlZCIsImZpZWxkX3Zpc2liaWxpdHkucGhvbmUiOiJyZXF1aXJlZCIsImZpZWxkX3Zpc2liaWxpdHkucG9zdGNvZGUiOiJyZXF1aXJlZCIsImZpZWxkX3Zpc2liaWxpdHkuc3RhdGUiOiJyZXF1aXJlZCIsImZpZWxkX3Zpc2liaWxpdHkud2Vic2l0ZSI6ImhpZGRlbiIsImZvcm0gaWQiOiIyMjc3IiwiZm9ybSB0eXBlIjoibWFya2V0b19mb3JtIiwiZm9ybS5zdWJ0eXBlIjoibnVydHVyZSIsImZvcm0uc3VjY2Vzcy5jb250ZW50IjoiI2hlbGxvLXdvcmxkIiwiZm9ybS5zdWNjZXNzLnR5cGUiOiIiLCJmb3JtLnRlbXBsYXRlIjoiZmxleF9jb250YWN0IiwibWFya2V0byBob3N0IjoiZW5nYWdlLmFkb2JlLmNvbSIsIm1hcmtldG8gbXVuY2tpbiI6IjM2MC1LQ0ktODA0IiwicHJvZ3JhbS5hZGRpdGlvbmFsX2Zvcm1faWQiOiIiLCJwcm9ncmFtLmNhbXBhaWduaWRzLmV4dGVybmFsIjoiIiwicHJvZ3JhbS5jYW1wYWlnbmlkcy5vbnNpdGUiOjIsInByb2dyYW0uY2FtcGFpZ25pZHMucmV0b3VjaCI6IiIsInByb2dyYW0uY2FtcGFpZ25pZHMuc2ZkYyI6MSwicHJvZ3JhbS5jb250ZW50LmlkIjoiIiwicHJvZ3JhbS5jb250ZW50LnR5cGUiOiIiLCJwcm9ncmFtLmNvcGFydG5lcm5hbWVzIjoiIiwicHJvZ3JhbS5wb2kiOiJBY3JvYmF0IiwicHJvZ3JhbS5zdWJzY3JpcHRpb24uaWQiOiIifQ==');
    });
    it('generates the marketo url for the Expanded form template', () => {
      const data = {
        template: 'expanded',
        subtype: 'nurture',
        campaignID: 1,
        destinationUrl: '#hello-world',
        onsiteID: 2,
        poi: 'Acrobat',
      };
      const url = generateMarketoUrl(data);
      expect(url).to.equal('https://milo.adobe.com/tools/marketo#eyJmaWVsZF9maWx0ZXJzLmZ1bmN0aW9uYWxfYXJlYSI6IkZ1bmN0aW9uYWwgQXJlYS1EWCIsImZpZWxkX2ZpbHRlcnMuaW5kdXN0cnkiOiJoaWRkZW4iLCJmaWVsZF9maWx0ZXJzLmpvYl9yb2xlIjoiRFgiLCJmaWVsZF9maWx0ZXJzLnByb2R1Y3RzIjoiaGlkZGVuIiwiZmllbGRfdmlzaWJpbGl0eS5jb21tZW50cyI6ImhpZGRlbiIsImZpZWxkX3Zpc2liaWxpdHkuY29tcGFueSI6InJlcXVpcmVkIiwiZmllbGRfdmlzaWJpbGl0eS5jb21wYW55X3NpemUiOiJoaWRkZW4iLCJmaWVsZF92aXNpYmlsaXR5LmRlbW8iOiJoaWRkZW4iLCJmaWVsZF92aXNpYmlsaXR5Lm5hbWUiOiJyZXF1aXJlZCIsImZpZWxkX3Zpc2liaWxpdHkucGhvbmUiOiJoaWRkZW4iLCJmaWVsZF92aXNpYmlsaXR5LnBvc3Rjb2RlIjoiaGlkZGVuIiwiZmllbGRfdmlzaWJpbGl0eS5zdGF0ZSI6ImhpZGRlbiIsImZpZWxkX3Zpc2liaWxpdHkud2Vic2l0ZSI6ImhpZGRlbiIsImZvcm0gaWQiOiIyMjc3IiwiZm9ybSB0eXBlIjoibWFya2V0b19mb3JtIiwiZm9ybS5zdWJ0eXBlIjoibnVydHVyZSIsImZvcm0uc3VjY2Vzcy5jb250ZW50IjoiI2hlbGxvLXdvcmxkIiwiZm9ybS5zdWNjZXNzLnR5cGUiOiIiLCJmb3JtLnRlbXBsYXRlIjoiZmxleF9ldmVudCIsIm1hcmtldG8gaG9zdCI6ImVuZ2FnZS5hZG9iZS5jb20iLCJtYXJrZXRvIG11bmNraW4iOiIzNjAtS0NJLTgwNCIsInByb2dyYW0uYWRkaXRpb25hbF9mb3JtX2lkIjoiIiwicHJvZ3JhbS5jYW1wYWlnbmlkcy5leHRlcm5hbCI6IiIsInByb2dyYW0uY2FtcGFpZ25pZHMub25zaXRlIjoyLCJwcm9ncmFtLmNhbXBhaWduaWRzLnJldG91Y2giOiIiLCJwcm9ncmFtLmNhbXBhaWduaWRzLnNmZGMiOjEsInByb2dyYW0uY29udGVudC5pZCI6IiIsInByb2dyYW0uY29udGVudC50eXBlIjoiIiwicHJvZ3JhbS5jb3BhcnRuZXJuYW1lcyI6IiIsInByb2dyYW0ucG9pIjoiQWNyb2JhdCIsInByb2dyYW0uc3Vic2NyaXB0aW9uLmlkIjoiIn0=');
    });
    it('generates the marketo url for the Essential form template', () => {
      const data = {
        template: 'essential',
        subtype: 'nurture',
        campaignID: 1,
        destinationUrl: '#hello-world',
        onsiteID: 2,
        poi: 'Acrobat',
      };
      const url = generateMarketoUrl(data);
      expect(url).to.equal('https://milo.adobe.com/tools/marketo#eyJmaWVsZF9maWx0ZXJzLmZ1bmN0aW9uYWxfYXJlYSI6ImhpZGRlbiIsImZpZWxkX2ZpbHRlcnMuaW5kdXN0cnkiOiJoaWRkZW4iLCJmaWVsZF9maWx0ZXJzLmpvYl9yb2xlIjoiaGlkZGVuIiwiZmllbGRfZmlsdGVycy5wcm9kdWN0cyI6ImhpZGRlbiIsImZpZWxkX3Zpc2liaWxpdHkuY29tbWVudHMiOiJoaWRkZW4iLCJmaWVsZF92aXNpYmlsaXR5LmNvbXBhbnkiOiJyZXF1aXJlZCIsImZpZWxkX3Zpc2liaWxpdHkuY29tcGFueV9zaXplIjoiaGlkZGVuIiwiZmllbGRfdmlzaWJpbGl0eS5kZW1vIjoiaGlkZGVuIiwiZmllbGRfdmlzaWJpbGl0eS5uYW1lIjoicmVxdWlyZWQiLCJmaWVsZF92aXNpYmlsaXR5LnBob25lIjoiaGlkZGVuIiwiZmllbGRfdmlzaWJpbGl0eS5wb3N0Y29kZSI6ImhpZGRlbiIsImZpZWxkX3Zpc2liaWxpdHkuc3RhdGUiOiJoaWRkZW4iLCJmaWVsZF92aXNpYmlsaXR5LndlYnNpdGUiOiJoaWRkZW4iLCJmb3JtIGlkIjoiMjI3NyIsImZvcm0gdHlwZSI6Im1hcmtldG9fZm9ybSIsImZvcm0uc3VidHlwZSI6Im51cnR1cmUiLCJmb3JtLnN1Y2Nlc3MuY29udGVudCI6IiNoZWxsby13b3JsZCIsImZvcm0uc3VjY2Vzcy50eXBlIjoiIiwiZm9ybS50ZW1wbGF0ZSI6ImZsZXhfY29udGVudCIsIm1hcmtldG8gaG9zdCI6ImVuZ2FnZS5hZG9iZS5jb20iLCJtYXJrZXRvIG11bmNraW4iOiIzNjAtS0NJLTgwNCIsInByb2dyYW0uYWRkaXRpb25hbF9mb3JtX2lkIjoiIiwicHJvZ3JhbS5jYW1wYWlnbmlkcy5leHRlcm5hbCI6IiIsInByb2dyYW0uY2FtcGFpZ25pZHMub25zaXRlIjoyLCJwcm9ncmFtLmNhbXBhaWduaWRzLnJldG91Y2giOiIiLCJwcm9ncmFtLmNhbXBhaWduaWRzLnNmZGMiOjEsInByb2dyYW0uY29udGVudC5pZCI6IiIsInByb2dyYW0uY29udGVudC50eXBlIjoiIiwicHJvZ3JhbS5jb3BhcnRuZXJuYW1lcyI6IiIsInByb2dyYW0ucG9pIjoiQWNyb2JhdCIsInByb2dyYW0uc3Vic2NyaXB0aW9uLmlkIjoiIn0=');
    });
  });
});
