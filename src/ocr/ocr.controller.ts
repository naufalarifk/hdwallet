import { Body, Controller, Post } from "@nestjs/common";
import { OcrService } from "./ocr.service";

@Controller("ocr")
export class OcrController {
    constructor(private readonly ocrService: OcrService) {
      
  }
    @Post("recognize")
    async recognize(@Body("imagePath") imagePath: string): Promise<string> {
      return this.ocrService.recognizeText(imagePath);
    }
  }
