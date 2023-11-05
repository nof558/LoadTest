import express from 'express';
import rateLimit from 'express-rate-limit';
import {createResources, harvestResources, cleanupResources} from '../simulator.js';

// Define a limiter middleware
const createResourcesLimiter = rateLimit({
	windowMs: 0.01 * 60 * 1000, // 1 sec
	max: 4, // limit to 100 requests per windowMs
	message: 'Too many resource creation requests, please try again later.',
});

const app = express();
const port = 3000;
// apply to all requests
app.use(createResourcesLimiter);

app.get('/create', async (req, res) => {
	try {
		console.log('Starting resource creation...');
		await createResources();
		console.log('Resource creation completed.');
		res.send('Resources Created');
	} catch (error) {
		console.error('Error during resource creation:', error.message);
		res.status(500).send('Failed to create resources. Check server logs for details.');
	}
});

app.get('/harvest', async (req, res) => {
	try {
		await harvestResources();
		res.send('Resources Harvested');
	} catch (error) {
		console.error('Error during resource harvesting:', error.message);
		res.status(500).send('Failed to harvest resources. Check server logs for details.');
	}
});

app.get('/cleanup', async (req, res) => {
	try {
		await cleanupResources();
		res.send('Resources Cleaned Up');
	} catch (error) {
		console.error('Error during resource cleanup:', error.message);
		res.status(500).send('Failed to clean up resources. Check server logs for details.');
	}
});

app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}`);
});
