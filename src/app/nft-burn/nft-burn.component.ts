import { Location } from "@angular/common";
import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { Router } from "@angular/router";
import * as _ from "lodash";
import { isNumber } from "lodash";
import { BsModalService } from "ngx-bootstrap/modal";
import { ToastrService } from "ngx-toastr";
import { TrackingService } from "src/app/tracking.service";
import { SwalHelper } from "../../lib/helpers/swal-helper";
import { BackendApiService, NFTEntryResponse, PostEntryResponse } from "../backend-api.service";
import { GlobalVarsService } from "../global-vars.service";

@Component({
  selector: "nft-burn",
  templateUrl: "./nft-burn.component.html",
})
export class NftBurnComponent implements OnInit {
  static PAGE_SIZE = 50;
  static BUFFER_SIZE = 10;
  static WINDOW_VIEWPORT = false;
  static PADDING = 0.5;

  @Input() postHashHex: string;
  @Input() post: PostEntryResponse;
  @Input() burnNFTEntryResponses: NFTEntryResponse[];
  @Output() closeModal = new EventEmitter<any>();
  @Output() changeTitle = new EventEmitter<string>();

  bidAmountDeSo: number;
  bidAmountUSD: number;
  selectedSerialNumber: NFTEntryResponse = null;
  availableCount: number;
  availableSerialNumbers: NFTEntryResponse[];
  filteredSerialNumbers: NFTEntryResponse[];
  highBid: number = null;
  lowBid: number = null;
  loading = true;
  isSelectingSerialNumber = true;
  saveSelectionDisabled = false;
  showSelectedSerialNumbers = false;
  burningNft: boolean = false;
  errors: string[] = [];
  minBidCurrency: string = "USD";
  minBidInput: number = 0;
  transferringUser: string;

  constructor(
    public globalVars: GlobalVarsService,
    private backendApi: BackendApiService,
    private modalService: BsModalService,
    private router: Router,
    private toastr: ToastrService,
    private location: Location,
    private tracking: TrackingService
  ) {}

  ngOnInit(): void {
    this.backendApi
      .GetNFTCollectionSummary(
        this.globalVars.localNode,
        this.globalVars.loggedInUser?.PublicKeyBase58Check,
        this.post.PostHashHex
      )
      .subscribe((res) => {
        this.availableSerialNumbers = _.values(res.SerialNumberToNFTEntryResponse);
        this.availableCount = res.NFTCollectionResponse.PostEntryResponse.NumNFTCopiesForSale;
        this.filteredSerialNumbers = this.burnNFTEntryResponses;
      })
      .add(() => (this.loading = false));
  }

  burnNft() {
    this.saveSelectionDisabled = true;
    this.burningNft = true;
    SwalHelper.fire({
      target: this.globalVars.getTargetComponentSelector(),
      title: "Burn NFT",
      html: `You are about to burn this NFT - this cannot be undone. Are you sure?`,
      showConfirmButton: true,
      showCancelButton: true,
      reverseButtons: true,
      customClass: {
        confirmButton: "btn btn-light",
        cancelButton: "btn btn-light no",
      },
      confirmButtonText: "Ok",
      cancelButtonText: "Cancel",
    }).then((res) => {
      this.tracking.log(`nft-burn-confirmation : ${res.isConfirmed ? "confirmed" : "cancelled"}`);
      if (res.isConfirmed) {
        this.backendApi
          .BurnNFT(
            this.globalVars.localNode,
            this.globalVars.loggedInUser?.PublicKeyBase58Check,
            this.post.PostHashHex,
            this.selectedSerialNumber.SerialNumber,
            this.globalVars.defaultFeeRateNanosPerKB
          )
          .subscribe(
            (res) => {
              this.tracking.log("nft : burn", {
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
                this.closeModal.emit("nft burned");
              } else {
                this.location.back();
              }
              this.toastr.show("Your nft was burned", null, {
                toastClass: "info-toast",
                positionClass: "toast-bottom-center",
              });
            },
            (err) => {
              console.error(err);
              this.tracking.log("nft : burn", {
                error: err.error?.error,
              });
            }
          )
          .add(() => {
            this.burningNft = false;
            this.saveSelectionDisabled = false;
          });
      } else {
        this.burningNft = false;
        this.saveSelectionDisabled = false;
      }
    });
  }

  saveSelection(): void {
    if (!this.saveSelectionDisabled) {
      this.isSelectingSerialNumber = false;
      this.showSelectedSerialNumbers = true;
      this.changeTitle.emit("Confirm Transfer");
      this.highBid = this.selectedSerialNumber.HighestBidAmountNanos;
      this.lowBid = this.selectedSerialNumber.LowestBidAmountNanos;
    }
  }

  goBackToSerialSelection(): void {
    this.isSelectingSerialNumber = true;
    this.showSelectedSerialNumbers = false;
    this.changeTitle.emit("Choose an edition");
    this.highBid = null;
    this.lowBid = null;
    this.selectedSerialNumber = null;
  }

  selectSerialNumber(serialNumber: NFTEntryResponse) {
    this.selectedSerialNumber = serialNumber;
    this.saveSelection();
  }

  bidAmountUSDFormatted() {
    return isNumber(this.bidAmountUSD) ? `~${this.globalVars.formatUSD(this.bidAmountUSD, 0)}` : "";
  }

  bidAmountDeSoFormatted() {
    return isNumber(this.bidAmountDeSo) ? `~${this.bidAmountDeSo.toFixed(2)} $DESO` : "";
  }
}
