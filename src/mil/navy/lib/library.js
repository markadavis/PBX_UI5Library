/**
 * Initialization code and shared classes of library mil.navy.lib.
 */
sap.ui.define([
	"sap/ui/core/lib"
], function (lib) {
		"use strict";

		/**
		 * Custom UI5 library for Navy ERP implementations
		 *
		 * @namespace
		 * @name mil.navy.lib
		 * @author Mark Davis - SAP NS2
		 * @version 1.0.0
		 * @public
		 */

		// Delegate further initialization of this library to the Core.
		sap.ui.getCore().initLibrary({
			name: "mil.navy.lib",
			version: "1.0.0",
			dependencies: [
				"sap.ui.core"
			],
			types: [
				"mil.navy.lib.ca.type.HelpValueType"
			],
			controls: [
				"mil.navy.lib.ca.appUtils.HashChangeListener",
				"mil.navy.lib.ca.appUtils.MobileKeyboardEvents",
				"mil.navy.lib.ca.barcodeScanner.BarcodeScanHandler",
				"mil.navy.lib.ca.controls.FilteredInput",
				"mil.navy.lib.ca.controls.VariantFilterBar",
				"mil.navy.lib.ca.odataUtils.ModelUtil",
				"mil.navy.lib.ca.odataUtils.Sorter",
				"mil.navy.lib.ca.odataUtils.ErrorHandler",
				"mil.navy.lib.ca.barcodeScanner.BarcodeScanHandler",
				"mil.navy.lib.ca.personalization.VariantManager",
				"mil.navy.lib.rp.artifactMaint.ArtifactMaint",
				"mil.navy.lib.rp.artifactMaint.NotesMaint",
				"mil.navy.lib.rp.controls.vendorRic.MultiVendorRIC",
				"mil.navy.lib.rp.controls.vendorRic.VendorRIC"
			],
			elements: [],
			interfaces: []
		});

		return mil.navy.lib;

	}, /* bExport= */ false);