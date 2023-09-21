sap.ui.define([
	"sap/ui/base/Object",
	"sap/ui/model/resource/ResourceModel",
	"sap/base/Log",
	"sap/ndc/BarcodeScanner"
], function(UI5Object, ResourceModel, Log, UI5BarcodeScanner) {
	"use strict";

	return UI5Object.extend("com.publix.ui5library.ca.barcodeScanner.BarcodeScanHandler", {

		/**
		 * Handles application scanning by automatically attaching the appropriate API.
		 * @class
		 * @alias com.publix.ui5library.ca.barcodeScanner.BarcodeScanHandler
		 * 
		 * @public
		 * @param {sap.ui.core.UIComponent} oComponent reference to the owner component for namespacing.
		 */
		constructor: function(oComponent) {
			this._oOwnerComponent = oComponent;
			this.sControlId = "com.publix.ui5library.ca.barcodeScanner";
			this._sAppID = this.sControlId;
			try {
				this._sAppID = this._oOwnerComponent ? this._oOwnerComponent.getManifestEntry("sap.app").id : this.sControlId;
			} catch (oError) {}

			this.Logger = Log.getLogger(this._sAppID);

			this._oResourceModel = new ResourceModel({
				bundleName: "com.publix.ui5library.ca.barcodeScanner.i18n"
			});
			this._oResourceBundle = this._oResourceModel.getResourceBundle();

			this._sActivePlugin = this._registerBarcodeScanner();
		},



		/* =========================================================== */
		/* begin: event handler methods                                */
		/* =========================================================== */

		/**
		 * Activeate the scanner functionality for the assigned API.
		 * 
		 * @param {Function} fnCallback the Function to call when the scan completes.
		 * @param {Object} oConfig an optional object with specific scaner API properteis.
		 * @returns {*} a String value of the scan ~or~ an Error object if the scan had issues.
		 */
		onScan: function(fnCallback, oConfig) {
			if (this._sActivePlugin) {
				this.plugins[this._sActivePlugin].onScan.call(this, oConfig, fnCallback);
			} else {
				let sErrorMsg = this._oResourceBundle.getText("ScannerAPI_noPlugin"),
					oError = new Error(sErrorMsg);
				this.Logger.error(sErrorMsg, this.sControlId + ".onScan()");
				fnCallback(oError);
			}
		},



		/* =========================================================== */
		/* begin: public methods                                       */
		/* =========================================================== */

		/**
		 * Get the name of the active scanning API (plugin).
		 * 
		 * @returns {String} the active plugin name.
		 */
		getScannerPluginName: function() {
			return this._sActivePlugin;
		},



		/* =========================================================== */
		/* begin: private methods                                      */
		/* =========================================================== */

		/**
		 * Register the first barcode scanning API found (installed).
		 * The order of importance is as defined in the .plugins{} object.
		 * 
		 * @return {String} the name of the active scanning API.
		 * @private
		 */
		_registerBarcodeScanner: function() {
			let sActivePlugin = "";
			// Loop through all known scanner API's to find the first installed handler.
			Object.keys(this.plugins).forEach((sPlugin) => {
				if (!sActivePlugin && this.plugins[sPlugin].init.call(this)) {
					sActivePlugin = sPlugin;
				}
			});

			// Create a log entry if no scanner API is installed.
			if (!sActivePlugin) {
				this.Logger.warning(
					this._oResourceBundle.getText("ScannerAPI_logNoActivePlugin"),
					this.sControlId + "._registerBarcodeScanner()"
				);
			}

			return sActivePlugin;
		},



		/* =========================================================== */
		/* begin: plugin modules                                       */
		/* =========================================================== */
		plugins: {

			/**
			 * Cordova DataWedge Hardware (laser) Barcode Scanner.
			 */
			CordovaDataWedge: {
				_scanHandler: null,
				_scanCallback: null,

				/**
				 * Check to see if the plugin is installed and able to be initialized.
				 * 
				 * @returns {boolean} true if the plugin in installed and usable, otherwise false.
				 * @public
				 */
				init: function() {
					let bInstalled = (
							window.datawedge &&
							typeof(window.datawedge.registerForBarcode) === "function"
						) ? true : false;

					if (bInstalled) {
						this.plugins.CordovaDataWedge._scanHandler = window.datawedge;
					} else {
						this.plugins.CordovaDataWedge._scanHandler = null;
						this.Logger.info(
							this._oResourceBundle.getText("ScannerAPI_logDataWedgeNotInit"),
							this.sControlId + ".plugin.CordovaDataWedge.init()"
						);
					}

					return bInstalled;
				},

				/**
				 * Start the DataWedge hardware scanner (cordova plugin) to capture the barcode. The callback function
				 * will return the String value of the scan.
				 * 
				 * @param {Function} fnCallback the function to call after a successful scan event.
				 * @param {Object} oConfig contains optional plugin configuration parameters ({CordovaDataWedge: {profile: "str"}}).
				 * @public
				 */
				onScan: function(oConfig, fnCallback) {
					if (this.plugins.CordovaDataWedge._scanHandler) {
						let sProfile = oConfig.hasOwnProperty("CordovaDataWedge") ? oConfig.CordovaDataWedge.profile : "";
						this.plugins.CordovaDataWedge._registerScanHandler(sProfile, fnCallback)	
					} else {
						sErrorMsg = this._oResourceBundle.getText("ScannerAPI_logDataWedgeNoPlugin");
						oError = new Error(sErrorMsg);
						this.Logger.error(sErrorMsg, this.sControlId + ".plugin.CordovaDataWedge.onScan()");
					}
				},

				/**
				 * Register the callback for the DataWedge Hardware Scanner API.  The hardware 'scan' event
				 * will autmatically call the given callback function.
				 * 
				 * @param {Object} oConfig contains the 'profile' for the DataWedge 'scan profile' to be used.
				 * @param {Function} fnCallback the function to call after a successful scan event.
				 * @private
				 */
				_registerScanHandler: function(sProfile, fnCallback) {
					if (this.plugins.CordovaDataWedge._scanHandler) {
						this._setScanProfile(sProfile || "");
						this.plugins.CordovaDataWedge._scanHandler.registerForBarcode((oData) => {
							if (fnCallback && typeof(fnCallback) ==="function") {
								fnCallback(oData.barcode);
							} else {
								this.Logger.warning(
									this._oResourceBundle.getText("ScannerAPI_logDataWedgeNoEvent") + " " + this._sScanId,
									this.sControlId + ".plugin.CordovaDataWedge._registerScanHandler()"
								);
							}
						});
					} else {
						this.Logger.error(
							this._oResourceBundle.getText("ScannerAPI_logDataWedgeNoPlugin"),
							this.sControlId + ".plugin.CordovaDataWedge.onScan()"
						);
					}
				},

				/**
				 * Set the Datawedge Scan Profile ID to use for scaned event handling.  If an ID
				 * is not passed in, the default value currently set will be used.
				 * 
				 * @param {String} sID the name of the configured Datawedge profile to be used.
				 * @public
				 */
				_sDefaultProfile: "Fiori",
				_sCurrentProfile: "",
				_setScanProfile: function(sId) {
					let oDataWedge = this.plugins.CordovaDataWedge;

					if (sId) {
						oDataWedge._sCurrentProfile = sId;
					} else if (!oDataWedge._sCurrentProfile) {
						oDataWedge._sCurrentProfile = oDataWedge._sDefaultProfile;
					}
					if (window.datawedge) {
						oDataWedge._scanHandler.switchProfile(oDataWedge._sCurrentProfile);
					}
				},
			},

			/**
			 * Cordova Camera Barcode Scanner.
			 */
			CordovaCamScanner: {
				_scanHandler: null,

				/**
				 * Check to see if the plugin is installed and able to be initialized.
				 * 
				 * @returns {boolean} true if the plugin in installed and usable, otherwise false.
				 * @public
				 */
				init: function() {
					let bInstalled = (
						window.cordova &&
						window.cordova.hasOwnProperty("plugins") &&
						window.cordova.plugins.hasOwnProperty("barcodeScanner") &&
						typeof(window.cordova.plugins.barcodeScanner.scan) === "function"
					) ? true : false;

					if (bInstalled) {
						this.plugins.CordovaCamScanner._scanHandler = window.cordova.plugins.barcodeScanner.scan;
					} else {
						this.plugins.CordovaCamScanner._scanHandler = null;
						this.Logger.info(
							this._oResourceBundle.getText("ScannerAPI_logCordovaCallNoPlugin"),
							this.sControlId + ".plugin.CordovaCamScanner.init()"
						);
					}

					return bInstalled;
				},

				/**
				 * Start the Cordova camera scanner (cordova plugin) to capture the barcode.  The callback function
				 * will return either the String value of the scan ("" if canceled) or an Error object (if an error occured).
				 * 
				 * @param {Function} fnCallback the function to call after a successful scan event.
				 * @param {Object} oConfig contains optional plugin configuration parameters (not used here by this plugin).
				 * @public
				 */
				onScan: function(oConfig, fnCallback) {
					let sErrorMsg = "",
						oError = null;

					if (this.plugins.CordovaCamScanner._scanHandler) {
						this.plugins.CordovaCamScanner._scanHandler(
							(oData) => {	// Success
								let sBarcode = "",
									bCanceled = false;
								if (oData.cancelled) {
									bCanceled = true;
									this.Logger.info(
										this._oResourceBundle.getText("ScannerAPI_logScanCancelled"),
										this.sControlId + ".plugin.CordovaCamScanner.onScan()"
									);
								} else {
									sBarcode = oData.text;
								}

								if (fnCallback && typeof(fnCallback) ==="function") {										
									fnCallback(sBarcode, bCanceled);
								}
							},
							(oError) => {	// Fail
								sErrorMsg = this._oResourceBundle.getText("ScannerAPI_logCordovaScanNoText");
								sErrorMsg = oError ? oError.message ? oError.message : sErrorMsg : sErrorMsg;
								sErrorMsg = this._oResourceBundle.getText("ScannerAPI_logCordovaScanfailed") + ": " + sErrorMsg;
								oError = new Error(sErrorMsg);
								this.Logger.error(sErrorMsg, this.sControlId + ".plugin.CordovaCamScanner.onScan()");
								if (fnCallback && typeof(fnCallback) ==="function") {										
									fnCallback(oError);
								}
							}
						);
					} else {
						sErrorMsg = this._oResourceBundle.getText("ScannerAPI_logCordovaNoPlugin");
						oError = new Error(sErrorMsg);
						this.Logger.error(sErrorMsg, this.sControlId + ".plugin.CordovaCamScanner.onScan()");
						if (fnCallback && typeof(fnCallback) ==="function") {										
							fnCallback(oError);
						}
					}
				}
			},

			/**
			 * SAPUI5 Camera Barcode Scanner.
			 */
			UI5BarcodeScanner: {
				_scanHandler: null,

				/**
				 * Check to see if the plugin is installed and able to be initialized.
				 * 
				 * @returns {boolean} true if the plugin in installed and usable, otherwise false.
				 * @public
				 */
				init: function() {
					let bInstalled = false,
						oModel = UI5BarcodeScanner.getStatusModel();

					if (oModel) {
						bInstalled = oModel.getProperty("/available") ? true : false;
						if (bInstalled) {
							this.plugins.UI5BarcodeScanner._scanHandler = UI5BarcodeScanner;
						}
					}

					return bInstalled;
				},

				/**
				 * Start the SAPUI5 camera scanner (sap.ndc.BarcodeScanner) to capture the barcode. The callback function
				 * will return either the String value of the scan ("" if canceled) or an Error object (if an error occured).
				 * 
				 * @param {Function} fnCallback the function to call after a successful scan event.
				 * @param {Object} oConfig contains optional plugin configuration parameters (not used here by this plugin).
				 * @public
				 */
				onScan: function(oConfig, fnCallback) {
					let sErrorMsg = "";

					if (this.plugins.UI5BarcodeScanner._scanHandler) {
						this.plugins.UI5BarcodeScanner._scanHandler.scan(
							(oResult) => { // process scan result
								let sBarcode = "",
									bCanceled = false;
								if (oResult.cancelled) {
									this.Logger.info(
										this._oResourceBundle.getText("ScannerAPI_logUi5ScanCancelled"),
										this.sControlId + ".plugin.UI5BarcodeScanner.onScan()");
									bCanceled = true;
								} else {
									sBarcode = oResult.text;
								}

								if (fnCallback && typeof(fnCallback) === "function") {
									fnCallback(sBarcode, bCanceled);
								}
							},
						    (oError) => { // handle scan error
								sErrorMsg = this._oResourceBundle.getText("ScannerAPI_logUI5ScanError");
								sErrorMsg =  (oError && oError.message) ? sErrorMsg + ": " + oError.message : sErrorMsg;
								let oNewError = new Error(sErrorMsg);
								
								this.Logger.error(sErrorMsg, this.sControlId + ".plugin.UI5BarcodeScanner.onScan()");

								fnCallback(oNewError);
							},
    						(oResult) => { // handle input dialog change
							}
						);
					} else {
						sErrorMsg = this._oResourceBundle.getText("ScannerAPI_logUi5ScanCallNoPlugin");
						oError = new Error(sErrorMsg);
						this.Logger.error(sErrorMsg, this.sControlId + ".plugin.UI5BarcodeScanner.onScan()");
						fnCallback(oError);
					}
				}
			}
		}
	});
});