sap.ui.define(function() {
	"use strict";

	return {
		name: "QUnit TestSuite for com.publix.ui5library",
		defaults: {
			bootCore: true,
			ui5: {
				libs: "sap.ui.core,com.publix.ui5library",
				theme: "",
				noConflict: true,
				preload: "auto"
			},
			qunit: {
				version: 2,
				reorder: false
			},
			sinon: {
				version: 4,
				qunitBridge: true,
				useFakeTimers: false
			},
			module: "./{name}.qunit"
		},
		tests: {
			// test file for the Example control
			Example: {
				title: "QUnit Test for Example",
				_alternativeTitle: "QUnit tests: com.publix.ui5library.Example"
			}
		}
	};

});
