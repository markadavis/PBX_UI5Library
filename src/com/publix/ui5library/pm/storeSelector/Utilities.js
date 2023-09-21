/*global history */
sap.ui.define([
	"sap/ui/base/Object",
    "sap/ui/Device",
	"sap/base/Log",
	"sap/ui/model/odata/v2/ODataModel",
	"sap/ui/model/resource/ResourceModel"
], function(BaseObject, Device, Log, ODataModel, ResourceModel) {
	"use strict";

	return BaseObject.extend("com.publix.ui5library.pm.storeSelector.Utilities", {
        _sBaseLoggerComponentId: "com.publix.ui5library.pm.storeSelector",
        Device: Device,
        LogLevel: Log.Level,

        constructor: function(bWithoutMetadat) {
            if (!bWithoutMetadat) {
                this.getServiceModel(); // Instanciate the OData model (aka load metadata);
            }
        },

        /* =========================================================== */
		/*  Public self-containted method collection                   */
		/* =========================================================== */

        /* ------------------- */
        /* OData Model Methods */
        /* ------------------- */

        /** Return a constructed OData model instance to be used for StoreSelector CRUD.
         * @returns {sap.ui.model.odata.v2.ODataModel} The default service model for StoreSelector
         * @public
         */
        getServiceModel: function() {
            if (!this._oODataModel) {
				this._oODataModel = new ODataModel("/sap/opu/odata/sap/ZFIORI_PM_UTILITIES_SRV/");
				// this._oODataModel = new ODataModel("/sap/opu/odata/sap/ZFIORI_SERVICE_TECH_SRV/");
			}
			return this._oODataModel;
        },

		/** Call the service to load the Store data for the given Store ID.
		 * @param {String} sStoreId The store ID to be retrieved
		 * @returns {Promise} A JavaScript Promise that returns the store info when resloved.
		 * @public
		 */
         getStore: function(sStoreId) {
			return new Promise((fnResolve, fnReject) => {
				let oModel = this.getServiceModel(),
                    sPath = oModel.createKey("/StoreSet", {
						StoreId: sStoreId
					}),
					oStore = oModel.getProperty(sPath);

				if (!oStore) {
					oModel.read(sPath, {
						success: (oStoreLoaded) => {
							fnResolve(oStoreLoaded);
						},
						error: (oError) => {
							this.logger.error(oError.message, this.sControlId + ".getStore()");
							fnReject(oError);
						}
					});
				} else {
					fnResolve(oStore);
				}
			});
		},


        /* -------------- */
        /* Logger methods */
        /* -------------- */

        /** Return the instanciated application looger
         * @return {sap.base.Log} The constructed SAP Logger instance.
         * @public
         */
        getAppLogger: function() {
            if (!this.logger) {
                this.logger = Log.getLogger(this._sBaseLoggerComponentId);
                this.setLogLevel(this.LogLevel.ERROR, this._sBaseLoggerComponentId);
            }
            return this.logger;
        },

        /** Return the currently set log level.
         * @return {sap.base.Log.Level} The application log level currently set.
         * @public
         */
        getLogLevel: function() {
            this.getAppLogger().getLevel(this._sBaseLoggerComponentId);
        },

        /** Get all log entries (since it was last cleared).
         * @returns {Array} The list of all application log entries available.
         * @public
         */
        getLogEntries: function() {
            return this.getAppLogger().getLogEntries();
        },

        /** Set the application log level.
         * @param {sap.base.Log.Level} sLogLevel The log level to be set.
         * @return {Boolean} True if the log level was set, Otherwise false.
         * @public
         */
        setLogLevel: function(sLogLevel) {
            let bChanged = false;

            if (sLogLevel && !this.LogLevel.hasOwnProperty[sLogLevel]) {
                this.logLevel = sLogLevel;
                this.getAppLogger().setLevel(sLogLevel);
                bChanged = true;
            }

            return bChanged;
        },

        /** Add an Error object to the application logger
         * @param {Error} oError The constructed javascript Error object to be logged.
         * @param {sap.base.Log.Level} iLevel The (optional) log level to be logged.
         * @return {Error} For call chaining
         * @public
         */
        logMessage: function(oError, iLevel) {
            let iLogLevel = iLevel ? iLevel : this.LogLevel.ERROR;

            let sLevel = null;
            Object.keys(this.LogLevel).every(sLevelText => {
                if (this.LogLevel[sLevelText] === iLogLevel && sLevelText !== "NONE") {
                    sLevel = sLevelText.toLowerCase();
                }
                return sLevel ? false : true;   // stop once found.
            });

            if (sLevel) {
                this.getAppLogger()[sLevel] (
                    oError.message,
                    oError.toString(),
                    this._sBaseLoggerComponentId,
                    (oSupportInfo) => { // only called when logSupportInfo(true)
                        alert(oSupportInfo);
                    }
                );
            }

            return oError;
        },


        /* ------------------- */
        /* Misc helper methods */
        /* ------------------- */

        /** Return the Resource Bundle (texts) for all storeSelecor controls
         * @returns {sap.base.i18n.ResourceBundle} The resource bundle to use.
         * @public
         */
        getResoureBundle: function() {
            return this.getResoureModel().getResourceBundle();
        },

        /** Return the i18n Resource Model (for view binding).
         * @returns {sap.ui.model.resource.ResourceModel} The constructed i18n Resource Model.
         * @public
         */
        getResoureModel: function() {
            if (!this._oResourceModel) {
                this._oResourceModel = new ResourceModel({
                    bundleName: "com.publix.ui5library.pm.storeSelector.i18n.StoreSelector"
                });
            }
            return this._oResourceModel;
        }

    });
});