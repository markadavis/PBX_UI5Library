sap.ui.define([
	"sap/m/Input"
], function(Input) {
	"use strict";

	var oInput = Input.extend("com.publix.ui5lib.ca.controls.FilteredInput", {
		renderer: function(oRM, oControl) { // static function
			sap.m.InputRenderer.render(oRM, oControl);
		}
	});

	oInput._DEFAULTFILTER = function(sValue, oElement) {
		var sQuery = sValue.toLowerCase(),
			sText1 = oElement.getText().toLowerCase(),
			sText2 = oElement.getAdditionalText ? oElement.getAdditionalText().toLowerCase() : "";

		var bIn1 = sText1.indexOf(sQuery) !== -1,
			bIn2 = sText2.indexOf(sQuery) !== -1;

		return bIn1 || bIn2;
	};

	oInput.prototype.init = function() {
		Input.prototype.init.call(this);
		this._fnFilter = oInput._DEFAULTFILTER;
		this._bUseDialog = sap.ui.Device.system.phone;
		this._bFullScreen = sap.ui.Device.system.phone;
		this._iSetCount = 0;
    };

	oInput.prototype.setFilterFunction = function(oFilter) {
		if (oFilter === null || oFilter === undefined) {
			this._fnFilter = oInput._DEFAULTFILTER;
		} else {
			this._fnFilter = oFilter;
		}

		return this;
	};

	return oInput;
});