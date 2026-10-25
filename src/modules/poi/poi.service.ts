import { Injectable } from "@nestjs/common";
import { CreatePoiDto } from "./dto/create-poi.dto";
import { NearbyPoiDto } from "./dto/nearby-poi.dto";
import { PoiRepository } from "./poi.repository";
@Injectable()
export class PoiService {
  constructor(private readonly repository: PoiRepository) {}
  create(dto: CreatePoiDto) {
    return this.repository.create(dto);
  }
  nearby(query: NearbyPoiDto) {
    return this.repository.findNearby(
      query.latitude,
      query.longitude,
      query.radiusM,
      query.language,
    );
  }
}
