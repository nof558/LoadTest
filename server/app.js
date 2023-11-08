import express from 'express';
import bodyParser from 'body-parser';
import { awsAccountManager } from '../aws/AWSAccountManager';
import { createResources, harvestResources, cleanupResources } from '../simulator';

const app = express();
const port = 3000;

app.use(bodyParser.json());

app.post('/init', async (req, res) => {
  const { roleArn, awsConfig } = req.body;
  try {
    const accountIdentifier = await awsAccountManager.initializeAccount(roleArn, awsConfig);
    res.json({ accountIdentifier });
  } catch (error) {
    console.error('Error during account initialization:', error.message);
    res.status(500).send('Failed to initialize account. Check server logs for details.');
  }
});

app.post('/create', async (req, res) => {
  const { accountIdentifier } = req.body;
  try {
    const awsClients = await awsAccountManager.getAWSClients(accountIdentifier);
    await createResources(awsClients);
    res.send('Resources Created');
  } catch (error) {
    console.error('Error during resource creation:', error.message);
    res.status(500).send('Failed to create resources. Check server logs for details.');
  }
});

app.post('/harvest', async (req, res) => {
  const { accountIdentifier } = req.body;
  try {
    const awsClients = await awsAccountManager.getAWSClients(accountIdentifier);
    const harvestedData = await harvestResources(awsClients);
    res.json(harvestedData);
  } catch (error) {
    console.error('Error during resource harvesting:', error.message);
    res.status(500).send('Failed to harvest resources. Check server logs for details.');
  }
});

app.post('/cleanup', async (req, res) => {
  const { accountIdentifier } = req.body;
  try {
    const awsClients = await awsAccountManager.getAWSClients(accountIdentifier);
    await cleanupResources(awsClients);
    res.send('Resources Cleaned Up');
  } catch (error) {
    console.error('Error during resource cleanup:', error.message);
    res.status(500).send('Failed to clean up resources. Check server logs for details.');
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
