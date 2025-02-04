import { Location } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { Router } from "@angular/router";
import { isNumber } from "lodash";
import { BsModalService } from "ngx-bootstrap/modal";
import { ToastrService } from "ngx-toastr";
import { TrackingService } from "src/app/tracking.service";
import { BackendApiService, NFTEntryResponse, PostEntryResponse } from "../../backend-api.service";
import { BuyDesoModalComponent } from "../../buy-deso-page/buy-deso-modal/buy-deso-modal.component";
import { GlobalVarsService } from "../../global-vars.service";

@Component({
  selector: "buy-now-confirmation",
  templateUrl: "./buy-now-confirmation.component.html",
})
export class BuyNowConfirmationComponent {
  static PAGE_SIZE = 50;
  static BUFFER_SIZE = 10;
  static WINDOW_VIEWPORT = false;
  static PADDING = 0.5;

  @Input() postHashHex: string;
  @Input() post: PostEntryResponse;
  @Input() selectedSerialNumber: NFTEntryResponse;
  @Output() closeModal = new EventEmitter<any>();
  @Output() goBack = new EventEmitter<any>();

  availableCount: number;
  buyingNFT: boolean = false;
  errors: string[] = [];

  constructor(
    public globalVars: GlobalVarsService,
    private backendApi: BackendApiService,
    private modalService: BsModalService,
    private router: Router,
    private toastr: ToastrService,
    private location: Location,
    private tracking: TrackingService
  ) {}

  setErrors(): void {
    this.errors = [];
    if (this.selectedSerialNumber.BuyNowPriceNanos > this.globalVars.loggedInUser.BalanceNanos) {
      this.errors.push(`You do not have ${this.selectedSerialNumber.BuyNowPriceNanos} DESO to fulfill this purchase.`);
    }
    if (this.selectedSerialNumber.BuyNowPriceNanos === 0) {
      this.errors.push(`The purchase must be greater than 0 DESO`);
    }
    if (!this.selectedSerialNumber.IsBuyNow) {
      this.errors.push(`This serial number cannot be bought now`);
    }
  }

  placeBid() {
    this.setErrors();
    if (this.errors.length) {
      return;
    }
    this.buyingNFT = true;
    this.backendApi
      .CreateNFTBid(
        this.globalVars.localNode,
        this.globalVars.loggedInUser?.PublicKeyBase58Check,
        this.post.PostHashHex,
        this.selectedSerialNumber.SerialNumber,
        this.selectedSerialNumber.BuyNowPriceNanos,
        this.globalVars.defaultFeeRateNanosPerKB
      )
      .subscribe(
        (res) => {
          this.tracking.log("nft-buy-now : submit", {
            postHashHex: this.post.PostHashHex,
            authorUsername: this.post.ProfileEntryResponse?.Username,
            authorPublicKey: this.post.ProfileEntryResponse?.PublicKeyBase58Check,
            hasText: this.post.Body.length > 0,
            hasImage: (this.post.ImageURLs?.length ?? 0) > 0,
            hasVideo: (this.post.VideoURLs?.length ?? 0) > 0,
            hasEmbed: !!this.post.PostExtraData?.EmbedVideoURL,
            hasUnlockable: this.post.HasUnlockable,
          });
          if (!this.globalVars.isMobile()) {
            // Hide this modal and open the next one.
            this.closeModal.emit("nft purchased");
          } else {
            this.location.back();
          }
          this.showToast();
        },
        (err) => {
          console.error(err);
          const parsedError = this.backendApi.parseMessageError(err);
          this.globalVars._alertError(parsedError);
          this.tracking.log("nft-buy-now : submit", { error: parsedError });
        }
      )
      .add(() => {
        this.buyingNFT = false;
      });
  }

  openBuyDeSoModal() {
    this.modalService.show(BuyDesoModalComponent, {
      class: "modal-dialog-centered buy-deso-modal",
      backdrop: "static",
    });
  }

  navigateToBuyDeSo(): void {
    this.closeModal.emit();
    this.openBuyDeSoModal();
  }

  showToast(): void {
    const link = `/${this.globalVars.RouteNames.NFT}/${this.post.PostHashHex}`;
    this.toastr.show(`NFT Purchased<a href="${link}" class="toast-link cursor-pointer">View</a>`, null, {
      toastClass: "info-toast",
      enableHtml: true,
      positionClass: "toast-bottom-center",
      disableTimeOut: "extendedTimeOut",
    });
  }

  goBackToSerialSelection(): void {
    this.goBack.emit();
  }

  bidAmountUSDFormatted() {
    return isNumber(this.selectedSerialNumber.MinBidAmountNanos)
      ? `~${this.globalVars.formatUSD(this.selectedSerialNumber.MinBidAmountNanos, 0)}`
      : "";
  }

  bidAmountDeSoFormatted() {
    return isNumber(this.selectedSerialNumber.MinBidAmountNanos)
      ? `~${this.selectedSerialNumber.MinBidAmountNanos.toFixed(2)} $DESO`
      : "";
  }
}
