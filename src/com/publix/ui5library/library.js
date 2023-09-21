/*!
 * ${copyright} Publix Supermarkets
 */

/**
 * Initialization Code and shared classes of library com.publix.ui5library.
 */
sap.ui.define([
	"sap/ui/core/library"
], function () {
	"use strict";

	// delegate further initialization of this library to the Core
	// Hint: sap.ui.getCore() must still be used to support preload with sync bootstrap!
	sap.ui.getCore().initLibrary({
		name: "com.publix.ui5library",
		version: "${version}",
		dependencies: [ // keep in sync with the ui5.yaml and .library files
			"sap.ui.core"
		],
		resources: {
			"css": [{
				"uri": "css/styles.css"
			}]
		},
		types: [
			"com.publix.ui5library.UploadState"
		],
		interfaces: [],
		controls: [
			"com.publix.ui5library.ca.appUtils.HashChangeListener",
			"com.publix.ui5library.ca.appUtils.MoileKeyboardEvents",
			"com.publix.ui5library.ca.barcodeScanner.BarcodeScanHandler",
			"com.publix.ui5library.ca.barcodeScanner.Barcode",
			"com.publix.ui5library.ca.odataUtils.ModelUtil",
			"com.publix.ui5library.ca.odataUtils.Sorter",
			"com.publix.ui5library.ca.odataUtils.ErrorHandler",
			"com.publix.ui5library.ca.uploader.UploadSet",
			"com.publix.ui5library.pm.storeSelector.StoreInput",
			"com.publix.ui5library.pm.storeSelector.StoreMultiInput",
			"com.publix.ui5library.pm.storeSelector.StoreSelector",
			"com.publix.ui5library.pm.storeSelector.StoreSearchHandler",
			"com.publix.ui5library.wm.warehouseSelector.WarehouseSelector"
		],
		elements: [
			"com.publix.ui5library.ca.uploader.Uploader",
			"com.publix.ui5library.ca.uploader.UploadSetItem"
		],
		noLibraryCSS: false // if no CSS is provided, you can disable the library.css load here
	}, /*bExport=*/false);

	/**
	 * Some description about <code>ui5library</code>
	 *
	 * @namespace
	 * @name com.publix.ui5library
	 * @author Mark Davis - Publix Supermarkets
	 * @version ${version}
	 * @public
	 */
	let oLib = com.publix.ui5library;

	/**
	 * States of the upload process for {@link com.publix.ui5library.ca.uploader.UploadSetItem}.
	 *
	 * @enum {string}
	 * @public
	 * @ui5-metamodel This enumeration will also be described in the UI5 (legacy) designtime metamodel.
	 */
	oLib.UploadState = {
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

	return oLib;
}, /*bExport=*/false);
