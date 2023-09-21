sap.ui.define([
    "sap/m/MultiInput",
    "sap/m/MultiInputRenderer",
    "sap/m/Token",
    "sap/m/MessageBox",
    "./Utilities",
    "./StoreSearchHandler",
    "./StoreSelector"
], function (MultiInput, MultiInputRenderer, Token, MessageBox, Utilities, StoreSearchHandler, StoreSelector) {
	"use strict";

	return MultiInput.extend("com.publix.ui5library.pm.storeSelector.StoreMultiInput", {
        renderer: MultiInputRenderer,
        utils: new Utilities(),

        metadata : {
            properties : {
                stores: "object[]"
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
            MultiInput.prototype.init.apply(this, arguments);

            this._oResourceBundle = this.utils.getResoureBundle();

            this._oSearchHandler = new StoreSearchHandler();

			this.setShowValueHelp(true);
			this.attachValueHelpRequest(this.onSearchButtonPress);
            this.attachTokenUpdate(this._onTokenUpdate);
            this.addValidator(this._onValidation.bind(this));

            const sDensityClass = this._getContentDensityClass();
            if (sDensityClass) {
                this.addStyleClass(sDensityClass);
            }
        },

        onBeforeRendering: function(oEvent) {
            MultiInput.prototype.onBeforeRendering.apply(this, arguments);
        },

        onAfterRendering: function(oEvent) {
            MultiInput.prototype.onAfterRendering.apply(this, arguments);
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
                                this.removeAllTokens();
                            })
                        });
                    } else if (bIsApplied) {
                        this.removeAllTokens();

                        this.setStores(aStores);
                        aStores.forEach(oStore => {
                            this.addToken(new Token({
                                key: oStore.StoreId,
                                text: oStore.StoreId
                            }));
                        });
                    }
                });
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

        _onTokenUpdate: function(oEvent) {
            let oBinding = this.getBinding("stores"),
                sBindingPath = oBinding.getPath(),
                oModel = oBinding.getModel(),
                aStores = oModel.getProperty(sBindingPath);

            oEvent.getParameter("addedTokens").forEach(oToken => {
                let sTokenStore = oToken.getKey();

                let oStoreLoaded = aStores.find(oStore => {
                    return oStore.StoreId === sTokenStore;
                });

                if (!oStoreLoaded) {
                    this.utils.getStore(sTokenStore).then(oStore => {
                        aStores.push(oStore);
                        this.addToken(oToken);
                    }).catch(oError => {
                        //TODO throw an error message
                    });                       
                } else {
                    this.addToken(oToken);
                }
            });

            oEvent.getParameter("removedTokens").forEach(oToken => {
                let aNewStores = aStores.filter(oStore => {
                    return oStore.StoreId !== oToken.getKey();
                });

                aStores = aNewStores;
                this.removeToken(oToken);
            });

            this.setStores(aStores);
        },

        _onValidation: function(oEvent) {
            let sStoreId = oEvent.text ? oEvent.text.padStart(4,"0") : "",
            aStores = this.getStores();

            let oStoreLoaded = aStores.find(oStore => {
                return oStore.StoreId === sStoreId;
            });

            if (!oStoreLoaded) {
                this.utils.getStore(sStoreId).then(oStore => {
                    aStores.push(oStore);
                    this.setValue();
                    this.addToken(new Token({
                        key: oStore.StoreId,
                        text: oStore.StoreId
                    }));
                }).catch(oError => {
                    //TODO throw an error message
                });                       
            } else {
                this.addToken(new Token({
                    key: oStoreLoaded.StoreId,
                    text: oStoreLoaded.StoreId
                }));
            }
        }

    });
}, /* bExport=*/false);