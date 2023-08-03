/* eslint-disable no-unused-vars */
sap.ui.define([
	"sap/m/ComboBox",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/odata/v2/ODataModel",
	"sap/ui/model/resource/ResourceModel",
	"sap/ui/core/Item",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function(ComboBox, JSONModel, ODataModel, ResourceModel, CoreItem, Filter, FilterOperator) {
	"use strict";

	return ComboBox.extend("mil.navy.lib.rp.controls.vendorRic.VendorRIC", {
		// Define some global constants.
		_MODELID: "mil.navy.lib.rp.controls.vendorRic.VendorRIC_metadata",
		_ODATA_SERVICE_URI: "/sap/opu/odata/sap/ZM_RP_UTILITIES_SRV/",
		_ODATA_ENTITY_SET: "/vendorRicSet",

		metadata: {
			// aggregations: {
			// 	items: []
			// },
			// associations: {},
			events: {
				vendorRicLoaded: {
					parameters: {
						items: {type: "array"}
					}
				},
				vendorRicChanged: {
					parameters: {
						oNewItem: {type: "sap.ui.core.Item"},
						bIsValid: {type: "boolean"},
						oException: {type: "sap.ui.base.Event"}
					}
				}
			},
			properties: {
				shortLabel: {
					type: "string",
					defaultValue: "RIC"
				},
				mediumLabel: {
					type: "string",
					defaultValue: "Vendor RIC"
				},
				longLabel: {
					type: "string",
					defaultValue: "Vendor Routing Identification Code"
				},
				allowAll: {
					type: "boolean",
					defaultValue: false
				},
				allowNone: {
					type: "boolean",
					defaultValue: false
				},
				vendorRicDefaulted: {
					type: "boolean",
					defaultValue: false
				}
			}
		},

		renderer: "sap.m.ComboBoxRenderer",


		/* =========================================================== */
		/*  Lifecycle methods                                          */
		/* =========================================================== */

		/**
		 * Provide an sap.m.Input control with search functionality attached to an Entity Set
		 * of an OData model, that provides "suggestions" as the user types.
		 * @class
		 * @public
		 * @alias mil.navy.lib.rp.controls.vendorRic.VendorRIC
		 */
		init: function() {
			ComboBox.prototype.init.apply(this, arguments);

			// Create and Set the 'i18n' resource model and bind it to the controller.
			this._oResourceModel = new ResourceModel({
				bundleName: "mil.navy.lib.rp.controls.vendorRic.i18n.i18n"
			});
			this._oResourceBundle = this._oResourceModel.getResourceBundle();

			// Bind the control's metadata model to the controller.
			this._oControlModel = new JSONModel({
				settings: {
					placeholder: this._oResourceBundle.getText("PlaceholderText"),
					allowAll: this.getProperty("allowAll"),
					allowNone: this.getProperty("allowNone"),
					vendorRicDefaulted: this.getProperty("vendorRicDefaulted"),
					fnFilter: this._filterInput,
					fnHandleChange: this._valueChanged
				},
				items: []
			});

			// Attach the OData model to the element.
			this.attachModel();

			// Now bind it to the element.
			this.setModel(this._oControlModel, this._MODELID);

			// For better performance, lets load up all of the User's assigned RIC's so we
			// don't have to continuously call the backend to check.
			this._callRicService("*")
			.then(function(aResults) {
				// Set the "all" entry if requested.
				if (this.getProperty("allowAll")) {
					aResults.unshift({
						Code: "*",
						UserDefault: 0,
						Description: this._oResourceBundle.getText("AllRics")
					});
				}

				// Set the 'none' (blank) entry if requested.
				if (this.getProperty("allowNone")) {
					aResults.unshift({
						Code: "",
						UserDefault: 0,
						Description: ""
					});
				}

				// Set the ComboBox items aggregation.
				this._oControlModel.setProperty("/items", aResults);

				// Set the default Vendor RIC if requested.
				if (this.getProperty("vendorRicDefaulted")) {
					var oDefaultRic = aResults.find(function(oResult) {
						return oResult.UserDefault === 1 ? true : false;
					});
					if (oDefaultRic && oDefaultRic.hasOwnProperty("Code")) {
						this.setSelectedKey(oDefaultRic.Code);
					}
				}

				// Fire the 'loaded' event, so the owner knows you are ready to go.
				this.fireVendorRicLoaded({
					items: aResults
				});
			}.bind(this))
			.catch(function(oError) {
				// TODO - Once the element is rendered, we can attach an error message
				//	to the valueStateMesage.  To do this we should use the metadata model
				//	to bind up the valueState & valueStateText properties.
			});

			// Configure the Input element.
			this.initializeElement();
		},

		/**
		 * The control is automatically destroyed by the UI5 runtime.
		 * @public
		 * @override
		 */
		// destroy: function() {
		// 	ComboBox.prototype.destroy.apply(this, arguments);
		// },



		/* =========================================================== */
		/*  Public methods                                             */
		/* =========================================================== */

		/**
		 * Calculate the Users default Vendor RIC as returned form the OData service "vendorRicSet" collection.
		 * @returns {String} The User's default Vendor RIC.
		 */
		getDefaultVendorRic: function() {
			let aItems = this._oControlModel.getProperty("/items"),
				aDefaults = aItems.map(oItem => {
					return oItem.UserDefault > 0 ? oItem.Code : null;
				}).filter(function(sRic) {
					return sRic;
				});

			// Sort by rank.
			aDefaults.sort((a, b) => (a.UserDefault > b.UserDefault) ? 1 : -1);

			return aDefaults.length > 0 ? aDefaults[0] : "";
		},

		/**
		 * Set the property to have the default Vendor RIC set (selectedKey).
		 * @public
		 * @param {Boolean} bDefault If true, the User's default RIC will be set as the selected key.
		 */
		setVendorRicDefaulted: function(bDefault) {
			this.setProperty("vendorRicDefaulted", bDefault, true);
			this._oControlModel.setProperty("/settings/vendorRicDefaulted", bDefault);
		},

		/**
		 * Attached the OData model containing the "/VendorRicSet" entity.
		 * @public
		 * @param {sap.ui.model.odata.v2.ODataModel} oModel the OData model to be used for search.
		 * @returns {sap.ui.model.odata.v2.ODataModel} return the model for function chaining.
		 */
		attachModel: function(oModel) {
			this._oModel = null;

			if (oModel) {
				this._oModel = oModel;
			} else {
				this._oModel = new ODataModel(this._ODATA_SERVICE_URI);
				this._oModel.setDefaultBindingMode("OneWay");
				this._oModel.setDefaultCountMode("None");
				this._oModel.setUseBatch(false);
			}

			return this._oModel;
		},

		/**
		 * Set the Input elemets properties & event handlers.
		 * @public
		 * @param {Object} oParameters (optional) map of properties/events to attach.
		 */
		initializeElement: function(oParameters) {
			var oSettings = this._oControlModel.getProperty("/settings");

			// update the elements 'label' texts from the i18n so they are not hard-coded.
			this.setProperty("shortLabel", this._oResourceBundle.getText("LabelShort"), true);
			this.setProperty("mediumLabel", this._oResourceBundle.getText("LabelMedium"), true);
			this.setProperty("longLabel", this._oResourceBundle.getText("LabelLong"), true);

			// Copy over any of the callers parameters.
			if (oParameters) {
				Object.entries(oParameters).forEach(function(oParameter) {
					if (oSettings[oParameter.key]) {
						oSettings[oParameter.key] = oParameter.value;
					}
				});
			}

			// Apply the element configuration.
			this.setFilterFunction(oSettings.fnFilter);
			this.setPlaceholder(oSettings.placeholder);
			this.attachChange(oSettings.fnHandleChange, this);

			var sCode = "{" + this._MODELID + ">Code}",
				sDesc =  "{" + this._MODELID + ">Description}";
			this.bindAggregation("items", {
				path: this._MODELID + ">/items",
				template: new CoreItem({
					key: sCode,
					text: "{= $" +sDesc + " ? $" + sDesc + " : $" + sCode + " }"
				})
			});
		},

		/**
		 * Return the UI label texts for Vendor RIC (short & long)
		 * @public
		 */
		getInputLabel: function() {
			return {
				shortLabel: this._oResourceBundle.getText("LabelShort"),
				mediumLabel: this._oResourceBundle.getText("LabelMedium"),
				longLabel: this._oResourceBundle.getText("LabelLong")
			};
		},



		/* =========================================================== */
		/*  Event Handler Methods                                      */
		/* =========================================================== */

		// No event handler methods defined.



		/* =========================================================== */
		/*  Private methods                                            */
		/* =========================================================== */


		/**
		 * Call the OData service for a specific Vendor RIC (aka validity Check).
		 * @private
		 * @param {String} sVendorRic value of the Vendor RIC to be checked.
		 * @param {sap.ui.model.FilterOperator} sOperatorIn The OData operation to use.
		 * @return {Promise} a Javascript Promise that gets resolved when the dialog gets closed.
		 */
		_callRicService: function(sVendorRic, sOperatorIn) {
			var sOperator = sOperatorIn ? sOperatorIn : FilterOperator.EQ;

			return new Promise(function(fnResolve, fnReject) {
				this._oModel.read(this._ODATA_ENTITY_SET, {
					filters: [new Filter({
						path: "Code",
						operator: sOperator,
						value1: sVendorRic
					})],
					success: function(oData) {
						fnResolve(oData ? oData.results || null : null);
					},
					error: function(oError) {
						fnReject(oError);
					}
				});
		 	}.bind(this));
		 },

		 /**
		 * Event handler for the sap.m.ComboBox 'filter' event.
		 * @private
		 * @param {String} sTerm The string corresponding to the user's input.
		 * @param {sap.ui.core.Item} oItem corresponding the the user's input.
		 */
		_filterInput: function(sTerm, oItem) {
			var bValid = false;
			if (sTerm === "*") {	// All RICs.
				if (oItem.getKey() === "*") {
					bValid = true;
				} else {
					bValid = false;
				}
			} else {
				// Non case sensitive 'string starts with' regular expression.
				bValid = new RegExp("^" + sTerm, "i").test(oItem.getText());
			}

			return bValid;
		 },

		/**
		 * Check the value of a given Vendor RIC to see if it is valid. This method will also decorate the DOM
		 * of the Input element if the given Vendor RIC is not valid (& remove the decoration if valid).
		 * @private
		 * @param {sap.ui.base.Event} oEvent The input change/submit event object.
		 */
		_valueChanged: function(oEvent) {
			var sValue = oEvent.getParameter("value"),
				sAll = this._oResourceBundle.getText("AllRics");

			if (sValue === "*" || sValue === sAll) {
				sValue = "*";
				var oNewItem = this.getAggregation("items").find(function(oItem) {
					return sValue === oItem.getKey();
				});
				if (oNewItem) {
					this.setSelectedItem(oNewItem);
				}

				// Set the Value State back to normal (okay).
				this.setValueState(sap.ui.core.ValueState.None);
				this.setValueStateText("");

				// Fire the "changed" event for all listeners.
				this.fireVendorRicChanged({
					oNewItem: oNewItem,
					bIsValid: true,
					oException: null
				});
			} else {

				// Validate the RIC entered and decorate the DOM as needed.
				this._validateVendorRic(oEvent.getSource().getValue())
				.then(function(sErrorMessage) {
					var sState = sErrorMessage ? sap.ui.core.ValueState.Error : sap.ui.core.ValueState.None,
						bIsValid = sErrorMessage ? false : true;

					// Set the Value State back to normal (okay).
					this.setValueState(sState);
					this.setValueStateText(sErrorMessage || "");

					if (!bIsValid) {
						// Pull back focuse (in case it left).
						this.focus();
					}

					// Fire the "changed" event for all listeners.
					this.fireVendorRicChanged({
						oNewItem: oNewItem,
						bIsValid: sState === bIsValid,
						oException: null
					});

				}.bind(this))
				.catch(function(oError) {
					// Add the 'negative' decoration.
					this.setValueState(sap.ui.core.ValueState.Error);
					this.setValueStateText(this._oResourceBundle.getText("SuggestionErrorOData"));

					// Pull back focuse (in case it left).
					this.focus();

					// Fire the "changed" event for all listeners.
					this.fireVendorRicChanged({
						oItem: {},
						bIsValid: false,
						oException: oError
					});
				}.bind(this));
			}
		},

		/**
		 * Validate a given Vendor RIC exists. Set the RIC if found, otherwise show error.
		 * @public
		 * @param {String} sVendorRic value of the Vendor RIC to be checked.
		 * @return {Promise} a Javascript Promise that gets resolved when the dialog gets closed.
		 */
		_validateVendorRic: function(sVendorRic) {
			return new Promise(function(fnResolve, fnReject) {
				if (sVendorRic) {
					var oVendorRic = this._oModel.getProperty(
						this._oModel.createKey(this._ODATA_ENTITY_SET, {
							Code: sVendorRic
						})
					);

					if (!oVendorRic) {
						this._callRicService(sVendorRic)
						.then(function(oResults) {
							if (oResults && oResults.length > 0) {
								fnResolve();
							} else {
								fnResolve(this._oResourceBundle.getText("SuggestionErrorInvalid"));
							}
						}.bind(this))
						.catch(function(oError) {
							fnReject(oError);
						});
					} else {
						fnResolve();
					}
				} else if (this.getRequired()) {
					fnResolve(this._oResourceBundle.getText("SuggestionErrorRequired"));
				} else {
					fnResolve();
				}
			}.bind(this));
		}
	});
});