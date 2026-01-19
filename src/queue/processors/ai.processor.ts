import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';

@Processor('ai-tasks')
export class AIProcessor extends WorkerHost {
  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job) {
    console.log('Processing AI task:', job.id);
    
    // Update job status in database
    await this.prisma.job.create({
      data: {
        id: job.id as string,
        type: 'ai-task',
        status: 'processing',
        data: job.data,
      },
    });

    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const result = {
      processed: true,
      timestamp: new Date(),
      input: job.data,
    };

    // Update job with result
    await this.prisma.job.update({
      where: { id: job.id as string },
      data: {
        status: 'completed',
        result,
      },
    });

    return result;
  }
}
