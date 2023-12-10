import AWS from 'aws-sdk';

AWS.config.update({
    endpoint: 'http://localhost:4566',
    region: 'us-east-1',
    sslEnabled: false,
    s3ForcePathStyle: true,
});

const organizations = new AWS.Organizations();

async function getOrganizationInfo() {
	try {
		console.log('Retrieving organization info...');
		const response = await organizations.describeOrganization().promise();
		console.log('Organization Info:', response.Organization);
	} catch (error) {
		console.error('Error retrieving organization info:', error);
	}
}

getOrganizationInfo();
