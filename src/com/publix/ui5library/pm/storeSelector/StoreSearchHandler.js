sap.ui.define([
	"sap/ui/base/Object",
	"sap/ui/core/Fragment",
	"sap/ui/model/json/JSONModel",
	"./Utilities",
	"./StoreSelector"
], function(UI5Object, Fragment, JSONModel, Utilities, StoreSelector) {
	"use strict";

	return UI5Object.extend("com.publix.ui5library.pm.storeSelector.StoreSearchHandler", {
		_pluginInstalled: null, _sActiveGeoLocPlugin: "",
		utils: new Utilities(true/*don't initialize the service (OData model)*/),

		/**
		 * Handles Store searching whilst using Geo Location to sort by distance to Store using appropriate API.
		 * @class
		 * @alias com.publix.ui5library.pm.storeSelector.StoreSearchHandler
		 * 
		 * @public
		 * @param {sap.ui.core.UIComponent} oComponent reference to the owner component for namespacing.
		 */
		constructor: function(oComponent) {
			this._oOwnerComponent = oComponent;
			this.sControlId = this.getMetadata().getName();

			this._sAppID = this.sControlId;
			try {
				this._sAppID = this._oOwnerComponent ? this._oOwnerComponent.getManifestEntry("sap.app").id : this.sControlId;
			} catch (oError) {}

			this._oResourceBundle = this.utils.getResoureBundle();

			this._pluginInstalled = this._registerMapper();

			this._pluginInstalled.then(sActivePlugin => {
				this._sActiveGeoLocPlugin = sActivePlugin;
			});
		},

		/**
		 * The control is automatically destroyed by the UI5 runtime.
		 * @public
		 * @override
		 */
		destroy: function() {
			// Destroy the dialog if it was constructed.
			if (this.storeMapperControl._oMapDialog) {
				this.storeMapperControl._oMapDialog.destroy();
				this.storeMapperControl._oMapDialog = null;
			}

			// call the base component's destroy function
			UI5Object.prototype.destroy.apply(this, arguments);
		},



		/* =========================================================== */
		/* begin: event handler methods                                */
		/* =========================================================== */

		/**
		 * Activeate the Store Search functionality (dialog to search for stores).
		 * 
		 * @public
		 * @param {Function} fnCallback the Function to call when the scan completes.
		 * @param {Object} oConfig an optional object with specific scaner API properteis.
		 * @returns {*} a String value of the scan ~or~ an Error object if the scan had issues.
		 */
		onSearch: function(fnCallback, oConfig) {
			this._pluginInstalled.then(sPlugin => {
				if (sPlugin) {
					this.plugins[sPlugin].getLocation.call(this, oConfig).then(oCurrentCoordinates => {
						if (!this._oStoreSelector) {
							this._oStoreSelector = new StoreSelector({coordinates: oCurrentCoordinates});
						}

						this._oStoreSelector.openDialog((bIsApplied, aStores) => {
							fnCallback(bIsApplied, aStores);
						});	

					}).catch(oError => {
						fnCallback(oError);
					});
				} else {
					let oError = new Error(this._oResourceBundle.getText("StoreSearch_noPlugin"));
					this.utils.logMessage(oError);
					fnCallback(oError);
				}
			});
		},

		/**
		 * Activeate the Store Picker functionality (dialog to choose multiple stores).
		 * 
		 * @public
		 * @param {Function} fnCallback the Function to call when the scan completes.
		 * @param {Object} oConfig an optional object with specific scaner API properteis.
		 * @returns {*} a String value of the scan ~or~ an Error object if the scan had issues.
		 */
		onAddStores: function(fnCallback, oConfig) {
			this._pluginInstalled.then(sPlugin => {
				if (sPlugin) {
					this.plugins[sPlugin].getLocation.call(this, oConfig).then(oCurrentCoordinates => {
						if (!this._oStoreSelector) {
							this._oStoreSelector = new StoreSelector({coordinates: oCurrentCoordinates});
						}

						this._oStoreSelector.openDialog((bIsApplied, aStores) => {
							fnCallback(bIsApplied, aStores);
						});

					}).catch(oError => {
						fnCallback(oError);
					});
				} else {
					let oError = new Error(this._oResourceBundle.getText("StoreSearch_noPlugin"));
					this.utils.logMessage(oError);
					fnCallback(oError);
				}
			});
		},

		/**
		 * Open the Map dialog to show the given stores (pins) near the 'base' (my) location.
		 * 
		 * @public
		 * @param {Object} oBaseCoordinates Coordinates (lat,lon) for the 'base' location (where am i)
		 * @param {Array} aStoreCoordinates Coordinates (lat,lon) for the store 'pin' locations
		 */
		onMapSearch: function(oBaseCoordinates, aStoreCoordinates) {
			// Construct the Map Dialog if needed.
			if (!this.storeMapperControl._oMapDialog) {
				Fragment.load({
					name: "com.publix.ui5library.pm.storeSelector.map.StoreMap",
					controller: this
				}).then(oFragment => {
					this.storeMapperControl._oMapDialog = oFragment;
					this.storeMapperControl._oMapDialog.setModel(this._oResourceModel, "i18n");
					this.storeMapperControl._oMapDialog.addStyleClass(this._getContentDensityClass());	
				}).catch(oError => {
					// TODO - Show Load Error !!!
				});
			}

			return new Promise((fnResolve, fnReject) => {
				this.storeMapperControl.dialogResolver = fnResolve;
				this.storeMapperControl.dialogRejector = fnReject;

				// Set the dialog's default mode.
				this.getLocation().then(oCoordinates => {
					this.storeMapperControl._oMapDialog.setModel(new JSONModel({
						//address: "3300 Publix Corporate Pkwy, Lakeland, FL 33811"	  // Remove the 'default' address (for testing only)
						latitude: oCoordinates.latitude,
						longitude: oCoordinates.longitude
					})).bindElement("/");
					try {
						this.storeMapperControl._oMapDialog.open();
					} catch(oError) {
						this.storeMapperControl.dialogRejector(oError);
					}
				}).catch(oError => {
					this.storeMapperControl.dialogRejector(oError);
				});
			});
		},
		storeMapperControl: {
			_oMapDialog: null,
			dialogResolver: null,
			dialogRejector: null,
			onStoreSelected: function(oEvent) {
				let sStoreId = "0010";	// TODO - handel event to set the Store ID !!!
				this.storeMapperControl._oMapDialog.close();
				this.storeMapperControl.dialogResolver({
					storeId: sStoreId,
					cancelled: false
				});
			},
			onStoreMapperClose: function(oEvent) {
				this.storeMapperControl._oMapDialog.close();
				this.storeMapperControl.dialogResolver({
					storeId: "",
					cancelled: true
				});
			}
		},



		/* =========================================================== */
		/* begin: public methods                                       */
		/* =========================================================== */

		/**
		 * Get the name of the active Geo Location API (plugin).
		 * 
		 * @public
		 * @returns {String} the active plugin name.
		 */
		getGeoLocationPluginName: function() {
			return new Promise((fnResolve, fnReject) => {
				fnResolve(this._sActiveGeoLocPlugin);
			});
		},

		/**
		 * Set the name of the active Geo Location API (plugin).
		 * 
		 * @public
		 * @param {String} sPluginName the active plugin name.
		 */
		setGeoLocationPluginName: function(sPluginName) {
			return new Promise((fnResolve, fnReject) => {
				try {
					this._pluginInstalled.then(sActivePlugin => {
						let sPlugin = "";
						Object.keys(this.plugins).forEach(sName => {
							if (sName === sPluginName && this.plugins[sName]._geoLocationHandler) {
								sPlugin = sName;
							}
						});
						if (sPlugin) {
							fnResolve(this._sActiveGeoLocPlugin);
						} else {
							fnReject(new Error(this._oResourceBundle.getText("StoreSearch_logPluginAssignFailed", [sPluginName])));
						}
					}).catch(oError => {
						fnReject(oError);
					});
				} catch (oError) {
					fnReject(oError);
				}
			});
		},

		/**
		 * Return the coordinates of the caller's current location (if available).
		 * 
		 * @public
		 * @returns {Promise} Resolves with the location coordinates {lat,lon}.
		 */
		getLocation: function() {
			return new Promise((fnResolve, fnReject) => {
				if (this._sActiveGeoLocPlugin) {
					this.plugins[this._sActiveGeoLocPlugin].getLocation.call(this)
					.then(oCoordinates => {
						fnResolve(oCoordinates);
					})
					.catch(oError => {
						fnReject(oError);
					});
				} else {
					fnReject(new Error(this._oResourceBundle.getText("StoreSearch_noPlugin")));
				}
			});
		},

		/**
		 * Return the calculated straight-line distance between two points:
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
        calculateDistance: function(oPoint1, oPoint2, sUnit) {
            let fDistance = 0;

			let fLatitude1 = oPoint1.latitude * 1,
				fLongitued1 = oPoint1.longitude * 1,
				fLatitude2 = oPoint2.latitude * 1,
				fLongitued2 = oPoint2.longitude * 1;

            if (!((fLatitude1 == fLatitude2) && (fLongitued1 == fLongitued2))) {
                let fLatitudeRadians1 = Math.PI * fLatitude1/180,
                    fLatitudeRadians2 = Math.PI * fLatitude2/180,
                    fTheta = Math.PI * (fLongitued1 - fLongitued2)/180;

                fDistance = Math.sin(fLatitudeRadians1) * Math.sin(fLatitudeRadians2) + 
                            Math.cos(fLatitudeRadians1) * Math.cos(fLatitudeRadians2) * Math.cos(fTheta);

                if (fDistance > 1) {
                    fDistance = 1;
                }

                fDistance = Math.acos(fDistance);
                fDistance = fDistance * 180/Math.PI;
                fDistance = fDistance * 60 * 1.1515;

                switch (sUnit) {
                    case "K":   // Kilometers
                        fDistance = fDistance * 1.609344;
                        break;
                    default:    // Miles
                        fDistance = fDistance * 0.8684;
                        break;
                }
            }

            return fDistance;
        },



		/* =========================================================== */
		/* begin: private methods                                      */
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

		/**
		 * Register the first barcode scanning API found (installed).
		 * The order of importance is as defined in the .plugins{} object.
		 * 
		 * @return {String} the name of the active scanning API.
		 * @private
		 */
		_registerMapper: function() {
			let sActivePlugin = "";

			return new Promise((fnResolve, fnReject) => {
				// Loop through all known geo location API's to find the first installed handler.
				let aInitializations = [];
				Object.keys(this.plugins).forEach((sPlugin) => {
					aInitializations.push(this.plugins[sPlugin].init.call(this));
				});

				let oInitializer = Promise.allSettled(aInitializations);
				
				oInitializer.then(aResults => {
					// Check them in order of resolution.
					Object.keys(this.plugins).every(sPluginId => {
						aResults.find(oRes => {
							if (oRes.status === "fulfilled" && oRes.value) {
								sActivePlugin = oRes.value;
							}
						});
						return sActivePlugin ? false : true;  // Get out once we have a plugin ID
					});

					// Create a log warning entry if no scanner API is installed.
					if (!sActivePlugin) {
						let oWarning = new Error(this._oResourceBundle.getText("StoreSearch_logNoActivePlugin"));
						this.utils.logMessage(oWarning, this.util.LogLevel.WARNING);
					}

					fnResolve(sActivePlugin);
				});
				
				oInitializer.catch(oError => {
					this.utils.logMessage(oError);
					fnResolve(sActivePlugin);
				});
			});
		},



		/* =========================================================== */
		/* begin: plugin modules                                       */
		/* =========================================================== */
		plugins: {

			/**
			 * Cordova Geo Location service.
			 */
			CordovaGeoLocation: {
				_geoLocationHandler: null,

				/**
				 * Check to see if the plugin is installed and able to be initialized.
				 * 
				 * @returns {boolean} true if the plugin in installed and usable, otherwise false.
				 * @public
				 */
				init: function() {
					this.plugins.CordovaGeoLocation._geoLocationHandler = null;

					return new Promise((fnResolve, fnReject) => {
						try {
							let bInstalled = (
								window.cordova &&
								window.cordova.hasOwnProperty("plugins") &&
								window.cordova.plugins.hasOwnProperty("geolocation") &&
								typeof(window.cordova.plugins.geolocation.getCurrentPosition) === "function"
							) ? true : false;

							if (bInstalled) {
								this.plugins.CordovaGeoLocation._geoLocationHandler = window.cordova.plugins.geolocation;
								fnResolve("CordovaGeoLocation");
							} else {
								let oInfo = new Error(this._oResourceBundle.getText("StoreSearch_logCordovaNoPlugin"));
								this.utils.logMessage(oInfo, this.util.LogLevel.INFO);
								fnResolve(false);
							}
						} catch(oErr) {
							let oError = new Error(this._oResourceBundle.getText("StoreSearch_logCordovaInitNoText"), {cause: oErr});
							fnReject(oError);
						}
					});
				},

				/**
				 * Start the Cordova Geo Location (cordova plugin) to capture the current Geo Location {lat,long}.
				 * The callback function will return either an object w/ lat & log or an Error object.
				 * 
				 * @param {Function} fnCallback the function to call after a successful scan event.
				 * @param {Object} oConfig contains optional plugin configuration parameters (not used here by this plugin).
				 * @public
				 */
				getLocation: function(oConfig) {
					return new Promise((fnResolve, fnReject) => {
						let sErrorMsg = "",
							oError = null,
							oConfiguration = oConfig || {};

						// Default 5 second timeout for speed.
						oConfiguration.timeout = oConfiguration.time ? oConfiguration.timeout : 5000;
						// Default allow cached locations up to 5 minutes.
						oConfiguration.maximumAge = oConfiguration.maximumAge ? oConfiguration.maximumAge : (5 * 60000);
						// Default accuracy to low quality for speed.
						oConfiguration.enableHighAccuracy = oConfiguration.hasOwnProperty("enableHighAccuracy") ? oConfiguration.enableHighAccuracy : false;

						if (this.plugins.CordovaGeoLocation._geoLocationHandler) {
							this.plugins.CordovaGeoLocation._geoLocationHandler.getCurrentPosition(
								(oPosition) => {	// Success
									let oCoordinates = oPosition && oPosition.coords ? {
										latitude: oPosition.coords.latitude || 0,
										longitude: oPosition.coords.longitude || 0
									} : null;
									if (oCoordinates && (oCoordinates.latitude === 0 || oCoordinates.longitude === 0)) {
										oCoordinates = null;
										let oInfo = new Error(this._oResourceBundle.getText("StoreSearch_logCordovaSearchNoCoords"));
										this.utils.logMessage(oInfo, logMessage.INFO);
									}
									fnResolve(oCoordinates);
								},
								(oErr) => {	// Fail
									oError = new Error(this._oResourceBundle.getText("StoreSearch_logCordovaGeoLocfailed"), {cause: oErr});
									this.utils.logMessage(oError);								
									fnReject(oError);
								},
								oConfig	// optional configuration
							);
						} else {
							oError = new Error(this._oResourceBundle.getText("StoreSearch_logCordovaCallNoPlugin"));
							this.utils.logMessage(oError);						
							fnReject(oError);
						}
					});
				}
			},

			/**
			 * Uses the Browser 'navigator' API
			 */
			BrowserGeoLocation: {
				_geoLocationHandler: null,

				/**
				 * Check to see if the plugin is installed and able to be initialized.
				 * 
				 * @returns {boolean} true if the plugin in installed and usable, otherwise false.
				 * @public
				 */
				init: function() {
					this.plugins.BrowserGeoLocation._geoLocationHandler = null;

					return new Promise((fnResolve, fnReject) => {
						try {
							let bInstalled = (
								window.navigator &&
								window.navigator.geolocation &&
								window.navigator.geolocation.getCurrentPosition &&
								typeof(window.navigator.geolocation.getCurrentPosition) === "function"
							) ? true : false;

							if (bInstalled) {
								this.plugins.BrowserGeoLocation._geoLocationHandler = window.navigator.geolocation;
								// Test the service.
								this.plugins.BrowserGeoLocation.getLocation.call(this, {}).then(oPosition => {
									if (oPosition.hasOwnProperty("latitude") && oPosition.hasOwnProperty("longitude")) {
										fnResolve("BrowserGeoLocation");
									} else {
										this.plugins.BrowserGeoLocation._geoLocationHandler = null;
										fnResolve(false);
									}
								}).catch(oError => {
									fnResolve(false);
								});
							} else {
								let oInfo = new Error(this._oResourceBundle.getText("StoreSearch_logBrowserNoPlugin"));
								this.utils.logMessage(oInfo, this.util.LogLevel.INFO);
								fnResolve(false);
							}
						} catch(oErr) {
							let oError = new Error(this._oResourceBundle.getText("StoreSearch_logBrowserInitNoText"), {cause: oErr});
							fnReject(oError);
						}
					});
				},

				/**
				 * Start browser's Geo Location (navigator) to capture the current Geo Location {lat,long}.
				 * The callback function will return either an object w/ lat & log or an Error object.
				 * 
				 * @param {Function} fnCallback the function to call after a successful scan event.
				 * @param {Object} oConfig contains optional plugin configuration parameters (not used here by this plugin).
				 * @public
				 */
				getLocation: function(oConfig) {
					return new Promise((fnResolve, fnReject) => {
						let oConfiguration = oConfig || {};

						// Default 5 second timeout for speed.
						oConfiguration.timeout = oConfiguration.time ? oConfiguration.timeout : 5000;
						// Default allow cached locations up to 5 minutes.
						oConfiguration.maximumAge = oConfiguration.maximumAge ? oConfiguration.maximumAge : (5 * 60000);
						// Default accuracy to low quality for speed.
						oConfiguration.enableHighAccuracy = oConfiguration.hasOwnProperty("enableHighAccuracy") ? oConfiguration.enableHighAccuracy : false;

						if (this.plugins.BrowserGeoLocation._geoLocationHandler) {
							this.plugins.BrowserGeoLocation._geoLocationHandler.getCurrentPosition(
								(oPosition) => {	// Success
									let oCoordinates = oPosition && oPosition.coords ? {
										latitude: oPosition.coords.latitude || 0,
										longitude: oPosition.coords.longitude || 0
									} : null;
									if (oCoordinates && (oCoordinates.latitude === 0 || oCoordinates.longitude === 0)) {
										oCoordinates = null;
										let oInfo = new Error(this._oResourceBundle.getText("StoreSearch_logBrowserSearchNoCoords"));
										this.utils.logMessage(oInfo, this.util.LogLevel.INFO);
									}
									fnResolve(oCoordinates);
								},
								(oErr) => {	// Fail
									let oError = new Error(this._oResourceBundle.getText("StoreSearch_logBrowserGeoLocfailed"), {cause: oErr});
									this.utils.logMessage(oError);					
									fnReject(oError);
								}
							);
						} else {
							let oError = new Error(this._oResourceBundle.getText("StoreSearch_logBrowserCallNoPlugin"));
							this.utils.logMessage(oError);
							fnReject(oError);
						}
					});
				}
			},

			/**
			 * Uses the user's IP address along with the Google API (or ipgeolocation.io) web service to get the
			 * location of the device's IP address.
			 */
			IpGeoLocation: {
				_geoLocationHandler: null,
				_geoLocationIP: "",

				/**
				 * Check to see if the plugin is installed and able to be initialized.
				 * 
				 * @returns {Promise} javascript promise that resolves with the IP address of the user.
				 * @public
				 */
				init: function() {
					this.plugins.IpGeoLocation._geoLocationHandler = null;

					return new Promise((fnResolve, fnReject) => {
						this.plugins.IpGeoLocation._getIpAddress().then(sIpAddress => {
							this.plugins.IpGeoLocation._geoLocationIP = sIpAddress;
							this.plugins.IpGeoLocation._geoLocationHandler = this.plugins.IpGeoLocation;
							fnResolve(sIpAddress ? "IpGeoLocation" : false);
						}).catch(oErr => {
							let oError = new Error(this._oResourceBundle.getText("StoreSearch_logIpNoPlugin"), {cause: oErr});
							fnReject(oError);
						});
					});
				},
				
				/**
				 * Start web service's Geo Location (api.ipgeolocation.io) to capture the Geo Location {lat,long} for the IP address.
				 * The callback function will return either an object w/ lat & log or an Error object.
				 * 
				 * @param {Function} fnCallback the function to call after a successful scan event.
				 * @param {Object} oConfig contains optional plugin configuration parameters (not used here by this plugin).
				 * @public
				 */
				getLocation: function(oConfig) {
					return new Promise((fnResolve, fnReject) => {
						let oConfiguration = oConfig || {};

						if (this.plugins.IpGeoLocation._geoLocationHandler) {
							this.plugins.IpGeoLocation._geoLocationHandler.getCurrentPosition.call(this)
								.then((oCoordinates) => {	// Success
									if (oCoordinates && (oCoordinates.latitude === 0 || oCoordinates.longitude === 0)) {
										oCoordinates = null;
										let oInfo = new Error(this._oResourceBundle.getText("StoreSearch_logWebServiceSearchNoCoords"));
										this.utils.logMessage(oInfo, this.util.LogLevel.INFO);
									}
									fnResolve(oCoordinates);
								}).catch((oErr) => {	// Fail
									let oError = new Error(this._oResourceBundle.getText("StoreSearch_logWebServiceGeoLocfailed"), {cause: oErr});
									this.utils.logMessage(oError);
									fnReject(oError);
								}
							);
						} else {
							let oError = new Error(this._oResourceBundle.getText("StoreSearch_logWebServiceCallNoPlugin"));
							this.utils.logMessage(oError);
							fnReject(oError);
						}
					});
				},

				getCurrentPosition: function(sIpAddress) {
					return new Promise((fnResolve, fnReject) => {
						try {
							$.ajax({
								// TODO  !!!  THIS IS MARK'S API KEY - REMOVE BEFORE USING  !!!
								url: 'https://www.googleapis.com/geolocation/v1/geolocate?key=AIzaSyAv4H7LlHo-FcGCHRTgQ8c7U1SNRhVTACs',
								data: JSON.stringify({ "considerIp": "true" }),
								type: 'POST',
								contentType: 'application/json',
								success: (oResponse) => {
									if(oResponse.location) {
										fnResolve({
											latitude: oResponse.location.lat,
											longitude: oResponse.location.lng
										});
									} else {
										let oError = new Error("Unbable to resolve IP address.");
										this.utils.logMessage(oError);
										fnReject(oError);
									}
								},
								error: (oErr) => {
									let oError = new Error("AJAX call to Goolge API faild.", {cause: oErr});
									this.utils.logMessage(oError);
									fnReject(oError);
								}
							});
						} catch(oErr) {
							let oError = new Error("AJAX call to Goolge API faild.", {cause: oErr});
							this.utils.logMessage(oError);
							fnReject(oError);
						}
					});
				},

				getCurrentPosition_NOT_USED: function(sIpAddress) {
					return new Promise((fnResolve, fnReject) => {
						const sUrl = "https://api.ipgeolocation.io/ipgeo?ip=" + this.plugins.IpGeoLocation._geoLocationIP;
						fetch(sUrl).then(oResponse => {
							if (oResponse.ok) {
								oResponse.json().then(oPayload => {
									fnResolve({
										latitude: oPayload.latitude,
										longitude: oPayload.longitude
									});
								}).catch(oError => {
									fnReject(oError);
								});
							}
						}).catch(oErr => {
							let oError = new Error("Fetch call to IP Geolocation API faild.", {cause: oErr});
							this.utils.logMessage(oError);
							fnReject(oError);
						});
					});
				},

				_getIpAddress: function() {
					return new Promise((fnResolve, fnReject) => {
						fetch("https://api.ipify.org?format=json").then(oResponse => {
							if (oResponse.ok) {
								oResponse.json().then(oPayload => {
									fnResolve(oPayload.ip);
								}).catch(oError => {
									fnReject(oError);
								});
							} else {
								let oError = new Error(this._oResourceBundle.getText("StoreSearch_logWebServiceGetIpFailed"));
								fnReject(oError);
							}
						}).catch(oError => {
							fnReject(oError);
						});
					});
				}
			}
		}
	});
});