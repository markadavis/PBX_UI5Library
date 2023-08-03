sap.ui.define([
	"sap/ui/base/Object",
	"sap/base/Log",
	"sap/ui/Device",
	"sap/ui/core/routing/History",
	"sap/ui/model/resource/ResourceModel",
	"sap/m/MessageBox"
], function(UI5Object, AppLog, Device, History, ResourceModel, MessageBox) {
	"use strict";

	return UI5Object.extend("com.publix.ui5lib.ca.appUtils.HashChangeListener", {


		/* =========================================================== */
		/*  Lifecycle methods                                          */
		/* =========================================================== */

		/**
		 * Listens for application hash changes and report back when there are changes.
		 * @class
		 * @public
		 * @alias com.publix.ui5lib.ca.appUtils.HashChangeListener
		 */
		constructor: function() {
			var sCurrentHash,
				fnNavBack = this.navigateBack;

			// Create and Set the 'i18n' resource model.
			this._oResourceModel =new ResourceModel({
				bundleName: "com.publix.ui5lib.ca.appUtils.i18n.i18n"
			});
			this._oResourceBundle = this._oResourceModel.getResourceBundle();

			var fnHandleHashChange = function(e) {
				var sOldHash = e.oldURL.substr(e.oldURL.search("#") + 1);

				if(sCurrentHash !== sOldHash) {
					return;
				}

				window.hasher.setHash(sOldHash);
	
				MessageBox.confirm(this._oResourceBundle.getText("ViewIsDirty"), {
					styleClass : this._getContentDensityClass(),
					title: this._oResourceBundle.getText("LibWarning"),
					onClose: function(sAction) {
						if (sAction === MessageBox.Action.OK) {
							window.removeEventListener("hashchange",fnHandleHashChange);
							window.hasher.changed.active = true;
							fnNavBack();
						}
					},
					initialFocus: MessageBox.Action.Cancel
				});
			}.bind(this);

			return {
				start: function(fnCallBack) {
					sCurrentHash = window.location.hash.substr(1);
					window.hasher.changed.active = false;
					if (fnCallBack && typeof fnCallBack == "function") {
						this._fnListener = fnCallBack;
					} else  {
						this._fnListener = fnHandleHashChange;
					}
					window.addEventListener("hashchange", this._fnListener);
				},
				stop  : function() {
					window.hasher.changed.active = true;
					if (this._fnListener) {
						window.removeEventListener("hashchange", this._fnListener);
					}
				}
			};
		},



		/* =========================================================== */
		/*  Public methods                                             */
		/* =========================================================== */

		/**
		 * View Navigation helper method.
		 * If there is a history entry or a previous in-app navigation, go one step back in the browser history.
		 * If not, replace the current entry of the browser history with the default (initial) route.
		 * @public
		 */
		navigateBack: function() {
			var sPreviousHash = History.getInstance().getPreviousHash(),
				oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

			if (sPreviousHash !== undefined || !oCrossAppNavigator.isInitialNavigation()) {
				history.go(-1);
			} else {
				oCrossAppNavigator.hrefForExternal({
					target: {
						shellHash: "#"
					}
				});
			}
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