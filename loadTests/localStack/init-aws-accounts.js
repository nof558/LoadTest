import AWSAccountManager from './aws/AWSAccountManager.js';
import { awsConfig } from './aws/awsAccountConfigs.js';
import Organization from './aws/Organization.js';

export async function initAWSAccounts() {
	console.log('Starting organization creation...');
	const organization = new Organization();
	await organization.createOrganization(); // Create the organization
	console.log('Organization creation completed.');

	const accountManager = new AWSAccountManager();

	for (const config of awsConfig) {
		try {
			// Create and add account to the organization
			console.log(`Adding account with config: ${config.accountId}`);
			await organization.addAccount(config);
			console.log(`Account added to organization with config: ${config.accountId}`);

			// Initialize account in AWSAccountManager for further management
			const accountIdentifier = await accountManager.initializeAccount(config.roleArn, config);
			console.log(`Account initialized in AWSAccountManager with identifier: ${accountIdentifier}`);
		} catch (error) {
			console.error(`Error in account initialization:`, error);
		}
	}
}
