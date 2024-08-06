const NEWS_SITE = "antaranews";

// For more information, see https://crawlee.dev/
import { RequestQueue, CheerioCrawler, Configuration } from "crawlee";

// CONFIGURATION
const config = Configuration.getGlobalConfig();

config.set("defaultDatasetId", NEWS_SITE);
config.set("defaultKeyValueStoreId", NEWS_SITE);
config.set("defaultRequestQueueId", NEWS_SITE);
// config.set("purgeOnStart", false);

// REQUEST QUEUE
const requestQueue = await RequestQueue.open();

// initial request
await requestQueue.addRequests([
  { url: "https://www.antaranews.com/berita/1", uniqueKey: "1" },
  { url: "https://www.antaranews.com/berita/2", uniqueKey: "2" },
  { url: "https://www.antaranews.com/berita/3", uniqueKey: "3" },
  { url: "https://www.antaranews.com/berita/4", uniqueKey: "4" },
  { url: "https://www.antaranews.com/berita/5", uniqueKey: "5" },
  { url: "https://www.antaranews.com/berita/6", uniqueKey: "6" },
  { url: "https://www.antaranews.com/berita/7", uniqueKey: "7" },
  { url: "https://www.antaranews.com/berita/8", uniqueKey: "8" },
  { url: "https://www.antaranews.com/berita/9", uniqueKey: "9" },
  { url: "https://www.antaranews.com/berita/10", uniqueKey: "10" },
]);

const crawler = new CheerioCrawler(
  {
    // Comment this option to scrape the full website.
    maxRequestsPerCrawl: 5,
    requestQueue: requestQueue,
    async requestHandler({ $, request, pushData }) {
      // Extract data from the page
      const title = $("h1").text();
      const article = $(".wrap__article-detail-content")
        .contents()
        .filter(function () {
          return this.nodeType === 3;
        })
        .text();

      const beritaId = parseInt(request.uniqueKey);
      const nextBeritaId = beritaId + 10;

      if (title && article) {
        pushData({ beritaId, title, article });
      }

      await requestQueue.addRequests([
        {
          url: `https://www.antaranews.com/berita/${nextBeritaId}`,
          uniqueKey: `${nextBeritaId}`,
        },
      ]);
    },
  }
  // config
);

await crawler.run();
