/*!
 * ${copyright}
 */
// Provides control com.publix.ui5lib.Example.
sap.ui.define([
	"./../lib", "sap/ui/core/Control", "./ExampleRenderer"
], function (library, Control, ExampleRenderer) {
	"use strict";

	/**
	 * Constructor for a new Example control.
	 *
	 * @param {string} [sId] id for the new control, generated automatically if no id is given
	 * @param {object} [mSettings] initial settings for the new control
	 *
	 * @class
	 * Some class description goes here.
	 * @extends sap.ui.core.Control
	 *
	 * @author Publix ERP ERP
	 * @version 0.1.0
	 *
	 * @constructor
	 * @public
	 * @alias com.publix.ui5lib.controls.Example
	 * @ui5-metamodel This control/element also will be described in the UI5 (legacy) designtime metamodel
	 */
	var Example = Control.extend("com.publix.ui5lib.controls.Example", {
		metadata: {
			library: "com.publix.ui5lib",
			properties: {
				/**
				 * text
				 */
				text: {
					type: "string",
					defaultValue: null
				}
			},
			events: {
				/**
				 * Event is fired when the user clicks on the control.
				 */
				press: {}
			}
		},
		renderer: ExampleRenderer
	});
	return Example;
}, /* bExport= */ true);