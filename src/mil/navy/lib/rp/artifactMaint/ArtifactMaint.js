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
	"sap/m/UploadCollectionParameter"
], function(UI5Object, AppLog, Device, ResourceModel, JSONModel, ODataModel, Filter, FilterOperator, ErrorHandler, UploadCollectionParameter) {
	"use strict";

	return UI5Object.extend("mil.navy.lib.rp.artifactMaint.ArtifactMaint", {
		_ODATA_SERVICE_URI: "/sap/opu/odata/sap/ZM_RP_ATTACHMENT_SRV",
		_ENTITY_SET: "ATTACHMENTSet",

		/* =========================================================== */
		/*  Lifecycle methods                                          */
		/* =========================================================== */

		/**
		 * This class provices application artifact (document) upload/download capabilities.
		 * @class
		 * @public
		 * @name mil.navy.lib.rp.artifactMaint.ArtifactMaint
		 * @param {Object} oParams Setup parameters for the unique identification of object the
		 * 		Artifat Maint instance belogns to.  The following paramters are accepted:
		 * 		{
		 * 			objectId: {String}  The Business Object ID used for file storage.
		 *			objectType: {String}  The optional Business Object Type used for file storage (default "ZATTACH_REP").
		 *			sObjectCategory: {String}  The optional Business Object Category used for file storage (default "BO").
		 *			controlId: {String}  The optional unique ID used for the control's instance (default "artifactsManager").
		 *			dialogTitle: {String}  The optional Dialog title (default "Attach Artifacts").
		 * 		}
		 */
		constructor: function(oParams) {
            // Create and Set the 'i18n' resource model.
            this._oResources = new ResourceModel({
                bundleName: "mil.navy.lib.rp.artifactMaint.i18n.i18n"
            });
            this._oResourceBundle = this._oResources.getResourceBundle();

			// TODO - Log & throw an exception if no "sObjectId" is given.

			// Construct the control's Metadata model.
			oParams = oParams ? oParams : {
				objectId: "",
				objectTYpe: "ZATTCH_REP",
				objectCategory: "BO",
				controlId: "artifactsManager",
				dialogTitle: this._oResourceBundle.getText("ArtifactMaint_Title"),
			};
			this._oMetaModel = new JSONModel({
				Settings: {
					objectId:  oParams.hasOwnProperty("objectId") ? oParams.objectId : "",
					objectType: oParams.hasOwnProperty("objectType") ? oParams.objectType : "ZATTCH_REP",
					objectCategory: oParams.hasOwnProperty("objectCategory") ? oParams.objectCategory : "BO",
					controlId: oParams.hasOwnProperty("controlId") ? oParams.controlId : "artifactsManager",
					dialogTitle: oParams.hasOwnProperty("dialogTitle") ? oParams.dialogTitle : this._oResourceBundle.getText("ArtifactMaint_Title")
				},
				entityData: null
			});

			// Construct the artifacts (attachements) model.
			this._oArtifactModel = new JSONModel();

			// Construct the control's OData model.
			this._oDataModel = new ODataModel(this._ODATA_SERVICE_URI);
			this._oErrorHandler = new ErrorHandler(null/*no controller binding*/, "artifactsModel",false/*all errors*/, this._oDataModel);

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
			BaseController.prototype.destroy.apply(this, arguments);
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
				let reader = new FileReader();	// Browser API
				reader.onload = function(oError) {
					// TODO - handle API loading errors.
				};
				reader.readAsDataURL(aFiles[0]);
			}
		},

		onBeforeUploadStarts: function(oControlEvent) {
			let oSettings = this._oMetaModel.getProperty("/Settings");

			// filename
			let sFileName = oControlEvent.getParameter("fileName"),
				slug = oSettings.objectType + "/" + oSettings.objectId + "/" + sFileName;

			var oCustomerHeaderSlug = new sap.m.UploadCollectionParameter({
				name: "slug",
				value: slug
			});
			oControlEvent.getParameters().addHeaderParameter(oCustomerHeaderSlug);

			// object key
			var oCustomerHeaderObjectKey = new sap.m.UploadCollectionParameter({
				name: "objectKey",
				value: oSettings.objectId
			});
			oControlEvent.getParameters().addHeaderParameter(oCustomerHeaderObjectKey);

			// object type
			var oCustomerHeaderObjectType = new sap.m.UploadCollectionParameter({
				name: "objectType",
				value: oSettings.objectType
			});
			oControlEvent.getParameters().addHeaderParameter(oCustomerHeaderObjectType);

			// object cat
			var oCustomerHeaderObjectCat = new sap.m.UploadCollectionParameter({
				name: "objectCat",
				value: oSettings.objectCategory
			});
			oControlEvent.getParameters().addHeaderParameter(oCustomerHeaderObjectCat);
		},

		onUploadComplete: function(oControlEvent) {
			this._setInitialAttachData();
		},

		onFileDeleted: function(oEvent) {
			let sDocumentId = oEvent.getParameter("documentId");

			if (sDocumentId) {
				let oSettings = this._oMetaModel.getProperty("/Settings"),
					sPath = this._oDataModel.createKey("/" + this._ENTITY_SET, {
						ObjectType: oSettings.objectType,
						ObjectCat: oSettings.objectCategory,
						ObjectId: oSettings.objectId,
						DocumentId: sDocumentId
					});

				this._oDataModel.remove(sPath, {
					method: "DELETE",
					success: function(oData) {
						this._setInitialAttachData();
					}.bind(this),
					error: function(oError) {
						// handled by the ErrorHandler control.
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
		 * @param {String} sObjectType The Busniess Object Type.
		 * @param {String} sObjectCat The Business Object Category.
		 * @param {String} sObjectId The Business Object ID.
		 * @param {String} sDocumentId the Document Name.
		 * @returns {String} The Image URL.
		 * @private
		 */
		getImageUrl: function(sObjectType, sObjectCat, sObjectId, sDocumentId) {
			let sPath = null;
		
			if (sObjectId) {
				sPath = this._oDataModel.createKey("/" + this._ENTITY_SET, {
					ObjectType: sObjectType,
					ObjectCat: sObjectCat,
					ObjectId: sObjectId,
					DocumentId: sDocumentId
				}) + "/$value";
			}

			return sPath;
		},

		/**
		 * Open the Artifact Up/Download manager Dialog.
		 * @public
		 * @param {Object} oParams Setup parameters for the unique identification of object the
		 * 		Artifat Maint instance belogns to.  The following paramters are accepted:
		 * 		{
		 * 			objectId: {String}  The Business Object ID used for file storage.
		 *			objectType: {String}  The optional Business Object Type used for file storage (default "ZATTACH_REP").
		 *			sObjectCategory: {String}  The optional Business Object Category used for file storage (default "BO").
		 *			controlId: {String}  The optional unique ID used for the control's instance (default "artifactsManager").
		 *			dialogTitle: {String}  The optional Dialog title (default "Attach Artifacts").
		 * 		}
		 * @returns {Object} Return 'this' for call chaining (like the 'attachOnClose' function).
		 */
    	open: function(oParams) {
			if (!this._oDialogAttachments) {
				this._oDialogAttachments = sap.ui.xmlfragment(
					"mil.navy.lib.rp.artifactMaint.Dialog_" + this._oMetaModel.getProperty("Settings/controlId"),
					"mil.navy.lib.rp.artifactMaint.ArtifactDialog",
					this
				);
				this._oDialogAttachments.setModel(this._oResources, "i18n");
				this._oDialogAttachments.setModel(this._oMetaModel, "metadata");
				this._oDialogAttachments.setModel(this._oArtifactModel);
			}

			// TODO - throw an error if we don't have an "objectId" (in the metadata /Settings).

			// Update the control's Metadata model.
			if (oParams) {
				let oSettings = this._oMetaModel.getProperty("/Settings");

				oSettings.objectId = oParams.hasOwnProperty("objectId") ? oParams.objectId : oSettings.objectId;
				oSettings.objectType = oParams.hasOwnProperty("objectType") ? oParams.objectType : oSettings.objectType;
				oSettings.objectCategory = oParams.hasOwnProperty("objectCategory") ? oParams.objectCategory : oSettings.objectCategory;
				oSettings.controlId = oParams.hasOwnProperty("controlId") ? oParams.controlId : oSettings.controlId;
				oSettings.dialogTitle = oParams.hasOwnProperty("dialogTitle") ? oParams.dialogTitle : oSettings.dialogTitle;

				this._oMetaModel.setProperty("/Settings", oSettings);
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
		 * Attach a call-back Function to the 'onClose' event - called when the dialog is colsed.
		 * @param {function} fnCloseListener The function to be callled when the dialog is closed. 
		 * @public
		 */
		attachOnClose: function(fnCloseListener) {
			if (fnCloseListener && typeof fnCloseListener === "function") {
				this._onCloseListener = fnCloseListener;
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
			let sObjectId = this._oMetaModel.getProperty("/Settings/objectId"),
				aFilters = [new Filter("ObjectId", FilterOperator.EQ, sObjectId)];

			this._oDataModel.read("/" + this._ENTITY_SET, {
				async: false,
				filters: aFilters,
				success: function(oData, oResponse) {
					// this._oMetaModel.setData(oData);
					this._oArtifactModel.setProperty("/", oData);
				}.bind(this),
				error: function(oError) {
					// Handled by the OData ErrorHandler control.
				}
			});
		}

	});
});