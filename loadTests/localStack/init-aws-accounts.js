import AWSAccountManager from './aws/AWSAccountManager.js';
import {awsConfig, numberOfAccounts} from './aws/awsAccountConfigs.js';
import Organization from './aws/Organization.js';
import {generateUniqueAccountId, simulateDelay} from './config/config.js';

export async function initAWSAccounts() {
	console.log('Starting organization creation...');
	const organization = new Organization();
	await organization.createOrganization();
	console.log('Organization creation completed.');

	const accountManager = new AWSAccountManager();

	for (let i = 0; i < numberOfAccounts; i++) {
		const config = awsConfig[i % awsConfig.length];
		const uniqueAccountId = generateUniqueAccountId(i);
		const uniqueRoleArn = `arn:aws:iam::${uniqueAccountId}:role/TEST${i}`;
		const accountConfigWithIds = {
			...config,
			accountId: uniqueAccountId,
			roleArn: uniqueRoleArn
		};
		try {
			console.log(`Adding account with config: ${accountConfigWithIds.accountId}`);
			await organization.addAccount(accountConfigWithIds);
			console.log(`Account added to organization with config: ${accountConfigWithIds.accountId}`);

			// Simulate a delay for account creation
			await simulateDelay(1000); // 1s delay

			const accountIdentifier = await accountManager.initializeAccount(accountConfigWithIds);
			console.log(`Account initialized in AWSAccountManager with identifier: ${accountIdentifier}`);
		} catch (error) {
			console.error(`Error in account initialization:`, error);
		}
	}
}

// Execute the function
initAWSAccounts().catch(error => console.error('Initialization failed:', error));