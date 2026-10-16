import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { InvitacionesService } from './invitaciones.service';

const crearSchema = z.object({
  email: z.string().email(),
  rol: z.enum(['agente', 'viewer']),
});
const aceptarSchema = z.object({
  token: z.string().min(1).max(200),
  nombre: z.string().min(2).max(140),
  password: z.string().min(8).max(200),
});

@Controller('invitaciones')
export class InvitacionesController {
  constructor(private readonly invitaciones: InvitacionesService) {}

  @Roles('owner')
  @Post()
  crear(
    @Body(new ZodValidationPipe(crearSchema)) dto: z.infer<typeof crearSchema>,
  ) {
    return this.invitaciones.crear(dto.email, dto.rol);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('aceptar')
  aceptar(
    @Body(new ZodValidationPipe(aceptarSchema))
    dto: z.infer<typeof aceptarSchema>,
  ) {
    return this.invitaciones.aceptar(dto.token, dto.nombre, dto.password);
  }
}
