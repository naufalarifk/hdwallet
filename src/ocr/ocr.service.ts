import { Injectable } from "@nestjs/common";
import * as Tesseract from "node-tesseract-ocr"

@Injectable()
export class OcrService {
  constructor() {}

  async recognizeText(imagePath: string): Promise<string> {
    const config = {
      lang: "ind",
      oem: 1,
      psm: 3,
    };

    try {
      const text = await Tesseract.recognize(imagePath, config);
      return text;
    } catch (error) {
      throw new Error(`OCR error: ${error.message}`);
    }
  }
}

