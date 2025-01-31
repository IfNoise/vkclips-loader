import { igdl } from 'btch-downloader';

const url = 'https://www.instagram.com/p/DDeVu4bqV-7';

async function run() {
  try {
    const dataList = await igdl(url);
    console.log(dataList);
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
