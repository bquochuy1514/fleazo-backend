import { Controller, Get, Query } from '@nestjs/common';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('provinces')
  findProvinces(@Query('includeWards') includeWards?: string) {
    return this.locationsService.findProvinces(includeWards === 'true');
  }
}
