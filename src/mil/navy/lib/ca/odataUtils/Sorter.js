sap.ui.define([
	"sap/ui/base/Object",
	"sap/base/Log",
	"sap/ui/model/resource/ResourceModel",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Sorter",
	"sap/m/MessageToast",
	"sap/ui/Device"
], function(UI5Object, AppLog, ResourceModel, JSONModel, Sorter, MessageToast, Device) {
	"use strict";

	return UI5Object.extend("mil.navy.lib.ca.odataUtils.Sorter", {


		/* =========================================================== */
		/*  Lifecycle methods                                          */
		/* =========================================================== */

		/**
		 * This class provides application OData model Sorting against 'sap.m.listBase' objects.
		 * @class
		 * @param {sap.m.ListBase} oList A reference to the list to be sorted.
		 * @param {Array} aSortFields An arrah of maps with sort field 'Name' & 'Value' pairs.
		 * @public
		 * @alias mil.navy.lib.ca.odataUtils.Sorter
		 */
		constructor: function(oList, aSortFields) {
			// Bind the caller's components.
			this._oAttachedList = oList;

			// Construct the Sort Dialog.
			this._oSortDialog = sap.ui.xmlfragment(oList.getId() + "__sorter", "mil.navy.lib.ca.odataUtils.fragment.SortDialog", this);

			// Create and Set the 'i18n', 'device' & resource models.
			var oResource = new ResourceModel({
				bundleName: "mil.navy.lib.ca.odataUtils.i18n.i18n"
			});
			this._oSortDialog.setModel(oResource, "i18n");
			var oDeviceModel = new JSONModel(Device);
			oDeviceModel.setDefaultBindingMode("OneWay");
			this._oSortDialog.setModel(oDeviceModel, "device");
			this._oBundle = oResource.getResourceBundle();

			// Apply content density.
			this._oSortDialog.addStyleClass(this._getContentDensityClass());

			// Construct the sort model.
			this._oSortDialog._sortFields = [];
			aSortFields.forEach(function(oValue) {
				this._oSortDialog._sortFields.push({
					Name: oValue.Property,
					Text: oValue.Label
				});
			}.bind(this));

			// Set the dialog's default model.
			this._oSortDialog.setModel(new JSONModel({
				sortItems: [],
				sortFields: this._oSortDialog._sortFields,
				sortCriteria: [{
					Criteria: "A",
					Icon: "sap-icon://sort-ascending",
					Text: this._oBundle.getText("SorterAscending")
				}, {
					Criteria: "D",
					Icon: "sap-icon://sort-descending",
					Text: this._oBundle.getText("SorterDescending")
				}]
			})).bindElement("/");

			// Attach the 'after close' event to resolve the Promise.
			this._oSortDialog.attachAfterClose(function(oEvent) {
				// Clear the attached sorters.
				this._oSortDialog.getModel().setProperty("/sortItems", []);
			}.bind(this));

		},

		/**
		 * The control is automatically destroyed by the UI5 runtime.
		 * @public
		 * @override
		 */
		destroy: function() {
			if (this._oSortDialog) {
				this._oSortDialog.destroy();
			}
			UI5Object.prototype.destroy.apply(this, arguments);
		},



		/* =========================================================== */
		/*  Public methods                                             */
		/* =========================================================== */

		/**
		 * Initialize and open th Sort dialog.
		 * @returns {Promise} A javascript Promise object resolved when the dialog closes.
		 * @public
		 */
		open: function() {
			var aSorters = [],
				oListBinding = this._oAttachedList ? this._oAttachedList.getBinding("items") : null;

			// Retreive the sorters already bound to the list.
			if (oListBinding) {
				oListBinding.aSorters.forEach(function(oSorter) {
					var sCriteria = oSorter.bDescending ? "D" : "A",
						aFields = this._oSortDialog._sortFields.filter(function(oField) {
							return oField.Name === oSorter.sPath ? true : false;
						});
	
					if (aFields.length > 0) {
						var oField = aFields[0];
						aSorters.push({
							Name: oField.Name,
							Text: oField.Text,
							Criteria: sCriteria
						});
					}
				}, this);
			}

			// Update the dialog model's sortItems property.
			this._oSortDialog.getModel().setProperty("/sortItems", aSorters);

			// Open the dialog.
			this._closePromise = new Promise(function(fnResolve, fnReject) {
				this._fnResolve = fnResolve;
				this._fnReject = fnReject;
				this._oSortDialog.open();
			}.bind(this));

			return this._closePromise;
		},

		/**
		 * Add a row to the sort criteria list.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onSortDialogAdd: function(oEvent) {
			var oModel = this._oSortDialog.getModel(),
				aItems = oModel.getProperty("/sortItems"),
				oMenuItem = oEvent.getParameter("item"),
				sName = oMenuItem.getKey(),
				sText = oMenuItem.getText(),
				bFound = false;

			aItems.forEach(function(oField) {
				if (!bFound && oField.Name === sName ) {
					bFound = true;
				}
			});

			if (!bFound) {
				aItems.push({
					Name: sName,
					Text: sText,
					Criteria: "A"
				});
				oModel.setProperty("/sortItems", aItems);
			} else {
				var sMessage = this._oBundle.getText("SorterExists", [sText]);
				MessageToast.show(sMessage, {
					duration: 750,   /* 3/4 second*/
					offset: "0 -50",  /* 50 px up */
					of: this._oSortDialog
				});
			}
		},

		/**
		 * Remove a sort item from the list of sort fields.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onSortDialogDelete: function(oEvent) {
			var oModel = this._oSortDialog.getModel(),
				aFields = oModel.getProperty("/sortItems"),
				oSource = oEvent.getSource(),
				oItem = oSource.getParent().getParent(),
				sPath = oItem.getBindingContextPath(),
				oData = oModel.getProperty(sPath);

			aFields = aFields.filter(function(oField) {
				return oField.Name !== oData.Name;
			});

			oModel.setProperty("/sortItems", aFields);
		},

		/**
		 * Change the sort direction of the list (Ascending/Descending).
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onSortDialogDirection: function(oEvent) {
			var oButton = oEvent.getSource(),
				sCriteria = oButton.getIcon() === "sap-icon://sort-ascending" ? "D" : "A",
				sIcon = sCriteria === "D" ? "sap-icon://sort-descending" : "sap-icon://sort-ascending",
				oModel = this._oSortDialog.getModel(),
				oRow = oEvent.getSource().getParent().getParent(),
				sPath = oRow.getBindingContextPath();

			oButton.setPressed(false);
			oModel.setProperty(sPath + "/Criteria", sCriteria);
			oButton.setIcon(sIcon);
		},

		/**
		 * Drag a sort item up or down in the list of sort fields.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onDragDrop: function(oEvent) {
			var oModel = this._oSortDialog.getModel(),
				// sPosition = oEvent.getParameter("dropPosition"),	// Before
				oItemDragged = oEvent.getParameter("draggedControl"),
				oItemDropped = oEvent.getParameter("droppedControl");

			// Find the dragged item's array index.
			var iFromIndex = parseInt(oItemDragged.getBindingContextPath().split("/sortItems/")[1], 10);

			// Find the dropped item's array index.
			var iToIndex = parseInt(oItemDropped.getBindingContextPath().split("/sortItems/")[1], 10);

			// Re-organize the items array.
			var aItems = oModel.getProperty("/sortItems");
			aItems.splice(iToIndex, 0, aItems.splice(iFromIndex, 1)[0]);
			oModel.setProperty("/sortItems", aItems); 
		},

		/**
		 * Move a sort item up or down in the list of sort fields.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onSortDialogMove: function(oEvent) {
			var oSource = oEvent.getSource(),
				oModel = this._oSortDialog.getModel(),
				aItems = oModel.getProperty("/sortItems"),
				oRow = oSource.getParent().getParent(),
				oItemToMove = oModel.getProperty(oRow.getBindingContextPath()),
				sDirection = oSource.getIcon() === 'sap-icon://arrow-top' ? "U" : "D";

			// Find the selected item's array index.
			var iToIndex = 0,
				iFromIndex = 0;
			aItems.forEach(function(oItem, iIndex) {
				if (oItem.Name === oItemToMove.Name) {
					iFromIndex = iIndex;
				}
			});

			// Determine the new index.
			if (sDirection === "U") { // Move Up
				if (iFromIndex > 0) {
					iToIndex = iFromIndex - 1;
				} else {
					iToIndex = aItems.length - 1;
				}
			} else if (sDirection === "D") { // Move Down 
				if (iFromIndex < (aItems.length - 1)) {
					iToIndex = iFromIndex + 1;
				} else {
					iToIndex = 0;
				}
			}

			// Re-organize the items array.
			aItems.splice(iToIndex, 0, aItems.splice(iFromIndex, 1)[0]);
			oModel.setProperty("/sortItems", aItems); 
		},

		/**
		 * Handle the "Clear All" event (button press) from the Sort dialog.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onSortDialogClear: function(oEvent) {
			var oModel = this._oSortDialog.getModel();

			oModel.setProperty("/sortItems", []);
		},

		/**
		 * Handle the "Cancel" event (button press) from the Sort dialog.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onSortDialogCancel: function(oEvent) {
			this._oSortDialog.close();
			this._fnReject();
		},

		/**
		 * Handle the "Apply" event (button press) from the Sort dialog.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onSortDialogApply: function(oEvent) {
			var oModel = this._oSortDialog.getModel(),
				aItems = oModel.getProperty("/sortItems"),
				oListBinding = this._oAttachedList ? this._oAttachedList.getBinding("items") : null,
				aSorters = [];

			if (!oListBinding) {
				// Close the dialog
				this._oSortDialog.close();
				this._fnResolve([]);
				return;
			}

			// Build the sort object array.
			if (aItems.length <= 0) {
				// aSorters.push(this._oDefaultSorter);
			} else {
				aItems.forEach(function(oItem) {
					aSorters.push(new Sorter(
						oItem.Name,
						oItem.Criteria === "D" ? true : false
					));
				}.bind(this));
			}

			// Apply the sorters to the list items collection.
			oListBinding.sort(aSorters);

			// Close the dialog
			this._oSortDialog.close();
			this._fnResolve(this._oSortDialog.getModel().getProperty("/sortItems"));
		},



		/* =========================================================== */
		/*  Private methods                                            */
		/* =========================================================== */

		/**
		 * This method can be called to determine whether the sapUiSizeCompact or sapUiSizeCozy
		 * design mode class should be set, which influences the size appearance of some controls.
		 * @public
		 * @return {string} css class, either 'sapUiSizeCompact' or 'sapUiSizeCozy' - or an empty string if no css class should be set
		 */
		_getContentDensityClass: function () {
			if (this._sContentDensityClass === undefined) {
				// check whether FLP has already set the content density class; do nothing in this case
				if (jQuery(document.body).hasClass("sapUiSizeCozy") || jQuery(document.body).hasClass("sapUiSizeCompact")) {
					this._sContentDensityClass = "";
				} else if (!Device.support.touch) { // apply "compact" mode if touch is not supported
					this._sContentDensityClass = "sapUiSizeCompact";
				} else {
					// "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
					this._sContentDensityClass = "sapUiSizeCozy";
				}
			}
			return this._sContentDensityClass;
		}

	});
});