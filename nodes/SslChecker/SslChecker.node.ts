import {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IExecuteFunctions,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	sleep,
} from 'n8n-workflow';
import { IHttpRequestOptions } from 'n8n-workflow/dist/Interfaces';

export class SslChecker implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SSL Checker',
		name: 'sslChecker',
		icon: 'file:SslCheckerLogo.svg',
		group: ['output'],
		version: 1,
		triggerPanel: false,
		description: 'Check a certificate',
		subtitle: '={{$parameter["operation"]}}',
		defaults: {
			name: 'SSL Checker',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				displayName: 'SslLabs API',
				name: 'sslLabsApi',
				required: true,
				displayOptions: {
					show: {
						operation: ['ssllabs_scan', 'ssllabs_endpoint_analyze'],
					},
				},
				testedBy: 'sslLabsConnectionTest',
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				required: true,
				options: [
					{
						name: 'Quick Check Certificate',
						value: 'ssl_checker',
						action: 'Quick check a certificate',
						description: 'Quick check a certificate (using ssl-checker.io)',
					},
					{
						name: 'Full Scan Certificate',
						value: 'ssllabs_scan',
						action: 'Full scan a certificate',
						description: 'Full scan a certificate (using ssllabs.com)',
					},
					{
						name: 'Retrieve Endpoint Analyze',
						value: 'ssllabs_endpoint_analyze',
						action: 'Retrieve endpoint analyze',
						description: 'Retrieve endpoint analyze (using ssllabs.com)',
					},
				],
				default: 'ssl_checker',
				noDataExpression: true,
			},
			{
				displayName: 'Target Domain',
				name: 'target',
				type: 'string',
				required: true,
				default: 'google.com',
				description: 'Define the target domain',
			},
			{
				displayName: 'Target Endpoint',
				name: 'target_endpoint',
				type: 'string',
				required: true,
				default: '8.8.8.8',
				displayOptions: {
					show: {
						operation: ['ssllabs_endpoint_analyze'],
					},
				},
				description: 'Define the target endpoint',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Put Result in Field',
						name: 'result_field',
						type: 'string',
						default: 'ssl',
						description: 'The name of the output field to put the data in',
					},
				],
			},
		],
	};

	methods = {
		credentialTest: {
			async sslLabsConnectionTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data;

				const httpOptions: IHttpRequestOptions = {
					method: 'POST',
					url: `https://api.ssllabs.com/api/v4/register`,
					headers: {
						Accept: 'application/json',
						'Content-Type': 'application/json',
					},
					json: true,
					body: {
						firstName: credentials!.first_name,
						lastName: credentials!.last_name,
						email: credentials!.email,
						organization: credentials!.organization,
					},
				};

				try {
					await this.helpers.request(httpOptions);
				} catch (error) {
					return {
						status: 'Error',
						message: error,
					};
				}

				return {
					status: 'OK',
					message: 'Connection successful!',
				};
			},
		},
	};
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		let item: INodeExecutionData;
		const returnItems: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			item = { ...items[itemIndex] };
			const newItem: INodeExecutionData = {
				json: item.json,
				pairedItem: {
					item: itemIndex,
				},
			};

			// Parameters & Options
			const operation = this.getNodeParameter('operation', itemIndex);
			const target = this.getNodeParameter('target', itemIndex);
			const options = this.getNodeParameter('options', itemIndex);
			const result_field = options.result_field ? (options.result_field as string) : 'ssl';

			if (operation == 'ssl_checker') {
				let sslCheckerOptions: IHttpRequestOptions = {
					method: 'GET',
					url: `https://ssl-checker.io/api/v1/check/${target}`,
					headers: {
						Accept: 'application/json',
						'Content-Type': 'application/json',
					},
				};

				newItem.json[result_field] = await this.helpers.httpRequest(sslCheckerOptions);
			} else if (operation == 'ssllabs_scan') {
				const credentials = await this.getCredentials('sslLabsApi');

				let httpOptions: IHttpRequestOptions = {
					method: 'GET',
					url: `https://api.ssllabs.com/api/v4/analyze?host=${target}&maxAge=24`,
					headers: {
						Accept: 'application/json',
						'Content-Type': 'application/json',
						email: credentials.email,
					},
				};

				let result = await this.helpers.httpRequest(httpOptions);
				while (result.status !== 'READY' && result.status !== 'ERROR') {
					result = await this.helpers.httpRequest(httpOptions);
					console.log('SSLabs :' + JSON.stringify(result));
					await sleep(10 * 1000);
				}

				newItem.json[result_field] = result;
			} else if (operation == 'ssllabs_endpoint_analyze') {
				const target_endpoint = this.getNodeParameter('target_endpoint', itemIndex);
				const credentials = await this.getCredentials('sslLabsApi');

				let httpOptions: IHttpRequestOptions = {
					method: 'GET',
					url: `https://api.ssllabs.com/api/v4/getEndpointData?host=${target}&s=${target_endpoint}`,
					headers: {
						Accept: 'application/json',
						'Content-Type': 'application/json',
						email: credentials.email,
					},
				};

				newItem.json[result_field + '.analyze'] = await this.helpers.httpRequest(httpOptions);
			}

			returnItems.push(newItem);
		}

		return [returnItems];
	}
}
