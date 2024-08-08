// For more information, see https://crawlee.dev/
import { RequestQueue, CheerioCrawler, log } from "crawlee";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the current file
const __dirname = path.dirname(__filename); // get the name of the current directory

const REQUEST_LENGTH = 10;
const PLATFORM = "antaranews";
// const MAX_BERITA_ID = 4242883;
const MAX_BERITA_ID = 4136356; // 100000 berita
const START_BERITA_ID = 4036356; // SET TO 0 TO START FROM THE BEGINNING
const KATA_KUNCI = [
  "pinjaman pemerintah",
  "surat utang",
  "investor asing",
  "wakaf",
  "sbn ritel",
  "surat berharga syariah negara",
  "sbsn",
  "pembiayaan",
  "sukuk",
  "hibah",
  "surat berharga negara",
  "kreditur pemerintah",
  "pdn",
  "ekspor",
  "aset",
  "penjamin",
  "risiko kredit",
  "ori",
  "pasar obligasi",
  "obligasi negara",
  "inflasi",
  "suku bunga",
  "sun",
  "jatuh tempo",
  "nilai tukar",
  "kepemilikan asing",
  "yield",
  "ust",
  "us treasury",
  "surat utang negara",
  "obligasi pemerintah",
  "obligasi ritel indonesia",
  "sbn",
  "kebijakan moneter",
  "likuiditas pasar",
  "imbal hasil",
  "pasar global",
  "rating kredit",
  "sentimen pasar",
  "pasar sekunder",
  "economic growth",
  "inflation rates",
  "interest rates",
  "monetary policy",
  "geopolitical tensions",
  "market volatility",
  "risk appetite",
  "safe haven demand",
  "credit ratings",
  "economic indicators",
  "global trade",
  "currency earnings",
  "currency fluctuations",
  "commodity prices",
  "fiscal policy",
  "debt levels",
  "liquidity conditions",
  "global supply chains",
  "political events",
  "investors sentiments",
];

//
// HELPER FUNCTIONS
//
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
//
// END OF HELPER FUNCTIONS
//

//
// REQUEST QUEUE
//
const requestQueue = await RequestQueue.open();

await requestQueue.addRequests(
  Array.from({ length: REQUEST_LENGTH }, (_, i) => i + START_BERITA_ID).map(
    (num) => {
      return {
        url: `https://www.antaranews.com/berita/${num}`,
        uniqueKey: num.toString(),
      };
    }
  )
);
//
// END OF REQUEST QUEUE
//

//
// CRAWLER
//
const crawler = new CheerioCrawler({
  requestQueue: requestQueue,
  // proxyConfiguration: proxyConfiguration,
  async requestHandler({ $, request, pushData }) {
    // if true, mean the page is correct news. Save the data
    if (request.loadedUrl.startsWith(request.url)) {
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

      // if article does not contain any of the keywords, skip
      // if (
      //   KATA_KUNCI.some((keyword) => {
      //     // Escape special regex characters in the search word
      //     const escapedKeyword = keyword.replace(
      //       /[.*+?^${}()|[\]\\]/g,
      //       "\\$&"
      //     );

      //     // Create a regex that matches the word surrounded by word boundaries or punctuation
      //     const keywordRegex = new RegExp(
      //       `(^|[^a-zA-Z0-9])${escapedKeyword}($|[^a-zA-Z0-9])`,
      //       "i"
      //     );

      //     return keywordRegex.test(article) || keywordRegex.test(title);
      //   })
      // ) {
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
      // }
    }

    const beritaId = parseInt(request.uniqueKey);
    const nextBeritaId = beritaId + REQUEST_LENGTH;

    // if max berita id reached, stop
    if (beritaId > MAX_BERITA_ID) {
      return;
    }

    await requestQueue.addRequests([
      {
        url: `https://www.antaranews.com/berita/${nextBeritaId}`,
        uniqueKey: `${nextBeritaId}`,
      },
    ]);
  },
  async failedRequestHandler({ request }) {
    log.error(`Request ${request.url} failed too many times`);

    const beritaId = parseInt(request.uniqueKey);
    const nextBeritaId = beritaId + REQUEST_LENGTH;

    // if max berita id reached, stop
    if (beritaId > MAX_BERITA_ID) {
      return;
    }

    await requestQueue.addRequests([
      {
        url: `https://www.antaranews.com/berita/${nextBeritaId}`,
        uniqueKey: `${nextBeritaId}`,
      },
    ]);
  },
});

await crawler.run();
//
// END OF CRAWLER
//

//
// WRITE TO CSV
//
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
//
// END OF WRITE TO CSV
//
