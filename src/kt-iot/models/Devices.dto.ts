import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsInt, IsBoolean, IsDateString, IsNumber, IsOptional } from 'class-validator'

export class DevicesDto {
  @ApiProperty() @IsString() deveui: string
  @ApiProperty() @IsString() devicetype: 'meter' | 'modem'
  @ApiProperty() @IsString() devicename: string
  @ApiProperty() @IsInt() cityid: number
  @ApiProperty() @IsString() devicegroup?: string
  @ApiProperty() @IsInt() port?: number
  @ApiProperty() @IsInt() resourceid?: number
  @ApiProperty() @IsInt() providerid?: number
  @ApiProperty() @IsBoolean() istracked: boolean
  @ApiProperty() @IsDateString() lasttimestamp?: Date

  constructor(
    devicetype: 'meter' | 'modem',
    deveui: string,
    devicename: string,
    resourceid: number,
    cityid: number,
    providerid: number,
    istracked: boolean,
    devicegroup?: string,
    lasttimestamp?: Date,
    port?: number
  ) {
    this.devicetype = devicetype
    this.deveui = deveui
    this.devicename = devicename
    this.devicegroup = devicegroup
    this.port = port
    this.resourceid = resourceid
    this.cityid = cityid
    this.providerid = providerid
    this.istracked = istracked
    this.lasttimestamp = lasttimestamp
  }
}

export class DevicesDevEuiPortDto {
  @ApiProperty() @IsString() deveui: string
  @ApiProperty() @IsNumber() @IsOptional() port?: number
  constructor(deveui: string, port?: number) {
    this.deveui = deveui
    this.port = port
  }
}
