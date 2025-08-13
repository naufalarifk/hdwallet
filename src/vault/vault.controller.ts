import { Controller, Post, Get, Body, Param, ParseIntPipe, Logger } from '@nestjs/common';
import { VaultService } from './vault.service';
import { AppRoleLoginDto, VaultResponse } from './vault.dto';
import { AxiosResponse } from 'axios';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Controller('vault')
export class VaultController {
    private readonly logger = new Logger(VaultController.name);
    constructor(private readonly vaultService: VaultService) {}

    @Post('approle/login')
    appRoleLogin(@Body() appRoleLoginDto: AppRoleLoginDto): Observable<VaultResponse> {
        const { role_id, secret_id } = appRoleLoginDto;
        this.logger.log('Attempting AppRole login...');
        this.logger.debug(`Role ID: ${role_id}, Secret ID: ${secret_id}`);
        
        return this.vaultService.appRoleLogin(appRoleLoginDto).pipe(
            map((response: AxiosResponse<VaultResponse>) => {
                this.logger.log('AppRole login successful');
                return {
                    ...response.data,
                    status: response.status,
                    statusText: response.statusText
                };
            }),
            catchError((error) => {
                this.logger.error('AppRole login failed', error.message);
                return throwError(() => error);
            })
        );
    }
}