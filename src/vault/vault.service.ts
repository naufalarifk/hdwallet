import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { Observable } from 'rxjs';
import { VaultResponse } from './vault.dto';


@Injectable()
export class VaultService {
    constructor(private readonly httpService: HttpService) { }

    appRoleLogin({role_id, secret_id}: {role_id: string, secret_id: string}): Observable<AxiosResponse<VaultResponse>> {
        return this.httpService.post('http://127.0.0.1:8200/v1/auth/approle/login', {
            role_id: role_id,
            secret_id: secret_id,
        });
    }
}
