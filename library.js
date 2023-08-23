sap.ui.define([], function() {
	"use strict";

	var oLibrary = sap.ui.getCore().initLibrary({
		name: "com.publix.zUI5Library",
		version: "1.0.0",
		dependencies: ["sap.ui.core"],
		types: [
			"com.publix.zUI5Library.UploadState"
		],
		interfaces: [],
		controls: [
			"com.publix.zUI5Library.ca.barcodeScanHandler.BarcodeScanHandler",
			"com.publix.zUI5Library.ca.uploader.UploadSet",
			"com.publix.zUI5Library.wm.warehouseSelector.WarehouseSelector",
			"com.publix.zUI5Library.pm.storeSelector.StoreSelector"
		],
		elements: [
			"com.publix.zUI5Library.ca.uploader.Uploader",
			"com.publix.zUI5Library.ca.uploader.UploadSetItem"
		]
	});

	jQuery.sap.includeStyleSheet("/sap/bc/ui5_ui5/sap/zui5library/css/styles.css");
 
	/**
	 * The Publix custom UI5 control library.
	 *
	 * @namespace
	 * @aliascom.publix.zUI5Library
	 * @public
	 */
	/* eslint-disable no-undef */
	var thisLib = com.publix.zUI5Library;


	/**
	 * States of the upload process for {@link com.publix.zUI5Library.ca.uploader.UploadSetItem}.
	 *
	 * @enum {string}
	 * @public
	 * @ui5-metamodel This enumeration also will be described in the UI5 (legacy) designtime metamodel
	 */
	thisLib.UploadState = {
		/**
		 * The file has been uploaded successfuly.
		 * @public
		 */
		Complete: "Complete",
		/**
		 * The file cannot be uploaded due to an error.
		 * @public
		 */
		Error: "Error",
		/**
		 * The file is awaiting an explicit command to start being uploaded.
		 * @public
		 */
		Ready: "Ready",
		/**
		 * The file is currently being uploaded.
		 * @public
		 */
		Uploading: "Uploading"
	};

	return thisLib;

}, false); // bExport