sap.ui.define([
	"sap/ui/base/Object",
	"sap/ui/Device",
	"sap/ui/model/odata/v2/ODataModel",
	"sap/ui/model/resource/ResourceModel",
	"sap/ui/model/json/JSONModel"
], function(UI5Object, Device, ODataModel, ResourceBundle, JSONModel) {
	"use strict";

	return UI5Object.extend("com.publix.ui5library.pm.storeSelector.StoreSelector", {

		/* =========================================================== */
		/*  Lifecycle methods                                          */
		/* =========================================================== */

		/**
		 * Construct an instance of the Store Maintenance dialog control.
		 * @param {string} sPersonalizationId The (optional) Id to use for Personalization.
		 * @param {} oComponent The (optional) component to assign the storage with (uses the app's ID).
		 * @class
		 * @public
		 * @alias com.publix.ui5library.pm.storeSelector.StoreSelector
		 */
		constructor: function(sPersonalizationId, oComponent) {
			this._oSelectorReady = new Promise(function(fnResolve, fnReject) {

				// Bind some private members from the calling controller (listener).
				this._oComponent = oComponent ? oComponent : null;
				this._sPerId = sPersonalizationId ? sPersonalizationId : "PM_StoreSelector";

				// Bind the OData model.
				this._oODataModel = new ODataModel("/sap/opu/odata/sap/ZFIORI_PM_UTILITIES_SRV/");
				// this._oODataModel = new ODataModel("/sap/opu/odata/sap/ZFIORI_SERVICE_TECH_SRV/");

				// Bind the Fiori Launchpad's Personaization API.
				this._oPersonalization = this._bindPersonalization();

				// Bind the resource bundle.
				this._oResourceModel = new ResourceBundle({
					bundleName: "com.publix.ui5library.pm.storeSelector.StoreSelector"
				});
				this._oResourceBundle = this._oResourceModel.getResourceBundle();

				// Construct the Dialog.
				this._oDialog = sap.ui.xmlfragment("com.publix.ui5library.pm.storeSelector.StoreSelector", this);
				let sDensityClass = this._getContentDensityClass();
				if (sDensityClass) {
					this._oDialog.addStyleClass(sDensityClass);
				}

				// Set the dialog's resource & default models.
				this._oDialog.setModel(this._oResourceModel, "i18n");
				var oDialogModel = new JSONModel({
					aStores: [],
					bHaveStores: false
				});
				this._oDialog.setModel(oDialogModel).bindElement("/");

				// Clear the Model values each time the Dialog is opened.
				this._oDialog.attachBeforeOpen(function() {
					// oDialogModel.setProperty("/aStores", []);
					// oDialogModel.setProperty("/bHaveStores", false);
				});

				// Set the focus to the input field each time the Dialog is opened.
				this._oDialog.attachAfterOpen(function() {
					sap.ui.getCore().byId("addStoreInput").focus();
				}, this);

				// Load up the list of stores previously saved by the user.
				this._oPersonalization.then(function(oAPI) {
					// Add the list of saved stores to the Dialog's default model.
					var aStores = oAPI.getItemValue("storeList") || [];
					oDialogModel.setProperty("/aStores", aStores);
					if (aStores.length > 0) {
						oDialogModel.setProperty("/bHaveStores", true);
					}
					fnResolve(aStores);
				})
				.catch(function(oError) {
					// Add the list of saved stores to the Dialog's default model.
					var aStores = [];
					oDialogModel.setProperty("/aStores", aStores);
					fnReject(oError);
				});
			}.bind(this));
		},

		/**
		 * The control is automatically destroyed by the UI5 runtime.
		 * @public
		 * @override
		 */
		destroy: function() {
			// Destroy the dialog if it was constructed.
			if (this._oDialog) {
				this._oDialog.destroy();
				this._oDialog = null;
			}
			// call the base component's destroy function
			UI5Object.prototype.destroy.apply(this, arguments);
		},



		/* =========================================================== */
		/*  Event handler methods                                      */
		/* =========================================================== */

		/**
		 * Add a row to the sort criteria list.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onAdd: function(oEvent) {
			var oStoreInput =  sap.ui.getCore().byId("addStoreInput"),
				sPath = this._oODataModel.createKey("/StoreSet", {
					StoreId: oStoreInput.getValue()
				}),
				oStore = this._oODataModel.getProperty(sPath);

			if (!oStore) {
				this._oDialog.setBusy(true);

				this._oODataModel.read(sPath, {
					success: function(oData) {
						var oDialogModel = this._oDialog.getModel(),
							aStores = oDialogModel.getProperty("/aStores") || [];

						aStores = aStores.filter(function(oExistingStore) {
							return oExistingStore.StoreId !== this.StoreId;
						}.bind(oData));

						aStores.push(oData);
						oDialogModel.setProperty("/aStores", aStores);
						oDialogModel.setProperty("/bHaveStores", true);

						oStoreInput.setValue();

						this._oDialog.setBusy(false);
					}.bind(this),
					error: function(oError) {
						this._oDialog.setBusy(false);
					}.bind(this)
				});
			}
		},

		/**
		 * Remove a sort item from the list of sort fields.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onDelete: function(oEvent) {
			var oListItem = oEvent.getParameter("listItem"),
				oDialogModel = this._oDialog.getModel(),
				aStores = oDialogModel.getProperty("/aStores"),
				aParts = oListItem.getBindingContextPath().split("/aStores/");

			if (aParts && aParts.length > 1) {
				var iIndex = parseInt(aParts[1], 10);
				aStores.splice(iIndex, 1);
				oDialogModel.setProperty("/aStores", aStores);
			}

			if (aStores.length <= 0) {
				oDialogModel.setProperty("/bHaveStores", false);
			}
		},

		/**
		 * Handle the "Apply" event (button press) from the Sort dialog.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onApply: function(oEvent) {
			var aStores = this._oDialog.getModel().getProperty("/aStores");

			if (aStores.length > 0) {
				// Save the store values in personalization.
				this._oPersonalization.then(function(oAPI) {
					oAPI.setItemValue("storeList", aStores);
					oAPI.save();
				});
	
				// Close the dialog.
				this._oDialog.close();
	
				// Call the 'listener' (if the callback was provided).
				if (this._fnCallbackOnClose) {
					this._fnCallbackOnClose(true /*is applied*/, aStores);
				}
			}
		},

		/**
		 * Handle the "Cancel" event (button press) from the Sort dialog.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onCancel: function(oEvent) {	//eslint-disable-line no-unused-vars
			this._oDialog.close();
			var aStores = this._oDialog.getModel().getProperty("/aStores") || [];
			this._fnCallbackOnClose(false /*not applied*/, aStores);
		},



		/* =========================================================== */
		/*  Public methods                                             */
		/* =========================================================== */

		/**
		 * Open the Store Maintenance dialog.
		 * @param {function} fnCallBack The function to call when the dialog is closed.
		 * @public
		 */
		openDialog: function(fnCallBack) {
			this._fnCallbackOnClose = fnCallBack || null;
			this._oSelectorReady.then(function() {
				this._oDialog.open();
			}.bind(this));
		},

		/** Return all of the stores saved in the instance.
		 * @returns {Promise} A JavaScript Promise that returns the stores when resloved.
		 * @public
		 */
		getStores: function() {
			return new Promise(function(fnResolve, fnReject) {
				this._oSelectorReady.then(function() {
					fnResolve(this._oDialog.getModel().getProperty("/aStores"));
				}.bind(this))
				.catch(function(oError) {
					fnReject(oError);
				});
			}.bind(this));
		},

		/**
		 * Capitalize the first charactrer of each work in a string.
		 * @param {string} sText The text string to be capitalized.
		 * @returns {string} The capitaized text string.
		 * @public
		 */
		capFirstLetter: function(sText) {
			var sNewText = "";
			if (sText) {
				sNewText = sText.toLowerCase().replace(/\w\S*/g, function(sWord) {
					return sWord.charAt(0).toUpperCase() + sWord.substr(1).toLowerCase();
				});
			}
			return sNewText;
		},



		/* =========================================================== */
		/*  Private methods                                            */
		/* =========================================================== */

		/**
		 * This method can be called to determine whether the sapUiSizeCompact or sapUiSizeCozy
		 * design mode class should be set, which influences the size appearance of some controls.
		 * @private
		 * @return {string} css class, either 'sapUiSizeCompact' or 'sapUiSizeCozy' - or an empty string if no css class should be set
		 */
		_getContentDensityClass: function() {
			// "cozy" in case of touch support; default for most sap.m controls, but needed
			// for desktop-first controls like sap.ui.table.Table.
			let sClass = "sapUiSizeCozy";

			// Check whether FLP has already set the content density class.
			if (jQuery(document.body).hasClass("sapUiSizeCozy") || jQuery(document.body).hasClass("sapUiSizeCompact")) {
				// Already added, so no need to add it again.
				sClass = "";
			} else if (!Device.support.touch) {
				// Apply "compact" mode if touch is not supported.
				sClass = "sapUiSizeCompact";
			}

			return sClass;
		},

		/**
		 * Setup the Fiori Launchpad's Personalization API.
		 * @returns {Promise} A javascript promise fullfiled once we have the Fiori Personalization API.
		 * @private
		 */
		_bindPersonalization: function() {
			return new Promise(function(fnResolve, fnReject) {
				var oPersonalizationService = null,
					oPersonalizationContainer = null;

				if (sap.ushell.Container) {
					oPersonalizationService = sap.ushell.Container.getService("Personalization");
					if (this._oComponent) {
						var sAppId = this._oComponent.getMetadata().getManifestEntry("sap.app").id;
						oPersonalizationContainer = oPersonalizationService.getContainer(sAppId, {
							keyCategory: oPersonalizationService.constants.keyCategory.FIXED_KEY,
							writeFrequency: oPersonalizationService.constants.writeFrequency.LOW,
							clientStorageAllowed: true,
							validity: "infinity"
						}, this._oComponent);
					} else {
						oPersonalizationContainer = oPersonalizationService.getContainer(this._sPerId, {
							keyCategory: oPersonalizationService.constants.keyCategory.FIXED_KEY,
							writeFrequency: oPersonalizationService.constants.writeFrequency.LOW,
							clientStorageAllowed: true,
							validity: "infinity"
						});
					}

					oPersonalizationContainer.fail(function() {
						jQuery.sap.log.error("Loading Personalization container failed.");
						fnReject();
                    });

					oPersonalizationContainer.done(function(oContainer) {
						jQuery.sap.log.info("Personalization container loaded successfull.");
						fnResolve(oContainer);
					});
				} else {
					jQuery.sap.log.error("No sap.ushell.Container not found!  Cannot load personalization.");
					jQuery.sap.log.error("Loading Personalization container failed.");
					fnReject();
                }
			}.bind(this));
		}

	});
});
