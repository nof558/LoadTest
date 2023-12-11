import AWSAccountManager from './aws/AWSAccountManager.js';
import {awsConfig, numberOfAccounts} from './aws/awsAccountConfigs.js';
import Organization from './aws/Organization.js';

export async function initAWSAccounts() {
	console.log('Starting organization creation...');
	const organization = new Organization();
	await organization.createOrganization();
	console.log('Organization creation completed.');

	const accountManager = new AWSAccountManager();

	for (let i = 0; i < numberOfAccounts; i++) {
		const config = awsConfig[i % awsConfig.length];
		try {
			console.log(`Adding account with config: ${config.accountId}`);
			await organization.addAccount(config);
			console.log(`Account added to organization with config: ${config.accountId}`);

			const accountIdentifier = await accountManager.initializeAccount(config);
			console.log(`Account initialized in AWSAccountManager with identifier: ${accountIdentifier}`);
		} catch (error) {
			console.error(`Error in account initialization:`, error);
		}
	}
}

// Execute the function
initAWSAccounts().catch(error => console.error('Initialization failed:', error));