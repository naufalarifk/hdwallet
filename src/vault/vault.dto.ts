import { IsNotEmpty, IsString } from 'class-validator';

export class AppRoleLoginDto {
  @IsNotEmpty({ message: 'Role ID is required' })
  @IsString({ message: 'Role ID must be a string' })
  role_id: string;

  @IsNotEmpty({ message: 'Secret ID is required' })
  @IsString({ message: 'Secret ID must be a string' })
  secret_id: string;
}


type VaultAuth = {
    client_token: string;
    accessor: string;
    policies: string[];
    token_policies: string[];
    metadata: {
        role_name: string;
    };
    lease_duration: number;
    renewable: boolean;
    entity_id: string;
    token_type: string;
    orphan: boolean;
    mfa_requirement: null;
    num_uses: number;
};


export type VaultResponse = {
    data: {
        request_id: string;
        lease_id: string;
        renewable: boolean;
        lease_duration: number;
        data: null;
        wrap_info: null;
        warnings: null;
        auth: VaultAuth;
        mount_type: string;
    };
    status: number;
    statusText: string;
};

