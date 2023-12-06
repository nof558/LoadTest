import AWSAccountManager from './aws/AWSAccountManager.js';
import { awsConfig } from './aws/awsAccountConfigs.js';
import Organization from './aws/Organization.js';

export async function initAWSAccounts() {
	const organization = new Organization();
	await organization.createOrganization(); // Create the organization

	const accountManager = new AWSAccountManager();

	for (const config of awsConfig) {
		try {
			// Create and add account to the organization
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
