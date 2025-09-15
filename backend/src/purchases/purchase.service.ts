import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Course } from 'src/courses/types/course.entity';
import { Role } from 'src/users/types/role.enum';
import { User } from 'src/users/types/user.entity';
import { Repository } from 'typeorm';
import { ProMembershipDuration } from './types/purchase.dto';
import { Stripe } from 'stripe';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PurchaseService {
  private readonly logger = new Logger(PurchaseService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @Inject('STRIPE_CLIENT')
    private readonly stripe: Stripe,
    private readonly configService: ConfigService,
  ) {}

  async purchaseCourse(userId: number, courseId: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['purchased_courses'],
    });
    const course = await this.courseRepository.findOneBy({ id: courseId });

    if (!user || !course) {
      throw new NotFoundException('User or Course not found.');
    }

    const alreadyOwns = user.purchased_courses.some((c) => c.id === course.id);
    if (alreadyOwns) {
      throw new BadRequestException('You have already purchased this course.');
    }

    user.purchased_courses.push(course);
    user.token_version = (user.token_version || 0) + 1;
    return this.userRepository.save(user);
  }

  async upgradeToPro(userId: number, duration: ProMembershipDuration): Promise<User> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found.');
    if (user.role === Role.Admin) throw new BadRequestException('Admins cannot be downgraded to Pro.');

    const now = new Date();
    const expiryDate = duration === ProMembershipDuration.Monthly
      ? new Date(now.setMonth(now.getMonth() + 1))
      : new Date(now.setFullYear(now.getFullYear() + 1));

    user.role = Role.Pro;
    user.pro_membership_expires_at = expiryDate;
    user.token_version = (user.token_version || 0) + 1;
    return this.userRepository.save(user);
  }

  async createPaymentIntent(userId: number, courseId: number): Promise<{ clientSecret: string }> {
    // Fetch course price from your database
    const course = await this.courseRepository.findOneBy({ id: courseId });
    if (!course || !course.price) {
        throw new NotFoundException('Course not found or has no price.');
    }

    // Amount should be in the smallest currency unit (e.g., cents for USD)
    const amount = Math.round(course.price * 100);

    const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        metadata: { userId, courseId }, // Store your internal IDs for reconciliation
    });
    // TODO save paymentIntent?

    return { clientSecret: paymentIntent.client_secret };
}

  async handleWebhookEvent(rawBody: Buffer, signature: string) {
    const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    this.logger.log(`Received Stripe event: ${event.type}`);

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const { userId, courseId } = paymentIntent.metadata;

        this.logger.log(`PaymentIntent succeeded for userId: ${userId}, courseId: ${courseId}`);
        // Fulfill the purchase. This is idempotent because purchaseCourse checks for existing ownership.
        await this.purchaseCourse(parseInt(userId, 10), parseInt(courseId, 10));
        break;
      // ... handle other event types
      default:
        this.logger.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    return { received: true };
  }
}