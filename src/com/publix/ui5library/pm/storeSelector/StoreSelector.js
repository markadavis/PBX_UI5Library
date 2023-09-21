sap.ui.define([
	"sap/ui/base/Object",
	"sap/ui/Device",
	"sap/ui/core/Fragment",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/MessageType",
	"./Utilities"
], function(UI5Object, Device, Fragment, JSONModel, MessageType, Utilities) {
	"use strict";
	jQuery.sap.includeStyleSheet("/sap/bc/ui5_ui5/sap/ZCA_UI5_LIBRARY/pm/storeSelector/css/StoreSelector.css");

	return UI5Object.extend("com.publix.ui5library.pm.storeSelector.StoreSelector", {
		utils: new Utilities(),
		_EVENTS: {},
		_DEFAULTS: {
			NearbyRadius: 10,	// Miles
			MessageType: sap.ui.core.MessageType.Information
		},


		/* =========================================================== */
		/*  Lifecycle methods                                          */
		/* =========================================================== */

		/**
		 * Construct an instance of the Store Maintenance dialog control.
		 * @param {string} sPersonalizationId The (optional) Id to use for Personalization.
		 * @param {} oComponent The (optional) component to assign the storage with (uses the app's ID).
		 * @param {Object} oParams optional setup parameters:
		 * 		{
		 * 			coordinates: {Object} The coordinates to use for 'Stores Nearby'
		 * 			personalizationId: {String} The Id to use for Personalization.
		 * 			ownerComponent: {Object} The component to assign the storage with (uses the app's ID).
		 * 			defaultNearbyRadius: {String} The default radius for 'nearby' calculations (in miles).
		 * 		}
		 * @class
		 * @public
		 * @alias com.publix.ui5library.pm.storeSelector.StoreSelector
		 */
		constructor: function(oParameters) { //sPersonalizationId, oCoordinates, oComponent) {
			let oParams = oParameters || {};

			this._oSelectorReady = new Promise((fnResolve, fnReject) => {
				this.sControlId = this.getMetadata().getName();
				this.logger = this.utils.getAppLogger();

				// Bind some private members from the calling controller (listener).
				this._sPerId = oParams.personalizationId || "PM_StoreSelector";
				this._oComponent = oParams.component || null;
				if (oParams.defaultNearbyRadius) this._DEFAULTS.NearbyRadius = oParams.defaultNearbyRadius;

				// Bind the Fiori Launchpad's Personaization API.
				this._oPersonalization = this._bindPersonalization();

				// Bind the resource bundle.
				this._oResourceBundle = this.utils.getResoureBundle();

				// Construct the Dialog.
				Fragment.load({
					name: "com.publix.ui5library.pm.storeSelector.fragment.StoreSelector",
					controller: this
				}).then(oFragment => {
					this._oDialog = oFragment;

					let sDensityClass = this._getContentDensityClass();
					if (sDensityClass) {
						this._oDialog.addStyleClass(sDensityClass);
					}

					// Set the dialog's resource & default models.
					this._oDialog.setModel(this.utils.getResoureModel(), "i18n");
					this._oDialogModel = new JSONModel({
						userCoordinates: null,
						ShowNearby: false,
						NearbyRadius: this._DEFAULTS.NearbyRadius,  // Miles 'as the crow flies'
						StoresNearby: [],
						StoresAdded: [],
						HaveStores: false,
						Message: {
							Type: this._DEFAULTS.MessageType,
							Text: ""
						}
					});
					this._oDialog.setModel(this._oDialogModel).bindElement("/");

					this.setUserCoordinates(oParams.coordinates || null);

					// Clear the Model values each time the Dialog is opened.
					this._oDialog.attachBeforeOpen((oEvent) => {
						this._oDialogModel.setProperty("/ShowNearby", false);
						this._oDialogModel.setProperty("/NearbyRadius", this._DEFAULTS.NearbyRadius);

						this._oDialogModel.setProperty("/StoresNearby", []);
						let oNearbyPanel = this._getNearbyPanel();
						oNearbyPanel.setBusy(true);
						this.getStoresNearby().then(aStores => {
							this._oDialogModel.setProperty("/StoresNearby", aStores);
							this._updateNearbyList();
							oNearbyPanel.setBusy(false);
						}).catch(oError => {
							this._getNearbyPanelList().removeSelections();
							oNearbyPanel.setBusy(false);
						});
					});
	
					// Set the focus to the input field each time the Dialog is opened.
					this._oDialog.attachAfterOpen((oEvent) => {
						this._getStoreInput().focus();
					});
	
					// Update the Nearby Stores list with ones already selected.
					this._getNearbyPanelList().attachUpdateFinished(oEvent => {
						this._oSelectorReady.then(() => {
							let aNearbyStores = this._oDialogModel.getProperty("/StoresNearby");
							if (aNearbyStores.length > 0) {
								let aItems = this._getNearbyPanelList().getItems();
								this._oDialogModel.getProperty("/StoresAdded").forEach(oNearbyStore => {
									aItems.forEach(oItem => {
										let oStore = this._oDialogModel.getProperty(oItem.getBindingContextPath());
										if (oStore && (oStore.StoreId === oNearbyStore.StoreId)) {
											oItem.setSelected(true);
										}
									});
								});
		
							}
						});
					});

					// Load up the list of stores previously saved by the user.
					this._oPersonalization.then((oAPI) => {
						// Add the list of saved stores to the Dialog's default model.
						let aStores = oAPI.getItemValue("storeList") || [];
						this._oDialogModel.setProperty("/StoresAdded", aStores);
						if (aStores.length > 0) {
							this._oDialogModel.setProperty("/HaveStores", true);
						}
						fnResolve(aStores);
					}).catch(oError => {
						// Add the list of saved stores to the Dialog's default model.
						this._oDialogModel.setProperty("/StoresAdded", []);
						fnReject(oError);
					});
				}).catch(oError => {
					fnReject(oError);
				});
			});
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
			// Clear the message strip.
			this._showMessageStrip();

			let oStoreInput = oEvent.getSource(),
				sStoreId = oStoreInput.getValue();

			if (!sStoreId) {
				this._showMessageStrip(this._oResourceBundle.getText("ErrNoStoreIdEntered"), MessageType.Warning);
			} else {
				let fnAddStore = (oStore) => {
					let aStores = this._oDialogModel.getProperty("/StoresAdded") || [];

					aStores = aStores.filter(oExistingStore => {
						return oExistingStore.StoreId !== oStore.StoreId;
					});

					aStores.push(oStore);
					this._oDialogModel.setProperty("/StoresAdded", aStores);
					this._oDialogModel.setProperty("/HaveStores", true);
					this._updateNearbyList();

					oStoreInput.setValue();

					this._oDialog.setBusy(false);
				};

				this.utils.getStore(sStoreId).then(oStore => {
					fnAddStore(oStore);
					this._updateNearbyList();

				}).catch(oError => {
					this._oDialog.setBusy(false);
					this._showMessageStrip(this._oResourceBundle.getText("ErrNoStoreFound", sStoreId), MessageType.Error);			
				});
			}
		},

		/** Remove a sort item from the list of sort fields.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onDelete: function(oEvent) {
			let oListItem = oEvent.getParameter("listItem"),
				aStores = this._oDialogModel.getProperty("/StoresAdded"),
				aParts = oListItem.getBindingContextPath().split("/StoresAdded/");

			if (aParts && aParts.length > 1) {
				let iIndex = parseInt(aParts[1], 10);
				aStores.splice(iIndex, 1);
				this._oDialogModel.setProperty("/StoresAdded", aStores);
				this._updateNearbyList();
			}

			if (aStores.length <= 0) {
				this._oDialogModel.setProperty("/HaveStores", false);
			}
		},

		/** Handle the "Apply" event (button press) from the Sort dialog.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onApply: function(oEvent) {
			var aStores = this._oDialogModel.getProperty("/StoresAdded");

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

		/** Handle the "Cancel" event (button press) from the Sort dialog.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onCancel: function(oEvent) {	//eslint-disable-line no-unused-vars
			this._oDialog.close();
			var aStores = this._oDialogModel.getProperty("/StoresAdded") || [];
			this._fnCallbackOnClose(false /*not applied*/, aStores);
		},

		/** Handle the 'Nearby' store button press event. Show nearby stores.
		 * @param {sap.ui.base.Event} oEvent the 'Nearby' button press event object.
		 * @public
		 */
		onNearbyShowHide: function(oEvent) {
			let bShow = true;
			if (this._oDialogModel.getProperty("/ShowNearby")) {
				bShow = false;
			}
			this._oDialogModel.setProperty("/ShowNearby", bShow);
		},

		/** Handle the 'Panel Close' (X) press event to hide the Nearby Stores panel.
		 * @param {sap.ui.base.Event} oEvent 
		 * @public
		 */
		onNearbyPanelClosePress: function(oEvent) {
			this._oDialogModel.setProperty("/ShowNearby", false);
		},

		/** Update the radius (miles) for the distance calculations.
		 * @param {sap.ui.base.Event} oEvent 
		 * @public
		 */
		onNearbyRadiusChange: function(oEvent) {
			// Clear the message strip.
			this._showMessageStrip();

			if (this._ActiveRadiusEvent) return;
			this._EVENTS.onNearbyRadiusChange = true;

			let oNearbyPanel = this._getNearbyPanel();
				oNearbyPanel.setBusy(true);

			this.getStoresNearby().then(aStores => {
				this._EVENTS.onNearbyRadiusChange = false;
				this._oDialogModel.setProperty("/StoresNearby", aStores);
				oNearbyPanel.setBusy(false);
			}).catch(oError => {
				this._showMessageStrip(oError.message, MessageType.Warning);
				this._EVENTS.onNearbyRadiusChange = false;
				this._oDialogModel.setProperty("/NearbyRadius", this._DEFAULTS.NearbyRadius);
				oNearbyPanel.setBusy(false);
			});
		},

		/** Handle the line select/unselect event of the 'Nearby Stores' list.
		 * Add & remove stores from the 'Store Selection' list (based on selection).
		 * @param {sap.ui.base.Event} oEvent the 'selectionChange' event object.
		 * @public
		 */
		onNearbySelectionChange: function(oEvent) {
			let oItem = oEvent.getParameter("listItem");
			if (oItem) {
				let aStoresAdded = this._oDialogModel.getProperty("/StoresAdded"),
					oNearbyStore = this._oDialogModel.getProperty(oItem.getBindingContextPath()),
					aChangedStores = aStoresAdded.filter(oStore => {
						return oStore.StoreId !== oNearbyStore.StoreId ? true : false;
					});

				if (oItem.getSelected()) {
					// Add the store to the list.
					aChangedStores.push(oNearbyStore);
				}

				this._oDialogModel.setProperty("/StoresAdded", aChangedStores);
				this._getStoreList().rerender();
			}
		},



		/* =========================================================== */
		/*  Public methods                                             */
		/* =========================================================== */

		/** Open the Store Maintenance dialog.
		 * @param {function} fnCallBack The function to call when the dialog is closed.
		 * @public
		 */
		openDialog: function(fnCallBack) {
			this._fnCallbackOnClose = fnCallBack || null;
			this._oSelectorReady.then(function() {
				this._oDialog.open();
			}.bind(this));
		},

		/** Set the Title of the Dialog control.
		 * @param {String} sText The text string to be used as the Dialog Title.
		 * @public
		 */
		setDialogTitle: function(sText) {
			this._getTitleText().setText(sText);
		},

		/** Set the User's coordinates for the 'nearby' calculations.
		 * @param {Object} oUserCoordinates The User Latitude & Longitued object.
		 * @return {Object} The User Coordinates.
		 * @public
		 */
		setUserCoordinates: function(oCoordinates) {
			let oUserCoordinates = oCoordinates || null;

			if (oUserCoordinates) {
				try {
					oUserCoordinates = oUserCoordinates && oUserCoordinates.hasOwnProperty("latitude") ? oUserCoordinates : null;
					oUserCoordinates = oUserCoordinates && oUserCoordinates.hasOwnProperty("longitude") ? oUserCoordinates : null;
					oUserCoordinates = oUserCoordinates && (oUserCoordinates.latitude * 1) !== 0 ? oUserCoordinates : null;
					oUserCoordinates = oUserCoordinates && (oUserCoordinates.longitude * 1) !== 0 ? oUserCoordinates : null;	
				} catch (oError) {
					oUserCoordinates = null;
				}
			}

			this._oDialogModel.setProperty("/userCoordinates", oUserCoordinates);
			
			return oUserCoordinates;
		},

		/** Return all of the stores saved in the instance.
		 * @returns {Promise} A JavaScript Promise that returns the stores when resloved.
		 * @public
		 */
		getStores: function() {
			return new Promise((fnResolve, fnReject) => {
				this._oSelectorReady.then(() => {
					fnResolve(this._oDialogModel.getProperty("/StoresAdded"));
				})
				.catch((oError) => {
					fnReject(oError);
				});
			});
		},

		/** Return all of the stores within a 20 mile radius of the given coordinates.
		 * @param {object} Coordinates w/ lattitude & logitude
		 * @param {Integer} iRadius optional raidus in miles, to use for the caluclation.
		 * @returns {Promise} A JavaScript Promise that returns the stores when resloved.
		 * @public
		 */
		getStoresNearby: function(oUserCoordinates, iRadius) { 
			return new Promise((fnResolve, fnReject) => {
				let oCoordinates = oUserCoordinates || this._oDialogModel.getProperty("/userCoordinates");
				if (oCoordinates && oCoordinates.hasOwnProperty("latitude") && oCoordinates.hasOwnProperty("longitude")) {

					let iMiles = iRadius || this._oDialogModel.getProperty("/NearbyRadius");
					if (Number.isNaN(iMiles) || iMiles <= 0) {
						fnReject(new Error(this._oResourceBundle.getText("ErrRadiusNotNumber")))
					}
					this.utils.getServiceModel().read("/StoreSet", {
						success: (oData) => {
							let aStores = oData.results || [],
								aStoresNearby = [];

							aStores.forEach((oStore) => {
								let oStoreCoordinates = {
									latitude: oStore.Address.Longitude * 1,
									longitude: oStore.Address.Latitude * 1
								};
								if (oStoreCoordinates.latitude !== 0 && oStoreCoordinates.longitude !== 0) {
									let fDistance = this._calculateDistance(oCoordinates, oStoreCoordinates);
									if (fDistance - iMiles <= 0) {
										oStore.distance = fDistance;
										aStoresNearby.push(oStore);
									}
								}
							});
	
							aStoresNearby.sort((a, b) => {
								let iWeight = 0;
								if (a.distance < b.distance) {
								  iWeight = -1;
								} else if (a.distance > b.distance) {
								  iWeight = 1;
								}
								return iWeight;
							  });

							fnResolve(aStoresNearby);
						},
						error: (oError) => {
							fnReject(oError);
						}
					});
				} else {
					fnReject(new Error(this._oResourceBundle.getText("ErrNoLatLong")));
				}
			});
		},

		/** Capitalize the first charactrer of each work in a string.
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

		/** Format the float number for distance to 1 decimal as miles.
		 * @param {String} sDistance The unformatted distance.
		 * @returns {String} The formatted distance w/ units.
		 * @public
		 */
		formatDistance: function(sDistance) {
			let fDistance = (sDistance * 1).toFixed(1);
			return fDistance.toString() + " mi";
		},



		/* =========================================================== */
		/*  Private methods                                            */
		/* =========================================================== */

		/** Update the 'Nearby Stores' list to select any nearby stores that have 
		 * already been added to the list.
		 * @private
		 */
		_updateNearbyList: function() {
			let aItems = this._getNearbyPanelList().getItems(),
				aStoresAdded = this._oDialogModel.getProperty("/StoresAdded");

			this._getNearbyPanelList().removeSelections();

			aStoresAdded.forEach(oStore => {
				aItems.forEach(oItem => {
					let oNearbyStore = this._oDialogModel.getProperty(oItem.getBindingContextPath());

					if (oStore.StoreId === oNearbyStore.StoreId) {
						oItem.setSelected(true);
					}
				});
			});

			this._getStoreList().rerender();
		},

		/** This method can be called to determine whether the sapUiSizeCompact or sapUiSizeCozy
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

		/** Setup the Fiori Launchpad's Personalization API.
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
		},

		/** Return the calculated straight-line distance between two points using the haversine formula:
		 * Both oPoint1 & oPoint2 are Objects with properties latitude {Number} & longitude {Number}}
		 * The latitude & Longitude values are both given as 'minutes'.
		 * (JavaScrtip Numbers are always 64-bit floating point)
		 * 
		 * @public
		 * @param {Object} oPoint1 the latitude & longitued of the 1st point
		 * @param {Object} oPoint2 the latitude & longitued of the 2nd point
		 * @param {String} sUnit untis for the returned value; K=Kilometers, M=Miles (default M)
		 * @returns {Number} the calculated straight-line distance
		 */
        _calculateDistance: function(oPoint1, oPoint2, sUnit) {
            let fDistance = 0;

			let fLatitude1 = oPoint1.latitude * 1,
				fLongitued1 = oPoint1.longitude * 1,
				fLatitude2 = oPoint2.latitude * 1,
				fLongitued2 = oPoint2.longitude * 1;

            if (!((fLatitude1 == fLatitude2) && (fLongitued1 == fLongitued2))) {
				const R = 3958.8; // radius of the earth in miles
				const dLat = (fLatitude2-fLatitude1) * (Math.PI / 180);
				const dLon = (fLongitued2-fLongitued1) * (Math.PI / 180); 
				const a = (Math.sin(dLat/2) * Math.sin(dLat/2)) +
				  		Math.cos((fLatitude1) * (Math.PI / 180)) * 
						Math.cos((fLatitude2) * (Math.PI / 180)) * 
				  		Math.sin(dLon/2) * Math.sin(dLon/2); 
				const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 

                switch (sUnit) {
                    case "K":   // Kilometers
                        fDistance =  (R * c ) * 1.609344;
                        break;
                    default:    // Miles
						fDistance =  (R * c);
                        break;
                }
            }

            return fDistance;
        },

		/** Show the a message in the reserved content area on the Dialog. To Hide it, send an empty message.
		 * @param {String} sMessage The message to place into the MessageStrip 
		 * @param {sap.ui.core.MessageType} sType [Information] An optional message type ("Information", "Warning", "Error", "Success")
		 * @private
		 */
		_showMessageStrip(sMessage, sMessageType) {
			let sType = sMessageType ? sMessageType : this._DEFAULTS.MessageType;

			if (!MessageType.hasOwnProperty(sType)) {
				sType = this._DEFAULTS.MessageType;
			}

			if (sMessage) {
				this._oDialogModel.setProperty("/Message", {
					Type: sType,
					Text: sMessage
				});
				this._getMessageStrip().setVisible(true);
			} else {
				this._getMessageStrip().setVisible(false);
			}
		},

		_getTitleText: function() {
			let oHeader = this._oDialog.getAggregation("customHeader"),
				oTitle = oHeader.getAggregation("contentLeft")[0];
			return oTitle;
		},

		_getNearbyButton: function() {
			let oHeader = this._oDialog.getAggregation("customHeader"),
				oButton = oHeader.getAggregation("contentRight")[0];
			return oButton;
		},

		_getStoreInput: function() {
			let oSubHeader = this._oDialog.getAggregation("subHeader"),
				oBar = oSubHeader.getAggregation("contentMiddle")[0],
				oStoreInput = oBar.getItems()[0];
			return oStoreInput;
		},

		_getStoreList: function() {
			let oContentGrid = this._oDialog.getAggregation("content")[0],
				oStoreList = oContentGrid.getAggregation("items")[0];
			return oStoreList;
		},

		_getNearbyPanel: function() {
			let oContentGrid = this._oDialog.getAggregation("content")[0],
				oNearbyPanel = oContentGrid.getAggregation("items")[2];
			return oNearbyPanel;
		},

		_getNearbyPanelList: function() {
			let oContentGrid = this._oDialog.getAggregation("content")[0],
				oNearbyPanel = oContentGrid.getAggregation("items")[2],
				oNearbyList = oNearbyPanel.getAggregation("content")[0];
			return oNearbyList;
		},

		_getMessageStrip: function() {
			let oMessageStrip =this._oDialog.getAggregation("content")[1];
			return oMessageStrip;
		},

	});
});