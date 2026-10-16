import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly prisma: PrismaService) {}

  // Cualquier rol autenticado ve los usuarios de SU tenant; el filtro lo pone la barrera 1.
  @Get()
  listar() {
    return this.prisma.inTenant((tx) =>
      tx.usuario.findMany({
        select: {
          id: true,
          email: true,
          nombre: true,
          rol: true,
          activo: true,
        },
        orderBy: { creadoEn: 'asc' },
      }),
    );
  }
}
