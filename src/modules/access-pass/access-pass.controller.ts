import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AccessPassService } from "./access-pass.service";
import { ActivatePassDto } from "./dto/activate-pass.dto";

@ApiTags("access-passes")
@Controller("access-passes")
export class AccessPassController {
  constructor(private readonly service: AccessPassService) {}

  @Post("activate")
  activate(@Body() dto: ActivatePassDto) {
    return this.service.activate(dto);
  }
}
