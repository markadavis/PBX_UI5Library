/**
 * Initialization code and shared classes of library com.publix.ui5lib.
 */
sap.ui.define([
	"sap/ui/core/lib"
], function (lib) {
		"use strict";

		/**
		 * Custom UI5 library for Publix ERP implementations
		 *
		 * @namespace
		 * @name com.publix.ui5lib
		 * @author Mark Davis - SAP NS2
		 * @version 1.0.0
		 * @public
		 */

		// Delegate further initialization of this library to the Core.
		sap.ui.getCore().initLibrary({
			name: "com.publix.ui5lib",
			version: "1.0.0",
			dependencies: [
				"sap.ui.core"
			],
			types: [
				"com.publix.ui5lib.ca.type.HelpValueType"
			],
			controls: [
				"com.publix.ui5lib.ca.appUtils.HashChangeListener",
				"com.publix.ui5lib.ca.appUtils.MobileKeyboardEvents",
				"com.publix.ui5lib.ca.barcodeScanner.BarcodeScanHandler",
				"com.publix.ui5lib.ca.controls.FilteredInput",
				"com.publix.ui5lib.ca.controls.VariantFilterBar",
				"com.publix.ui5lib.ca.odataUtils.ModelUtil",
				"com.publix.ui5lib.ca.odataUtils.Sorter",
				"com.publix.ui5lib.ca.odataUtils.ErrorHandler",
				"com.publix.ui5lib.ca.barcodeScanner.BarcodeScanHandler",
				"com.publix.ui5lib.ca.personalization.VariantManager",
				"com.publix.ui5lib.rp.artifactMaint.ArtifactMaint",
				"com.publix.ui5lib.rp.artifactMaint.NotesMaint",
				"com.publix.ui5lib.rp.controls.vendorRic.MultiVendorRIC",
				"com.publix.ui5lib.rp.controls.vendorRic.VendorRIC"
			],
			elements: [],
			interfaces: []
		});

		return com.publix.ui5lib;

	}, /* bExport= */ false);