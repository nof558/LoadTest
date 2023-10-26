// import AWS from 'aws-sdk';
// import { config } from '../config/config.js';

// const iam = new AWS.IAM(config);

// const createIamRole = async () => {
// 	try {
// 		const {Role} = await iam.getRole({RoleName: roleName}).promise();
// 		return Role.Arn;
// 	} catch (error) {
// 		if (error.code === 'NoSuchEntity') {
// 			const {Role} = await iam
// 				.createRole({
// 					RoleName: roleName,
// 					AssumeRolePolicyDocument: JSON.stringify({
// 						Version: '2012-10-17',
// 						Statement: [
// 							{
// 								Effect: 'Allow',
// 								Principal: {Service: 'lambda.amazonaws.com'},
// 								Action: 'sts:AssumeRole',
// 							},
// 						],
// 					}),
// 				})
// 				.promise();
// 			return Role.Arn;
// 		}
// 		throw error;
// 	}
// };