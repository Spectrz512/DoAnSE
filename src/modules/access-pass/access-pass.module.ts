import { Module } from "@nestjs/common";
import { AccessPassController } from "./access-pass.controller";
import { AccessPassRepository } from "./access-pass.repository";
import { AccessPassService } from "./access-pass.service";

@Module({
  controllers: [AccessPassController],
  providers: [AccessPassService, AccessPassRepository],
})
export class AccessPassModule {}
