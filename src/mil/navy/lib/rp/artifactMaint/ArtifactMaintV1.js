sap.ui.define([
	"sap/ui/base/Object",
	"sap/base/Log",
    "sap/ui/Device",
	"sap/ui/model/resource/ResourceModel",
    "sap/ui/model/json/JSONModel",
	"sap/ui/model/odata/v2/ODataModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
    "mil/navy/lib/ca/odataUtils/ErrorHandler",
	"sap/m/UploadCollectionParameter",
	"sap/m/MessageBox"
], function(UI5Object, AppLog, Device, ResourceModel, JSONModel, ODataModel, Filter, FilterOperator, ErrorHandler, UploadCollectionParameter, MessageBox) {
	"use strict";

	return UI5Object.extend("mil.navy.lib.rp.artifactMaint.ArtifactMaintV1", {
		_ODATA_SERVICE_URI: "/sap/opu/odata/sap/ZM_RP_UPLDDOC_SRV",
		_ENTITY_SET: "uploadDocSet",

		/* =========================================================== */
		/*  Lifecycle methods                                          */
		/* =========================================================== */

		/**
		 * This class provices application artifact (document) upload/download capabilities.
		 * @class
		 * @param {Object} oParams Setup parameters for the unique identification of object the
		 * 		Artifat Maint instance belogns to.  The following paramters are accepted:
		 * 		{
		 *			objectCategory: {String}  The Document Category (DMS Document Type) used for file storage (default "ZRU").
		 *			objectType: {String}  The Document Type (DMS Part) used to stor the document in DMS.
		 * 			objectId: {Map}  The Business Object ID (DMS Document Nmber) given in 4 params:
		 * 				{
		 * 					param1: {String} The first parameter (required),
		 * 					param2: {String} the second parameter (optional),
		 * 					param3: {String} the third parameter (optional),
		 * 					param4: {String} the fourth parameter (optional),
		 * 				}
		 *			controlId: {String}  The optional unique ID used for the control's instance (default "artifactsManager").
		 *			dialogTitle: {String}  The optional Dialog title (default "Attach Artifacts").
		 * 		}
		 * @public
		 * @name mil.navy.lib.rp.artifactMaint.ArtifactMaint
		 */
		constructor: function(oParams) {
            // Create and Set the 'i18n' resource model.
            this._oResources = new ResourceModel({
                bundleName: "mil.navy.lib.rp.artifactMaint.i18n.i18n"
            });
            this._oResourceBundle = this._oResources.getResourceBundle();

			// TODO - Log & throw an exception if no "objectType", and "objectId" is given.

			// Construct the control's Metadata model.
			oParams = oParams ? oParams : {
				objectId: {
					param1: "",
					param2: "",
					param3: "",
					param4: ""
				},
				objectCategory: "ZRU",	// default value for Repairables Portal
				objectType: "",
				controlId: "artifactsManager",
				dialogTitle: this._oResourceBundle.getText("ArtifactMaint_Title"),
			};
			let oObjectId = oParams.hasOwnProperty("objectId") ? oParams.objectId : {param1:"",param2:"", param3:"",param4:""};

			this._oMetaModel = new JSONModel({
				Settings: {
					objectId:  {
						param1: oObjectId.hasOwnProperty("param1") ? oObjectId.param1 : "",
						param2: oObjectId.hasOwnProperty("param2") ? oObjectId.param2 : "",
						param3: oObjectId.hasOwnProperty("param3") ? oObjectId.param3 : "",
						param4: oObjectId.hasOwnProperty("param4") ? oObjectId.param4 : ""
					},
					objectCategory: oParams.hasOwnProperty("objectCategory") ? oParams.objectCategory : "ZRU",
					objectType: oParams.hasOwnProperty("objectType") ? oParams.objectType : "",
					controlId: oParams.hasOwnProperty("controlId") ? oParams.controlId : "artifactsManager",
					dialogTitle: oParams.hasOwnProperty("dialogTitle") ? oParams.dialogTitle : this._oResourceBundle.getText("ArtifactMaint_Title")
				},
				entityData: null
			});

			// Construct the artifacts (attachements) model.
			this._oArtifactModel = new JSONModel();

			// Construct the control's OData model.
			this._oDataModel = new ODataModel(this._ODATA_SERVICE_URI);
			this._oErrorHandler = new ErrorHandler(null/*no controller binding*/, "artifactsModel", false/*all errors*/, this._oDataModel);

			// Create the Device model.
			this._oDeviceModel = new JSONModel(Device);
		},

		/**
		 * The component is destroyed by the UI5 framework. Destroy all locally constructed objects here.
		 * @public
		 * @override
		 */
		destroy: function() {
			// Destroy the Dialog if it exists.
			if (this._oDialogAttachments) {
				this._oDialogAttachments.destroy();
			}
			// call the base component.
			this.prototype.destroy.apply(this, arguments);
		},



		/* =========================================================== */
		/*  Event Handler methods                                      */
		/* =========================================================== */

        onChangeAttachUpload: function(oControlEvent) {
			this._oDataModel.refreshSecurityToken();

			let oUploadCollection = oControlEvent.getSource();
				// sUploadedFileName = oControlEvent.getParameter("files")[0].name,
				// sFileType = oControlEvent.getParameter("files")[0].type;

			oUploadCollection.addHeaderParameter(new UploadCollectionParameter({
				name: "x-csrf-token",
				value: this._oDataModel.oHeaders['x-csrf-token']
			}));

			let aFiles = oControlEvent.getParameter("files");
			if (aFiles && aFiles.length > 0) {
				let oReader = new FileReader();	// Browser API
				oReader.onload = function(oError) {
					// TODO - handle API loading errors (Not sure what oError looks like).
					if (oError) {
						// Call the 'error' listener if bound.
						if (this.hasOwnProperty("_onUploadErrorListener") && typeof this._onUploadErrorListener === "function") {
							this._onUploadErrorListener(oError);
						}
					}
				};
				oReader.readAsDataURL(aFiles[0]);
			}
		},

		onBeforeUploadStarts: function(oControlEvent) {
			let oSettings = this._oMetaModel.getProperty("/Settings");

			// filename
			let sFileName = oControlEvent.getParameter("fileName");

			// Slug (HTTP Header property)
			var oCustomerHeaderSlug = new sap.m.UploadCollectionParameter({
				name: "slug",
				value: oSettings.objectId.param1 + "/"	// DMS Document ID (concat params 1-4)
					+ oSettings.objectId.param2 + "/"
					+ oSettings.objectId.param3 + "/"
					+ oSettings.objectId.param4 + "/"
					+ oSettings.objectCategory + "/"	// DMS Document Type
					+ oSettings.objectType + "/"		// DMS Document Part
					+ "/"								// Description (not used - required by servcie)
					+ sFileName							// DMS Filename
			});
			oControlEvent.getParameters().addHeaderParameter(oCustomerHeaderSlug);
		},

		onUploadComplete: function(oControlEvent) {
			let aFiles = oControlEvent.getParameter("files"),
				sError = aFiles.length > 0 ? this._extractError(aFiles[0].responseRaw) : "";
			if (sError) {
				MessageBox.error(sError, {
					// details: sError,
					styleClass : this._getContentDensityClass(),
					actions: [MessageBox.Action.CLOSE],
					onClose: (sAction) => {
						// Just return to the upload dialog.
					}
				});
			} else {
				this._setInitialAttachData();
			}
		},

		onFileDeleted: function(oEvent) {
			let oItem = oEvent.getParameter("item"),
				sPath = oItem.getBindingContext().sPath,
				oItemData = oEvent.getSource().getModel().getProperty(sPath);

			if (oItemData) {
				let sPath = this._oDataModel.createKey("/" + this._ENTITY_SET, {
					param1: oItemData.param1,
					param2: oItemData.param2,
					param3: oItemData.param3,
					param4: oItemData.param4,
					docCategory: oItemData.docCategory,
					docType: oItemData.docType,
					docVersion: oItemData.docVersion
				});

				this._oDataModel.remove(sPath, {
					method: "DELETE",
					success: function(oData) {
						this._setInitialAttachData();
					}.bind(this),
					error: function(oError) {
						// TODO - handle API delete errors (Not sure what oError looks like).
						// Call the 'error' listener if bound.
						if (this.hasOwnProperty("_onDeleteErrorListener") && typeof this._onDeleteErrorListener === "function") {
							this._onDeleteErrorListener(oError);
						}
					}
				});
			}
		},

		onCloseAttachButton: function(oEvent) {
			this._oDialogAttachments.close();

			// Call the 'onClose' listener if bound.
			if (this.hasOwnProperty("_onCloseListener") && typeof this._onCloseListener === "function") {
				this._onCloseListener(oEvent);
			}
		},



		/* =========================================================== */
		/*  Public methods                                             */
		/* =========================================================== */

		/**
		 * Retrun a requested JSON model.
		 * @returns {sap.ui.model.json.JSONModel} The requested model (if found).
		 */
		getModel: function(sId) {
			if (!sId) {
				return this._oMetaModel;
			} else if (sId === "artifact") {
				return this._oArtifactModel
			}
		},
		
		/**
		 * Consruct the Image URL.
		 * @param {String} sParam1 The Parameter 1 of the document ID.
		 * @param {String} sParam2 The Parameter 2 of the document ID.
		 * @param {String} sParam3 The Parameter 3 of the document ID.
		 * @param {String} sParam4 The Parameter 4 of the document ID.
		 * @param {String} sDocCategory The document Category.
		 * @param {String} sDocType The document type.
		 * @param {String} sDocVersion the document version.
		 * @returns {String} The Image URL.
		 * @private
		 */
		getImageUrl: function(sParam1, sParam2, sParam3, sParam4, sDocCategory, sDocType, sDocVersion) {
			let sPath = null;

			// if (sParam1 && sDocCategory && sDocType && sDocVersion) {
				sPath = this._oDataModel.createKey("/" + this._ENTITY_SET, {
					param1: sParam1,
					param2: sParam2,
					param3: sParam3,
					param4: sParam4,
					docCategory: sDocCategory,
					docType: sDocType,
					docVersion: sDocVersion
				}) + "/$value";
			// }

			return sPath;
		},

		/**
		 * Open the Artifact Up/Download manager Dialog.
		 * @public
		 * @param {Object} oParams Setup parameters for the unique identification of object the
		 * 		Artifat Maint instance belogns to.  The following paramters are accepted:
		 * 		{
		 *			objectCategory: {String}  The Document Category (DMS Document Type) used for file storage (default "ZRU").
		 *			objectType: {String}  The Document Type (DMS Part) used to stor the document in DMS.
		 * 			objectId: {Map}  The Business Object ID (DMS Document Nmber) given in 4 params:
		 * 				{
		 * 					param1: {String} The first parameter (required),
		 * 					param2: {String} the second parameter (optional),
		 * 					param3: {String} the third parameter (optional),
		 * 					param4: {String} the fourth parameter (optional),
		 * 				}
		 *			controlId: {String}  The optional unique ID used for the control's instance (default "artifactsManager").
		 *			dialogTitle: {String}  The optional Dialog title (default "Attach Artifacts").
		 * 		}
		 * @returns {Object} Return 'this' for call chaining (like the 'attachOnClose' function).
		 */
    	open: function(oParams) {
			// Update the metatdata if given.
			if (oParams) {
				let oSettings = this._oMetaModel.getProperty("/Settings");

				if (oParams.hasOwnProperty("objectId")) {
					oSettings.objectId.param1 = oParams.hasOwnProperty("param1") ? oParams.objectId.param1 : oSettings.objectId.param1;
					oSettings.objectId.param2 = oParams.hasOwnProperty("param2") ? oParams.objectId.param2 : oSettings.objectId.param2;
					oSettings.objectId.param3 = oParams.hasOwnProperty("param3") ? oParams.objectId.param3 : oSettings.objectId.param3;
					oSettings.objectId.param4 = oParams.hasOwnProperty("param4") ? oParams.objectId.param4 : oSettings.objectId.param4;
				}
				oSettings.objectCategory = oParams.hasOwnProperty("objectCategory") ? oParams.objectCategory : oSettings.objectCategory;
				oSettings.objectType = oParams.hasOwnProperty("objectType") ? oParams.objectType : oSettings.objectType;
				oSettings.controlId = oParams.hasOwnProperty("controlId") ? oParams.controlId : oSettings.controlId;
				oSettings.dialogTitle = oParams.hasOwnProperty("dialogTitle") ? oParams.dialogTitle : oSettings.dialogTitle;

				this._oMetaModel.setProperty("/Settings", oSettings);
			}

			if (!this._oDialogAttachments) {
				this._oDialogAttachments = sap.ui.xmlfragment(
					"mil.navy.lib.rp.artifactMaint.Dialog_" + this._oMetaModel.getProperty("Settings/controlId"),
					"mil.navy.lib.rp.artifactMaint.ArtifactDialogV1",
					this
				);
				this._oDialogAttachments.setModel(this._oResources, "i18n");
				this._oDialogAttachments.setModel(this._oMetaModel, "metadata");
				this._oDialogAttachments.setModel(this._oArtifactModel);
			}

			this._oDialogAttachments.open();

			let oPanel = this._oDialogAttachments.getAggregation("content")[0],
				oAttachmentCollection = oPanel.getAggregation("content")[0];
			if (oAttachmentCollection) {
				oAttachmentCollection.setUploadUrl(this._ODATA_SERVICE_URI + "/" + this._ENTITY_SET);	
				this._setInitialAttachData();
			}

			return this;
		},

		/**
		 * Attach a call-back Function to the 'onChangeAttachUpload' event error handler - called if the upload API call throws an exception.
		 * @param {function} fnUploadErrorListener The function to be called when there is an 'upload' exception. 
		 * @public
		 */
		 attachOnUploadError: function(fnUploadErrorListener) {
			if (fnUploadErrorListener && typeof fnUploadErrorListener === "function") {
				this._onUploadErrorListener = fnUploadErrorListener;
			}
		},

		/**
		 * Attach a call-back Function to the 'onFileDeleted' event error handler - called when the delete API call throws an exception.
		 * @param {function} fmDeleteErrorListener The function to be called when there is a 'delete' exception. 
		 * @public
		 */
		attachOnDeleteError: function(fmDeleteErrorListener) {
			if (fmDeleteErrorListener && typeof fmDeleteErrorListener === "function") {
				this._onDeleteErrorListener = fnUploadErrorListener;
			}
		},
		
		/**
		 * Attach a call-back Function to the 'onClose' event - called when the dialog is closed.
		 * @param {function} fnCloseListener The function to be callled when the dialog is closed. 
		 * @public
		 */
		attachOnClose: function(fnCloseListener) {
			if (fnCloseListener && typeof fnCloseListener === "function") {
				this._onCloseListener = fnCloseListener;
			}
		},

		/**
		 * Detach the 'onChangeAttachUpload' event listener - called when the upload API call throws an exception.
		 * @public
		 */
		 detachOnUploadError: function() {
			if (this.hasOwnProperty("_onUploadErrorListener")) {
				this._onUploadErrorListener = null;
			}
		},

		/**
		 * Detach the 'onFileDeleted' event listener - called when the delete API call throws an exception.
		 * @public
		 */
		 detachOnDeleteError: function() {
			if (this.hasOwnProperty("_onDeleteErrorListener")) {
				this._onDeleteErrorListener = null;
			}
		},

		/**
		 * Detach the 'onClose' event listener - called when the Dialog is closed.
		 * @public
		 */
		detachOnClose: function() {
			if (this.hasOwnProperty("_onCloseListener")) {
				this._onCloseListener = null;
			}
		},


		/* =========================================================== */
		/*  Private methods                                            */
		/* =========================================================== */

        /**
         * Initialize the Attachment Document data.
         * @private
         */
		_setInitialAttachData: function() {
			let oSettings = this._oMetaModel.getProperty("/Settings"),
				aFilters = [
					new Filter("param1", FilterOperator.EQ, oSettings.objectId.param1),
					new Filter("param2", FilterOperator.EQ, oSettings.objectId.param2),
					new Filter("param3", FilterOperator.EQ, oSettings.objectId.param3),
					new Filter("param4", FilterOperator.EQ, oSettings.objectId.param4),
					new Filter("docCategory", FilterOperator.EQ, oSettings.objectCategory),
					new Filter("docType", FilterOperator.EQ, oSettings.objectType)
				];

			this._oDataModel.read("/" + this._ENTITY_SET, {
				async: false,
				filters: aFilters,
				success: function(oData, oResponse) {
					this._oArtifactModel.setProperty("/", oData);
				}.bind(this),
				error: function(oError) {
					// Handled by the OData ErrorHandler control.
				}
			});
		},

		_extractError: function(sXml) {
			var sMessage = "";

			try {
				var oXml = $.parseXML(sXml),
					sCode = oXml.getElementsByTagName("code")[0].textContent,
					sMsg = oXml.getElementsByTagName("message")[0].textContent;
				sMessage = "(" + sCode + ") " + sMsg;
			} catch (e) {
				AppLog.error("XML parser error", "Unable to parse XML message.", "mil.navy.lib.rp.artifactMaint.ArtifactMaint");
			}

			return sMessage;
		},

		/**
		 * This method can be called to determine whether the sapUiSizeCompact or sapUiSizeCozy
		 * design mode class should be set, which influences the size appearance of some controls.
		 * @public
		 * @return {string} css class, either 'sapUiSizeCompact' or 'sapUiSizeCozy' - or an empty string if no css class should be set
		 */
		 _getContentDensityClass: function () {
			if (this._sContentDensityClass === undefined) {
				// check whether FLP has already set the content density class; do nothing in this case
				if (jQuery(document.body).hasClass("sapUiSizeCozy") || jQuery(document.body).hasClass("sapUiSizeCompact")) {
					this._sContentDensityClass = "";
				} else if (!Device.support.touch) { // apply "compact" mode if touch is not supported
					this._sContentDensityClass = "sapUiSizeCompact";
				} else {
					// "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
					this._sContentDensityClass = "sapUiSizeCozy";
				}
			}
			return this._sContentDensityClass;
		}

	});
});