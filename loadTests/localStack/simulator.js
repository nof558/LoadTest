import {EC2Client, RunInstancesCommand, DescribeInstancesCommand, TerminateInstancesCommand} from '@aws-sdk/client-ec2';
import {LambdaClient, CreateFunctionCommand, GetFunctionCommand, DeleteFunctionCommand} from '@aws-sdk/client-lambda';
import {SQSClient, CreateQueueCommand, GetQueueUrlCommand, ListQueuesCommand, DeleteQueueCommand} from '@aws-sdk/client-sqs';
import {IAMClient, CreateRoleCommand, GetRoleCommand, DeleteRoleCommand} from '@aws-sdk/client-iam';
import {S3Client, CreateBucketCommand, ListBucketsCommand, DeleteBucketCommand} from '@aws-sdk/client-s3';
import {params, config, createZipBuffer, generateUniqueId} from './config/config.js';

const ec2 = new EC2Client(config);
const iam = new IAMClient(config);
const s3 = new S3Client(config);
const sqs = new SQSClient(config);
const lambda = new LambdaClient(config);

let cleanupInProgress = false;

const createEc2Instance = async () => {
	try {
		console.log('Starting resource creation...');
		const uniqueName = `mockEc2Instance_${generateUniqueId()}`;
		const command = new RunInstancesCommand(params(uniqueName));
		const instanceData = await ec2.send(command);
		console.log(`EC2 Instance with ID: ${instanceData.Instances[0].InstanceId} created.`);
		return instanceData.Instances[0].InstanceId;
	} catch (error) {
		throw error;
	}
};

const createIamRole = async () => {
	const roleName = `mockLambdaExecutionRole_${generateUniqueId()}`;
	try {
		// First, attempt to create the IAM role
		const createRoleCommand = new CreateRoleCommand({
			RoleName: roleName,
			AssumeRolePolicyDocument: JSON.stringify({
				Version: '2012-10-17',
				Statement: [
					{
						Effect: 'Allow',
						Principal: {Service: 'lambda.amazonaws.com'},
						Action: 'sts:AssumeRole',
					},
				],
			}),
		});
		const newRole = await iam.send(createRoleCommand);
		console.log(`IAM Role with ARN: ${newRole.Role.Arn} created.`);
		return {roleArn: newRole.Role.Arn, roleName};
	} catch (error) {
		// If the role already exists, log it and return its ARN
		if (error.name === 'EntityAlreadyExistsException') {
			const getRoleCommand = new GetRoleCommand({RoleName: roleName});
			const role = await iam.send(getRoleCommand);
			console.log(`IAM Role with ARN: ${role.Role.Arn} already exists.`);
			return {roleArn: newRole.Role.Arn, roleName};
		} else {
			console.error(`Error creating IAM Role: ${error.message}`);
			throw error;
		}
	}
};

const createS3Bucket = async () => {
	const bucketName = `test-bucket-${generateUniqueId()}`;
	try {
		const createBucketCommand = new CreateBucketCommand({Bucket: bucketName});
		await s3.send(createBucketCommand);
		console.log(`S3 Bucket with name: ${bucketName} created.`);
		return bucketName;
	} catch (error) {
		throw error;
	}
};

const createLambdaFunction = async (roleArn) => {
	const lambdaFunctionName = `testFunction${generateUniqueId()}`;
	try {
		const getFunctionCommand = new GetFunctionCommand({FunctionName: lambdaFunctionName});
		await lambda.send(getFunctionCommand);
		console.log(`Lambda function with name: ${lambdaFunctionName} already exists.`);
	} catch (error) {
		if (error.name === 'ResourceNotFoundException') {
			const zipBuffer = await createZipBuffer();
			const createFunctionCommand = new CreateFunctionCommand({
				FunctionName: lambdaFunctionName,
				Role: roleArn,
				Code: {ZipFile: zipBuffer},
				Handler: 'index.handler',
				Runtime: 'nodejs14.x',
			});
			await lambda.send(createFunctionCommand);
			console.log(`Lambda function with name: ${lambdaFunctionName} created.`);
			return lambdaFunctionName;
		} else {
			throw error;
		}
	}
};

const createSqsQueue = async () => {
	const sqsQueueName = `test-queue-${generateUniqueId()}`;
	try {
		const createQueueCommand = new CreateQueueCommand({QueueName: sqsQueueName});
		const data = await sqs.send(createQueueCommand);
		console.log(`SQS Queue with URL: ${data.QueueUrl} created.`);
		return data.QueueUrl;
	} catch (error) {
		if (error.name !== 'QueueAlreadyExists') {
			throw error;
		}
	}
};

