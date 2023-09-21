sap.ui.define([
    "sap/m/Input",
    "sap/m/InputRenderer",
    "sap/ui/model/resource/ResourceModel",
    "sap/ui/core/IconPool",
    "sap/m/MessageBox",
    "sap/ui/Device",
    "./BarcodeScanHandler"
], function (Input, InputRenderer, ResourceModel, IconPool, MessageBox, Device, BarcodeScanHandler) {
	"use strict";

	return Input.extend("com.publix.ui5library.ca.barcodeScanner.Barcode", {
        renderer: InputRenderer,

        metadata : {
            properties : {},
            aggregations  : {},
            events : {
                scanButtonPress: {},    // Scan button pressed
                valueHelpPress: {}      // F4 pressed
            }
        },


		/* =========================================================== */
		/*  Lifecycle methods                                          */
		/* =========================================================== */

        init : function(oEvent) {
            Input.prototype.init.apply(this, arguments);

            this._oResourceModel = new ResourceModel({
				bundleName: "com.publix.ui5library.ca.barcodeScanner.i18n"
			});
			this._oResourceBundle = this._oResourceModel.getResourceBundle();

            this.addEndIcon({
                id: this.getId() + "-barcode",
                src: IconPool.getIconURI("sap-icon://bar-code"),
                noTabStop: true,
                decorative: false,
                tooltip: this._oResourceBundle.getText("ScanButton_Tip"),
                press: [this.onScanButtonPress, this]
            });

            const sDensityClass = this._getContentDensityClass();
            if (sDensityClass) {
                this.addStyleClass(sDensityClass);
            }
        },

        onBeforeRendering: function(oEvent) {
            Input.prototype.onBeforeRendering.apply(this, arguments);
           
            let bEnabled = (this.getEnabled() && this.getEditable()) ? true : false;

            if (bEnabled && !this._scaningIsAvailable()) {
                bEnabled = false;
            }

            const aEndIcons = this.getAggregation("_endIcon");
            if (Array.isArray(aEndIcons)) {
                aEndIcons.map(oIcon => {
                    oIcon.setProperty("visible", bEnabled, true);
                });
            }
        },

        onAfterRendering: function(oEvent) {
            Input.prototype.onAfterRendering.apply(this, arguments);
        },

        exit: function() {
            if (this._oScanHandler) {
                this._oScanHandler.destroy();
            }
        },


		/* =========================================================== */
		/*  Event handler methods                                      */
		/* =========================================================== */

        onScanButtonPress: function(oEvent) {   // Scan button pressed
            const bEnabled = (this.getEnabled() && this.getEditable()) ? true : false;

            if (bEnabled && this._scaningIsAvailable() && !this._scanButtonPressIsBound()) {
                this._oScanHandler.onScan((sValue, bCancelled) => {
                    if (!bCancelled && typeof(sValue) === "string") {
                        this.setValue(sValue);
                    } else if (!bCancelled) {
                        MessageBox.error(this._oResourceBundle.getText("ScanButton_APIFailureMsg"), {
                            title: this._oResourceBundle.getText("ScanButton_APIFailureTtl"),
                            onClose: (oResp => {
                                this.setValue("");
                            })
                        });
                    }
                });
            } else if (bEnabled && this._scaningIsAvailable()) {
                if (this._scanButtonPressIsBound()) {
                    this.fireScanButtonPress({});
                } else {
                    this.fireValueHelpPress({});
                }
            }
        },

        onsapshow: function(oEvent) {   // F4 pressed
            if (this.getEnabled() && this.getEditable()) {
                this.fireValueHelpPress({});
                oEvent.preventDefault();
                oEvent.stopPropagation();
            }
        },



		/* =========================================================== */
		/*  Private methods                                            */
		/* =========================================================== */

		_getContentDensityClass: function() {
            // "cozy" in case of touch support; default for most sap.m controls.
            let sClass = "sapUiSizeCozy";

            // check whether FLP has already set the content density class; do nothing in this case
            if (jQuery(document.body).hasClass("sapUiSizeCozy") || jQuery(document.body).hasClass("sapUiSizeCompact")) {
                sClass = "";
            } else if (!Device.support.touch) { // apply "compact" mode if touch is not supported
                sClass = "sapUiSizeCompact";
            }

            return sClass;
		},

        _scaningIsAvailable: function() {
            let bPluginAvailable = false;

            if (this._scanButtonPressIsBound()) {
                bPluginAvailable = true;
            } else {
                if (!this._oScanHandler) {
                    this._oScanHandler = new BarcodeScanHandler();
                }

                let sPlutginId = this._oScanHandler ? this._oScanHandler.getScannerPluginName() : null;
                if (sPlutginId) {
                    bPluginAvailable = true;
                }
            }

            return bPluginAvailable;
        },

        _scanButtonPressIsBound: function() {
            // let bHandlerBound = false;
            // if (this.mEventRegistry.hasOwnProperty("scanButtonPress")) {
            //     let aListeners = this.mEventRegistry.scanButtonPress.filter((oItem) => {
            //         return oItem.oListener ? true : false;
            //     });
            //     if (aListeners.length > 0) {
            //         bHandlerBound = true;
            //     }
            // }

            return this.hasListeners("scanButtonPress");
        }

    });
}, /* bExport=*/false);