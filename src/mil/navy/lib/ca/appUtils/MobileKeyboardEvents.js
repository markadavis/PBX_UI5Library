sap.ui.define([
	"sap/ui/Device"
], function (Device) {
	"use strict";

	return {
		oDevice: Device,

		registerHandler: function(oParams, oListener) {
			this._oListener = oListener || this;
			this._oViewFooter = null;

			// Only perform this function for mobile devices with "cordova-plugin-ionic-keyboard" installed.
			if (this.oDevice.system.phone && window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
				// Bind the 'footer' control.
				if (oParams.hasOwnProperty("FooterId") && oParams.FooterId) {
					// If a footer control's element ID was sent in, try to use it.
					this._oViewFooter = this._oListener.oView.byId(oParams.FooterId);
				}

				if (!this._oViewFooter) {
					// Assuming the view has only 1 'content' aggragtion objetct (aka - the page),
					// the footer should be the view's 1st content aggregation's 'footer' aggregation:
					var aContent = this._oListener.oView.getAggregation("content");
					if (aContent && aContent.length === 1) {
						this._oViewFooter = aContent[0].getAggregation("footer");
					}
				}

				// Show / Hide the footer (when keyboard goes up / down).
				if (this._oViewFooter && this._oViewFooter.setVisible) {
					if (oParams.hasOwnProperty("onShowCallback") && typeof(oParams.onShowCallback) === "function") {
						this.onKeyboardShow = oParams.onShowCallback.bind(this._oListener);
					} else {
						this.onKeyboardShow = function(oEvent) {
							this._bFooterState = this._oViewFooter.getVisible();
							this._oViewFooter.setVisible(false);
							// this._scrollTo(this._oViewFooter.getId(), 500);
						}.bind(this);
					}
					if (oParams.hasOwnProperty("onHideCallback") && typeof(oParams.onHideCallback) === "function") {
						this.onKeyboardHide = oParams.onHideCallback.bind(this._oListener);
					} else {
						this.onKeyboardHide = function() {
							this._oViewFooter.setVisible(this._bFooterState);
						}.bind(this);
					}

					// Bind this view's 'show keyboard' event handlers.
					window.addEventListener('keyboardWillHide', this.onKeyboardHide);	//eslint-disable-line
					window.addEventListener('keyboardWillShow', this.onKeyboardShow);	//eslint-disable-line
				}
			}
		},

		removeRegisteredHandler: function() {
			if (this.oDevice.system.phone && window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
				// Deregister the Cordova keyboard plugin's show/hide even handlers.
				window.removeEventListener('keyboardWillShow', this.onKeyboardShow);	//eslint-disable-line
				window.removeEventListener('keyboardWillHide', this.onKeyboardHide);	//eslint-disable-line
			}
		}

	};
});