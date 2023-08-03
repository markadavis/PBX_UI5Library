sap.ui.define([
	"sap/ui/model/CompositeType"
], function (CompositeType) {
	"use strict";

	return CompositeType.extend("com.publix.ui5lib.ca.type.HelpValueType", {
		CAMEL_CASE: "CamelCase",
		VALUE_WITH_TEXT: "ValueWithText",

		/**
		 * Construct (initialize) the Type.
		 * @public
		 * @param {sap.ui.model.v2.odata.ODataModel} oModel The OData model for value resoultion.
		 */
		constructor: function(oModel) {
			CompositeType.apply(this, arguments);
			this.bParseWithValues = true; // make 'parts' available in parseValue
			this._oModel = oModel;
		},

		/**
		 * Translates a 'key' value into it's corresponding 'text' value based on the 'Value Set' name.
		 * @public
		 * @param {Array} aValues	The 'Value Set' name & 'key' value to be translated.
		 *							The 'Value Set' must be the 1st element in the array.
		 *							A boolean - true means capitalize the fist character of each word of the text.
		 * @returns {string} The translated 'text' corresponding to the give 'key'/'Value Set'.
		 */
		formatValue: function (aValues) {
			var sText = "",iFirst = 0,iSecond = 1,iThird = 2, iFourth = 3;

			if (aValues.length >= 2) {
				var sType = aValues[iFirst],	// Value Set ID
					sValue = aValues[iSecond],	// Value Key
					sCamelCase = aValues.length > 2 ? aValues[iThird] : "",
					sValueWithCase = aValues.length > 3 ? aValues[iFourth] : "",
					sPath = this._oModel.createKey("/ValueHelpSet", {
						Type: sType,
						Value: sValue
					}),
					mValueSet = this._oModel.getProperty(sPath);

				sText = mValueSet && mValueSet.Text ? mValueSet.Text : sValue;

				if (sCamelCase && sCamelCase === this.CAMEL_CASE && sText) {
					sText = sText.replace(/\w\S*/g, function(sWord){
						return sWord.charAt(0).toUpperCase() + sWord.substr(1).toLowerCase();
					});
				}

				if (sValueWithCase && sValueWithCase === this.VALUE_WITH_TEXT && mValueSet && mValueSet.Value && sText) {
					sText = mValueSet.Value + " - " + sText;
				}
			}

			return sText;
		},

		/**
		 * Translate the 'text' value back into the corresponding 'key' value.
		 * @public
		 * @param {string} sText  The 'text' to be translated back into the 'key' value.
		 * @param {string} sParam  Some event stuff.
		 * @param {Array} aValues	The 'Value Set' name & 'text' value to be translated.
		 *							The 'Value Set' must be the 1st element in the array.
		 * @returns {sKey} The 'key' value corresponding to the given 'text'.
		 */
		parseValue: function (sText, sParam, aValues) {
			return aValues;	// not implemented !!!
		},

		/**
		 * Validate the value to be parsed.
		 * @param {Object} oEvent The validation event object.
		 * @public
		 * @returns {boolean} true if the validation passed.
		 */
		validateValue: function (oEvent) {
			return true; // not implemented !!!
		}
	});
});