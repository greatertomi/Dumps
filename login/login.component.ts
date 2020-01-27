import {Component, OnDestroy, OnInit} from '@angular/core';
import {timer} from 'rxjs';
import {Router} from '@angular/router';

import {CacheService} from '../shared/cache.service';
import {HttpconnectService} from '../shared/httpconnect.service';
import {HttpErrorResponse} from '@angular/common/http';
import {
  ComputerDetails,
  Cpu,
  Disk,
  DiskLayout,
  Interface,
  Interfaces,
  MemLayout,
  Memory,
  Os,
  System,
  Uuid
} from '../shared/models/computer-model';
import {ComputerSystem} from '../shared/models/computer-system-model';


@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {
  errorMessageExist: boolean = false;
  errorMessage: string;

  loginTimerSub;
  loginTimer;
  registerTimer;
  registerTimerSub;
  private computerDetails: ComputerDetails;
  private electronService: any;
  private detailsReady: boolean;
  private totalRam: any;
  private ref: any;
  private computerSystem: any;
  private candidateCache: any;

  constructor(
    private httpService: HttpconnectService,
    private cacheService: CacheService,
    private router: Router) { }

  systemSpecs = {
    osId:"00330-50486-17167-AAODMJ",
    thinClientId:"1412",
    ipAddress:"192.168.8.105",
    hostName:"DESKTOP-JHNJ",
    macAddress:"C8-21-53-F0-D7-50",
    os:"Microsoft Windows 10 Pro",
    processor:"Intel90 Family 6 Model 142 Stepping 9 GenuineIntel ~2703 Mhz",
    ram:6
  }

  ngOnInit() {
    this.loginTimer = timer(5000,30000);
    this.registerTimer = timer(0, 20000)

    this.registerTimerFunc();
  }

  loginFunction() {
    this.httpService.loginHelper(`autobotserver/candidate/login/${this.systemSpecs.thinClientId}/${this.systemSpecs.osId}`)
      .subscribe(
        res => {
        this.cacheService.candidateDetails = res;
        this.errorMessageExist = false;
        this.loginTimerSub.unsubscribe();
      },
      (err:HttpErrorResponse) => {
        if (err.error instanceof Error) {

        } else {
          this.errorMessageExist = true;
          this.errorMessage = err.error.errorMessage;
        }
      }
    );
  }

  loginTimerFunc() {
    this.loginTimerSub = this.loginTimer.subscribe(() => this.login());
  }

  login(){
    this.loginFunction();
    //this.router.navigate(['/exampage']);
  }

  registerComputerFunc() {
    this.httpService.registerComputer("/autobotserver/connected-computers/register-computer", this.systemSpecs).subscribe(
      res => {
        console.log("System registered successfully")
        this.registerTimerSub.unsubscribe();
        this.loginTimerFunc();
      },
      err => {
        console.log(err);
      }
    );
  }

  registerTimerFunc() {
    this.registerTimerSub = this.registerTimer.subscribe(() => {
      this.registerComputerFunc();
    });
  }

  ngOnDestroy() {
    if(this.loginTimerSub != null){
      this.loginTimerSub.unsubscribe();
    }
  }

  getStaticComputerDetail(){
    console.log("i am called in angular");

    this.electronService.ipcRenderer.on('system-static-details-asynchronous-reply', (event, arg) => {
      //console.log(arg)
      // console.log(event,"in riggt place")
      this.computerDetails = this.createComputerDetails(arg);
      this.detailsReady = true;
       console.log(this.computerDetails);
      // console.log(this.detailsReady)
      for(let memL of this.computerDetails.memLayout.layout){
        this.totalRam += memL.size;
      }

      if(this.totalRam == 0){
        this.totalRam = this.computerDetails.totalMem;
      }
      this.ref.detectChanges();
      this.registerTimerFunc();

    });

    let details = this.electronService.ipcRenderer.send("system-static-details");
  }

  createComputerDetails(data : any) : ComputerDetails {
//  console.log(data);
    let computerDetails = new ComputerDetails();
    this.computerSystem = new ComputerSystem();

    computerDetails.myUuid = data.myUuid;
    computerDetails.totalMem = data.totalMem

    this.computerSystem.thinClientUUID = data.myUuid;
    this.computerSystem.totalMemory = data.totalMem;


    this.candidateCache.thinClientUuid = data.myUuid;

    let cpu = new Cpu();

    if(data.cpu != null || data.cpu != undefined) {
      cpu.brand = data.cpu.brand;
      cpu.cores = data.cpu.cores;
      cpu.manufacturer = data.cpu.manufacturer
      cpu.physicalCores = data.cpu.physicalCores
      cpu.processors = data.cpu.processors
      cpu.speed = data.cpu.speed
      cpu.speedMax = data.cpu.speedmax

      this.computerSystem.manufacturer = cpu.manufacturer;
      this.computerSystem.cpuCores = cpu.cores;
      this.computerSystem.cpuProcessors = cpu.processors;
      this.computerSystem.cpuSpeed = cpu.speed;
    }
    computerDetails.cpu = cpu;

    let os = new Os();

    if(data.os != null || data.os != undefined){

      os.arch = data.os.arch;
      os.distro = data.os.distro
      os.hostname = data.os.hostname
      os.kernel = data.os.kernel
      os.platform = data.os.platform
      os.release = data.os.release
      os.serial = data.os.serial

      this.computerSystem.architecture = os.arch;
      this.computerSystem.hostName = os.hostname;
      this.computerSystem.osName = os.distro;
    }

    computerDetails.os = os;

    let diskLayout =  new DiskLayout()
    diskLayout.layout = [];

    if(data.diskLayout.length != undefined || data.diskLayout != null){

      let totalDiskSize = 0;

      for(let diskk of data.diskLayout){
        let disk = new Disk();
        disk.name = diskk.name;
        disk.serialNum = diskk.serialNum;
        disk.size = diskk.size;
        totalDiskSize += disk.size;
        disk.type = diskk.type;
        diskLayout.layout.push(disk)
      }

      this.computerSystem.totalHardDiskSize = totalDiskSize;
    }

    computerDetails.diskLayout = diskLayout;

    let memLayout = new MemLayout();
    memLayout.layout = [];

    if(data.memLayout != undefined || data.memLayout != null){

      for(let mem of data.memLayout){

        let memory = new Memory();
        memory.clockSpeed = mem.clockSpeed;
        memory.serialNum = mem.serialNum;
        memory.size = mem.size;

        memLayout.layout.push(memory);
      }

    }

    computerDetails.memLayout = memLayout;

    let interfaces = new Interfaces()
    interfaces.interfaces = [];

    if(data.net != undefined || data.net != null){

      for(let net of data.net){

        if(net.operstate == "down" || net.type == "wireless" || net.virtual == true){
          continue;
        }

        let iface = new Interface()
        iface.iface = net.iface;
        iface.ifaceName = net.ifaceName;
        iface.internal = net.internal;
        iface.ip4 = net.ip4;
        iface.mac = net.mac;
        iface.speed = net.speed;
        iface.type = net.type;
        iface.virtual = net.virtual;
        iface.operationState = net.operstate;

        interfaces.interfaces.push(iface)

      }
    }

    computerDetails.interfaces = interfaces;

    let system = new System();

    if(data.system != null || data.system != undefined){

      system.manufacturer = data.system.manufacturer;
      system.model = data.system.model;
      system.serial = data.system.serial;
      system.sku = data.system.sku;
      system.uuid = data.system.uuid
      system.version  = data.system.version

      this.computerSystem.manufacturer = system.manufacturer;
      this.computerSystem.model = system.model;
    }

    computerDetails.system = system;

    let uuid = new Uuid()

    if(data.uuid != null || data.uuid != undefined){

      uuid.os = data.uuid.os
      this.computerSystem.osUuid = uuid.os;
    }

    computerDetails.uuid = uuid;

    return computerDetails;
  }


  private checkAutoBotStatusTimer() {

  }
}
