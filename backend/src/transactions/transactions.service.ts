import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';

@Injectable()
export class TransactionsService {
  async triggerDeductionScript(): Promise<string> {
    return new Promise((resolve, reject) => {
      exec('npx ts-node src/scripts/test-deduction.ts', { cwd: 'c:\\Users\\Ridham Goyal\\Desktop\\Project\\backend' }, (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          reject(`Error executing script: ${stderr}`);
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
        resolve(`Script output:\n${stdout}\n${stderr}`);
      });
    });
  }
}