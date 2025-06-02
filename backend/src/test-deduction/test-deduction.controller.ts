import { Controller, Post, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { exec } from 'child_process';
import { join } from 'path';

@Controller('test-deduction')
export class TestDeductionController {
  @Post()
  runScript(@Res() res: Response) {
    // Always use the source script path
    const scriptPath = join(process.cwd(), 'src', 'scripts', 'test-deduction.ts');
    const npxPath = join(process.cwd(), 'node_modules', '.bin', 'ts-node');
    exec(`"${npxPath}" "${scriptPath}"`, { cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: stderr || 'Script failed.' });
      }
      res.json({ message: stdout || 'Script ran successfully!' });
    });
  }
} 