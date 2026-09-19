import { cryptoUtils } from '../utils/cryptoUtils';

async function run() {
  const cases = [
    'PVsyHn8VhEvpLIPbprIDAQ==',
    'Candidate has been matched for Senior Flutter Developer.',
    'HVdQfB473SqVTDnQrbJICg==',
    'Hello World',
    'Short',
    'HVsQMDg76yjHSTOhzcUofGzE0ydbGw/CyaIoSia8P62p+Wp3wcikpupsFTf5TmcY'
  ];

  for (const c of cases) {
    const res = await cryptoUtils.decrypt(c);
    console.log(`Input:  "${c}"\nOutput: "${res}"\n`);
  }
}

run();
