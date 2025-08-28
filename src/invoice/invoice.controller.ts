import { Controller } from '@nestjs/common';
import { InvoiceService } from './invoice.service';

@Controller()
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}
}
