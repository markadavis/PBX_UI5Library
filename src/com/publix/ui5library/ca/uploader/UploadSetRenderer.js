sap.ui.define([
	"sap/m/ListItemBaseRenderer"
], function(ListItemBaseRenderer) {
	"use strict";
	jQuery.sap.includeStyleSheet("/sap/bc/ui5_ui5/sap/ZCA_UI5_LIBRARY/ca/uploader/Uploader.css");

	/**
	 * UploadSet renderer.
	 * @namespace
	 */
	let UploadSetRenderer = {};

	/**
	 * Renders the HTML for the given control, using the provided {@link sap.ui.core.RenderManager}.
	 *
	 * @param {sap.ui.core.RenderManager} oRm the RenderManager that can be used for writing to the render output buffer.
	 * @param {sap.ui.core.Control} oControl an object representation of the control that should be rendered.
	 */
	UploadSetRenderer.render = function(oRm, oControl) {
		oRm.write("<div");
		oRm.writeControlData(oControl);
		oRm.addClass("sapMUC");
		oRm.writeClasses();
		oRm.write(">");
		this.renderDragDropOverlay(oRm, oControl);
		this.renderList(oRm, oControl);
		oRm.write("</div>");
	};

	UploadSetRenderer.renderDragDropOverlay = function(oRm, oControl) {
		oRm.write("<div");
		oRm.writeAttribute("id", oControl.getId() + "-drag-drop-area");
		oRm.addClass("sapMUCDragDropOverlay");
		oRm.addClass("sapMUCDragDropOverlayHide");
		oRm.writeClasses();
		oRm.write(">");
		oRm.write("<div");
		oRm.addClass("sapMUCDragDropIndicator");
		oRm.writeClasses();
		oRm.write(">");
		oRm.write("</div>");
		oRm.write("</div>");
	};

	UploadSetRenderer.renderList = function(oRm, oControl) {
		let fnOriginal = oControl.getList().getRenderer().renderNoData;

		oControl.getList().getRenderer().renderNoData = this.renderNoData;
		oRm.renderControl(oControl.getList());
		oControl.getList().getRenderer().renderNoData = fnOriginal;
	};

	UploadSetRenderer.renderNoData = function(oRm, oControl) {
		let oUploadSet = oControl.getParent();

		oRm.write("<li");
		oRm.writeAttribute("tabindex", oControl.getKeyboardMode() === sap.m.ListKeyboardMode.Navigation ? -1 : 0);
		oRm.writeAttribute("id", oControl.getId("nodata"));
		oRm.addClass("sapMLIB sapMListNoData sapMLIBTypeInactive sapMUSNoDataText");
		ListItemBaseRenderer.addFocusableClasses.call(ListItemBaseRenderer, oRm);
		oRm.writeClasses();
		oRm.write(">");
		oRm.write("<div");
		oRm.addClass("sapMListNoDataText");
		oRm.writeAttribute("id", oControl.getId("nodata-text"));
		oRm.writeClasses();
		oRm.write(">");
		oRm.writeEscaped(oUploadSet.getNoDataText());
		oRm.write("</div>");
		oRm.write("</li>");
	};

	return UploadSetRenderer;
});