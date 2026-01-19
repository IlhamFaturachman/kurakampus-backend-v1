import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class QueueService {
  private aiQueue: Queue;

  constructor(private config: ConfigService) {
    this.aiQueue = new Queue('ai-tasks', {
      connection: {
        host: config.get('REDIS_HOST'),
        port: config.get('REDIS_PORT'),
      },
    });
  }

  async addAITask(data: any) {
    const job = await this.aiQueue.add('process', data);
    return { jobId: job.id };
  }

  async getJobStatus(jobId: string) {
    const job = await this.aiQueue.getJob(jobId);
    if (!job) return null;
    
    return {
      id: job.id,
      status: await job.getState(),
      progress: job.progress,
      data: job.data,
      result: job.returnvalue,
    };
  }
}
