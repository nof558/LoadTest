export const awsConfig = [
	{
	  "roleArn": "arn:aws:iam::123456789012:role/Test",
	  "awsConfig": {
		"region": "us-east-1",
		"entityConfig": {
		  "ec2Instances": 15,
		  "s3Buckets": 3,
		  "lambdaFunctions": 3,
		  "sqsQueues": 4
		}
	  }
	},
	{
	  "roleArn": "arn:aws:iam::210987654321:role/Test2",
	  "awsConfig": {
		"region": "eu-west-2",
		"entityConfig": {
		  "ec2Instances": 10,
		  "s3Buckets": 7,
		  "lambdaFunctions": 3,
		  "sqsQueues": 1
		}
	  }
	}
  ]
