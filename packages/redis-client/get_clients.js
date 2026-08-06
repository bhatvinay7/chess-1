import { createClient } from 'redis';
async function run() {
  const client = createClient();
  await client.connect();
  const info = await client.info('clients');
  console.log(info);
  const clients = await client.clientList();
  console.log('Total clients:', clients.length);
  process.exit(0);
}
run().catch(console.error);
