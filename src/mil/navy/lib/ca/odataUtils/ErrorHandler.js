sap.ui.define([
	"sap/ui/base/Object",
	"sap/base/Log",
	"sap/ui/Device",
	"sap/ui/model/resource/ResourceModel",
	"sap/m/MessageBox"
], function(UI5Object, AppLog, Device, ResourceModel, MessageBox) {
	"use strict";

	return UI5Object.extend("com.publix.ui5lib.ca.odataUtils.ErrorHandler", {

		/* =========================================================== */
		/*  Lifecycle methods                                          */
		/* =========================================================== */

		/**
		 * Handles application OData errors by automatically attaching to the model events
		 * and displaying errors when needed.
		 * @class
		 * @param {sap.ui.core.UIComponent} oComponent reference to the app's component.
		 * @param {Sting} sModelId The Model ID as defined w/in the app's component.
		 * @param {Boolean} bMetadataOnly If true, only react to metadata load failures.
		 * @param {sap.ui.model.odata.V2.ODataModel} oModel Optional model instance (ignored if sModelId given. oComponet).
		 * @public
		 * @alias com.publix.ui5lib.ca.odataUtils.ODataErrorHandler
		 */
		constructor: function(oComponent, sModelId, bMetadataOnly, oModel) {
			// Create and Set the 'i18n' resource model.
			this._oResources = new ResourceModel({
				bundleName: "com.publix.ui5lib.ca.odataUtils.i18n.i18n"
			});
			this._oResourceBundle = this._oResources.getResourceBundle();

			if (oComponent) {
				this._sComponentId = oComponent.getMetadata().getManifest().name;

				// Attach the OData model.
				if (sModelId) {
					this.attachModel(oComponent.getModel(sModelId), bMetadataOnly);
				} else {
					this.attachModel(oComponent.getModel());	// grab the component's default model.
				}
			} else {
				this._sComponentId = "com.publix.ui5lib.ca.odataUtils.ODataErrorHandler__" + sModelId || "model";
				if (oModel) {
					this.attachModel(oModel);
				}
			}

			this._bMessageOpen = false;
		},



		/* =========================================================== */
		/*  Public methods                                             */
		/* =========================================================== */

		attachModel: function(oModel, bMetadataOnly) {
			if (oModel) {
				this._oModel = oModel;
	
				oModel.attachMetadataFailed(function(oEvent) {
					var oParams = oEvent.getParameters(),
						sResponse = oParams.responseText || oParams.response.responseText;
					this._showMetadataError(sResponse);
				}, this);
				if (!bMetadataOnly) {
					this._oModel.attachRequestFailed(function(oEvent) {
						var oError = oEvent.getParameter("response");
						this._processFailedRequest(oError);
					}, this);
				}
			}
		},

		/**
		 * Show any error messages returned as a 'success' payload error (aka business exception).
		 * @param {Object} oResponse The response payload from an OData CRUD method call.
		 * @returns {Object} The error object.  Null is returned if no error was found.
		 * @public
		 */
		hasBusinessException: function(oResponse) {
			var aResponses = [],
				bErrors = false,
				oError = null;

		
			// Check for 'batch' response.
			if (oResponse.hasOwnProperty("__batchResponses")) {
				oResponse.__batchResponses.forEach(function(oBatch) {
					if (oBatch && oBatch.response) {
						aResponses.push(oBatch.response);
					}
				});
			} else {
				aResponses.push(oResponse);
			}

			for (var i = 0; i < aResponses.length; i++) {
				var oResp = aResponses[i];
				
				if (oResp.statusCode && oResp.statusCode !== 412 && oResp.statusCode !== 428  ) { //allow this for eTag in App validation 

					if (parseInt(oResp.statusCode, 10) < 200 || parseInt(oResp.statusCode, 10) > 299) {
						oError = this.parseODataError({
							responseText: oResp.body
						});
						oError.error.title = this._oResourceBundle.getText("LibError");
						// Show only the 1st error message.
						if (!bErrors) {
							this._showServiceError(oError);
							bErrors = true;
						} else {
							break;	// for loop.
						}
					}
				
				}
			}

			return bErrors ? oError : null;
		},

		/**
		 * Create an error message map with the 'default' structure.
		 * @param {string} sMessage Error Message (short text)
		 * @param {string} sDetails Error Details (long text).
		 * @returns {map} The default error message payload.
		 * @public
		 */
		createStandardError: function(sMessage, sDetails) {
			return {
				error: {
					message: {
						code: "",
						value: sMessage
					},
					innererror: {
						errordetails: [{
							message: sDetails
						}]
					}
				}
			};
		},

		/**
		 * Attempt to parse an OData 'standar' error object into a Message ID and Message.
		 * @param {map} mError The error message payload to be deciphered.
		 * @returns {map} The 'standard' response payload
		 * @public
		 */
		parseODataError: function(mError) {
			// Check to see if the response is JSON.
			var sResponse = mError.responseText,
				oResponse = this._parseJSON(sResponse);

			if (!oResponse) {
				// Check to see if it's XML.
				var sMessage = this._parseXML(mError.responseText);

				if (!sMessage) {
					// Check to see if it's HTML.
					sMessage = this._parseHTML(mError.responseText);
				}

				oResponse = this.createStandardError(
					this._oResourceBundle.getText("ErrorHandler_requestFailed"), // Message
					sMessage ? sMessage : sResponse // Details
				);
			}

			return oResponse;
		},



		/* =========================================================== */
		/*  Private methods                                            */
		/* =========================================================== */

		/**
		 * If an entity that was not found in the service and it is also throwing 
		 * a 404 error in OData, we should skip handling it here as we already cover
		 * this scenario with a "notFound" router target.
		 * However, a request that cannot be sent to the server is a technical error
		 * and we have to handle it here.
		 * @param {object} oError is the event object returned from the OData Model "error" event.
		 * @private
		 */
		_processFailedRequest: function(oError) {
			if (oError.statusCode !== 412 && oError.statusCode !== 428 &&  // do not display 412 error to allow this for eTag validation
			     (oError.statusCode !== "404" || (oError.statusCode === 404 && oError.responseText.indexOf("Cannot POST") === 0))) {
				this._showServiceError(this.parseODataError(oError));
			}
		},

		/**
		 * Shows a {@link sap.m.MessageBox} when the metadata call has failed.
		 * The user can try to refresh the metadata.
		 * @param {string} sResponse the OData response from the request.
		 * @private
		 */
		_showMetadataError: function(sResponse) {
			MessageBox.error(
				this._oResourceBundle.getText("ErrorHandler_serviceError"), {
					id: "metadataErrorMessageBox",
					details: sResponse,
					styleClass : this._getContentDensityClass(),
					actions: [MessageBox.Action.RETRY, MessageBox.Action.CLOSE],
					onClose: function(sAction) {
						if (sAction === MessageBox.Action.RETRY) {
							this._oModel.refreshMetadata();
						}
					}.bind(this)
				}
			);
		},

		/**
		 * Shows a {@link sap.m.MessageBox} when a service call has failed.
		 * Only the first error message will be display.
		 * @param {map} oResponse a technical error to be displayed on request
		 * @private
		 */
		_showServiceError: function(oResponse) {
			// Remove duplate messages w/out changing the order.
			var _fnRemoveDuplicates = function(aInput) {
				var aOutput = [],
					oTemp = {};

				for (var i = 0; i < aInput.length; i++) {
					oTemp[aInput[i].message] = aInput[i];
				}

				var aKeys = Object.keys(oTemp);
				aKeys.forEach(function(sKey) {
					aOutput.push(oTemp[sKey]);
				});

				return aOutput;
			};

			if (this._bMessageOpen) {
				return;
			}
			this._bMessageOpen = true;

			var sMessage = "",
				sLongMessage = "",
				aMessages = [];
			if (typeof oResponse !== "string") {
				sLongMessage = oResponse.error.message.value;
				if (oResponse.error && oResponse.error.innererror) {
					aMessages = _fnRemoveDuplicates(oResponse.error.innererror.errordetails || []);
				}
				// Only show the 1st message.
				if (aMessages.length > 0 && aMessages[0].hasOwnProperty("message") && aMessages[0].message && sLongMessage !== aMessages[0].message) {
					sMessage = aMessages[0].message;
				} else {
					sMessage = sLongMessage;
				}
			} else {
				sMessage = oResponse;
			}

			if (sLongMessage === sMessage + ".") {
				sLongMessage = "";
			}

			if (!sLongMessage || sMessage === sLongMessage) {
				MessageBox.error(sMessage, {
					styleClass: this._getContentDensityClass(),
					actions: [MessageBox.Action.CLOSE],
					initialFocus: MessageBox.Action.CLOSE,
					onClose: function() {
						this._bMessageOpen = false;
					}.bind(this)
				});
			} else {
				MessageBox.error(sLongMessage, {
					details: sMessage,
					styleClass: this._getContentDensityClass(),
					actions: [MessageBox.Action.CLOSE],
					initialFocus: MessageBox.Action.CLOSE,
					onClose: function() {
						this._bMessageOpen = false;
					}.bind(this)
				});
			}
		},

		/**
		 * Attempt to parse a JSON string into a Message ID and Message
		 * @param {string} sJson String of JSON formated text.
		 * @returns {string} error payload.
		 * @private
		 */
		_parseJSON: function(sJson) {
			var oMessage = null;

			try {
				oMessage = JSON.parse(sJson);
			} catch (e) {
				AppLog.error("JSON parser error", "Unable to parse JSON message.", this._sComponentId);
			}

			return oMessage;
		},

		/**
		 * Attempt to parse an XML string into a Message ID and Message
		 * @param {string} sXml String of XML formated text.
		 * @returns {string} error payload.
		 * @private
		 */
		_parseXML: function(sXml) {
			var sMessage = null;

			try {
				var oXml = $.parseXML(sXml),
					sCode = oXml.getElementsByTagName("code")[0].textContent,
					sMsg = oXml.getElementsByTagName("message")[0].textContent;
				sMessage = "(" + sCode + ") " + sMsg;
			} catch (e) {
				AppLog.error("XML parser error", "Unable to parse XML message.", this._sComponentId);
			}

			return sMessage;
		},

		/**
		 * Attempt to parse an HTML string into a Message ID and Message
		 * @param {string} sHtml String of HTML formated text.
		 * @returns {string} error payload.
		 * @private
		 */
		_parseHTML: function(sHtml) {
			var sMessage = null;

			try {
				$.each($.parseHTML(sHtml), function(idx, element) {
					if (sMessage) {
						sMessage += " " + $(element).text();
					} else {
						sMessage = $(element).text();
					}
				});
			} catch (e) {
				AppLog.error("HTML parser error", "Unable to parse HTML message.", this._sComponentId);
			}

			return sMessage;
		},

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