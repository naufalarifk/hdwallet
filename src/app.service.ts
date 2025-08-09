import { Injectable } from '@nestjs/common';
import { Cat } from './types';





@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getHey(): string {
    return 'Tempik!'
  }

getCats(): Cat[] {
    return [
      { name: 'Mittens', age: 2 },
      { name: 'Whiskers', age: 3 },
      { name: 'Shadow', age: 1 },
      { name: 'Simba', age: 4 },
      { name: 'Luna', age: 5 },
      { name: 'Oliver', age: 6 },
      { name: 'Leo', age: 7 },
      { name: 'Popon', age: 8 },
      { name: 'Bella', age: 9 },
      { name: 'Charlie', age: 10 },
    ];
  }
}
