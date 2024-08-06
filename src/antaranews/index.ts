// For more information, see https://crawlee.dev/
import { RequestQueue, CheerioCrawler, Configuration, log } from "crawlee";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the current file
const __dirname = path.dirname(__filename); // get the name of the current directory

const PLATFORM = "antaranews";
const MAX_BERITA_ID = 70;

// CONFIGURATION
const config = Configuration.getGlobalConfig();

// config.set("defaultDatasetId", PLATFORM);
// config.set("defaultKeyValueStoreId", PLATFORM);
// config.set("defaultRequestQueueId", PLATFORM);
config.set("purgeOnStart", true);
// END OF CONFIGURATION

// HELPER FUNCTIONS
function convertToDateString(dateString: string) {
  // Define a mapping for Indonesian month names to numbers
  const monthMap = new Map([
    ["januari", "01"],
    ["februari", "02"],
    ["maret", "03"],
    ["april", "04"],
    ["mei", "05"],
    ["juni", "06"],
    ["juli", "07"],
    ["agustus", "08"],
    ["september", "09"],
    ["oktober", "10"],
    ["november", "11"],
    ["desember", "12"],
  ]);

  // Split the string into components
  const [_, day, month, year] = dateString
    .trim()
    .toLowerCase()
    .split(/[,\s]+/);

  // Get the month number
  const monthNumber = monthMap.get(month);

  if (!monthNumber) {
    return "";
  }

  // Pad the day with a leading zero if necessary
  const paddedDay = day.padStart(2, "0");

  // Return the date in YYYY-MM-DD format
  return `${year}-${monthNumber}-${paddedDay}`;
}

function getYyyymmddhhmmss(date: Date) {
  const pad = (num: number) => num.toString().padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(
    date.getDate()
  )}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}
// END OF HELPER FUNCTIONS

// REQUEST QUEUE
const requestQueue = await RequestQueue.open();

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
// END OF REQUEST QUEUE

// CRAWLER
const crawler = new CheerioCrawler(
  {
    // Comment this option to scrape the full website.
    requestQueue: requestQueue,
    async requestHandler({ $, request, pushData }) {
      // Extract data from the page
      const title = $("h1").text().toLowerCase();
      const article = $(".wrap__article-detail-content")
        .contents()
        .filter(function () {
          return this.nodeType === 3;
        })
        .text()
        .trim()
        .replace(/(\r\n|\n|\r|\t)/gm, "")
        .toLowerCase();

      const articleMetadata = $(".text-muted.mt-2.small").text().toLowerCase();
      let author = "";

      if (articleMetadata.includes("editor")) {
        author = articleMetadata.split("editor: ")[1].split("\t")[0];
      }

      const date = convertToDateString(
        $(".text-secondary.font-weight-normal")
          .contents()
          .filter(function () {
            return this.nodeType === 3;
          })
          .text()
          .trim()
      );

      const beritaId = parseInt(request.uniqueKey);
      const nextBeritaId = beritaId + 10;

      // if max berita id reached, stop
      if (beritaId > MAX_BERITA_ID) {
        return;
      }

      if (title && article) {
        // save data
        await pushData({
          crawl_datetime: new Date().toISOString(),
          platform: PLATFORM,
          url: request.url,
          title,
          article,
          author,
          date,
        });
      }

      await requestQueue.addRequests([
        {
          url: `https://www.antaranews.com/berita/${nextBeritaId}`,
          uniqueKey: `${nextBeritaId}`,
        },
      ]);
    },
  },
  config
);

await crawler.run();
// END OF CRAWLER

// WRITE TO CSV
await crawler.getDataset().then((dataset) => {
  return dataset.exportToCSV(PLATFORM, { toKVS: PLATFORM });
});

// move the csv file to the output folder
const oldPath = path.join(
  __dirname,
  "..",
  "..",
  "storage",
  "key_value_stores",
  PLATFORM,
  `${PLATFORM}.csv`
);
const currentYyyymmddhhmmss = getYyyymmddhhmmss(new Date());
const newPath = path.join(
  __dirname,
  "..",
  "..",
  "output",
  `${currentYyyymmddhhmmss}_${PLATFORM}.csv`
);

// create the output folder if it doesn't exist
fs.mkdir(
  path.dirname(newPath),
  {
    recursive: true,
  },
  (err) => {
    if (err) {
      console.error(err);
      return;
    }
  }
);

fs.rename(oldPath, newPath, (err) => {
  if (err) {
    console.error(err);
    return;
  }

  log.info(`File moved to ${newPath}`);
});
// END OF WRITE TO CSV
