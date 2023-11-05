// import AWS from 'aws-sdk';
// import { config, createZipBuffer } from '../config/config.js';

// const lambda = new AWS.Lambda(config);

// export const createLambdaFunction = async (roleArn) => {
// 	try {
// 		await lambda.getFunction({FunctionName: lambdaFunctionName}).promise();
// 	} catch (error) {
// 		if (error.code === 'ResourceNotFoundException') {
// 			const zipBuffer = await createZipBuffer();
// 			await lambda
// 				.createFunction({
// 					FunctionName: lambdaFunctionName,
// 					Role: roleArn,
// 					Code: {ZipFile: zipBuffer},
// 					Handler: 'index.handler',
// 					Runtime: 'nodejs14.x',
// 				})
// 				.promise();
// 		} else {
// 			throw error;
// 		}
// 	}
// };