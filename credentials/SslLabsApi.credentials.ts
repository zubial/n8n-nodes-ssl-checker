import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class SslLabsApi implements ICredentialType {
	name = 'sslLabsApi';

	displayName = 'SslLabs API';

	properties: INodeProperties[] = [
		{
			displayName: 'Organization',
			name: 'organization',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: 'First Name',
			name: 'first_name',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: 'Last Name',
			name: 'last_name',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			required: true,
			default: '',
		},
	];
}
