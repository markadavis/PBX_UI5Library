sap.ui.define([
	"sap/ui/base/Object",
	"sap/base/Log",
    "sap/ui/Device",
	"sap/ui/model/resource/ResourceModel",
    "sap/ui/model/json/JSONModel",
	"sap/ui/model/odata/v2/ODataModel",
	"sap/m/MessageBox",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/Sorter",
    "mil/navy/lib/ca/odataUtils/ErrorHandler"
], function(UI5Object, AppLog, Device, ResourceModel, JSONModel, ODataModel, MessageBox, Filter, FilterOperator, Sorter, ErrorHandler) {
	"use strict";

	return UI5Object.extend("mil.navy.lib.rp.artifactMaint.NotesMaint", {
		_ODATA_SERVICE_URI: "/sap/opu/odata/sap/ZM_RP_NOTE_SRV",
		_ENTITY_SET: "NOTESet",

		/* =========================================================== */
		/*  Lifecycle methods                                          */
		/* =========================================================== */

		/**
		 * This class provices application notes upload/download capabilities.
		 * @class
		 * @param {Object} oParams Setup parameters for the unique identification of object the Notes Maint
		 * 		instance belogns to.  The following paramters are accepted:
		 * 		{
		 * 			objectId: {String}  The required business object ID used for storage.
		 *			objectType: {String}  The optional business object Type used for storage (default "ZATTACH_REP").
		 *			controlId: {String}  The optional unique ID used for the control's instance (default "notesManager").
		 *			dialogTitle: {String}  The optional Dialog title (default "Notes").
		 * 		}
		 * @public
		 * @name mil.navy.lib.rp.artifactMaint.NotesMaint
		 */
		constructor: function(oParams) {
            // Create and Set the 'i18n' resource model.
            this._oResources = new ResourceModel({
                bundleName: "mil.navy.lib.rp.artifactMaint.i18n.i18n"
            });
            this._oResourceBundle = this._oResources.getResourceBundle();

			// Load the dialog identity if given (could have come from the constructor).

			// Construct the control's Metadata model.
			oParams = oParams ? oParams : {
				objectId: "",
				objectTYpe: "ZATTCH_REP",
				controlId: "notesManager",
				dialogTitle: this._oResourceBundle.getText("NotesMaint_Title")
			};
			this._oMetaModel = new JSONModel({
				Settings: {
					objectId: oParams.hasOwnProperty("objectId") ? oParams.objectId : "",
					objectType: oParams.hasOwnProperty("objectType") ? oParams.objectType : "ZATTCH_REP",
					controlId: oParams.hasOwnProperty("controlId") ? oParams.controlId : "notesManager",
					dialogTitle: oParams.hasOwnProperty("dialogTitle") ? oParams.dialogTitle : this._oResourceBundle.getText("NotesMaint_Title"),
					DialogMessageVisible: false,
					DialogMessageSuccess: false,
					DialogMessageError: false,
					DialogMessageWarn: false,
					DialogMessageInform: true,
					dialogMessage: "",
					ChangeVisible: false,
					CreateVisible: true,
					DeleteVisible: false,
					SaveVisible: false,
					CancelVisible: false,
					CloseVisible: true,
					TitleEditable: false,
					TextEditable: false
				},
				Note: {
					objectId: "",
					path: "",
					Title: "",
					Text: ""
				},
				NoteItems: []
			});

			// Construct the control's OData model.
			this._oDataModel = new ODataModel(this._ODATA_SERVICE_URI);
			this._oErrorHandler = new ErrorHandler(null/*no controller binding*/, "notesModel",false/*all errors*/, this._oDataModel);

			// Create the Device model.
			this._oDeviceModel = new JSONModel(Device);
		},

		/**
		 * The component is destroyed by the UI5 framework. Destroy all locally constructed objects here.
		 * @public
		 * @override
		 */
		 destroy: function() {
			// Destroy the Dialog if it exists.
			if (this._oDialogNotes) {
				this._oDialogNotes.destroy();
			}
			// call the base component.
			BaseController.prototype.destroy.apply(this, arguments);
		},



		/* =========================================================== */
		/*  Event Handler methods                                      */
		/* =========================================================== */

		onExitNoteButton: function(oEvent) {
			this._setDialogStatus("display");
			this._oDialogNotes.close();

			// Call the 'onClose' listener if bound.
			if (this.hasOwnProperty("_onCloseListener") && typeof this._onCloseListener === "function") {
				this._onCloseListener(oEvent);
			}
		},

		onSelectionChange: function(oEvent) {
			let sPath = oEvent.getParameter("listItem").getBindingContextPath(),
				oNoteItem = this._oMetaModel.getProperty(sPath);

			this._setDialogMessage();

			this._setDialogStatus("display");

			this._oMetaModel.setProperty("/Note", oNoteItem);
		},

		onCreatePress: function(oEvent) {
			let oNote = this._oMetaModel.getProperty("/Note"),
				oSettings = this._oMetaModel.getProperty("/Settings"),
				dDateTime = sap.ui.core.format.DateFormat.getDateInstance({
					pattern: "YYYY-MM-dd_HH:mm:ss"
				}).format(new Date());

			this._oNotesTable.removeSelections(true);

			oNote.Title = oSettings.objectId + "_" + dDateTime;
			oNote.Text = "";

			this._oMetaModel.setProperty("/Note", oNote);

			this._setDialogStatus("create");
		},

		onChangePress: function(oEvent) {
			this._setDialogStatus("change");
		},

		onDeletePress: function(oEvent) {
			MessageBox.show(this._oResourceBundle.getText("NotesMaint_WarnDelete"), {
				icon: MessageBox.Icon.WARNING,
				title: this._oResourceBundle.getText("NotesMaint_WarnDeleteTitle"),
				actions: [MessageBox.Action.YES, MessageBox.Action.NO],
				emphasizedAction: MessageBox.Action.YES,
				initialFocus: MessageBox.Action.YES,
				onClose: function(sAction) {
					if (sAction === "YES") {
						this._deleteNotedata();
					}
				}.bind(this)
			});
		},

		onCancelPress: function(oEvent) {
			let oNote = this._oMetaModel.getProperty("/Note"),
				oSelectedItem = this._oNotesTable.getSelectedItem(),
				sPath = "";
			
			if (oSelectedItem) {
				sPath = oSelectedItem.getBindingContextPath();
			}

			if (sPath) {
				let oNoteItem = this._oMetaModel.getProperty(sPath);
				oNote.Text = oNoteItem.Text;
				oNote.Title = oNoteItem.Title;
			} else {
				oNote.Title = "";
				oNote.Text = "";
			}

			this._setDialogStatus("display");

			this._oMetaModel.setProperty("/Note", oNote);
		},

		onSavePress: function(oEvent) {
			let oSelectedItem = this._oNotesTable.getSelectedItem();

			if (oSelectedItem) {
				// Call Update Entity for the Change Note			
				this._updateNoteData();
			} else {
				// Call Create Entity for the New Note	
				this._createNoteData();
			}
		},



		/* =========================================================== */
		/*  Public methods                                             */
		/* =========================================================== */

		/**
		 * Open the Note Up/Download manager Dialog.
		 * @param {Object} oParams Setup parameters for the unique identification of object the Notes Maint
		 * 		instance belogns to.  The following paramters are accepted (defaulted from the constructor):
		 * 		{
		 * 			objectId: {String}  The optional business object ID used for storage.
		 *			objectType: {String}  The optional business object Type used for storage.
		 *			dialogTitle: {String}  The optional Dialog title.
		 * 		}
		 * @returns {Object} Return 'this' for call chaining (like the 'attachOnClose' function).
		 * @public
		 */
    	open: function(oParams) {
			// Load the dialog identity if given (could have come from the constructor).
			if (oParams) {
				let oSettings = this._oMetaModel.getProperty("/Settings");
				oSettings.objectId = oParams.hasOwnProperty("objectId") ? oParams.objectId : oSettings.objectId;
				oSettings.objectType = oParams.hasOwnProperty("objectType") ? oParams.objectType : oSettings.objectType;
				oSettings.dialogTitle = oParams.hasOwnProperty("dialogTitle") ? oParams.dialogTitle : oSettings.dialogTitle;
				this._oMetaModel.setProperty("/Settings", oSettings);
			}

			// TODO - Log & throw an exception if no "objectId" is given.

			if (!this._oDialogNotes) {
				this._oDialogNotes = sap.ui.xmlfragment(
					"mil.navy.lib.rp.artifactMaint.Dialog_" + this._oMetaModel.getProperty("/Settings/controlId"),
					"mil.navy.lib.rp.artifactMaint.NoteDialog",
					this
				);
				this._oDialogNotes.setModel(this._oResources, "i18n");
				this._oDialogNotes.setModel(this._oMetaModel);
				this._oDialogNotes.setBusyIndicatorDelay(0);
				this._oNotesTable = this._oDialogNotes.getAggregation("content")[0];
			}

			this._oDialogNotes.setBusy(true);

			this._setDialogStatus();
			this._setDialogMessage();

			this._oDialogNotes.open();

			this._getNotes()
			.then(aResults => {
				this._oMetaModel.setProperty("/NoteItems", aResults);
				if (aResults.length > 0) {
					let oItem = this._oNotesTable.getItems()[0];
					this._oNotesTable.setSelectedItem(oItem);
					this._setNoteItem();
					this._setDialogStatus("display");
				} else {
					this._setNoteItem();
				}
				this._oDialogNotes.setBusy(false);
			})
			.catch(oError => {
				this._oMetaModel.setProperty("/NoteItems", []);
				this._setNoteItem();
				this._oDialogNotes.setBusy(false);
			});

			return this;
		},

		/**
		 * Attach a call-back Function to the 'onClose' event - called when the dialog is colsed.
		 * @param {function} fnCloseListener The function to be callled when the dialog is closed. 
		 * @public
		 */
		attachOnClose: function(fnCloseListener) {
			if (fnCloseListener && typeof fnCloseListener === "function") {
				this._onCloseListener = fnCloseListener;
			}
		},

		/**
		 * Detach the 'onClose' event listener - called when the Dialog is closed.
		 * @public
		 */
		detachOnClose: function() {
			if (this.hasOwnProperty("_onCloseListener")) {
				this._onCloseListener = null;
			}
		},



		/* =========================================================== */
		/*  Private methods                                            */
		/* =========================================================== */
		
		_getNotes: function() {
			return new Promise((fnResolve, fnReject) => {
				var oSettings = this._oMetaModel.getProperty("/Settings"),
					aFilters = [
						new Filter("InstidA", FilterOperator.EQ, oSettings.objectId),
						new Filter("TypeidA", FilterOperator.EQ, oSettings.objectType)
					];

				this._oDataModel.read("/NOTESet", {
					async: false,
					filters: aFilters,
					sorter: new Sorter("Chdat", true),
					success: (oData, oResponse) => {
						let aNotes = oData.results.map(oNote => {
							if (!oNote.Choadr) {
								oNote.Choadr = oNote.Croadr
							}
							return oNote;
						});
						fnResolve(aNotes);
					},
					error: oError => {
						fnReject(oError);
					}
				});
			});
		},

		_setNoteItem: function() {
			let oSelectedItem = this._oNotesTable.getSelectedItem(),
				oNote = {
					objectId: this._oMetaModel.getProperty("/Settings/objectId"),
					path: oSelectedItem ? oSelectedItem.getBindingContextPath() : "",
					Text: "",
					Title: ""
				};

			if (oNote.path) {
				let oNoteItem = this._oMetaModel.getProperty(oNote.path);

				if (oNoteItem) {
					oNote.Text = oNoteItem.Text;
					oNote.Title = oNoteItem.Title;
				} else {
					// TODO - Handle the not found error condition.
				}
			}

			this._oMetaModel.setProperty("/Note", oNote);
		},

		_deleteNotedata: function() {
			let oSelectedItem = this._oNotesTable.getSelectedItem(),
				sNoteItemPath = oSelectedItem.getBindingContextPath(),
				oNoteItem = this._oMetaModel.getProperty(sNoteItemPath);
			
			if (!oNoteItem) {
				// TODO - Handle error for item does not exist.
			} else {
				let sPath = this._oDataModel.createKey("/NOTESet", {
					InstidA: oNoteItem.InstidA,
					TypeidA: this._oMetaModel.getProperty("/Settings/objectType"),
					InstidB: oNoteItem.InstidB
				});

				this._setDialogMessage();

				this._oDataModel.remove(sPath, {
					success: aData => {
						this._getNotes()
						.then(aNotes => {
							this._oMetaModel.setProperty("/NoteItems", aNotes);
							this._oNotesTable.removeSelections();
							this._setNoteItem();

							this._setDialogMessage(this._oResourceBundle.getText("NotesMaint_SuccessDelete"), "success");

							this._setDialogStatus("display");
						})
						.catch(oError => {
							// Response should be handled by the ErrorHandler control.
							this._setDialogMessage(this._oResourceBundle.getText("NotesMaint_ErrorDelete"), "error");
							this._oDialogNotes.setBusy(false);
						});
					},
					error: oError => {
						let sErrorMessgae = "";
						try {
							sErrorMessgae = JSON.parse(oError.responseText).error.message.value;
						} catch(oError) {
							sErrorMessgae = this._oResourceBundle.getText("NotesMaint_ErrorDelete");
						}
						this._setDialogMessage(sErrorMessgae, "error");
					}
				});
			}
		},

		_updateNoteData: function() {
			let oItem = this._oNotesTable.getSelectedItem(),
				sPath = oItem.getBindingContextPath(),
				oNoteItem = this._oMetaModel.getProperty(sPath);

			if (!oNoteItem) {
				// TODO - Handle error for item does not exist.
			} else {
				let sPath = this._oDataModel.createKey("/NOTESet", {
					InstidA: oNoteItem.InstidA,
					TypeidA: this._oMetaModel.getProperty("/Settings/objectType"),
					InstidB: oNoteItem.InstidB
				});

				oNoteItem.Text = this._oMetaModel.getProperty("/Note/Text");

				this._oDataModel.update(sPath, oNoteItem, {
					success: oData => {
						this._setDialogMessage(this._oResourceBundle.getText("NotesMaint_SuccessUpdate"), "success");

						this._setDialogStatus("display");

						this._oMetaModel.setProperty("/Note", oNoteItem);
						this._oMetaModel.setProperty(sPath, oNoteItem);
					},
					error: oError=> {
						let sErrorMessage = "";
						try {
							sErrorMessage = JSON.parse(oError.responseText).error.message.value;
						} catch(oError) {
							sErrorMessage = this._oResourceBundle.getText("NotesMaint_ErrorUpdate");
						}
						this._setDialogMessage(sErrorMessage, "error");
					}
				});
			}
		},

		_createNoteData: function(oEvent) {
			let oNote = this._oMetaModel.getProperty("/Note"),
				oServiceData = {
					BitmIcon: "",
					Lang: "EN",	// TODO - get from service - sy-langu.
					Croadr: "",
					Title: oNote.Title,
					Choadr: "",
					Text: oNote.Text,
					InstidB: "",	// this._oMetaModel.getProperty("/Settings/objectCategory")
					InstidA: oNote.InstidA,
					Crdat: new Date(),
					TypeidA: this._oMetaModel.getProperty("/Settings/objectType"),
					Chdat: new Date()
				};

			this._oDialogNotes.setBusy(true);

			this._oDataModel.create("/NOTESet", oServiceData, {
				success: oData => {
					this._getNotes()
					.then(aNoteItems => {
						this._oMetaModel.setProperty("/NoteItems", aNoteItems);

						this._setDialogMessage(this._oResourceBundle.getText("NotesMaint_SuccessCrate"), "success");

						this._setDialogStatus("display");

						this._oNotesTable.removeSelections();
						this._setNoteItem();

						this._oDialogNotes.setBusy(false);
					})
					.catch(oError => {
						// Response should be handled by the ErrorHandler control.
						this._setDialogMessage(this._oResourceBundle.getText("NotesMaint_ErrorCreate"), "error");
						this._oDialogNotes.setBusy(false);
					});
				},
				error: oError => {
					let sErrorMessage = "";
					try {
						sErrorMessage = JSON.parse(oError.responseText).error.message.value;	
					} catch(oError) {
						sErrorMessage = this._oResourceBundle.getText("NotesMaint_ErrorCreate");
					}
					this._setDialogMessage(sErrorMessage, "error");
					this._oDialogNotes.setBusy(false);
				}
			});
		},

		_setDialogStatus: function(sStatus) {
			let oSettings = this._oMetaModel.getProperty("/Settings");
			switch (sStatus) {
				case "change":
					oSettings.CreateVisible = false;
					oSettings.ChangeVisible = false;
					oSettings.DeleteVisible = false;
					oSettings.SaveVisible = true;
					oSettings.CancelVisible = true;
					oSettings.CloseVisible = false;
					oSettings.TitleEditable = false;
					oSettings.TextEditable = true;
					break;

				case "delete":
					oSettings.CreateVisible = false;
					oSettings.ChangeVisible = false;
					oSettings.DeleteVisible = false;
					oSettings.SaveVisible = false;
					oSettings.CancelVisible = true;
					oSettings.CloseVisible = false;
					oSettings.TitleEditable = false;
					oSettings.TextEditable = false;
					break;

				case "create":
					oSettings.CreateVisible = false;
					oSettings.ChangeVisible = false;
					oSettings.DeleteVisible = false;
					oSettings.SaveVisible = true;
					oSettings.CancelVisible = true;
					oSettings.CloseVisible = false;
					oSettings.TitleEditable = true;
					oSettings.TextEditable = true;
					break;

				case "display":
					oSettings.CreateVisible = true;
					oSettings.ChangeVisible = true;
					oSettings.DeleteVisible = true;
					oSettings.SaveVisible = false;
					oSettings.CancelVisible = false;
					oSettings.CloseVisible = true;
					oSettings.TitleEditable = false;
					oSettings.TextEditable = false;
					break;

				default:	// nothing selected.
					oSettings.CreateVisible = true;
					oSettings.ChangeVisible = false;
					oSettings.DeleteVisible = false;
					oSettings.SaveVisible = false;
					oSettings.CancelVisible = false;
					oSettings.CloseVisible = true;
					oSettings.TitleEditable = false;
					oSettings.TextEditable = false;
					break;
			}

			this._oMetaModel.setProperty("/Settings", oSettings);
		},

		_setDialogMessage(sMessage, sType) {
			let oSettings = this._oMetaModel.getProperty("/Settings"),
				messageType = sType ? sType : "inform";

			oSettings.DialogMessageVisible = sMessage ? true : false;
			oSettings.dialogMessage = sMessage ? sMessage : "";

			oSettings.DialogMessageSuccess = messageType === "success" ? true : false;
			oSettings.DialogMessageError = messageType === "error" ? true : false;
			oSettings.DialogMessageWarn = messageType === "warn" ? true : false;
			oSettings.DialogMessageInform = messageType === "inform" ? true : false;

			this._oMetaModel.setProperty("/Settings", oSettings);
		}

	});
});