import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../users/role.guard';
import { Roles } from '../users/role.decorator';
import { Role } from '../users/types/role.enum';
import { OrderService } from './order.service';
import { EntitlementService } from './entitlement.service';
import {
  CreateManualOrderDto,
  EntitlementRow,
  ListOrdersQueryDto,
  OrderRow,
  ProductRow,
} from './types/commerce.dto';

/** Admin money ledger + learner-facing entitlement list (plan § 5.2, § 5.3). */
@ApiTags('Orders')
@ApiBearerAuth()
@Controller()
export class OrdersController {
  constructor(
    private readonly orders: OrderService,
    private readonly entitlements: EntitlementService,
  ) {}

  @ApiOperation({ summary: 'List orders (admin)' })
  @Get('orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  list(@Query() q: ListOrdersQueryDto): Promise<OrderRow[]> {
    return this.orders.listOrders({
      userId: q.userId ? Number(q.userId) : undefined,
      organizationId: q.organizationId ? Number(q.organizationId) : undefined,
      limit: q.limit ? Number(q.limit) : undefined,
      offset: q.offset ? Number(q.offset) : undefined,
    });
  }

  @ApiOperation({ summary: 'Product catalog (admin)' })
  @Get('orders/products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  products(): Promise<ProductRow[]> {
    return this.orders.listProducts(true);
  }

  @ApiOperation({ summary: 'Get one order (admin)' })
  @Get('orders/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async get(@Param('id', ParseIntPipe) id: number): Promise<OrderRow | null> {
    return this.orders.getOrder(id);
  }

  @ApiOperation({
    summary:
      'Record a PO / comp / check order and grant its entitlements (admin)',
  })
  @Post('orders/manual')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  manual(@Request() req, @Body() dto: CreateManualOrderDto): Promise<OrderRow> {
    return this.orders.createManualOrder(req.user.userId, dto);
  }

  @ApiOperation({ summary: "Current user's entitlements" })
  @Get('users/me/entitlements')
  @UseGuards(JwtAuthGuard)
  myEntitlements(@Request() req): Promise<EntitlementRow[]> {
    return this.entitlements.listForUser(req.user.userId);
  }
}
