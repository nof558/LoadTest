import AWS from 'aws-sdk';

// Configure AWS SDK to use LocalStack
AWS.config.update({
    endpoint: 'http://localhost:4566',
    region: 'us-east-1',
    sslEnabled: false,
    s3ForcePathStyle: true,
});

// Initialize STS client
const sts = new AWS.STS({ endpoint: 'http://localhost:4566' });

async function getTemporaryCredentials() {
    const params = {
        RoleArn: 'arn:aws:iam::123456789012:role/YourRoleName',
        RoleSessionName: 'LocalStackSession',
    };
    return sts.assumeRole(params).promise();
}

async function getOrganizationInfo(credentials) {
    const organizations = new AWS.Organizations({
        credentials: credentials,
        region: 'us-east-1',
    });

    try {
        console.log('Retrieving organization info...');
        const response = await organizations.describeOrganization().promise();
        console.log('Organization Info:', response.Organization);
    } catch (error) {
        console.error('Error retrieving organization info:', error);
    }
}

async function main() {
    try {
        const assumedRole = await getTemporaryCredentials();
        const temporaryCredentials = new AWS.Credentials({
            accessKeyId: assumedRole.Credentials.AccessKeyId,
            secretAccessKey: assumedRole.Credentials.SecretAccessKey,
            sessionToken: assumedRole.Credentials.SessionToken,
        });
        await getOrganizationInfo(temporaryCredentials);
    } catch (error) {
        console.error('Error assuming role:', error);
    }
}

main();