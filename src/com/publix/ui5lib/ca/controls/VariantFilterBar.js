sap.ui.define([
    "sap/ui/comp/filterbar/FilterBar",
    "sap/ui/comp/smartvariants/PersonalizableInfo",
    "sap/ui/comp/smartvariants/SmartVariantManagement",
    "sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
    "sap/m/Token"
], function (FilterBar, PersonalizableInfo, SmartVariantManagement, Filter, FilterOperator, Token) {
    "use strict";

    var CustomFilterBar = FilterBar.extend("com.publix.ui5lib.ca.controls.VariantFilterBar", {
        Filter: Filter,
        FilterOperator: FilterOperator,
    
        renderer: function (oRm, oControl) {
            FilterBar.getMetadata().getRenderer().render(oRm, oControl);
        },

        /**
         * Find and return a Filter Gropu Item by it's assigned 'name' property.
         * @public
         * @param {String} sName Then 'Name' of the Filter Group Item to be returned.
         * @returns {sap.ui.comp.filterbar.FilterGroupItem} A Filter Group Item matching the given sName.
         */
        getFilterItemByName(sName) {
            return this.getFilterGroupItems().find(oItem => {
                return oItem.getName() === sName
            });
        },

        /**
         * Return a JSON 'Filter Info' object for a given 'Filter Group Item' (used for storing/restoring FilterBar Varnants).
         *   Filter Info object structure:
         *     {
         *       group: String - The given Filter Group Name,
         *       property: String - The name given to the property (used for binding),
         *       type: String - An SAPUI5 (or custom) control name : ie) "sap.m.Input",
         *       label: String - The label given to the Filter Group Item,
         *       manditory: Boolean -  oFilterItem.getMandatory(),
         *       value1: Any - the 1st value of the sap.ui.model.Filter ().value1,
         *       value2: Any - the 2nd value of the sap.ui.model.Filter ().value2
         *     }
         * @public
         * @param {sap.ui.comp.filterbar.FilterGroupItem} The Filter Bar Group Item to colect info on. 
         * @returns {Object} JSON 'Filter Info' object (Variant Item information).
         */
        getFilterControlInfo: function (oFilterItem) {
            let oControl = oFilterItem.getControl(),
                sType = oControl.getMetadata().getName(),
                oInfo = {
                    group: oFilterItem.getGroupName ? oFilterItem.getGroupName() : "",
                    property: oFilterItem.getName(),
                    type: sType,
                    label: oFilterItem.getLabel(),
                    manditory: oFilterItem.getMandatory(),
                    value1: null,
                    value2: null
                };

            switch (sType) {
                case "sap.m.Input":
                    let sValue = oControl.getValue();
                    if (sValue) {
                        oInfo.value1 = sValue;
                    }
                    break;

                case "sap.m.CheckBox":
                    oInfo.value1 = oControl.getSelected();
                    break;

                case "sap.m.Select":
                case "sap.m.ComboBox":
                    let sSelectedKey = oControl.getSelectedKey();
                    if (sSelectedKey) {
                        oInfo.value1 = sSelectedKey;
                    }
                    break;

                case "sap.m.DatePicker":
                    oInfo.value1 = oControl.getDateValue();
                    break;

                case "sap.m.DateRangeSelection":
                    let dMinDate = oControl.getDateValue(),
                        dMaxDate = oControl.getSecondDateValue();
                    if (dMinDate || dMaxDate) {
                        oInfo.value1 = dMinDate;
                        oInfo.value2 = dMaxDate;
                    }
                    break;

                case "sap.m.MultiInput":
                    let aTokens = [];
                    oControl.getTokens().forEach(oToken => {
                        aTokens.push({
                            key: oToken.getKey(),
                            text: oToken.getText()
                        });
                    });
                    if (aTokens.length > 0) {
                        oInfo.value1 = aTokens.length > 1 ? aTokens : aTokens[0];
                    }
                    break;

                case "com.publix.ui5lib.rp.controls.vendorRic.VendorRIC":
                    let sSelectedRic = oControl.getSelectedKey();
                    if (sSelectedRic) {
                        oInfo.value1 = sSelectedRic;
                    }
                    break;

                case "com.publix.ui5lib.rp.controls.vendorRic.MultiVendorRIC":
                    let aRics = oControl.getSelectedKeys();
                    if (aRics.length > 0) {
                        oInfo.value1 = aRics.length > 1 ? aRics : aRics[0];
                    }
                    break;
            }

            return oInfo;
        },

        /**
         * Return an sap.ui.model.Filter constructed from a given 'Filter Info' JSON object.
         *   Filter Info object structure:
         *     {
         *       group: String - The given Filter Group Name,
         *       property: String - The name given to the property (used for binding),
         *       type: String - An SAPUI5 (or custom) control name : ie) "sap.m.Input",
         *       label: String - The label given to the Filter Group Item,
         *       manditory: Boolean -  oFilterItem.getMandatory(),
         *       value1: Any - the 1st value of the sap.ui.model.Filter ().value1,
         *       value2: Any - the 2nd value of the sap.ui.model.Filter ().value2
         *     }
         * @public
         * @param {Object} oFilterItem JSON 'Filter Info' object.
         * @returns {sap.ui.model.Filter} Filter object used to Filter OData model bindings.
         */
		createControlFilter: function(oFilterItem) {
			let oFilter = null;

			switch (oFilterItem.type) {

				case "sap.m.Input":
					if (oFilterItem.value1) {
						oFilter = new this.Filter({
							path: oFilterItem.property,
							value1: oFilterItem.value1,
							operator: this.FilterOperator.EQ
						});
					}
					break;

				case "sap.m.CheckBox":
					oFilter = new this.Filter({
						path: oFilterItem.property,
						value1: oFilterItem.value1,
						operator: this.FilterOperator.EQ
					});
					break;

				case "sap.m.Select":
				case "sap.m.ComboBox":
					if (oFilterItem.value1) {
						oFilter = new this.Filter({
							path: oFilterItem.property,
							value1: oFilterItem.value1,
							operator: this.FilterOperator.EQ
						});
					}
					break;

                case "sap.m.DatePicker":
                    if (oFilterItem.value1) {
						oFilter = new this.Filter({
							path: oFilterItem.property,
							value1: oFilterItem.value1,
							operator: this.FilterOperator.EQ
						});
					}
                    break;

				case "sap.m.DateRangeSelection":
					if (oFilterItem.value1 && oFilterItem.value2) {
						oFilter = new this.Filter({
							path: oFilterItem.property,
							value1: oFilterItem.value1,
							value2: oFilterItem.value2,
							operator: this.FilterOperator.BT
						});
					} else {
						if (oFilterItem.value1) {
							oFilter = new this.Filter({
								path:oFilterItem.property,
								value1: oFilterItem.value1,
								operator: this.FilterOperator.GE
							});
						} else if (oFilterItem.value2) {
							oFilter = new this.Filter({
								path: oFilterItem.property,
								value1: oFilterItem.value2,
								operator: this.FilterOperator.LE
							});
						}
					}
					break;

                case "sap.m.MultiInput":
                    let aKeys = [];
                    if (Array.isArray(oFilterItem.value1)) {
                        oFilterItem.value1.forEach((oToken) =>{
							aKeys.push(new this.Filter({
								path: oFilterItem.property,
								value1: oToken.key,
								operator:  this.FilterOperator.EQ
							}));
						});
                        if (aKeys.length === 1) {
							oFilter = aKeys[0];
						} else if (aKeys.length > 1) {
							oFilter = new this.Filter({
								filters: aKeys,
								and: false
							});
						}
                    } else {
                        if (oFilterItem.value1) {
                            oFilter = new this.Filter({
                                path: oFilterItem.property,
                                value1: oFilterItem.value1.key,
                                operator: this.FilterOperator.EQ
                            });
                        }
                    }
                    break;

				case "com.publix.ui5lib.rp.controls.vendorRic.VendorRIC":
				case "com.publix.ui5lib.rp.controls.vendorRic.MultiVendorRIC":
					let aRicFilters = [];
					if (Array.isArray(oFilterItem.value1)) {
						oFilterItem.value1.forEach((sRic) =>{
							aRicFilters.push(new this.Filter({
								path: oFilterItem.property,
								value1: sRic,
								operator:  this.FilterOperator.EQ
							}));
						});	
						if (aRicFilters.length === 1) {
							oFilter = aRicFilters[0];
						} else if (aRicFilters.length > 1) {
							oFilter = new this.Filter({
								filters: aRicFilters,
								and: false
							});
						}
					} else {
                        if (oFilterItem.value1) {
                            oFilter = new this.Filter({
                                path: oFilterItem.property,
                                value1: oFilterItem.value1,
                                operator: this.FilterOperator.EQ
                            });
                        } else if (oFilterItem.value2) {
                            oFilter = new this.Filter({
                                path: oFilterItem.property,
                                value1: oFilterItem.value2,
                                operator: this.FilterOperator.EQ
                            });
                        }
					}
					break;
			}

			return oFilter;
		},

        /**
         * Clear all FilterBar 'values' (based on the control type).
         * @public
         */
        clearFilterControlValues: function(bAllSettings) {
			let aFilterItems = this.getFilterGroupItems(),
            aFilterValues = [];

            aFilterItems.forEach(oFilterItem => {
                let oFilterValue = this.getFilterControlInfo(oFilterItem);
                oFilterValue.value1 = "";
                oFilterValue.value2 = "";
                if (bAllSettings) {
                    oFilterValue.manditory = false;
                }
                aFilterValues.push(oFilterValue);
            });

            this.setFilterControlValues(aFilterValues);
        },

        /**
         * Set the existing Filter Group Items based on the array of 'Filter Info' objects given.
         *   Filter Info object structure:
         *     {
         *       group: String - The given Filter Group Name,
         *       property: String - The name given to the property (used for binding),
         *       type: String - An SAPUI5 (or custom) control name : ie) "sap.m.Input",
         *       label: String - The label given to the Filter Group Item,
         *       manditory: Boolean -  oFilterItem.getMandatory(),
         *       value1: Any - the 1st value of the sap.ui.model.Filter ().value1,
         *       value2: Any - the 2nd value of the sap.ui.model.Filter ().value2
         *     }
         * @public
         * @param {Array} aFilterValues Array of JSON 'Filter Info' objects:
         */
        setFilterControlValues: function(aFilterValues) {
			let aFilterItems = this.getFilterGroupItems();

            if (aFilterValues && aFilterValues.length > 0) {
                aFilterItems.forEach((oItem) => {
                    let oFilterValue = aFilterValues.find((oInfo) => {
                        return oInfo.property === oItem.getName() ? true : false;
                    });

                    if (oFilterValue) {
                        let oControl = oItem.getControl(),
                            sType = oControl.getMetadata().getName();

                        switch (sType) {
                            case "sap.m.Input":
                                oControl.setValue(oFilterValue ? oFilterValue.value1 : "");
                                break;

                            case "sap.m.CheckBox":
                                oControl.setSelected(oFilterValue.value1 || false);
                                break;

                            case "sap.m.Select":
                            case "sap.m.ComboBox":
                                oControl.setSelectedKey(oFilterValue ? oFilterValue.value1 : "");
                                break;

                            case "sap.m.DatePicker":
                                oControl.setDateValue(new Date(oFilterValue.value1));
                                break;

                            case "sap.m.DateRangeSelection":
                                let dMinDate = null,
                                    dMaxDate = null;
                                if (oFilterValue.value1) {
                                    dMinDate =  new Date(oFilterValue.value1);
                                }
                                if (oFilterValue.value2) {
                                    dMaxDate =  new Date(oFilterValue.value2);
                                }
                                oControl.setDateValue(dMinDate);
                                oControl.setSecondDateValue(dMaxDate);
                                break;

                            case "sap.m.MultiInput":
                                if (Array.isArray(oFilterValue.value1)) {
                                    let aTokens = [];
                                    oFilterValue.value1.forEach(oToken => {
                                        aTokens.push(new Token({
                                            key: oToken.key,
                                            text: oToken.text
                                        }));
                                    });
                                    oControl.setTokens(aTokens);
                                } else if (oFilterValue.value1) {
                                    oControl.setTokens([new Token({
                                        key: oFilterValue.value1.key,
                                        text: oFilterValue.value1.text
                                    })]);
                                }
                                break;

                            case "com.publix.ui5lib.rp.controls.vendorRic.VendorRIC":
                                oControl.setSelectedKey(oFilterValue ? oFilterValue.value1 : "");
                                break;

                            case "com.publix.ui5lib.rp.controls.vendorRic.MultiVendorRIC":
                                let aValues = []
                                if (Array.isArray(oFilterValue.value1)) {
                                    aValues =  oFilterValue ? oFilterValue.value1 : [];
                                } else if (oFilterValue) {
                                    aValues = [oFilterValue.value1];
                                }
                                oControl.setSelectedKeys(aValues);
                                break;
                        }
                    }
                });
            } else {
                this._oSmartVM.setCurrentVariantId(this._oSmartVM.STANDARDVARIANTKEY, true/*apply*/);
            }
		}

    });

    /**
     * Initialise variant management control.
     * @private
     */
    CustomFilterBar.prototype._initializeVariantManagement = function () {
        if (this._oSmartVM && this.getPersistencyKey()) {
            let oPersInfo = new PersonalizableInfo({
                type: "filterBar",
                keyName: "persistencyKey"
            });
            oPersInfo.setControl(this);

            if (this._oSmartVM._loadFlex) {
                this._oSmartVM._loadFlex().then(() => {
                    this._oSmartVM.addPersonalizableControl(oPersInfo);
                    FilterBar.prototype._initializeVariantManagement.apply(this, arguments);
                });
            } else {
                this._oSmartVM.addPersonalizableControl(oPersInfo);
                FilterBar.prototype._initializeVariantManagement.apply(this, arguments);
            }
        } else {
            this.fireInitialise();
        }
    };

    /**
     * Use SmartVariantManagement instead of SmartVariantManagementUi2.
     * Activate the public and apply automatically options.
     * @private
     * @returns {sap.ui.comp.smartvariants.SmartVariantManagement} The variant management control
     */
    CustomFilterBar.prototype._createVariantManagement = function () {
        this._oSmartVM = new SmartVariantManagement({
            showExecuteOnSelection: true
            //showShare: true
        });

        return this._oSmartVM;
    };

    /**
     * The original method accepts only SmartVariantManagementUi2.
     * @private
     * @returns {boolean} Result
     */
    FilterBar.prototype._isTINAFScenario = function () {
        if (this._oVariantManagement) {
            if (!this._isUi2Mode() && !(this._oVariantManagement instanceof SmartVariantManagement)) {
                return true;
            }
        } else {
            // scenario: VH dialog: VM replaced with collective search control
            if (this._oCollectiveSearch && this.getAdvancedMode()) {
                return true;
            }
        }

        return false;
    };

    return CustomFilterBar;
});