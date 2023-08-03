sap.ui.define([
	"sap/ui/base/Object",
	"sap/base/Log",
	"sap/ui/model/json/JSONModel",
	"sap/base/util/ObjectPath"
], function(UI5Object, AppLog, JSONModel, ObjectPath) {
	"use strict";

	return UI5Object.extend("mil.navy.lib.ca.odataUtils.ModelUtil", {


		/* =========================================================== */
		/*  Lifecycle methods                                          */
		/* =========================================================== */

		/**
		 * This class provices application OData model Schema Utility methods.
		 * @class
		 * @param {sap.ui.core.UIComponent} oComponent reference to the app's component
		 * @Param {string} sModelId The ID of the model to be operated on.
		 * @public
		 * @alias mil.navy.lib.ca.odataUtils.ModelUitl
		 */
		constructor: function(oComponent, sModelId) {
			if (oComponent) {
				this.loadSchema(oComponent, sModelId);
			}
		},



		/* =========================================================== */
		/*  Public methods                                             */
		/* =========================================================== */

		/**
		 * ~THIS MUST~ be Called before any of the OData Schema utilities can be used.
		 * ~UNLESS~ function loadSchemaFromModel is called.
		 * @public
		 * @param {sap.ui.core.UIComponent} The app component to be installed on.
		 * @param {string} sModelId The specific OData model identifier to bind (optional).
		 */
		loadSchema: function(oComponent, sModelId) {
			// Bind the main OData model's schema.
			var oDataModel = null;

			if (sModelId) {
				oDataModel = oComponent.getModel(sModelId);
			} else {
				oDataModel = oComponent.getModel();
			}

			if (oDataModel) {
				oDataModel.metadataLoaded().then(function() {
					this._aSchemas = oDataModel.getMetaModel().oMetadata.getServiceMetadata().dataServices.schema;
				}.bind(this));
			}
		},

		/**
		 * ~THIS MUST~ be Called before any of the OData Schema utilities can be used.
		 * ~UNLESS~ function loadSchema is called.
		 * @public
		 * @param {sap.ui.model.odata.v2.ODataModel} oModel The model to be installed on.
		 */
		loadSchemaFromModel: function(oDataModel) {
			if (oDataModel) {
				oDataModel.metadataLoaded().then(function() {
					this._aSchemas = oDataModel.getMetaModel().oMetadata.getServiceMetadata().dataServices.schema;
				}.bind(this));
			}
		},

		/**
		 * Find the Complex Type in the 'Main' model's schema.
		 * @param {string} sType The name of the Entity Type requested.
		 * @returns {map} The metadat for the requested Entity Type.
		 * @public
		 */
		getComplexType: function(sType) {
			var mComplexType = null,
				aParts = sType.split("."),
				sComplexType = "",
				sNameSpace = "";

			if (aParts.length > 1) {
				sNameSpace = aParts[0];
				sComplexType = aParts[1];
			} else if (this._aSchemas) {
				sNameSpace = this._aSchemas[0].namespace;
				sComplexType = aParts[0];
			}

			if (this._aSchemas) {
				for (var i = 0; i < this._aSchemas.length; i++) {
					var mSchema = this._aSchemas[i];
					if (mSchema.namespace === sNameSpace) {
						for (var j = 0; j < mSchema.entityType.length; j++) {
							var mType = mSchema.complexType[j];
							if (mType.name === sComplexType) {
								mComplexType = mType;
								break; // for j loop
							}
						}
						if (mComplexType) {
							break;	// for i loop
						}
					}
				}
			}

			return mComplexType;
		},

		/**
		 * Find the Entity Type in the 'Main' model's schema.
		 * @param {string} sType The name of the Entity Type requested.
		 * @returns {map} The metadat for the requested Entity Type.
		 * @public
		 */
		getEntityType: function(sType) {
			var mEntityType = null,
				aParts = sType.split("."),
				sEntityType = "",
				sNameSpace = "";

			if (aParts.length > 1) {
				sNameSpace = aParts[0];
				sEntityType = aParts[1];
			} else if (this._aSchemas) {
				sNameSpace = this._aSchemas[0].namespace;
				sEntityType = aParts[0];
			}

			if (this._aSchemas) {
				for (var i = 0; i < this._aSchemas.length; i++) {
					var mSchema = this._aSchemas[i];
					if (mSchema.namespace === sNameSpace) {
						for (var j = 0; j < mSchema.entityType.length; j++) {
							var mType = mSchema.entityType[j];
							if (mType.name === sEntityType) {
								mEntityType = mType;
								break; // for j loop
							}
						}
						if (mEntityType) {
							break;	// for i loop
						}
					}
				}
			}

			return mEntityType;
		},

		/**
		 * Find the Entity Type in the 'Main' model's schema.
		 * @param {string} sSet The name of the Entity Set requested.
		 * @returns {map} The metadata for the requested Entity Set.
		 * @public
		 */
		getEntitySet: function(sSet) {
			var mEntitySet = null,
				aParts = sSet.split("."),
				sEntitySet = "",
				sNameSpace = "";

			if (aParts.length > 1) {
				sNameSpace = aParts[0];
				sEntitySet = aParts[1];
			} else if (this._aSchemas) {
				sNameSpace = this._aSchemas[0].namespace;
				sEntitySet = aParts[0];
			}

			if (this._aSchemas) {
				for (var i = 0; i < this._aSchemas.length; i++) {
					var mSchema = this._aSchemas[i];
					if (mSchema.namespace === sNameSpace) {
						for (var j = 0; j < mSchema.entityContainer.length; j++) {
							var mContainer = mSchema.entityContainer[j];
							if (mContainer.name === this.sMainNameSpace + "_Entities") {
								for (var k = 0; k < mContainer.entitySet.length; k++) {
									var mSet = mContainer.entitySet[k];
									if (mSet.name === sEntitySet) {
										mEntitySet = mSet;
										break;	// for k loop
									}
								}
								if (mEntitySet) {
									break;	// for j loop
								}
							}
						}
					}
					if (mEntitySet) {
						break;	// for i loop
					}
				}
			}

			return mEntitySet;
		},

		/**
		 * Create a data object from the given Entity Type metadata and seed the response
		 * with the given seed data.
		 * @param {string} sType The name of the Entity Type requested.
		 * @param {map} mData The data to use to 'seed' the response (data object).
		 * @returns {map} The fully constructed Entity Type data object.
		 */
		createEntityData: function(sType, mData) {
			var mSeedData = mData || {},
				mEntityData = {},
				mEntityType = this.getEntityType(sType);

			var fnDefaultValue = function(sKnownType) {
				var sValue = null;
				switch (sKnownType) {
					case "Edm.String":
						sValue = "";
						break;

					case "Edm.DateTime":
						sValue = new Date();
						break;

					case "Edm.Decimal":
						sValue = "0";
						break;

					case "Edm.Integer":
						sValue = "0";
						break;

					case "Edm.Boolean":
						sValue = false;
						break;
				}

				return sValue;
			};

			if (mEntityType) {
				mEntityType.property.forEach(function(mProperty) {
					if (mSeedData.hasOwnProperty(mProperty.name)) {
						mEntityData[mProperty.name] = mSeedData[mProperty.name];
					} else {
						var sValue = fnDefaultValue(mProperty.type);
						if (sValue === null) {
							// Check to see if it is a complex type.
							var mComplexType = this.getComplexType(mProperty.type);
							if (mComplexType) {
								mEntityData[mProperty.name] = {};
								mComplexType.property.forEach(function(mComplexProperty) {
									if (mSeedData.hasOwnProperty(mProperty.name) && mSeedData[mProperty.name].hasOwnProperty(mComplexProperty.name)) {
										mEntityData[mProperty.name][mComplexProperty.name] = mSeedData[mProperty.name][mComplexProperty.name];
									} else {
										mEntityData[mProperty.name][mComplexProperty.name] = fnDefaultValue(mComplexProperty.type);
									}
								});
							}
						} else {
							mEntityData[mProperty.name] = sValue;
						}
					}
				}.bind(this));
			}

			return mEntityData;
		}



		/* =========================================================== */
		/*  Private methods                                            */
		/* =========================================================== */

	});
});