sap.ui.define([
    "sap/m/Input",
    "sap/m/InputRenderer",
    "sap/ui/core/IconPool",
    "sap/m/MessageBox",
    "./Utilities",
    "./StoreSearchHandler"
], function (Input, InputRenderer, IconPool, MessageBox, Utilities, StoreSearchHandler) {
	"use strict";

	return Input.extend("com.publix.ui5library.pm.storeSelector.StoreInput", {
        renderer: InputRenderer,
        utils: new Utilities(true/*don't initialize the service (OData model)*/),

        metadata : {
            properties : {
                "useMap": {
                    "type": "boolean",
                    "defaultValue": false
                }
            },
            aggregations  : {},
            events : {
                searchButtonPress: {},  // Search button pressed
                valueHelpPress: {}      // F4 pressed
            }
        },


		/* =========================================================== */
		/*  Lifecycle methods                                          */
		/* =========================================================== */

        init : function() {
            Input.prototype.init.apply(this, arguments);

            this._oResourceBundle = this.utils.getResoureBundle();

            let bUseMap = false;
            if (this.getEnabled() && this.getEditable() && this._searchingIsAvailable() && this.getUseMap()) {
                bUseMap = true;
            }

            let sSearchTip = bUseMap ? this._oResourceBundle.getText("StoreInput_searchMapBtnTip") : this._oResourceBundle.getText("StoreInput_searchBtnTip"),
                sIconSrc = bUseMap ? IconPool.getIconURI("sap-icon://map-2") : IconPool.getIconURI("sap-icon://search"),
                fnSearch = bUseMap ? this.onSearchMapButtonPress : this.onSearchButtonPress;

            this.addEndIcon({
                id: this.getId() + "-search",
                src: sIconSrc,
                noTabStop: true,
                decorative: false,
                tooltip: sSearchTip,
                press: [fnSearch, this]
            });

            const sDensityClass = this._getContentDensityClass();
            if (sDensityClass) {
                this.addStyleClass(sDensityClass);
            }
        },

        onBeforeRendering: function(oEvent) {
            Input.prototype.onBeforeRendering.apply(this, arguments);
           
            let bEnabled = (this.getEnabled() && this.getEditable()) ? true : false;

            if (bEnabled && !this._searchingIsAvailable()) {
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
            if (this._oSearchHandler) {
                this._oSearchHandler.destroy();
                this._oSearchHandler = null;
            }
        },


		/* =========================================================== */
		/*  Event handler methods                                      */
		/* =========================================================== */

        onSearchButtonPress: function(oEvent) {
            if (this.hasListeners("searchButtonPress")) {
                this.fireSearchButtonPress({});
            } else {
                this._oSearchHandler.onAddStores((bIsApplied, aStores) => {
                    if (bIsApplied && typeof(bIsApplied) !== "boolean") {
                        let sMsg = bIsApplied.toString ? bIsApplied.toString() : this._oResourceBundle.getText("StoreInput_APIFailureMsg");
                        MessageBox.error(sMsg, {
                            title: this._oResourceBundle.getText("StoreInput_APIFailureTtl"),
                            onClose: (oResp => {
                                this.setValue("");
                            })
                        });
                    }
                });
            }
        },

        onSearchMapButtonPress: function(oEvent) {
            const bEnabled = (this.getEnabled() && this.getEditable()) ? true : false,
                bHasListener = this.hasListeners("searchButtonPress");

            if (bEnabled && this._searchingIsAvailable() && !bHasListener) {
                this._oSearchHandler.onMapSearch().then((oResult) => {
                    if (oResult.storeId && !oResult.cancelled) {
                        this.setValue(oResult.storeId);
                    } else if (!oResult.cancelled) {
                        let sMsg = oResult.message || this._oResourceBundle.getText("StoreInput_APIFailureMsg");
                        MessageBox.error(sMsg, {
                            title: this._oResourceBundle.getText("StoreInput_APIFailureTtl"),
                            onClose: (oResp => {
                                this.setValue("");
                            })
                        });
                    }
                }).catch(oError => {
                    let sMsg = oError.message || this._oResourceBundle.getText("StoreInput_APIFailureMsg");
                    MessageBox.error(sMsg, {
                        title: this._oResourceBundle.getText("StoreInput_APIFailureTtl"),
                        onClose: (oResp => {
                            this.setValue("");
                        })
                    });
                });
            } else if (bEnabled && this._searchingIsAvailable()) {
                if (bHasListener) {
                    this.fireSearchButtonPress({});
                } else {
                    this.fireValueHelpPress({});
                }
            }
        },

        onsapshow: function(oEvent) {   // F4 pressed
            if (this.hasListeners("valueHelpPress")) {
                this.fireValueHelpPress({});
                oEvent.preventDefault();
                oEvent.stopPropagation();
            } else {
                this.onSearchButtonPress(oEvent);
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
            } else if (!this.utils.Device.support.touch) { // apply "compact" mode if touch is not supported
                sClass = "sapUiSizeCompact";
            }

            return sClass;
		},

        _searchingIsAvailable: function() {
            if (!this._oSearchHandler) {
                this._oSearchHandler = new StoreSearchHandler();
            }

            return this._oSearchHandler ? true : false;
        }

    });
}, /* bExport=*/false);