const harvestResources = async (roleName, lambdaFunctionName, bucketName, sqsQueueName) => {
	// For EC2
	const describeInstancesCommand = new DescribeInstancesCommand({});
	const ec2Data = await ec2.send(describeInstancesCommand);
	ec2Data.Reservations.forEach((reservation) => {
		reservation.Instances.forEach((instance) => {
			console.log(`EC2 Instance ID: ${instance.InstanceId}, State: ${instance.State.Name}, Type: ${instance.InstanceType}`);
		});
	});

	// For S3
	const listBucketsCommand = new ListBucketsCommand({});
	const s3Data = await s3.send(listBucketsCommand);
	s3Data.Buckets.forEach((bucket) => {
		console.log(`S3 Bucket Name: ${bucket.Name}`);
	});

	// For Lambda
	const getFunctionCommand = new GetFunctionCommand({FunctionName: lambdaFunctionName});
	const lambdaData = await lambda.send(getFunctionCommand);
	console.log(`Lambda Function Name: ${lambdaData.Configuration.FunctionName}, Runtime: ${lambdaData.Configuration.Runtime}`);

	// For SQS
	const listQueuesCommand = new ListQueuesCommand({});
	const sqsData = await sqs.send(listQueuesCommand);
	sqsData.QueueUrls.forEach((queueUrl) => {
		if (queueUrl.includes(sqsQueueName)) {
			console.log(`SQS Queue URL: ${queueUrl}`);
		}
	});
};

const cleanupResources = async (roleName, lambdaFunctionName, cleanupBucketName, sqsQueueName) => {
	if (cleanupInProgress) {
		console.log('Cleanup already in progress. Exiting...');
		return;
	}
	cleanupInProgress = true;
	const cleanupStartTime = Date.now();
	console.log('Starting cleanup process...');

	// EC2
	const describeInstancesCommand = new DescribeInstancesCommand({});
	const ec2Data = await ec2.send(describeInstancesCommand);
	const instanceIds = ec2Data.Reservations.flatMap((reservation) => reservation.Instances.map((instance) => instance.InstanceId));

	if (instanceIds.length) {
		const terminateInstancesCommand = new TerminateInstancesCommand({InstanceIds: instanceIds});
		await ec2.send(terminateInstancesCommand);
	}
	console.log('Cleaned up EC2 instances.');

	// S3
	const harvestBucketName = `test-bucket-${uniqueId}`;
	await deleteS3BucketObjects(cleanupBucketName);
	const deleteBucketCommand = new DeleteBucketCommand({Bucket: cleanupBucketName});
	await s3.send(deleteBucketCommand);
	console.log(`Cleaned up S3 bucket: ${cleanupBucketName}`);

	// Lambda
	const deleteFunctionCommand = new DeleteFunctionCommand({FunctionName: lambdaFunctionName});
	await lambda.send(deleteFunctionCommand);
	console.log(`Cleaned up Lambda function: ${lambdaFunctionName}`);

	// SQS
	const getQueueUrlCommand = new GetQueueUrlCommand({QueueName: sqsQueueName});
	const {QueueUrl} = await sqs.send(getQueueUrlCommand);
	const deleteQueueCommand = new DeleteQueueCommand({QueueUrl});
	await sqs.send(deleteQueueCommand);
	console.log(`Cleaned up SQS queue: ${QueueUrl}`);

	// IAM
	const deleteRoleCommand = new DeleteRoleCommand({RoleName: roleName});
	await iam.send(deleteRoleCommand);
	console.log(`Cleaned up IAM role: ${roleName}`);

	// Stats
	const cleanupDuration = Date.now() - cleanupStartTime;
	console.log(`Cleanup completed in ${cleanupDuration} ms.`);
	cleanupInProgress = false;

	// Post cleanUp check
	const postCleanupEc2Data = await ec2.send(new DescribeInstancesCommand({}));
	if (postCleanupEc2Data.Reservations.length === 0) {
		console.log('All EC2 instances successfully terminated.');
	} else {
		console.log(`Warning: ${postCleanupEc2Data.Reservations.length} EC2 instances still exist post-cleanup.`);
	}
};

// Main resource creation function
const createResources = async () => {
	try {
		const {roleName, roleArn} = await createIamRole();
		await createEc2Instance();
		await createS3Bucket();
		await createLambdaFunction(roleArn);
		await createSqsQueue();
		console.log('All resources created successfully.');
	} catch (error) {
		console.error('Error during resource creation:', error.message);
	}
};

export {createResources, harvestResources, cleanupResources};
