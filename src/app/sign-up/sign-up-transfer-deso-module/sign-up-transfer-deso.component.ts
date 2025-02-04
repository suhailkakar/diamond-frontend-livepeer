import { Component, OnInit } from "@angular/core";
import { BsModalRef, BsModalService } from "ngx-bootstrap/modal";
import { BuyDeSoComponent } from "src/app/buy-deso-page/buy-deso/buy-deso.component";
import { RouteNames } from "../../app-routing.module";
import { BackendApiService } from "../../backend-api.service";
import { BuyDesoModalComponent } from "../../buy-deso-page/buy-deso-modal/buy-deso-modal.component";
import { GlobalVarsService } from "../../global-vars.service";

@Component({
  selector: "sign-up-transfer-deso",
  templateUrl: "./sign-up-transfer-deso.component.html",
  styleUrls: ["./sign-up-transfer-deso.component.scss"],
})
export class SignUpTransferDesoComponent implements OnInit {
  SignUpGetStarterDeSoComponent = SignUpTransferDesoComponent;
  publicKeyIsCopied = false;
  showModal = true;
  modalReappear = false;
  BuyDeSoComponent = BuyDeSoComponent;
  scanQRCode: boolean = false;
  sendDeSoQRCode: string;

  constructor(
    public globalVars: GlobalVarsService,
    private modalService: BsModalService,
    public bsModalRef: BsModalRef,
    private backendApi: BackendApiService
  ) {}

  _copyPublicKey() {
    this.globalVars._copyText(this.globalVars.loggedInUser?.PublicKeyBase58Check);
    this.publicKeyIsCopied = true;
    setInterval(() => {
      this.publicKeyIsCopied = false;
    }, 1000);
  }

  ngOnInit() {
    this.sendDeSoQRCode = `${this.backendApi._makeRequestURL(location.host, "/" + RouteNames.SEND_DESO)}?public_key=${
      this.globalVars.loggedInUser?.PublicKeyBase58Check
    }`;
  }

  refreshBalance() {
    this.globalVars.updateEverything();
  }

  openBuyDeSoModal(isFiat: boolean) {
    this.showModal = false;
    this.modalReappear = false;
    const initialState = {
      activeTabInput: isFiat ? BuyDeSoComponent.BUY_WITH_USD : BuyDeSoComponent.BUY_WITH_MEGASWAP,
    };
    const modalDetails = this.modalService.show(BuyDesoModalComponent, {
      class: "modal-dialog-centered buy-deso-modal",
      backdrop: "static",
      initialState,
    });
    const onHideEvent = modalDetails.onHide;
    onHideEvent.subscribe(() => {
      this.showModal = true;
      this.modalReappear = true;
      this.globalVars.updateEverything().add(() => {
        if (this.globalVars.loggedInUser.BalanceNanos > 0) {
          this.modalService.hide();
        }
      });
    });
  }
}
